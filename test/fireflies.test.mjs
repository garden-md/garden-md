import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import http from 'http';

// Spin up a local HTTP server that pretends to be the Fireflies GraphQL API,
// then point the connector at it by patching the API_URL at import time.
// Since the connector hard-codes https://api.fireflies.ai/graphql, we instead
// test by importing the module source, extracting the test function's behavior,
// and verifying the query string + result handling directly.

// Simpler approach: just parse the source and validate the fix statically,
// then do a live integration test against a tiny local server.

describe('Fireflies connector — test() fix verification', () => {

  it('source should NOT contain size argument in test query', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(
      new URL('../src/connectors/fireflies.mjs', import.meta.url),
      'utf-8'
    );

    // Extract the test() function body
    const testFnMatch = src.match(/export\s+async\s+function\s+test\s*\([^)]*\)\s*\{([\s\S]*?)^\}/m);
    expect(testFnMatch).toBeTruthy();
    const testBody = testFnMatch[1];

    // Bug #1: should NOT have size argument
    expect(testBody).not.toContain('size:');
    expect(testBody).not.toContain('size :');

    // The query should just be { transcripts { id title } }
    expect(testBody).toContain('transcripts { id title }');
  });

  it('source should NOT double-unwrap result.data.transcripts', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(
      new URL('../src/connectors/fireflies.mjs', import.meta.url),
      'utf-8'
    );

    const testFnMatch = src.match(/export\s+async\s+function\s+test\s*\([^)]*\)\s*\{([\s\S]*?)^\}/m);
    const testBody = testFnMatch[1];

    // Bug #2: graphql() already returns parsed.data, so should be result?.transcripts
    expect(testBody).not.toContain('result?.data?.transcripts');
    expect(testBody).toContain('result?.transcripts');
  });

  it('graphql() helper unwraps parsed.data (so callers get data directly)', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(
      new URL('../src/connectors/fireflies.mjs', import.meta.url),
      'utf-8'
    );

    // The graphql function should resolve(parsed.data)
    expect(src).toContain('resolve(parsed.data)');
  });

  it('sync() uses data.transcripts (consistent with graphql() unwrap)', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(
      new URL('../src/connectors/fireflies.mjs', import.meta.url),
      'utf-8'
    );

    // sync function accesses data.transcripts (not data.data.transcripts)
    expect(src).toContain('data.transcripts');
    // And the sync function doesn't double-unwrap
    expect(src).not.toMatch(/data\.data\.transcripts/);
  });
});
