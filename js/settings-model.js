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

  const ENUMS = catalogModule ? catalogModule.ENUMS : {
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
    } catch (error) {
      return invalidResult('Invalid JSON: ' + error.message);
    }
    const validation = validateSettingsDocument(value);
    if (!validation.ok) return { ok: false, value: null, diagnostics: validation.diagnostics };
    return { ok: true, value: clone(value), diagnostics: validation.diagnostics };
  }

  function invalidResult(message) {
    return { ok: false, value: null, diagnostics: [{ severity: 'error', path: '$', message }] };
  }

  function validateSettingsDocument(value) {
    if (!isPlainObject(value)) return invalidResult('Settings root must be a JSON object');
    const diagnostics = inspectSettings(value);
    const errors = diagnostics.filter(item => item.severity === 'error');
    return { ok: errors.length === 0, diagnostics };
  }

  function inspectSettings(value, targetScope) {
    if (!isPlainObject(value)) return [{ severity: 'error', path: '$', message: 'Settings root must be a JSON object' }];
    const diagnostics = [];

    // Structural shapes validation
    KNOWN_SHAPES.forEach(([path, expected]) => {
      if (!(path in value)) return;
      const actual = Array.isArray(value[path]) ? 'array' : typeof value[path];
      if (actual !== expected || (expected === 'object' && !isPlainObject(value[path]))) {
        diagnostics.push({ severity: 'error', path, message: path + ' must be a ' + expected });
      }
    });

    // Enums inspection
    Object.entries(ENUMS).forEach(([path, allowed]) => {
      const current = getAtPath(value, path);
      if (current === undefined || current === null || current === '') return;
      if (typeof current === 'string' && current.startsWith('custom:')) return; // Custom themes allowed
      if (!allowed.includes(current)) {
        diagnostics.push({ severity: 'warning', path, message: 'Non-standard value preserved: ' + String(current) });
      }
    });

    // Specific constraints
    if (value.autoCompactWindow !== undefined && value.autoCompactWindow !== null) {
      const num = Number(value.autoCompactWindow);
      if (!Number.isFinite(num) || num < 100000 || num > 1000000) {
        diagnostics.push({ severity: 'warning', path: 'autoCompactWindow', message: 'autoCompactWindow should typically be between 100000 and 1000000 tokens' });
      }
    }

    if (Array.isArray(value.fallbackModel) && value.fallbackModel.length > 3) {
      diagnostics.push({ severity: 'warning', path: 'fallbackModel', message: 'Fallback model chains are capped at 3 models; excess models will be ignored by Claude Code.' });
    }

    if (value.cleanupPeriodDays !== undefined && value.cleanupPeriodDays !== null) {
      const days = Number(value.cleanupPeriodDays);
      if (!Number.isFinite(days) || days < 1) {
        diagnostics.push({ severity: 'error', path: 'cleanupPeriodDays', message: 'cleanupPeriodDays must be an integer of at least 1' });
      }
    }

    inspectHooks(value, diagnostics);
    inspectPermissions(value, diagnostics);
    inspectSandbox(value, diagnostics);

    if (targetScope) {
      inspectScope(value, targetScope, diagnostics);
    }

    return diagnostics;
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

    // Scope rules
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
      if ((value.permissions && value.permissions.skipDangerousModePermissionPrompt) || value.skipDangerousModePermissionPrompt) {
        diagnostics.push({
          severity: 'warning',
          path: value.skipDangerousModePermissionPrompt ? 'skipDangerousModePermissionPrompt' : 'permissions.skipDangerousModePermissionPrompt',
          message: 'skipDangerousModePermissionPrompt is ignored in Project settings.'
        });
      }
      if (value.skipAutoPermissionPrompt) {
        diagnostics.push({
          severity: 'warning',
          path: 'skipAutoPermissionPrompt',
          message: 'skipAutoPermissionPrompt is ignored in Project settings.'
        });
      }
    }

    if (targetScope !== 'managed') {
      if (value.allowManagedPermissionRulesOnly) {
        diagnostics.push({
          severity: 'warning',
          path: 'allowManagedPermissionRulesOnly',
          message: 'allowManagedPermissionRulesOnly is a Managed-only policy setting.'
        });
      }
      if (value.allowManagedHooksOnly) {
        diagnostics.push({
          severity: 'warning',
          path: 'allowManagedHooksOnly',
          message: 'allowManagedHooksOnly is a Managed-only policy setting.'
        });
      }
      if (value.allowManagedMcpServersOnly) {
        diagnostics.push({
          severity: 'warning',
          path: 'allowManagedMcpServersOnly',
          message: 'allowManagedMcpServersOnly is a Managed-only policy setting.'
        });
      }
    }
  }

  function getAtPath(root, path) {
    const segments = normalizePath(path);
    let current = root;
    for (const segment of segments) {
      if (current === null || current === undefined) return undefined;
      current = current[segment];
    }
    return current;
  }

  function setAtPath(root, path, value) {
    const segments = normalizePath(path);
    if (!segments.length) {
      if (!isPlainObject(value)) throw new Error('Settings root must be a JSON object');
      return clone(value);
    }
    const result = clone(root);
    if (!isPlainObject(result) && !Array.isArray(result)) throw new Error('Cannot set path on non-object root');
    let current = result;
    segments.forEach((segment, index) => {
      const last = index === segments.length - 1;
      if (last) {
        current[segment] = clone(value);
        return;
      }
      const nextSegment = segments[index + 1];
      if (current[segment] === undefined || current[segment] === null || typeof current[segment] !== 'object') {
        current[segment] = isArrayIndex(nextSegment) ? [] : {};
      }
      current = current[segment];
    });
    return result;
  }

  function deleteAtPath(root, path) {
    const segments = normalizePath(path);
    if (!segments.length) throw new Error('Cannot delete settings root');
    const result = clone(root);
    const parent = getAtPath(result, segments.slice(0, -1));
    if (parent === null || parent === undefined) return result;
    const key = segments[segments.length - 1];
    if (Array.isArray(parent) && isArrayIndex(key)) parent.splice(Number(key), 1);
    else if (isPlainObject(parent)) delete parent[key];
    return result;
  }

  function moveAtPath(root, path, fromIndex, toIndex) {
    const segments = normalizePath(path);
    const result = clone(root);
    const list = getAtPath(result, segments);
    if (!Array.isArray(list)) throw new Error('Move path must reference an array');
    if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) throw new Error('Move indexes must be integers');
    if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) return result;
    const item = list.splice(fromIndex, 1)[0];
    list.splice(toIndex, 0, item);
    return result;
  }

  function renameKeyAtPath(root, path, oldKey, newKey) {
    if (!oldKey || !newKey || oldKey === newKey) return root;
    if (UNSAFE_SEGMENTS.has(newKey) || UNSAFE_SEGMENTS.has(oldKey)) {
      throw new Error('Unsafe key name: ' + (UNSAFE_SEGMENTS.has(newKey) ? newKey : oldKey));
    }
    const segments = normalizePath(path);
    const result = clone(root);
    const targetObj = segments.length ? getAtPath(result, segments) : result;
    if (!isPlainObject(targetObj)) throw new Error('Target for key rename must be an object');
    if (oldKey in targetObj) {
      const val = targetObj[oldKey];
      delete targetObj[oldKey];
      targetObj[newKey] = val;
    }
    return result;
  }

  function applyPatch(root, patch) {
    if (!patch || typeof patch !== 'object') throw new Error('Patch must be an object');
    if (patch.op === 'set') return setAtPath(root, patch.path, patch.value);
    if (patch.op === 'delete') return deleteAtPath(root, patch.path);
    if (patch.op === 'move') {
      const from = patch.from !== undefined ? patch.from : patch.fromIndex;
      const to = patch.to !== undefined ? patch.to : patch.toIndex;
      return moveAtPath(root, patch.path, from, to);
    }
    if (patch.op === 'renameKey' || patch.op === 'rename_key') {
      const oldKey = patch.oldKey !== undefined ? patch.oldKey : patch.fromKey;
      const newKey = patch.newKey !== undefined ? patch.newKey : patch.toKey;
      return renameKeyAtPath(root, patch.path, oldKey, newKey);
    }
    throw new Error('Unsupported patch operation: ' + patch.op);
  }

  function batchPatches(root, patches) {
    if (!Array.isArray(patches)) throw new Error('patches must be an array');
    let current = root;
    for (const patch of patches) {
      current = applyPatch(current, patch);
    }
    return current;
  }

  function serializeSettings(value, spacing) {
    const validation = validateSettingsDocument(value);
    if (!validation.ok) throw new Error(validation.diagnostics.map(item => item.message).join('; '));
    return JSON.stringify(value, null, spacing === undefined ? 2 : spacing) + '\n';
  }

  function deepEqual(left, right) {
    if (Object.is(left, right)) return true;
    if (typeof left !== typeof right || left === null || right === null) return false;
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    if (Array.isArray(left)) return left.length === right.length && left.every((item, index) => deepEqual(item, right[index]));
    if (typeof left === 'object') {
      const leftKeys = Object.keys(left);
      const rightKeys = Object.keys(right);
      return leftKeys.length === rightKeys.length && leftKeys.every(key => Object.prototype.hasOwnProperty.call(right, key) && deepEqual(left[key], right[key]));
    }
    return false;
  }

  function redactSecrets(value) {
    if (Array.isArray(value)) return value.map(redactSecrets);
    if (!isPlainObject(value)) return value;
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
      const isSecret = SECRET_KEY_PATTERN.test(key);
      if (isSecret && typeof entry === 'string' && entry.trim().length > 0) {
        return [key, '[redacted]'];
      }
      return [key, redactSecrets(entry)];
    }));
  }

  const DEFAULT_KNOWN_MODELS = [
    'claude-3-7-sonnet-20250219',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-sonnet-5',
    'claude-opus-5',
    'claude-haiku-4-5-20251001',
    'claude-fable-5',
    'gpt-4o',
    'gpt-4o-mini',
    'o1',
    'o3-mini',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-3.7-flash-high[1m]',
    'gemini-3.7-flash-medium[1m]',
    'gemini-3.7-flash-low[1m]'
  ];

  function getDefaultKnownModels() {
    return DEFAULT_KNOWN_MODELS.slice();
  }

  function buildOpenAiModelsUrl(baseUrl) {
    if (!baseUrl || typeof baseUrl !== 'string') return '';
    const trimmed = baseUrl.trim().replace(/\/+$/, '');
    if (!trimmed) return '';
    if (trimmed.endsWith('/models')) return trimmed;
    if (trimmed.endsWith('/v1')) return trimmed + '/models';
    return trimmed + '/v1/models';
  }

  function parseOpenAiModelsResponse(payload) {
    if (!payload) return [];
    let data = payload;
    if (typeof payload === 'string') {
      try {
        data = JSON.parse(payload);
      } catch (_) {
        return [];
      }
    }
    let list = [];
    if (Array.isArray(data)) {
      list = data;
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.data)) {
        list = data.data;
      } else if (Array.isArray(data.models)) {
        list = data.models;
      }
    }
    const extracted = [];
    for (const item of list) {
      if (typeof item === 'string') {
        const id = item.trim();
        if (id) extracted.push(id);
      } else if (item && typeof item === 'object') {
        const candidate = item.id || item.name || item.model;
        if (typeof candidate === 'string') {
          const id = candidate.trim();
          if (id) extracted.push(id);
        }
      }
    }
    const unique = Array.from(new Set(extracted));
    unique.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return unique;
  }

  function isArrayIndex(segment) {
    return /^(0|[1-9]\d*)$/.test(String(segment));
  }

  return {
    ENUMS,
    KNOWN_SHAPES,
    DEFAULT_KNOWN_MODELS,
    applyPatch,
    batchPatches,
    buildOpenAiModelsUrl,
    clone,
    deepEqual,
    deleteAtPath,
    getAtPath,
    getDefaultKnownModels,
    inspectPermissions,
    inspectSandbox,
    inspectScope,
    inspectSettings,
    isPlainObject,
    moveAtPath,
    normalizePath,
    parseOpenAiModelsResponse,
    parseSettingsJson,
    redactSecrets,
    renameKeyAtPath,
    serializeSettings,
    setAtPath,
    validateSettingsDocument
  };
});
