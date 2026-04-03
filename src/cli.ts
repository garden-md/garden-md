#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { connectCommand } from './commands/connect.js';
import { syncCommand } from './commands/sync.js';
import { tendCommand } from './commands/tend.js';
import { openCommand } from './commands/open.js';
import { configCommand } from './commands/config.js';
import { disconnectCommand } from './commands/disconnect.js';
import { uninstallCommand } from './commands/uninstall.js';
import { addCommand, removeCommand, renameCommand, listCommand } from './commands/folders.js';
import { auditCommand } from './commands/audit.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __cliDir = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__cliDir, '..', 'package.json'), 'utf-8'));

const program = new Command();

program
  .name('garden')
  .description('Turn your meeting transcripts into a Wikipedia for your company.')
  .version(pkg.version);

program
  .command('init')
  .description('Initialize your garden wiki')
  .action(initCommand);

program
  .command('connect')
  .description('Connect a data source')
  .option('--repair', 'Repair a broken connector')
  .action(connectCommand);

program
  .command('disconnect')
  .description('Remove a connected data source')
  .action(disconnectCommand);

program
  .command('sync')
  .description('Run all connectors')
  .option('--schedule', 'Write crontab entries for automatic sync')
  .option('--unschedule', 'Remove crontab entries')
  .action(syncCommand);

program
  .command('tend')
  .description('Process wildland items into wiki pages')
  .action(tendCommand);

program
  .command('open')
  .description('Open the wiki in your browser')
  .action(openCommand);

program
  .command('config')
  .description('Update garden configuration')
  .action(configCommand);

program
  .command('uninstall')
  .description('Remove garden configuration and cron entries')
  .action(uninstallCommand);

program
  .command('add <folder>')
  .description('Add a folder to the wiki')
  .action(addCommand);

program
  .command('remove <folder>')
  .description('Remove a folder from the wiki')
  .action(removeCommand);

program
  .command('rename <from> <to>')
  .description('Rename a wiki folder')
  .action(renameCommand);

program
  .command('list')
  .description('List wiki folders')
  .action(listCommand);

program
  .command('audit')
  .description('Check wiki health — broken links, orphans, stale pages')
  .action(auditCommand);

program.parseAsync().catch((err: Error) => {
  if (err.message?.includes('not initialized')) {
    console.error(chalk.red(`\n✗ ${err.message}\n`));
  } else {
    console.error(chalk.red(`\n✗ ${err.message || err}\n`));
  }
  process.exit(1);
});
