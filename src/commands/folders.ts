import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { loadConfig, saveConfig, resolveWikiPath } from '../lib/config.js';

function validateFolderName(name: string): string | null {
  if (!name || !name.trim()) return 'Folder name cannot be empty.';
  if (/[\/\\]/.test(name)) return 'Folder name cannot contain slashes.';
  if (/^\.\.?$/.test(name.trim())) return 'Folder name cannot be "." or "..".';
  if (/\.\./.test(name)) return 'Folder name cannot contain path traversal ("..").';
  if (name.length > 100) return 'Folder name is too long (max 100 chars).';
  return null;
}

export async function addCommand(folder: string): Promise<void> {
  const validationError = validateFolderName(folder);
  if (validationError) {
    console.log(chalk.red(`\n✗ ${validationError}\n`));
    process.exit(1);
  }

  const config = loadConfig();
  const wikiPath = resolveWikiPath(config);

  // Check if folder already exists
  if (config.folders.find(f => f.name.toLowerCase() === folder.toLowerCase())) {
    console.log(chalk.yellow(`\nFolder "${folder}" already exists.\n`));
    return;
  }

  // Add to config
  config.folders.push({
    name: folder,
    desc: '', // User or AI can fill this in later
  });

  // Create directory
  fs.mkdirSync(path.join(wikiPath, folder), { recursive: true });

  saveConfig(config);
  console.log(chalk.green(`\n✓ Added ${folder}/\n`));
}

export async function removeCommand(folder: string): Promise<void> {
  const config = loadConfig();
  const wikiPath = resolveWikiPath(config);

  const idx = config.folders.findIndex(f => f.name.toLowerCase() === folder.toLowerCase());
  if (idx === -1) {
    console.log(chalk.yellow(`\nFolder "${folder}" not found.\n`));
    return;
  }

  // Check if folder has content
  const folderPath = path.join(wikiPath, config.folders[idx].name);
  if (fs.existsSync(folderPath)) {
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.md'));
    if (files.length > 0) {
      console.log(chalk.yellow(`\n⚠ ${config.folders[idx].name}/ contains ${files.length} pages.`));
      console.log(chalk.yellow('  Files will remain on disk but garden will stop routing to this folder.\n'));
    }
  }

  config.folders.splice(idx, 1);
  saveConfig(config);
  console.log(chalk.green(`\n✓ Removed ${folder} from garden config.\n`));
}

export async function renameCommand(from: string, to: string): Promise<void> {
  const validationError = validateFolderName(to);
  if (validationError) {
    console.log(chalk.red(`\n✗ ${validationError}\n`));
    process.exit(1);
  }

  const config = loadConfig();
  const wikiPath = resolveWikiPath(config);

  const folder = config.folders.find(f => f.name.toLowerCase() === from.toLowerCase());
  if (!folder) {
    console.log(chalk.yellow(`\nFolder "${from}" not found.\n`));
    return;
  }

  const oldPath = path.join(wikiPath, folder.name);
  const newPath = path.join(wikiPath, to);

  // Rename on disk
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
  }

  folder.name = to;
  saveConfig(config);
  console.log(chalk.green(`\n✓ Renamed ${from} → ${to}\n`));
}

export async function listCommand(): Promise<void> {
  const config = loadConfig();
  const wikiPath = resolveWikiPath(config);

  console.log(chalk.green('\n📁 Wiki folders:\n'));

  for (const folder of config.folders) {
    const folderPath = path.join(wikiPath, folder.name);
    let count = 0;
    if (fs.existsSync(folderPath)) {
      count = fs.readdirSync(folderPath).filter(f => f.endsWith('.md')).length;
    }
    const desc = folder.desc ? chalk.dim(` — ${folder.desc}`) : '';
    console.log(`  ${chalk.cyan(folder.name + '/')}  ${chalk.dim(`(${count} pages)`)}${desc}`);
  }
  console.log();
}
