import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import { FolderConfig } from './config.js';

const CSS = `
:root {
  --bg: #1a1a2e;
  --surface: #16213e;
  --sidebar: #0f3460;
  --text: #e6e6e6;
  --text-dim: #8892a0;
  --accent: #53d769;
  --link: #64b5f6;
  --border: #2a2a4a;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
  display: flex;
  min-height: 100vh;
}
.sidebar {
  width: 260px;
  background: var(--sidebar);
  padding: 20px;
  border-right: 1px solid var(--border);
  position: fixed;
  height: 100vh;
  overflow-y: auto;
}
.sidebar h1 {
  font-size: 18px;
  margin-bottom: 8px;
  color: var(--accent);
}
.sidebar input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  margin-bottom: 16px;
  font-size: 14px;
}
.sidebar input::placeholder { color: var(--text-dim); }
.sidebar ul { list-style: none; }
.sidebar li { margin-bottom: 2px; }
.sidebar a {
  display: block;
  padding: 6px 10px;
  color: var(--text-dim);
  text-decoration: none;
  border-radius: 4px;
  font-size: 14px;
}
.sidebar a:hover { background: var(--bg); color: var(--text); }
.sidebar .folder-name {
  font-weight: 600;
  color: var(--text);
  margin-top: 12px;
  margin-bottom: 4px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.sidebar .count {
  color: var(--text-dim);
  font-size: 12px;
  margin-left: 4px;
}
.content {
  margin-left: 260px;
  padding: 40px 60px;
  max-width: 860px;
  flex: 1;
}
.content h1 { font-size: 28px; margin-bottom: 16px; color: var(--accent); }
.content h2 { font-size: 22px; margin-top: 28px; margin-bottom: 12px; }
.content h3 { font-size: 18px; margin-top: 20px; margin-bottom: 8px; }
.content p { line-height: 1.7; margin-bottom: 12px; }
.content a { color: var(--link); text-decoration: none; }
.content a:hover { text-decoration: underline; }
.content ul, .content ol { margin-left: 20px; margin-bottom: 12px; }
.content li { line-height: 1.7; }
.content code {
  background: var(--surface);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 14px;
}
.content pre {
  background: var(--surface);
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin-bottom: 16px;
}
.backlinks {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}
.backlinks h3 { color: var(--text-dim); font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
.backlinks ul { margin-top: 8px; }
@media (max-width: 768px) {
  .sidebar { display: none; }
  .content { margin-left: 0; padding: 20px; }
}
`;

const SEARCH_JS = `
document.getElementById('search').addEventListener('input', function(e) {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('.sidebar .page-link').forEach(function(el) {
    el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
});
`;

export async function generateHtml(
  wikiPath: string,
  htmlPath: string,
  folders: FolderConfig[]
): Promise<void> {
  fs.mkdirSync(htmlPath, { recursive: true });

  // Load metadata sidecar for proper display names
  let meta: Record<string, { title: string }> = {};
  const metaPath = path.join(wikiPath, '.garden-meta.json');
  if (fs.existsSync(metaPath)) {
    try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); } catch { /* ignore */ }
  }

  // Collect all pages
  const allPages: { name: string; folder: string; file: string; mdPath: string }[] = [];

  // Add Index.md
  const indexMd = path.join(wikiPath, 'Index.md');
  if (fs.existsSync(indexMd)) {
    allPages.push({ name: 'Index', folder: '', file: 'Index.md', mdPath: indexMd });
  }

  for (const folder of folders) {
    const folderPath = path.join(wikiPath, folder.name);
    if (!fs.existsSync(folderPath)) continue;
    fs.mkdirSync(path.join(htmlPath, folder.name), { recursive: true });

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const key = `${folder.name}/${file}`;
      const displayName = meta[key]?.title || file.replace('.md', '').replace(/-/g, ' ');
      allPages.push({
        name: displayName,
        folder: folder.name,
        file,
        mdPath: path.join(folderPath, file),
      });
    }
  }

  // Build sidebar HTML
  const sidebarHtml = buildSidebar(allPages, folders);

  // Render each page
  for (const page of allPages) {
    const mdContent = fs.readFileSync(page.mdPath, 'utf-8');

    // Convert .md links to .html links
    let processedMd = mdContent.replace(/\]\(([^)]+)\.md\)/g, ']($1.html)');

    const htmlContent = await marked(processedMd);

    // Find backlinks for this page
    const backlinks = findBacklinks(allPages, page, wikiPath);

    const fullHtml = renderPage(page.name, htmlContent, sidebarHtml, backlinks);

    const outPath = page.folder
      ? path.join(htmlPath, page.folder, page.file.replace('.md', '.html'))
      : path.join(htmlPath, page.file.replace('.md', '.html'));

    fs.writeFileSync(outPath, fullHtml, 'utf-8');
  }

  // Write CSS
  fs.writeFileSync(path.join(htmlPath, 'style.css'), CSS, 'utf-8');
  fs.writeFileSync(path.join(htmlPath, 'search.js'), SEARCH_JS, 'utf-8');

  // Copy index as root
  const indexHtml = path.join(htmlPath, 'Index.html');
  if (fs.existsSync(indexHtml)) {
    fs.copyFileSync(indexHtml, path.join(htmlPath, 'index.html'));
  }
}

function buildSidebar(
  pages: { name: string; folder: string; file: string }[],
  folders: FolderConfig[]
): string {
  let html = `<h1>🌱 garden</h1>
<input type="text" id="search" placeholder="Search pages...">
<a href="/Index.html" style="display:block;padding:6px 10px;color:#e6e6e6;text-decoration:none;margin-bottom:8px;">📋 Index</a>`;

  for (const folder of folders) {
    const folderPages = pages.filter(p => p.folder === folder.name);
    html += `<div class="folder-name">${folder.name} <span class="count">(${folderPages.length})</span></div>`;
    html += '<ul>';
    for (const page of folderPages) {
      html += `<li><a href="/${folder.name}/${page.file.replace('.md', '.html')}" class="page-link">${page.name}</a></li>`;
    }
    html += '</ul>';
  }

  return html;
}

function findBacklinks(
  allPages: { name: string; folder: string; file: string; mdPath: string }[],
  targetPage: { name: string; folder: string; file: string },
  wikiPath: string
): { name: string; href: string }[] {
  const backlinks: { name: string; href: string }[] = [];
  const targetRef = targetPage.folder
    ? `${targetPage.folder}/${targetPage.file}`
    : targetPage.file;

  for (const page of allPages) {
    if (page.mdPath === path.join(wikiPath, targetPage.folder, targetPage.file)) continue;
    const content = fs.readFileSync(page.mdPath, 'utf-8');
    if (content.includes(targetPage.file) || content.includes(targetPage.name)) {
      const href = page.folder
        ? `/${page.folder}/${page.file.replace('.md', '.html')}`
        : `/${page.file.replace('.md', '.html')}`;
      backlinks.push({ name: page.name, href });
    }
  }

  return backlinks;
}

function renderPage(
  title: string,
  content: string,
  sidebar: string,
  backlinks: { name: string; href: string }[]
): string {
  let backlinksHtml = '';
  if (backlinks.length > 0) {
    backlinksHtml = `<div class="backlinks">
      <h3>Backlinks</h3>
      <ul>${backlinks.map(b => `<li><a href="${b.href}">${b.name}</a></li>`).join('')}</ul>
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — garden</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <nav class="sidebar">${sidebar}</nav>
  <main class="content">
    ${content}
    ${backlinksHtml}
  </main>
  <script src="/search.js"></script>
</body>
</html>`;
}
