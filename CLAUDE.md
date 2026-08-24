# Claude Settings Editor — Codebase

Static web app for editing Claude Code `settings.json` documents safely. No build step. Zero external dependencies.

## File Structure

```
index.html                     Main editor shell, scope selector, navigation, and tab panels
css/app.css                    Terminal monospace styles, theme variables, and responsive layout
js/i18n.js                     Declarative i18n translation dictionary & DOM binder
js/settings-catalog.js         Declarative settings catalog, enums, categories, and scope metadata
js/settings-model.js           Pure settings model, parser, immutable path ops, validation & diagnostics
js/app.js                      DOM event bindings, scope inspection, history management, and dynamic builders
sample.json                    Public sample settings fixture with safe placeholders
sw.js                          Service Worker for offline PWA caching
manifest.json                  PWA web app manifest
tests/                         Automated test suite using Node.js built-in runner
docs/claude-code-settings.json Authoritative JSON Schema from SchemaStore (https://json.schemastore.org/claude-code-settings.json)
docs/settings.md               Authoritative reference documentation for Claude Code settings
```

## Architecture & Data Flow

1. **Internationalization (`js/i18n.js`)**: Provides declarative translations for English (`en`) and Brazilian Portuguese (`pt-BR`), dynamic DOM attribute bindings (`data-i18n`), formatting, and locale switching.
2. **Declarative Catalog (`js/settings-catalog.js`)**: Defines canonical setting paths, value types, enums, categories, scopes (`user`, `project`, `local`, `managed`), and merge rules strictly compliant with `@docs/claude-code-settings.json`.
3. **Immutable Model (`js/settings-model.js`)**: Provides `parseSettingsJson`, `validateSettingsDocument`, `inspectSettings`, `setAtPath`, `deleteAtPath`, `moveAtPath`, `renameKeyAtPath`, `applyPatch`, and `redactSecrets`.
4. **Controller (`js/app.js`)**: Handles DOM events, target scope switching, precision path patching, undo/redo history, and safe dynamic collection rendering (zero `innerHTML`).

## Schema Enforcement & Feature Development Standards

**Mandatory Schema Compliance**: All feature development, settings catalog additions, enum definitions, type validations, and UI controls **MUST strictly conform to the official Claude Code settings JSON schema** published on SchemaStore (`https://www.schemastore.org/claude-code-settings.json` / `https://json.schemastore.org/claude-code-settings.json`) and vendored locally at `@docs/claude-code-settings.json`.

### Step-by-Step Feature Development Workflow (`/feature-dev:feature-dev`)

1. **Schema Consultation (`@docs/claude-code-settings.json`)**:
   - Locate the target property definition in `@docs/claude-code-settings.json` (and `https://json.schemastore.org/claude-code-settings.json`).
   - Verify the exact canonical key name, data types (`string`, `boolean`, `integer`, `number`, `array`, `object`), item schemas, allowed enum values, defaults, and descriptions.
2. **Scope Rules & Behavioral Reference (`@docs/settings.md`)**:
   - Cross-reference `@docs/settings.md` to confirm scope applicability (`user`, `project`, `local`, `managed`), precedence rules, and lifecycle behavior.
3. **Declarative Catalog Registration (`js/settings-catalog.js`)**:
   - Register the setting definition with `path`, `type`, `label`, `category`, `enums`, `scopes`, `default`, and any child property schemas conforming directly to the SchemaStore definitions.
4. **UI Markup & Two-Way Binding (`index.html`)**:
   - Add the input element with a `data-setting-path="your.path"` attribute and `data-i18n*` attributes.
   - For buttons with icons, follow the safe pattern `<button class="btn ..."><svg class="btn-icon" aria-hidden="true">...</svg><span data-i18n="...">Label</span></button>` to ensure child SVG icons are preserved during dynamic translation.
5. **Bilingual Localization Parity (`js/i18n.js`)**:
   - Add translation keys and descriptions to both `en` and `pt-BR` dictionaries. Ensure 100% key parity (enforced by automated test suite).
6. **Automated Testing (`tests/`)**:
   - Add tests in `tests/*.test.cjs` covering parse/serialize roundtrips, path modification, edge cases, and schema conformance. Run tests with `node --test tests/*.test.cjs`.

### Extending Settings

To add or configure a setting:
1. Consult `@docs/claude-code-settings.json` for schema types, enums, and properties.
2. Register its definition in `js/settings-catalog.js` (path, type, label, category, enums, scopes).
3. Add the corresponding input element in `index.html` with a `data-setting-path="your.path"` attribute and `data-i18n*` attributes.
4. The controller automatically handles two-way binding, validation, unset actions, and non-destructive patching.

## Testing

Run tests with Node.js built-in runner:

```bash
node --test tests/*.test.cjs
```
