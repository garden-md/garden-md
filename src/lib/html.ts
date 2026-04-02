import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import { FolderConfig } from './config.js';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&display=swap');

:root {
  --bg: #0c0c0f;
  --surface: #141418;
  --surface-2: #1a1a20;
  --surface-3: #22222a;
  --text: #d4d4d8;
  --text-bright: #fafafa;
  --text-dim: #63636e;
  --accent: #22d3ee;
  --accent-dim: rgba(34,211,238,0.12);
  --accent-2: #a78bfa;
  --green: #4ade80;
  --amber: #fbbf24;
  --border: #27272f;
  --border-light: #333340;
  --mono: 'JetBrains Mono', monospace;
  --serif: 'Source Serif 4', Georgia, serif;
  --radius: 8px;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  font-family: var(--serif);
  background: var(--bg);
  color: var(--text);
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: 100vh;
  line-height: 1.6;
}

/* ── Sidebar ── */
.sidebar {
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 24px 16px;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sidebar::-webkit-scrollbar { width: 4px; }
.sidebar::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 2px; }

.sidebar-brand {
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  padding: 8px 10px 20px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 12px;
}
.sidebar-brand span { opacity: 0.4; }

.sidebar input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font-family: var(--mono);
  font-size: 12px;
  margin-bottom: 16px;
  transition: border-color 0.2s;
}
.sidebar input:focus { outline: none; border-color: var(--accent); }
.sidebar input::placeholder { color: var(--text-dim); }

.nav-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nav-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  color: var(--text-dim);
  text-decoration: none;
  border-radius: 6px;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 500;
  transition: all 0.15s;
  letter-spacing: 0.3px;
}
.nav-link:hover { background: var(--surface-2); color: var(--text-bright); }
.nav-link.active { background: var(--accent-dim); color: var(--accent); }
.nav-count {
  font-size: 10px;
  background: var(--surface-3);
  color: var(--text-dim);
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 600;
}
.nav-link:hover .nav-count { background: var(--border-light); color: var(--text); }

.sidebar-footer {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  font-family: var(--mono);
  font-size: 10px;
  color: var(--text-dim);
  padding-left: 10px;
  letter-spacing: 0.5px;
}

/* ── Content ── */
.content {
  padding: 48px 64px;
  max-width: 900px;
}

/* ── Dashboard (Index page) ── */
.dashboard-header {
  margin-bottom: 40px;
}
.dashboard-header h1 {
  font-family: var(--mono);
  font-size: 22px;
  font-weight: 700;
  color: var(--text-bright);
  letter-spacing: -0.5px;
}
.dashboard-header p {
  font-size: 14px;
  color: var(--text-dim);
  margin-top: 4px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 40px;
}
.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  transition: border-color 0.2s, transform 0.15s;
  text-decoration: none;
  display: block;
}
.stat-card:hover { border-color: var(--accent); transform: translateY(-2px); }
.stat-label {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 500;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}
.stat-value {
  font-family: var(--mono);
  font-size: 28px;
  font-weight: 700;
  color: var(--text-bright);
}
.stat-bar {
  height: 3px;
  background: var(--border);
  border-radius: 2px;
  margin-top: 10px;
  overflow: hidden;
}
.stat-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s ease;
}

.activity-section {
  margin-bottom: 40px;
}
.section-title {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.activity-list { list-style: none; }
.activity-item {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
}
.activity-item:last-child { border-bottom: none; }
.activity-dot {
  width: 6px;
  height: 6px;
  background: var(--accent);
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;
}
.activity-item a {
  color: var(--text);
  text-decoration: none;
  transition: color 0.15s;
}
.activity-item a:hover { color: var(--accent); }
.activity-date {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text-dim);
  margin-left: auto;
  flex-shrink: 0;
}

/* ── Activity sparkline ── */
.sparkline-container {
  margin-bottom: 40px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
}
.sparkline-title {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 16px;
}
.sparkline {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 48px;
}
.spark-bar {
  flex: 1;
  background: var(--accent-dim);
  border-radius: 2px 2px 0 0;
  min-height: 2px;
  transition: background 0.2s;
}
.spark-bar:hover { background: var(--accent); }

/* ── Folder listing page ── */
.folder-header {
  margin-bottom: 32px;
}
.folder-header h1 {
  font-family: var(--mono);
  font-size: 20px;
  font-weight: 700;
  color: var(--text-bright);
}
.folder-header .folder-count {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--text-dim);
  margin-top: 4px;
}

.page-grid {
  display: grid;
  gap: 8px;
}
.page-card {
  display: block;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
  text-decoration: none;
  transition: border-color 0.2s, background 0.2s;
}
.page-card:hover { border-color: var(--border-light); background: var(--surface-2); }
.page-card-title {
  color: var(--text-bright);
  font-size: 14px;
  font-weight: 600;
}
.page-card-meta {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text-dim);
  margin-top: 4px;
}

/* ── Article pages ── */
.content h1 { font-size: 26px; font-weight: 700; color: var(--text-bright); margin-bottom: 20px; line-height: 1.3; }
.content h2 { font-size: 20px; font-weight: 600; margin-top: 36px; margin-bottom: 12px; color: var(--text-bright); }
.content h3 { font-size: 16px; font-weight: 600; margin-top: 24px; margin-bottom: 8px; color: var(--text); }
.content p { margin-bottom: 14px; font-size: 15px; }
.content a { color: var(--accent); text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.15s; }
.content a:hover { border-bottom-color: var(--accent); }
.content ul, .content ol { margin-left: 20px; margin-bottom: 14px; }
.content li { margin-bottom: 4px; font-size: 15px; }
.content code {
  font-family: var(--mono);
  background: var(--surface-2);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--accent-2);
}
.content pre {
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 16px;
  border-radius: var(--radius);
  overflow-x: auto;
  margin-bottom: 16px;
  font-size: 13px;
}
.content hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 32px 0;
}
.content strong { color: var(--text-bright); }

/* ── Backlinks ── */
.backlinks {
  margin-top: 48px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}
.backlinks h3 {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 12px;
}
.backlinks ul { list-style: none; margin: 0; }
.backlinks li { margin-bottom: 6px; }
.backlinks a {
  font-size: 13px;
  color: var(--text-dim);
  transition: color 0.15s;
}
.backlinks a:hover { color: var(--accent); }

/* ── Responsive ── */
@media (max-width: 768px) {
  body { grid-template-columns: 1fr; }
  .sidebar {
    position: fixed;
    left: -260px;
    width: 260px;
    z-index: 100;
    transition: left 0.2s;
  }
  .sidebar.open { left: 0; }
  .mobile-toggle {
    display: block;
    position: fixed;
    top: 12px; left: 12px;
    z-index: 101;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 10px;
    color: var(--text);
    font-family: var(--mono);
    font-size: 14px;
    cursor: pointer;
  }
  .content { padding: 48px 20px 20px; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 769px) {
  .mobile-toggle { display: none; }
}

/* ── Animations ── */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-in { animation: fadeUp 0.3s ease both; }
.stat-card:nth-child(1) { animation-delay: 0s; }
.stat-card:nth-child(2) { animation-delay: 0.05s; }
.stat-card:nth-child(3) { animation-delay: 0.1s; }
.stat-card:nth-child(4) { animation-delay: 0.15s; }
.stat-card:nth-child(5) { animation-delay: 0.2s; }
.stat-card:nth-child(6) { animation-delay: 0.25s; }
.activity-item { animation: fadeUp 0.3s ease both; }
`;

const SEARCH_JS = `
// Search filter
const searchInput = document.getElementById('search');
if (searchInput) {
  searchInput.addEventListener('input', function(e) {
    const q = e.target.value.toLowerCase();
    // If on a folder page, filter page cards
    document.querySelectorAll('.page-card').forEach(function(el) {
      const title = el.querySelector('.page-card-title');
      if (title) {
        el.style.display = title.textContent.toLowerCase().includes(q) ? '' : 'none';
      }
    });
    // Filter activity items
    document.querySelectorAll('.activity-item').forEach(function(el) {
      el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

// Mobile nav toggle
const toggle = document.querySelector('.mobile-toggle');
const sidebar = document.querySelector('.sidebar');
if (toggle && sidebar) {
  toggle.addEventListener('click', function() {
    sidebar.classList.toggle('open');
  });
}

// Stagger animations
document.querySelectorAll('.activity-item').forEach(function(el, i) {
  el.style.animationDelay = (i * 0.04) + 's';
});
`;

// Color assignments for stat bars per folder
const FOLDER_COLORS: Record<string, string> = {
  Meetings: 'var(--accent)',
  People: 'var(--accent-2)',
  Companies: 'var(--amber)',
  Products: 'var(--green)',
  Sessions: '#f472b6',
  Decisions: '#fb923c',
};

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
  interface PageInfo { name: string; folder: string; file: string; mdPath: string; mtime: Date }
  const allPages: PageInfo[] = [];

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
        mtime: fs.statSync(path.join(folderPath, file)).mtime,
      });
    }
  }

  // Build folder stats
  const folderStats = folders.map(f => {
    const count = allPages.filter(p => p.folder === f.name).length;
    return { name: f.name, desc: f.desc, count };
  });
  const totalPages = allPages.length;
  const maxCount = Math.max(...folderStats.map(f => f.count), 1);

  // Build sidebar HTML (folders only, no page lists)
  const sidebarHtml = buildSidebar(folderStats, totalPages);

  // ── Generate Index (Dashboard) ──
  const recentMeetings = allPages
    .filter(p => p.folder === 'Meetings')
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
    .slice(0, 8);

  // Sparkline: activity per day for last 14 days
  const now = new Date();
  const sparkDays = 14;
  const sparkData: number[] = [];
  for (let i = sparkDays - 1; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 86400000);
    const dayStr = day.toISOString().slice(0, 10);
    const count = allPages.filter(p => p.mtime.toISOString().slice(0, 10) === dayStr).length;
    sparkData.push(count);
  }
  const sparkMax = Math.max(...sparkData, 1);

  const statCardsHtml = folderStats
    .filter(f => f.count > 0)
    .map(f => {
      const color = FOLDER_COLORS[f.name] || 'var(--accent)';
      const pct = Math.round((f.count / maxCount) * 100);
      return `<a href="/${f.name}/index.html" class="stat-card animate-in">
        <div class="stat-label">${f.name}</div>
        <div class="stat-value">${f.count}</div>
        <div class="stat-bar"><div class="stat-bar-fill" style="width:${pct}%;background:${color}"></div></div>
      </a>`;
    }).join('\n');

  const sparkBarsHtml = sparkData.map(v => {
    const h = Math.max(4, Math.round((v / sparkMax) * 48));
    return `<div class="spark-bar" style="height:${h}px" title="${v} pages"></div>`;
  }).join('');

  const activityHtml = recentMeetings.map(m => {
    const dateStr = m.mtime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `<li class="activity-item">
      <div class="activity-dot"></div>
      <a href="/Meetings/${m.file.replace('.md', '.html')}">${m.name}</a>
      <span class="activity-date">${dateStr}</span>
    </li>`;
  }).join('\n');

  const indexContent = `
    <div class="dashboard-header">
      <h1>garden</h1>
      <p>${totalPages} pages across ${folderStats.filter(f => f.count > 0).length} categories</p>
    </div>

    <div class="stats-grid">${statCardsHtml}</div>

    <div class="sparkline-container">
      <div class="sparkline-title">Activity — Last 14 Days</div>
      <div class="sparkline">${sparkBarsHtml}</div>
    </div>

    ${recentMeetings.length > 0 ? `
    <div class="activity-section">
      <div class="section-title">Recent Meetings</div>
      <ul class="activity-list">${activityHtml}</ul>
    </div>` : ''}
  `;

  const indexHtml = renderPage('Dashboard', indexContent, sidebarHtml, [], true);
  fs.writeFileSync(path.join(htmlPath, 'index.html'), indexHtml, 'utf-8');
  fs.writeFileSync(path.join(htmlPath, 'Index.html'), indexHtml, 'utf-8');

  // ── Generate folder index pages ──
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
      <div class="page-grid">${cardsHtml || '<p style="color:var(--text-dim)">No pages yet.</p>'}</div>
    `;

    fs.mkdirSync(path.join(htmlPath, folder.name), { recursive: true });
    const folderHtml = renderPage(folder.name, folderContent, sidebarHtml, [], false, folder.name);
    fs.writeFileSync(path.join(htmlPath, folder.name, 'index.html'), folderHtml, 'utf-8');
  }

  // ── Generate individual pages ──
  for (const page of allPages) {
    const mdContent = fs.readFileSync(page.mdPath, 'utf-8');
    let processedMd = mdContent.replace(/\]\(([^)]+)\.md\)/g, ']($1.html)');
    const htmlContent = await marked(processedMd);
    const backlinks = findBacklinks(allPages, page, wikiPath);
    const fullHtml = renderPage(page.name, htmlContent, sidebarHtml, backlinks, false, page.folder);
    const outPath = path.join(htmlPath, page.folder, page.file.replace('.md', '.html'));
    fs.writeFileSync(outPath, fullHtml, 'utf-8');
  }

  // Write static assets
  fs.writeFileSync(path.join(htmlPath, 'style.css'), CSS, 'utf-8');
  fs.writeFileSync(path.join(htmlPath, 'search.js'), SEARCH_JS, 'utf-8');
}

function buildSidebar(
  folderStats: { name: string; desc: string; count: number }[],
  totalPages: number
): string {
  const navLinks = folderStats.map(f => {
    return `<a href="/${f.name}/index.html" class="nav-link" data-folder="${f.name}">
      ${f.name}
      <span class="nav-count">${f.count}</span>
    </a>`;
  }).join('');

  return `
    <div class="sidebar-brand">garden <span>.md</span></div>
    <input type="text" id="search" placeholder="⌘K  Search…">
    <a href="/index.html" class="nav-link" data-folder="">Dashboard <span class="nav-count">${totalPages}</span></a>
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
      const href = `/${page.folder}/${page.file.replace('.md', '.html')}`;
      backlinks.push({ name: page.name, href });
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

  // Highlight active nav link
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
