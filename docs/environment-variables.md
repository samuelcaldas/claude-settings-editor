# Environment Variables Reference and Architecture

This document describes how environment variables are modeled, validated, discovered, and edited in the Claude Settings Editor (`settings.json`).

## Architecture and Design Principles

1. **Schema Authority**: The official Claude Code settings schema from SchemaStore (`docs/claude-code-settings.json`) defines the `env` property as a map of string values keyed by uppercase identifiers (`^[A-Z_][A-Z0-9_]*$`). Any valid uppercase variable name is permissible.
2. **Advisory Discovery Without Restriction**: Discovery helpers (`js/env-var-catalog.js`) provide suggestions, categories, descriptions, and warnings to aid configuration, but never restrict custom variables or newer settings.
3. **Dedicated Key Navigation**: Environment variables with dedicated controls in the editor UI (such as `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_BASE_URL`) route to their respective primary controls rather than creating duplicate, out-of-sync rows.
4. **Safe Immutable Path Operations**: All mutations use literal array-segment paths (e.g. `['env', 'MY_VAR']`) rather than dotted strings (`env.MY_VAR`), preventing keys containing literal dots from colliding with nested object traversal.

---

## Sources and Provenance

The editor cross-references three primary sources:

1. **Official Claude Code Documentation** (`https://code.claude.com/docs/en/env-vars` and `https://code.claude.com/docs/en/settings-reference#env`): Authoritative guide for officially documented environment variables, their applicability in settings, minimum versions, and scope restrictions.
2. **SchemaStore JSON Schema** (`https://json.schemastore.org/claude-code-settings.json`): Vendored at `docs/claude-code-settings.json`, containing formally declared properties, enum constraints, and schema descriptions.
3. **Unofficial CLI v2.1.202 Reference Gist** (`https://gist.githubusercontent.com/unkn0wncode/f87295d055dd0f0e8082358a0b5cc467`): A community-compiled reference documenting internal, reverse-engineered, and diagnostic variables. Variables from this source are classified as `unofficial` and are opt-in only.

---

## Variable Categories

Discovery suggestions are organized into six functional categories:

- **Behavior**: Core runtime behavior, prompt cache TTL, session defaults, auto-continue timeout (`ANTHROPIC_DEFAULT_MODEL`, `CLAUDE_AFK_TIMEOUT_MS`, `CLAUDE_CONFIG_DIR`).
- **Tools & subprocesses**: Shell timeouts, process wrappers, MCP auto-backgrounding, temporary directories (`CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS`, `CLAUDE_CODE_TMPDIR`).
- **Networking & providers**: Provider-specific endpoints, region prefixes, proxy controls, traffic restrictions (`ANTHROPIC_BEDROCK_REGION_PREFIX`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`).
- **Telemetry & diagnostics**: OpenTelemetry configuration, error reporting toggles, debug logging (`OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_LOG_ASSISTANT_RESPONSES`, `DISABLE_TELEMETRY`).
- **Performance & limits**: Memory limits, caching TTLs (`CLAUDE_CODE_TOOL_MEMORY_LIMIT`, `CLAUDE_CODE_WEBFETCH_CACHE_TTL_MS`, `CLAUDE_CODE_PROMPT_CACHE_TTL`).
- **Managed & enterprise policies**: Administrative safeguards, policy skill locks, execution policy enforcement (`CLAUDE_CODE_SAFE_MODE`, `CLAUDE_CODE_DISABLE_POLICY_SKILLS`, `DISABLE_UPGRADE_COMMAND`).

---

## Deduplication & Smart Filtering for Suggestions

The environment variable discovery helper (`EnvVarCatalog.suggest()`) filters suggestions intelligently to prevent UI clutter and user confusion:

1. **Excluded Dedicated UI Fields**: Variables with first-class UI controls (such as `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_DEFAULT_*_MODEL`, `CLAUDE_CODE_USE_POWERSHELL_TOOL`, and `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY`) are excluded from general dropdown suggestions, directing users to their primary dedicated inputs.
2. **Filtered Native Setting Duplicates**: Variables that duplicate native `settings.json` properties (such as `ANTHROPIC_MODEL` vs `model`, `CLAUDE_CODE_EFFORT_LEVEL` vs `effortLevel`, and `CLAUDE_CODE_DISABLE_FAST_MODE` vs `fastMode`) are excluded from suggestions, directing configuration to canonical settings.
3. **Excluded Launch and Ignored Variables**: Variables with `applicability: 'launch'` or `applicability: 'ignored'` (`CLAUDE_CODE_REMOTE`, `CLAUDE_CODE_ACCOUNT_UUID`, `CLAUDE_CODE_PROJECT_DIR_NAME`, `CLAUDE_CODE_RESTRICTED`) are excluded because values in `settings.json` are ignored at runtime.
4. **Scope-Aware Managed Filtering**: Variables with category `'managed'` are suggested exclusively when editing within the `managed` enterprise scope, preventing clutter in `user`, `project`, and `local` scopes.
5. **Roundtrip Fidelity for Custom Variables**: Existing user-defined custom environment variables are always preserved and rendered in the editor rows regardless of catalog filtering.

---

## Form Controls & Accessible Boolean Representation

1. **Categorized `<optgroup>` Dropdown**: The variable picker `<select id="select-env-var">` organizes available suggestions into semantic `<optgroup>` sections matching the six functional categories, while the autocomplete `<datalist id="claude-env-vars-datalist">` provides a flat list for keyboard search.
2. **Accessible Boolean & Flag Checkboxes**:
   - Variables classified as boolean (`isBoolean: true` or `boolType`) are rendered with semantic `<input type="checkbox" class="env-bool-checkbox">` controls rather than generic text inputs.
   - Three boolean flavors are supported:
     - `0_1`: Evaluates `'1'` as checked and `'0'` as unchecked (default binary CLI flags).
     - `true_false`: Evaluates `'true'` as checked and `'false'` as unchecked.
     - `nonempty`: Evaluates any non-empty string as checked (`'1'`) and empty string as unchecked (`''`).
   - Dynamic visual status badges (`1 / on`, `0 / off`, `true / on`, `false / off`) display immediate localized state feedback.
   - In the add-variable form, selecting or typing a boolean variable dynamically converts the value input into a boolean toggle with a default checked state.

---

## Applicability and Scope Rules

Not all environment variables behave identically in `settings.json`. The editor displays advisory status badges and notices based on applicability:

### 1. Settings-Compatible (`settings`)
Standard variables that take effect when configured in `settings.json`, subject to scope and version availability.

### 2. Subprocess-Only (`subprocess`)
Variables such as `NO_COLOR` and `FORCE_COLOR` configured in `settings.json` affect subprocesses launched by Claude Code (e.g. bash commands, build scripts), but do **not** affect Claude Code's own terminal interface colors. Claude Code's own interface styling must be configured in the parent shell before launching the CLI.

### 3. Launch-Environment-Only (`launch`)
Variables such as `CLAUDE_CODE_PROJECT_DIR_NAME` and `CLAUDE_CODE_RESTRICTED` are inspected only during initial CLI bootstrapping from the host shell. Configuring them in `settings.json` has no effect.

### 4. Runtime-Owned / Ignored (`ignored`)
Internal identity and IPC markers such as `CLAUDE_CODE_REMOTE`, `CLAUDE_CODE_ACCOUNT_UUID`, `CLAUDE_CODE_MESSAGING_SOCKET`, and `CLAUDE_CODE_MESSAGING_TOKEN` are managed by the running CLI process. Values provided via `settings.json` are ignored.

### 5. Scope Exclusions (`ignoredScopes`)
Per the official settings reference, certain variables are ignored when defined in project-level (`.claude/settings.json`) or local-level (`.claude/settings.local.json`) scopes, and should only be set in the user scope (`~/.claude/settings.json`) or managed enterprise policies:
- `CLAUDE_CONFIG_DIR`
- `CLAUDE_CODE_TMPDIR`
- `OTEL_LOG_RAW_API_BODIES`
- `ENABLE_BETA_TRACING_DETAILED`
- `BETA_TRACING_ENDPOINT`
- `CLAUDE_CODE_PROCESS_WRAPPER`
- `CLAUDE_CODE_SYNC_SKILLS`
- `CLAUDE_CODE_SYNC_PLUGINS`
- `CLAUDE_CODE_PLUGIN_CACHE_DIR`
- `CLAUDE_CODE_PLUGIN_SEED_DIR`

---

## Semantics: Empty Value vs Key Removal

- **Empty String (`""`)**: Setting an environment variable value to `""` persists an empty string entry in `settings.json`. This is typically used to override and mask a variable inherited from the parent shell.
- **Removing a Variable**: Clicking the **Remove** button deletes the key from the `env` map in `settings.json`. The variable will no longer be set by settings on the subsequent CLI launch. Removals require restarting Claude Code to take effect.

---

## Important Guidance on Specific Variables

- **Non-empty Disabling Flags**: For `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `DISABLE_TELEMETRY`, and `DISABLE_ERROR_REPORTING`, Claude Code checks for any non-empty string value. Setting `"0"` or `"false"` still evaluates as non-empty and **enables** the disabling behavior. To leave telemetry or traffic enabled, remove the variable entirely.
- **`CLAUDE_AFK_TIMEOUT_MS`**: Overrides the `AskUserQuestion` timeout. Auto-continue is disabled by default; setting `"0"` closes dialogs immediately.
- **`CLAUDE_CODE_PROMPT_CACHE_TTL`**: Sets the prompt cache TTL (accepted values: `"5m"`, `"1h"`). Note that one-hour cache writes incur higher costs than five-minute cache writes.
- **`CLAUDE_CODE_TOOL_MEMORY_LIMIT`**: Sets tool process memory limits on Linux/WSL. Changes take effect on process setup; restarting Claude Code is required.

---

## Custom LLM Gateway & Subagent Isolation Architecture

When configuring Claude Code behind custom LLM gateways and reverse proxies (such as LiteLLM, Kong, or `api.alanwo.com.br`), specific settings prevent common production failure modes:

### 1. Attribution Header & Prompt Caching (`CLAUDE_CODE_ATTRIBUTION_HEADER="0"`)
Claude Code includes an attribution and fingerprint block at the start of system prompts by default. Gateways forwarding to multi-tenant backends or caching prompts frequently reject these headers with HTTP 400 or suffer cache misses. Setting `CLAUDE_CODE_ATTRIBUTION_HEADER="0"` strips this header block, preserving upstream cache hit ratios.

### 2. Authorization Header Collision Avoidance (`ANTHROPIC_API_KEY=""`)
When using `ANTHROPIC_AUTH_TOKEN` for Bearer token authentication against a gateway, an existing `ANTHROPIC_API_KEY` in the environment can collide with the Authorization header. Explicitly setting `"ANTHROPIC_API_KEY": ""` eliminates header conflicts.

### 3. Background Micro-Tasks & Session Titles (`ANTHROPIC_DEFAULT_HAIKU_MODEL`)
Background operations (such as silent session title generation via `generate_session_title` or explorer subagents) invoke `ANTHROPIC_DEFAULT_HAIKU_MODEL`. Routing this to a non-standard or unsupported model causes `[claude-code:unrecognized_model]` warnings and empty thinking blocks with proprietary provider signatures that corrupt Claude Code's SSE parser. Using a fully tool-calling compatible alias (such as `gpt-5.6-luna`) produces clean, immediate completions without warnings.

### 4. Subagent "Inertia" & Silent 429 Retry Suppression
Under heavy prompts (system instructions, memory entries, MCP tool definitions, and project rules exceeding tens of thousands of tokens), heavy models on shared gateway pools easily exhaust per-minute rate limits:
```
API Error: Request rejected (429) · All credentials for model ... are cooling down
```
In asynchronous subagents (`status: "async_launched"`), Claude Code does **not** surface HTTP 429 errors in the main UI. Instead, it enters a silent exponential backoff loop (`retryAttempt: 1 to 10`) with delays up to 5 minutes, making the subagent appear completely frozen or "inert".

**Solution**:
- Configure `CLAUDE_CODE_SUBAGENT_MODEL="gpt-5.6-luna"` (or another independent quota backend).
- Enforce `CLAUDE_CODE_SUBAGENT_MODEL_FORCE="1"` to override hardcoded model spawn arguments in the Claude Code binary, ensuring every child agent, teammate, and agent tool execution runs on the dedicated model backend.

### 5. Custom Subagent Best Practices & V8 Process Isolation
To avoid V8 engine CPU saturation (`JsonStringifier::Serialize_` at 100% CPU) during agent state serialization:
1. **Declare `context: fork`**: In `~/.claude/agents/<name>.md`, always specify `context: fork` to ensure full process-level memory isolation.
2. **Bound `tools`**: Explicitly restrict the `tools` list for each subagent (e.g. `tools: [Read, Grep, Glob]`), preventing unnecessary MCP tool schemas from polluting subagent context.
3. **Live Network Diagnostics**: Inspect full HTTP request/response payloads in real time by launching Claude with `ANTHROPIC_LOG=debug claude`.

---

## Curated Unofficial Variables (Opt-in)

Checking **Include useful unofficial variables** exposes reviewed unofficial entries discovered in the CLI v2.1.202 reference gist:
- `CLAUDE_CODE_PWSH_PARSE_TIMEOUT_MS`: PowerShell parser timeout in milliseconds (default 5000). Current support and settings load timing are unverified.
- `CLAUDE_CODE_SLOW_OPERATION_THRESHOLD_MS`: Threshold in milliseconds for slow-operation diagnostic logging.

---

## Maintenance and Update Procedure

1. To add or update verified environment variables, edit `ENTRIES` in `js/env-var-catalog.js`.
2. Ensure every new entry defines `name`, `category`, `documentationStatus`, `sourceUrl`, and appropriate guidance.
3. If new translation keys are introduced, add them to both `en` and `pt-BR` sections in `js/i18n.js` to maintain 100% dictionary parity.
4. Run `node --test tests/*.test.cjs` and `node scripts/audit-schema.cjs` to verify compliance.
