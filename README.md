# Claude Settings Editor

Visual web editor for Claude Code `settings.json` — zero dependencies, zero build step, 100% client-side.

## Features

- **Complete Schema Coverage**: Covers the full Claude Code settings specification:
  - **General & UI**: Theme, TUI mode, input keybindings (normal/vim), effort level, language, notification channels, accessibility toggles, and view modes.
  - **Permissions & Security**: Starting permission modes (`default`, `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions`), rule lists (`deny`, `ask`, `allow`), and additional directories.
  - **Sandboxing**: Process isolation for Bash commands with filesystem path controls (allow/deny read/write), network egress domain rules, and excluded commands.
  - **Environment Variables**: Dynamic key-value variable management with presets (Anthropic API, OpenTelemetry, Models), secret masking, and auth helpers.
  - **Models & Workflows**: Model selection, fallback model chain reordering, extended thinking, fast mode, auto-compact window, and workflow size guidelines.
  - **Hooks & Status Line**: Multi-group lifecycle hooks (`command`, `http`, `prompt`, `agent` handlers), statusline script configuration, and allowed hook URLs.
  - **MCP Policies**: Approval policies for `.mcp.json` servers, Claude.ai connectors toggle, and enterprise MCP restrictions.
  - **Worktree & Memory**: Git worktree branching, background subagent isolation, sparse paths, symlink directories, auto-memory directory, and session retention.
  - **Plugins & Marketplaces**: Plugin enable/disable toggles and custom marketplace source management (`github`, `git`, `url`, `directory`).
  - **Managed Policies**: Enterprise settings (`forceLoginMethod`, `forceLoginGatewayUrl`, `requiredMinimumVersion`, `forceRemoteSettingsRefresh`, etc.).
  - **Advanced Raw JSON**: Direct JSON editing with formatting, syntax validation, draft discard/apply, and copy/download.
- **Internationalization (i18n)**: Seamless instant switching between **English (`en`)** and **Português do Brasil (`pt-BR`)** across all tabs, fields, hints, dynamic lists, diagnostic messages, and toolbar actions.
- **Target Scope Selection & Guidance**: Target scope switcher (`User`, `Project`, `Local`, `Managed`) with contextual warnings for scope-restricted settings.
- **Data Preservation & Precision Patching**: Modifies exact target paths without overwriting or stripping unknown keys, comments, or future enum values.
- **Security & Privacy**: 100% browser-side execution with zero analytics, no external tracking, safe DOM manipulation (XSS prevention), and secret redaction.
- **PWA Offline Support**: Service worker app shell caching for complete offline operation.

## Running Locally

Serve statically via any local HTTP server:

```bash
python3 -m http.server 8080
# or
npx serve .
```

Open `http://localhost:8080` in your browser.

## File Structure

```
index.html             Semantic HTML shell & categorized tab panels
css/app.css            Terminal monospace styling & responsive mobile layout
js/i18n.js             Declarative i18n translation dictionary & DOM binder
js/settings-catalog.js Declarative settings metadata, enums, categories, and scopes
js/settings-model.js   Pure settings parser, immutable path operations & validation
js/app.js              Browser controller, scope inspection & dynamic collection builders
sample.json            Sample configuration fixture with placeholder credentials
tests/                 Node.js test suite for settings model, catalog, and i18n
sw.js                  PWA service worker for offline caching
manifest.json          PWA manifest
```

## Running Tests

Run the test suite with Node.js built-in test runner:

```bash
node --test tests/*.test.cjs
```
