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
      'scope.short.user': 'User',
      'scope.short.project': 'Project',
      'scope.short.local': 'Local',
      'scope.short.managed': 'Managed',
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
      'actions.more': 'More actions',
      'actions.moreTitle': 'Open file and editor actions',
      'actions.unset': 'unset',
      'actions.remove': 'Remove',
      'actions.moveUp': 'Move up',
      'actions.moveDown': 'Move down',
      'actions.add': '+ Add',
      'actions.help': 'Help info',

      // File Status & Indicator
      'file.activeSample': 'sample.json (sample)',
      'file.untitled': 'Untitled document',
      'file.directDisk': 'Direct disk access active',
      'file.currentTitle': 'Current settings file',
      'app.languageSelectAria': 'Select interface language',

      // Navigation Sections & Tabs
      'nav.ariaLabel': 'Settings categories',
      'nav.scrollPrevious': 'Show previous categories',
      'nav.scrollNext': 'Show more categories',
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
      'nav.tabsShort.general': 'General',
      'nav.tabsShort.permissions': 'Permissions',
      'nav.tabsShort.sandbox': 'Sandbox',
      'nav.tabsShort.env': 'Env',
      'nav.tabsShort.models': 'Models',
      'nav.tabsShort.hooks': 'Hooks',
      'nav.tabsShort.mcp': 'MCP',
      'nav.tabsShort.worktree': 'Worktree',
      'nav.tabsShort.plugins': 'Plugins',
      'nav.tabsShort.managedPolicies': 'Managed',
      'nav.tabsShort.advanced': 'JSON',

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
      'sections.models.desc': 'Configure primary model selection, gateway model tiers (Fable, Opus, Sonnet, Haiku), fallback chains, and workflow boundaries.',
      'sections.models.tiers.title': 'Model Tiers & Gateway Capabilities',
      'sections.models.tiers.desc': 'Configure model mapping, display names, descriptions, and capabilities for each model tier (stored in env.ANTHROPIC_DEFAULT_*).',
      'sections.models.sessionSelection.title': 'Global & Session Model Selection',
      'sections.models.toggles': 'Model & Workflow Toggles',
      'sections.models.fallbackChain': 'Fallback Model Chain',
      'sections.models.fallbackDesc': 'Ordered list of fallback models (max 3 models). Overwrites entire array across configuration layers.',

      'sections.hooks.title': 'Lifecycle Hooks & Status Line',
      'sections.hooks.desc': 'Configure custom lifecycle hooks, statusline script commands, subagent status lines, and badges attached to Claude Code runtime events.',
      'sections.hooks.configured': 'Configured Hooks',
      'sections.hooks.statusLine': 'Status Line Configuration',
      'sections.hooks.allowedUrls': 'Allowed HTTP Hook URLs',

      'sections.mcp.title': 'Model Context Protocol (MCP) Policies',
      'sections.mcp.desc': 'Manage approval policies and enterprise restrictions for Model Context Protocol servers. (Server definitions live in .mcp.json or ~/.claude.json).',
      'sections.mcp.enabledServers': 'Approved .mcp.json Servers',
      'sections.mcp.disabledServers': 'Rejected .mcp.json Servers',

      'sections.worktree.title': 'Git Worktrees, Memory & Sessions',
      'sections.worktree.desc': 'Configure git worktree creation, background subagent isolation, auto-memory storage, and session retention periods.',
      'sections.worktree.toggles': 'Worktree & Session Toggles',
      'sections.worktree.symlinks': 'Symlink Directories',
      'sections.worktree.sparse': 'Sparse Paths',

      'sections.plugins.title': 'Plugins & Marketplaces',
      'sections.plugins.desc': 'Manage installed plugins (enabledPlugins) and custom marketplace sources (extraKnownMarketplaces).',
      'sections.plugins.enabled': 'Enabled Plugins',
      'sections.plugins.marketplaces': 'Extra Known Marketplaces',

      'sections.managed.title': 'Corporate & Managed Policies',
      'sections.managed.desc': 'Organizational controls typically deployed via managed-settings.json, MDM profiles, or system policy directories.',
      'sections.managed.toggles': 'Policy Toggles',

      // Badges
      'badge.managedOnly': 'Managed Only',
      'badge.managed': 'Managed',

      // Dynamic Feature Labels (Schema-Driven compact labels)
      'setting.schema.label': 'JSON Schema Reference',
      'setting.theme.label': 'Color Theme',
      'setting.tui.label': 'Terminal UI Mode',
      'setting.editorMode.label': 'Input Keybindings',
      'setting.effortLevel.label': 'Reasoning Effort',
      'setting.language.label': 'Preferred Language',
      'setting.preferredNotifChannel.label': 'Notification Channel',
      'setting.viewMode.label': 'Transcript View Mode',
      'setting.autoScrollEnabled.label': 'Auto-scroll Output',
      'setting.showTurnDuration.label': 'Show Turn Duration',
      'setting.terminalProgressBarEnabled.label': 'Terminal Progress Bar',
      'setting.syntaxHighlightingDisabled.label': 'Disable Syntax Highlighting',
      'setting.axScreenReader.label': 'Screen Reader Accessible Mode',
      'setting.prefersReducedMotion.label': 'Reduced Motion',
      'setting.promptSuggestionEnabled.label': 'Prompt Suggestions',
      'setting.showClearContextOnPlanAccept.label': 'Clear Context on Plan Accept',
      'setting.awaySummaryEnabled.label': 'Away Summary',
      'setting.feedbackSurveyRate.label': 'Feedback Survey Rate',
      'setting.skillListingBudgetFraction.label': 'Skill Budget Fraction',
      'setting.skillListingMaxDescChars.label': 'Skill Max Description Length',
      'setting.vimInsertModeRemaps.label': 'Vim INSERT Mode Remaps',
      'setting.spinnerVerbs.label': 'Custom Spinner Verbs',
      'setting.spinnerTipsOverride.label': 'Spinner Tips Override',
      'setting.emojiCompletionEnabled.label': 'Emoji Shortcode Completion',
      'setting.spinnerTipsEnabled.label': 'Spinner Tips',
      'setting.wheelScrollAccelerationEnabled.label': 'Wheel Scroll Acceleration',
      'setting.fileCheckpointingEnabled.label': 'File Checkpointing (/rewind)',
      'setting.verbose.label': 'Verbose Output',
      'setting.diffTool.label': 'Diff Tool',
      'setting.plansDirectory.label': 'Plans Directory',
      'setting.respectGitignore.label': 'Respect .gitignore',
      'setting.autoUpdatesChannel.label': 'Auto-updates Release Channel',
      'setting.cleanupPeriodDays.label': 'Cleanup Retention Period (Days)',
      'setting.attribution.label': 'Git Attribution',
      'setting.includeGitInstructions.label': 'Include Git Instructions',
      'setting.includeCoAuthoredBy.label': 'Include Co-Authored-By (Deprecated)',
      'setting.hasCompletedOnboarding.label': 'Completed Onboarding',

      'setting.permissions_defaultMode.label': 'Starting Permission Mode',
      'setting.permissions_allow.label': 'Allow Rules',
      'setting.permissions_ask.label': 'Ask Rules',
      'setting.permissions_deny.label': 'Deny Rules',
      'setting.permissions_additionalDirectories.label': 'Additional Directories',
      'setting.permissions_disableBypassPermissionsMode.label': 'Disable Bypass Mode (Permissions)',
      'setting.permissions_allowManagedPermissionRulesOnly.label': 'Allow Managed Rules Only (Permissions)',
      'setting.allowManagedPermissionRulesOnly.label': 'Allow Managed Rules Only',
      'setting.disableBypassPermissionsMode.label': 'Disable Bypass Mode',
      'setting.skipDangerousModePermissionPrompt.label': 'Skip Dangerous Mode Prompt',
      'setting.skipWorkflowUsageWarning.label': 'Skip Workflow Usage Warning',
      'setting.skipAutoPermissionPrompt.label': 'Skip Auto Permission Prompt',
      'setting.autoMode_classifyAllShell.label': 'Classify All Shell Commands',
      'setting.autoModePromptSampling.label': 'Auto Mode Prompt Sampling',
      'setting.askUserQuestionTimeout.label': 'Ask User Question Timeout',
      'setting.dialogExpiry.label': 'Dialog Expiry Timeout',
      'setting.defaultShell.label': 'Default Shell',
      'setting.apiKeyHelper.label': 'API Key Helper Script',
      'setting.awsCredentialExport.label': 'AWS Credential Export Script',
      'setting.awsAuthRefresh.label': 'AWS Auth Refresh Script',

      'setting.sandbox_enabled.label': 'Enable Bash Sandboxing',
      'setting.sandbox_failIfUnavailable.label': 'Fail if Sandbox Unavailable',
      'setting.sandbox_autoAllowBashIfSandboxed.label': 'Auto-Allow Bash When Sandboxed',
      'setting.sandbox_allowUnsandboxedCommands.label': 'Allow Unsandboxed Commands',
      'setting.sandbox_excludedCommands.label': 'Sandbox Excluded Commands',
      'setting.sandbox_filesystem_allowWrite.label': 'Sandbox Allow Write Paths',
      'setting.sandbox_filesystem_denyWrite.label': 'Sandbox Deny Write Paths',
      'setting.sandbox_filesystem_denyRead.label': 'Sandbox Deny Read Paths',
      'setting.sandbox_filesystem_allowRead.label': 'Sandbox Allow Read Paths',
      'setting.sandbox_filesystem_disabled.label': 'Disable Filesystem Isolation',
      'setting.sandbox_filesystem_allowManagedReadPathsOnly.label': 'Managed Read Paths Only',
      'setting.sandbox_network_allowedDomains.label': 'Sandbox Allowed Network Domains',
      'setting.sandbox_network_deniedDomains.label': 'Sandbox Denied Network Domains',
      'setting.sandbox_network_strictAllowlist.label': 'Strict Network Allowlist',
      'setting.sandbox_network_allowAllUnixSockets.label': 'Allow All Unix Sockets',
      'setting.sandbox_network_allowLocalBinding.label': 'Allow Localhost Binding',

      'setting.env.label': 'Environment Variables Map',

      'setting.model.label': 'Primary Model',
      'setting.advisorModel.label': 'Advisor Model',
      'setting.fallbackModel.label': 'Fallback Model Chain',
      'setting.availableModels.label': 'Available Models Allowlist',
      'setting.enforceAvailableModels.label': 'Enforce Available Models for Default',
      'setting.modelOverrides.label': 'Model Overrides',
      'setting.alwaysThinkingEnabled.label': 'Always Extended Thinking',
      'setting.showThinkingSummaries.label': 'Show Thinking Summaries',
      'setting.fastMode.label': 'Fast Mode Enabled',
      'setting.fastModePerSessionOptIn.label': 'Fast Mode Per-Session Opt-In',
      'setting.autoCompactEnabled.label': 'Auto-compact Context Window',
      'setting.autoCompactThreshold.label': 'Auto-compact Threshold Ratio',
      'setting.workflowSizeGuideline.label': 'Workflow Size Guideline',
      'setting.teammateMode.label': 'Teammate Spawning Mode',
      'setting.crossSessionInbound.label': 'Cross-Session Inbound Message Policy',

      'setting.hooks.label': 'Lifecycle Hooks Configuration',
      'setting.statusLine.label': 'Custom Status Line Configuration',
      'setting.fileSuggestion.label': 'File Suggestion Script (@ File Picker)',
      'setting.disableAllHooks.label': 'Disable All Hooks and Statusline',
      'setting.allowManagedHooksOnly.label': 'Allow Managed Hooks Only',
      'setting.allowedHttpHookUrls.label': 'Allowed HTTP Hook URLs',
      'setting.httpHookAllowedEnvVars.label': 'Allowed HTTP Hook Environment Variables',

      'setting.enableMcpServers.label': 'Enable MCP Servers Toggle',
      'setting.enabledMcpjsonServers.label': 'Approved .mcp.json Servers',
      'setting.disabledMcpjsonServers.label': 'Rejected .mcp.json Servers',
      'setting.allowedMcpServers.label': 'Enterprise Allowed MCP Servers',
      'setting.deniedMcpServers.label': 'Enterprise Denied MCP Servers',

      'setting.worktree_baseRef.label': 'Worktree Base Ref',
      'setting.worktree_bgIsolation.label': 'Subagent Background Isolation',
      'setting.worktree_symlinkDirectories.label': 'Worktree Symlink Directories',
      'setting.worktree_sparsePaths.label': 'Worktree Sparse Paths',
      'setting.autoMemoryEnabled.label': 'Automatic Memory Saves',
      'setting.claudeMdExcludes.label': 'CLAUDE.md Exclude Patterns',
      'setting.disableRemoteControl.label': 'Disable Remote Control',

      'setting.channelsEnabled.label': 'Channels Enabled',
      'setting.enabledPlugins.label': 'Enabled Plugins Map',
      'setting.pluginConfigs.label': 'Plugin Configurations',
      'setting.extraKnownMarketplaces.label': 'Marketplace Sources Map',
      'setting.strictKnownMarketplaces.label': 'Strict Known Marketplaces Allowlist',
      'setting.blockedMarketplaces.label': 'Blocked Marketplaces Blocklist',
      'setting.allowedChannelPlugins.label': 'Allowed Channel Plugins',
      'setting.skippedMarketplaces.label': 'Skipped Marketplaces',
      'setting.skippedPlugins.label': 'Skipped Plugins',
      'setting.strictPluginOnlyCustomization.label': 'Strict Plugin-Only Customization',
      'setting.disableCommandPluginSources.label': 'Disable Command Plugin Sources',
      'setting.disableSideloadFlags.label': 'Disable Plugin/MCP Sideload CLI Flags',

      'setting.forceLoginMethod.label': 'Force Login Method',
      'setting.forceLoginOrgUUID.label': 'Force Login Organization UUID(s)',
      'setting.forceLoginGatewayUrl.label': 'Force Login Gateway URL',
      'setting.parentSettingsBehavior.label': 'Parent Settings Behavior',
      'setting.requiredMinimumVersion.label': 'Required Minimum Claude Code Version',
      'setting.forceRemoteSettingsRefresh.label': 'Force Remote Settings Refresh',
      'setting.companyAnnouncements.label': 'Company Announcements',
      'setting.companyPolicyUrl.label': 'Company Policy URL',
      'setting.companyPolicyName.label': 'Company Policy Display Name',
      'setting.companyPolicyHeader.label': 'Company Policy Header Text',
      'setting.companyPolicyFooter.label': 'Company Policy Footer Text',
      'setting.footerLinksRegexes.label': 'Footer Links Regexes',
      'setting.voice.label': 'Voice Settings',
      'setting.ssh.label': 'SSH Connection Settings',
      'setting.otel.label': 'OpenTelemetry Configuration',
      'setting.policy.label': 'Policy Configuration',

      // General Fields & Values
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

      'field.feedbackSurveyRate.label': 'Feedback Survey Rate',
      'field.feedbackSurveyRate.placeholder': '0.05',
      'field.skillBudget.label': 'Skill Budget Fraction',
      'field.skillBudget.placeholder': '0.01',
      'field.skillMaxChars.label': 'Skill Max Description Length',
      'field.skillMaxChars.placeholder': '1536',

      // General Toggles
      'toggle.axScreenReader': 'Flat screen reader accessible text',
      'toggle.prefersReducedMotion': 'Reduce spinners and UI motion',
      'toggle.promptSuggestionEnabled': 'Grayed-out prediction suggestions',
      'toggle.showClearContextOnPlanAccept': 'Clear context on plan accept prompt',
      'toggle.awaySummaryEnabled': 'Show summary after returning from idle',
      'toggle.emojiCompletionEnabled': 'Suggest and replace :emoji: shortcodes',
      'toggle.syntaxHighlightingDisabled': 'Disable code syntax highlighting',
      'toggle.autoScrollEnabled': 'Auto-scroll conversation to bottom',
      'toggle.showTurnDuration': 'Show elapsed duration after responses',
      'toggle.terminalProgressBarEnabled': 'Terminal emulator progress bar',
      'toggle.spinnerTipsEnabled': 'Display helpful tips in spinner',
      'toggle.wheelScrollAccelerationEnabled': 'Accelerate fast mouse wheel scrolling',
      'toggle.fileCheckpointingEnabled': 'Snapshot files for /rewind restore',
      'toggle.verbose': 'Show full verbose tool outputs',

      // Permissions Fields & Options
      'field.permMode.default': '(Default: default / as planned)',
      'field.permMode.defaultVal': 'default — ask tool approvals',
      'field.permMode.acceptEdits': 'acceptEdits — auto-approve edits only',
      'field.permMode.plan': 'plan — read-only planning mode',
      'field.permMode.auto': 'auto — autonomous classifier (User/Managed Only)',
      'field.permMode.dontAsk': 'dontAsk — auto-approve commands & tools',
      'field.permMode.bypass': 'bypassPermissions — ignore permission checks',
      'field.permMode.manual': 'manual — standard prompt mode',
      'field.permMode.hint': 'Note: auto mode is only respected in User or Managed scope.',

      'field.disableAutoMode.default': '(Enabled / Not set)',
      'field.disableAutoMode.disable': 'disable — disable auto mode entirely',
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
      'models.field.advisorTool': 'Disable Advisor Tool (1/0)',
      'field.model.label': 'Primary Model',
      'field.model.hint': 'Restart required when modified. Mid-session switch via /model.',
      'field.model.placeholder': 'e.g. claude-sonnet-5, opus',
      'field.advisorModel.label': 'Advisor Model',
      'field.advisorModel.placeholder': 'fable, opus, sonnet, or model ID',
      'field.autoCompactThreshold.label': 'Auto-compact Threshold Ratio',
      'field.autoCompactThreshold.placeholder': '0.85 (0.5 to 0.99)',
      'field.workflowSize.label': 'Workflow Size Guideline',
      'field.workflowSize.default': '(Default: unrestricted)',
      'field.workflowSize.unrestricted': 'unrestricted — no workflow size enforcement',
      'field.workflowSize.small': 'small — ~100–300 lines guideline',
      'field.workflowSize.medium': 'medium — ~300–1000 lines guideline',
      'field.workflowSize.large': 'large — ~1000+ lines guideline',
      'field.crossSessionInbound.label': 'Inbound Messages',
      'field.crossSessionInbound.default': '(Default: accept)',
      'field.crossSessionInbound.accept': 'accept — accept cross-session messages automatically',
      'field.crossSessionInbound.hold': 'hold — hold messages until confirmed',
      'field.crossSessionInbound.refuse': 'refuse — reject cross-session messages',
      'field.askUserTimeout.label': 'Ask User Question Timeout',
      'field.askUserTimeout.default': '(Default: never)',
      'field.askUserTimeout.never': 'never — wait indefinitely for user answer',
      'field.askUserTimeout.60s': '60s — 1 minute timeout',
      'field.askUserTimeout.5m': '5m — 5 minutes timeout',
      'field.askUserTimeout.10m': '10m — 10 minutes timeout',
      'field.dialogExpiry.label': 'Dialog Expiry Timeout',
      'field.dialogExpiry.default': '(Default: never)',
      'field.dialogExpiry.never': 'never — permission dialogs do not auto-expire',
      'field.dialogExpiry.60s': '60s — auto-expire dialog after 1 minute',
      'field.dialogExpiry.5m': '5m — auto-expire dialog after 5 minutes',
      'field.dialogExpiry.10m': '10m — auto-expire dialog after 10 minutes',

      'toggle.alwaysThinking': 'Always enable extended thinking',
      'toggle.thinkingSummaries': 'Show thinking summaries in conversation',
      'toggle.fastMode': 'Enable fast mode (Opus Fast Mode)',
      'toggle.fastModeOptIn': 'Per-session opt-in required for fast mode',
      'toggle.autoCompact': 'Auto-compact context window when full',

      'models.fallback.add': '+ Add Fallback Model',
      'models.fallback.placeholder': 'Model ID (e.g. claude-3-5-haiku-20241022)',
      'models.fallback.empty': 'No fallback models configured.',

      // Hooks & Status Line
      'hooks.addEvent': '+ Add Event Hook Group',
      'hooks.empty': 'No hooks configured.',
      'hooks.notObject': 'hooks is not an object; edit in Advanced JSON.',
      'hooks.groupDesc': 'Matcher: {matcher} ({count} command handlers)',
      'hooks.addHandler': '+ Add Handler',
      'hooks.commandPlaceholder': 'Shell command to execute',
      'hooks.statusLine.typeLabel': 'Statusline Type',
      'hooks.statusLine.cmdLabel': 'Statusline Command',
      'hooks.statusLine.cmdPlaceholder': 'Script path (e.g. ~/.claude/statusline.sh)',
      'hooks.statusLine.hint': 'Executed on environment state updates to render custom terminal status lines.',
      'hooks.statusLine.refresh': 'Refresh Interval (Seconds)',
      'hooks.statusLine.padding': 'Horizontal Padding Characters',
      'hooks.urls.add': '+ Add Allowed URL Pattern',
      'hooks.urls.placeholder': 'e.g. https://hooks.example.com/*',
      'hooks.urls.empty': 'No HTTP hook URL restrictions (all URLs allowed).',

      'toggle.disableAllHooks': 'Disable all hooks and statusline',
      'toggle.allowManagedHooksOnly': 'Allow managed hooks only',
      'toggle.statuslineHideVim': 'Hide vim mode indicator',

      // MCP Policies
      'toggle.enableMcp': 'Enable Model Context Protocol (MCP) servers',
      'mcp.approved.add': '+ Add Approved Server',
      'mcp.approved.placeholder': 'Server name from .mcp.json (e.g. filesystem)',
      'mcp.approved.empty': 'No servers explicitly approved.',
      'mcp.rejected.add': '+ Add Rejected Server',
      'mcp.rejected.placeholder': 'Server name from .mcp.json (e.g. browser)',
      'mcp.rejected.empty': 'No servers explicitly rejected.',

      // Worktree & Memory
      'field.worktreeBaseRef.label': 'Worktree Base Ref',
      'field.worktreeBaseRef.default': '(Default: fresh)',
      'field.worktreeBaseRef.fresh': 'fresh — branch from origin default branch',
      'field.worktreeBaseRef.head': 'head — branch from local current HEAD',

      'field.worktreeBgIsolation.label': 'Subagent Background Isolation',
      'field.worktreeBgIsolation.default': '(Default: worktree)',
      'field.worktreeBgIsolation.worktree': 'worktree — isolate subagents in temporary worktree',
      'field.worktreeBgIsolation.none': 'none — run in current working tree',

      'field.teammateMode.label': 'Teammate Mode',
      'field.teammateMode.default': '(Default: in-process)',
      'field.teammateMode.inProcess': 'in-process — same process',
      'field.teammateMode.auto': 'auto — automatic (split panes if tmux/it2)',
      'field.teammateMode.tmux': 'tmux',
      'field.teammateMode.iterm2': 'iterm2',

      'toggle.autoMemory': 'Enable auto-memory context saves',
      'toggle.gitInstructions': 'Built-in git workflow prompt instructions',
      'toggle.isolatePeerMachines': 'Prompt for peer machine messages',
      'toggle.disableAgentView': 'Disable background agent view',

      'wt.symlinks.add': '+ Add Symlink Directory',
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
      'empty.none': 'None configured.',

      // Toast Notifications & Diagnostics Region
      'toast.regionLabel': 'Notifications',
      'toast.dismiss': 'Dismiss notification',
      'toast.type.success': 'SUCCESS',
      'toast.type.error': 'ERROR',
      'toast.type.warning': 'WARNING',
      'toast.type.info': 'INFO',
      'diag.regionLabel': 'Configuration Diagnostics'
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
      'scope.short.user': 'Usuário',
      'scope.short.project': 'Projeto',
      'scope.short.local': 'Local',
      'scope.short.managed': 'Gerenciado',
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
      'actions.more': 'Mais ações',
      'actions.moreTitle': 'Abrir ações de arquivo e edição',
      'actions.unset': 'redefinir',
      'actions.remove': 'Remover',
      'actions.moveUp': 'Mover para cima',
      'actions.moveDown': 'Mover para baixo',
      'actions.add': '+ Adicionar',
      'actions.help': 'Informações de ajuda',

      // File Status & Indicator
      'file.activeSample': 'sample.json (exemplo)',
      'file.untitled': 'Documento não salvo',
      'file.directDisk': 'Acesso direto ao disco ativo',
      'file.currentTitle': 'Arquivo de configurações atual',
      'app.languageSelectAria': 'Selecionar idioma da interface',

      // Navigation Sections & Tabs
      'nav.ariaLabel': 'Categorias de configurações',
      'nav.scrollPrevious': 'Mostrar categorias anteriores',
      'nav.scrollNext': 'Mostrar mais categorias',
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
      'nav.tabsShort.general': 'Geral',
      'nav.tabsShort.permissions': 'Permissões',
      'nav.tabsShort.sandbox': 'Sandbox',
      'nav.tabsShort.env': 'Ambiente',
      'nav.tabsShort.models': 'Modelos',
      'nav.tabsShort.hooks': 'Hooks',
      'nav.tabsShort.mcp': 'MCP',
      'nav.tabsShort.worktree': 'Worktree',
      'nav.tabsShort.plugins': 'Plugins',
      'nav.tabsShort.managedPolicies': 'Gerenciado',
      'nav.tabsShort.advanced': 'JSON',

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

      // Dynamic Feature Labels (Schema-Driven compact labels)
      'setting.schema.label': 'Referência do Esquema JSON',
      'setting.theme.label': 'Tema de Cores',
      'setting.tui.label': 'Modo de Interface do Terminal',
      'setting.editorMode.label': 'Atalhos do Teclado',
      'setting.effortLevel.label': 'Nível de Raciocínio',
      'setting.language.label': 'Idioma Preferido',
      'setting.preferredNotifChannel.label': 'Canal de Notificações',
      'setting.viewMode.label': 'Modo de Exibição da Transcrição',
      'setting.autoScrollEnabled.label': 'Rolagem Automática',
      'setting.showTurnDuration.label': 'Exibir Duração do Turno',
      'setting.terminalProgressBarEnabled.label': 'Barra de Progresso do Terminal',
      'setting.syntaxHighlightingDisabled.label': 'Desativar Destaque de Sintaxe',
      'setting.axScreenReader.label': 'Modo Acessível para Leitores de Tela',
      'setting.prefersReducedMotion.label': 'Movimento Reduzido',
      'setting.promptSuggestionEnabled.label': 'Sugestões de Prompt',
      'setting.showClearContextOnPlanAccept.label': 'Limpar Contexto ao Aceitar Plano',
      'setting.awaySummaryEnabled.label': 'Resumo ao Retornar',
      'setting.feedbackSurveyRate.label': 'Taxa de Pesquisa de Avaliação',
      'setting.skillListingBudgetFraction.label': 'Fração do Orçamento para Skills',
      'setting.skillListingMaxDescChars.label': 'Limite de Descrição de Skills',
      'setting.vimInsertModeRemaps.label': 'Remapeamentos do Modo INSERT do Vim',
      'setting.spinnerVerbs.label': 'Verbos Personalizados do Indicador',
      'setting.spinnerTipsOverride.label': 'Substituição de Dicas do Indicador',
      'setting.emojiCompletionEnabled.label': 'Preenchimento de Códigos Emoji',
      'setting.spinnerTipsEnabled.label': 'Dicas no Indicador',
      'setting.wheelScrollAccelerationEnabled.label': 'Aceleração da Roda do Mouse',
      'setting.fileCheckpointingEnabled.label': 'Pontos de Verificação de Arquivo (/rewind)',
      'setting.verbose.label': 'Saída Detalhada (Verbose)',
      'setting.diffTool.label': 'Ferramenta de Diferenças (Diff)',
      'setting.plansDirectory.label': 'Diretório de Planos',
      'setting.respectGitignore.label': 'Respeitar .gitignore',
      'setting.autoUpdatesChannel.label': 'Canal de Lançamento de Atualizações',
      'setting.cleanupPeriodDays.label': 'Período de Retenção de Limpeza (Dias)',
      'setting.attribution.label': 'Atribuição de Commits/PRs no Git',
      'setting.includeGitInstructions.label': 'Incluir Instruções de Git',
      'setting.includeCoAuthoredBy.label': 'Incluir Co-Authored-By (Obsoleto)',
      'setting.hasCompletedOnboarding.label': 'Integração Inicial Concluída',

      'setting.permissions_defaultMode.label': 'Modo de Permissão Inicial',
      'setting.permissions_allow.label': 'Regras de Permissão (Allow)',
      'setting.permissions_ask.label': 'Regras de Confirmação (Ask)',
      'setting.permissions_deny.label': 'Regras de Negação (Deny)',
      'setting.permissions_additionalDirectories.label': 'Diretórios Adicionais',
      'setting.permissions_disableBypassPermissionsMode.label': 'Desativar Modo Bypass (Permissões)',
      'setting.permissions_allowManagedPermissionRulesOnly.label': 'Apenas Regras Gerenciadas (Permissões)',
      'setting.allowManagedPermissionRulesOnly.label': 'Apenas Regras Gerenciadas',
      'setting.disableBypassPermissionsMode.label': 'Desativar Modo Bypass',
      'setting.skipDangerousModePermissionPrompt.label': 'Pular Confirmação de Modo Perigoso',
      'setting.skipWorkflowUsageWarning.label': 'Pular Aviso de Uso de Fluxo',
      'setting.skipAutoPermissionPrompt.label': 'Pular Confirmação de Modo Automático',
      'setting.autoMode_classifyAllShell.label': 'Classificar Todos os Comandos de Shell',
      'setting.autoModePromptSampling.label': 'Amostragem de Prompts no Modo Automático',
      'setting.askUserQuestionTimeout.label': 'Tempo Limite para Perguntas ao Usuário',
      'setting.dialogExpiry.label': 'Expiração de Diálogos de Confirmação',
      'setting.defaultShell.label': 'Shell Padrão',
      'setting.apiKeyHelper.label': 'Script Auxiliar de Chave de API',
      'setting.awsCredentialExport.label': 'Script de Exportação de Credenciais AWS',
      'setting.awsAuthRefresh.label': 'Script de Atualização de Autenticação AWS',

      'setting.sandbox_enabled.label': 'Habilitar Isolamento Bash (Sandbox)',
      'setting.sandbox_failIfUnavailable.label': 'Encerrar se Sandbox Indisponível',
      'setting.sandbox_autoAllowBashIfSandboxed.label': 'Autoaprovar Bash sob Isolamento',
      'setting.sandbox_allowUnsandboxedCommands.label': 'Permitir Comandos Fora do Sandbox',
      'setting.sandbox_excludedCommands.label': 'Comandos Excluídos do Sandbox',
      'setting.sandbox_filesystem_allowWrite.label': 'Caminhos com Permissão de Escrita',
      'setting.sandbox_filesystem_denyWrite.label': 'Caminhos com Bloqueio de Escrita',
      'setting.sandbox_filesystem_denyRead.label': 'Caminhos com Bloqueio de Leitura',
      'setting.sandbox_filesystem_allowRead.label': 'Caminhos com Permissão de Leitura',
      'setting.sandbox_filesystem_disabled.label': 'Desativar Isolamento do Sistema de Arquivos',
      'setting.sandbox_filesystem_allowManagedReadPathsOnly.label': 'Apenas Caminhos de Leitura Gerenciados',
      'setting.sandbox_network_allowedDomains.label': 'Domínios de Rede Permitidos',
      'setting.sandbox_network_deniedDomains.label': 'Domínios de Rede Bloqueados',
      'setting.sandbox_network_strictAllowlist.label': 'Lista Restrita de Rede',
      'setting.sandbox_network_allowAllUnixSockets.label': 'Permitir Todos os Sockets Unix',
      'setting.sandbox_network_allowLocalBinding.label': 'Permitir Vinculação Local (Localhost)',

      'setting.env.label': 'Mapa de Variáveis de Ambiente',

      'setting.model.label': 'Modelo Principal',
      'setting.advisorModel.label': 'Modelo do Advisor',
      'setting.fallbackModel.label': 'Cadeia de Modelos de Fallback',
      'setting.availableModels.label': 'Lista de Modelos Disponíveis',
      'setting.enforceAvailableModels.label': 'Impor Lista de Modelos para o Padrão',
      'setting.modelOverrides.label': 'Sobrescritas de Modelo',
      'setting.alwaysThinkingEnabled.label': 'Sempre Habilitar Pensamento Estendido',
      'setting.showThinkingSummaries.label': 'Exibir Resumos do Pensamento',
      'setting.fastMode.label': 'Modo Rápido Habilitado',
      'setting.fastModePerSessionOptIn.label': 'Exigir Escolha por Sessão no Modo Rápido',
      'setting.autoCompactEnabled.label': 'Compactação Automática da Janela de Contexto',
      'setting.autoCompactThreshold.label': 'Taxa Limite de Compactação Automática',
      'setting.workflowSizeGuideline.label': 'Diretriz de Tamanho de Fluxo',
      'setting.teammateMode.label': 'Modo de Criação de Companheiros (Teammates)',
      'setting.crossSessionInbound.label': 'Política de Mensagens entre Sessões',

      'setting.hooks.label': 'Configuração de Hooks de Ciclo de Vida',
      'setting.statusLine.label': 'Configuração da Linha de Status',
      'setting.fileSuggestion.label': 'Script de Sugestão de Arquivos (@ File Picker)',
      'setting.disableAllHooks.label': 'Desativar Todos os Hooks e Linha de Status',
      'setting.allowManagedHooksOnly.label': 'Permitir Apenas Hooks Gerenciados',
      'setting.allowedHttpHookUrls.label': 'URLs HTTP Permitidas para Hooks',
      'setting.httpHookAllowedEnvVars.label': 'Variáveis de Ambiente Permitidas em Hooks HTTP',

      'setting.enableMcpServers.label': 'Alternância de Habilitação de Servidores MCP',
      'setting.enabledMcpjsonServers.label': 'Servidores Aprovados do .mcp.json',
      'setting.disabledMcpjsonServers.label': 'Servidores Rejeitados do .mcp.json',
      'setting.allowedMcpServers.label': 'Servidores MCP Permitidos (Corporativo)',
      'setting.deniedMcpServers.label': 'Servidores MCP Bloqueados (Corporativo)',

      'setting.worktree_baseRef.label': 'Referência Base da Worktree',
      'setting.worktree_bgIsolation.label': 'Isolamento de Subagentes em Segundo Plano',
      'setting.worktree_symlinkDirectories.label': 'Diretórios de Symlink da Worktree',
      'setting.worktree_sparsePaths.label': 'Caminhos Esparsos da Worktree',
      'setting.autoMemoryEnabled.label': 'Salvamentos Automáticos de Memória',
      'setting.claudeMdExcludes.label': 'Padrões de Exclusão do CLAUDE.md',
      'setting.disableRemoteControl.label': 'Desativar Controle Remoto',

      'setting.channelsEnabled.label': 'Canais Habilitados',
      'setting.enabledPlugins.label': 'Mapa de Plugins Habilitados',
      'setting.pluginConfigs.label': 'Configurações de Plugins',
      'setting.extraKnownMarketplaces.label': 'Mapa de Fontes de Marketplaces',
      'setting.strictKnownMarketplaces.label': 'Lista Restrita de Marketplaces Conhecidos',
      'setting.blockedMarketplaces.label': 'Lista de Bloqueio de Marketplaces',
      'setting.allowedChannelPlugins.label': 'Plugins de Canal Permitidos',
      'setting.skippedMarketplaces.label': 'Marketplaces Ignorados',
      'setting.skippedPlugins.label': 'Plugins Ignorados',
      'setting.strictPluginOnlyCustomization.label': 'Personalização Estrita Apenas por Plugins',
      'setting.disableCommandPluginSources.label': 'Desativar Fontes de Plugins por Comando',
      'setting.disableSideloadFlags.label': 'Desativar Flags CLI de Sideload (Plugins/MCP)',

      'setting.forceLoginMethod.label': 'Forçar Método de Login',
      'setting.forceLoginOrgUUID.label': 'Forçar UUID(s) de Organização para Login',
      'setting.forceLoginGatewayUrl.label': 'Forçar URL do Gateway de Login',
      'setting.parentSettingsBehavior.label': 'Comportamento de Configurações Pai',
      'setting.requiredMinimumVersion.label': 'Versão Mínima Obrigatória do Claude Code',
      'setting.forceRemoteSettingsRefresh.label': 'Forçar Atualização Remota de Configurações',
      'setting.companyAnnouncements.label': 'Anúncios da Empresa',
      'setting.companyPolicyUrl.label': 'URL da Política da Empresa',
      'setting.companyPolicyName.label': 'Nome de Exibição da Política da Empresa',
      'setting.companyPolicyHeader.label': 'Texto de Cabeçalho da Política da Empresa',
      'setting.companyPolicyFooter.label': 'Texto de Rodapé da Política da Empresa',
      'setting.footerLinksRegexes.label': 'Expressões Regulares de Links de Rodapé',
      'setting.voice.label': 'Configurações de Voz',
      'setting.ssh.label': 'Configurações de Conexão SSH',
      'setting.otel.label': 'Configuração de OpenTelemetry',
      'setting.policy.label': 'Configuração de Políticas',

      // General Fields & Values
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
      'toggle.sandbox.allowUnsandboxed': 'Permitir comandos fora do isolamento',
      'toggle.sandbox.fsDisabled': 'Pular isolamento do sistema de arquivos',
      'toggle.sandbox.strictNet': 'Bloqueio estrito de rede',
      'toggle.sandbox.allowUnixSockets': 'Permitir todos os sockets Unix',
      'toggle.sandbox.allowLocalBinding': 'Permitir vinculação à porta localhost',

      'rules.sb.allowWrite.title': 'Permitir Escrita',
      'rules.sb.allowWrite.button': '+ Adicionar Caminho',
      'rules.sb.allowWrite.placeholder': 'ex.: /tmp/build, ~/.kube',

      'rules.sb.denyWrite.title': 'Bloquear Escrita',
      'rules.sb.denyWrite.button': '+ Adicionar Caminho',
      'rules.sb.denyWrite.placeholder': 'ex.: /etc, /usr/local/bin',

      'rules.sb.denyRead.title': 'Bloquear Leitura',
      'rules.sb.denyRead.button': '+ Adicionar Caminho',
      'rules.sb.denyRead.placeholder': 'ex.: ~/.aws/credentials, ~/.ssh',

      'rules.sb.allowRead.title': 'Permitir Leitura',
      'rules.sb.allowRead.button': '+ Adicionar Caminho',
      'rules.sb.allowRead.placeholder': 'ex.: . (re-liberar diretório do workspace)',

      'rules.sb.allowDomains.title': 'Domínios Permitidos',
      'rules.sb.allowDomains.button': '+ Adicionar Domínio',
      'rules.sb.allowDomains.placeholder': 'ex.: github.com, *.npmjs.org',

      'rules.sb.denyDomains.title': 'Domínios Bloqueados',
      'rules.sb.denyDomains.button': '+ Adicionar Domínio',
      'rules.sb.denyDomains.placeholder': 'ex.: uploads.github.com, *.internal',

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
      'env.keyPlaceholder': 'NOME_DA_VARIAVEL (ex.: OTEL_EXPORTER_OTLP_ENDPOINT)',
      'env.valPlaceholder': 'Valor (ou vazio para desmarcar)',
      'env.empty': 'Nenhuma variável de ambiente adicional configurada.',
      'env.notObject': 'env não é um objeto; edite no JSON Avançado.',
      'env.apiKey.label': 'Chave de API Anthropic',
      'env.apiKey.placeholder': 'sk-ant-...',
      'env.apiKey.hint': 'Chave de API principal para a Anthropic ou serviço gateway compatível.',
      'env.apiKey.show': 'Exibir',
      'env.apiKey.hide': 'Ocultar',
      'env.baseUrl.label': 'URL Base da API',
      'env.baseUrl.placeholder': 'https://api.anthropic.com',
      'env.baseUrl.hint': 'Endpoint do gateway de API personalizado ou proxy reverso (ex.: https://api.alanwo.com.br).',
      'env.authToken.label': 'Token de Autorização',
      'env.apiKeyHelper.label': 'Comando Auxiliar de Chave de API',
      'env.apiKeyHelperHint': 'Comando personalizado executado pelo shell para gerar valores de cabeçalho dinâmicos de autenticação.',
      'env.otelHeadersHelperHint': 'Script para gerar cabeçalhos OpenTelemetry dinâmicos.',

      // Models & Workflows
      'models.discovery.fetchBtn': '⚡ Buscar Modelos da API',
      'models.discovery.fetching': 'Buscando modelos...',
      'models.discovery.status.defaults': 'Usando {count} sugestões de modelos padrão. Configure URL base e chave para buscar modelos ao vivo.',
      'models.discovery.status.success': 'Carregados {count} modelos do endpoint.',
      'models.discovery.status.error': 'Falha ao buscar modelos: {error}',
      'models.discovery.status.noCreds': 'Configure URL Base da API e Chave/Token para descobrir modelos.',
      'models.discovery.badge.defaults': '{count} padrões',
      'models.discovery.badge.loaded': '{count} modelos',
      'models.discovery.hint': 'Consulta o endpoint /v1/models compatível com OpenAI para preencher os seletores de modelos.',
      'models.tier.fable': 'Nível Fable',
      'models.tier.opus': 'Nível Opus',
      'models.tier.sonnet': 'Nível Sonnet',
      'models.tier.haiku': 'Nível Haiku',
      'models.tier.custom': 'Opção de Modelo Personalizado',
      'models.tier.subagent': 'Opções de Subagente e Gateway',
      'models.field.modelId': 'ID / Mapeamento do Modelo',
      'models.field.name': 'Nome de Exibição',
      'models.field.desc': 'Descrição',
      'models.field.capabilities': 'Capacidades',
      'models.field.subagent': 'Sobrescrita de Modelo para Subagentes',
      'models.field.discovery': 'Descoberta de Modelos via Gateway (1/0)',
      'models.field.advisorTool': 'Desativar Ferramenta Advisor (1/0)',
      'field.model.label': 'Modelo Principal',
      'field.model.hint': 'Requer reinício quando modificado. Troca durante a sessão via /model.',
      'field.model.placeholder': 'ex.: claude-sonnet-5, opus',
      'field.advisorModel.label': 'Modelo do Advisor',
      'field.advisorModel.placeholder': 'fable, opus, sonnet, ou ID do modelo',
      'field.autoCompactThreshold.label': 'Taxa Limite de Compactação Automática',
      'field.autoCompactThreshold.placeholder': '0.85 (0.5 a 0.99)',
      'field.workflowSize.label': 'Diretriz de Tamanho de Fluxo',
      'field.workflowSize.default': '(Padrão: sem restrição)',
      'field.workflowSize.unrestricted': 'unrestricted — sem restrição de tamanho de fluxo',
      'field.workflowSize.small': 'small — diretriz de ~100–300 linhas',
      'field.workflowSize.medium': 'medium — diretriz de ~300–1000 linhas',
      'field.workflowSize.large': 'large — diretriz de ~1000+ linhas',
      'field.crossSessionInbound.label': 'Mensagens Recebidas',
      'field.crossSessionInbound.default': '(Padrão: aceitar)',
      'field.crossSessionInbound.accept': 'accept — aceitar mensagens entre sessões automaticamente',
      'field.crossSessionInbound.hold': 'hold — reter mensagens até confirmação',
      'field.crossSessionInbound.refuse': 'refuse — recusar mensagens entre sessões',
      'field.askUserTimeout.label': 'Tempo Limite de Pergunta ao Usuário',
      'field.askUserTimeout.default': '(Padrão: nunca)',
      'field.askUserTimeout.never': 'never — aguardar resposta indefinidamente',
      'field.askUserTimeout.60s': '60s — tempo limite de 1 minuto',
      'field.askUserTimeout.5m': '5m — tempo limite de 5 minutos',
      'field.askUserTimeout.10m': '10m — tempo limite de 10 minutos',
      'field.dialogExpiry.label': 'Expiração de Diálogos',
      'field.dialogExpiry.default': '(Padrão: nunca)',
      'field.dialogExpiry.never': 'never — diálogos de permissão não expiram automaticamente',
      'field.dialogExpiry.60s': '60s — expirar diálogo após 1 minuto',
      'field.dialogExpiry.5m': '5m — expirar diálogo após 5 minutos',
      'field.dialogExpiry.10m': '10m — expirar diálogo após 10 minutos',

      'toggle.alwaysThinking': 'Sempre habilitar raciocínio estendido',
      'toggle.thinkingSummaries': 'Exibir resumos de raciocínio na conversa',
      'toggle.fastMode': 'Habilitar modo rápido (Opus Fast Mode)',
      'toggle.fastModeOptIn': 'Exigir escolha por sessão para modo rápido',
      'toggle.autoCompact': 'Compactar contexto automaticamente ao aproximar do limite',

      'models.fallback.add': '+ Adicionar Modelo de Fallback',
      'models.fallback.placeholder': 'ID do Modelo (ex.: claude-3-5-haiku-20241022)',
      'models.fallback.empty': 'Nenhum modelo de fallback configurado.',

      // Hooks & Status Line
      'hooks.addEvent': '+ Adicionar Grupo de Hooks para Evento',
      'hooks.empty': 'Nenhum hook configurado.',
      'hooks.notObject': 'hooks não é um objeto; edite no JSON Avançado.',
      'hooks.groupDesc': 'Correspondência: {matcher} ({count} manipuladores de comando)',
      'hooks.addHandler': '+ Adicionar Manipulador',
      'hooks.commandPlaceholder': 'Comando de shell para executar',
      'hooks.statusLine.typeLabel': 'Tipo da Linha de Status',
      'hooks.statusLine.cmdLabel': 'Comando da Linha de Status',
      'hooks.statusLine.cmdPlaceholder': 'Caminho do script (ex.: ~/.claude/statusline.sh)',
      'hooks.statusLine.hint': 'Executado a cada alteração de estado para renderizar a linha de status no terminal.',
      'hooks.statusLine.refresh': 'Intervalo de Atualização (Segundos)',
      'hooks.statusLine.padding': 'Caracteres de Espaçamento Horizontal',
      'hooks.urls.add': '+ Adicionar Padrão de URL Permitida',
      'hooks.urls.placeholder': 'ex.: https://hooks.exemplo.com.br/*',
      'hooks.urls.empty': 'Sem restrições de URLs para hooks HTTP (todas as URLs liberadas).',

      'toggle.disableAllHooks': 'Desativar todos os hooks e a linha de status',
      'toggle.allowManagedHooksOnly': 'Permitir apenas hooks gerenciados',
      'toggle.statuslineHideVim': 'Ocultar indicador do modo vim',

      // MCP Policies
      'toggle.enableMcp': 'Habilitar servidores do Model Context Protocol (MCP)',
      'mcp.approved.add': '+ Adicionar Servidor Aprovado',
      'mcp.approved.placeholder': 'Nome do servidor em .mcp.json (ex.: filesystem)',
      'mcp.approved.empty': 'Nenhum servidor explicitamente aprovado.',
      'mcp.rejected.add': '+ Adicionar Servidor Rejeitado',
      'mcp.rejected.placeholder': 'Nome do servidor em .mcp.json (ex.: browser)',
      'mcp.rejected.empty': 'Nenhum servidor explicitamente rejeitado.',

      // Worktree & Memory
      'field.worktreeBaseRef.label': 'Referência Base da Worktree',
      'field.worktreeBaseRef.default': '(Padrão: fresh)',
      'field.worktreeBaseRef.fresh': 'fresh — criar branch a partir da branch remota padrão',
      'field.worktreeBaseRef.head': 'head — criar branch a partir do HEAD local atual',

      'field.worktreeBgIsolation.label': 'Isolamento de Subagentes em Segundo Plano',
      'field.worktreeBgIsolation.default': '(Padrão: worktree)',
      'field.worktreeBgIsolation.worktree': 'worktree — isolar subagentes em worktree temporária',
      'field.worktreeBgIsolation.none': 'none — executar na árvore de trabalho atual',

      'field.teammateMode.label': 'Modo de Companheiro (Teammate)',
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
      'empty.none': 'Nenhum configurado.',

      // Toast Notifications & Diagnostics Region
      'toast.regionLabel': 'Notificações',
      'toast.dismiss': 'Dispensar notificação',
      'toast.type.success': 'SUCESSO',
      'toast.type.error': 'ERRO',
      'toast.type.warning': 'AVISO',
      'toast.type.info': 'INFO',
      'diag.regionLabel': 'Diagnósticos de Configuração'
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
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return normalizeLocale(stored);
      }
    } catch (_) {}

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

    const textEls = root.querySelectorAll ? root.querySelectorAll('[data-i18n]') : [];
    textEls.forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = t(key);
      }
    });

    const placeholderEls = root.querySelectorAll ? root.querySelectorAll('[data-i18n-placeholder]') : [];
    placeholderEls.forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.placeholder = t(key);
      }
    });

    const titleEls = root.querySelectorAll ? root.querySelectorAll('[data-i18n-title]') : [];
    titleEls.forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        el.title = t(key);
      }
    });

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
