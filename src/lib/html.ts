import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import { FolderConfig } from './config.js';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Charter:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600&display=swap');

:root {
  --bg: #ffffff;
  --bg-warm: #f8f7f4;
  --surface: #f0efeb;
  --text: #1d1d1f;
  --text-secondary: #6e6e73;
  --text-tertiary: #aeaeb2;
  --accent: #0066cc;
  --accent-hover: #004499;
  --border: #d2d2d7;
  --border-light: #e8e8ed;
  --serif: 'Charter', 'Georgia', serif;
  --sans: 'Inter', -apple-system, system-ui, sans-serif;
  --content-width: 720px;
  --sidebar-width: 200px;
}

* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }

body {
  font-family: var(--serif);
  background: var(--bg);
  color: var(--text);
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  min-height: 100vh;
  line-height: 1.7;
  font-size: 16px;
}

/* ── Sidebar ── */
.sidebar {
  background: var(--bg-warm);
  border-right: 1px solid var(--border-light);
  padding: 28px 16px 20px;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sidebar::-webkit-scrollbar { width: 3px; }
.sidebar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

.sidebar-brand {
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  padding: 0 8px 20px;
  letter-spacing: -0.3px;
}
.sidebar-brand span { color: var(--text-tertiary); font-weight: 400; }

.sidebar input {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font-family: var(--sans);
  font-size: 13px;
  margin-bottom: 16px;
  transition: border-color 0.2s;
}
.sidebar input:focus { outline: none; border-color: var(--accent); }
.sidebar input::placeholder { color: var(--text-tertiary); }

.nav-section { display: flex; flex-direction: column; gap: 1px; }

.nav-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: 5px;
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s;
}
.nav-link:hover { background: var(--surface); color: var(--text); }
.nav-link.active { background: var(--bg); color: var(--accent); box-shadow: 0 1px 3px rgba(0,0,0,0.04); }

.nav-count {
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 400;
}

.sidebar-footer {
  margin-top: auto;
  padding-top: 16px;
  font-family: var(--sans);
  font-size: 11px;
  color: var(--text-tertiary);
  padding-left: 8px;
}

/* ── Content ── */
.content {
  padding: 48px 56px;
  max-width: calc(var(--content-width) + 112px);
}

/* ── Dashboard ── */
.dashboard-header { margin-bottom: 36px; }
.dashboard-header h1 {
  font-family: var(--serif);
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.5px;
}
.dashboard-header p {
  font-family: var(--sans);
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.stats-grid {
  display: flex;
  gap: 1px;
  background: var(--border-light);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 40px;
}
.stat-card {
  flex: 1;
  background: var(--bg);
  padding: 16px 20px;
  text-decoration: none;
  transition: background 0.15s;
}
.stat-card:hover { background: var(--bg-warm); }
.stat-label {
  font-family: var(--sans);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.stat-value {
  font-family: var(--serif);
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
}

.section-title {
  font-family: var(--sans);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-light);
}

.activity-list { list-style: none; }
.activity-item {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-light);
  font-size: 15px;
}
.activity-item:last-child { border-bottom: none; }
.activity-item a {
  color: var(--accent);
  text-decoration: none;
}
.activity-item a:hover { text-decoration: underline; }
.activity-date {
  font-family: var(--sans);
  font-size: 12px;
  color: var(--text-tertiary);
  margin-left: auto;
  flex-shrink: 0;
}

/* ── Folder listing ── */
.folder-header { margin-bottom: 24px; }
.folder-header h1 {
  font-family: var(--serif);
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
}
.folder-header .folder-count {
  font-family: var(--sans);
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.page-grid { display: flex; flex-direction: column; }
.page-card {
  display: block;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-light);
  text-decoration: none;
  transition: background 0.1s;
}
.page-card:first-child { border-top: 1px solid var(--border-light); }
.page-card:hover { background: var(--bg-warm); margin: 0 -12px; padding: 12px 12px; border-radius: 4px; border-color: transparent; }
.page-card:hover + .page-card { border-top-color: transparent; }
.page-card-title {
  color: var(--accent);
  font-size: 15px;
  font-weight: 400;
}
.page-card-meta {
  font-family: var(--sans);
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

/* ── Article pages ── */
.content h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 16px;
  line-height: 1.3;
  letter-spacing: -0.3px;
}
.content h2 {
  font-size: 20px;
  font-weight: 700;
  margin-top: 32px;
  margin-bottom: 10px;
  color: var(--text);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-light);
}
.content h3 {
  font-size: 16px;
  font-weight: 700;
  margin-top: 24px;
  margin-bottom: 6px;
  color: var(--text);
}
.content p { margin-bottom: 14px; font-size: 16px; line-height: 1.7; }
.content a { color: var(--accent); text-decoration: none; }
.content a:hover { text-decoration: underline; }
.content ul, .content ol { margin-left: 24px; margin-bottom: 14px; }
.content li { margin-bottom: 4px; font-size: 16px; }
.content blockquote {
  border-left: 3px solid var(--border);
  padding: 2px 0 2px 16px;
  margin: 12px 0;
  color: var(--text-secondary);
  font-style: italic;
}
.content code {
  font-family: 'SF Mono', 'Menlo', monospace;
  background: var(--bg-warm);
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 14px;
  color: var(--text);
}
.content pre {
  background: var(--bg-warm);
  border: 1px solid var(--border-light);
  padding: 14px 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin-bottom: 16px;
  font-size: 14px;
  line-height: 1.5;
}
.content hr {
  border: none;
  border-top: 1px solid var(--border-light);
  margin: 28px 0;
}
.content strong { font-weight: 700; }
.content table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
  font-size: 15px;
}
.content th, .content td {
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-light);
}
.content th {
  font-family: var(--sans);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* ── Backlinks ── */
.backlinks {
  margin-top: 40px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}
.backlinks h3 {
  font-family: var(--sans);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 8px;
}
.backlinks ul { list-style: none; margin: 0; }
.backlinks li { margin-bottom: 4px; }
.backlinks a {
  font-size: 14px;
  color: var(--accent);
}
.backlinks a:hover { text-decoration: underline; }

/* ── Responsive ── */
@media (max-width: 768px) {
  body { grid-template-columns: 1fr; }
  .sidebar {
    position: fixed;
    left: -260px;
    width: 260px;
    z-index: 100;
    transition: left 0.2s;
    background: var(--bg-warm);
  }
  .sidebar.open { left: 0; box-shadow: 4px 0 20px rgba(0,0,0,0.08); }
  .mobile-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    top: 12px; left: 12px;
    z-index: 101;
    width: 36px; height: 36px;
    background: var(--bg);
    border: 1px solid var(--border-light);
    border-radius: 8px;
    color: var(--text);
    font-size: 16px;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .content { padding: 48px 20px 20px; }
  .stats-grid { flex-direction: column; }
}
@media (min-width: 769px) {
  .mobile-toggle { display: none; }
}

/* ── Sync button ── */
.sync-btn {
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 500;
  padding: 7px 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.sync-btn:hover { background: var(--bg-warm); color: var(--text); border-color: var(--text-tertiary); }
.sync-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sync-btn.running { color: var(--accent); }
.sync-btn.done { color: #34a853; border-color: #34a853; }
.sync-btn.error { color: #ea4335; border-color: #ea4335; }

/* ── Animations ── */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.content { animation: fadeIn 0.2s ease; }
`;

const SEARCH_JS = `
const searchInput = document.getElementById('search');
if (searchInput) {
  searchInput.addEventListener('input', function(e) {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.page-card').forEach(function(el) {
      const title = el.querySelector('.page-card-title');
      if (title) el.style.display = title.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
    document.querySelectorAll('.activity-item').forEach(function(el) {
      el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}
// Sync & Tend button
window.syncTend = async function(btn) {
  btn.disabled = true;
  btn.className = 'sync-btn running';
  btn.textContent = 'Running…';
  try {
    const res = await fetch('/api/sync-tend', { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      btn.className = 'sync-btn done';
      btn.textContent = '✓ Done — reloading…';
      setTimeout(function() { location.reload(); }, 1000);
    } else {
      btn.className = 'sync-btn error';
      btn.textContent = 'Failed — retry?';
      btn.disabled = false;
    }
  } catch(e) {
    btn.className = 'sync-btn error';
    btn.textContent = 'Error — retry?';
    btn.disabled = false;
  }
};

const toggle = document.querySelector('.mobile-toggle');
const sidebar = document.querySelector('.sidebar');
if (toggle && sidebar) {
  toggle.addEventListener('click', function() { sidebar.classList.toggle('open'); });
  document.querySelector('.content')?.addEventListener('click', function() { sidebar.classList.remove('open'); });
}
`;

export async function generateHtml(
  wikiPath: string,
  htmlPath: string,
  folders: FolderConfig[]
): Promise<void> {
  fs.mkdirSync(htmlPath, { recursive: true });

  let meta: Record<string, { title: string }> = {};
  const metaPath = path.join(wikiPath, '.garden-meta.json');
  if (fs.existsSync(metaPath)) {
    try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); } catch { /* ignore */ }
  }

  interface PageInfo { name: string; folder: string; file: string; mdPath: string; mtime: Date }
  const allPages: PageInfo[] = [];

  for (const folder of folders) {
    const folderPath = path.join(wikiPath, folder.name);
    if (!fs.existsSync(folderPath)) continue;
    fs.mkdirSync(path.join(htmlPath, folder.name), { recursive: true });

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.md') && f !== 'Index.md');
    for (const file of files) {
      const key = `${folder.name}/${file}`;
      const displayName = meta[key]?.title || file.replace('.md', '').replace(/-/g, ' ');
      allPages.push({
        name: displayName,
        folder: folder.name,
        file,
        mdPath: path.join(folderPath, file),
        mtime: fs.statSync(path.join(folderPath, file)).mtime,
      });
    }
  }

  const folderStats = folders.map(f => {
    const count = allPages.filter(p => p.folder === f.name).length;
    return { name: f.name, desc: f.desc, count };
  });
  const totalPages = allPages.length;

  const sidebarHtml = buildSidebar(folderStats, totalPages);

  // ── Dashboard ──
  const recentMeetings = allPages
    .filter(p => p.folder === 'Meetings')
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
    .slice(0, 10);

  const statCardsHtml = folderStats
    .filter(f => f.count > 0)
    .map(f => `<a href="/${f.name}/index.html" class="stat-card">
      <div class="stat-label">${f.name}</div>
      <div class="stat-value">${f.count}</div>
    </a>`).join('\n');

  const activityHtml = recentMeetings.map(m => {
    const dateStr = m.mtime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `<li class="activity-item">
      <a href="/Meetings/${m.file.replace('.md', '.html')}">${m.name}</a>
      <span class="activity-date">${dateStr}</span>
    </li>`;
  }).join('\n');

  const indexContent = `
    <div class="dashboard-header">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <h1>Wiki</h1>
          <p>${totalPages} pages across ${folderStats.filter(f => f.count > 0).length} categories</p>
        </div>
        <button onclick="syncTend(this)" class="sync-btn">Sync &amp; Tend</button>
      </div>
    </div>
    <div class="stats-grid">${statCardsHtml}</div>
    ${recentMeetings.length > 0 ? `
    <div class="activity-section">
      <div class="section-title">Recent</div>
      <ul class="activity-list">${activityHtml}</ul>
    </div>` : ''}
  `;

  fs.writeFileSync(path.join(htmlPath, 'index.html'), renderPage('Wiki', indexContent, sidebarHtml, [], true), 'utf-8');
  fs.writeFileSync(path.join(htmlPath, 'Index.html'), renderPage('Wiki', indexContent, sidebarHtml, [], true), 'utf-8');

  // ── Folder index pages ──
  for (const folder of folders) {
    const folderPages = allPages
      .filter(p => p.folder === folder.name)
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    const cardsHtml = folderPages.map(p => {
      const dateStr = p.mtime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `<a href="/${folder.name}/${p.file.replace('.md', '.html')}" class="page-card">
        <div class="page-card-title">${p.name}</div>
        <div class="page-card-meta">${dateStr}</div>
      </a>`;
    }).join('\n');

    const folderContent = `
      <div class="folder-header">
        <h1>${folder.name}</h1>
        <div class="folder-count">${folderPages.length} pages${folder.desc ? ' · ' + folder.desc : ''}</div>
      </div>
      <div class="page-grid">${cardsHtml || '<p style="color:var(--text-tertiary)">No pages yet.</p>'}</div>
    `;

    fs.mkdirSync(path.join(htmlPath, folder.name), { recursive: true });
    fs.writeFileSync(
      path.join(htmlPath, folder.name, 'index.html'),
      renderPage(folder.name, folderContent, sidebarHtml, [], false, folder.name),
      'utf-8'
    );
  }

  // ── Individual pages ──
  for (const page of allPages) {
    const mdContent = fs.readFileSync(page.mdPath, 'utf-8');
    let processedMd = mdContent.replace(/\]\(([^)]+)\.md\)/g, ']($1.html)');
    const htmlContent = await marked(processedMd);
    const backlinks = findBacklinks(allPages, page, wikiPath);
    const outPath = path.join(htmlPath, page.folder, page.file.replace('.md', '.html'));
    fs.writeFileSync(
      outPath,
      renderPage(page.name, htmlContent, sidebarHtml, backlinks, false, page.folder),
      'utf-8'
    );
  }

  fs.writeFileSync(path.join(htmlPath, 'style.css'), CSS, 'utf-8');
  fs.writeFileSync(path.join(htmlPath, 'search.js'), SEARCH_JS, 'utf-8');
}

function buildSidebar(
  folderStats: { name: string; desc: string; count: number }[],
  totalPages: number
): string {
  const navLinks = folderStats.map(f =>
    `<a href="/${f.name}/index.html" class="nav-link" data-folder="${f.name}">
      ${f.name} <span class="nav-count">${f.count}</span>
    </a>`
  ).join('');

  return `
    <div class="sidebar-brand">garden <span>.md</span></div>
    <input type="text" id="search" placeholder="Search…">
    <a href="/index.html" class="nav-link" data-folder="">Wiki <span class="nav-count">${totalPages}</span></a>
    <div class="nav-section">${navLinks}</div>
    <div class="sidebar-footer">garden-md</div>
  `;
}

function findBacklinks(
  allPages: { name: string; folder: string; file: string; mdPath: string }[],
  targetPage: { name: string; folder: string; file: string },
  wikiPath: string
): { name: string; href: string }[] {
  const backlinks: { name: string; href: string }[] = [];
  for (const page of allPages) {
    if (page.folder === targetPage.folder && page.file === targetPage.file) continue;
    const content = fs.readFileSync(page.mdPath, 'utf-8');
    if (content.includes(targetPage.file) || content.includes(targetPage.name)) {
      backlinks.push({ name: page.name, href: `/${page.folder}/${page.file.replace('.md', '.html')}` });
    }
  }
  return backlinks;
}

function renderPage(
  title: string,
  content: string,
  sidebar: string,
  backlinks: { name: string; href: string }[],
  isDashboard = false,
  activeFolder = ''
): string {
  let backlinksHtml = '';
  if (backlinks.length > 0) {
    backlinksHtml = `<div class="backlinks">
      <h3>Referenced By</h3>
      <ul>${backlinks.map(b => `<li><a href="${b.href}">${b.name}</a></li>`).join('')}</ul>
    </div>`;
  }

  const processedSidebar = sidebar.replace(
    new RegExp(`data-folder="${activeFolder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`),
    `data-folder="${activeFolder}" class="nav-link active"`
  ).replace('class="nav-link" data-folder="" class="nav-link active"', 'class="nav-link active" data-folder=""');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — garden</title>
  <link rel="stylesheet" href="/style.css">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌱</text></svg>">
</head>
<body>
  <button class="mobile-toggle">☰</button>
  <nav class="sidebar">${processedSidebar}</nav>
  <main class="content">
    ${content}
    ${backlinksHtml}
  </main>
  <script src="/search.js"></script>
</body>
</html>`;
}
