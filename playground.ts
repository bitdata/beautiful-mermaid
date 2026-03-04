/**
 * Local playground for beautiful-mermaid.
 *
 * Usage: bun run playground.ts
 *
 * Builds a browser bundle of the library, generates a self-contained HTML
 * playground, and serves it on http://localhost:3333.
 *
 * Features:
 *   - Split-pane editor: Mermaid source on the left, rendered output on the right
 *   - Real-time SVG and ASCII rendering (debounced)
 *   - 15 built-in themes with live switching
 *   - One-click copy for SVG markup and ASCII text
 *   - Persists editor content and settings to localStorage
 */

// ============================================================================
// Step 1: Bundle the library for the browser
// ============================================================================

const entrypoint = import.meta.dir + '/src/browser.ts'
const buildResult = await Bun.build({
  entrypoints: [entrypoint],
  target: 'browser',
  format: 'esm',
  minify: true,
})

if (!buildResult.success) {
  console.error('Bundle build failed:', buildResult.logs)
  process.exit(1)
}

const bundleJs = await buildResult.outputs[0]!.text()
console.log(`Browser bundle: ${(bundleJs.length / 1024).toFixed(1)} KB`)

// ============================================================================
// Step 2: Generate the playground HTML
// ============================================================================

const DEFAULT_DIAGRAM = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process]
    B -->|No| D[End]
    C --> E[Result]
    E --> D`

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>beautiful-mermaid playground</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0f0f10;
  --bg-surface: #18181b;
  --bg-elevated: #232326;
  --border: #2e2e33;
  --border-focus: #5b5bd6;
  --text: #e4e4e7;
  --text-secondary: #a1a1aa;
  --text-muted: #71717a;
  --accent: #818cf8;
  --accent-hover: #6366f1;
  --success: #34d399;
  --radius: 8px;
  --font-mono: 'SF Mono', 'Cascadia Code', 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

html, body { height: 100%; }

body {
  font-family: var(--font-sans);
  background: var(--bg);
  color: var(--text);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ─────────────────────────────────────────────────── */
.header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-surface);
  flex-shrink: 0;
}

.header h1 {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.header h1 span { color: var(--accent); }

.controls {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.controls label {
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

select, button.ctrl-btn {
  font-family: var(--font-sans);
  font-size: 12px;
  background: var(--bg-elevated);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 5px 10px;
  cursor: pointer;
  transition: border-color 0.15s;
}

select:hover, button.ctrl-btn:hover {
  border-color: var(--text-muted);
}

select:focus, button.ctrl-btn:focus {
  outline: none;
  border-color: var(--border-focus);
}

/* ── Toggle ─────────────────────────────────────────────────── */
.toggle-group {
  display: flex;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.toggle-group button {
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 500;
  padding: 5px 14px;
  border: none;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.toggle-group button:not(:last-child) {
  border-right: 1px solid var(--border);
}

.toggle-group button.active {
  background: var(--accent);
  color: #fff;
}

.toggle-group button:hover:not(.active) {
  background: var(--border);
  color: var(--text);
}

/* ── Main Layout ────────────────────────────────────────────── */
.main {
  display: flex;
  flex: 1;
  min-height: 0;
}

.pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pane-editor { flex: 0 0 45%; border-right: 1px solid var(--border); }
.pane-output { flex: 1; }

.pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-surface);
  flex-shrink: 0;
}

.pane-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.copy-btn {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  padding: 3px 10px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.copy-btn:hover {
  border-color: var(--text-muted);
  color: var(--text);
}

.copy-btn.copied {
  border-color: var(--success);
  color: var(--success);
}

/* ── Editor ─────────────────────────────────────────────────── */
#editor {
  flex: 1;
  width: 100%;
  resize: none;
  border: none;
  outline: none;
  padding: 16px;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  background: var(--bg);
  color: var(--text);
  tab-size: 2;
}

#editor::placeholder {
  color: var(--text-muted);
}

/* ── Output ─────────────────────────────────────────────────── */
.output-scroll {
  flex: 1;
  overflow: auto;
  padding: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

#svg-output {
  max-width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

#svg-output svg {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius);
}

#ascii-output {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.4;
  white-space: pre;
  color: var(--text);
  max-width: 100%;
  overflow-x: auto;
}

.output-error {
  color: #f87171;
  font-family: var(--font-mono);
  font-size: 13px;
  white-space: pre-wrap;
  padding: 16px;
  background: rgba(248, 113, 113, 0.06);
  border-radius: var(--radius);
  border: 1px solid rgba(248, 113, 113, 0.15);
}

.output-empty {
  color: var(--text-muted);
  font-size: 13px;
}

/* ── Resize handle ──────────────────────────────────────────── */
.resize-handle {
  width: 5px;
  cursor: col-resize;
  background: transparent;
  position: relative;
  flex-shrink: 0;
  margin-left: -3px;
  margin-right: -2px;
  z-index: 10;
}

.resize-handle::after {
  content: '';
  position: absolute;
  top: 0; bottom: 0;
  left: 2px;
  width: 1px;
  background: var(--border);
  transition: background 0.15s;
}

.resize-handle:hover::after,
.resize-handle.dragging::after {
  background: var(--accent);
  width: 2px;
  left: 1px;
}

/* ── Status bar ─────────────────────────────────────────────── */
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 16px;
  border-top: 1px solid var(--border);
  background: var(--bg-surface);
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}
</style>
</head>
<body>

<!-- Header -->
<div class="header">
  <h1><span>beautiful-mermaid</span> playground</h1>
  <div class="controls">
    <label>
      Theme
      <select id="theme-select"></select>
    </label>
    <div class="toggle-group" id="mode-toggle">
      <button class="active" data-mode="svg">SVG</button>
      <button data-mode="ascii">ASCII</button>
    </div>
  </div>
</div>

<!-- Main split pane -->
<div class="main" id="main">
  <div class="pane pane-editor" id="pane-editor">
    <div class="pane-header">
      <span class="pane-title">Mermaid Source</span>
    </div>
    <textarea id="editor" spellcheck="false" autocomplete="off" autocorrect="off"
      placeholder="Paste your Mermaid diagram here...">${escapeHtml(DEFAULT_DIAGRAM)}</textarea>
  </div>

  <div class="resize-handle" id="resize-handle"></div>

  <div class="pane pane-output" id="pane-output">
    <div class="pane-header">
      <span class="pane-title" id="output-title">SVG Preview</span>
      <button class="copy-btn" id="copy-btn">Copy SVG</button>
    </div>
    <div class="output-scroll">
      <div id="svg-output"></div>
      <pre id="ascii-output" style="display:none"></pre>
    </div>
  </div>
</div>

<!-- Status bar -->
<div class="status-bar">
  <span id="status-text">Ready</span>
  <span id="status-time"></span>
</div>

<!-- Library bundle -->
<script type="module">
${bundleJs}

const {
  renderMermaidSVGAsync,
  renderMermaidASCII,
  diagramColorsToAsciiTheme,
  THEMES,
} = window.__mermaid;

// ── DOM refs ──
const editor = document.getElementById('editor');
const svgOutput = document.getElementById('svg-output');
const asciiOutput = document.getElementById('ascii-output');
const themeSelect = document.getElementById('theme-select');
const modeToggle = document.getElementById('mode-toggle');
const copyBtn = document.getElementById('copy-btn');
const outputTitle = document.getElementById('output-title');
const statusText = document.getElementById('status-text');
const statusTime = document.getElementById('status-time');
const resizeHandle = document.getElementById('resize-handle');
const paneEditor = document.getElementById('pane-editor');
const mainEl = document.getElementById('main');

// ── State ──
let currentMode = localStorage.getItem('pg-mode') || 'svg';
let currentTheme = localStorage.getItem('pg-theme') || 'tokyo-night';
let lastSvg = '';
let lastAscii = '';

// ── Theme selector ──
const themeKeys = Object.keys(THEMES);
themeKeys.forEach(key => {
  const opt = document.createElement('option');
  opt.value = key;
  opt.textContent = key;
  themeSelect.appendChild(opt);
});
themeSelect.value = currentTheme;

// ── Restore editor content ──
const saved = localStorage.getItem('pg-source');
if (saved !== null) editor.value = saved;

// ── Mode toggle ──
function setMode(mode) {
  currentMode = mode;
  localStorage.setItem('pg-mode', mode);
  modeToggle.querySelectorAll('button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  if (mode === 'svg') {
    svgOutput.style.display = '';
    asciiOutput.style.display = 'none';
    outputTitle.textContent = 'SVG Preview';
    copyBtn.textContent = 'Copy SVG';
  } else {
    svgOutput.style.display = 'none';
    asciiOutput.style.display = '';
    outputTitle.textContent = 'ASCII Output';
    copyBtn.textContent = 'Copy ASCII';
  }
  render();
}

modeToggle.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (btn) setMode(btn.dataset.mode);
});

// ── Theme change ──
themeSelect.addEventListener('change', () => {
  currentTheme = themeSelect.value;
  localStorage.setItem('pg-theme', currentTheme);
  render();
});

// ── Render ──
let renderTimer = null;

function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, 200);
}

function render() {
  const source = editor.value.trim();
  localStorage.setItem('pg-source', editor.value);

  if (!source) {
    svgOutput.innerHTML = '<div class="output-empty">Enter a Mermaid diagram to see it rendered.</div>';
    asciiOutput.textContent = '';
    lastSvg = '';
    lastAscii = '';
    statusText.textContent = 'Ready';
    statusTime.textContent = '';
    return;
  }

  const theme = THEMES[currentTheme] || THEMES['tokyo-night'];
  const t0 = performance.now();

  try {
    if (currentMode === 'svg') {
      lastSvg = '';
      renderMermaidSVGAsync(source, { ...theme, interactive: true }).then(svg => {
        lastSvg = svg;
        svgOutput.innerHTML = svg;
        const ms = (performance.now() - t0).toFixed(1);
        statusText.textContent = 'Rendered successfully';
        statusTime.textContent = ms + ' ms';
      }).catch(err => {
        svgOutput.innerHTML = '<div class="output-error">' + escapeHtml(String(err)) + '</div>';
        statusText.textContent = 'Error';
        statusTime.textContent = '';
      });
    } else {
      const asciiOpts = { theme: diagramColorsToAsciiTheme(theme), colorMode: 'html' };
      const result = renderMermaidASCII(source, asciiOpts);
      lastAscii = result;
      asciiOutput.innerHTML = result;
      const ms = (performance.now() - t0).toFixed(1);
      statusText.textContent = 'Rendered successfully';
      statusTime.textContent = ms + ' ms';
    }
  } catch (err) {
    if (currentMode === 'svg') {
      svgOutput.innerHTML = '<div class="output-error">' + escapeHtml(String(err)) + '</div>';
    } else {
      asciiOutput.innerHTML = '<div class="output-error">' + escapeHtml(String(err)) + '</div>';
    }
    statusText.textContent = 'Error';
    statusTime.textContent = '';
  }
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Copy ──
copyBtn.addEventListener('click', () => {
  let content = '';
  if (currentMode === 'svg') {
    content = lastSvg;
  } else {
    // Strip HTML tags for plain text copy
    const tmp = document.createElement('div');
    tmp.innerHTML = lastAscii;
    content = tmp.textContent || lastAscii;
  }
  if (!content) return;

  navigator.clipboard.writeText(content).then(() => {
    copyBtn.classList.add('copied');
    const prev = copyBtn.textContent;
    copyBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyBtn.classList.remove('copied');
      copyBtn.textContent = prev;
    }, 1500);
  });
});

// ── Editor input ──
editor.addEventListener('input', scheduleRender);

// ── Tab key support in editor ──
editor.addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
    editor.selectionStart = editor.selectionEnd = start + 2;
    scheduleRender();
  }
});

// ── Resize handle ──
let dragging = false;

resizeHandle.addEventListener('mousedown', e => {
  e.preventDefault();
  dragging = true;
  resizeHandle.classList.add('dragging');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', e => {
  if (!dragging) return;
  const rect = mainEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const pct = Math.min(Math.max(x / rect.width * 100, 20), 80);
  paneEditor.style.flex = '0 0 ' + pct + '%';
});

document.addEventListener('mouseup', () => {
  if (!dragging) return;
  dragging = false;
  resizeHandle.classList.remove('dragging');
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
});

// ── Init ──
setMode(currentMode);
</script>

</body>
</html>`

// ============================================================================
// Step 3: Serve the playground
// ============================================================================

const PORT = 3333

const server = Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url)

    if (url.pathname === '/favicon.svg') {
      const faviconPath = new URL('./public/favicon.svg', import.meta.url).pathname
      return new Response(Bun.file(faviconPath), {
        headers: { 'Content-Type': 'image/svg+xml' },
      })
    }

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  },
})

console.log(`\n  Playground running at http://localhost:${PORT}\n`)
