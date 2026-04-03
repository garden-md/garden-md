import fs from 'fs';
import path from 'path';
import os from 'os';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

export interface FolderConfig {
  name: string;
  desc: string;
}

export interface ConnectorConfig {
  name: string;
  scriptPath: string;
  schedule: string;
}

export interface GardenConfig {
  ai: {
    provider: 'anthropic' | 'openai' | 'gemini' | 'ollama' | 'claude-cli';
    apiKey?: string;
    model: string;
  };
  wiki: {
    path: string;
    wildland: string;
    html: string;
  };
  folders: FolderConfig[];
  connectors: ConnectorConfig[];
  schedule: {
    sync: string;
  };
  sync: {
    initialDays: number; // how many days back on first sync (0 = everything)
  };
  git: {
    enabled: boolean;
    autoCommit: boolean;
  };
}

const CONFIG_DIR = path.join(os.homedir(), '.garden');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.yaml');

export const DEFAULT_FOLDERS: FolderConfig[] = [
  { name: 'Meetings', desc: 'Call transcripts with wiki links added' },
  { name: 'People', desc: 'Anyone mentioned — team, clients, investors, contacts' },
  { name: 'Companies', desc: 'Any organization mentioned' },
  { name: 'Sessions', desc: 'AI chat sessions' },
  { name: 'Decisions', desc: 'Key decisions and their rationale' },
  { name: 'Products', desc: 'What the company is building' },
];

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export function configExists(): boolean {
  return fs.existsSync(CONFIG_PATH);
}

export function loadConfig(): GardenConfig {
  if (!configExists()) {
    throw new Error('Garden not initialized. Run `garden init` first.');
  }
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return parseYaml(raw) as GardenConfig;
}

export function saveConfig(config: GardenConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, stringifyYaml(config), { encoding: 'utf-8', mode: 0o600 });
}

export function resolveWikiPath(config: GardenConfig): string {
  return config.wiki.path.replace('~', os.homedir());
}

export function resolveWildlandPath(config: GardenConfig): string {
  return config.wiki.wildland.replace('~', os.homedir());
}

export function resolveHtmlPath(config: GardenConfig): string {
  return config.wiki.html.replace('~', os.homedir());
}

export function defaultConfig(): GardenConfig {
  return {
    ai: {
      provider: 'anthropic',
      apiKey: undefined,
      model: 'claude-sonnet-4-20250514',
    },
    wiki: {
      path: '~/wiki',
      wildland: '~/wiki-wildland',
      html: '~/wiki-html',
    },
    folders: [...DEFAULT_FOLDERS],
    connectors: [],
    schedule: {
      sync: '*/30 * * * *',
    },
    sync: {
      initialDays: 15,
    },
    git: {
      enabled: false,
      autoCommit: false,
    },
  };
}
