import { input, select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ora from 'ora';
import { loadConfig, saveConfig, getConfigDir, resolveWildlandPath } from '../lib/config.js';
import { callAI } from '../lib/ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface BuiltinConnector {
  name: string;
  id: string;
  description: string;
  scriptFile: string;
  apiKeyHint: string;
}

const BUILTIN_CONNECTORS: BuiltinConnector[] = [
  {
    name: 'Grain',
    id: 'grain',
    description: 'Meeting recordings & transcripts from Grain',
    scriptFile: 'grain.mjs',
    apiKeyHint: 'Go to grain.com → Settings → API → Create workspace access token',
  },
  {
    name: 'Granola',
    id: 'granola',
    description: 'Meeting notes & transcripts from Granola',
    scriptFile: 'granola.mjs',
    apiKeyHint: 'Go to granola.ai → Settings → API → Generate API key',
  },
  {
    name: 'Fireflies',
    id: 'fireflies',
    description: 'Meeting transcripts & summaries from Fireflies.ai',
    scriptFile: 'fireflies.mjs',
    apiKeyHint: 'Go to app.fireflies.ai → Integrations → Fireflies API → Copy API key',
  },
];

export async function connectCommand(options: { repair?: boolean }): Promise<void> {
  const config = loadConfig();

  if (options.repair) {
    return repairConnector(config);
  }

  console.log(chalk.green('\n🔌 Connect a data source\n'));

  // Service picker
  const serviceChoice = await select({
    message: 'Which service do you want to connect?',
    choices: [
      ...BUILTIN_CONNECTORS.map(c => ({
        name: `${c.name} — ${c.description}`,
        value: c.id,
      })),
      { name: 'Other — connect any service with an API', value: 'other' },
    ],
  });

  const builtin = BUILTIN_CONNECTORS.find(c => c.id === serviceChoice);

  if (builtin) {
    return connectBuiltin(config, builtin);
  } else {
    return connectCustom(config);
  }
}

async function connectBuiltin(config: any, connector: BuiltinConnector): Promise<void> {
  console.log(chalk.dim(`\n  ${connector.apiKeyHint}\n`));

  const apiKey = await input({
    message: `API key for ${connector.name}:`,
    validate: (val) => val.length > 0 || 'API key is required',
  });

  const wildlandPath = resolveWildlandPath(config);
  const connectorsDir = path.join(getConfigDir(), 'connectors');
  fs.mkdirSync(connectorsDir, { recursive: true });

  // Copy built-in connector script
  const srcScript = path.join(__dirname, '..', 'connectors', connector.scriptFile);
  const destScript = path.join(connectorsDir, connector.scriptFile);
  fs.copyFileSync(srcScript, destScript);
  fs.chmodSync(destScript, 0o600);

  const spinner = ora(`Testing connection to ${connector.name}...`).start();

  try {
    const mod = await import(destScript);
    const fn = mod.default || mod.sync;
    await fn({ apiKey, wildlandPath, initialDays: config.sync?.initialDays ?? 15 });

    const wildlandFiles = fs.readdirSync(wildlandPath).filter(f => f.endsWith('.md'));

    config.connectors.push({
      name: connector.name,
      scriptPath: destScript,
      schedule: config.schedule.sync,
    });

    const keyFile = path.join(connectorsDir, `${connector.id}.key`);
    fs.writeFileSync(keyFile, apiKey, { mode: 0o600 });

    saveConfig(config);

    spinner.succeed(`Connected to ${connector.name}`);
    console.log(`\n  ${chalk.cyan(wildlandFiles.length)} items in wildland`);
    console.log(`\n  Next: run ${chalk.bold('garden tend')} to process items into your wiki.\n`);
  } catch (err: any) {
    spinner.fail(`Connection to ${connector.name} failed`);
    console.log(chalk.dim(`  Error: ${err.message?.slice(0, 300)}`));
    console.log(chalk.dim(`  Script: ${destScript}`));
    console.log(chalk.dim('\n  Check your API key and try again.\n'));
  }
}

async function connectCustom(config: any): Promise<void> {
  const serviceName = await input({
    message: 'Service name:',
    validate: (val) => val.length > 0 || 'Name is required',
  });

  const docsUrl = await input({
    message: 'API documentation URL (helps generate a better connector):',
    default: '',
  });

  const apiKey = await input({
    message: `API key for ${serviceName}:`,
    validate: (val) => val.length > 0 || 'API key is required',
  });

  const dataDesc = await input({
    message: 'What data should I sync? (e.g., "meeting transcripts from the last 30 days")',
    default: 'all available data',
  });

  // Fetch docs if URL provided
  let docsContext = '';
  if (docsUrl) {
    const spinner = ora('Reading API docs...').start();
    try {
      const { default: https } = await import('https');
      const { default: http } = await import('http');
      const fetcher = docsUrl.startsWith('https') ? https : http;
      const docsContent = await new Promise<string>((resolve, reject) => {
        fetcher.get(docsUrl, (res: any) => {
          let data = '';
          res.on('data', (chunk: string) => data += chunk);
          res.on('end', () => resolve(data.slice(0, 8000)));
        }).on('error', reject);
      });
      docsContext = `\n\nAPI documentation (from ${docsUrl}):\n${docsContent}`;
      spinner.succeed('Read API docs');
    } catch {
      spinner.warn('Could not fetch docs — generating connector from description only');
    }
  }

  const genSpinner = ora('Generating sync connector...').start();

  try {
    const wildlandPath = resolveWildlandPath(config);
    const connectorsDir = path.join(getConfigDir(), 'connectors');
    fs.mkdirSync(connectorsDir, { recursive: true });

    const scriptPath = path.join(connectorsDir, `${sanitizeName(serviceName)}.mjs`);

    const systemPrompt = `You are a developer writing a Node.js ESM sync script.
The script must:
1. Use the provided API key to fetch data from the service
2. Write each item as a separate .md file in the wildland directory
3. Each .md file should have YAML frontmatter with: source, date, title, type
4. The body should be the raw content (transcript text, document content, etc.)
5. Track the last sync timestamp in a .last-sync file to avoid re-fetching
6. Use only built-in Node.js modules (fs, path, https/http, url) — no npm dependencies
7. Export a default async function that takes { apiKey, wildlandPath } as argument
8. Handle errors gracefully — log them but don't crash
9. Sanitize filenames: normalize NFD, strip diacritics, lowercase, replace non-alphanumeric with hyphens

Output ONLY the JavaScript code. No explanation, no markdown code blocks.`;

    const userPrompt = `Write a sync script for: ${serviceName}
API key: will be passed as argument (don't hardcode it)
Data to sync: ${dataDesc}
Wildland directory: will be passed as argument${docsContext}`;

    const script = await callAI(config, systemPrompt, userPrompt);

    // Clean up potential markdown wrapping
    let cleanScript = script.trim();
    const codeMatch = cleanScript.match(/```(?:javascript|js|mjs)?\s*([\s\S]*?)```/);
    if (codeMatch) {
      cleanScript = codeMatch[1].trim();
    }

    fs.writeFileSync(scriptPath, cleanScript, { encoding: 'utf-8', mode: 0o600 });

    genSpinner.stop();

    // Show generated script for review before execution
    console.log(chalk.yellow('\n📄 Generated connector script:\n'));
    console.log(chalk.dim('─'.repeat(60)));
    console.log(cleanScript);
    console.log(chalk.dim('─'.repeat(60)));
    console.log(chalk.dim(`\nSaved to: ${scriptPath}\n`));

    const approved = await confirm({
      message: 'Review the script above. Run it now?',
      default: true,
    });

    if (!approved) {
      console.log(chalk.yellow('\n⏸ Skipped. Edit the script manually, then run `garden sync` to test.\n'));

      // Still save connector to config so --repair works
      config.connectors.push({
        name: serviceName,
        scriptPath,
        schedule: config.schedule.sync,
      });
      const keyFile = path.join(connectorsDir, `${sanitizeName(serviceName)}.key`);
      fs.writeFileSync(keyFile, apiKey, { mode: 0o600 });
      saveConfig(config);
      return;
    }

    const runSpinner = ora('Testing connection...').start();

    try {
      const mod = await import(scriptPath);
      const fn = mod.default || mod.sync;
      await fn({ apiKey, wildlandPath, initialDays: config.sync?.initialDays ?? 15 });
    } catch (err: any) {
      runSpinner.fail('Connection test failed');
      console.log(chalk.yellow('\nThe connector script may need adjustments.'));
      console.log(chalk.dim(`Script saved at: ${scriptPath}`));
      console.log(chalk.dim(`Error: ${err.message?.slice(0, 200)}`));
      console.log(chalk.dim('\nYou can edit the script manually or run `garden connect --repair`'));

      // Save connector so --repair works
      config.connectors.push({
        name: serviceName,
        scriptPath,
        schedule: config.schedule.sync,
      });
      const keyFile = path.join(connectorsDir, `${sanitizeName(serviceName)}.key`);
      fs.writeFileSync(keyFile, apiKey, { mode: 0o600 });
      saveConfig(config);
      return;
    }

    const wildlandFiles = fs.readdirSync(wildlandPath).filter(f => f.endsWith('.md'));

    config.connectors.push({
      name: serviceName,
      scriptPath,
      schedule: config.schedule.sync,
    });

    const keyFile = path.join(connectorsDir, `${sanitizeName(serviceName)}.key`);
    fs.writeFileSync(keyFile, apiKey, { mode: 0o600 });
    saveConfig(config);

    runSpinner.succeed(`Connected to ${serviceName}`);
    console.log(`\n  ${chalk.cyan(wildlandFiles.length)} items in wildland`);
    console.log(`  Connector saved to ${chalk.dim(scriptPath)}`);
    console.log(`\n  Next: run ${chalk.bold('garden tend')} to process items into your wiki.\n`);

  } catch (err: any) {
    genSpinner.fail('Failed to create connector');
    console.log(chalk.red(`Error: ${err.message}`));
  }
}

async function repairConnector(config: any): Promise<void> {
  // Check for orphaned scripts (connector failed before saving to config)
  const connectorsDir = path.join(getConfigDir(), 'connectors');
  const orphanedScripts: string[] = [];

  if (fs.existsSync(connectorsDir)) {
    const scripts = fs.readdirSync(connectorsDir).filter(f => f.endsWith('.mjs'));
    const configuredPaths = config.connectors.map((c: any) => path.basename(c.scriptPath));
    for (const script of scripts) {
      if (!configuredPaths.includes(script)) {
        orphanedScripts.push(script);
      }
    }
  }

  if (config.connectors.length === 0 && orphanedScripts.length === 0) {
    console.log(chalk.yellow('\nNo connectors to repair.\n'));
    return;
  }

  const choices = [
    ...config.connectors.map((c: any) => ({
      name: `${c.name} (configured)`,
      value: { type: 'configured', name: c.name },
    })),
    ...orphanedScripts.map(s => ({
      name: `${s} (orphaned — failed during setup)`,
      value: { type: 'orphaned', script: s },
    })),
  ];

  const selection = await select({
    message: 'Which connector needs repair?',
    choices,
  }) as any;

  if (selection.type === 'orphaned') {
    // Show the broken script
    const scriptPath = path.join(connectorsDir, selection.script);
    const content = fs.readFileSync(scriptPath, 'utf-8');
    console.log(chalk.yellow(`\n📄 Orphaned script (${selection.script}):\n`));
    console.log(chalk.dim(content.slice(0, 2000)));
    console.log(chalk.dim('\nThis script was generated but failed. Options:'));
    console.log(chalk.dim('  1. Edit it manually: ' + scriptPath));
    console.log(chalk.dim('  2. Delete and re-run: garden connect'));
    console.log(chalk.dim('  3. Let AI try to fix it (below)\n'));

    const fix = await confirm({ message: 'Try to auto-fix with AI?', default: true });
    if (!fix) return;

    const spinner = ora('Repairing...').start();
    try {
      const fixedScript = await callAI(config,
        `You are debugging a Node.js ESM sync script. Fix the script and return ONLY the corrected JavaScript code. No explanation, no markdown code blocks.`,
        `This sync script is failing. Please fix it:\n\n${content}`
      );
      let cleanScript = fixedScript.trim();
      const codeMatch = cleanScript.match(/```(?:javascript|js|mjs)?\s*([\s\S]*?)```/);
      if (codeMatch) cleanScript = codeMatch[1].trim();

      fs.writeFileSync(scriptPath, cleanScript, { encoding: 'utf-8', mode: 0o600 });
      spinner.succeed('Script repaired');
      console.log(chalk.dim(`  Run \`garden connect\` to re-test, or \`garden sync\` if already configured.\n`));
    } catch (err: any) {
      spinner.fail(`Failed to repair: ${err.message}`);
    }
    return;
  }

  // Configured connector repair
  const connector = config.connectors.find((c: any) => c.name === selection.name);
  if (!connector) return;

  const spinner = ora(`Repairing ${connector.name} connector...`).start();

  try {
    const scriptContent = fs.readFileSync(connector.scriptPath, 'utf-8');
    const fixedScript = await callAI(config,
      `You are debugging a Node.js ESM sync script. Fix the script and return ONLY the corrected JavaScript code. No explanation, no markdown code blocks.`,
      `This sync script for "${connector.name}" is failing. Please fix it:\n\n${scriptContent}`
    );

    let cleanScript = fixedScript.trim();
    const codeMatch = cleanScript.match(/```(?:javascript|js|mjs)?\s*([\s\S]*?)```/);
    if (codeMatch) cleanScript = codeMatch[1].trim();

    fs.writeFileSync(connector.scriptPath, cleanScript, { encoding: 'utf-8', mode: 0o600 });
    spinner.succeed(`Repaired ${connector.name} connector`);
    console.log(chalk.dim(`  Run \`garden sync\` to test.\n`));
  } catch (err: any) {
    spinner.fail(`Failed to repair: ${err.message}`);
  }
}

function sanitizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
