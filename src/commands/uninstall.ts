import chalk from 'chalk';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { getConfigDir, getConfigPath, loadConfig } from '../lib/config.js';

export async function uninstallCommand(): Promise<void> {
  console.log(chalk.yellow('\n🗑️  Uninstalling garden...\n'));

  // Read config before we delete it
  let wikiPath = '~/wiki';
  try {
    const config = loadConfig();
    wikiPath = config.wiki.path;
  } catch { /* not initialized, use default */ }

  // Remove cron entries
  try {
    const { execFileSync } = require('child_process');
    const existing = execFileSync('crontab', ['-l'], { encoding: 'utf-8' });
    const filtered = existing.split('\n').filter((l: string) => !l.includes('garden sync')).join('\n');
    execFileSync('crontab', ['-'], { input: filtered });
    console.log(chalk.green('  ✓ Removed cron entries'));
  } catch {
    console.log(chalk.dim('  ✓ No cron entries to remove'));
  }

  // Remove CLAUDE.md garden section
  const claudeMdPath = path.join(os.homedir(), '.claude', 'CLAUDE.md');
  try {
    if (fs.existsSync(claudeMdPath)) {
      let content = fs.readFileSync(claudeMdPath, 'utf-8');
      // Remove the garden section
      content = content.replace(/\n## Garden Wiki[\s\S]*?(?=\n## |\n$|$)/, '');
      fs.writeFileSync(claudeMdPath, content.trim() + '\n', 'utf-8');
      console.log(chalk.green('  ✓ Removed garden section from ~/.claude/CLAUDE.md'));
    }
  } catch {
    console.log(chalk.dim('  ✓ No CLAUDE.md changes needed'));
  }

  // Remove config directory
  const configDir = getConfigDir();
  if (fs.existsSync(configDir)) {
    fs.rmSync(configDir, { recursive: true });
    console.log(chalk.green('  ✓ Removed ~/.garden/'));
  }

  console.log(chalk.green('\n✓ Garden uninstalled.\n'));
  console.log(chalk.dim(`  Wiki files at ${wikiPath} were NOT removed.`));
  console.log(chalk.dim(`  To fully remove: rm -rf ${wikiPath} ${wikiPath}-wildland ${wikiPath}-html\n`));
}
