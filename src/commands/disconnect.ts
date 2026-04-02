import { select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { loadConfig, saveConfig, getConfigDir } from '../lib/config.js';

export async function disconnectCommand(): Promise<void> {
  const config = loadConfig();

  if (!config.connectors || config.connectors.length === 0) {
    console.log(chalk.yellow('\nNo connectors configured.\n'));
    return;
  }

  const choice = await select({
    message: 'Which connector do you want to remove?',
    choices: config.connectors.map((c: any, i: number) => ({
      name: `${c.name} (${path.basename(c.scriptPath)})`,
      value: i,
    })),
  });

  const connector = config.connectors[choice as number];
  const ok = await confirm({
    message: `Remove ${connector.name} connector? (script + API key will be deleted)`,
    default: false,
  });

  if (!ok) {
    console.log(chalk.dim('\nCancelled.\n'));
    return;
  }

  // Delete script file
  if (connector.scriptPath && fs.existsSync(connector.scriptPath)) {
    fs.unlinkSync(connector.scriptPath);
  }

  // Delete key file
  const connectorsDir = path.join(getConfigDir(), 'connectors');
  const baseName = path.basename(connector.scriptPath, '.mjs');
  const keyFile = path.join(connectorsDir, `${baseName}.key`);
  if (fs.existsSync(keyFile)) {
    fs.unlinkSync(keyFile);
  }

  // Delete last-sync marker from wildland
  const wildlandPath = config.wiki?.wildland;
  if (wildlandPath) {
    const syncFile = path.join(wildlandPath, `.${baseName}-last-sync`);
    if (fs.existsSync(syncFile)) {
      fs.unlinkSync(syncFile);
    }
  }

  // Remove from config
  config.connectors.splice(choice as number, 1);
  saveConfig(config);

  console.log(chalk.green(`\n✓ Removed ${connector.name} connector.`));
  console.log(chalk.dim('  Wildland files from this connector are kept.\n'));
}
