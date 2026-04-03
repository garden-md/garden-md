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
    const { execFileSync } = await import('child_process');
    const existing = execFileSync('crontab', ['-l'], { encoding: 'utf-8' });
    const filtered = existing.split('\n').filter((l: string) => !l.includes('garden sync')).join('\n');
    execFileSync('crontab', ['-'], { input: filtered });
    console.log(chalk.green('  ✓ Removed cron entries'));
  } catch {
    console.log(chalk.dim('  ✓ No cron entries to remove'));
  }

  // Remove garden section from all AI agent config files
  const agentFiles = [
    { name: 'Claude Code', path: path.join(os.homedir(), '.claude', 'CLAUDE.md') },
    { name: 'Codex', path: path.join(os.homedir(), 'AGENTS.md') },
    { name: 'OpenClaw', path: path.join(os.homedir(), '.openclaw', 'workspace', 'MEMORY.md') },
    { name: 'OpenClaw', path: path.join(os.homedir(), '.openclaw', 'workspace', 'AGENTS.md') },
    { name: 'Cursor', path: path.join(os.homedir(), '.cursorrules') },
    { name: 'Windsurf', path: path.join(os.homedir(), '.windsurfrules') },
  ];

  for (const agent of agentFiles) {
    try {
      if (fs.existsSync(agent.path)) {
        let content = fs.readFileSync(agent.path, 'utf-8');
        if (content.includes('## Garden Wiki')) {
          content = content.replace(/\n## Garden Wiki[\s\S]*?(?=\n## |\n$|$)/, '');
          fs.writeFileSync(agent.path, content.trim() + '\n', 'utf-8');
          console.log(chalk.green(`  ✓ Removed garden section from ${agent.name}`));
        }
      }
    } catch {
      // skip
    }
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
