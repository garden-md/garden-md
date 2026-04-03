import chalk from 'chalk';
import express from 'express';
import { execFileSync } from 'child_process';
import net from 'net';
import { loadConfig, resolveHtmlPath, resolveWikiPath } from '../lib/config.js';
import { generateHtml } from '../lib/html.js';

export async function openCommand(): Promise<void> {
  const config = loadConfig();
  const htmlPath = resolveHtmlPath(config);
  const wikiPath = resolveWikiPath(config);

  const fs = await import('fs');

  // Check if wiki has any content (markdown files in any folder)
  const hasWikiContent = config.folders.some((f: any) => {
    const folderPath = `${wikiPath}/${f.name}`;
    return fs.existsSync(folderPath) && fs.readdirSync(folderPath).some((file: string) => file.endsWith('.md'));
  });

  if (!hasWikiContent) {
    console.log(chalk.yellow('\nYour wiki is empty. Run `garden sync && garden tend` first.\n'));
    return;
  }

  // Always regenerate HTML from wiki to ensure it's fresh
  console.log(chalk.dim('  Generating HTML...'));
  fs.mkdirSync(htmlPath, { recursive: true });
  await generateHtml(wikiPath, htmlPath, config.folders);

  let port = 4242;
  while (await isPortTaken(port)) {
    port++;
  }

  const app = express();
  app.use(express.static(htmlPath));

  app.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(chalk.green(`\n🌱 Wiki running at ${chalk.bold(url)}\n`));
    console.log(chalk.dim('  Press Ctrl+C to stop.\n'));

    // Open in browser
    try {
      const platform = process.platform;
      if (platform === 'darwin') {
        execFileSync('open', [url]);
      } else if (platform === 'linux') {
        execFileSync('xdg-open', [url]);
      } else if (platform === 'win32') {
        execFileSync('cmd', ['/c', 'start', url]);
      }
    } catch {
      // Can't open browser — that's fine, URL is printed
    }
  });
}

function isPortTaken(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}
