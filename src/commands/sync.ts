import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';

import { loadConfig, getConfigDir, resolveWildlandPath } from '../lib/config.js';

export async function syncCommand(options: { schedule?: boolean; unschedule?: boolean }): Promise<void> {
  const config = loadConfig();

  if (options.schedule) {
    return scheduleSync(config);
  }

  if (options.unschedule) {
    return unscheduleSync();
  }

  // Run all connectors
  if (config.connectors.length === 0) {
    console.log(chalk.yellow('\nNo connectors configured. Run `garden connect` first.\n'));
    return;
  }

  // Check for recent failures and warn
  const logPath = path.join(getConfigDir(), 'logs', 'sync.log');
  if (fs.existsSync(logPath)) {
    const logContent = fs.readFileSync(logPath, 'utf-8');
    const lines = logContent.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    if (lastLine?.includes('FAIL')) {
      console.log(chalk.yellow(`\n⚠ Last sync had failures. Check ${logPath}\n`));
    }
  }

  const wildlandPath = resolveWildlandPath(config);
  const beforeCount = fs.existsSync(wildlandPath) 
    ? fs.readdirSync(wildlandPath).filter(f => f.endsWith('.md')).length 
    : 0;

  for (const connector of config.connectors) {
    const spinner = ora(`Syncing ${connector.name}...`).start();
    
    try {
      const keyFile = path.join(getConfigDir(), 'connectors', `${sanitizeName(connector.name)}.key`);
      const apiKey = fs.readFileSync(keyFile, 'utf-8').trim();

      const mod = await import(connector.scriptPath);
      const fn = mod.default || mod.sync;
      await fn({ apiKey, wildlandPath });

      spinner.succeed(`${connector.name}: synced`);
      logSync(connector.name, 'OK');
    } catch (err: any) {
      spinner.fail(`${connector.name}: failed`);
      console.log(chalk.dim(`  Error: ${err.message?.slice(0, 200)}`));
      console.log(chalk.dim(`  Run \`garden connect --repair\` to fix.`));
      logSync(connector.name, `FAIL: ${err.message?.slice(0, 100)}`);
    }
  }

  const afterCount = fs.readdirSync(wildlandPath).filter(f => f.endsWith('.md')).length;
  const newItems = afterCount - beforeCount;

  console.log(chalk.green(`\n✓ ${newItems} new items in wildland (${afterCount} total)\n`));

  if (newItems > 0) {
    console.log(`  Run ${chalk.bold('garden tend')} to process them into your wiki.\n`);
  }
}

async function scheduleSync(config: any): Promise<void> {
  const gardenBin = process.argv[1];
  const cronLine = `${config.schedule.sync} ${process.execPath} ${gardenBin} sync >> ~/.garden/logs/cron.log 2>&1`;

  try {
    let existing = '';
    try {
      const { execFileSync: efs } = await import('child_process');
      existing = efs('crontab', ['-l'], { encoding: 'utf-8' });
    } catch { /* no crontab */ }

    // Remove old garden entries
    const filtered = existing.split('\n').filter(l => !l.includes('garden sync')).join('\n');
    const newCrontab = filtered.trim() + '\n' + cronLine + '\n';

    // Ensure log dir exists
    const logDir = path.join(getConfigDir(), 'logs');
    fs.mkdirSync(logDir, { recursive: true });

    const { execFileSync } = await import('child_process');
    execFileSync('crontab', ['-'], { input: newCrontab });
    console.log(chalk.green(`\n✓ Cron scheduled: ${config.schedule.sync}`));
    console.log(chalk.dim(`  ${cronLine}\n`));
  } catch (err: any) {
    console.log(chalk.red(`Failed to set crontab: ${err.message}`));
  }
}

async function unscheduleSync(): Promise<void> {
  try {
    const { execFileSync } = await import('child_process');
    const existing = execFileSync('crontab', ['-l'], { encoding: 'utf-8' });
    const filtered = existing.split('\n').filter((l: string) => !l.includes('garden sync')).join('\n');
    execFileSync('crontab', ['-'], { input: filtered });
    console.log(chalk.green('\n✓ Cron entries removed.\n'));
  } catch {
    console.log(chalk.dim('No crontab entries to remove.'));
  }
}

function logSync(name: string, status: string): void {
  const logDir = path.join(getConfigDir(), 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, 'sync.log');
  const entry = `${new Date().toISOString()} [${name}] ${status}\n`;
  fs.appendFileSync(logPath, entry);
}

function sanitizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
