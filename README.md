# Claude Settings Editor

Browser-based editor for Claude Code `settings.json`. Edit your configuration visually and download the result — no install, no backend.

**Live demo:** https://samuelcaldas.github.io/claude-settings-editor

---

## Usage

1. Open the editor (link above or `index.html` locally)
2. Click **Load JSON** to import your existing `settings.json`, or **Load Sample** to start from the template
3. Edit settings across the tabs:
   - **API & Models** — endpoint, API key, model overrides per tier
   - **Fallback Models** — ordered list, drag to reorder
   - **Permissions** — default mode, permission prompt flags
   - **UI & Behavior** — theme, TUI mode, effort level, feature toggles
   - **Plugins** — enable/disable Claude Code plugins
   - **Hooks** — lifecycle shell commands (UserPromptSubmit, etc.)
   - **Status Line** — custom status bar command
   - **Advanced JSON** — raw JSON with bidirectional sync to the form
4. Click **Download settings.json** to save

---

## Settings file location

| Platform | Path |
|----------|------|
| Linux/Mac | `~/.claude/settings.json` |
| Windows | `%APPDATA%\Claude\settings.json` |
| Project-level | `.claude/settings.json` |

---

## Local use

No build step. Open `index.html` directly in any browser:

```bash
# Serve locally (avoids fetch CORS for sample.json)
python3 -m http.server 8080
# then open http://localhost:8080
```

Or use any static file server.

---

## Notes

- `artifacts/` is gitignored — keep your personal `settings.json` there locally without committing keys
- `sample.json` is the public template with placeholder values
- All edits happen client-side; nothing is sent to any server
