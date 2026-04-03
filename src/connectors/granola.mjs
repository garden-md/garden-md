// garden-md connector: Granola (https://granola.ai)
// Syncs meeting notes from Granola's public API v1.
// API docs: https://docs.granola.ai/api-reference

import fs from 'fs';
import path from 'path';
import https from 'https';

const API_BASE = 'https://public-api.granola.ai';

function request(endpoint, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${endpoint}`;
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
          reject(new Error(`Granola API ${res.statusCode}: ${data.slice(0, 200)}`));
          return;
        }
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Invalid JSON from Granola: ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

export async function test({ apiKey }) {
  const result = await request('/v1/documents?limit=1', apiKey);
  const docs = result.documents || result.data || [];
  return { ok: true, message: docs.length > 0 ? 'Connected — documents found' : 'Connected — no documents yet' };
}

export default async function sync({ apiKey, wildlandPath, initialDays = 15 }) {
  fs.mkdirSync(wildlandPath, { recursive: true });

  // Load last sync timestamp
  const syncFile = path.join(wildlandPath, '.granola-last-sync');
  let lastSync = null;
  if (fs.existsSync(syncFile)) {
    lastSync = fs.readFileSync(syncFile, 'utf-8').trim();
  } else if (initialDays > 0) {
    lastSync = new Date(Date.now() - initialDays * 86400000).toISOString();
  }

  // Fetch notes list with pagination
  let cursor = null;
  let allNotes = [];

  do {
    let endpoint = '/v1/notes?page_size=30';
    if (lastSync) endpoint += `&created_after=${lastSync}`;
    if (cursor) endpoint += `&cursor=${cursor}`;

    const result = await request(endpoint, apiKey);
    const notes = result.notes || [];
    allNotes = allNotes.concat(notes);
    cursor = result.hasMore ? result.cursor : null;
  } while (cursor);

  if (allNotes.length === 0) {
    console.log('  No new notes from Granola.');
    return;
  }

  let synced = 0;
  for (const note of allNotes) {
    const id = note.id;
    const title = note.title || `Note ${id}`;
    const date = note.created_at || new Date().toISOString();

    // Fetch full note with transcript
    let body = '';
    try {
      const detail = await request(`/v1/notes/${id}?include=transcript`, apiKey);

      // Build content from summary + transcript
      const parts = [];

      if (detail.summary_markdown) {
        parts.push(detail.summary_markdown);
      } else if (detail.summary_text) {
        parts.push(detail.summary_text);
      }

      if (detail.attendees && detail.attendees.length > 0) {
        const attendeeList = detail.attendees
          .map(a => `- ${a.name}${a.email ? ` (${a.email})` : ''}`)
          .join('\n');
        parts.push(`## Attendees\n\n${attendeeList}`);
      }

      if (detail.transcript && Array.isArray(detail.transcript)) {
        const transcriptText = detail.transcript
          .map(t => {
            const speaker = t.speaker?.source === 'microphone' ? 'You' : (t.speaker?.name || 'Speaker');
            return `**${speaker}:** ${t.text}`;
          })
          .join('\n\n');
        parts.push(`## Transcript\n\n${transcriptText}`);
      }

      body = parts.join('\n\n---\n\n');
    } catch {
      body = `(Could not fetch full note for ${title})`;
    }

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

    const content = `---
source: granola
date: ${date}
title: "${title.replace(/"/g, '\\"')}"
type: meeting-note
granola_id: ${id}
---

# ${title}

${body}
`;

    fs.writeFileSync(filepath, content, 'utf-8');
    synced++;
  }

  // Update last sync timestamp
  fs.writeFileSync(syncFile, new Date().toISOString(), 'utf-8');

  if (synced > 0) {
    console.log(`  ${synced} new notes synced from Granola.`);
  }
}
