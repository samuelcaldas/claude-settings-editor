(function exposeSettingsModel(root, factory) {
  let catalog = null;
  if (typeof require === 'function') {
    try {
      catalog = require('./settings-catalog.js');
    } catch (_) {
      // catalog optional in minimal tests
    }
  }
  if (!catalog && root && root.SettingsCatalog) {
    catalog = root.SettingsCatalog;
  }
  const api = factory(catalog);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SettingsModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSettingsModel(catalogModule) {
  'use strict';

  const UNSAFE_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);
  const SECRET_KEY_PATTERN = /(api[_-]?key|auth[_-]?token|access[_-]?token|secret|password|private[_-]?key|credential)/i;

  const DEFAULT_ENUMS = {
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
    dialogExpiry: ['never', '60s', '5m', '10m']
  };

  const KNOWN_SHAPES = [
    ['env', 'object'],
    ['permissions', 'object'],
    ['sandbox', 'object'],
    ['worktree', 'object'],
    ['statusLine', 'object'],
    ['fallbackModel', 'array'],
    ['enabledPlugins', 'object'],
    ['pluginConfigs', 'object'],
    ['hooks', 'object'],
    ['extraKnownMarketplaces', 'object'],
    ['strictKnownMarketplaces', 'array'],
    ['blockedMarketplaces', 'array'],
    ['allowedMcpServers', 'array'],
    ['deniedMcpServers', 'array'],
    ['enabledMcpjsonServers', 'array'],
    ['disabledMcpjsonServers', 'array'],
    ['companyAnnouncements', 'array'],
    ['footerLinksRegexes', 'array'],
    ['availableModels', 'array'],
    ['modelOverrides', 'object']
  ];

  function getEnumListForPath(path) {
    if (catalogModule && typeof catalogModule.getSettingDefinition === 'function') {
      const def = catalogModule.getSettingDefinition(path);
      if (def && Array.isArray(def.enum)) return def.enum;
    }
    return DEFAULT_ENUMS[path] || null;
  }

  function isPlainObject(value) {
    if (value === null || typeof value !== 'object') return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function clone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function deepEqual(a, b) {
    if (a === b) return true;
    if (a === null || typeof a !== 'object' || b === null || typeof b !== 'object') return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (let i = 0; i < keysA.length; i++) {
      const k = keysA[i];
      if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
      if (!deepEqual(a[k], b[k])) return false;
    }
    return true;
  }

  function normalizePath(path) {
    const segments = Array.isArray(path) ? path : String(path || '').split('.').filter(Boolean);
    segments.forEach(validateSegment);
    return segments.map(String);
  }

  function validateSegment(segment) {
    if (UNSAFE_SEGMENTS.has(String(segment))) {
      throw new Error('Unsafe JSON path segment: ' + segment);
    }
    if (String(segment).length === 0) throw new Error('JSON path segment cannot be empty');
  }

  function parseSettingsJson(source, options) {
    const maxBytes = options && options.maxBytes ? options.maxBytes : 5 * 1024 * 1024;
    if (typeof source !== 'string') return invalidResult('JSON source must be text');
    if (new TextEncoder().encode(source).length > maxBytes) return invalidResult('JSON source exceeds 5 MB');
    let value;
    try {
      value = JSON.parse(source);
    } catch (err) {
      return invalidResult('JSON parse error: ' + err.message);
    }
    if (!isPlainObject(value)) {
      return invalidResult('Settings document root must be a JSON object');
    }
    const validation = validateSettingsDocument(value, options && options.targetScope, options && options.schemaAdapter);
    return {
      ok: validation.ok,
      value,
      diagnostics: validation.diagnostics
    };
  }

  function serializeSettings(value) {
    if (!value || typeof value !== 'object') {
      return JSON.stringify(value || {}, null, 2) + '\n';
    }
    let output = value;
    if (Array.isArray(value.fallbackModel) && value.fallbackModel.length > 3) {
      output = clone(value);
      output.fallbackModel = value.fallbackModel.slice(0, 3);
    }
    return JSON.stringify(output, null, 2) + '\n';
  }

  function invalidResult(message) {
    return {
      ok: false,
      value: null,
      diagnostics: [{ severity: 'error', path: '', message }]
    };
  }

  function inspectSettings(value, targetScope, schemaAdapter) {
    const diagnostics = [];
    if (!isPlainObject(value)) {
      diagnostics.push({ severity: 'error', path: '', message: 'Root must be a JSON object' });
      return diagnostics;
    }

    if (schemaAdapter && typeof schemaAdapter.validate === 'function') {
      const schemaResult = schemaAdapter.validate(value);
      if (schemaResult && Array.isArray(schemaResult.errors)) {
        schemaResult.errors.forEach(err => {
          diagnostics.push({
            severity: 'error',
            path: err.path,
            message: err.message,
            keyword: err.keyword
          });
        });
      }
    } else {
      KNOWN_SHAPES.forEach(([propPath, expectedType]) => {
        const current = getAtPath(value, propPath);
        if (current === undefined) return;
        if (expectedType === 'object' && (!isPlainObject(current) || Array.isArray(current))) {
          diagnostics.push({ severity: 'error', path: propPath, message: `${propPath} must be an object` });
        } else if (expectedType === 'array' && !Array.isArray(current)) {
          diagnostics.push({ severity: 'error', path: propPath, message: `${propPath} must be an array` });
        }
      });

      const checkEnum = (path) => {
        const allowed = getEnumListForPath(path);
        if (allowed) {
          const val = getAtPath(value, path);
          if (val !== undefined && !allowed.includes(val)) {
            diagnostics.push({
              severity: 'warning',
              path,
              message: `Unknown value "${val}" for ${path}. Valid options: ${allowed.join(', ')}`
            });
          }
        }
      };

      ['theme', 'tui', 'editorMode', 'effortLevel', 'preferredNotifChannel', 'worktree.baseRef', 'worktree.bgIsolation', 'viewMode', 'teammateMode', 'workflowSizeGuideline', 'autoUpdatesChannel', 'forceLoginMethod', 'parentSettingsBehavior', 'defaultShell', 'crossSessionInbound', 'askUserQuestionTimeout', 'dialogExpiry', 'permissions.defaultMode'].forEach(checkEnum);

      inspectHooks(value, diagnostics);
      inspectPermissions(value, diagnostics);
      inspectSandbox(value, diagnostics);
    }

    const fallbackList = getAtPath(value, 'fallbackModel');
    if (Array.isArray(fallbackList) && fallbackList.length > 3) {
      diagnostics.push({
        severity: 'warning',
        path: 'fallbackModel',
        message: 'fallbackModel accepts a maximum of 3 models; additional entries are ignored.'
      });
    }

    if (targetScope) {
      inspectScope(value, targetScope, diagnostics);
    }

    const seen = new Set();
    const uniqueDiagnostics = [];
    for (const d of diagnostics) {
      const key = `${d.severity}:${d.path}:${d.message}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueDiagnostics.push(d);
      }
    }

    return uniqueDiagnostics;
  }

  function validateSettingsDocument(value, targetScope, schemaAdapter) {
    if (!isPlainObject(value)) {
      return {
        ok: false,
        diagnostics: [{ severity: 'error', path: '', message: 'Settings root must be a JSON object' }]
      };
    }
    const diagnostics = inspectSettings(value, targetScope, schemaAdapter);
    const errors = diagnostics.filter(item => item.severity === 'error');
    return {
      ok: errors.length === 0,
      diagnostics
    };
  }

  function inspectHooks(value, diagnostics) {
    if (!('hooks' in value) || !isPlainObject(value.hooks)) return;
    Object.entries(value.hooks).forEach(([eventName, groups]) => {
      if (!Array.isArray(groups)) {
        diagnostics.push({ severity: 'error', path: 'hooks.' + eventName, message: 'Hook event must be an array of matcher groups' });
        return;
      }
      groups.forEach((group, index) => {
        if (!isPlainObject(group)) {
          diagnostics.push({ severity: 'warning', path: 'hooks.' + eventName + '.' + index, message: 'Unsupported hook group preserved' });
          return;
        }
        if ('hooks' in group && !Array.isArray(group.hooks)) {
          diagnostics.push({ severity: 'warning', path: 'hooks.' + eventName + '.' + index + '.hooks', message: 'Hook handlers must be an array; value preserved' });
        }
      });
    });
  }

  function inspectPermissions(value, diagnostics) {
    if (!('permissions' in value) || !isPlainObject(value.permissions)) return;
    ['allow', 'ask', 'deny', 'additionalDirectories'].forEach(key => {
      if (key in value.permissions && !Array.isArray(value.permissions[key])) {
        diagnostics.push({ severity: 'error', path: 'permissions.' + key, message: 'permissions.' + key + ' must be an array of rule strings' });
      }
    });
  }

  function inspectSandbox(value, diagnostics) {
    if (!('sandbox' in value) || !isPlainObject(value.sandbox)) return;
    const sb = value.sandbox;
    if (sb.filesystem && !isPlainObject(sb.filesystem)) {
      diagnostics.push({ severity: 'error', path: 'sandbox.filesystem', message: 'sandbox.filesystem must be an object' });
    }
    if (sb.network && !isPlainObject(sb.network)) {
      diagnostics.push({ severity: 'error', path: 'sandbox.network', message: 'sandbox.network must be an object' });
    }
  }

  function inspectScope(value, targetScope, diagnostics) {
    if (!targetScope) return;

    if (targetScope === 'project' || targetScope === 'local') {
      if (value.claudeMd !== undefined) {
        diagnostics.push({
          severity: 'warning',
          path: 'claudeMd',
          message: 'claudeMd is only honored in Managed scope; it is ignored in Project and Local settings.'
        });
      }
      if (value.pluginConfigs !== undefined) {
        diagnostics.push({
          severity: 'warning',
          path: 'pluginConfigs',
          message: 'pluginConfigs is ignored in Project and Local settings for security.'
        });
      }
      if (value.askUserQuestionTimeout !== undefined) {
        diagnostics.push({
          severity: 'warning',
          path: 'askUserQuestionTimeout',
          message: 'askUserQuestionTimeout is not read from Project or Local settings.'
        });
      }
      if (value.permissions && value.permissions.defaultMode === 'auto') {
        diagnostics.push({
          severity: 'warning',
          path: 'permissions.defaultMode',
          message: 'auto permission mode is ignored in Project and Local settings.'
        });
      }
      if (value.allowManagedPermissionRulesOnly !== undefined) {
        diagnostics.push({
          severity: 'warning',
          path: 'allowManagedPermissionRulesOnly',
          message: 'allowManagedPermissionRulesOnly is only supported in Managed scope.'
        });
      }
    }

    if (targetScope === 'managed') {
      if (value.allowManagedPermissionRulesOnly !== undefined && typeof value.allowManagedPermissionRulesOnly !== 'boolean') {
        diagnostics.push({
          severity: 'error',
          path: 'allowManagedPermissionRulesOnly',
          message: 'allowManagedPermissionRulesOnly must be a boolean'
        });
      }
    }
  }

  function getAtPath(doc, path) {
    if (!doc || typeof doc !== 'object') return undefined;
    const segments = normalizePath(path);
    let current = doc;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (current === null || typeof current !== 'object' || !(seg in current)) {
        return undefined;
      }
      current = current[seg];
    }
    return current;
  }

  function setAtPath(doc, path, value) {
    const segments = normalizePath(path);
    if (segments.length === 0) return clone(value);

    const root = clone(doc || {});
    let current = root;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      const nextSeg = segments[i + 1];
      const isNextNumeric = /^\d+$/.test(nextSeg);

      if (!(seg in current) || current[seg] === null || typeof current[seg] !== 'object') {
        current[seg] = isNextNumeric ? [] : {};
      }
      current = current[seg];
    }

    const lastSeg = segments[segments.length - 1];
    if (Array.isArray(current) && /^\d+$/.test(lastSeg)) {
      current[parseInt(lastSeg, 10)] = clone(value);
    } else {
      current[lastSeg] = clone(value);
    }

    return root;
  }

  function deleteAtPath(doc, path) {
    const segments = normalizePath(path);
    if (segments.length === 0) return {};
    const root = clone(doc || {});
    let current = root;

    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      if (current === null || typeof current !== 'object' || !(seg in current)) {
        return root;
      }
      current = current[seg];
    }

    const lastSeg = segments[segments.length - 1];
    if (Array.isArray(current) && /^\d+$/.test(lastSeg)) {
      current.splice(parseInt(lastSeg, 10), 1);
    } else if (isPlainObject(current)) {
      delete current[lastSeg];
    }

    return root;
  }

  function moveAtPath(doc, arrayPath, fromIndex, toIndex) {
    const arr = getAtPath(doc, arrayPath);
    if (!Array.isArray(arr)) return clone(doc);
    if (fromIndex < 0 || fromIndex >= arr.length || toIndex < 0 || toIndex >= arr.length) {
      return clone(doc);
    }
    const newArr = [...arr];
    const [item] = newArr.splice(fromIndex, 1);
    newArr.splice(toIndex, 0, item);
    return setAtPath(doc, arrayPath, newArr);
  }

  function renameKeyAtPath(doc, mapPath, oldKey, newKey) {
    if (!oldKey || !newKey || oldKey === newKey) return clone(doc);
    if (UNSAFE_SEGMENTS.has(String(newKey))) {
      throw new Error('Unsafe key name: ' + newKey);
    }
    validateSegment(newKey);
    const map = getAtPath(doc, mapPath);
    if (!isPlainObject(map) || !(oldKey in map)) return clone(doc);

    const root = clone(doc || {});
    const targetMap = getAtPath(root, mapPath);
    const val = targetMap[oldKey];
    delete targetMap[oldKey];
    targetMap[newKey] = val;
    return root;
  }

  function batchPatches(doc, patches) {
    let current = clone(doc || {});
    if (!Array.isArray(patches)) return current;
    for (const patch of patches) {
      if (!patch || typeof patch !== 'object') continue;
      if (patch.op === 'set') {
        current = setAtPath(current, patch.path, patch.value);
      } else if (patch.op === 'delete') {
        current = deleteAtPath(current, patch.path);
      } else if (patch.op === 'move') {
        current = moveAtPath(current, patch.path, patch.fromIndex, patch.toIndex);
      } else if (patch.op === 'renameKey' || patch.op === 'rename_key') {
        current = renameKeyAtPath(current, patch.path, patch.oldKey || patch.fromKey, patch.newKey || patch.toKey);
      }
    }
    return current;
  }

  function redactSecrets(doc) {
    if (!doc || typeof doc !== 'object') return doc;
    const cloned = clone(doc);

    function walk(node) {
      if (Array.isArray(node)) {
        node.forEach(walk);
      } else if (isPlainObject(node)) {
        Object.keys(node).forEach(k => {
          if (SECRET_KEY_PATTERN.test(k) && typeof node[k] === 'string' && node[k].length > 0) {
            node[k] = '[redacted]';
          } else {
            walk(node[k]);
          }
        });
      }
    }

    walk(cloned);
    return cloned;
  }

  function buildOpenAiModelsUrl(baseUrl) {
    if (!baseUrl || typeof baseUrl !== 'string') return '';
    const trimmed = baseUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return '';
    const cleanBase = trimmed.replace(/\/+$/, '');
    if (cleanBase.endsWith('/models')) return cleanBase;
    if (cleanBase.endsWith('/v1')) return cleanBase + '/models';
    return cleanBase + '/v1/models';
  }

  function buildOpenAiChatCompletionsUrl(baseUrl) {
    if (!baseUrl || typeof baseUrl !== 'string') return '';
    const trimmed = baseUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return '';
    let cleanBase = trimmed.replace(/\/+$/, '');
    if (cleanBase.endsWith('/chat/completions')) return cleanBase;
    if (cleanBase.endsWith('/models')) {
      cleanBase = cleanBase.slice(0, -'/models'.length);
    }
    if (cleanBase.endsWith('/v1')) return cleanBase + '/chat/completions';
    return cleanBase + '/v1/chat/completions';
  }

  function createDescriptionPrompt(tierKey, modelId, displayName) {
    const tier = tierKey || 'custom';
    const id = modelId || tier;
    const name = displayName || id;

    return {
      messages: [
        {
          role: 'system',
          content: 'You are a concise technical assistant describing AI models for Claude Code settings. Return ONLY a single concise, punchy sentence (under 70 characters) describing the model strengths and tier role. Do not use quotes, prefixes, or markdown.'
        },
        {
          role: 'user',
          content: `Generate a 1-sentence description for model "${id}" (${name}) in the ${tier} tier.`
        }
      ],
      max_tokens: 60,
      temperature: 0.3
    };
  }

  function parseOpenAiModelsResponse(input) {
    if (!input) return [];
    let json = input;
    if (typeof input === 'string') {
      try {
        json = JSON.parse(input);
      } catch (_) {
        return [];
      }
    }
    if (!json || typeof json !== 'object') return [];
    let items = [];
    if (Array.isArray(json.data)) {
      items = json.data.map(m => (typeof m === 'string' ? m : m.id || m.model || m.name)).filter(Boolean);
    } else if (Array.isArray(json.models)) {
      items = json.models.map(m => (typeof m === 'string' ? m : m.name || m.id || m.model)).filter(Boolean);
    } else if (Array.isArray(json)) {
      items = json.map(m => (typeof m === 'string' ? m : m.id || m.model || m.name)).filter(Boolean);
    }
    return Array.from(new Set(items)).sort();
  }

  function getDefaultKnownModels() {
    return [
      'claude-3-7-sonnet-20250219',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-sonnet-5',
      'claude-fable-5',
      'claude-haiku-4-5-20251001',
      'gpt-4o',
      'gpt-4o-mini',
      'o3-mini',
      'gemini-2.0-flash'
    ];
  }

  const KNOWN_CLAUDE_ENV_VARS = Object.freeze({
  "ANTHROPIC_API_KEY": "API key for Anthropic API authentication",
  "ANTHROPIC_AUTH_TOKEN": "Custom Authorization header bearer token for API requests",
  "ANTHROPIC_AWS_API_KEY": "Workspace API key for Claude Platform on AWS; takes precedence over SigV4 authentication. See https://code.claude.com/docs/en/claude-platform-on-aws#1-configure-aws-credentials",
  "ANTHROPIC_AWS_BASE_URL": "Override the Claude Platform on AWS endpoint URL. Default is https://aws-external-anthropic.{region}.api.aws. See https://code.claude.com/docs/en/claude-platform-on-aws#route-through-a-corporate-proxy",
  "ANTHROPIC_AWS_WORKSPACE_ID": "Required workspace ID for Claude Platform on AWS; sent as the anthropic-workspace-id header on every request. See https://code.claude.com/docs/en/claude-platform-on-aws#2-configure-claude-code",
  "ANTHROPIC_BASE_URL": "Override API endpoint URL for proxy or gateway routing",
  "ANTHROPIC_BEDROCK_BASE_URL": "Override Amazon Bedrock endpoint URL",
  "ANTHROPIC_BEDROCK_MANTLE_BASE_URL": "Override Bedrock Mantle endpoint URL",
  "ANTHROPIC_BEDROCK_SERVICE_TIER": "Select Bedrock service tier; sent as X-Amzn-Bedrock-Service-Tier header. See https://code.claude.com/docs/en/amazon-bedrock#service-tiers",
  "ANTHROPIC_BETAS": "Comma-separated beta header values to include in API requests",
  "ANTHROPIC_CUSTOM_HEADERS": "Custom HTTP headers for API requests (newline-separated 'Name: Value' pairs)",
  "ANTHROPIC_CUSTOM_MODEL_OPTION": "Custom model ID to add as an entry in the model picker",
  "ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION": "Display description for the custom model in the model picker",
  "ANTHROPIC_CUSTOM_MODEL_OPTION_NAME": "Display name for the custom model in the model picker",
  "ANTHROPIC_CUSTOM_MODEL_OPTION_SUPPORTED_CAPABILITIES": "JSON object specifying capability flags for the custom model",
  "ANTHROPIC_DEFAULT_FABLE_MODEL": "Override the default Fable-class model ID. See https://code.claude.com/docs/en/model-config#environment-variables",
  "ANTHROPIC_DEFAULT_FABLE_MODEL_DESCRIPTION": "Display description shown for the Fable model in the model picker. See https://code.claude.com/docs/en/model-config#customize-pinned-model-display-and-capabilities",
  "ANTHROPIC_DEFAULT_FABLE_MODEL_NAME": "Display name shown for the Fable model in the model picker. See https://code.claude.com/docs/en/model-config#customize-pinned-model-display-and-capabilities",
  "ANTHROPIC_DEFAULT_FABLE_MODEL_SUPPORTED_CAPABILITIES": "Comma-separated list of capabilities the pinned Fable model supports. See https://code.claude.com/docs/en/model-config#customize-pinned-model-display-and-capabilities",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL": "Override default Haiku model ID",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL_DESCRIPTION": "Display description shown for the Haiku model in the model picker. See https://code.claude.com/docs/en/model-config#customize-pinned-model-display-and-capabilities",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME": "Display name shown for the Haiku model in the model picker. See https://code.claude.com/docs/en/model-config#customize-pinned-model-display-and-capabilities",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES": "Comma-separated list of capabilities the pinned Haiku model supports. See https://code.claude.com/docs/en/model-config#customize-pinned-model-display-and-capabilities",
  "ANTHROPIC_DEFAULT_OPUS_MODEL": "Override default Opus model ID",
  "ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION": "Display description shown for the Opus model in the model picker. See https://code.claude.com/docs/en/model-config#customize-pinned-model-display-and-capabilities",
  "ANTHROPIC_DEFAULT_OPUS_MODEL_NAME": "Display name shown for the Opus model in the model picker. See https://code.claude.com/docs/en/model-config#customize-pinned-model-display-and-capabilities",
  "ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES": "Comma-separated list of capabilities the pinned Opus model supports. See https://code.claude.com/docs/en/model-config#customize-pinned-model-display-and-capabilities",
  "ANTHROPIC_DEFAULT_SONNET_MODEL": "Override default Sonnet model ID",
  "ANTHROPIC_DEFAULT_SONNET_MODEL_DESCRIPTION": "Display description shown for the Sonnet model in the model picker. See https://code.claude.com/docs/en/model-config#customize-pinned-model-display-and-capabilities",
  "ANTHROPIC_DEFAULT_SONNET_MODEL_NAME": "Display name shown for the Sonnet model in the model picker. See https://code.claude.com/docs/en/model-config#customize-pinned-model-display-and-capabilities",
  "ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES": "Comma-separated list of capabilities the pinned Sonnet model supports. See https://code.claude.com/docs/en/model-config#customize-pinned-model-display-and-capabilities",
  "ANTHROPIC_FOUNDRY_API_KEY": "Microsoft Foundry authentication key",
  "ANTHROPIC_FOUNDRY_AUTH_TOKEN": "Bearer token for Microsoft Foundry authentication, such as a Microsoft Entra access token. Claude Code sends it as the Authorization: Bearer header. Takes precedence over ANTHROPIC_FOUNDRY_API_KEY and over the Azure default credential chain. Requires Claude Code v2.1.203 or later. See https://code.claude.com/docs/en/microsoft-foundry",
  "ANTHROPIC_FOUNDRY_BASE_URL": "Microsoft Foundry resource URL",
  "ANTHROPIC_FOUNDRY_RESOURCE": "Microsoft Foundry resource name",
  "ANTHROPIC_MODEL": "Model to use (e.g., 'claude-opus-4-1', 'claude-sonnet-4-5-20250514', 'opus', 'sonnet', 'haiku')",
  "ANTHROPIC_SMALL_FAST_MODEL": "DEPRECATED (prefer ANTHROPIC_DEFAULT_HAIKU_MODEL). Haiku-class model to use for background and low-complexity tasks (e.g., 'claude-3-5-haiku-latest')",
  "ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION": "Override the AWS region for the Haiku-class model on Bedrock and Bedrock Mantle. Has no effect without ANTHROPIC_DEFAULT_HAIKU_MODEL (or the deprecated ANTHROPIC_SMALL_FAST_MODEL) set on Bedrock. See https://code.claude.com/docs/en/amazon-bedrock#3-configure-claude-code",
  "ANTHROPIC_VERTEX_BASE_URL": "Override Google Cloud's Agent Platform (formerly Vertex AI) endpoint URL. Use for custom endpoints or when routing through an LLM gateway",
  "ANTHROPIC_VERTEX_PROJECT_ID": "GCP project ID for Google Cloud's Agent Platform (formerly Vertex AI) requests. Overridden by GCLOUD_PROJECT, GOOGLE_CLOUD_PROJECT, or the project in your GOOGLE_APPLICATION_CREDENTIALS credential file",
  "ANTHROPIC_WORKSPACE_ID": "Workspace ID for workload identity federation. Scopes the minted token to a specific workspace when the federation rule covers more than one. See https://code.claude.com/docs/en/env-vars",
  "API_FORCE_IDLE_TIMEOUT": "Override the 5-minute idle timeout for streaming responses (0 disables it). See https://code.claude.com/docs/en/env-vars",
  "API_TIMEOUT_MS": "Timeout for API requests in milliseconds (default: 600000, or 10 minutes; maximum: 2147483647). Increase this when requests time out on slow networks or when routing through a proxy. Values above the maximum overflow the underlying timer and cause requests to fail immediately.",
  "AWS_BEARER_TOKEN_BEDROCK": "Bearer token for Bedrock API authentication",
  "AWS_REGION": "AWS region for Amazon Bedrock and Claude Platform on AWS requests (e.g. us-east-1). See https://code.claude.com/docs/en/amazon-bedrock#3-configure-claude-code",
  "BASH_DEFAULT_TIMEOUT_MS": "Default bash command timeout in milliseconds (default: 120000)",
  "BASH_MAX_OUTPUT_LENGTH": "Maximum bash output characters before truncation",
  "BASH_MAX_TIMEOUT_MS": "Maximum bash command timeout in milliseconds (default: 600000)",
  "BETA_TRACING_ENDPOINT": "Endpoint that, together with ENABLE_BETA_TRACING_DETAILED=1, activates detailed beta tracing spans (e.g. claude_code.hook). See https://code.claude.com/docs/en/monitoring-usage#traces-beta",
  "CCR_FORCE_BUNDLE": "Force local repo bundling for --remote invocations",
  "CLAUDECODE": "Set to 1 in subprocesses Claude Code spawns (Bash and PowerShell tools, tmux sessions, hook commands, status line commands, stdio MCP server subprocesses). IDE extensions also set this in their integrated terminals. To distinguish a direct tool/hook subprocess from a stdio MCP server subprocess, use CLAUDE_CODE_CHILD_SESSION instead. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_AFK_COUNTDOWN_MS": "How many milliseconds before auto-continue the on-screen countdown appears on an unanswered AskUserQuestion dialog. Default 20000 (20 seconds). See CLAUDE_AFK_TIMEOUT_MS. Requires Claude Code v2.1.198 or later. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_AFK_TIMEOUT_MS": "How many milliseconds of idle time before an unanswered AskUserQuestion dialog auto-continues without you. Default 60000 (60 seconds). Requires Claude Code v2.1.198 or later. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS": "Disable built-in subagent types in Agent SDK",
  "CLAUDE_AGENT_SDK_MCP_NO_PREFIX": "Skip 'mcp__<server>__' prefix on MCP tool names in Agent SDK",
  "CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS": "Stall timeout for background subagents in milliseconds (default 600000). The timer resets on each streaming progress event; if no progress arrives within the window the subagent is aborted and the task is marked failed, surfacing any partial result to the parent. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "Context capacity percentage threshold for auto-compaction (1-100)",
  "CLAUDE_AUTO_BACKGROUND_TASKS": "Force-enable automatic backgrounding of tasks",
  "CLAUDE_AX_SCREEN_READER": "Set to 1 to render screen-reader friendly output: flat text without decorative borders or animations. Set to 0 to force screen-reader mode off even when axScreenReader is true. The --ax-screen-reader flag takes precedence. Requires Claude Code v2.1.181 or later. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR": "Return to original project directory after each bash command",
  "CLAUDE_CLIENT_PRESENCE_FILE": "Path to a file whose existence marks the user as present; while it exists, mobile push notifications are skipped (v2.1.181+). See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_ACCESSIBILITY": "Keep native cursor visible for screen magnifiers and assistive tools",
  "CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD": "Load CLAUDE.md memory files from additional directories",
  "CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT": "Force a full-screen repaint on every frame in fullscreen mode. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_ALWAYS_ENABLE_EFFORT": "Send the effort parameter for all models, not just those with effort enabled by default. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_API_KEY_HELPER_TTL_MS": "Credential helper refresh interval in milliseconds",
  "CLAUDE_CODE_ARTIFACT_AUTO_OPEN": "Set to 0 to stop auto-opening the browser when a new artifact is created. See https://code.claude.com/docs/en/artifacts#create-an-artifact",
  "CLAUDE_CODE_ATTRIBUTION_HEADER": "Include attribution block in the system prompt",
  "CLAUDE_CODE_AUTO_COMPACT_WINDOW": "Context capacity for compaction calculations in tokens",
  "CLAUDE_CODE_AUTO_CONNECT_IDE": "Override automatic IDE connection behavior",
  "CLAUDE_CODE_AWS_CHAIN_RESOLVE_TIMEOUT_MS": "Time in milliseconds Claude Code waits for the AWS default credential provider chain to produce credentials before the request fails with \"AWS default-chain credential resolve timed out\" (default: 60000). Raise it when a step in your chain legitimately needs longer, such as a browser-based SSO sign-in with MFA through a wrapper like aws-vault. Applies wherever Claude Code signs with the default chain. Requires Claude Code v2.1.207 or later. See https://code.claude.com/docs/en/amazon-bedrock#credential-caching-and-resolution-timeout",
  "CLAUDE_CODE_BRIDGE_SESSION_ID": "Set automatically in Bash tool and hook command subprocesses while the session has an active Remote Control connection, and removed when the connection ends. The value is the session's ID in session_ form, the same identifier that appears in the session's claude.ai/code URL, so a script can link back to the session that ran it. Requires Claude Code v2.1.199 or later. See https://code.claude.com/docs/en/remote-control",
  "CLAUDE_CODE_CERT_STORE": "CA certificate sources (comma-separated: 'bundled', 'system')",
  "CLAUDE_CODE_CHILD_SESSION": "Set by Claude Code to 1 in nested subprocesses (Bash, PowerShell, Monitor, hook commands, status-line commands) to distinguish nested sessions from a top-level claude launched in IDE terminals (v2.1.172+). A nested interactive claude TUI started this way is excluded from --resume, --continue, up-arrow history, and the claude agents list; non-interactive claude -p sessions still persist (override with CLAUDE_CODE_FORCE_SESSION_PERSISTENCE=1). See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_CLIENT_CERT": "Client certificate file path for mutual TLS",
  "CLAUDE_CODE_CLIENT_KEY": "Client private key file path for mutual TLS",
  "CLAUDE_CODE_CLIENT_KEY_PASSPHRASE": "Passphrase for encrypted client private key",
  "CLAUDE_CODE_DEBUG_LOGS_DIR": "Override the debug log file path. Despite the name, this is a file path, not a directory.",
  "CLAUDE_CODE_DEBUG_LOG_LEVEL": "Debug log verbosity level",
  "CLAUDE_CODE_DISABLE_1M_CONTEXT": "Disable 1M context window models",
  "CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING": "Disable adaptive reasoning",
  "CLAUDE_CODE_DISABLE_ADVISOR_TOOL": "Disable the server-side advisor tool. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_DISABLE_AGENT_VIEW": "Turn off background agents and agent view (claude agents, --bg, /background, and the on-demand supervisor). Equivalent to the disableAgentView setting. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN": "Disable alternate screen buffer rendering. When set to 1, keeps conversation in native scrollback instead of fullscreen renderer",
  "CLAUDE_CODE_DISABLE_ARTIFACT": "Disable the Artifact tool. Equivalent to setting disableArtifact. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_DISABLE_ATTACHMENTS": "Disable attachment processing",
  "CLAUDE_CODE_DISABLE_AUTO_MEMORY": "Disable automatic memory feature",
  "CLAUDE_CODE_DISABLE_BACKGROUND_TASKS": "Disable all background task functionality",
  "CLAUDE_CODE_DISABLE_BEDROCK_CONTENT_TYPE_GUARD": "Set to 1 to skip the check that an Amazon Bedrock streaming response carries the application/vnd.amazon.eventstream content-type. Without this variable, a response with a different content-type fails with an error naming that content-type, which means a gateway or proxy is transforming the response. Set it only when the gateway rewrites the Content-Type header but passes the binary event-stream body through unmodified; if the body itself was transformed, requests fail with \"Truncated event message received\" instead. Requires Claude Code v2.1.208 or later. See https://code.claude.com/docs/en/amazon-bedrock#streaming-errors-behind-a-gateway-or-proxy",
  "CLAUDE_CODE_DISABLE_BG_EXIT_HANDOFF": "Set to 1 to stop a background session's running background shell commands, dynamic workflows, and (as of v2.1.198) background subagents when the supervisor stops, restarts, or updates that session's process, instead of handing them off to the session's next process. Affects only that handoff; CLAUDE_DISABLE_ADOPT turns off both. Requires Claude Code v2.1.196 or later. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP": "UNDOCUMENTED. Disable automatic memory-pressure reaping of idle background shell commands (added v2.1.193).",
  "CLAUDE_CODE_DISABLE_BUNDLED_SKILLS": "Disable the skills and workflows bundled with Claude Code (plugins and project .claude/skills are unaffected). See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_DISABLE_CLAUDE_MDS": "Prevent loading CLAUDE.md memory files",
  "CLAUDE_CODE_DISABLE_CRON": "Disable scheduled/cron tasks",
  "CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS": "Strip anthropic-beta headers from API requests. See https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md#21123",
  "CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS": "Set to 1 to disable the built-in Explore and Plan subagents. Requires Claude Code v2.1.198 or later. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_DISABLE_FAST_MODE": "Disable fast mode toggle",
  "CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY": "Disable session quality feedback surveys",
  "CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING": "Disable file checkpointing for /rewind",
  "CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS": "Remove git commit and PR workflow instructions from the system prompt",
  "CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP": "Prevent automatic remapping of legacy model names",
  "CLAUDE_CODE_DISABLE_MOUSE": "Disable mouse tracking in fullscreen mode. See https://code.claude.com/docs/en/fullscreen#keep-native-text-selection",
  "CLAUDE_CODE_DISABLE_MOUSE_CLICKS": "Disable mouse click/drag/hover in fullscreen mode while keeping wheel scroll (requires v2.1.195+). CLAUDE_CODE_DISABLE_MOUSE takes precedence when both variables are set. See https://code.claude.com/docs/en/fullscreen#keep-native-text-selection",
  "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "Disable auto-update checks, telemetry, and feedback in one setting",
  "CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK": "Disable fallback to non-streaming API mode",
  "CLAUDE_CODE_DISABLE_NOTIFICATION_PRESENCE_CHECK": "Set to 1 to send desktop notifications from the PushNotification tool even while focused on the terminal. Requires Claude Code v2.1.193 or later. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL": "Skip automatic installation of official marketplace plugins. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_DISABLE_POLICY_SKILLS": "Skip loading system-wide policy skills. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_DISABLE_TERMINAL_TITLE": "Disable terminal title updates",
  "CLAUDE_CODE_DISABLE_THINKING": "Force-disable extended thinking",
  "CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL": "Disable virtual scrolling in fullscreen mode",
  "CLAUDE_CODE_DISABLE_WORKFLOWS": "Set to 1 to disable workflows. Equivalent to the disableWorkflows setting. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_EFFORT_LEVEL": "Reasoning effort level",
  "CLAUDE_CODE_ENABLE_APPEND_SUBAGENT_PROMPT": "Set to 1 to enable appending extra text to the end of every subagent's system prompt. The --append-subagent-system-prompt flag supplies the appended text and sets this variable automatically, so you do not need to set it yourself. Requires Claude Code v2.1.205 or later. See https://code.claude.com/docs/en/sub-agents",
  "CLAUDE_CODE_ENABLE_AUTO_MODE": "Set to 1 to make auto mode available on Amazon Bedrock, Google Cloud Vertex AI, and Microsoft Foundry (requires v2.1.158+; no effect on the Anthropic API where auto mode is available by default). See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_ENABLE_AWAY_SUMMARY": "Override session recap/away summary availability",
  "CLAUDE_CODE_ENABLE_BACKGROUND_PLUGIN_REFRESH": "Refresh plugins at turn boundaries. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL": "Enable feedback survey collection via OpenTelemetry for enterprises",
  "CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING": "Force fine-grained tool output streaming",
  "CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY": "Enable model discovery from LLM gateway /v1/models endpoint when ANTHROPIC_BASE_URL points at an Anthropic-compatible gateway",
  "CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION": "Enable prompt suggestions",
  "CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING": "Enable file checkpointing for a non-interactive CLI run, so `claude -p --resume <session-id> --rewind-files <checkpoint-uuid>` can rewind files. The Agent SDK sets this internally when enable_file_checkpointing (Python) or enableFileCheckpointing (TypeScript) is enabled; the bare CLI never sets it. Without it, a non-interactive rewind fails with \"File rewinding is not enabled\". See https://code.claude.com/docs/en/agent-sdk/file-checkpointing",
  "CLAUDE_CODE_ENABLE_TASKS": "Enable task tracking in non-interactive mode",
  "CLAUDE_CODE_ENABLE_TELEMETRY": "Set to 1 to enable telemetry collection. Required for all OpenTelemetry integration. See https://code.claude.com/docs/en/monitoring-usage#common-configuration-variables",
  "CLAUDE_CODE_ENHANCED_TELEMETRY_BETA": "Enable the enhanced telemetry (tracing) beta. ENABLE_ENHANCED_TELEMETRY_BETA is also accepted. See https://code.claude.com/docs/en/monitoring-usage#traces-beta",
  "CLAUDE_CODE_EXIT_AFTER_STOP_DELAY": "Wait time in milliseconds before auto-exit after stop",
  "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "Enable experimental agent teams feature",
  "CLAUDE_CODE_EXTRA_BODY": "JSON object to merge into every API request body",
  "CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS": "Token limit for file read operations",
  "CLAUDE_CODE_FORCE_SESSION_PERSISTENCE": "Set to 1 to override the automatic exclusion of nested interactive claude TUI sessions from --resume, --continue, up-arrow history, and the claude agents list (requires v2.1.172+). See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_FORCE_STRIKETHROUGH": "Set to 1 to force strikethrough rendering for ~~text~~ in Claude's responses when the terminal supports it but is not auto-detected, such as over SSH without TERM_PROGRAM forwarded. Without this, undetected terminals show the literal ~~ markers. Requires Claude Code v2.1.186 or later. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_FORCE_SYNC_OUTPUT": "Force synchronous output flushing. When set to 1, forces synchronized output on terminals that auto-detection misses (e.g., Emacs eat)",
  "CLAUDE_CODE_FORK_SUBAGENT": "Fork subagent processes in non-interactive sessions. See https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md#21120",
  "CLAUDE_CODE_FORWARD_SUBAGENT_TEXT": "Set to 1 to emit subagent text and thinking blocks in claude -p --output-format stream-json output, the same behavior as the --forward-subagent-text flag. Use the variable when a harness invokes claude and cannot pass the flag itself. Unlike the flag, which exits with an error outside non-interactive mode with stream-json output, the variable is ignored there so that nested invocations keep working when it is set process-wide. Requires Claude Code v2.1.211 or later. See https://code.claude.com/docs/en/sub-agents",
  "CLAUDE_CODE_GIT_BASH_PATH": "Path to Git Bash executable (Windows only)",
  "CLAUDE_CODE_GLOB_HIDDEN": "Include dotfiles/hidden files in Glob results",
  "CLAUDE_CODE_GLOB_NO_IGNORE": "Don't respect .gitignore rules in Glob results",
  "CLAUDE_CODE_GLOB_TIMEOUT_SECONDS": "Glob tool timeout in seconds (default: 20-60)",
  "CLAUDE_CODE_HIDE_CWD": "Hide the working directory in the startup logo. See https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md#21126",
  "CLAUDE_CODE_IDE_HOST_OVERRIDE": "Override IDE connection address",
  "CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL": "Skip automatic IDE extension installation",
  "CLAUDE_CODE_IDE_SKIP_VALID_CHECK": "Skip IDE lockfile validation",
  "CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS": "How many subagents can be running in one session before the Agent tool refuses to spawn another (default: 20). Accepts a positive whole number in plain digits; anything else is ignored, so the variable can adjust the cap but cannot disable it. Requires Claude Code v2.1.217 or later. See https://code.claude.com/docs/en/sub-agents#concurrent-subagent-limit",
  "CLAUDE_CODE_MAX_CONTEXT_TOKENS": "Override context window size in tokens",
  "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "Maximum output tokens per API request",
  "CLAUDE_CODE_MAX_RETRIES": "Maximum API request retry attempts (default: 10)",
  "CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION": "Cap on the number of subagents one session can spawn with the Agent tool (default: 200). When Claude reaches the cap, spawning another subagent fails with an error telling Claude to finish the remaining work directly. Accepts a positive whole number in plain digits with no upper bound; this variable does not take the scientific notation or digit-separator spellings. Anything else is ignored and the default applies, so the cap can be raised but not turned off. Requires Claude Code v2.1.212 or later. See https://code.claude.com/docs/en/sub-agents#session-subagent-limit",
  "CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH": "Number of subagent layers allowed below the main conversation (default: 1). At the default, subagents cannot spawn their own subagents; set 2 or higher to allow it. Accepts a positive whole number in plain digits; anything else is ignored, so the limit can be raised but not turned off. Requires Claude Code v2.1.217 or later. See https://code.claude.com/docs/en/sub-agents#let-subagents-spawn-their-own-subagents",
  "CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY": "Maximum parallel tool executions (default: 10)",
  "CLAUDE_CODE_MAX_TURNS": "Cap the number of agentic turns when no explicit limit is passed. Equivalent to --max-turns, which takes precedence. A non-positive integer is rejected at startup. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION": "Cap on the total number of WebSearch calls one session can make (default: 200). When Claude reaches the cap, further WebSearch calls return a notice telling it to continue with the information it already gathered. Accepts a positive whole number with no upper bound. Anything else is ignored and the default applies, so the cap can be raised but not turned off. Requires Claude Code v2.1.212 or later. See https://code.claude.com/docs/en/tools-reference#websearch-tool-behavior",
  "CLAUDE_CODE_MCP_ALLOWLIST_ENV": "Isolate MCP server environments to allowlisted variables",
  "CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS": "Elapsed time in milliseconds before a still-running MCP tool call moves to a background task (default: 120000, or 2 minutes). Set to 0 to turn automatic backgrounding off. Requires Claude Code v2.1.212 or later. See https://code.claude.com/docs/en/mcp#automatic-backgrounding-of-long-tool-calls",
  "CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT": "Idle timeout in milliseconds for MCP tool calls. When a stdio, HTTP, SSE, WebSocket, or claude.ai connector MCP server sends no response and no progress notification for this long, the tool call aborts with an error instead of waiting for the overall MCP_TOOL_TIMEOUT. Overrides the per-transport defaults of 300000 (5 minutes) for network servers and 1800000 (30 minutes) for stdio servers. Set to 0 to disable the idle check. Values below 1000 are raised to one second, and the value is capped at the effective MCP_TOOL_TIMEOUT. A per-server timeout in .mcp.json of at least 1000 raises that server's idle window to at least the timeout value. Does not apply to IDE servers or SDK in-process servers. Requires Claude Code v2.1.187 or later. Before v2.1.203, stdio servers were exempt from the idle timeout. See https://code.claude.com/docs/en/mcp",
  "CLAUDE_CODE_NATIVE_CURSOR": "Set to 1 to show the terminal's own cursor at the input caret instead of a drawn block. The cursor respects the terminal's blink, shape, and focus settings. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_NEW_INIT": "Use the interactive /init setup flow",
  "CLAUDE_CODE_NO_FLICKER": "Enable fullscreen rendering mode to reduce flicker",
  "CLAUDE_CODE_OAUTH_REFRESH_TOKEN": "OAuth refresh token",
  "CLAUDE_CODE_OAUTH_SCOPES": "OAuth scopes (space-separated)",
  "CLAUDE_CODE_OAUTH_TOKEN": "OAuth access token",
  "CLAUDE_CODE_OTEL_CONTENT_MAX_LENGTH": "Maximum length of content-bearing OpenTelemetry attributes (model responses, tool content, system prompts, raw API bodies), truncation marker included, in UTF-16 code units (default: 61440, i.e. 60 KB). Raise it only if your telemetry backend accepts attribute values larger than 64 KB, or lower it to cut telemetry volume. Requires Claude Code v2.1.214 or later. See https://code.claude.com/docs/en/monitoring-usage#common-configuration-variables",
  "CLAUDE_CODE_OTEL_DIAG_STDERR": "Set to 1 to write OpenTelemetry exporter diagnostic errors to stderr (otherwise shown only with --debug). Requires v2.1.179+. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_OTEL_FLUSH_TIMEOUT_MS": "OpenTelemetry span flush timeout in milliseconds (default: 5000)",
  "CLAUDE_CODE_OTEL_HEADERS_HELPER_DEBOUNCE_MS": "OpenTelemetry header helper refresh interval in milliseconds",
  "CLAUDE_CODE_OTEL_SHUTDOWN_TIMEOUT_MS": "OpenTelemetry shutdown timeout in milliseconds (default: 2000)",
  "CLAUDE_CODE_PACKAGE_MANAGER_AUTO_UPDATE": "Enable automatic package manager updates. When set, Claude Code runs the upgrade command in background on Homebrew/WinGet and prompts to restart",
  "CLAUDE_CODE_PERFORCE_MODE": "Enable Perforce write protection mode",
  "CLAUDE_CODE_PLUGIN_CACHE_DIR": "Override the plugins root directory. Despite the name, this sets the parent directory, not the cache itself: marketplaces and the plugin cache live in subdirectories under this path. Defaults to ~/.claude/plugins. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS": "Plugin marketplace git operations timeout in milliseconds (default: 120000). See https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md#2151",
  "CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE": "Keep plugin cache on update failure",
  "CLAUDE_CODE_PLUGIN_PREFER_HTTPS": "Set to 1 to clone GitHub owner/repo plugin sources over HTTPS instead of SSH. Useful in CI runners, containers, or environments without a configured SSH key for github.com. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_PLUGIN_SEED_DIR": "Path(s) to pre-populated plugin directories. See https://code.claude.com/docs/en/plugin-marketplaces#pre-populate-plugins-for-containers",
  "CLAUDE_CODE_POWERSHELL_RESPECT_EXECUTION_POLICY": "Set to 1 to stop Claude Code from passing -ExecutionPolicy Bypass when spawning PowerShell for tool calls, hooks, and status line commands. By default Claude Code bypasses execution policy so .ps1 scripts work on default-Restricted Windows installs. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS": "Cap, in milliseconds, on how long `claude -p` waits for background subagents at exit (default 10 minutes; set to 0 to wait without limit, added v2.1.182). See https://code.claude.com/docs/en/headless#background-tasks-at-exit",
  "CLAUDE_CODE_PROCESS_WRAPPER": "Launch the processes Claude Code starts from its own binary, such as the background service that hosts agent view sessions, through a corporate launcher given as an argv prefix like /opt/corp/launcher. Set it in the env block of user or managed settings, not as a shell export, so the detached background service inherits it; project and local settings cannot set it. Equivalent to the processWrapper setting, which requires Claude Code v2.1.210 or later; this variable takes precedence when both are set. The VS Code extension configures its own launcher separately through its claudeProcessWrapper setting. Ignored on Windows. Requires Claude Code v2.1.208 or later. See https://code.claude.com/docs/en/corporate-launcher",
  "CLAUDE_CODE_PROPAGATE_TRACEPARENT": "Propagate the W3C traceparent header on API requests when using a custom ANTHROPIC_BASE_URL. See https://code.claude.com/docs/en/monitoring-usage#traces-beta",
  "CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST": "Indicate that the host application manages provider routing",
  "CLAUDE_CODE_PROXY_RESOLVES_HOSTS": "Allow proxy to handle DNS resolution",
  "CLAUDE_CODE_REMOTE": "Indicates a remote web environment session",
  "CLAUDE_CODE_REMOTE_SESSION_ID": "Cloud session identifier for remote sessions",
  "CLAUDE_CODE_RESUME_INTERRUPTED_TURN": "Automatically resume from a mid-turn interruption",
  "CLAUDE_CODE_RESUME_INTERRUPTED_TURN_MAX_AGE_MS": "Maximum age in milliseconds of the last transcript message for a session that ended mid-turn to continue automatically on resume. When the last message is older than this bound, Claude Code skips both the CLAUDE_CODE_RESUME_INTERRUPTED_TURN automatic resume and the injected CLAUDE_CODE_RESUME_PROMPT continuation message, and the session starts idle so you continue explicitly. Unset or 0 means no bound; a negative or non-numeric value applies a one-hour bound. Spawn scripts for long-running agents can set this so a restart against an old transcript does not re-run a stale prompt. Claude Code sets a one-hour bound itself when it restarts a crashed agent view session that inherited its conversation from an interactive session. Requires Claude Code v2.1.211 or later. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_RESUME_PROMPT": "Override the continuation message injected when resuming a session that ended mid-turn (default \"Continue from where you left off.\"). An empty string uses the default. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_RETRY_WATCHDOG": "Set to 1 for unattended sessions (eval harnesses, CI, remote workers) to retry 429/529 capacity errors indefinitely, backing off up to 5 minutes, instead of failing after CLAUDE_CODE_MAX_RETRIES. Requires v2.1.186+. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_SAFE_MODE": "Set to 1 to start in safe mode: CLAUDE.md, skills, plugins, hooks, MCP servers, custom commands and agents, output styles, workflows, custom themes, custom keybindings, status line and file-suggestion commands, LSP servers, and auto-memory do not load, for troubleshooting a broken configuration. Managed settings policy still applies. Equivalent to passing --safe-mode; directly spawned child processes inherit the variable. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_SCRIPT_CAPS": "Script invocation limits (JSON object)",
  "CLAUDE_CODE_SCROLL_SPEED": "Set the mouse wheel scroll multiplier in fullscreen rendering. Accepts any positive value up to 20, including fractional values below 1 such as 0.5 to slow accelerated trackpad and wheel scrolling in terminals that already amplify wheel events. Set to 3 to match vim if your terminal sends one wheel event per notch without amplification. See https://code.claude.com/docs/en/fullscreen#mouse-wheel-scrolling",
  "CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS": "Override the time budget in milliseconds for SessionEnd hooks (default 1500, raised up to 60000 by the highest configured per-hook timeout). See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_SESSION_ID": "Set automatically to the current session ID in Bash/PowerShell tool subprocesses, hook command subprocesses, and stdio MCP server subprocesses. Read-only. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_SHELL": "Override automatic shell detection (e.g., '/bin/zsh', '/bin/bash')",
  "CLAUDE_CODE_SHELL_PREFIX": "Command prefix wrapper for shell commands",
  "CLAUDE_CODE_SIMPLE": "Minimal mode with core tools only",
  "CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT": "Use a shortened system prompt",
  "CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH": "Skip client-side SigV4 authentication for Claude Platform on AWS; use when a proxy or gateway adds authentication before forwarding. See https://code.claude.com/docs/en/claude-platform-on-aws#route-through-a-corporate-proxy",
  "CLAUDE_CODE_SKIP_AWS_CRED_CACHE": "Set to 1 to turn off the in-process cache of credentials resolved from the AWS default credential provider chain, so Claude Code resolves the chain on every API request. With the cache off, an SSO-backed profile requests credentials from IAM Identity Center on every request. Requires Claude Code v2.1.207 or later. See https://code.claude.com/docs/en/amazon-bedrock#credential-caching-and-resolution-timeout",
  "CLAUDE_CODE_SKIP_BEDROCK_AUTH": "Skip AWS authentication for Bedrock",
  "CLAUDE_CODE_SKIP_FAST_MODE_NETWORK_ERRORS": "Set to 1 to treat a failed fast mode availability check as available, for networks that block the check's direct request to api.anthropic.com. Claude Code still honors a \"disabled by your organization\" response. See https://code.claude.com/docs/en/fast-mode#use-fast-mode-behind-proxies-and-llm-gateways",
  "CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK": "Set to 1 to skip the client-side fast mode availability check, for proxies that intercept the check's request rather than refuse it. The API still rejects fast mode requests when your organization has fast mode disabled. See https://code.claude.com/docs/en/fast-mode#use-fast-mode-behind-proxies-and-llm-gateways",
  "CLAUDE_CODE_SKIP_FOUNDRY_AUTH": "Skip Azure authentication for Foundry",
  "CLAUDE_CODE_SKIP_MANTLE_AUTH": "Skip AWS authentication for Bedrock Mantle (for example, when using an LLM gateway). See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_SKIP_PROMPT_HISTORY": "Disable transcript writes entirely. See https://code.claude.com/docs/en/settings#environment-variables",
  "CLAUDE_CODE_SKIP_VERTEX_AUTH": "Skip Google authentication for Google Cloud's Agent Platform",
  "CLAUDE_CODE_STOP_HOOK_BLOCK_CAP": "Override the default maximum consecutive Stop hook blocks (default: 8) before the turn ends with a warning. Raise this when a stop hook legitimately needs more than 8 iterations to converge. See https://code.claude.com/docs/en/hooks-guide",
  "CLAUDE_CODE_SUBAGENT_MODEL": "Override model used by subagents",
  "CLAUDE_CODE_SUBPROCESS_ENV_SCRUB": "Strip credentials from subprocess environments",
  "CLAUDE_CODE_SYNC_PLUGIN_INSTALL": "Wait synchronously for plugin installation",
  "CLAUDE_CODE_SYNC_PLUGIN_INSTALL_TIMEOUT_MS": "Timeout in milliseconds for synchronous plugin installation",
  "CLAUDE_CODE_SYNC_SKILLS": "Set to 1 to download enabled claude.ai skills into ~/.claude/skills/ before the first query and resync every 10 minutes (non-interactive -p mode only; requires claude.ai auth). See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_SYNC_SKILLS_INSTALL_TIMEOUT_MS": "Timeout in milliseconds for a mid-session skills resync when CLAUDE_CODE_SYNC_SKILLS is set (default 30000). See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_SYNC_SKILLS_WAIT_TIMEOUT_MS": "Timeout in milliseconds for the first query to wait on the initial skills sync when CLAUDE_CODE_SYNC_SKILLS is set (default 5000). See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_SYNTAX_HIGHLIGHT": "UNDOCUMENTED. Enable syntax highlighting in diffs",
  "CLAUDE_CODE_TASK_LIST_ID": "Shared task list identifier for team collaboration",
  "CLAUDE_CODE_TEAM_NAME": "Agent team membership name",
  "CLAUDE_CODE_TEAM_TEARDOWN_PARK_TIMEOUT_MS": "Override, in milliseconds, how long a non-interactive session waits at exit for its agent team to finish tearing down. Accepts 1000 to 60000; an out-of-range value is ignored and the default of 10000 applies. Requires Claude Code v2.1.206 or later. See https://code.claude.com/docs/en/agent-teams",
  "CLAUDE_CODE_TMPDIR": "Override temp directory path",
  "CLAUDE_CODE_TMUX_TRUECOLOR": "Allow 24-bit truecolor rendering in tmux",
  "CLAUDE_CODE_USE_ANTHROPIC_AWS": "Enable Claude Platform on AWS as the API provider. Bedrock and Foundry take precedence if also set. See https://code.claude.com/docs/en/claude-platform-on-aws#2-configure-claude-code",
  "CLAUDE_CODE_USE_BEDROCK": "Enable Amazon Bedrock as the API provider. See https://code.claude.com/docs/en/amazon-bedrock#3-configure-claude-code",
  "CLAUDE_CODE_USE_FOUNDRY": "Enable Microsoft Foundry as the API provider. See https://code.claude.com/docs/en/microsoft-foundry#3-configure-claude-code",
  "CLAUDE_CODE_USE_MANTLE": "Enable the Mantle endpoint (native Anthropic API shape on Bedrock). See https://code.claude.com/docs/en/amazon-bedrock#enable-mantle",
  "CLAUDE_CODE_USE_NATIVE_FILE_SEARCH": "Set to 1 to discover custom commands, subagents, and output styles using Node.js file APIs instead of ripgrep (for environments where the bundled ripgrep is unavailable). See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_CODE_USE_POWERSHELL_TOOL": "Enable PowerShell as default shell for interactive commands (Windows)",
  "CLAUDE_CODE_USE_VERTEX": "Enable Google Cloud's Agent Platform as the API provider. See https://code.claude.com/docs/en/google-vertex-ai#4-configure-claude-code",
  "CLAUDE_CONFIG_DIR": "Override the configuration directory (default ~/.claude) where settings, credentials, session history, and plugins are stored. Useful for running multiple accounts side by side. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_DISABLE_ADOPT": "Set to 1 to stop in-flight background work instead of carrying it over when you background a session by pressing ← or with /background. Claude Code asks you to confirm before backgrounding, then stops the tasks that would otherwise carry over. Requires Claude Code v2.1.195 or later. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_EFFORT": "Set automatically in Bash tool subprocesses and hook commands to the active effort level for the turn (low, medium, high, xhigh, or max; ultracode reports as xhigh). Read-only. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_ENABLE_BYTE_WATCHDOG": "Set to 1 to force-enable, or 0 to force-disable, the byte-level streaming idle watchdog that aborts a connection when no bytes arrive within the configured timeout. Enabled by default on direct Anthropic API and Claude Platform on AWS connections. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_ENABLE_BYTE_WATCHDOG_BEDROCK": "Set to 1 to enable the byte-level streaming idle watchdog on Amazon Bedrock eventstream responses (off by default). Configure the timeout with CLAUDE_STREAM_IDLE_TIMEOUT_MS. See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_ENABLE_STREAM_WATCHDOG": "Set to 1 to force-enable, or 0 to force-disable, the event-level streaming idle watchdog. When unset, the watchdog is on by default for all providers (as of v2.1.196; before that the unset default was server-controlled on the direct Anthropic API and off on other providers). See https://code.claude.com/docs/en/env-vars",
  "CLAUDE_ENV_FILE": "File path for persisting environment variables across Bash commands",
  "CLAUDE_PID": "Claude Code sets this to its own process ID in the subprocesses it spawns: Bash and PowerShell tool commands and hook commands. On Linux, the Bash tool's shell integration uses it to refuse a pkill pattern that would match the Claude Code process itself. Read it from your own scripts to identify or signal the parent Claude Code process deliberately. Requires Claude Code v2.1.214 or later. See https://code.claude.com/docs/en/errors#pkill-pattern-matches-the-claude-code-process",
  "CLAUDE_PROJECT_DIR": "Project root directory path (also provided to hooks)",
  "CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX": "Prefix for auto-generated Remote Control session names when no explicit name is set. Defaults to the machine hostname, producing names like myhost-graceful-unicorn. See https://code.claude.com/docs/en/remote-control#start-a-remote-control-session",
  "CLAUDE_STREAM_IDLE_TIMEOUT_MS": "Timeout in milliseconds before the streaming idle watchdog closes a stalled connection. When set explicitly the minimum is 300000 (5 minutes); lower values are clamped. See https://code.claude.com/docs/en/env-vars",
  "CLOUD_ML_REGION": "Google Cloud's Agent Platform region: global, a multi-region location (eu, us), or a specific region (e.g. us-east5). See https://code.claude.com/docs/en/google-vertex-ai#region-configuration",
  "DEBUG": "Set to a truthy value (1, true, yes, or on) to enable debug mode, equivalent to --debug. Logs are written to ~/.claude/debug/<session-id>.txt. See https://code.claude.com/docs/en/env-vars",
  "DISABLE_AUTOUPDATER": "Set to 1 to disable automatic background updates. Manual claude update still works; use DISABLE_UPDATES to block both. See https://code.claude.com/docs/en/env-vars",
  "DISABLE_AUTO_COMPACT": "Set to 1 to disable automatic compaction when approaching the context limit. The manual /compact command remains available. Equivalent to autoCompactEnabled: false. See https://code.claude.com/docs/en/env-vars",
  "DISABLE_COMPACT": "Set to 1 to disable all compaction: both automatic compaction and the manual /compact command. See https://code.claude.com/docs/en/env-vars",
  "DISABLE_COST_WARNINGS": "Set to 1 to disable cost warning messages. See https://code.claude.com/docs/en/env-vars",
  "DISABLE_DOCTOR_COMMAND": "Set to 1 to hide the /doctor command (useful for managed deployments). See https://code.claude.com/docs/en/env-vars",
  "DISABLE_ERROR_REPORTING": "Disable Sentry error reporting",
  "DISABLE_EXTRA_USAGE_COMMAND": "Set to 1 to hide the /usage-credits command for purchasing additional usage beyond rate limits. See https://code.claude.com/docs/en/env-vars",
  "DISABLE_FEEDBACK_COMMAND": "Set to 1 to disable the /feedback command. The older name DISABLE_BUG_COMMAND is also accepted. See https://code.claude.com/docs/en/env-vars",
  "DISABLE_GROWTHBOOK": "Set to 1 to disable GrowthBook feature-flag fetching and use code defaults for every flag. Telemetry stays on unless DISABLE_TELEMETRY is also set. See https://code.claude.com/docs/en/env-vars",
  "DISABLE_INSTALLATION_CHECKS": "Set to 1 to disable installation warnings (use only when manually managing the installation location). See https://code.claude.com/docs/en/env-vars",
  "DISABLE_INSTALL_GITHUB_APP_COMMAND": "Set to 1 to hide the /install-github-app command (already hidden on Bedrock, Vertex, or Foundry). See https://code.claude.com/docs/en/env-vars",
  "DISABLE_INTERLEAVED_THINKING": "Set to 1 to prevent sending the interleaved-thinking beta header (useful when a gateway or provider does not support interleaved thinking). See https://code.claude.com/docs/en/env-vars",
  "DISABLE_LOGIN_COMMAND": "Set to 1 to hide the /login command (useful when authentication is handled externally via API keys or apiKeyHelper). See https://code.claude.com/docs/en/env-vars",
  "DISABLE_LOGOUT_COMMAND": "Set to 1 to hide the /logout command. See https://code.claude.com/docs/en/env-vars",
  "DISABLE_PROMPT_CACHING": "Disable prompt caching for all models. See https://code.claude.com/docs/en/prompt-caching#disable-prompt-caching",
  "DISABLE_PROMPT_CACHING_FABLE": "Disable prompt caching for Fable models only. See https://code.claude.com/docs/en/prompt-caching#disable-prompt-caching",
  "DISABLE_PROMPT_CACHING_HAIKU": "Disable prompt caching for Haiku models only. See https://code.claude.com/docs/en/prompt-caching#disable-prompt-caching",
  "DISABLE_PROMPT_CACHING_OPUS": "Disable prompt caching for Opus models only. See https://code.claude.com/docs/en/prompt-caching#disable-prompt-caching",
  "DISABLE_PROMPT_CACHING_SONNET": "Disable prompt caching for Sonnet models only. See https://code.claude.com/docs/en/prompt-caching#disable-prompt-caching",
  "DISABLE_TELEMETRY": "Set to 1 to opt out of telemetry. Also disables feature-flag fetching (same effect as DISABLE_GROWTHBOOK). See https://code.claude.com/docs/en/env-vars",
  "DISABLE_UPDATES": "Block all update paths including manual updates",
  "DISABLE_UPGRADE_COMMAND": "Set to 1 to hide the /upgrade command. See https://code.claude.com/docs/en/env-vars",
  "DO_NOT_TRACK": "Set to 1 to opt out of telemetry (cross-tool convention; equivalent to DISABLE_TELEMETRY). See https://code.claude.com/docs/en/env-vars",
  "ENABLE_BETA_TRACING_DETAILED": "Emit detailed spans including hook execution when the tracing beta is enabled. See https://code.claude.com/docs/en/monitoring-usage#traces-beta",
  "ENABLE_CLAUDEAI_MCP_SERVERS": "Opt in/out of claude.ai MCP servers. See https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md#2163",
  "ENABLE_PROMPT_CACHING_1H": "Request a 1-hour prompt cache TTL instead of the 5-minute default (billed at a higher rate). See https://code.claude.com/docs/en/prompt-caching#cache-lifetime",
  "ENABLE_TOOL_SEARCH": "Control MCP tool search: \"true\" always defers and sends the beta header (requests fail on Google Cloud's Agent Platform models earlier than Sonnet 4.5/Opus 4.5 or on proxies that do not support tool_reference); \"auto\" loads tools upfront if they fit within 10% of context; \"auto:N\" sets a custom threshold percentage (e.g. auto:5); \"false\" loads all tools upfront. Also applies when ANTHROPIC_BASE_URL points to a non-first-party host. See https://code.claude.com/docs/en/google-vertex-ai#4-configure-claude-code",
  "FALLBACK_FOR_ALL_PRIMARY_MODELS": "Set to any non-empty value to make all models (not only Opus) stop retrying with a repeated-overload error when no fallback model is configured. See https://code.claude.com/docs/en/env-vars",
  "FORCE_AUTOUPDATE_PLUGINS": "Keep plugin auto-updates enabled even when DISABLE_AUTOUPDATER=1 is set. See https://code.claude.com/docs/en/discover-plugins#configure-auto-updates",
  "FORCE_HYPERLINK": "Set to 1 to enable clickable OSC 8 hyperlinks when your terminal supports them but is not auto-detected, or 0 to disable them",
  "FORCE_PROMPT_CACHING_5M": "Force a 5-minute cache TTL regardless of authentication method; overrides ENABLE_PROMPT_CACHING_1H or a managed-settings TTL. See https://code.claude.com/docs/en/prompt-caching#override-the-ttl",
  "GOOGLE_APPLICATION_CREDENTIALS": "Path to a GCP credential configuration file (service account key or workload identity federation config) used for Google Cloud's Agent Platform authentication. See https://code.claude.com/docs/en/google-vertex-ai#3-configure-gcp-credentials",
  "HTTPS_PROXY": "HTTPS proxy URL (recommended over HTTP_PROXY)",
  "HTTP_PROXY": "HTTP proxy URL",
  "IS_DEMO": "Set to 1 to enable demo mode: hides email and organization name from the header and /status output and skips onboarding. See https://code.claude.com/docs/en/env-vars",
  "MAX_MCP_OUTPUT_TOKENS": "Maximum number of tokens allowed in MCP tool output before truncation (default: 25000). Claude Code displays a warning above 10000 tokens. For tools that declare anthropic/maxResultSizeChars, that character limit replaces this token limit for text content, but image content from those tools is still subject to this limit. See https://code.claude.com/docs/en/mcp",
  "MAX_STRUCTURED_OUTPUT_RETRIES": "Number of times to retry when the model's response fails validation against --json-schema in non-interactive (-p) mode (default 5). See https://code.claude.com/docs/en/env-vars",
  "MAX_THINKING_TOKENS": "Override the extended thinking token budget; set to 0 to disable thinking on the Anthropic API. On adaptive reasoning models (Opus 4.7+, Opus 4.8, Fable 5) a nonzero budget is ignored unless CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING is set. See https://code.claude.com/docs/en/model-config#extended-thinking",
  "MCP_CLIENT_SECRET": "OAuth client secret for MCP servers that require pre-configured credentials (avoids the interactive prompt when adding a server with --client-secret). See https://code.claude.com/docs/en/env-vars",
  "MCP_CONNECTION_NONBLOCKING": "Controls whether startup waits for MCP servers to connect before the first query. Non-blocking by default since v2.1.142; set to 0 to restore the blocking 5-second connection wait. See https://code.claude.com/docs/en/env-vars",
  "MCP_CONNECT_TIMEOUT_MS": "How long blocking MCP startup waits in milliseconds for the connection batch before snapshotting the tool list (default 5000). Applies when MCP_CONNECTION_NONBLOCKING=0 or for alwaysLoad servers. See https://code.claude.com/docs/en/env-vars",
  "MCP_OAUTH_CALLBACK_PORT": "Fixed port for the OAuth redirect callback, as an alternative to --callback-port when adding an MCP server with pre-configured credentials. See https://code.claude.com/docs/en/env-vars",
  "MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE": "Maximum number of remote MCP servers (HTTP/SSE) to connect in parallel during startup (default 20). See https://code.claude.com/docs/en/env-vars",
  "MCP_SERVER_CONNECTION_BATCH_SIZE": "Maximum number of local MCP servers (stdio) to connect in parallel during startup (default 3). See https://code.claude.com/docs/en/env-vars",
  "MCP_TIMEOUT": "Timeout in milliseconds for MCP server startup (default 30000). See https://code.claude.com/docs/en/env-vars",
  "MCP_TOOL_TIMEOUT": "Timeout in milliseconds for MCP tool execution (default: 100000000, about 28 hours). A per-server timeout field in .mcp.json overrides this for that server. Values below 1000 are floored to one second. See https://code.claude.com/docs/en/mcp",
  "NODE_EXTRA_CA_CERTS": "Path to custom CA certificate file",
  "NO_PROXY": "Domains to bypass proxy (space or comma-separated, or '*' for all)",
  "OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT": "Standard OpenTelemetry SDK limit on attribute value length. Claude Code caps content-bearing telemetry attributes at the smaller of this and CLAUDE_CODE_OTEL_CONTENT_MAX_LENGTH, so the truncation marker stays within the SDK limit. Claude Code reads the OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT and OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT variants the same way, and the smallest set value applies to all signals. Requires Claude Code v2.1.214 or later. See https://code.claude.com/docs/en/monitoring-usage#common-configuration-variables",
  "OTEL_EXPORTER_OTLP_CERTIFICATE": "Path to the CA certificate for gRPC OTLP mTLS. See https://code.claude.com/docs/en/monitoring-usage#mtls-authentication",
  "OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE": "Path to the client certificate for gRPC OTLP mTLS. See https://code.claude.com/docs/en/monitoring-usage#mtls-authentication",
  "OTEL_EXPORTER_OTLP_CLIENT_KEY": "Path to the client private key for gRPC OTLP mTLS. See https://code.claude.com/docs/en/monitoring-usage#mtls-authentication",
  "OTEL_EXPORTER_OTLP_ENDPOINT": "OTLP exporter endpoint for all signals (e.g. http://localhost:4317). See https://code.claude.com/docs/en/monitoring-usage#common-configuration-variables",
  "OTEL_EXPORTER_OTLP_HEADERS": "Headers sent with OTLP exporter requests (e.g. Authorization=Bearer token). See https://code.claude.com/docs/en/monitoring-usage#common-configuration-variables",
  "OTEL_EXPORTER_OTLP_LOGS_CLIENT_CERTIFICATE": "Path to the client certificate for gRPC OTLP mTLS, overriding OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE for logs only. See https://code.claude.com/docs/en/monitoring-usage#mtls-authentication",
  "OTEL_EXPORTER_OTLP_LOGS_CLIENT_KEY": "Path to the client private key for gRPC OTLP mTLS, overriding OTEL_EXPORTER_OTLP_CLIENT_KEY for logs only. See https://code.claude.com/docs/en/monitoring-usage#mtls-authentication",
  "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT": "OTLP exporter endpoint override for logs. See https://code.claude.com/docs/en/monitoring-usage#common-configuration-variables",
  "OTEL_EXPORTER_OTLP_LOGS_PROTOCOL": "OTLP protocol override for logs: grpc, http/json, or http/protobuf. See https://code.claude.com/docs/en/monitoring-usage#common-configuration-variables",
  "OTEL_EXPORTER_OTLP_METRICS_CLIENT_CERTIFICATE": "Path to the client certificate for gRPC OTLP mTLS, overriding OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE for metrics only. See https://code.claude.com/docs/en/monitoring-usage#mtls-authentication",
  "OTEL_EXPORTER_OTLP_METRICS_CLIENT_KEY": "Path to the client private key for gRPC OTLP mTLS, overriding OTEL_EXPORTER_OTLP_CLIENT_KEY for metrics only. See https://code.claude.com/docs/en/monitoring-usage#mtls-authentication",
  "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT": "OTLP exporter endpoint override for metrics. See https://code.claude.com/docs/en/monitoring-usage#common-configuration-variables",
  "OTEL_EXPORTER_OTLP_METRICS_PROTOCOL": "OTLP protocol override for metrics: grpc, http/json, or http/protobuf. See https://code.claude.com/docs/en/monitoring-usage#common-configuration-variables",
  "OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE": "Metrics temporality preference: delta (default) or cumulative. See https://code.claude.com/docs/en/monitoring-usage#common-configuration-variables",
  "OTEL_EXPORTER_OTLP_PROTOCOL": "OTLP exporter protocol for all signals: grpc, http/json, or http/protobuf. See https://code.claude.com/docs/en/monitoring-usage#common-configuration-variables",
  "OTEL_EXPORTER_OTLP_TRACES_CLIENT_CERTIFICATE": "Path to the client certificate for gRPC OTLP mTLS, overriding OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE for traces only. See https://code.claude.com/docs/en/monitoring-usage#mtls-authentication",
  "OTEL_EXPORTER_OTLP_TRACES_CLIENT_KEY": "Path to the client private key for gRPC OTLP mTLS, overriding OTEL_EXPORTER_OTLP_CLIENT_KEY for traces only. See https://code.claude.com/docs/en/monitoring-usage#mtls-authentication",
  "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT": "OTLP exporter endpoint override for traces. See https://code.claude.com/docs/en/monitoring-usage#traces-beta",
  "OTEL_EXPORTER_OTLP_TRACES_PROTOCOL": "OTLP protocol override for traces: grpc, http/json, or http/protobuf. See https://code.claude.com/docs/en/monitoring-usage#traces-beta",
  "OTEL_LOGS_EXPORTER": "OpenTelemetry logs exporter(s) as a comma-separated list. Valid values: otlp, console, none. See https://code.claude.com/docs/en/monitoring-usage#common-configuration-variables",
  "OTEL_LOGS_EXPORT_INTERVAL": "Logs export interval in milliseconds (default 5000). See https://code.claude.com/docs/en/monitoring-usage#common-configuration-variables",
  "OTEL_LOG_ASSISTANT_RESPONSES": "UNDOCUMENTED. Include assistant response text in the claude_code.assistant_response OpenTelemetry log event (added v2.1.193). When unset, follows OTEL_LOG_USER_PROMPTS; set to 0 to keep prompts-only.",
  "OTEL_LOG_RAW_API_BODIES": "Log raw API request/response bodies. Set to 1, or to file:<dir> to write them to a directory. See https://code.claude.com/docs/en/monitoring-usage#common-configuration-variables",
  "OTEL_LOG_TOOL_CONTENT": "Include full tool input/output content in OpenTelemetry log events (requires tracing; disabled by default). See https://code.claude.com/docs/en/monitoring-usage#common-configuration-variables",
  "OTEL_LOG_TOOL_DETAILS": "Include tool name and parameters in OpenTelemetry log events (disabled by default). See https://code.claude.com/docs/en/monitoring-usage#common-configuration-variables",
  "OTEL_LOG_USER_PROMPTS": "Include user prompt text in OpenTelemetry log events (disabled by default). See https://code.claude.com/docs/en/monitoring-usage#common-configuration-variables",
  "OTEL_METRICS_EXPORTER": "OpenTelemetry metrics exporter(s) as a comma-separated list. Valid values: otlp, prometheus, console, none. See https://code.claude.com/docs/en/monitoring-usage#common-configuration-variables",
  "OTEL_METRICS_INCLUDE_ACCOUNT_UUID": "Include the user.account_uuid and user.account_id attributes on metrics (default true). See https://code.claude.com/docs/en/monitoring-usage#metrics-cardinality-control",
  "OTEL_METRICS_INCLUDE_ENTRYPOINT": "Include the app.entrypoint attribute on metrics (default false). See https://code.claude.com/docs/en/monitoring-usage#metrics-cardinality-control",
  "OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES": "Include configured OTEL_RESOURCE_ATTRIBUTES on metric data points (default true). See https://code.claude.com/docs/en/monitoring-usage#metrics-cardinality-control",
  "OTEL_METRICS_INCLUDE_SESSION_ID": "Include the session.id attribute on metrics (default true). See https://code.claude.com/docs/en/monitoring-usage#metrics-cardinality-control",
  "OTEL_METRICS_INCLUDE_VERSION": "Include the app.version attribute on metrics (default false). See https://code.claude.com/docs/en/monitoring-usage#metrics-cardinality-control",
  "OTEL_METRIC_EXPORT_INTERVAL": "Metrics export interval in milliseconds (default 60000). See https://code.claude.com/docs/en/monitoring-usage#common-configuration-variables",
  "OTEL_RESOURCE_ATTRIBUTES": "Comma-separated key=value resource attributes attached to all telemetry. See https://code.claude.com/docs/en/monitoring-usage#multi-team-organization-support",
  "OTEL_TRACES_EXPORTER": "OpenTelemetry traces exporter(s) as a comma-separated list. Valid values: otlp, console, none. See https://code.claude.com/docs/en/monitoring-usage#traces-beta",
  "OTEL_TRACES_EXPORT_INTERVAL": "Traces export interval in milliseconds (default 5000). See https://code.claude.com/docs/en/monitoring-usage#traces-beta",
  "SLASH_COMMAND_TOOL_CHAR_BUDGET": "Override the character budget for skill metadata shown to the Skill tool. The budget scales dynamically at 1% of the context window, with a fallback of 8000 characters. Legacy name kept for backwards compatibility. See https://code.claude.com/docs/en/skills#control-who-invokes-a-skill",
  "TASK_MAX_OUTPUT_LENGTH": "Maximum number of characters in subagent output before truncation (default 32000, maximum 160000). When truncated, the full output is saved to disk and the path is included in the response. See https://code.claude.com/docs/en/env-vars",
  "USE_BUILTIN_RIPGREP": "Use the bundled ripgrep binary instead of system ripgrep",
  "VERTEX_REGION_CLAUDE_3_5_HAIKU": "Override the Vertex AI region for Claude 3.5 Haiku (used when CLOUD_ML_REGION=global). See https://code.claude.com/docs/en/env-vars",
  "VERTEX_REGION_CLAUDE_3_5_SONNET": "Override the Vertex AI region for Claude 3.5 Sonnet (used when CLOUD_ML_REGION=global). See https://code.claude.com/docs/en/env-vars",
  "VERTEX_REGION_CLAUDE_3_7_SONNET": "Override the Vertex AI region for Claude 3.7 Sonnet (used when CLOUD_ML_REGION=global). See https://code.claude.com/docs/en/env-vars",
  "VERTEX_REGION_CLAUDE_4_0_OPUS": "Override the Vertex AI region for Claude 4.0 Opus (used when CLOUD_ML_REGION=global). See https://code.claude.com/docs/en/env-vars",
  "VERTEX_REGION_CLAUDE_4_0_SONNET": "Override the Vertex AI region for Claude 4.0 Sonnet (used when CLOUD_ML_REGION=global). See https://code.claude.com/docs/en/env-vars",
  "VERTEX_REGION_CLAUDE_4_1_OPUS": "Override the Vertex AI region for Claude 4.1 Opus (used when CLOUD_ML_REGION=global). See https://code.claude.com/docs/en/env-vars",
  "VERTEX_REGION_CLAUDE_4_5_OPUS": "Override the Vertex AI region for Claude Opus 4.5 (used when CLOUD_ML_REGION=global). See https://code.claude.com/docs/en/env-vars",
  "VERTEX_REGION_CLAUDE_4_5_SONNET": "Override the Vertex AI region for Claude Sonnet 4.5 (used when CLOUD_ML_REGION=global). See https://code.claude.com/docs/en/env-vars",
  "VERTEX_REGION_CLAUDE_4_6_OPUS": "Override the Vertex AI region for Claude Opus 4.6 (used when CLOUD_ML_REGION=global). See https://code.claude.com/docs/en/env-vars",
  "VERTEX_REGION_CLAUDE_4_6_SONNET": "Override the Vertex AI region for Claude Sonnet 4.6 (used when CLOUD_ML_REGION=global). See https://code.claude.com/docs/en/env-vars",
  "VERTEX_REGION_CLAUDE_4_7_OPUS": "Override the Vertex AI region for Claude Opus 4.7 (used when CLOUD_ML_REGION=global). See https://code.claude.com/docs/en/env-vars",
  "VERTEX_REGION_CLAUDE_4_8_OPUS": "Override the Vertex AI region for Claude Opus 4.8 (used when CLOUD_ML_REGION=global). See https://code.claude.com/docs/en/env-vars",
  "VERTEX_REGION_CLAUDE_5_OPUS": "Override region for Claude Opus 5 when using Google Cloud's Agent Platform (formerly Vertex AI). Added in v2.1.219. See https://code.claude.com/docs/en/google-vertex-ai",
  "VERTEX_REGION_CLAUDE_5_SONNET": "Override region for Claude Sonnet 5 when using Google Cloud's Agent Platform (formerly Vertex AI). Added in v2.1.197. See https://code.claude.com/docs/en/google-vertex-ai",
  "VERTEX_REGION_CLAUDE_FABLE_5": "Override the Vertex AI region for Claude Fable 5 (used when CLOUD_ML_REGION=global). See https://code.claude.com/docs/en/env-vars",
  "VERTEX_REGION_CLAUDE_HAIKU_4_5": "Override the Vertex AI region for Claude Haiku 4.5 (used when CLOUD_ML_REGION=global). See https://code.claude.com/docs/en/env-vars"
});

  function getKnownClaudeEnvVars(schemaObj) {
    const props = schemaObj && schemaObj.properties && schemaObj.properties.env && schemaObj.properties.env.properties
      ? schemaObj.properties.env.properties
      : KNOWN_CLAUDE_ENV_VARS;
    return Object.keys(props).sort().map(name => {
      const def = props[name];
      const desc = typeof def === "string" ? def : (def && def.description ? def.description : "");
      return {
        name,
        description: desc
      };
    });
  }

  function getClaudeEnvVarDescription(varName, schemaObj) {
    if (!varName) return "";
    const props = schemaObj && schemaObj.properties && schemaObj.properties.env && schemaObj.properties.env.properties
      ? schemaObj.properties.env.properties
      : KNOWN_CLAUDE_ENV_VARS;
    const def = props[varName];
    if (!def) return "";
    return typeof def === "string" ? def : (def.description || "");
  }

  function getCanonicalAnthropicModels() {
    return [
      'claude-fable-5',
      'claude-opus-5',
      'claude-sonnet-5',
      'claude-haiku-4-5-20251001',
      'claude-opus-4-6',
      'claude-sonnet-4-6',
      'claude-3-7-sonnet-20250219',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229'
    ];
  }

  function cleanDescriptionText(text) {
    if (!text || typeof text !== 'string') return '';
    return text.trim().replace(/^["'`]+|["'`]+$/g, '').trim();
  }

  function extractChoiceContent(choices) {
    if (!Array.isArray(choices) || choices.length === 0) return '';
    const first = choices[0];
    if (!first) return '';
    if (first.message && typeof first.message.content === 'string') {
      return first.message.content;
    }
    if (first.delta && typeof first.delta.content === 'string') {
      return first.delta.content;
    }
    if (typeof first.text === 'string') return first.text;
    return '';
  }

  function extractContentFromObject(obj) {
    if (!obj || typeof obj !== 'object') return '';
    const choiceContent = extractChoiceContent(obj.choices);
    if (choiceContent) return choiceContent;
    if (typeof obj.response === 'string') return obj.response;
    if (typeof obj.text === 'string') return obj.text;
    if (Array.isArray(obj.content) && obj.content.length > 0 && typeof obj.content[0].text === 'string') {
      return obj.content[0].text;
    }
    return '';
  }

  function parseSseTextStream(raw) {
    const lines = raw.split(/\r?\n/);
    let accumulated = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const parsed = JSON.parse(payload);
        const chunk = extractContentFromObject(parsed);
        if (chunk) accumulated += chunk;
      } catch (_) {}
    }
    return cleanDescriptionText(accumulated);
  }

  function parseOpenAiChatResponse(input) {
    if (!input) return '';
    if (typeof input === 'object') {
      return cleanDescriptionText(extractContentFromObject(input));
    }
    if (typeof input !== 'string') return '';
    const raw = input.trim();
    if (!raw) return '';

    if (raw.startsWith('data:') || raw.includes('\ndata:')) {
      const sseText = parseSseTextStream(raw);
      if (sseText) return sseText;
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const content = extractContentFromObject(parsed);
        if (content) return cleanDescriptionText(content);
      }
    } catch (_) {}

    return cleanDescriptionText(raw);
  }

  function sanitizeModelName(name) {
    if (!name || typeof name !== 'string') return '';
    const trimmed = name.trim();
    const stripped = trimmed.replace(/\[[^\]]*\]/g, '').trim();
    if (stripped) return stripped;
    return trimmed;
  }

  function findFastOrFirstDiscoveredModel(availableModels) {
    if (!Array.isArray(availableModels) || availableModels.length === 0) return '';
    const fast = availableModels.find(m => {
      if (typeof m !== 'string') return false;
      const lower = m.toLowerCase();
      return lower.includes('haiku') || lower.includes('flash') || lower.includes('mini');
    });
    if (fast) return sanitizeModelName(fast);
    if (typeof availableModels[0] === 'string' && availableModels[0].trim()) {
      return sanitizeModelName(availableModels[0]);
    }
    return '';
  }

  function resolveGeneratorModel(doc, currentModelId, availableModels) {
    const haiku = getAtPath(doc, 'env.ANTHROPIC_DEFAULT_HAIKU_MODEL');
    if (typeof haiku === 'string' && haiku.trim()) {
      return sanitizeModelName(haiku);
    }

    const sonnet = getAtPath(doc, 'env.ANTHROPIC_DEFAULT_SONNET_MODEL');
    if (typeof sonnet === 'string' && sonnet.trim()) {
      return sanitizeModelName(sonnet);
    }

    const fallbacks = getAtPath(doc, 'fallbackModel');
    if (Array.isArray(fallbacks) && fallbacks.length > 0 && typeof fallbacks[0] === 'string' && fallbacks[0].trim()) {
      return sanitizeModelName(fallbacks[0]);
    }

    if (typeof currentModelId === 'string' && currentModelId.trim()) {
      return sanitizeModelName(currentModelId);
    }

    const discovered = findFastOrFirstDiscoveredModel(availableModels);
    if (discovered) return discovered;

    return 'claude-haiku-4-5-20251001';
  }

  function hasApiUrlAndKey(doc) {
    if (!doc || typeof doc !== 'object') return false;
    const rawBaseUrl = getAtPath(doc, 'env.ANTHROPIC_BASE_URL');
    const apiKey = getAtPath(doc, 'env.ANTHROPIC_API_KEY');
    const authToken = getAtPath(doc, 'env.ANTHROPIC_AUTH_TOKEN');

    const trimmedUrl = typeof rawBaseUrl === 'string' ? rawBaseUrl.trim() : '';
    const trimmedApiKey = typeof apiKey === 'string' ? apiKey.trim() : '';
    const trimmedAuthToken = typeof authToken === 'string' ? authToken.trim() : '';

    const hasUrl = trimmedUrl.length > 0 && (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://'));
    const hasKey = trimmedApiKey.length > 0 || trimmedAuthToken.length > 0;

    return Boolean(hasUrl && hasKey);
  }

  return {
    applyPatch: (doc, patch) => batchPatches(doc, [patch]),
    batchPatches,
    buildOpenAiChatCompletionsUrl,
    buildOpenAiModelsUrl,
    cleanDescriptionText,
    clone,
    createDescriptionPrompt,
    deepEqual,
    deleteAtPath,
    getAtPath,
    getClaudeEnvVarDescription,
    getKnownClaudeEnvVars,
    getCanonicalAnthropicModels,
    getDefaultKnownModels,
    hasApiUrlAndKey,
    inspectSettings,
    moveAtPath,
    normalizePath,
    parseOpenAiChatResponse,
    parseOpenAiModelsResponse,
    parseSettingsJson,
    redactSecrets,
    renameKeyAtPath,
    resolveGeneratorModel,
    sanitizeModelName,
    serializeSettings,
    setAtPath,
    validateSettingsDocument
  };
});
