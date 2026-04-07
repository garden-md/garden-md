// garden-md connector: Fireflies.ai (https://fireflies.ai)
// Syncs meeting transcripts via Fireflies GraphQL API.
// API docs: https://docs.fireflies.ai

import fs from 'fs';
import path from 'path';
import https from 'https';

const API_URL = 'https://api.fireflies.ai/graphql';

function graphql(query, variables, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables });
    const url = new URL(API_URL);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Fireflies API ${res.statusCode}: ${data.slice(0, 300)}`));
          return;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.errors) {
            reject(new Error(`Fireflies GraphQL error: ${JSON.stringify(parsed.errors[0])}`));
            return;
          }
          resolve(parsed.data);
        } catch {
          reject(new Error(`Invalid JSON from Fireflies: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const LIST_QUERY = `
  query Transcripts($fromDate: DateTime, $limit: Int, $skip: Int) {
    transcripts(fromDate: $fromDate, limit: $limit, skip: $skip, mine: true) {
      id
      title
      dateString
      duration
      organizer_email
      participants
    }
  }
`;

const DETAIL_QUERY = `
  query Transcript($id: String!) {
    transcript(id: $id) {
      id
      title
      dateString
      duration
      organizer_email
      participants
      speakers {
        id
        name
      }
      sentences {
        speaker_name
        raw_text
      }
      summary {
        overview
        action_items
        short_summary
      }
      meeting_attendees {
        displayName
        email
      }
    }
  }
`;

export async function test({ apiKey }) {
  const result = await graphql('query { transcripts { id title } }', {}, apiKey);
  const transcripts = result?.transcripts || [];
  return { ok: true, message: transcripts.length > 0 ? 'Connected — transcripts found' : 'Connected — no transcripts yet' };
}

export default async function sync({ apiKey, wildlandPath, initialDays = 15 }) {
  fs.mkdirSync(wildlandPath, { recursive: true });

  // Load last sync timestamp
  const syncFile = path.join(wildlandPath, '.fireflies-last-sync');
  let lastSync = null;
  if (fs.existsSync(syncFile)) {
    lastSync = fs.readFileSync(syncFile, 'utf-8').trim();
  } else if (initialDays > 0) {
    lastSync = new Date(Date.now() - initialDays * 86400000).toISOString();
  }

  // Fetch transcripts list (paginated)
  let allTranscripts = [];
  let skip = 0;
  const limit = 50;

  while (true) {
    const variables = { limit, skip };
    if (lastSync) variables.fromDate = lastSync;

    const data = await graphql(LIST_QUERY, variables, apiKey);
    const transcripts = data.transcripts || [];
    allTranscripts = allTranscripts.concat(transcripts);

    if (transcripts.length < limit) break;
    skip += limit;

    // Safety cap
    if (allTranscripts.length > 500) break;
  }

  if (allTranscripts.length === 0) {
    console.log('  No new transcripts from Fireflies.');
    return;
  }

  let synced = 0;
  for (const t of allTranscripts) {
    const id = t.id;
    const title = t.title || `Meeting ${id}`;
    const date = t.dateString || new Date().toISOString();

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

    // Fetch full transcript
    let body = '';
    try {
      const detail = await graphql(DETAIL_QUERY, { id }, apiKey);
      const tr = detail.transcript;

      const parts = [];

      // Attendees
      if (tr.meeting_attendees && tr.meeting_attendees.length > 0) {
        const attendeeList = tr.meeting_attendees
          .map(a => `- ${a.displayName || a.email}${a.email ? ` (${a.email})` : ''}`)
          .join('\n');
        parts.push(`## Attendees\n\n${attendeeList}`);
      }

      // Summary
      if (tr.summary) {
        if (tr.summary.overview) {
          parts.push(`## Summary\n\n${tr.summary.overview}`);
        }
        if (tr.summary.action_items) {
          parts.push(`## Action Items\n\n${tr.summary.action_items}`);
        }
      }

      // Transcript sentences
      if (tr.sentences && tr.sentences.length > 0) {
        const transcript = tr.sentences
          .map(s => `**${s.speaker_name || 'Speaker'}:** ${s.raw_text}`)
          .join('\n\n');
        parts.push(`## Transcript\n\n${transcript}`);
      }

      body = parts.join('\n\n---\n\n');
    } catch (err) {
      body = `(Could not fetch transcript details: ${err.message?.slice(0, 100)})`;
    }

    const content = `---
source: fireflies
date: ${date}
title: "${title.replace(/"/g, '\\"')}"
type: transcript
fireflies_id: ${id}
duration: ${t.duration || 0}
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
    console.log(`  ${synced} new transcripts synced from Fireflies.`);
  }
}
