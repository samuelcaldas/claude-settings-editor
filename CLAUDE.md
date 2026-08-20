# Claude Settings Editor — Codebase

Static web app for editing Claude Code `settings.json` documents safely. No build step. Zero external dependencies.

## File Structure

```
index.html             Main editor shell, scope selector, navigation, and tab panels
css/app.css            Terminal monospace styles, theme variables, and responsive layout
js/i18n.js             Declarative i18n translation dictionary & DOM binder
js/settings-catalog.js Declarative settings catalog, enums, categories, and scope metadata
js/settings-model.js   Pure settings model, parser, immutable path ops, validation & diagnostics
js/app.js              DOM event bindings, scope inspection, history management, and dynamic builders
sample.json            Public sample settings fixture with safe placeholders
sw.js                  Service Worker for offline PWA caching
manifest.json          PWA web app manifest
tests/                 Automated test suite using Node.js built-in runner
docs/settings.md       Authoritative reference documentation for Claude Code settings
```

## Architecture & Data Flow

1. **Internationalization (`js/i18n.js`)**: Provides declarative translations for English (`en`) and Brazilian Portuguese (`pt-BR`), dynamic DOM attribute bindings (`data-i18n`), formatting, and locale switching.
2. **Declarative Catalog (`js/settings-catalog.js`)**: Defines canonical setting paths, value types, enums, categories, scopes (`user`, `project`, `local`, `managed`), and merge rules.
3. **Immutable Model (`js/settings-model.js`)**: Provides `parseSettingsJson`, `validateSettingsDocument`, `inspectSettings`, `setAtPath`, `deleteAtPath`, `moveAtPath`, `renameKeyAtPath`, `applyPatch`, and `redactSecrets`.
4. **Controller (`js/app.js`)**: Handles DOM events, target scope switching, precision path patching, undo/redo history, and safe dynamic collection rendering (zero `innerHTML`).

### Extending Settings

To add or configure a setting:
1. Register its definition in `js/settings-catalog.js` (path, type, label, category, enums, scopes).
2. Add the corresponding input element in `index.html` with a `data-setting-path="your.path"` attribute and `data-i18n*` attributes.
3. The controller automatically handles two-way binding, validation, unset actions, and non-destructive patching.

## Testing

Run tests with Node.js built-in runner:

```bash
node --test tests/*.test.cjs
```
