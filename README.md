# Claude Settings Editor

Visual web editor for Claude Code `settings.json` — zero dependencies, zero build step, 100% client-side.

## Features

- **Data Preservation**: Preserves unknown future settings, absent vs explicit falsy values (`false`, `0`, `""`, `null`), extra hook groups, and unmodeled marketplace properties.
- **Path-Based Patches**: Form fields modify exact JSON target paths instead of full-document re-serialization.
- **Advanced JSON Draft**: Raw JSON edits have explicit Apply/Discard controls to avoid race conditions.
- **Safety First**: Runs locally in browser. No settings persistence (`localStorage`, IndexedDB), no external tracking, no backend calls, and zero command execution.
- **Terminal Refined UI**: Monospace visual theme, dark palette, mobile touch support, keyboard tabs, and undo/redo history.
- **Offline PWA**: Service Worker app-shell caching with network-first fallback.

## Running Locally

Because this project uses standard ES modules, launch a local HTTP server to avoid CORS restriction on `fetch('./sample.json')`:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080` in your browser.

## File Structure

```
index.html             Semantic HTML shell & tab panels
css/app.css            Terminal refined styles & responsive media queries
js/settings-model.js   Pure settings parser, path operations, validation & serialization
js/app.js              Browser controller, DOM event bindings, undo/redo & JSON draft flow
tests/                 Pure model test suite
sample.json            Public sample configuration fixture
sw.js                  Network-first PWA service worker
manifest.json          PWA manifest
```

## Running Tests

Run the pure model test suite via Node.js built-in test runner:

```bash
node --test tests/settings-model.test.cjs
```
