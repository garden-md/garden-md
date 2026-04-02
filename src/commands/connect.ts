import { input } from '@inquirer/prompts';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import ora from 'ora';
import { loadConfig, saveConfig, getConfigDir, resolveWildlandPath } from '../lib/config.js';
import { callAI } from '../lib/ai.js';

export async function connectCommand(options: { repair?: boolean }): Promise<void> {
  const config = loadConfig();

  if (options.repair) {
    return repairConnector(config);
  }

  console.log(chalk.green('\n🔌 Connect a data source\n'));

  // Conversational flow — LLM drives the interaction
  const serviceName = await input({
    message: 'What service do you want to connect?',
  });

  const apiKey = await input({
    message: `API key for ${serviceName}:`,
    validate: (val) => val.length > 0 || 'API key is required',
  });

  const dataDesc = await input({
    message: 'What data should I sync? (e.g., "meeting transcripts from the last 30 days")',
    default: 'all available data',
  });

  const spinner = ora('Generating sync connector...').start();

  try {
    const wildlandPath = resolveWildlandPath(config);
    const connectorsDir = path.join(getConfigDir(), 'connectors');
    fs.mkdirSync(connectorsDir, { recursive: true });

    const scriptPath = path.join(connectorsDir, `${sanitizeName(serviceName)}.mjs`);

    // Ask the LLM to write a connector script
    const systemPrompt = `You are a developer writing a Node.js sync script. 
The script must:
1. Use the provided API key to fetch data from the service
2. Write each item as a separate .md file in the wildland directory
3. Each .md file should have YAML frontmatter with: source, date, title, type
4. The body should be the raw content (transcript text, document content, etc.)
5. Track the last sync timestamp in a .last-sync file to avoid re-fetching
6. Use only built-in Node.js modules (fs, path, https/http, url) — no npm dependencies
7. Export a default async function that takes { apiKey, wildlandPath } as argument
8. Handle errors gracefully — log them but don't crash

Output ONLY the JavaScript code. No explanation, no markdown blocks.`;

    const userPrompt = `Write a sync script for: ${serviceName}
API key: will be passed as argument (don't hardcode it)
Data to sync: ${dataDesc}
Wildland directory: will be passed as argument

The script should fetch data and write .md files like:
---
source: ${serviceName}
date: 2026-03-30T10:00:00Z
title: Meeting with Acme Corp
type: transcript
---

[raw content here]`;

    const script = await callAI(config, systemPrompt, userPrompt);
    
    // Clean up potential markdown wrapping
    let cleanScript = script.trim();
    const codeMatch = cleanScript.match(/```(?:javascript|js|mjs)?\s*([\s\S]*?)```/);
    if (codeMatch) {
      cleanScript = codeMatch[1].trim();
    }

    fs.writeFileSync(scriptPath, cleanScript, { encoding: 'utf-8', mode: 0o600 });

    spinner.stop();

    // Show generated script for review before execution
    console.log(chalk.yellow('\n📄 Generated connector script:\n'));
    console.log(chalk.dim('─'.repeat(60)));
    console.log(cleanScript);
    console.log(chalk.dim('─'.repeat(60)));
    console.log(chalk.dim(`\nSaved to: ${scriptPath}\n`));

    const { confirm } = await import('@inquirer/prompts');
    const approved = await confirm({
      message: 'Review the script above. Run it now?',
      default: true,
    });

    if (!approved) {
      console.log(chalk.yellow('\n⏸ Skipped. Edit the script manually, then run `garden sync` to test.\n'));
      return;
    }

    const runSpinner = ora('Testing connection...').start();

    // Test the connector by importing and running it directly
    try {
      const mod = await import(scriptPath);
      const fn = mod.default || mod.sync;
      await fn({ apiKey, wildlandPath });
    } catch (err: any) {
      runSpinner.fail('Connection test failed');
      console.log(chalk.yellow('\nThe connector script may need adjustments.'));
      console.log(chalk.dim(`Script saved at: ${scriptPath}`));
      console.log(chalk.dim(`Error: ${err.message?.slice(0, 200)}`));
      console.log(chalk.dim('\nYou can edit the script manually or run `garden connect --repair`'));
      return;
    }

    // Count files created
    const wildlandFiles = fs.readdirSync(wildlandPath).filter(f => f.endsWith('.md'));

    // Save connector to config
    config.connectors.push({
      name: serviceName,
      scriptPath,
      schedule: config.schedule.sync,
    });

    // Store the API key securely in the connector config
    const keyFile = path.join(connectorsDir, `${sanitizeName(serviceName)}.key`);
    fs.writeFileSync(keyFile, apiKey, { mode: 0o600 });

    saveConfig(config);

    runSpinner.succeed(`Connected to ${serviceName}`);
    console.log(`\n  ${chalk.cyan(wildlandFiles.length)} items in wildland`);
    console.log(`  Connector saved to ${chalk.dim(scriptPath)}`);
    console.log(`\n  Next: run ${chalk.bold('garden tend')} to process items into your wiki.\n`);

  } catch (err: any) {
    spinner.fail('Failed to create connector');
    console.log(chalk.red(`Error: ${err.message}`));
  }
}

async function repairConnector(config: any): Promise<void> {
  if (config.connectors.length === 0) {
    console.log(chalk.yellow('\nNo connectors to repair.\n'));
    return;
  }

  const { select } = await import('@inquirer/prompts');
  const connectorName = await select({
    message: 'Which connector needs repair?',
    choices: config.connectors.map((c: any) => ({
      name: c.name,
      value: c.name,
    })),
  });

  const connector = config.connectors.find((c: any) => c.name === connectorName);
  if (!connector) return;

  const spinner = ora(`Repairing ${connectorName} connector...`).start();

  try {
    const scriptContent = fs.readFileSync(connector.scriptPath, 'utf-8');
    const fixedScript = await callAI(config, 
      `You are debugging a Node.js sync script that is failing. Fix the script and return ONLY the corrected JavaScript code. No explanation.`,
      `This sync script for "${connectorName}" is failing. Please fix it:\n\n${scriptContent}`
    );

    let cleanScript = fixedScript.trim();
    const codeMatch = cleanScript.match(/```(?:javascript|js|mjs)?\s*([\s\S]*?)```/);
    if (codeMatch) cleanScript = codeMatch[1].trim();

    fs.writeFileSync(connector.scriptPath, cleanScript, 'utf-8');
    spinner.succeed(`Repaired ${connectorName} connector`);
    console.log(chalk.dim(`  Run \`garden sync\` to test.\n`));
  } catch (err: any) {
    spinner.fail(`Failed to repair: ${err.message}`);
  }
}

function sanitizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
