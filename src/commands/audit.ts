import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { loadConfig, resolveWikiPath } from '../lib/config.js';

interface AuditIssue {
  type: 'orphan' | 'broken-link' | 'stale' | 'empty-stub' | 'missing-index';
  severity: 'warn' | 'info';
  file: string;
  message: string;
}

export async function auditCommand(): Promise<void> {
  const config = loadConfig();
  const wikiPath = resolveWikiPath(config);
  const folders = config.folders.map((f: any) => f.name);

  console.log(chalk.green('\n🔍 Auditing wiki...\n'));

  const issues: AuditIssue[] = [];
  const allFiles: { folder: string; file: string; fullPath: string; content: string; mtime: Date }[] = [];

  // Collect all wiki pages
  for (const folder of folders) {
    const folderPath = path.join(wikiPath, folder);
    if (!fs.existsSync(folderPath)) continue;

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.md') && f !== 'Index.md');
    for (const file of files) {
      const fullPath = path.join(folderPath, file);
      allFiles.push({
        folder,
        file,
        fullPath,
        content: fs.readFileSync(fullPath, 'utf-8'),
        mtime: fs.statSync(fullPath).mtime,
      });
    }
  }

  // 1. Broken links — markdown links pointing to non-existent files
  for (const page of allFiles) {
    const linkMatches = page.content.matchAll(/\]\(\.\.\/([^)]+\.md)\)/g);
    for (const match of linkMatches) {
      const target = match[1];
      const targetPath = path.join(wikiPath, target);
      if (!fs.existsSync(targetPath)) {
        issues.push({
          type: 'broken-link',
          severity: 'warn',
          file: `${page.folder}/${page.file}`,
          message: `Link to ${target} — file does not exist`,
        });
      }
    }
  }

  // 2. Orphaned pages — entity pages with no backlinks from any meeting
  const meetingContents = allFiles
    .filter(f => f.folder === 'Meetings')
    .map(f => f.content);
  const allMeetingText = meetingContents.join('\n');

  for (const page of allFiles) {
    if (page.folder === 'Meetings') continue; // meetings aren't orphans

    // Check if any meeting references this file
    const isReferenced = allMeetingText.includes(page.file);
    if (!isReferenced) {
      // Also check if referenced by other entity pages
      const otherPages = allFiles.filter(f => f.fullPath !== page.fullPath);
      const referencedElsewhere = otherPages.some(f => f.content.includes(page.file));
      if (!referencedElsewhere) {
        issues.push({
          type: 'orphan',
          severity: 'info',
          file: `${page.folder}/${page.file}`,
          message: 'No page links to this file',
        });
      }
    }
  }

  // 3. Empty stubs — entity pages with only "Mentioned in:" and no context
  for (const page of allFiles) {
    if (page.folder === 'Meetings') continue;
    const lines = page.content.split('\n').filter(l => l.trim().length > 0);
    // A stub with just H1 + "Mentioned in:" + links is considered empty
    // Context includes blockquotes (entity descriptions) and non-boilerplate text
    const hasContext = lines.some(l =>
      !l.startsWith('#') &&
      !l.startsWith('-') &&
      !l.startsWith('|') &&
      !l.includes('Mentioned') &&
      // Blockquotes with real content count as context
      (l.startsWith('>') ? l.replace(/^>\s*/, '').trim().length > 10 : (
        !l.startsWith('**') && l.trim().length > 5
      ))
    );
    const mentionCount = (page.content.match(/^- [🔵⚪🔹]/gm) || []).length;
    if (!hasContext && mentionCount <= 1) {
      issues.push({
        type: 'empty-stub',
        severity: 'info',
        file: `${page.folder}/${page.file}`,
        message: 'Stub with only 1 mention and no additional context',
      });
    }
  }

  // 4. Stale pages — not updated in 30+ days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  for (const page of allFiles) {
    if (page.mtime < thirtyDaysAgo) {
      const daysAgo = Math.round((Date.now() - page.mtime.getTime()) / 86400000);
      issues.push({
        type: 'stale',
        severity: 'info',
        file: `${page.folder}/${page.file}`,
        message: `Last updated ${daysAgo} days ago`,
      });
    }
  }

  // 5. Missing folder Index.md
  for (const folder of folders) {
    const folderPath = path.join(wikiPath, folder);
    if (!fs.existsSync(folderPath)) continue;
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.md') && f !== 'Index.md');
    if (files.length > 0 && !fs.existsSync(path.join(folderPath, 'Index.md'))) {
      issues.push({
        type: 'missing-index',
        severity: 'warn',
        file: `${folder}/`,
        message: `${files.length} pages but no Index.md`,
      });
    }
  }

  // Report
  if (issues.length === 0) {
    console.log(chalk.green('  ✓ Wiki is clean. No issues found.\n'));
    return;
  }

  // Group by type
  const grouped: Record<string, AuditIssue[]> = {};
  for (const issue of issues) {
    if (!grouped[issue.type]) grouped[issue.type] = [];
    grouped[issue.type].push(issue);
  }

  const typeLabels: Record<string, string> = {
    'broken-link': '🔗 Broken Links',
    'orphan': '👻 Orphaned Pages',
    'empty-stub': '📄 Thin Stubs',
    'stale': '⏰ Stale Pages (30+ days)',
    'missing-index': '📋 Missing Folder Index',
  };

  const warnings = issues.filter(i => i.severity === 'warn').length;
  const infos = issues.filter(i => i.severity === 'info').length;

  for (const [type, items] of Object.entries(grouped)) {
    console.log(chalk.bold(`  ${typeLabels[type] || type} (${items.length})\n`));
    for (const item of items.slice(0, 15)) {
      const icon = item.severity === 'warn' ? chalk.yellow('⚠') : chalk.dim('·');
      console.log(`    ${icon} ${chalk.cyan(item.file)} — ${chalk.dim(item.message)}`);
    }
    if (items.length > 15) {
      console.log(chalk.dim(`    ... and ${items.length - 15} more`));
    }
    console.log();
  }

  console.log(chalk.dim(`  Summary: ${warnings} warnings, ${infos} info\n`));
  console.log(`  ${chalk.dim('Run')} ${chalk.bold('garden tend')} ${chalk.dim('to regenerate folder indexes.')}`);
  console.log(`  ${chalk.dim('Stale pages may need manual review or a fresh')} ${chalk.bold('garden sync')}\n`);
}
