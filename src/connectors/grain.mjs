// garden-md connector: Grain (https://grain.com)
// Syncs meeting transcripts from Grain's public API.
// API docs: https://developers.grain.com

import fs from 'fs';
import path from 'path';
import https from 'https';

const API_BASE = 'https://api.grain.com/_/public-api';

function request(url, apiKey) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Grain API ${res.statusCode}: ${data.slice(0, 300)}`));
          return;
        }
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Invalid JSON from Grain: ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function requestText(url, apiKey) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Grain API ${res.statusCode}: ${data.slice(0, 300)}`));
          return;
        }
        resolve(data);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Lightweight connection test — validates key, returns item count. No downloads.
export async function test({ apiKey }) {
  const result = await request(`${API_BASE}/recordings?limit=1`, apiKey);
  const recordings = result.recordings || [];
  // Grain doesn't return a total count, so we report what we can
  return { ok: true, message: recordings.length > 0 ? 'Connected — recordings found' : 'Connected — no recordings yet' };
}

export default async function sync({ apiKey, wildlandPath, initialDays = 15 }) {
  fs.mkdirSync(wildlandPath, { recursive: true });

  // Load last sync timestamp
  const syncFile = path.join(wildlandPath, '.grain-last-sync');
  let lastSync = null;
  if (fs.existsSync(syncFile)) {
    lastSync = fs.readFileSync(syncFile, 'utf-8').trim();
  } else if (initialDays > 0) {
    // First sync — only go back initialDays
    const cutoff = new Date(Date.now() - initialDays * 86400000);
    lastSync = cutoff.toISOString();
  }
  // If initialDays is 0 and no syncFile, lastSync stays null → fetch everything

  // Fetch recordings list with cursor-based pagination
  let allRecordings = [];
  let cursor = null;

  do {
    let url = `${API_BASE}/recordings?limit=50`;
    if (cursor) url += `&cursor=${cursor}`;

    const result = await request(url, apiKey);
    const recordings = result.recordings || [];
    allRecordings = allRecordings.concat(recordings);
    cursor = result.cursor || null;

    // Safety cap
    if (allRecordings.length > 500) { cursor = null; break; }
  } while (cursor);

  if (allRecordings.length === 0) {
    console.log('  No recordings found in Grain.');
    return;
  }

  // Filter by last sync date if available
  if (lastSync) {
    const lastSyncDate = new Date(lastSync);
    allRecordings = allRecordings.filter(rec => {
      const recDate = new Date(rec.start_datetime || rec.end_datetime || 0);
      return recDate > lastSyncDate;
    });
  }

  if (allRecordings.length === 0) {
    console.log('  No new recordings from Grain.');
    return;
  }

  let synced = 0;
  for (const rec of allRecordings) {
    const id = rec.id;
    const title = rec.title || `Recording ${id}`;
    const date = rec.start_datetime || rec.end_datetime || new Date().toISOString();

    // Sanitize filename
    const safeName = title
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);

    const filename = `${safeName}.md`;
    const filepath = path.join(wildlandPath, filename);

    // Skip if already exists
    if (fs.existsSync(filepath)) continue;

    // Build the content from the rich data Grain provides
    const parts = [];

    // Summary
    if (rec.summary) {
      parts.push(`## Summary\n\n${rec.summary}`);
    }

    // Summary points (timestamped)
    if (rec.summary_points && rec.summary_points.length > 0) {
      const points = rec.summary_points.map(p => `- ${p.text}`).join('\n');
      parts.push(`## Key Points\n\n${points}`);
    }

    // Intelligence notes (Grain's AI-generated structured notes)
    if (rec.intelligence_notes_md) {
      parts.push(`## Notes\n\n${rec.intelligence_notes_md}`);
    }

    // Fetch full transcript via the text endpoint (simpler, cleaner)
    try {
      if (rec.transcript_txt_url) {
        const transcriptText = await requestText(rec.transcript_txt_url, apiKey);
        if (transcriptText && transcriptText.trim().length > 0) {
          parts.push(`## Transcript\n\n${transcriptText.trim()}`);
        }
      }
    } catch {
      // Fall back to JSON transcript
      try {
        if (rec.transcript_json_url) {
          const segments = await request(rec.transcript_json_url, apiKey);
          if (Array.isArray(segments) && segments.length > 0) {
            const transcript = segments
              .map(s => `**${s.speaker || 'Speaker'}:** ${s.text}`)
              .join('\n\n');
            parts.push(`## Transcript\n\n${transcript}`);
          }
        }
      } catch {
        // No transcript available
      }
    }

    const duration = rec.duration_ms ? Math.round(rec.duration_ms / 60000) : null;
    const owners = rec.owners ? rec.owners.join(', ') : '';

    const content = `---
source: grain
date: ${date}
title: "${title.replace(/"/g, '\\"')}"
type: transcript
grain_id: ${id}
${duration ? `duration_min: ${duration}` : ''}
${owners ? `owners: "${owners}"` : ''}
---

# ${title}

${parts.join('\n\n---\n\n')}
`;

    fs.writeFileSync(filepath, content, 'utf-8');
    synced++;
  }

  // Update last sync timestamp
  fs.writeFileSync(syncFile, new Date().toISOString(), 'utf-8');

  if (synced > 0) {
    console.log(`  ${synced} new recordings synced from Grain.`);
  }
}
