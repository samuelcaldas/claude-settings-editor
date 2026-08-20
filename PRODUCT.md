# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are software developers, engineers, and technical team leads configuring Claude Code CLI (`settings.json`) across workstation environments, repositories, and team workflows.

## Product Purpose

Provides an intuitive, zero-dependency, and 100% client-side web interface for inspecting, editing, validating, and managing Claude Code settings across configuration scopes (`user`, `project`, `local`, `managed`). Success means developers can safely customize permissions, sandboxing policies, environment variables, lifecycle hooks, model fallback chains, MCP policies, and plugins without syntax errors, scope confusion, or accidental data loss.

## Positioning

A zero-dependency, 100% private, client-side precision editor with non-destructive immutable path patching that preserves unknown keys, unmodeled paths, and future enum extensions semantically, running entirely in the browser with offline PWA support and instantaneous bilingual (EN/PT-BR) localization.

## Operating Context

- Used in local development environments and web browsers alongside terminal workflows.
- Operates directly on user-imported JSON files, the bundled sample fixture, or an empty document.
- Zero server dependencies, zero build steps, and zero external network tracking or telemetry.
- Runs as a standalone static web app or offline Progressive Web App (PWA).

## Capabilities and Constraints

- **Broad Schema Coverage**: Declarative catalog based on the vendored Claude Code settings reference (`docs/settings.md`), covering General/UI, Permissions, Sandboxing, Environment Variables, Models & Workflows, Hooks & Statusline, MCP Policies, Worktree & Memory, Plugins & Marketplaces, Managed Enterprise Policies, and Raw JSON editing.
- **Scope-Aware Diagnostics**: Real-time validation and diagnostics tailored to the target scope (`user`, `project`, `local`, `managed`), highlighting scope-restricted settings.
- **Non-Destructive Semantic Patching**: Modifications target exact JSON paths, preserving unrelated keys and unmodeled properties across edits.
- **Internationalization (i18n)**: Seamless live language switching between English (`en`) and Brazilian Portuguese (`pt-BR`) across all tabs, fields, hints, dynamic lists, and diagnostic alerts.
- **Security & Privacy**: 100% browser-side execution with XSS-safe DOM builders, secret redaction, and zero external tracking.
- **Constraint**: Pure static HTML5, CSS3, and vanilla JavaScript without external libraries, npm dependencies, or transpilation steps. Standard JSON parsing normalizes indentation and does not support JSON comments.

## Brand Commitments

- **Tone**: Precise, concise, unambiguous, and technically rigorous.
- **Name**: Claude Settings Editor.

## Evidence on Hand

- `index.html`: Semantic HTML shell with categorized tab panels and form controls.
- `css/app.css`: Monospace styling and responsive layout.
- `js/settings-catalog.js`: Declarative settings schema and scope metadata.
- `js/settings-model.js`: Pure immutable settings model, parser, validator, and patcher.
- `js/i18n.js`: Declarative translation module with automated key-parity verification between `en` and `pt-BR`.
- `js/app.js`: Interactive controller, dynamic collection builders, and history manager.
- `tests/*.test.cjs`: Automated test suite executed via Node.js built-in test runner.
- `docs/settings.md`: Vendored reference documentation for Claude Code settings.

## Product Principles

1. **Safety First**: Never corrupt or silently drop user configuration keys, values, or draft edits.
2. **Zero External Footprint**: Run 100% client-side with zero tracking, zero telemetry, and zero build toolchain requirements.
3. **Fail-Fast & Transparent Validation**: Provide immediate visual feedback on schema violations, scope mismatches, and syntax errors.
4. **Instant Accessibility & Localization**: Deliver immediate, frictionless interaction with instant language switching and responsive desktop/mobile layouts.

## Accessibility & Inclusion

- Semantic HTML structure with labeled controls and tabbed navigation.
- Bilingual dictionary coverage across all user-facing interface elements in English (`en`) and Brazilian Portuguese (`pt-BR`).
