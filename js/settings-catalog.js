/**
 * Claude Settings Editor - Settings Catalog
 * Presentation, categorization, scope guidance, and specialized editor metadata.
 * Schema facts (enums, defaults, types, descriptions, constraints) are sourced from SettingsSchema.
 */
(function exposeSettingsCatalog(root, factory) {
  let schemaModule = null;
  let rawSchema = null;
  if (typeof require === 'function') {
    try {
      schemaModule = require('./settings-schema.js');
      const fs = require('node:fs');
      const path = require('node:path');
      const schemaPath = path.join(__dirname, '..', 'docs', 'claude-code-settings.json');
      if (fs.existsSync(schemaPath)) {
        rawSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
      }
    } catch (_) {
      // schemaModule/rawSchema optional in isolated tests
    }
  }
  if (!schemaModule && root && root.SettingsSchema) {
    schemaModule = root.SettingsSchema;
  }
  const api = factory(schemaModule, rawSchema);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SettingsCatalog = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSettingsCatalog(schemaModule, initialRawSchema) {
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

  const CATEGORIES = [
    { id: 'general', order: 10 },
    { id: 'permissions', order: 20 },
    { id: 'sandbox', order: 30 },
    { id: 'env', order: 40 },
    { id: 'models', order: 50 },
    { id: 'hooks', order: 60 },
    { id: 'mcp', order: 70 },
    { id: 'worktree', order: 80 },
    { id: 'plugins', order: 90 },
    { id: 'advanced', order: 100 }
  ];

  const DEDICATED_ENV_KEYS = new Set([
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_BASE_URL',
    'ANTHROPIC_AUTH_TOKEN',
    'ANTHROPIC_CUSTOM_MODEL_OPTION',
    'ANTHROPIC_CUSTOM_MODEL_OPTION_NAME',
    'ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION',
    'ANTHROPIC_DEFAULT_FABLE_MODEL',
    'ANTHROPIC_DEFAULT_FABLE_MODEL_NAME',
    'ANTHROPIC_DEFAULT_FABLE_MODEL_DESCRIPTION',
    'ANTHROPIC_DEFAULT_FABLE_MODEL_SUPPORTED_CAPABILITIES',
    'ANTHROPIC_DEFAULT_OPUS_MODEL',
    'ANTHROPIC_DEFAULT_OPUS_MODEL_NAME',
    'ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION',
    'ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES',
    'ANTHROPIC_DEFAULT_SONNET_MODEL',
    'ANTHROPIC_DEFAULT_SONNET_MODEL_NAME',
    'ANTHROPIC_DEFAULT_SONNET_MODEL_DESCRIPTION',
    'ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES',
    'ANTHROPIC_DEFAULT_HAIKU_MODEL',
    'ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME',
    'ANTHROPIC_DEFAULT_HAIKU_MODEL_DESCRIPTION',
    'ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES',
    'CLAUDE_CODE_SUBAGENT_MODEL',
    'CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY',
    'CLAUDE_CODE_DISABLE_ADVISOR_TOOL'
  ]);

  /**
   * Presentation metadata for known settings.
   */
  const PRESENTATION_CATALOG = {
    // --- General & UI ---
    '$schema': { category: 'general', order: 1, labelKey: 'setting.schema.label', scopes: ['user', 'project', 'local', 'managed'] },
    'theme': { category: 'general', order: 2, labelKey: 'setting.theme.label', allowCustom: true, scopes: ['user', 'project', 'local', 'managed'] },
    'tui': { category: 'general', order: 3, labelKey: 'setting.tui.label', scopes: ['user', 'project', 'local', 'managed'] },
    'editorMode': { category: 'general', order: 4, labelKey: 'setting.editorMode.label', scopes: ['user', 'project', 'local', 'managed'] },
    'effortLevel': { category: 'general', order: 5, labelKey: 'setting.effortLevel.label', scopes: ['user', 'project', 'local', 'managed'] },
    'language': { category: 'general', order: 6, labelKey: 'setting.language.label', scopes: ['user', 'project', 'local', 'managed'] },
    'preferredNotifChannel': { category: 'general', order: 7, labelKey: 'setting.preferredNotifChannel.label', scopes: ['user', 'project', 'local', 'managed'] },
    'viewMode': { category: 'general', order: 8, labelKey: 'setting.viewMode.label', scopes: ['user', 'project', 'local', 'managed'] },
    'autoScrollEnabled': { category: 'general', order: 9, labelKey: 'setting.autoScrollEnabled.label', scopes: ['user', 'project', 'local', 'managed'] },
    'showTurnDuration': { category: 'general', order: 10, labelKey: 'setting.showTurnDuration.label', scopes: ['user', 'project', 'local', 'managed'] },
    'terminalProgressBarEnabled': { category: 'general', order: 11, labelKey: 'setting.terminalProgressBarEnabled.label', scopes: ['user', 'project', 'local', 'managed'] },
    'syntaxHighlightingDisabled': { category: 'general', order: 12, labelKey: 'setting.syntaxHighlightingDisabled.label', scopes: ['user', 'project', 'local', 'managed'] },
    'axScreenReader': { category: 'general', order: 13, labelKey: 'setting.axScreenReader.label', scopes: ['user', 'project', 'local', 'managed'] },
    'prefersReducedMotion': { category: 'general', order: 14, labelKey: 'setting.prefersReducedMotion.label', scopes: ['user', 'project', 'local', 'managed'] },
    'promptSuggestionEnabled': { category: 'general', order: 15, labelKey: 'setting.promptSuggestionEnabled.label', scopes: ['user', 'project', 'local', 'managed'] },
    'showClearContextOnPlanAccept': { category: 'general', order: 16, labelKey: 'setting.showClearContextOnPlanAccept.label', scopes: ['user', 'project', 'local', 'managed'] },
    'awaySummaryEnabled': { category: 'general', order: 17, labelKey: 'setting.awaySummaryEnabled.label', scopes: ['user', 'project', 'local', 'managed'] },
    'feedbackSurveyRate': { category: 'general', order: 18, labelKey: 'setting.feedbackSurveyRate.label', scopes: ['user', 'project'] },
    'skillListingBudgetFraction': { category: 'general', order: 19, labelKey: 'setting.skillListingBudgetFraction.label', scopes: ['user', 'project', 'local', 'managed'] },
    'skillListingMaxDescChars': { category: 'general', order: 20, labelKey: 'setting.skillListingMaxDescChars.label', scopes: ['user', 'project', 'local', 'managed'] },
    'vimInsertModeRemaps': { category: 'general', order: 21, labelKey: 'setting.vimInsertModeRemaps.label', editorId: 'structured-json', scopes: ['user', 'project', 'local', 'managed'] },
    'spinnerVerbs': { category: 'general', order: 22, labelKey: 'setting.spinnerVerbs.label', editorId: 'structured-json', scopes: ['user', 'project', 'local', 'managed'] },
    'spinnerTipsOverride': { category: 'general', order: 23, labelKey: 'setting.spinnerTipsOverride.label', editorId: 'structured-json', scopes: ['user', 'project', 'local', 'managed'] },
    'emojiCompletionEnabled': { category: 'general', order: 24, labelKey: 'setting.emojiCompletionEnabled.label', scopes: ['user', 'project', 'local', 'managed'] },
    'spinnerTipsEnabled': { category: 'general', order: 25, labelKey: 'setting.spinnerTipsEnabled.label', scopes: ['user', 'project', 'local', 'managed'] },
    'wheelScrollAccelerationEnabled': { category: 'general', order: 26, labelKey: 'setting.wheelScrollAccelerationEnabled.label', scopes: ['user', 'project', 'local', 'managed'] },
    'fileCheckpointingEnabled': { category: 'general', order: 27, labelKey: 'setting.fileCheckpointingEnabled.label', scopes: ['user', 'project', 'local', 'managed'] },
    'verbose': { category: 'general', order: 28, labelKey: 'setting.verbose.label', scopes: ['user', 'project', 'local', 'managed'] },
    'diffTool': { category: 'general', order: 29, labelKey: 'setting.diffTool.label', scopes: ['user', 'project', 'local', 'managed'] },
    'plansDirectory': { category: 'general', order: 30, labelKey: 'setting.plansDirectory.label', scopes: ['user', 'project', 'local', 'managed'] },
    'respectGitignore': { category: 'general', order: 31, labelKey: 'setting.respectGitignore.label', scopes: ['user', 'project', 'local', 'managed'] },
    'autoUpdatesChannel': { category: 'general', order: 32, labelKey: 'setting.autoUpdatesChannel.label', scopes: ['user', 'project', 'local', 'managed'] },
    'cleanupPeriodDays': { category: 'general', order: 33, labelKey: 'setting.cleanupPeriodDays.label', scopes: ['user', 'project', 'local', 'managed'] },
    'attribution': { category: 'general', order: 34, labelKey: 'setting.attribution.label', editorId: 'attribution', scopes: ['user', 'project', 'local', 'managed'] },
    'includeGitInstructions': { category: 'general', order: 35, labelKey: 'setting.includeGitInstructions.label', scopes: ['user', 'project', 'local', 'managed'] },
    'includeCoAuthoredBy': { category: 'general', order: 36, labelKey: 'setting.includeCoAuthoredBy.label', scopes: ['user', 'project', 'local', 'managed'] },
    'hasCompletedOnboarding': { category: 'general', order: 37, labelKey: 'setting.hasCompletedOnboarding.label', scopes: ['user', 'project', 'local', 'managed'] },

    // --- Permissions & Auto Mode ---
    'permissions.defaultMode': { category: 'permissions', order: 1, labelKey: 'setting.permissions_defaultMode.label', scopes: ['user', 'project', 'local', 'managed'], scopeNotes: { project: 'auto mode is ignored in Project & Local scopes.', local: 'auto mode is ignored in Project & Local scopes.' } },
    'permissions.allow': { category: 'permissions', order: 2, labelKey: 'setting.permissions_allow.label', editorId: 'rule-list', scopes: ['user', 'project', 'local', 'managed'], mergeBehavior: 'merge-array' },
    'permissions.ask': { category: 'permissions', order: 3, labelKey: 'setting.permissions_ask.label', editorId: 'rule-list', scopes: ['user', 'project', 'local', 'managed'], mergeBehavior: 'merge-array' },
    'permissions.deny': { category: 'permissions', order: 4, labelKey: 'setting.permissions_deny.label', editorId: 'rule-list', scopes: ['user', 'project', 'local', 'managed'], mergeBehavior: 'merge-array' },
    'permissions.additionalDirectories': { category: 'permissions', order: 5, labelKey: 'setting.permissions_additionalDirectories.label', editorId: 'rule-list', scopes: ['user', 'project', 'local', 'managed'], mergeBehavior: 'merge-array' },
    'permissions.disableAutoMode': { category: 'permissions', order: 5.5, labelKey: 'setting.permissions_disableAutoMode.label', scopes: ['managed'], managedOnly: true },
    'permissions.disableBypassPermissionsMode': { category: 'permissions', order: 6, labelKey: 'setting.permissions_disableBypassPermissionsMode.label', scopes: ['managed'], managedOnly: true },
    'allowManagedPermissionRulesOnly': { category: 'permissions', order: 8, labelKey: 'setting.allowManagedPermissionRulesOnly.label', scopes: ['managed'], managedOnly: true },
    'disableAutoMode': { category: 'permissions', order: 8.5, labelKey: 'setting.disableAutoMode.label', scopes: ['managed'], managedOnly: true },
    'skipDangerousModePermissionPrompt': { category: 'permissions', order: 10, labelKey: 'setting.skipDangerousModePermissionPrompt.label', scopes: ['user', 'managed'] },
    'skipWorkflowUsageWarning': { category: 'permissions', order: 11, labelKey: 'setting.skipWorkflowUsageWarning.label', scopes: ['user', 'managed'] },
    'skipAutoPermissionPrompt': { category: 'permissions', order: 12, labelKey: 'setting.skipAutoPermissionPrompt.label', scopes: ['user', 'managed'] },
    'useAutoModeDuringPlan': { category: 'permissions', order: 12.5, labelKey: 'setting.useAutoModeDuringPlan.label', scopes: ['user', 'managed'] },
    'autoMode.classifyAllShell': { category: 'permissions', order: 13, labelKey: 'setting.autoMode_classifyAllShell.label', scopes: ['user', 'project', 'local', 'managed'] },
    'autoModePromptSampling': { category: 'permissions', order: 14, labelKey: 'setting.autoModePromptSampling.label', scopes: ['user', 'project', 'local', 'managed'] },
    'askUserQuestionTimeout': { category: 'permissions', order: 15, labelKey: 'setting.askUserQuestionTimeout.label', scopes: ['user', 'project', 'local', 'managed'] },
    'dialogExpiry': { category: 'permissions', order: 16, labelKey: 'setting.dialogExpiry.label', scopes: ['user', 'project', 'local', 'managed'] },
    'defaultShell': { category: 'permissions', order: 17, labelKey: 'setting.defaultShell.label', scopes: ['user', 'project', 'local', 'managed'] },
    'apiKeyHelper': { category: 'permissions', order: 18, labelKey: 'setting.apiKeyHelper.label', scopes: ['user', 'project', 'local', 'managed'] },
    'awsCredentialExport': { category: 'permissions', order: 19, labelKey: 'setting.awsCredentialExport.label', scopes: ['user', 'project', 'local', 'managed'] },
    'awsAuthRefresh': { category: 'permissions', order: 20, labelKey: 'setting.awsAuthRefresh.label', scopes: ['user', 'project', 'local', 'managed'] },

    // --- Sandboxing ---
    'sandbox.enabled': { category: 'sandbox', order: 1, labelKey: 'setting.sandbox_enabled.label', scopes: ['user', 'project', 'local', 'managed'] },
    'sandbox.failIfUnavailable': { category: 'sandbox', order: 2, labelKey: 'setting.sandbox_failIfUnavailable.label', scopes: ['user', 'project', 'local', 'managed'] },
    'sandbox.autoAllowBashIfSandboxed': { category: 'sandbox', order: 3, labelKey: 'setting.sandbox_autoAllowBashIfSandboxed.label', scopes: ['user', 'project', 'local', 'managed'] },
    'sandbox.allowUnsandboxedCommands': { category: 'sandbox', order: 4, labelKey: 'setting.sandbox_allowUnsandboxedCommands.label', scopes: ['user', 'project', 'local', 'managed'] },
    'sandbox.excludedCommands': { category: 'sandbox', order: 5, labelKey: 'setting.sandbox_excludedCommands.label', editorId: 'rule-list', scopes: ['user', 'project', 'local', 'managed'], mergeBehavior: 'merge-array' },
    'sandbox.filesystem.allowWrite': { category: 'sandbox', order: 6, labelKey: 'setting.sandbox_filesystem_allowWrite.label', editorId: 'rule-list', scopes: ['user', 'project', 'local', 'managed'], mergeBehavior: 'merge-array' },
    'sandbox.filesystem.denyWrite': { category: 'sandbox', order: 7, labelKey: 'setting.sandbox_filesystem_denyWrite.label', editorId: 'rule-list', scopes: ['user', 'project', 'local', 'managed'], mergeBehavior: 'merge-array' },
    'sandbox.filesystem.denyRead': { category: 'sandbox', order: 8, labelKey: 'setting.sandbox_filesystem_denyRead.label', editorId: 'rule-list', scopes: ['user', 'project', 'local', 'managed'], mergeBehavior: 'merge-array' },
    'sandbox.filesystem.allowRead': { category: 'sandbox', order: 9, labelKey: 'setting.sandbox_filesystem_allowRead.label', editorId: 'rule-list', scopes: ['user', 'project', 'local', 'managed'], mergeBehavior: 'merge-array' },
    'sandbox.filesystem.disabled': { category: 'sandbox', order: 10, labelKey: 'setting.sandbox_filesystem_disabled.label', scopes: ['user', 'managed'] },
    'sandbox.filesystem.allowManagedReadPathsOnly': { category: 'sandbox', order: 11, labelKey: 'setting.sandbox_filesystem_allowManagedReadPathsOnly.label', scopes: ['managed'], managedOnly: true },
    'sandbox.network.allowedDomains': { category: 'sandbox', order: 12, labelKey: 'setting.sandbox_network_allowedDomains.label', editorId: 'rule-list', scopes: ['user', 'project', 'local', 'managed'], mergeBehavior: 'merge-array' },
    'sandbox.network.deniedDomains': { category: 'sandbox', order: 13, labelKey: 'setting.sandbox_network_deniedDomains.label', editorId: 'rule-list', scopes: ['user', 'project', 'local', 'managed'], mergeBehavior: 'merge-array' },
    'sandbox.network.strictAllowlist': { category: 'sandbox', order: 14, labelKey: 'setting.sandbox_network_strictAllowlist.label', scopes: ['user', 'managed'] },
    'sandbox.network.allowAllUnixSockets': { category: 'sandbox', order: 15, labelKey: 'setting.sandbox_network_allowAllUnixSockets.label', scopes: ['user', 'project', 'local', 'managed'] },
    'sandbox.network.allowLocalBinding': { category: 'sandbox', order: 16, labelKey: 'setting.sandbox_network_allowLocalBinding.label', scopes: ['user', 'project', 'local', 'managed'] },

    // --- Environment Variables ---
    'env': { category: 'env', order: 1, labelKey: 'setting.env.label', editorId: 'env-map', scopes: ['user', 'project', 'local', 'managed'], mergeBehavior: 'merge-map' },

    // --- Models & Workflows ---
    'model': { category: 'models', order: 1, labelKey: 'setting.model.label', scopes: ['user', 'project', 'local', 'managed'] },
    'advisorModel': { category: 'models', order: 2, labelKey: 'setting.advisorModel.label', scopes: ['user', 'project', 'local', 'managed'] },
    'fallbackModel': { category: 'models', order: 3, labelKey: 'setting.fallbackModel.label', editorId: 'fallback-models', scopes: ['user', 'project', 'local', 'managed'] },
    'availableModels': { category: 'models', order: 4, labelKey: 'setting.availableModels.label', editorId: 'rule-list', scopes: ['user', 'managed'] },
    'enforceAvailableModels': { category: 'models', order: 5, labelKey: 'setting.enforceAvailableModels.label', scopes: ['managed'], managedOnly: true },
    'modelOverrides': { category: 'models', order: 6, labelKey: 'setting.modelOverrides.label', editorId: 'structured-json', scopes: ['user', 'project', 'local', 'managed'] },
    'alwaysThinkingEnabled': { category: 'models', order: 7, labelKey: 'setting.alwaysThinkingEnabled.label', scopes: ['user', 'project', 'local', 'managed'] },
    'showThinkingSummaries': { category: 'models', order: 8, labelKey: 'setting.showThinkingSummaries.label', scopes: ['user', 'project', 'local', 'managed'] },
    'fastMode': { category: 'models', order: 9, labelKey: 'setting.fastMode.label', scopes: ['user', 'project', 'local', 'managed'] },
    'fastModePerSessionOptIn': { category: 'models', order: 10, labelKey: 'setting.fastModePerSessionOptIn.label', scopes: ['user', 'managed'] },
    'switchModelsOnFlag': { category: 'models', order: 10.5, labelKey: 'setting.switchModelsOnFlag.label', scopes: ['user', 'project', 'local', 'managed'] },
    'autoCompactEnabled': { category: 'models', order: 11, labelKey: 'setting.autoCompactEnabled.label', scopes: ['user', 'project', 'local', 'managed'] },
    'autoCompactWindow': { category: 'models', order: 11.5, labelKey: 'setting.autoCompactWindow.label', scopes: ['user', 'project', 'local', 'managed'] },
    'autoCompactThreshold': { category: 'models', order: 12, labelKey: 'setting.autoCompactThreshold.label', scopes: ['user', 'project', 'local', 'managed'] },
    'workflowKeywordTriggerEnabled': { category: 'models', order: 12.5, labelKey: 'setting.workflowKeywordTriggerEnabled.label', scopes: ['user', 'project', 'local', 'managed'] },
    'disableWorkflows': { category: 'models', order: 12.6, labelKey: 'setting.disableWorkflows.label', scopes: ['user', 'project', 'local', 'managed'] },
    'workflowSizeGuideline': { category: 'models', order: 13, labelKey: 'setting.workflowSizeGuideline.label', scopes: ['user', 'project', 'local', 'managed'] },
    'teammateMode': { category: 'models', order: 14, labelKey: 'setting.teammateMode.label', scopes: ['user', 'project', 'local', 'managed'] },
    'crossSessionInbound': { category: 'models', order: 15, labelKey: 'setting.crossSessionInbound.label', scopes: ['user', 'project', 'local', 'managed'] },

    // --- Hooks & Status Line ---
    'hooks': { category: 'hooks', order: 1, labelKey: 'setting.hooks.label', editorId: 'hooks', scopes: ['user', 'project', 'local', 'managed'], mergeBehavior: 'merge-hooks' },
    'statusLine': { category: 'hooks', order: 2, labelKey: 'setting.statusLine.label', editorId: 'status-line', scopes: ['user', 'project', 'local', 'managed'] },
    'fileSuggestion': { category: 'hooks', order: 3, labelKey: 'setting.fileSuggestion.label', editorId: 'structured-json', scopes: ['user', 'project', 'local', 'managed'] },
    'disableAllHooks': { category: 'hooks', order: 4, labelKey: 'setting.disableAllHooks.label', scopes: ['user', 'project', 'local', 'managed'] },
    'allowManagedHooksOnly': { category: 'hooks', order: 5, labelKey: 'setting.allowManagedHooksOnly.label', scopes: ['managed'], managedOnly: true },
    'allowedHttpHookUrls': { category: 'hooks', order: 6, labelKey: 'setting.allowedHttpHookUrls.label', editorId: 'rule-list', scopes: ['user', 'project', 'local', 'managed'], mergeBehavior: 'merge-array' },
    'httpHookAllowedEnvVars': { category: 'hooks', order: 7, labelKey: 'setting.httpHookAllowedEnvVars.label', editorId: 'rule-list', scopes: ['user', 'project', 'local', 'managed'], mergeBehavior: 'merge-array' },

    // --- MCP Policies ---
    'enableMcpServers': { category: 'mcp', order: 1, labelKey: 'setting.enableMcpServers.label', scopes: ['user', 'project', 'local', 'managed'] },
    'enabledMcpjsonServers': { category: 'mcp', order: 2, labelKey: 'setting.enabledMcpjsonServers.label', editorId: 'rule-list', scopes: ['user', 'project', 'local', 'managed'] },
    'disabledMcpjsonServers': { category: 'mcp', order: 3, labelKey: 'setting.disabledMcpjsonServers.label', editorId: 'rule-list', scopes: ['user', 'project', 'local', 'managed'] },
    'allowedMcpServers': { category: 'mcp', order: 4, labelKey: 'setting.allowedMcpServers.label', editorId: 'mcp-enterprise', scopes: ['managed'], managedOnly: true },
    'deniedMcpServers': { category: 'mcp', order: 5, labelKey: 'setting.deniedMcpServers.label', editorId: 'mcp-enterprise', scopes: ['managed'], managedOnly: true },

    // --- Worktree & Memory ---
    'worktree.baseRef': { category: 'worktree', order: 1, labelKey: 'setting.worktree_baseRef.label', scopes: ['user', 'project', 'local', 'managed'] },
    'worktree.bgIsolation': { category: 'worktree', order: 2, labelKey: 'setting.worktree_bgIsolation.label', scopes: ['user', 'project', 'local', 'managed'] },
    'worktree.symlinkDirectories': { category: 'worktree', order: 3, labelKey: 'setting.worktree_symlinkDirectories.label', editorId: 'rule-list', scopes: ['user', 'project', 'local', 'managed'], mergeBehavior: 'merge-array' },
    'worktree.sparsePaths': { category: 'worktree', order: 4, labelKey: 'setting.worktree_sparsePaths.label', editorId: 'rule-list', scopes: ['user', 'project', 'local', 'managed'], mergeBehavior: 'merge-array' },
    'autoMemoryEnabled': { category: 'worktree', order: 5, labelKey: 'setting.autoMemoryEnabled.label', scopes: ['user', 'project', 'local', 'managed'] },
    'claudeMdExcludes': { category: 'worktree', order: 6, labelKey: 'setting.claudeMdExcludes.label', editorId: 'rule-list', scopes: ['user', 'project', 'local', 'managed'], mergeBehavior: 'merge-array' },
    'disableRemoteControl': { category: 'worktree', order: 7, labelKey: 'setting.disableRemoteControl.label', scopes: ['user', 'project', 'local', 'managed'] },

    // --- Plugins & Marketplaces ---
    'channelsEnabled': { category: 'plugins', order: 1, labelKey: 'setting.channelsEnabled.label', scopes: ['user', 'project', 'local', 'managed'] },
    'enabledPlugins': { category: 'plugins', order: 2, labelKey: 'setting.enabledPlugins.label', editorId: 'plugins', scopes: ['user', 'project', 'local', 'managed'] },
    'pluginConfigs': { category: 'plugins', order: 3, labelKey: 'setting.pluginConfigs.label', editorId: 'structured-json', scopes: ['user', 'managed'] },
    'extraKnownMarketplaces': { category: 'plugins', order: 4, labelKey: 'setting.extraKnownMarketplaces.label', editorId: 'marketplaces', scopes: ['user', 'project', 'local', 'managed'] },
    'strictKnownMarketplaces': { category: 'plugins', order: 5, labelKey: 'setting.strictKnownMarketplaces.label', editorId: 'structured-json', scopes: ['managed'], managedOnly: true },
    'blockedMarketplaces': { category: 'plugins', order: 6, labelKey: 'setting.blockedMarketplaces.label', editorId: 'structured-json', scopes: ['managed'], managedOnly: true },
    'allowedChannelPlugins': { category: 'plugins', order: 7, labelKey: 'setting.allowedChannelPlugins.label', editorId: 'structured-json', scopes: ['managed'], managedOnly: true },
    'skippedMarketplaces': { category: 'plugins', order: 8, labelKey: 'setting.skippedMarketplaces.label', editorId: 'rule-list', scopes: ['user', 'project', 'local', 'managed'] },
    'skippedPlugins': { category: 'plugins', order: 9, labelKey: 'setting.skippedPlugins.label', editorId: 'rule-list', scopes: ['user', 'project', 'local', 'managed'] },
    'strictPluginOnlyCustomization': { category: 'plugins', order: 10, labelKey: 'setting.strictPluginOnlyCustomization.label', editorId: 'rule-list', scopes: ['managed'], managedOnly: true },
    'disableCommandPluginSources': { category: 'plugins', order: 11, labelKey: 'setting.disableCommandPluginSources.label', scopes: ['managed'], managedOnly: true },
    'disableSideloadFlags': { category: 'plugins', order: 12, labelKey: 'setting.disableSideloadFlags.label', scopes: ['managed'], managedOnly: true },

    // --- Managed Policies & Advanced ---
    'forceLoginMethod': { category: 'advanced', order: 1, labelKey: 'setting.forceLoginMethod.label', scopes: ['managed'], managedOnly: true },
    'forceLoginOrgUUID': { category: 'advanced', order: 2, labelKey: 'setting.forceLoginOrgUUID.label', editorId: 'union-input', scopes: ['managed'], managedOnly: true },
    'forceLoginGatewayUrl': { category: 'advanced', order: 3, labelKey: 'setting.forceLoginGatewayUrl.label', scopes: ['managed'], managedOnly: true },
    'parentSettingsBehavior': { category: 'advanced', order: 4, labelKey: 'setting.parentSettingsBehavior.label', scopes: ['managed'], managedOnly: true },
    'requiredMinimumVersion': { category: 'advanced', order: 5, labelKey: 'setting.requiredMinimumVersion.label', scopes: ['managed'], managedOnly: true },
    'forceRemoteSettingsRefresh': { category: 'advanced', order: 6, labelKey: 'setting.forceRemoteSettingsRefresh.label', scopes: ['managed'], managedOnly: true },
    'companyAnnouncements': { category: 'advanced', order: 7, labelKey: 'setting.companyAnnouncements.label', editorId: 'rule-list', scopes: ['managed'], managedOnly: true },
    'companyPolicyUrl': { category: 'advanced', order: 8, labelKey: 'setting.companyPolicyUrl.label', scopes: ['managed'], managedOnly: true },
    'companyPolicyName': { category: 'advanced', order: 9, labelKey: 'setting.companyPolicyName.label', scopes: ['managed'], managedOnly: true },
    'companyPolicyHeader': { category: 'advanced', order: 10, labelKey: 'setting.companyPolicyHeader.label', scopes: ['managed'], managedOnly: true },
    'companyPolicyFooter': { category: 'advanced', order: 11, labelKey: 'setting.companyPolicyFooter.label', scopes: ['managed'], managedOnly: true },
    'footerLinksRegexes': { category: 'advanced', order: 12, labelKey: 'setting.footerLinksRegexes.label', editorId: 'rule-list', scopes: ['managed'], managedOnly: true },
    'voice': { category: 'advanced', order: 13, labelKey: 'setting.voice.label', editorId: 'structured-json', scopes: ['user', 'project', 'local', 'managed'] },
    'ssh': { category: 'advanced', order: 14, labelKey: 'setting.ssh.label', editorId: 'structured-json', scopes: ['user', 'project', 'local', 'managed'] },
    'otel': { category: 'advanced', order: 15, labelKey: 'setting.otel.label', editorId: 'structured-json', scopes: ['user', 'project', 'local', 'managed'] },
    'policy': { category: 'advanced', order: 16, labelKey: 'setting.policy.label', editorId: 'structured-json', scopes: ['user', 'project', 'local', 'managed'] }
  };

  let activeSchemaAdapter = schemaModule && initialRawSchema ? schemaModule.createSchemaAdapter(initialRawSchema) : null;

  function setSchemaAdapter(adapter) {
    activeSchemaAdapter = adapter;
  }

  function getSchemaAdapter() {
    return activeSchemaAdapter;
  }

  function getScopeDefinition(scopeId) {
    return SCOPES[scopeId] || null;
  }

  function getCategoryDefinition(categoryId) {
    return CATEGORIES.find(c => c.id === categoryId) || null;
  }

  function inferCategoryForPath(path) {
    if (!path) return 'general';
    if (path.startsWith('permissions.')) return 'permissions';
    if (path.startsWith('sandbox.')) return 'sandbox';
    if (path.startsWith('worktree.')) return 'worktree';
    if (path.startsWith('env.')) return 'env';
    return 'general';
  }

  function isDedicatedEnvKey(key) {
    return DEDICATED_ENV_KEYS.has(key);
  }

  function isSettingSupportedInScope(path, scopeId) {
    const def = getSettingDefinition(path);
    if (!def || !Array.isArray(def.scopes)) return true;
    return def.scopes.includes(scopeId);
  }

  /**
   * Returns merged schema definition + presentation metadata for a setting path.
   */
  function getSettingDefinition(path) {
    if (path && path.startsWith('env.')) {
      const envKey = path.slice(4);
      return {
        path,
        name: envKey,
        type: 'string',
        description: `Environment variable override for ${envKey}`,
        category: 'models',
        order: 999,
        labelKey: `setting.env_${envKey}.label`,
        label: envKey,
        scopes: ['user', 'project', 'local', 'managed'],
        scopeNotes: null,
        managedOnly: false,
        editorId: null,
        allowCustom: false,
        mergeBehavior: null
      };
    }

    const presentation = PRESENTATION_CATALOG[path] || {};
    let schemaDef = activeSchemaAdapter ? activeSchemaAdapter.getDefinition(path) : null;

    if (!schemaDef) {
      schemaDef = {
        path,
        name: path ? path.split('.').pop() : '',
        type: 'string',
        description: ''
      };
    }

    const merged = {
      path,
      name: schemaDef.name,
      type: schemaDef.type,
      description: schemaDef.description,
      default: schemaDef.default,
      enum: schemaDef.enum,
      const: schemaDef.const,
      required: schemaDef.required,
      minimum: schemaDef.minimum,
      maximum: schemaDef.maximum,
      exclusiveMinimum: schemaDef.exclusiveMinimum,
      exclusiveMaximum: schemaDef.exclusiveMaximum,
      minLength: schemaDef.minLength,
      maxLength: schemaDef.maxLength,
      pattern: schemaDef.pattern,
      format: schemaDef.format,
      items: schemaDef.items,
      additionalProperties: schemaDef.additionalProperties,
      anyOf: schemaDef.anyOf,
      oneOf: schemaDef.oneOf,
      category: presentation.category || inferCategoryForPath(path),
      order: presentation.order !== undefined ? presentation.order : 999,
      labelKey: presentation.labelKey || `setting.${path ? path.replace(/\./g, '_') : ''}.label`,
      label: presentation.label || path,
      scopes: presentation.scopes || ['user', 'project', 'local', 'managed'],
      scopeNotes: presentation.scopeNotes || null,
      managedOnly: Boolean(presentation.managedOnly),
      editorId: presentation.editorId || null,
      allowCustom: Boolean(presentation.allowCustom),
      mergeBehavior: presentation.mergeBehavior || null
    };

    return merged;
  }

  function getAllSettings() {
    const allPaths = activeSchemaAdapter
      ? activeSchemaAdapter.getAllPaths()
      : Object.keys(PRESENTATION_CATALOG);

    return allPaths.map(getSettingDefinition).sort((a, b) => {
      if (a.category !== b.category) {
        const catA = getCategoryDefinition(a.category);
        const catB = getCategoryDefinition(b.category);
        const orderA = catA ? catA.order : 99;
        const orderB = catB ? catB.order : 99;
        return orderA - orderB;
      }
      return a.order - b.order;
    });
  }

  function getSettingsByCategory(categoryId) {
    return getAllSettings().filter(s => s.category === categoryId);
  }

  const CATALOG = Object.keys(PRESENTATION_CATALOG).map(getSettingDefinition);

  return {
    CATALOG,
    CATEGORIES,
    PRESENTATION_CATALOG,
    SCOPES,
    getAllSettings,
    getCategoryDefinition,
    getDefinition: getSettingDefinition,
    getSchemaAdapter,
    getScopeDefinition,
    getSettingDefinition,
    getSettingsByCategory,
    isDedicatedEnvKey,
    isSettingSupportedInScope,
    setSchemaAdapter
  };
});
