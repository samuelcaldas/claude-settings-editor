(function exposeI18n(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.I18n = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createI18n() {
  'use strict';

  const STORAGE_KEY = 'claude-settings-editor.locale';

  const DICTIONARIES = {
    en: {
      // Document & App
      'app.title': 'Claude Settings Editor',
      'app.description': 'Visual editor for Claude Code settings.json — safe, client-side, zero data loss, fully supporting the complete Claude Code settings reference.',
      'app.brand': 'Claude',
      'app.brandSuffix': 'Settings Editor',
      'app.dirtyBadge': 'UNSAVED',
      'app.targetScope': 'Target Scope:',
      'app.languageLabel': 'Language:',
      'app.ready': 'Ready',
      'app.unsaved': 'Unsaved edits',

      // Scopes
      'scope.user': 'User (~/.claude/settings.json)',
      'scope.project': 'Project (.claude/settings.json)',
      'scope.local': 'Local (.claude/settings.local.json)',
      'scope.managed': 'Managed (managed-settings.json)',
      'scope.info.user': 'User Scope (~/.claude/settings.json)',
      'scope.info.project': 'Project Scope (.claude/settings.json)',
      'scope.info.local': 'Local Scope (.claude/settings.local.json)',
      'scope.info.managed': 'Managed Policy (managed-settings.json)',

      // Header Actions
      'actions.undo': 'Undo',
      'actions.redo': 'Redo',
      'actions.undoTitle': 'Undo change (Ctrl+Z)',
      'actions.redoTitle': 'Redo change (Ctrl+Y)',
      'actions.openFile': 'Open File',
      'actions.openFileTitle': 'Open local JSON file (Ctrl+O)',
      'actions.save': 'Save',
      'actions.saveTitle': 'Save changes in-place (Ctrl+S)',
      'actions.saveAs': 'Save As...',
      'actions.saveAsTitle': 'Save to new file (Ctrl+Shift+S)',
      'actions.loadJson': 'Load JSON',
      'actions.loadSample': 'Load Sample',
      'actions.download': 'Download settings.json',
      'actions.loadMobile': 'Open',
      'actions.saveMobile': 'Save',
      'actions.unset': 'unset',
      'actions.remove': 'Remove',
      'actions.moveUp': 'Move up',
      'actions.moveDown': 'Move down',
      'actions.add': '+ Add',

      // File Status & Indicator
      'file.activeSample': 'sample.json (sample)',
      'file.untitled': 'Untitled document',
      'file.directDisk': 'Direct disk access active',

      // Navigation Sections & Tabs
      'nav.sections.config': 'Configuration',
      'nav.sections.components': 'Components & Rules',
      'nav.sections.raw': 'Raw Editor',
      'nav.tabs.general': 'General & UI',
      'nav.tabs.permissions': 'Permissions',
      'nav.tabs.sandbox': 'Sandboxing',
      'nav.tabs.env': 'Environment',
      'nav.tabs.models': 'Models & Workflows',
      'nav.tabs.hooks': 'Hooks & Status Line',
      'nav.tabs.mcp': 'MCP Policy',
      'nav.tabs.worktree': 'Worktree & Memory',
      'nav.tabs.plugins': 'Plugins & Marketplaces',
      'nav.tabs.managedPolicies': 'Managed Policies',
      'nav.tabs.advanced': 'Advanced JSON',

      // Section Titles & Descriptions
      'sections.general.title': 'General & Interface Settings',
      'sections.general.desc': 'Configure color theme, editor modes, notifications, accessibility, and terminal rendering preferences.',
      'sections.general.toggles': 'Accessibility & UI Toggles',

      'sections.permissions.title': 'Permissions & Security Modes',
      'sections.permissions.desc': 'Control starting permission modes, tool-specific permission rules (allow, ask, deny), and permission prompt behavior. Rules evaluate in order: deny → ask → allow.',
      'sections.permissions.flags': 'Permission Flags',
      'sections.permissions.ruleLists': 'Permission Rule Lists',

      'sections.sandbox.title': 'Sandbox Configuration',
      'sections.sandbox.desc': 'Configure process isolation for Bash commands on macOS, Linux, and WSL2. Controls filesystem access, network egress, and credential protection.',
      'sections.sandbox.filesystem': 'Filesystem Isolation Paths',
      'sections.sandbox.network': 'Network Isolation Domains',
      'sections.sandbox.excluded': 'Excluded Commands',

      'sections.env.title': 'API & Environment Variables',
      'sections.env.desc': 'Configure API credentials, custom base endpoints, and environment variables passed to Claude Code sessions and subprocesses.',
      'sections.env.apiConnection.title': 'API Credentials & Endpoint',
      'sections.env.additional.title': 'Additional Environment Variables',
      'sections.env.additional.desc': 'General environment variables passed to subprocesses, tools, and scripts.',
      'sections.env.presets': 'Quick Presets:',
      'sections.env.helpers': 'Telemetry Helper Command',

      'sections.models.title': 'Models & Dynamic Workflows',
      'sections.models.desc': 'Configure primary model selection, gateway model tiers (Fable, Opus, Sonnet, Haiku), fallback chains, and workflow settings.',
      'sections.models.tiers.title': 'Gateway Model Tiers & Capabilities',
      'sections.models.tiers.desc': 'Configure the model mappings, friendly display names, descriptions, and capabilities for each model tier (stored in env.ANTHROPIC_DEFAULT_*).',
      'sections.models.sessionSelection.title': 'Session & Global Model Selection',
      'sections.models.toggles': 'Model & Workflow Toggles',
      'sections.models.fallbackChain': 'Fallback Models Chain',
      'sections.models.fallbackDesc': 'Ordered list of fallback models (capped at 3 models). Replaces entire chain across settings files.',

      'sections.hooks.title': 'Lifecycle Hooks & Status Line',
      'sections.hooks.desc': 'Configure custom hooks, statusline scripts, subagent status lines, and link badges attached to Claude Code lifecycle events.',
      'sections.hooks.configured': 'Configured Hooks',
      'sections.hooks.statusLine': 'Status Line Configuration',
      'sections.hooks.allowedUrls': 'Allowed HTTP Hook URLs',

      'sections.mcp.title': 'Model Context Protocol (MCP) Policies',
      'sections.mcp.desc': 'Manage approval policies and enterprise restrictions for Model Context Protocol servers. (Server definitions live in .mcp.json or ~/.claude.json).',
      'sections.mcp.enabledServers': 'Enabled .mcp.json Servers',
      'sections.mcp.disabledServers': 'Disabled .mcp.json Servers',

      'sections.worktree.title': 'Git Worktrees, Memory & Sessions',
      'sections.worktree.desc': 'Configure git worktree creation, background subagent isolation, auto-memory storage, and session retention.',
      'sections.worktree.toggles': 'Worktree & Session Toggles',
      'sections.worktree.symlinks': 'Symlink Directories',
      'sections.worktree.sparse': 'Sparse Paths',

      'sections.plugins.title': 'Plugins & Marketplaces',
      'sections.plugins.desc': 'Manage installed plugins (enabledPlugins) and custom marketplace sources (extraKnownMarketplaces).',
      'sections.plugins.enabled': 'Enabled Plugins',
      'sections.plugins.marketplaces': 'Extra Known Marketplaces',

      'sections.managed.title': 'Enterprise & Managed Policies',
      'sections.managed.desc': 'Organization-level controls typically deployed in managed-settings.json, MDM configuration profiles, or system policy directories.',
      'sections.managed.toggles': 'Policy Toggles',

      // Badges
      'badge.managedOnly': 'Managed Only',
      'badge.managed': 'Managed',

      // General Fields
      'field.theme.label': 'Color Theme',
      'field.theme.hint': 'Supports built-in themes or custom identifiers like custom:my-theme.',
      'field.theme.default': '(Default: dark)',
      'field.theme.auto': 'auto — match terminal',
      'field.theme.dark': 'dark',
      'field.theme.light': 'light',
      'field.theme.darkDaltonized': 'dark-daltonized (Colorblind)',
      'field.theme.lightDaltonized': 'light-daltonized (Colorblind)',
      'field.theme.darkAnsi': 'dark-ansi',
      'field.theme.lightAnsi': 'light-ansi',

      'field.tui.label': 'Terminal UI',
      'field.tui.default': '(Default: fullscreen)',
      'field.tui.fullscreen': 'fullscreen — alt-screen renderer',
      'field.tui.defaultInline': 'default — classic inline stream',

      'field.editorMode.label': 'Input Keybindings',
      'field.editorMode.default': '(Default: normal)',
      'field.editorMode.normal': 'normal',
      'field.editorMode.vim': 'vim',

      'field.effortLevel.label': 'Reasoning Effort',
      'field.effortLevel.default': '(Default: model standard)',
      'field.effortLevel.low': 'low',
      'field.effortLevel.medium': 'medium',
      'field.effortLevel.high': 'high',
      'field.effortLevel.xhigh': 'xhigh',

      'field.language.label': 'Preferred Language',
      'field.language.placeholder': 'e.g. english, spanish, japanese',

      'field.notif.label': 'Notifications',
      'field.notif.default': '(Default: auto)',
      'field.notif.auto': 'auto — desktop notification in supported terminals',
      'field.notif.bell': 'terminal_bell — ring bell character',
      'field.notif.iterm2': 'iterm2',
      'field.notif.iterm2Bell': 'iterm2_with_bell',
      'field.notif.kitty': 'kitty',
      'field.notif.ghostty': 'ghostty',
      'field.notif.disabled': 'notifications_disabled',

      'field.viewMode.label': 'Transcript View',
      'field.viewMode.default': '(Default: default)',
      'field.viewMode.defaultVal': 'default',
      'field.viewMode.verbose': 'verbose',
      'field.viewMode.focus': 'focus',

      'field.defaultShell.label': '! Shell Commands',
      'field.defaultShell.default': '(Default: bash / powershell)',
      'field.defaultShell.bash': 'bash',
      'field.defaultShell.powershell': 'powershell',

      'field.feedbackSurveyRate.label': 'Survey Rate',
      'field.feedbackSurveyRate.placeholder': '0.05',
      'field.skillBudget.label': 'Skill Budget Fraction',
      'field.skillBudget.placeholder': '0.01',
      'field.skillMaxChars.label': 'Skill Max Desc Chars',
      'field.skillMaxChars.placeholder': '1536',

      // General Toggles
      'toggle.axScreenReader': 'Screen reader accessible text',
      'toggle.prefersReducedMotion': 'Reduce animations & spinners',
      'toggle.promptSuggestionEnabled': 'Gray prompt predictions',
      'toggle.showClearContextOnPlanAccept': 'Clear context on plan accept',
      'toggle.awaySummaryEnabled': 'Show summary when returning from away',
      'toggle.emojiCompletionEnabled': ':emoji: shortcode completion',
      'toggle.syntaxHighlightingDisabled': 'Disable code syntax highlight',
      'toggle.autoScrollEnabled': 'Auto-scroll to bottom',
      'toggle.showTurnDuration': 'Show response turn duration',
      'toggle.terminalProgressBarEnabled': 'Terminal progress bar',
      'toggle.spinnerTipsEnabled': 'Show tips in spinner',
      'toggle.wheelScrollAccelerationEnabled': 'Mouse wheel acceleration',
      'toggle.fileCheckpointingEnabled': 'Snapshot files for /rewind',
      'toggle.verbose': 'Show full tool output',

      // Permissions Fields & Options
      'field.permMode.default': '(Default: default / plan-dependent)',
      'field.permMode.defaultVal': 'default — prompt for tool actions',
      'field.permMode.acceptEdits': 'acceptEdits — auto-approve file edits only',
      'field.permMode.plan': 'plan — plan-only mode, no execution',
      'field.permMode.auto': 'auto — autonomous classifier (User/Managed only)',
      'field.permMode.dontAsk': 'dontAsk — auto-approve commands and tools',
      'field.permMode.bypass': 'bypassPermissions — skip all permission checks',
      'field.permMode.manual': 'manual — alias for default',
      'field.permMode.hint': 'Note: auto mode is only honored in User or Managed scope.',

      'field.disableAutoMode.default': '(Enabled / Not set)',
      'field.disableAutoMode.disable': 'disable — prevent auto mode entirely',
      'field.disableBypass.default': '(Enabled / Not set)',
      'field.disableBypass.disable': 'disable — block bypass permissions mode',

      'toggle.skipDangerousModePrompt': 'Skip dangerous mode permission prompt',
      'toggle.useAutoModeDuringPlan': 'Use auto mode during plan execution',
      'toggle.classifyAllShell': 'Classify all shell commands in auto mode',
      'toggle.allowManagedRulesOnly': 'Allow managed permission rules only',

      // Rule Lists
      'rules.deny.title': 'Deny Rules',
      'rules.deny.desc': 'Evaluated FIRST. Matches block tool execution and hide sensitive files.',
      'rules.deny.button': '+ Add Deny Rule',
      'rules.deny.placeholder': 'e.g. Read(./.env), Bash(curl *), WebFetch',

      'rules.ask.title': 'Ask Rules',
      'rules.ask.desc': 'Evaluated SECOND. Matches always prompt the user for confirmation.',
      'rules.ask.button': '+ Add Ask Rule',
      'rules.ask.placeholder': 'e.g. Bash(git push *), Bash(npm publish)',

      'rules.allow.title': 'Allow Rules',
      'rules.allow.desc': 'Evaluated THIRD. Matches auto-execute without interactive prompt.',
      'rules.allow.button': '+ Add Allow Rule',
      'rules.allow.placeholder': 'e.g. Bash(npm run *), Read(./src/**)',

      'rules.additionalDirs.title': 'Additional Directories',
      'rules.additionalDirs.desc': 'Extra working directories granted for file read/edit access.',
      'rules.additionalDirs.button': '+ Add Directory',
      'rules.additionalDirs.placeholder': 'e.g. ../docs/, ~/shared-libs/',

      // Sandbox Toggles & Rules
      'toggle.sandbox.enabled': 'Enable Bash Sandboxing',
      'toggle.sandbox.failIfUnavailable': 'Exit if sandbox unavailable',
      'toggle.sandbox.autoAllowBash': 'Auto-approve sandboxed commands',
      'toggle.sandbox.allowUnsandboxed': 'Allow escape hatch',
      'toggle.sandbox.fsDisabled': 'Skip filesystem isolation',
      'toggle.sandbox.strictNet': 'Strict network lockdown',
      'toggle.sandbox.allowUnixSockets': 'Allow all Unix sockets',
      'toggle.sandbox.allowLocalBinding': 'Allow localhost port binding',

      'rules.sb.allowWrite.title': 'Allow Write',
      'rules.sb.allowWrite.button': '+ Add Path',
      'rules.sb.allowWrite.placeholder': 'e.g. /tmp/build, ~/.kube',

      'rules.sb.denyWrite.title': 'Deny Write',
      'rules.sb.denyWrite.button': '+ Add Path',
      'rules.sb.denyWrite.placeholder': 'e.g. /etc, /usr/local/bin',

      'rules.sb.denyRead.title': 'Deny Read',
      'rules.sb.denyRead.button': '+ Add Path',
      'rules.sb.denyRead.placeholder': 'e.g. ~/.aws/credentials, ~/.ssh',

      'rules.sb.allowRead.title': 'Allow Read',
      'rules.sb.allowRead.button': '+ Add Path',
      'rules.sb.allowRead.placeholder': 'e.g. . (workspace re-allow)',

      'rules.sb.allowDomains.title': 'Allowed Domains',
      'rules.sb.allowDomains.button': '+ Add Domain',
      'rules.sb.allowDomains.placeholder': 'e.g. github.com, *.npmjs.org',

      'rules.sb.denyDomains.title': 'Denied Domains',
      'rules.sb.denyDomains.button': '+ Add Domain',
      'rules.sb.denyDomains.placeholder': 'e.g. uploads.github.com, *.internal',

      'rules.sb.excludedCmds.title': 'Excluded Commands',
      'rules.sb.excludedCmds.button': '+ Add Command',
      'rules.sb.excludedCmds.placeholder': 'e.g. docker *, podman *',

      // Environment
      'env.preset.anthropic': '+ Anthropic API',
      'env.preset.telemetry': '+ OpenTelemetry',
      'env.preset.models': '+ Default Models',
      'env.preset.gateway': '+ Gateway Models',
      'env.addVar': '+ Add Variable',
      'env.maskToggle': 'Mask Secrets',
      'env.keyPlaceholder': 'VARIABLE_NAME (e.g. OTEL_EXPORTER_OTLP_ENDPOINT)',
      'env.valPlaceholder': 'Value (or empty to unset)',
      'env.empty': 'No additional environment variables configured.',
      'env.notObject': 'env is not an object; edit in Advanced JSON.',
      'env.apiKey.label': 'Anthropic API Key',
      'env.apiKey.placeholder': 'sk-ant-...',
      'env.apiKey.hint': 'Primary API key for Anthropic or compatible gateway service.',
      'env.apiKey.show': 'Show',
      'env.apiKey.hide': 'Hide',
      'env.baseUrl.label': 'API Base URL',
      'env.baseUrl.placeholder': 'https://api.anthropic.com',
      'env.baseUrl.hint': 'Custom API gateway endpoint or reverse proxy (e.g. https://api.alanwo.com.br).',
      'env.authToken.label': 'Authorization Token',
      'env.apiKeyHelper.label': 'API Key Helper Command',
      'env.apiKeyHelperHint': 'Custom command run through shell to generate dynamic auth header values.',
      'env.otelHeadersHelperHint': 'Script to generate dynamic OpenTelemetry headers.',

      // Models & Workflows
      'models.discovery.fetchBtn': '⚡ Fetch Models from API',
      'models.discovery.fetching': 'Fetching models...',
      'models.discovery.status.defaults': 'Using {count} default model suggestions. Configure API base URL and key to fetch live models.',
      'models.discovery.status.success': 'Loaded {count} models from endpoint.',
      'models.discovery.status.error': 'Failed to fetch models: {error}',
      'models.discovery.status.noCreds': 'Configure API Base URL and Key/Token to discover models.',
      'models.discovery.badge.defaults': '{count} defaults',
      'models.discovery.badge.loaded': '{count} models',
      'models.discovery.hint': 'Queries the OpenAI-compatible /v1/models endpoint to populate model dropdowns.',
      'models.tier.fable': 'Fable Tier',
      'models.tier.opus': 'Opus Tier',
      'models.tier.sonnet': 'Sonnet Tier',
      'models.tier.haiku': 'Haiku Tier',
      'models.tier.custom': 'Custom Model Option',
      'models.tier.subagent': 'Subagent & Gateway Options',
      'models.field.modelId': 'Model ID / Mapping',
      'models.field.name': 'Display Name',
      'models.field.desc': 'Description',
      'models.field.capabilities': 'Capabilities',
      'models.field.subagent': 'Subagent Model Override',
      'models.field.discovery': 'Gateway Model Discovery (1/0)',
      'models.field.advisorTool': 'Enable Experimental Advisor Tool (1/0)',
      'field.model.label': 'Primary Model',
      'field.model.hint': 'Restart required when modified. Mid-session switch via /model.',
      'field.model.placeholder': 'e.g. claude-sonnet-5, opus',
      'field.advisorModel.label': 'Advisor Model',
      'field.advisorModel.placeholder': 'fable, opus, sonnet, or model ID',
      'field.autoCompactThreshold.label': 'Auto-compact Threshold Ratio',
      'field.workflowSize.default': '(Default: medium)',
      'field.workflowSize.unrestricted': 'unrestricted',
      'field.workflowSize.small': 'small',
      'field.workflowSize.medium': 'medium',
      'field.workflowSize.large': 'large',

      'toggle.alwaysThinking': 'Extended thinking by default',
      'toggle.showThinkingSummaries': 'Show thinking summaries',
      'toggle.fastMode': 'Enable Fast Mode (Opus)',
      'toggle.fastModePerSession': 'Require per-session /fast',
      'toggle.switchModelsOnFlag': 'Auto switch fallback on safety flag',
      'toggle.autoCompact': 'Auto-compact conversation',
      'toggle.workflowKeywordTrigger': '"ultracode" prompt trigger',
      'toggle.disableWorkflows': 'Disable dynamic workflows',
      'toggle.skipWorkflowUsageWarning': 'Skip dynamic workflow warning',
      'toggle.skipDangerousModeTop': 'Skip dangerous mode prompt (top-level)',
      'toggle.skipAutoPermissionPrompt': 'Skip auto permission prompt',
      'toggle.hasCompletedOnboarding': 'Completed onboarding tutorial',

      'fallback.add': '+ Add Fallback Model',
      'fallback.placeholder': 'Model ID (e.g. claude-sonnet-5, haiku, default)',
      'fallback.notArray': 'fallbackModel is not an array; edit in Advanced JSON.',

      // Hooks & Status Line
      'toggle.disableAllHooks': 'Disable all hooks & status line',
      'toggle.allowManagedHooksOnly': 'Allow managed hooks only',
      'hooks.addEvent': '+ Add Event Group',
      'hooks.addUrl': '+ Add URL Pattern',
      'hooks.empty': 'No hooks configured.',
      'hooks.notObject': 'hooks is not an object; edit in Advanced JSON.',
      'hooks.group': 'Group {number}',
      'hooks.groupWithMatcher': 'Group {number} (matcher: {matcher})',
      'hooks.addHandler': '+ Add handler',
      'hooks.deleteEvent': 'Delete event',
      'hooks.typeCommand': 'command',
      'hooks.typeHttp': 'http',
      'hooks.typePrompt': 'prompt',
      'hooks.typeAgent': 'agent',
      'hooks.urlPlaceholder': 'URL (https://...)',
      'hooks.cmdPlaceholder': 'Command / prompt text',
      'hooks.urlPatternPlaceholder': 'e.g. https://hooks.example.com/*',

      'statusLine.typeDefault': '(Not specified)',
      'statusLine.cmdPlaceholder': '~/.claude/statusline.sh',
      'statusLine.refreshPlaceholder': '5 (seconds)',
      'toggle.hideVimModeIndicator': 'Hide vim mode indicator',

      // MCP Policy
      'toggle.disableConnectors': 'Disable claude.ai connectors',
      'toggle.enableAllProjectMcp': 'Auto-approve all project .mcp.json',
      'toggle.allowManagedMcpOnly': 'Allow managed MCP servers only',
      'mcp.approve': '+ Approve Server',
      'mcp.reject': '+ Reject Server',
      'mcp.enabledPlaceholder': 'Server name (e.g. memory, github)',
      'mcp.disabledPlaceholder': 'Server name (e.g. filesystem)',

      // Worktree & Memory
      'field.wtBaseRef.default': '(Default: fresh)',
      'field.wtBaseRef.fresh': 'fresh — branch from origin/default',
      'field.wtBaseRef.head': 'head — branch from current local HEAD',
      'field.wtBgIso.default': '(Default: worktree)',
      'field.wtBgIso.worktree': 'worktree — isolate edits in dedicated worktree',
      'field.wtBgIso.none': 'none — allow background jobs to edit directly',
      'field.teammateMode.default': '(Default: in-process)',
      'field.teammateMode.inProcess': 'in-process',
      'field.teammateMode.auto': 'auto (split panes if tmux/it2)',
      'field.teammateMode.tmux': 'tmux',
      'field.teammateMode.iterm2': 'iterm2',

      'toggle.autoMemory': 'Enable auto memory',
      'toggle.gitInstructions': 'Built-in git prompt instructions',
      'toggle.isolatePeerMachines': 'Cross-machine message approval',
      'toggle.disableAgentView': 'Disable background agent view',

      'wt.symlinks.add': '+ Add Symlink Dir',
      'wt.symlinks.placeholder': 'e.g. node_modules, .cache',
      'wt.sparse.add': '+ Add Sparse Path',
      'wt.sparse.placeholder': 'e.g. packages/my-app, shared/utils',

      // Plugins & Marketplaces
      'plugin.add': '+ Add Plugin',
      'plugin.placeholder': 'plugin-name@marketplace',
      'plugin.empty': 'No plugins registered in settings.',
      'plugin.notObject': 'enabledPlugins is not an object; edit in Advanced JSON.',
      'mkt.add': '+ Add Marketplace',
      'mkt.namePlaceholder': 'Marketplace Name (e.g. team-tools)',
      'mkt.srcPlaceholder': 'Source location / repo',
      'mkt.empty': 'No extra marketplaces configured.',
      'mkt.typeGithub': 'github (repo)',
      'mkt.typeGit': 'git (clone URL)',
      'mkt.typeUrl': 'url (HTTP zip/tar)',
      'mkt.typeDir': 'directory (local path)',

      // Managed Policies
      'field.forceLogin.default': '(Not enforced)',
      'field.forceLogin.claudeai': 'claudeai — claude.ai accounts only',
      'field.forceLogin.console': 'console — Anthropic Console accounts only',
      'field.forceLogin.gateway': 'gateway — Claude apps gateway',
      'field.autoUpdates.default': '(Default: latest)',
      'field.autoUpdates.latest': 'latest — immediate release updates',
      'field.autoUpdates.stable': 'stable — one-week baked channel',

      'toggle.forceRemoteRefresh': 'Force remote settings refresh',
      'toggle.disableCmdPlugins': 'Disable command plugin sources',
      'toggle.disableSideload': 'Disable sideload flags',
      'toggle.disableArtifact': 'Disable Artifact publishing',
      'toggle.disableBundledSkills': 'Disable bundled skills',
      'toggle.disableSkillShell': 'Block ! inline shell',

      // Advanced JSON Toolbar
      'json.hint': 'Raw JSON draft — apply or discard explicit changes',
      'json.apply': 'Apply JSON',
      'json.discard': 'Discard Draft',
      'json.format': 'Format',
      'json.copy': 'Copy',
      'json.reset': 'Reset to Sample',

      // Diagnostics & Statuses
      'diag.title.one': 'Diagnostics ({count} item for {scope} scope):',
      'diag.title.other': 'Diagnostics ({count} items for {scope} scope):',
      'diag.severity.error': 'ERROR',
      'diag.severity.warning': 'WARNING',
      'diag.severity.info': 'INFO',

      'status.sampleLoaded': 'Sample loaded',
      'status.initEmpty': 'Initialized empty settings',
      'status.loadSampleErr': 'Could not load sample: {error}',
      'status.invalidSource': 'Invalid JSON source',
      'status.fileLoaded': 'Loaded {name}',
      'status.fileSavedDirect': 'Saved to {name}',
      'status.fileSaveErr': 'Could not save file: {error}',
      'status.permissionDenied': 'Disk write permission was denied',
      'status.openCancelled': 'Open cancelled',
      'status.saveCancelled': 'Save cancelled',
      'confirm.discardUnsaved': 'You have unsaved changes. Discard them and continue?',
      'status.invalidChange': 'Invalid change: {message}',
      'status.editFailed': 'Edit failed: {error}',
      'status.undo': 'Undo',
      'status.redo': 'Redo',
      'status.cannotApply': 'Cannot apply invalid JSON',
      'status.jsonApplied': 'JSON applied',
      'status.draftDiscarded': 'Draft discarded',
      'status.formatErr': 'Format error: {error}',
      'status.copied': 'Copied to clipboard',
      'status.copyFailed': 'Copy failed: {error}',
      'status.downloaded': 'Downloaded settings.json',
      'empty.none': 'None configured.'
    },

    'pt-BR': {
      // Document & App
      'app.title': 'Editor de Configurações do Claude',
      'app.description': 'Editor visual para settings.json do Claude Code — seguro, no navegador, sem perda de dados e com suporte completo à referência de configurações.',
      'app.brand': 'Claude',
      'app.brandSuffix': 'Editor de Configurações',
      'app.dirtyBadge': 'NÃO SALVO',
      'app.targetScope': 'Escopo Alvo:',
      'app.languageLabel': 'Idioma:',
      'app.ready': 'Pronto',
      'app.unsaved': 'Alterações não salvas',

      // Scopes
      'scope.user': 'Usuário (~/.claude/settings.json)',
      'scope.project': 'Projeto (.claude/settings.json)',
      'scope.local': 'Local (.claude/settings.local.json)',
      'scope.managed': 'Gerenciado (managed-settings.json)',
      'scope.info.user': 'Escopo do Usuário (~/.claude/settings.json)',
      'scope.info.project': 'Escopo do Projeto (.claude/settings.json)',
      'scope.info.local': 'Escopo Local (.claude/settings.local.json)',
      'scope.info.managed': 'Política Gerenciada (managed-settings.json)',

      // Header Actions
      'actions.undo': 'Desfazer',
      'actions.redo': 'Refazer',
      'actions.undoTitle': 'Desfazer alteração (Ctrl+Z)',
      'actions.redoTitle': 'Refazer alteração (Ctrl+Y)',
      'actions.openFile': 'Abrir Arquivo',
      'actions.openFileTitle': 'Abrir arquivo JSON local (Ctrl+O)',
      'actions.save': 'Salvar',
      'actions.saveTitle': 'Salvar alterações no arquivo (Ctrl+S)',
      'actions.saveAs': 'Salvar Como...',
      'actions.saveAsTitle': 'Salvar em novo arquivo (Ctrl+Shift+S)',
      'actions.loadJson': 'Carregar JSON',
      'actions.loadSample': 'Carregar Exemplo',
      'actions.download': 'Baixar settings.json',
      'actions.loadMobile': 'Abrir',
      'actions.saveMobile': 'Salvar',
      'actions.unset': 'redefinir',
      'actions.remove': 'Remover',
      'actions.moveUp': 'Mover para cima',
      'actions.moveDown': 'Mover para baixo',
      'actions.add': '+ Adicionar',

      // File Status & Indicator
      'file.activeSample': 'sample.json (exemplo)',
      'file.untitled': 'Documento não salvo',
      'file.directDisk': 'Acesso direto ao disco ativo',

      // Navigation Sections & Tabs
      'nav.sections.config': 'Configuração',
      'nav.sections.components': 'Componentes e Regras',
      'nav.sections.raw': 'Editor Bruto',
      'nav.tabs.general': 'Geral e Interface',
      'nav.tabs.permissions': 'Permissões',
      'nav.tabs.sandbox': 'Isolamento (Sandbox)',
      'nav.tabs.env': 'Ambiente',
      'nav.tabs.models': 'Modelos e Fluxos',
      'nav.tabs.hooks': 'Hooks e Linha de Status',
      'nav.tabs.mcp': 'Política MCP',
      'nav.tabs.worktree': 'Worktree e Memória',
      'nav.tabs.plugins': 'Plugins e Marketplaces',
      'nav.tabs.managedPolicies': 'Políticas Gerenciadas',
      'nav.tabs.advanced': 'JSON Avançado',

      // Section Titles & Descriptions
      'sections.general.title': 'Configurações Gerais e Interface',
      'sections.general.desc': 'Configure o tema de cores, modos do editor, notificações, acessibilidade e preferências de renderização do terminal.',
      'sections.general.toggles': 'Alternâncias de Acessibilidade e Interface',

      'sections.permissions.title': 'Permissões e Modos de Segurança',
      'sections.permissions.desc': 'Controle os modos iniciais de permissão, regras de permissão por ferramenta (permitir, perguntar, negar) e comportamento de confirmação. As regras avaliam na ordem: negar → perguntar → permitir.',
      'sections.permissions.flags': 'Sinalizadores de Permissão',
      'sections.permissions.ruleLists': 'Listas de Regras de Permissão',

      'sections.sandbox.title': 'Configuração de Isolamento (Sandbox)',
      'sections.sandbox.desc': 'Configure o isolamento de processos para comandos Bash no macOS, Linux e WSL2. Controla o acesso ao sistema de arquivos, saída de rede e proteção de credenciais.',
      'sections.sandbox.filesystem': 'Caminhos de Isolamento do Sistema de Arquivos',
      'sections.sandbox.network': 'Domínios de Isolamento de Rede',
      'sections.sandbox.excluded': 'Comandos Excluídos',

      'sections.env.title': 'API e Variáveis de Ambiente',
      'sections.env.desc': 'Configure credenciais de API, endpoints base personalizados e variáveis de ambiente repassadas para sessões e subprocessos do Claude Code.',
      'sections.env.apiConnection.title': 'Credenciais e Endpoint da API',
      'sections.env.additional.title': 'Variáveis de Ambiente Adicionais',
      'sections.env.additional.desc': 'Variáveis de ambiente gerais repassadas para subprocessos, ferramentas e scripts.',
      'sections.env.presets': 'Predefinições Rápidas:',
      'sections.env.helpers': 'Comando Auxiliar de Telemetria',

      'sections.models.title': 'Modelos e Fluxos de Trabalho Dinâmicos',
      'sections.models.desc': 'Configure a seleção do modelo principal, níveis de modelo via gateway (Fable, Opus, Sonnet, Haiku), cadeias de fallback e fluxos.',
      'sections.models.tiers.title': 'Níveis de Modelo e Capacidades do Gateway',
      'sections.models.tiers.desc': 'Configure o mapeamento de modelos, nomes de exibição, descrições e capacidades para cada nível de modelo (armazenado em env.ANTHROPIC_DEFAULT_*).',
      'sections.models.sessionSelection.title': 'Seleção Global e de Sessão de Modelos',
      'sections.models.toggles': 'Alternâncias de Modelo e Fluxo',
      'sections.models.fallbackChain': 'Cadeia de Modelos de Fallback',
      'sections.models.fallbackDesc': 'Lista ordenada de modelos de fallback (máximo de 3 modelos). Substitui toda a cadeia entre os arquivos de configuração.',

      'sections.hooks.title': 'Hooks de Ciclo de Vida e Linha de Status',
      'sections.hooks.desc': 'Configure hooks personalizados, scripts de linha de status, linhas de status de subagentes e emblemas anexados aos eventos de ciclo de vida do Claude Code.',
      'sections.hooks.configured': 'Hooks Configurados',
      'sections.hooks.statusLine': 'Configuração da Linha de Status',
      'sections.hooks.allowedUrls': 'URLs HTTP Permitidas para Hooks',

      'sections.mcp.title': 'Políticas do Protocolo de Contexto do Modelo (MCP)',
      'sections.mcp.desc': 'Gerencie políticas de aprovação e restrições empresariais para servidores MCP. (Definições de servidores ficam em .mcp.json ou ~/.claude.json).',
      'sections.mcp.enabledServers': 'Servidores .mcp.json Habilitados',
      'sections.mcp.disabledServers': 'Servidores .mcp.json Desabilitados',

      'sections.worktree.title': 'Git Worktrees, Memória e Sessões',
      'sections.worktree.desc': 'Configure a criação de git worktrees, isolamento de subagentes em segundo plano, armazenamento de auto-memória e retenção de sessão.',
      'sections.worktree.toggles': 'Alternâncias de Worktree e Sessão',
      'sections.worktree.symlinks': 'Diretórios de Links Simbólicos (Symlinks)',
      'sections.worktree.sparse': 'Caminhos Esparsos (Sparse Paths)',

      'sections.plugins.title': 'Plugins e Marketplaces',
      'sections.plugins.desc': 'Gerencie plugins instalados (enabledPlugins) e fontes de marketplaces personalizadas (extraKnownMarketplaces).',
      'sections.plugins.enabled': 'Plugins Habilitados',
      'sections.plugins.marketplaces': 'Marketplaces Conhecidos Adicionais',

      'sections.managed.title': 'Políticas Corporativas e Gerenciadas',
      'sections.managed.desc': 'Controles organizacionais tipicamente implantados via managed-settings.json, perfis MDM ou diretórios de políticas do sistema.',
      'sections.managed.toggles': 'Alternâncias de Políticas',

      // Badges
      'badge.managedOnly': 'Apenas Gerenciado',
      'badge.managed': 'Gerenciado',

      // General Fields
      'field.theme.label': 'Tema de Cores',
      'field.theme.hint': 'Suporta temas integrados ou identificadores personalizados como custom:meu-tema.',
      'field.theme.default': '(Padrão: escuro)',
      'field.theme.auto': 'auto — corresponde ao terminal',
      'field.theme.dark': 'dark — escuro',
      'field.theme.light': 'light — claro',
      'field.theme.darkDaltonized': 'dark-daltonized (Daltônicos)',
      'field.theme.lightDaltonized': 'light-daltonized (Daltônicos)',
      'field.theme.darkAnsi': 'dark-ansi',
      'field.theme.lightAnsi': 'light-ansi',

      'field.tui.label': 'Interface do Terminal',
      'field.tui.default': '(Padrão: tela cheia)',
      'field.tui.fullscreen': 'fullscreen — renderizador em tela cheia',
      'field.tui.defaultInline': 'default — fluxo em linha clássico',

      'field.editorMode.label': 'Atalhos de Teclado',
      'field.editorMode.default': '(Padrão: normal)',
      'field.editorMode.normal': 'normal',
      'field.editorMode.vim': 'vim',

      'field.effortLevel.label': 'Nível de Raciocínio',
      'field.effortLevel.default': '(Padrão: modelo padrão)',
      'field.effortLevel.low': 'low — baixo',
      'field.effortLevel.medium': 'medium — médio',
      'field.effortLevel.high': 'high — alto',
      'field.effortLevel.xhigh': 'xhigh — muito alto',

      'field.language.label': 'Idioma Preferido',
      'field.language.placeholder': 'ex.: english, portuguese, spanish',

      'field.notif.label': 'Notificações',
      'field.notif.default': '(Padrão: automático)',
      'field.notif.auto': 'auto — notificação de desktop em terminais suportados',
      'field.notif.bell': 'terminal_bell — sinal sonoro (bell)',
      'field.notif.iterm2': 'iterm2',
      'field.notif.iterm2Bell': 'iterm2_with_bell',
      'field.notif.kitty': 'kitty',
      'field.notif.ghostty': 'ghostty',
      'field.notif.disabled': 'notifications_disabled — desativado',

      'field.viewMode.label': 'Visualização da Transcrição',
      'field.viewMode.default': '(Padrão: padrão)',
      'field.viewMode.defaultVal': 'default — padrão',
      'field.viewMode.verbose': 'verbose — detalhado',
      'field.viewMode.focus': 'focus — foco',

      'field.defaultShell.label': '! Comandos de Shell',
      'field.defaultShell.default': '(Padrão: bash / powershell)',
      'field.defaultShell.bash': 'bash',
      'field.defaultShell.powershell': 'powershell',

      'field.feedbackSurveyRate.label': 'Taxa de Pesquisa',
      'field.feedbackSurveyRate.placeholder': '0.05',
      'field.skillBudget.label': 'Orçamento para Skills',
      'field.skillBudget.placeholder': '0.01',
      'field.skillMaxChars.label': 'Máx. Caracteres por Skill',
      'field.skillMaxChars.placeholder': '1536',

      // General Toggles
      'toggle.axScreenReader': 'Texto acessível para leitores de tela',
      'toggle.prefersReducedMotion': 'Reduzir animações e indicadores de carregamento',
      'toggle.promptSuggestionEnabled': 'Previsões de comandos em cinza',
      'toggle.showClearContextOnPlanAccept': 'Limpar contexto ao aceitar plano',
      'toggle.awaySummaryEnabled': 'Exibir resumo ao retornar de ausência',
      'toggle.emojiCompletionEnabled': 'Preenchimento de shortcodes :emoji:',
      'toggle.syntaxHighlightingDisabled': 'Desativar destaque de sintaxe de código',
      'toggle.autoScrollEnabled': 'Rolar automaticamente para o fim',
      'toggle.showTurnDuration': 'Exibir duração do turno de resposta',
      'toggle.terminalProgressBarEnabled': 'Barra de progresso no terminal',
      'toggle.spinnerTipsEnabled': 'Exibir dicas no indicador de espera',
      'toggle.wheelScrollAccelerationEnabled': 'Aceleração da roda do mouse',
      'toggle.fileCheckpointingEnabled': 'Instantâneos de arquivos para /rewind',
      'toggle.verbose': 'Exibir saída completa das ferramentas',

      // Permissions Fields & Options
      'field.permMode.default': '(Padrão: padrão / conforme plano)',
      'field.permMode.defaultVal': 'default — perguntar ações de ferramentas',
      'field.permMode.acceptEdits': 'acceptEdits — autoaprovar apenas edições de arquivos',
      'field.permMode.plan': 'plan — modo apenas planejamento, sem execução',
      'field.permMode.auto': 'auto — classificador autônomo (Apenas Usuário/Gerenciado)',
      'field.permMode.dontAsk': 'dontAsk — autoaprovar comandos e ferramentas',
      'field.permMode.bypass': 'bypassPermissions — ignorar verificações de permissão',
      'field.permMode.manual': 'manual — equivalente ao padrão',
      'field.permMode.hint': 'Nota: o modo auto só é considerado no escopo de Usuário ou Gerenciado.',

      'field.disableAutoMode.default': '(Habilitado / Não definido)',
      'field.disableAutoMode.disable': 'disable — desativar modo auto completamente',
      'field.disableBypass.default': '(Habilitado / Não definido)',
      'field.disableBypass.disable': 'disable — bloquear modo bypass de permissões',

      'toggle.skipDangerousModePrompt': 'Pular confirmação do modo de permissão perigoso',
      'toggle.useAutoModeDuringPlan': 'Usar modo auto durante a execução do plano',
      'toggle.classifyAllShell': 'Classificar todos os comandos de shell no modo auto',
      'toggle.allowManagedRulesOnly': 'Permitir apenas regras de permissão gerenciadas',

      // Rule Lists
      'rules.deny.title': 'Regras de Negação (Deny)',
      'rules.deny.desc': 'Avaliadas EM PRIMEIRO LUGAR. Correspondências bloqueiam a execução e ocultam arquivos sensíveis.',
      'rules.deny.button': '+ Adicionar Regra de Negação',
      'rules.deny.placeholder': 'ex.: Read(./.env), Bash(curl *), WebFetch',

      'rules.ask.title': 'Regras de Confirmação (Ask)',
      'rules.ask.desc': 'Avaliadas EM SEGUNDO LUGAR. Correspondências sempre solicitam confirmação interativa.',
      'rules.ask.button': '+ Adicionar Regra de Confirmação',
      'rules.ask.placeholder': 'ex.: Bash(git push *), Bash(npm publish)',

      'rules.allow.title': 'Regras de Permissão (Allow)',
      'rules.allow.desc': 'Avaliadas EM TERCEIRO LUGAR. Correspondências autoexecutam sem confirmação.',
      'rules.allow.button': '+ Adicionar Regra de Permissão',
      'rules.allow.placeholder': 'ex.: Bash(npm run *), Read(./src/**)',

      'rules.additionalDirs.title': 'Diretórios Adicionais',
      'rules.additionalDirs.desc': 'Diretórios de trabalho adicionais liberados para leitura e edição.',
      'rules.additionalDirs.button': '+ Adicionar Diretório',
      'rules.additionalDirs.placeholder': 'ex.: ../docs/, ~/libs-compartilhadas/',

      // Sandbox Toggles & Rules
      'toggle.sandbox.enabled': 'Habilitar isolamento (Sandbox) do Bash',
      'toggle.sandbox.failIfUnavailable': 'Encerrar se o isolamento estiver indisponível',
      'toggle.sandbox.autoAllowBash': 'Autoaprovar comandos sob isolamento',
      'toggle.sandbox.allowUnsandboxed': 'Permitir comando de escape sem isolamento',
      'toggle.sandbox.fsDisabled': 'Ignorar isolamento do sistema de arquivos',
      'toggle.sandbox.strictNet': 'Bloqueio estrito de rede',
      'toggle.sandbox.allowUnixSockets': 'Permitir todos os sockets Unix',
      'toggle.sandbox.allowLocalBinding': 'Permitir vínculo de portas em localhost',

      'rules.sb.allowWrite.title': 'Permitir Escrita',
      'rules.sb.allowWrite.button': '+ Adicionar Caminho',
      'rules.sb.allowWrite.placeholder': 'ex.: /tmp/build, ~/.kube',

      'rules.sb.denyWrite.title': 'Negar Escrita',
      'rules.sb.denyWrite.button': '+ Adicionar Caminho',
      'rules.sb.denyWrite.placeholder': 'ex.: /etc, /usr/local/bin',

      'rules.sb.denyRead.title': 'Negar Leitura',
      'rules.sb.denyRead.button': '+ Adicionar Caminho',
      'rules.sb.denyRead.placeholder': 'ex.: ~/.aws/credentials, ~/.ssh',

      'rules.sb.allowRead.title': 'Permitir Leitura',
      'rules.sb.allowRead.button': '+ Adicionar Caminho',
      'rules.sb.allowRead.placeholder': 'ex.: . (reautorizar espaço de trabalho)',

      'rules.sb.allowDomains.title': 'Domínios Permitidos',
      'rules.sb.allowDomains.button': '+ Adicionar Domínio',
      'rules.sb.allowDomains.placeholder': 'ex.: github.com, *.npmjs.org',

      'rules.sb.denyDomains.title': 'Domínios Negados',
      'rules.sb.denyDomains.button': '+ Adicionar Domínio',
      'rules.sb.denyDomains.placeholder': 'ex.: uploads.github.com, *.interno',

      'rules.sb.excludedCmds.title': 'Comandos Excluídos',
      'rules.sb.excludedCmds.button': '+ Adicionar Comando',
      'rules.sb.excludedCmds.placeholder': 'ex.: docker *, podman *',

      // Environment
      'env.preset.anthropic': '+ API Anthropic',
      'env.preset.telemetry': '+ OpenTelemetry',
      'env.preset.models': '+ Modelos Padrão',
      'env.preset.gateway': '+ Modelos Gateway',
      'env.addVar': '+ Adicionar Variável',
      'env.maskToggle': 'Ocultar Segredos',
      'env.keyPlaceholder': 'NOME_VARIAVEL (ex.: OTEL_EXPORTER_OTLP_ENDPOINT)',
      'env.valPlaceholder': 'Valor (ou vazio para remover)',
      'env.empty': 'Nenhuma variável de ambiente adicional configurada.',
      'env.notObject': 'env não é um objeto; edite no JSON Avançado.',
      'env.apiKey.label': 'Chave de API Anthropic',
      'env.apiKey.placeholder': 'sk-ant-...',
      'env.apiKey.hint': 'Chave de API principal para Anthropic ou serviço de gateway compatível.',
      'env.apiKey.show': 'Exibir',
      'env.apiKey.hide': 'Ocultar',
      'env.baseUrl.label': 'URL Base da API',
      'env.baseUrl.placeholder': 'https://api.anthropic.com',
      'env.baseUrl.hint': 'Endpoint de gateway de API personalizado ou proxy reverso (ex.: https://api.alanwo.com.br).',
      'env.authToken.label': 'Token de Autorização',
      'env.apiKeyHelper.label': 'Comando Auxiliar de Chave de API',
      'env.apiKeyHelperHint': 'Comando personalizado executado via shell para gerar cabeçalhos de autenticação dinâmicos.',
      'env.otelHeadersHelperHint': 'Script para gerar cabeçalhos dinâmicos do OpenTelemetry.',

      // Models & Workflows
      'models.discovery.fetchBtn': '⚡ Buscar Modelos da API',
      'models.discovery.fetching': 'Buscando modelos...',
      'models.discovery.status.defaults': 'Usando {count} sugestões de modelos padrão. Configure a URL base e a chave de API para buscar modelos ativos.',
      'models.discovery.status.success': '{count} modelos carregados do endpoint.',
      'models.discovery.status.error': 'Falha ao buscar modelos: {error}',
      'models.discovery.status.noCreds': 'Configure a URL Base e a Chave/Token de API para descobrir modelos.',
      'models.discovery.badge.defaults': '{count} padrões',
      'models.discovery.badge.loaded': '{count} modelos',
      'models.discovery.hint': 'Consulta o endpoint /v1/models compatível com OpenAI para preencher os seletores de modelo.',
      'models.tier.fable': 'Nível Fable',
      'models.tier.opus': 'Nível Opus',
      'models.tier.sonnet': 'Nível Sonnet',
      'models.tier.haiku': 'Nível Haiku',
      'models.tier.custom': 'Opção de Modelo Personalizada',
      'models.tier.subagent': 'Opções de Subagente e Gateway',
      'models.field.modelId': 'ID / Mapeamento do Modelo',
      'models.field.name': 'Nome de Exibição',
      'models.field.desc': 'Descrição',
      'models.field.capabilities': 'Capacidades',
      'models.field.subagent': 'Substituição de Modelo de Subagente',
      'models.field.discovery': 'Descoberta de Modelos do Gateway (1/0)',
      'models.field.advisorTool': 'Habilitar Ferramenta de Consultor Experimental (1/0)',
      'field.model.label': 'Modelo Principal',
      'field.model.hint': 'Reinicialização necessária quando modificado. Troca durante a sessão via /model.',
      'field.model.placeholder': 'ex.: claude-sonnet-5, opus',
      'field.advisorModel.label': 'Modelo do Assistente',
      'field.advisorModel.placeholder': 'fable, opus, sonnet ou ID de modelo',
      'field.autoCompactThreshold.label': 'Proporção de Limite de Auto-compactação',
      'field.workflowSize.default': '(Padrão: médio)',
      'field.workflowSize.unrestricted': 'unrestricted — irrestrito',
      'field.workflowSize.small': 'small — pequeno',
      'field.workflowSize.medium': 'medium — médio',
      'field.workflowSize.large': 'large — grande',

      'toggle.alwaysThinking': 'Raciocínio estendido por padrão',
      'toggle.showThinkingSummaries': 'Exibir resumos de raciocínio',
      'toggle.fastMode': 'Habilitar Modo Rápido (Opus)',
      'toggle.fastModePerSession': 'Exigir /fast por sessão',
      'toggle.switchModelsOnFlag': 'Trocar automaticamente para fallback em alerta de segurança',
      'toggle.autoCompact': 'Compactar conversa automaticamente',
      'toggle.workflowKeywordTrigger': 'Gatilho de comando por palavra-chave "ultracode"',
      'toggle.disableWorkflows': 'Desativar fluxos de trabalho dinâmicos',
      'toggle.skipWorkflowUsageWarning': 'Omitir aviso de fluxos dinâmicos',
      'toggle.skipDangerousModeTop': 'Omitir aviso de modo perigoso (nível superior)',
      'toggle.skipAutoPermissionPrompt': 'Omitir confirmação de modo automático',
      'toggle.hasCompletedOnboarding': 'Tutorial inicial concluído',

      'fallback.add': '+ Adicionar Modelo de Fallback',
      'fallback.placeholder': 'ID do modelo (ex.: claude-sonnet-5, haiku, default)',
      'fallback.notArray': 'fallbackModel não é uma lista; edite no JSON Avançado.',

      // Hooks & Status Line
      'toggle.disableAllHooks': 'Desativar todos os hooks e linha de status',
      'toggle.allowManagedHooksOnly': 'Permitir apenas hooks gerenciados',
      'hooks.addEvent': '+ Adicionar Grupo de Eventos',
      'hooks.addUrl': '+ Adicionar Padrão de URL',
      'hooks.empty': 'Nenhum hook configurado.',
      'hooks.notObject': 'hooks não é um objeto; edite no JSON Avançado.',
      'hooks.group': 'Grupo {number}',
      'hooks.groupWithMatcher': 'Grupo {number} (correspondência: {matcher})',
      'hooks.addHandler': '+ Adicionar manipulador',
      'hooks.deleteEvent': 'Excluir evento',
      'hooks.typeCommand': 'command',
      'hooks.typeHttp': 'http',
      'hooks.typePrompt': 'prompt',
      'hooks.typeAgent': 'agent',
      'hooks.urlPlaceholder': 'URL (https://...)',
      'hooks.cmdPlaceholder': 'Comando / texto de prompt',
      'hooks.urlPatternPlaceholder': 'ex.: https://hooks.exemplo.com/*',

      'statusLine.typeDefault': '(Não especificado)',
      'statusLine.cmdPlaceholder': '~/.claude/statusline.sh',
      'statusLine.refreshPlaceholder': '5 (segundos)',
      'toggle.hideVimModeIndicator': 'Ocultar indicador de modo vim',

      // MCP Policy
      'toggle.disableConnectors': 'Desativar conectores do claude.ai',
      'toggle.enableAllProjectMcp': 'Autoaprovar todos os .mcp.json do projeto',
      'toggle.allowManagedMcpOnly': 'Permitir apenas servidores MCP gerenciados',
      'mcp.approve': '+ Aprovar Servidor',
      'mcp.reject': '+ Rejeitar Servidor',
      'mcp.enabledPlaceholder': 'Nome do servidor (ex.: memory, github)',
      'mcp.disabledPlaceholder': 'Nome do servidor (ex.: filesystem)',

      // Worktree & Memory
      'field.wtBaseRef.default': '(Padrão: fresh)',
      'field.wtBaseRef.fresh': 'fresh — criar branch a partir de origin/padrão',
      'field.wtBaseRef.head': 'head — criar branch a partir do HEAD local atual',
      'field.wtBgIso.default': '(Padrão: worktree)',
      'field.wtBgIso.worktree': 'worktree — isolar edições em worktree dedicada',
      'field.wtBgIso.none': 'none — permitir que tarefas de fundo editem diretamente',
      'field.teammateMode.default': '(Padrão: in-process)',
      'field.teammateMode.inProcess': 'in-process — mesmo processo',
      'field.teammateMode.auto': 'auto — automático (divide painéis se tmux/it2)',
      'field.teammateMode.tmux': 'tmux',
      'field.teammateMode.iterm2': 'iterm2',

      'toggle.autoMemory': 'Habilitar auto-memória',
      'toggle.gitInstructions': 'Instruções integradas de prompt do git',
      'toggle.isolatePeerMachines': 'Aprovação de mensagens entre máquinas',
      'toggle.disableAgentView': 'Desativar visualização de agentes em segundo plano',

      'wt.symlinks.add': '+ Adicionar Diretório Symlink',
      'wt.symlinks.placeholder': 'ex.: node_modules, .cache',
      'wt.sparse.add': '+ Adicionar Caminho Esparso',
      'wt.sparse.placeholder': 'ex.: packages/meu-app, shared/utils',

      // Plugins & Marketplaces
      'plugin.add': '+ Adicionar Plugin',
      'plugin.placeholder': 'nome-do-plugin@marketplace',
      'plugin.empty': 'Nenhum plugin registrado nas configurações.',
      'plugin.notObject': 'enabledPlugins não é um objeto; edite no JSON Avançado.',
      'mkt.add': '+ Adicionar Marketplace',
      'mkt.namePlaceholder': 'Nome do Marketplace (ex.: ferramentas-equipe)',
      'mkt.srcPlaceholder': 'Localização da fonte / repositório',
      'mkt.empty': 'Nenhum marketplace adicional configurado.',
      'mkt.typeGithub': 'github (repositório)',
      'mkt.typeGit': 'git (URL de clone)',
      'mkt.typeUrl': 'url (zip/tar HTTP)',
      'mkt.typeDir': 'directory (caminho local)',

      // Managed Policies
      'field.forceLogin.default': '(Não imposto)',
      'field.forceLogin.claudeai': 'claudeai — apenas contas claude.ai',
      'field.forceLogin.console': 'console — apenas contas Anthropic Console',
      'field.forceLogin.gateway': 'gateway — gateway de aplicativos Claude',
      'field.autoUpdates.default': '(Padrão: mais recente)',
      'field.autoUpdates.latest': 'latest — atualizações imediatas de lançamento',
      'field.autoUpdates.stable': 'stable — canal com uma semana de estabilização',

      'toggle.forceRemoteRefresh': 'Forçar atualização remota de configurações',
      'toggle.disableCmdPlugins': 'Desativar fontes de plugins por comando',
      'toggle.disableSideload': 'Desativar flags de carregamento lateral (sideload)',
      'toggle.disableArtifact': 'Desativar publicação de Artifacts',
      'toggle.disableBundledSkills': 'Desativar skills integradas',
      'toggle.disableSkillShell': 'Bloquear execução de shell em linha !',

      // Advanced JSON Toolbar
      'json.hint': 'Rascunho de JSON bruto — aplique ou descarte alterações explícitas',
      'json.apply': 'Aplicar JSON',
      'json.discard': 'Descartar Rascunho',
      'json.format': 'Formatar',
      'json.copy': 'Copiar',
      'json.reset': 'Restaurar Exemplo',

      // Diagnostics & Statuses
      'diag.title.one': 'Diagnósticos ({count} item para o escopo {scope}):',
      'diag.title.other': 'Diagnósticos ({count} itens para o escopo {scope}):',
      'diag.severity.error': 'ERRO',
      'diag.severity.warning': 'AVISO',
      'diag.severity.info': 'INFO',

      'status.sampleLoaded': 'Exemplo carregado',
      'status.initEmpty': 'Configurações vazias inicializadas',
      'status.loadSampleErr': 'Não foi possível carregar o exemplo: {error}',
      'status.invalidSource': 'Fonte JSON inválida',
      'status.fileLoaded': '{name} carregado',
      'status.fileSavedDirect': 'Salvo em {name}',
      'status.fileSaveErr': 'Não foi possível salvar o arquivo: {error}',
      'status.permissionDenied': 'Permissão de gravação em disco negada',
      'status.openCancelled': 'Abertura cancelada',
      'status.saveCancelled': 'Salvamento cancelado',
      'confirm.discardUnsaved': 'Há alterações não salvas. Deseja descartá-las e continuar?',
      'status.invalidChange': 'Alteração inválida: {message}',
      'status.editFailed': 'Falha na edição: {error}',
      'status.undo': 'Desfeito',
      'status.redo': 'Refeito',
      'status.cannotApply': 'Não é possível aplicar JSON inválido',
      'status.jsonApplied': 'JSON aplicado',
      'status.draftDiscarded': 'Rascunho descartado',
      'status.formatErr': 'Erro de formatação: {error}',
      'status.copied': 'Copiado para a área de transferência',
      'status.copyFailed': 'Falha ao copiar: {error}',
      'status.downloaded': 'settings.json baixado',
      'empty.none': 'Nenhum configurado.'
    }
  };

  let currentLocale = 'en';
  const listeners = new Set();

  function normalizeLocale(val) {
    const s = String(val || '').trim().toLowerCase();
    if (s.startsWith('pt') || s === 'portuguese' || s === 'português' || s === 'portugues') {
      return 'pt-BR';
    }
    return 'en';
  }

  function detectLocale() {
    // 1. Storage preference
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return normalizeLocale(stored);
      }
    } catch (_) {}

    // 2. Browser navigator.languages / navigator.language
    if (typeof navigator !== 'undefined') {
      const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
      for (const lang of langs) {
        if (lang && String(lang).toLowerCase().startsWith('pt')) {
          return 'pt-BR';
        }
      }
    }

    return 'en';
  }

  function getLocale() {
    return currentLocale;
  }

  function setLocale(locale, persist) {
    currentLocale = normalizeLocale(locale);
    if (persist !== false) {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, currentLocale);
        }
      } catch (_) {}
    }

    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = currentLocale;
    }

    listeners.forEach(fn => {
      try { fn(currentLocale); } catch (e) { console.error('i18n listener error', e); }
    });

    if (typeof document !== 'undefined') {
      applyTranslations(document);
    }
  }

  function t(key, params, overrideLocale) {
    const loc = overrideLocale ? normalizeLocale(overrideLocale) : currentLocale;
    const dict = DICTIONARIES[loc] || DICTIONARIES.en;
    let template = dict[key];

    if (template === undefined) {
      template = DICTIONARIES.en[key];
    }

    if (template === undefined) {
      return key;
    }

    if (!params || typeof params !== 'object') {
      return template;
    }

    return template.replace(/\{(\w+)\}/g, (match, paramName) => {
      return paramName in params ? String(params[paramName]) : match;
    });
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function applyTranslations(root) {
    if (!root) return;

    // Elements with text translation
    const textEls = root.querySelectorAll ? root.querySelectorAll('[data-i18n]') : [];
    textEls.forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = t(key);
      }
    });

    // Placeholders
    const placeholderEls = root.querySelectorAll ? root.querySelectorAll('[data-i18n-placeholder]') : [];
    placeholderEls.forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.placeholder = t(key);
      }
    });

    // Titles
    const titleEls = root.querySelectorAll ? root.querySelectorAll('[data-i18n-title]') : [];
    titleEls.forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        el.title = t(key);
      }
    });

    // Aria-labels
    const ariaEls = root.querySelectorAll ? root.querySelectorAll('[data-i18n-aria-label]') : [];
    ariaEls.forEach(el => {
      const key = el.getAttribute('data-i18n-aria-label');
      if (key) {
        el.setAttribute('aria-label', t(key));
      }
    });
  }

  return {
    DICTIONARIES,
    applyTranslations,
    detectLocale,
    getLocale,
    normalizeLocale,
    setLocale,
    subscribe,
    t
  };
});
