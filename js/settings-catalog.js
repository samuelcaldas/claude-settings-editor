/**
 * Claude Settings Editor - Settings Catalog
 * Declarative metadata catalog for Claude Code settings, enums, scopes, and types.
 */
(function exposeSettingsCatalog(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SettingsCatalog = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSettingsCatalog() {
  'use strict';

  const SCOPES = {
    user: {
      id: 'user',
      label: 'User Settings',
      path: '~/.claude/settings.json',
      description: 'Applies across all projects for the current user. Not shared with team.',
      shared: false
    },
    project: {
      id: 'project',
      label: 'Project Settings',
      path: '.claude/settings.json',
      description: 'Shared with all collaborators on this repository. Checked into Git.',
      shared: true
    },
    local: {
      id: 'local',
      label: 'Local Project Settings',
      path: '.claude/settings.local.json',
      description: 'Personal project overrides. Gitignored and not committed.',
      shared: false
    },
    managed: {
      id: 'managed',
      label: 'Managed Policy',
      path: 'managed-settings.json',
      description: 'Organization-wide policy deployed via MDM, server, or system directory.',
      shared: true
    }
  };

  const ENUMS = {
    'permissions.defaultMode': [
      'default',
      'acceptEdits',
      'plan',
      'auto',
      'dontAsk',
      'bypassPermissions',
      'manual'
    ],
    theme: [
      'auto',
      'dark',
      'light',
      'dark-daltonized',
      'light-daltonized',
      'dark-ansi',
      'light-ansi'
    ],
    tui: ['fullscreen', 'default'],
    editorMode: ['normal', 'vim'],
    effortLevel: ['low', 'medium', 'high', 'xhigh'],
    preferredNotifChannel: [
      'auto',
      'terminal_bell',
      'iterm2',
      'iterm2_with_bell',
      'kitty',
      'ghostty',
      'notifications_disabled'
    ],
    'worktree.baseRef': ['fresh', 'head'],
    'worktree.bgIsolation': ['worktree', 'none'],
    viewMode: ['default', 'verbose', 'focus'],
    teammateMode: ['in-process', 'auto', 'tmux', 'iterm2'],
    workflowSizeGuideline: ['unrestricted', 'small', 'medium', 'large'],
    autoUpdatesChannel: ['stable', 'latest'],
    forceLoginMethod: ['claudeai', 'console', 'gateway'],
    parentSettingsBehavior: ['first-wins', 'merge'],
    defaultShell: ['bash', 'powershell'],
    crossSessionInbound: ['accept', 'hold', 'refuse'],
    askUserQuestionTimeout: ['never', '60s', '5m', '10m'],
    dialogExpiry: ['never', '60s', '5m', '10m'],
    hookEvent: [
      'PreToolUse',
      'PostToolUse',
      'Notification',
      'SessionStart',
      'SessionEnd',
      'ConfigChange',
      'WorktreeCreate',
      'WorktreeRemove',
      'SubagentStart',
      'SubagentStop',
      'UserPromptSubmit',
      'UserPromptDone'
    ],
    hookHandlerType: ['command', 'http', 'prompt', 'agent'],
    credentialMode: ['deny', 'mask'],
    sigv4Policy: ['deny', 'passthrough'],
    diffTool: ['auto', 'terminal']
  };

  /**
   * Complete catalog of known Claude Code settings
   */
  const CATALOG = [
    // --- General & UI ---
    {
      path: 'theme',
      type: 'enum',
      enumKey: 'theme',
      default: 'dark',
      allowCustom: true,
      category: 'general',
      label: 'Color Theme',
      description: 'Color theme for the CLI interface.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'tui',
      type: 'enum',
      enumKey: 'tui',
      default: 'fullscreen',
      category: 'general',
      label: 'Terminal UI Mode',
      description: 'fullscreen for alt-screen renderer; default for classic stream.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'editorMode',
      type: 'enum',
      enumKey: 'editorMode',
      default: 'normal',
      category: 'general',
      label: 'Editor Keybinding Mode',
      description: 'Keybinding mode for the prompt input: normal or vim.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'effortLevel',
      type: 'enum',
      enumKey: 'effortLevel',
      category: 'general',
      label: 'Effort Level',
      description: 'Persistent model reasoning effort: low, medium, high, or xhigh.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'language',
      type: 'string',
      category: 'general',
      label: 'Preferred Language',
      description: 'Preferred response and dictation language (e.g., english, spanish, japanese).',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'preferredNotifChannel',
      type: 'enum',
      enumKey: 'preferredNotifChannel',
      default: 'auto',
      category: 'general',
      label: 'Notification Channel',
      description: 'Notification delivery method: auto, terminal_bell, iterm2, kitty, ghostty, notifications_disabled.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'viewMode',
      type: 'enum',
      enumKey: 'viewMode',
      default: 'default',
      category: 'general',
      label: 'Transcript View Mode',
      description: 'Default transcript view on startup: default, verbose, or focus.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'autoScrollEnabled',
      type: 'boolean',
      default: true,
      category: 'general',
      label: 'Auto-scroll Output',
      description: 'Follow new output to the bottom of the conversation in fullscreen mode.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'showTurnDuration',
      type: 'boolean',
      default: true,
      category: 'general',
      label: 'Show Turn Duration',
      description: 'Show elapsed duration messages after responses (e.g. "Cooked for 45s").',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'terminalProgressBarEnabled',
      type: 'boolean',
      default: true,
      category: 'general',
      label: 'Terminal Progress Bar',
      description: 'Show terminal progress bar in supported terminal emulators.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'syntaxHighlightingDisabled',
      type: 'boolean',
      default: false,
      category: 'general',
      label: 'Disable Syntax Highlighting',
      description: 'Disable syntax highlighting in diffs, previews, and code blocks.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'axScreenReader',
      type: 'boolean',
      default: false,
      category: 'general',
      label: 'Screen Reader Accessible Mode',
      description: 'Render flat accessible text without decorative borders or animations.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'prefersReducedMotion',
      type: 'boolean',
      default: false,
      category: 'general',
      label: 'Reduced Motion',
      description: 'Reduce or disable spinners, shimmers, and UI animations.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'promptSuggestionEnabled',
      type: 'boolean',
      default: true,
      category: 'general',
      label: 'Prompt Suggestions',
      description: 'Show grayed-out predictions in prompt input as you type.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'emojiCompletionEnabled',
      type: 'boolean',
      default: true,
      category: 'general',
      label: 'Emoji Shortcode Completion',
      description: 'Suggest and replace emoji shortcodes like :sparkles: with emoji.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'spinnerTipsEnabled',
      type: 'boolean',
      default: true,
      category: 'general',
      label: 'Spinner Tips',
      description: 'Show helpful tips in the spinner while Claude is working.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'wheelScrollAccelerationEnabled',
      type: 'boolean',
      default: true,
      category: 'general',
      label: 'Mouse Wheel Acceleration',
      description: 'Accelerate mouse wheel scroll speed during fast scrolling.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'fileCheckpointingEnabled',
      type: 'boolean',
      default: true,
      category: 'general',
      label: 'File Checkpointing (/rewind)',
      description: 'Snapshot files before each edit so /rewind can restore them.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'verbose',
      type: 'boolean',
      default: false,
      category: 'general',
      label: 'Verbose Output',
      description: 'Show full tool output instead of truncated summaries.',
      scopes: ['user', 'project', 'local', 'managed']
    },

    // --- Permissions & Auto Mode ---
    {
      path: 'permissions.defaultMode',
      type: 'enum',
      enumKey: 'permissions.defaultMode',
      default: 'default',
      category: 'permissions',
      label: 'Starting Permission Mode',
      description: 'Starting permission mode: default, acceptEdits, plan, auto, dontAsk, bypassPermissions, manual.',
      scopes: ['user', 'project', 'local', 'managed'],
      scopeNotes: {
        project: 'auto mode is ignored in Project & Local scopes.',
        local: 'auto mode is ignored in Project & Local scopes.'
      }
    },
    {
      path: 'permissions.allow',
      type: 'string-array',
      category: 'permissions',
      label: 'Allow Rules',
      description: 'Permission rules to allow tool use without prompting (e.g. Bash(npm run *), Read(./src/**)).',
      scopes: ['user', 'project', 'local', 'managed'],
      mergeBehavior: 'merge-array'
    },
    {
      path: 'permissions.ask',
      type: 'string-array',
      category: 'permissions',
      label: 'Ask Rules',
      description: 'Permission rules that explicitly prompt for confirmation (e.g. Bash(git push *)).',
      scopes: ['user', 'project', 'local', 'managed'],
      mergeBehavior: 'merge-array'
    },
    {
      path: 'permissions.deny',
      type: 'string-array',
      category: 'permissions',
      label: 'Deny Rules',
      description: 'Permission rules to block tool use and exclude sensitive paths (e.g. Read(./.env), Bash(curl *)).',
      scopes: ['user', 'project', 'local', 'managed'],
      mergeBehavior: 'merge-array'
    },
    {
      path: 'permissions.additionalDirectories',
      type: 'string-array',
      category: 'permissions',
      label: 'Additional Directories',
      description: 'Additional directories permitted for file access outside repository root.',
      scopes: ['user', 'project', 'local', 'managed'],
      mergeBehavior: 'merge-array'
    },
    {
      path: 'permissions.disableAutoMode',
      type: 'string',
      category: 'permissions',
      label: 'Disable Auto Mode',
      description: 'Set to "disable" to prevent auto mode from being activated.',
      scopes: ['user', 'managed']
    },
    {
      path: 'permissions.disableBypassPermissionsMode',
      type: 'string',
      category: 'permissions',
      label: 'Disable Bypass Permissions Mode',
      description: 'Set to "disable" to prevent --dangerously-skip-permissions and bypass mode.',
      scopes: ['user', 'managed']
    },
    {
      path: 'permissions.skipDangerousModePermissionPrompt',
      type: 'boolean',
      category: 'permissions',
      label: 'Skip Bypass Confirmation Prompt',
      description: 'Skip confirmation prompt before entering bypass permissions mode.',
      scopes: ['user', 'local', 'managed'],
      scopeNotes: {
        project: 'Ignored in Project settings for security.'
      }
    },
    {
      path: 'allowManagedPermissionRulesOnly',
      type: 'boolean',
      category: 'permissions',
      label: 'Managed Permission Rules Only',
      description: 'Enforce that only permission rules in managed settings apply.',
      scopes: ['managed'],
      managedOnly: true
    },
    {
      path: 'useAutoModeDuringPlan',
      type: 'boolean',
      default: true,
      category: 'permissions',
      label: 'Use Auto Mode During Plan',
      description: 'Whether plan mode uses auto mode semantics when available.',
      scopes: ['user', 'local', 'managed'],
      scopeNotes: {
        project: 'Not read from shared Project settings.'
      }
    },

    // --- Sandboxing ---
    {
      path: 'sandbox.enabled',
      type: 'boolean',
      default: false,
      category: 'sandbox',
      label: 'Enable Bash Sandboxing',
      description: 'Isolate Bash commands from host filesystem and network (macOS, Linux, WSL2).',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'sandbox.failIfUnavailable',
      type: 'boolean',
      default: false,
      category: 'sandbox',
      label: 'Fail if Sandbox Unavailable',
      description: 'Exit with error at startup if sandboxing cannot start.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'sandbox.autoAllowBashIfSandboxed',
      type: 'boolean',
      default: true,
      category: 'sandbox',
      label: 'Auto-Allow Bash When Sandboxed',
      description: 'Automatically approve bash commands when running inside sandbox.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'sandbox.excludedCommands',
      type: 'string-array',
      category: 'sandbox',
      label: 'Excluded Commands',
      description: 'Commands that should run outside of the sandbox (e.g. ["docker *"]).',
      scopes: ['user', 'project', 'local', 'managed'],
      mergeBehavior: 'merge-array'
    },
    {
      path: 'sandbox.allowUnsandboxedCommands',
      type: 'boolean',
      default: true,
      category: 'sandbox',
      label: 'Allow Unsandboxed Commands',
      description: 'Allow commands to bypass sandbox with dangerouslyDisableSandbox.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'sandbox.filesystem.allowWrite',
      type: 'string-array',
      category: 'sandbox',
      label: 'Filesystem Allow Write Paths',
      description: 'Additional paths where sandboxed commands can write (e.g. ["/tmp/build", "~/.kube"]).',
      scopes: ['user', 'project', 'local', 'managed'],
      mergeBehavior: 'merge-array'
    },
    {
      path: 'sandbox.filesystem.denyWrite',
      type: 'string-array',
      category: 'sandbox',
      label: 'Filesystem Deny Write Paths',
      description: 'Paths where sandboxed commands cannot write (e.g. ["/etc", "/usr/local/bin"]).',
      scopes: ['user', 'project', 'local', 'managed'],
      mergeBehavior: 'merge-array'
    },
    {
      path: 'sandbox.filesystem.denyRead',
      type: 'string-array',
      category: 'sandbox',
      label: 'Filesystem Deny Read Paths',
      description: 'Paths where sandboxed commands cannot read (e.g. ["~/.aws/credentials"]).',
      scopes: ['user', 'project', 'local', 'managed'],
      mergeBehavior: 'merge-array'
    },
    {
      path: 'sandbox.filesystem.allowRead',
      type: 'string-array',
      category: 'sandbox',
      label: 'Filesystem Allow Read Paths',
      description: 'Paths to re-allow reading within denyRead regions.',
      scopes: ['user', 'project', 'local', 'managed'],
      mergeBehavior: 'merge-array'
    },
    {
      path: 'sandbox.filesystem.disabled',
      type: 'boolean',
      default: false,
      category: 'sandbox',
      label: 'Disable Filesystem Isolation',
      description: 'Skip filesystem isolation while keeping network isolation active.',
      scopes: ['user', 'managed']
    },
    {
      path: 'sandbox.filesystem.allowManagedReadPathsOnly',
      type: 'boolean',
      default: false,
      category: 'sandbox',
      label: 'Managed Read Paths Only',
      description: 'Only allowRead paths from managed settings are respected.',
      scopes: ['managed'],
      managedOnly: true
    },
    {
      path: 'sandbox.network.allowedDomains',
      type: 'string-array',
      category: 'sandbox',
      label: 'Network Allowed Domains',
      description: 'Allowed outbound network domains (e.g. ["github.com", "*.npmjs.org"]).',
      scopes: ['user', 'project', 'local', 'managed'],
      mergeBehavior: 'merge-array'
    },
    {
      path: 'sandbox.network.deniedDomains',
      type: 'string-array',
      category: 'sandbox',
      label: 'Network Denied Domains',
      description: 'Blocked outbound network domains. Takes precedence over allowedDomains.',
      scopes: ['user', 'project', 'local', 'managed'],
      mergeBehavior: 'merge-array'
    },
    {
      path: 'sandbox.network.strictAllowlist',
      type: 'boolean',
      default: false,
      category: 'sandbox',
      label: 'Strict Network Allowlist',
      description: 'Block non-allowlisted network hosts without prompting for approval.',
      scopes: ['user', 'managed']
    },
    {
      path: 'sandbox.network.allowAllUnixSockets',
      type: 'boolean',
      default: false,
      category: 'sandbox',
      label: 'Allow All Unix Sockets',
      description: 'Allow all Unix socket connections in sandbox (Linux/WSL2).',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'sandbox.network.allowLocalBinding',
      type: 'boolean',
      default: false,
      category: 'sandbox',
      label: 'Allow Localhost Binding',
      description: 'Allow binding to localhost ports (macOS).',
      scopes: ['user', 'project', 'local', 'managed']
    },

    // --- Environment Variables ---
    {
      path: 'env',
      type: 'key-value-map',
      category: 'env',
      label: 'Environment Variables',
      description: 'Environment variables passed to Claude Code sessions, commands, and hooks.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'apiKeyHelper',
      type: 'string',
      category: 'env',
      label: 'API Key Helper Command',
      description: 'Shell command executed to generate temporary auth tokens (X-Api-Key / Authorization).',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'otelHeadersHelper',
      type: 'string',
      category: 'env',
      label: 'OTEL Headers Helper Command',
      description: 'Script to generate dynamic OpenTelemetry telemetry headers.',
      scopes: ['user', 'project', 'local', 'managed']
    },

    // --- Models & Workflows ---
    {
      path: 'model',
      type: 'string',
      category: 'models',
      label: 'Primary Model',
      description: 'Default Claude model ID or alias (e.g. claude-sonnet-5, opus, haiku).',
      scopes: ['user', 'project', 'local', 'managed'],
      restartRequired: true
    },
    {
      path: 'fallbackModel',
      type: 'string-array',
      category: 'models',
      label: 'Fallback Models Chain',
      description: 'Ordered fallback model IDs when primary is unavailable (max 3, replaces whole chain).',
      scopes: ['user', 'project', 'local', 'managed'],
      mergeBehavior: 'replace-whole',
      maxItems: 3
    },
    {
      path: 'advisorModel',
      type: 'string',
      category: 'models',
      label: 'Advisor Tool Model',
      description: 'Model for server-side advisor tool: fable, opus, or sonnet.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'availableModels',
      type: 'string-array',
      category: 'models',
      label: 'Available Models Allowlist',
      description: 'Restrict which models users can select for sessions, subagents, and skills.',
      scopes: ['user', 'managed']
    },
    {
      path: 'enforceAvailableModels',
      type: 'boolean',
      default: false,
      category: 'models',
      label: 'Enforce Model Allowlist for Default',
      description: 'Fallback Default model to first available allowlisted entry if outside allowlist.',
      scopes: ['managed'],
      managedOnly: true
    },
    {
      path: 'alwaysThinkingEnabled',
      type: 'boolean',
      default: false,
      category: 'models',
      label: 'Always Extended Thinking',
      description: 'Enable extended thinking by default for all sessions.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'showThinkingSummaries',
      type: 'boolean',
      default: false,
      category: 'models',
      label: 'Show Thinking Summaries',
      description: 'Show extended thinking summaries in interactive sessions.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'fastMode',
      type: 'boolean',
      default: false,
      category: 'models',
      label: 'Fast Mode Enabled',
      description: 'Turn fast mode on for sessions where available.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'fastModePerSessionOptIn',
      type: 'boolean',
      default: false,
      category: 'models',
      label: 'Fast Mode Per-Session Opt-In',
      description: 'Start each session with fast mode off, requiring manual /fast toggle.',
      scopes: ['user', 'managed']
    },
    {
      path: 'switchModelsOnFlag',
      type: 'boolean',
      default: true,
      category: 'models',
      label: 'Switch Models on Safety Flag',
      description: 'Automatically switch to fallback model when safety classifier flags a request.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'autoCompactEnabled',
      type: 'boolean',
      default: true,
      category: 'models',
      label: 'Auto-compact Enabled',
      description: 'Automatically compact conversation when context window fills.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'autoCompactWindow',
      type: 'number',
      category: 'models',
      label: 'Auto-compact Window Tokens',
      description: 'Token threshold before auto-compaction triggers (100,000 to 1,000,000).',
      scopes: ['user', 'managed'],
      min: 100000,
      max: 1000000
    },
    {
      path: 'workflowSizeGuideline',
      type: 'enum',
      enumKey: 'workflowSizeGuideline',
      default: 'medium',
      category: 'models',
      label: 'Workflow Size Guideline',
      description: 'Agent count guideline for dynamic workflows: unrestricted, small, medium, large.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'workflowKeywordTriggerEnabled',
      type: 'boolean',
      default: true,
      category: 'models',
      label: 'Workflow Keyword Trigger',
      description: 'Whether typing "ultracode" in prompt triggers a dynamic workflow.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'disableWorkflows',
      type: 'boolean',
      default: false,
      category: 'models',
      label: 'Disable Dynamic Workflows',
      description: 'Disable dynamic workflows and bundled workflow commands.',
      scopes: ['user', 'project', 'local', 'managed']
    },

    // --- Hooks & Lifecycle ---
    {
      path: 'hooks',
      type: 'custom',
      category: 'hooks',
      label: 'Lifecycle Hooks',
      description: 'Commands, HTTP webhooks, prompts, or agents run at lifecycle events.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'disableAllHooks',
      type: 'boolean',
      default: false,
      category: 'hooks',
      label: 'Disable All Hooks',
      description: 'Disable all hooks, custom status line, and file suggestions.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'allowManagedHooksOnly',
      type: 'boolean',
      default: false,
      category: 'hooks',
      label: 'Allow Managed Hooks Only',
      description: 'Only execute hooks and status lines defined in managed policy.',
      scopes: ['managed'],
      managedOnly: true
    },
    {
      path: 'allowedHttpHookUrls',
      type: 'string-array',
      category: 'hooks',
      label: 'Allowed HTTP Hook URLs',
      description: 'Allowlist of URL patterns HTTP hooks may call (e.g. ["https://hooks.example.com/*"]).',
      scopes: ['user', 'project', 'local', 'managed'],
      mergeBehavior: 'merge-array'
    },
    {
      path: 'httpHookAllowedEnvVars',
      type: 'string-array',
      category: 'hooks',
      label: 'HTTP Hook Allowed Env Vars',
      description: 'Allowlist of environment variables HTTP hooks may interpolate into headers.',
      scopes: ['user', 'project', 'local', 'managed'],
      mergeBehavior: 'merge-array'
    },
    {
      path: 'statusLine',
      type: 'custom',
      category: 'hooks',
      label: 'Custom Status Line',
      description: 'Configure custom statusline command, padding, and refresh interval.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'subagentStatusLine',
      type: 'custom',
      category: 'hooks',
      label: 'Subagent Status Line',
      description: 'Custom command to format subagent task rows in agent view.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'fileSuggestion',
      type: 'custom',
      category: 'hooks',
      label: 'File Suggestion Command',
      description: 'Custom command for @ file path autocomplete.',
      scopes: ['user', 'project', 'local', 'managed']
    },

    // --- MCP Servers & Policies ---
    {
      path: 'allowedMcpServers',
      type: 'object-array',
      category: 'mcp',
      label: 'Allowed MCP Servers',
      description: 'Allowlist of MCP servers users can configure.',
      scopes: ['managed'],
      managedOnly: true
    },
    {
      path: 'deniedMcpServers',
      type: 'object-array',
      category: 'mcp',
      label: 'Denied MCP Servers',
      description: 'Denylist of MCP servers that are explicitly blocked.',
      scopes: ['managed'],
      managedOnly: true
    },
    {
      path: 'allowManagedMcpServersOnly',
      type: 'boolean',
      default: false,
      category: 'mcp',
      label: 'Managed MCP Servers Only',
      description: 'Only admin-defined MCP servers in managed settings apply.',
      scopes: ['managed'],
      managedOnly: true
    },
    {
      path: 'disableClaudeAiConnectors',
      type: 'boolean',
      default: false,
      category: 'mcp',
      label: 'Disable Claude.ai MCP Connectors',
      description: 'Disable automatic fetching of cloud MCP connectors from claude.ai.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'enableAllProjectMcpServers',
      type: 'boolean',
      default: false,
      category: 'mcp',
      label: 'Enable All Project MCP Servers',
      description: 'Automatically approve all MCP servers defined in .mcp.json.',
      scopes: ['user', 'local', 'managed'],
      scopeNotes: {
        project: 'Ignored in untrusted repository project files.'
      }
    },
    {
      path: 'enabledMcpjsonServers',
      type: 'string-array',
      category: 'mcp',
      label: 'Enabled .mcp.json Servers',
      description: 'List of specific MCP servers from .mcp.json to approve.',
      scopes: ['user', 'local', 'managed']
    },
    {
      path: 'disabledMcpjsonServers',
      type: 'string-array',
      category: 'mcp',
      label: 'Disabled .mcp.json Servers',
      description: 'List of specific MCP servers from .mcp.json to reject.',
      scopes: ['user', 'local', 'managed']
    },

    // --- Worktrees, Memory & Sessions ---
    {
      path: 'worktree.baseRef',
      type: 'enum',
      enumKey: 'worktree.baseRef',
      default: 'fresh',
      category: 'worktree',
      label: 'Worktree Base Ref',
      description: 'Ref new worktrees branch from: fresh (origin default) or head (local HEAD).',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'worktree.symlinkDirectories',
      type: 'string-array',
      category: 'worktree',
      label: 'Worktree Symlink Directories',
      description: 'Directories to symlink into new worktrees (e.g. ["node_modules", ".cache"]).',
      scopes: ['user', 'project', 'local', 'managed'],
      mergeBehavior: 'merge-array'
    },
    {
      path: 'worktree.sparsePaths',
      type: 'string-array',
      category: 'worktree',
      label: 'Worktree Sparse Paths',
      description: 'Directories to checkout in worktrees via git sparse-checkout.',
      scopes: ['user', 'project', 'local', 'managed'],
      mergeBehavior: 'merge-array'
    },
    {
      path: 'worktree.bgIsolation',
      type: 'enum',
      enumKey: 'worktree.bgIsolation',
      default: 'worktree',
      category: 'worktree',
      label: 'Background Session Isolation',
      description: 'Isolation mode for background subagents: worktree (safe isolated copy) or none.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'autoMemoryEnabled',
      type: 'boolean',
      default: true,
      category: 'worktree',
      label: 'Auto Memory Enabled',
      description: 'Allow Claude to read and write persistent memories in auto memory directory.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'autoMemoryDirectory',
      type: 'string',
      category: 'worktree',
      label: 'Auto Memory Directory',
      description: 'Custom directory path for auto memory storage.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'claudeMd',
      type: 'string',
      category: 'worktree',
      label: 'Organization CLAUDE.md Memory',
      description: 'Organization-wide instructions injected as managed memory.',
      scopes: ['managed'],
      managedOnly: true
    },
    {
      path: 'claudeMdExcludes',
      type: 'string-array',
      category: 'worktree',
      label: 'CLAUDE.md Excludes',
      description: 'Glob patterns of CLAUDE.md files to skip loading.',
      scopes: ['user', 'project', 'local', 'managed'],
      mergeBehavior: 'merge-array'
    },
    {
      path: 'includeGitInstructions',
      type: 'boolean',
      default: true,
      category: 'worktree',
      label: 'Include Git Instructions',
      description: 'Include built-in commit/PR workflow instructions and git status in system prompt.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'plansDirectory',
      type: 'string',
      category: 'worktree',
      label: 'Plans Directory',
      description: 'Custom directory where plan mode files are stored (relative to root).',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'cleanupPeriodDays',
      type: 'number',
      default: 30,
      category: 'worktree',
      label: 'Session Retention Period (Days)',
      description: 'Delete session transcripts and data older than this number of days (min 1).',
      scopes: ['user', 'project', 'local', 'managed'],
      min: 1
    },
    {
      path: 'teammateMode',
      type: 'enum',
      enumKey: 'teammateMode',
      default: 'in-process',
      category: 'worktree',
      label: 'Agent Teams Display Mode',
      description: 'Display mode for agent team teammates: in-process, auto, tmux, or iterm2.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'isolatePeerMachines',
      type: 'boolean',
      default: false,
      category: 'worktree',
      label: 'Isolate Peer Machines (Approval)',
      description: 'Require explicit approval before SendMessage reaches remote machines.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'crossSessionInbound',
      type: 'enum',
      enumKey: 'crossSessionInbound',
      category: 'worktree',
      label: 'Cross-Session Inbound Messages',
      description: 'How to treat inbound messages from other sessions: accept, hold, or refuse.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'disableAgentView',
      type: 'boolean',
      default: false,
      category: 'worktree',
      label: 'Disable Background Agents',
      description: 'Disable background agents and agent view (claude agents, --bg, /background).',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'remoteControlAtStartup',
      type: 'boolean',
      default: false,
      category: 'worktree',
      label: 'Remote Control Auto-Connect',
      description: 'Connect Remote Control automatically when interactive session starts.',
      scopes: ['user', 'managed']
    },
    {
      path: 'disableRemoteControl',
      type: 'boolean',
      default: false,
      category: 'worktree',
      label: 'Disable Remote Control',
      description: 'Block Remote Control entirely.',
      scopes: ['user', 'project', 'local', 'managed']
    },

    // --- Plugins & Marketplaces ---
    {
      path: 'enabledPlugins',
      type: 'key-value-map',
      category: 'plugins',
      label: 'Enabled Plugins',
      description: 'Map of plugin IDs (name@marketplace) to boolean enabled state.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'pluginConfigs',
      type: 'custom',
      category: 'plugins',
      label: 'Plugin Configurations',
      description: 'Configuration options per plugin ID (name@marketplace).',
      scopes: ['user', 'managed'],
      scopeNotes: {
        project: 'Ignored in Project & Local settings for security.',
        local: 'Ignored in Project & Local settings for security.'
      }
    },
    {
      path: 'extraKnownMarketplaces',
      type: 'custom',
      category: 'plugins',
      label: 'Marketplace Sources',
      description: 'Known plugin marketplaces mapped by name to source declarations.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'strictKnownMarketplaces',
      type: 'object-array',
      category: 'plugins',
      label: 'Strict Known Marketplaces Allowlist',
      description: 'Allowlist of plugin marketplace sources. Empty array = lockdown.',
      scopes: ['managed'],
      managedOnly: true
    },
    {
      path: 'blockedMarketplaces',
      type: 'object-array',
      category: 'plugins',
      label: 'Blocked Marketplaces',
      description: 'Blocklist of marketplace sources.',
      scopes: ['managed'],
      managedOnly: true
    },
    {
      path: 'strictPluginOnlyCustomization',
      type: 'string-array',
      category: 'plugins',
      label: 'Strict Plugin-Only Customization',
      description: 'Block skills, agents, hooks, and MCP servers from user/project files.',
      scopes: ['managed'],
      managedOnly: true
    },
    {
      path: 'disableCommandPluginSources',
      type: 'boolean',
      category: 'plugins',
      label: 'Disable Command Plugin Sources',
      description: 'Block plugins that install by running local shell commands.',
      scopes: ['managed'],
      managedOnly: true
    },
    {
      path: 'disableSideloadFlags',
      type: 'boolean',
      default: false,
      category: 'plugins',
      label: 'Disable Plugin/MCP Sideload CLI Flags',
      description: 'Reject --plugin-dir, --plugin-url, --agents, and --mcp-config at startup.',
      scopes: ['managed'],
      managedOnly: true
    },

    // --- Enterprise & Managed Policies ---
    {
      path: 'forceLoginMethod',
      type: 'enum',
      enumKey: 'forceLoginMethod',
      category: 'advanced',
      label: 'Force Login Method',
      description: 'Restrict authentication method: claudeai, console, or gateway.',
      scopes: ['managed'],
      managedOnly: true
    },
    {
      path: 'forceLoginGatewayUrl',
      type: 'string',
      category: 'advanced',
      label: 'Force Gateway URL',
      description: 'Pre-fill and lock gateway URL on login screen.',
      scopes: ['managed'],
      managedOnly: true
    },
    {
      path: 'forceLoginOrgUUID',
      type: 'string',
      category: 'advanced',
      label: 'Force Login Organization UUID',
      description: 'Require claude.ai logins to belong to specific Anthropic organization UUID(s).',
      scopes: ['managed'],
      managedOnly: true
    },
    {
      path: 'forceRemoteSettingsRefresh',
      type: 'boolean',
      category: 'advanced',
      label: 'Force Remote Settings Refresh',
      description: 'Block CLI startup until remote managed settings are freshly retrieved.',
      scopes: ['managed'],
      managedOnly: true
    },
    {
      path: 'requiredMinimumVersion',
      type: 'string',
      category: 'advanced',
      label: 'Required Minimum Version',
      description: 'Hard minimum Claude Code version required to start.',
      scopes: ['managed'],
      managedOnly: true
    },
    {
      path: 'requiredMaximumVersion',
      type: 'string',
      category: 'advanced',
      label: 'Required Maximum Version',
      description: 'Hard maximum Claude Code version allowed to start.',
      scopes: ['managed'],
      managedOnly: true
    },
    {
      path: 'autoUpdatesChannel',
      type: 'enum',
      enumKey: 'autoUpdatesChannel',
      default: 'latest',
      category: 'advanced',
      label: 'Auto Updates Channel',
      description: 'Release channel to follow: latest or stable.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'companyAnnouncements',
      type: 'string-array',
      category: 'advanced',
      label: 'Company Announcements',
      description: 'Announcements displayed to users at startup.',
      scopes: ['user', 'project', 'local', 'managed'],
      mergeBehavior: 'merge-array'
    },
    {
      path: 'askUserQuestionTimeout',
      type: 'enum',
      enumKey: 'askUserQuestionTimeout',
      default: 'never',
      allowCustom: true,
      category: 'advanced',
      label: 'Ask User Question Timeout',
      description: 'Idle time before AskUserQuestion dialog auto-continues (e.g. never, 60s, 5m, 10m).',
      scopes: ['user', 'managed'],
      scopeNotes: {
        project: 'Not read from Project or Local settings.',
        local: 'Not read from Project or Local settings.'
      }
    },
    {
      path: 'dialogExpiry',
      type: 'enum',
      enumKey: 'dialogExpiry',
      default: '5m',
      allowCustom: true,
      category: 'advanced',
      label: 'Remote Dialog Expiry',
      description: 'Deadline for remote dialogs and cross-session hold approvals.',
      scopes: ['user', 'managed']
    },
    {
      path: 'outputStyle',
      type: 'string',
      category: 'advanced',
      label: 'Output Style',
      description: 'Configure an output style in system prompt (e.g. Explanatory).',
      scopes: ['user', 'project', 'local', 'managed'],
      restartRequired: true
    },
    {
      path: 'disableArtifact',
      type: 'boolean',
      default: false,
      category: 'advanced',
      label: 'Disable Artifact Tool',
      description: 'Disable the Artifact publishing tool across sessions.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'enableArtifact',
      type: 'boolean',
      category: 'advanced',
      label: 'Enable Artifact Tool',
      description: 'Enable or disable Artifact tool for current user.',
      scopes: ['user', 'managed'],
      scopeNotes: {
        project: 'Ignored in Project & Local settings.',
        local: 'Ignored in Project & Local settings.'
      }
    },
    {
      path: 'disableBundledSkills',
      type: 'boolean',
      default: false,
      category: 'advanced',
      label: 'Disable Bundled Skills',
      description: 'Remove bundled skills and workflows from prompt visibility.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'disableSkillShellExecution',
      type: 'boolean',
      default: false,
      category: 'advanced',
      label: 'Disable Skill Shell Execution',
      description: 'Block inline shell execution in custom skills and slash commands.',
      scopes: ['user', 'project', 'local', 'managed']
    },
    {
      path: 'disableDeepLinkRegistration',
      type: 'string',
      category: 'advanced',
      label: 'Disable Deep Link Registration',
      description: 'Set to "disable" to prevent registering claude-cli:// protocol handler.',
      scopes: ['user', 'project', 'local', 'managed']
    }
  ];

  const CATALOG_BY_PATH = new Map(CATALOG.map(item => [item.path, item]));

  function getSettingDefinition(path) {
    return CATALOG_BY_PATH.get(path) || null;
  }

  function getEnumOptions(enumKey) {
    return ENUMS[enumKey] ? ENUMS[enumKey].slice() : [];
  }

  function getScopeDefinition(scopeId) {
    return SCOPES[scopeId] || SCOPES.user;
  }

  function isSettingSupportedInScope(path, scopeId) {
    const def = getSettingDefinition(path);
    if (!def) return true; // unknown settings are always preserved
    if (scopeId === 'managed') return true;
    if (def.managedOnly) return false;
    return def.scopes ? def.scopes.includes(scopeId) : true;
  }

  return {
    CATALOG,
    CATALOG_BY_PATH,
    ENUMS,
    SCOPES,
    getEnumOptions,
    getScopeDefinition,
    getSettingDefinition,
    isSettingSupportedInScope
  };
});
