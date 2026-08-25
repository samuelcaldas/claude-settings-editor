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
    const diagnostics = validateSettingsDocument(value, options && options.targetScope);
    return {
      ok: !diagnostics.some(d => d.severity === 'error'),
      value,
      diagnostics
    };
  }

  function serializeSettings(value) {
    return JSON.stringify(value || {}, null, 2) + '\n';
  }

  function invalidResult(message) {
    return {
      ok: false,
      value: null,
      diagnostics: [{ severity: 'error', path: '', message }]
    };
  }

  function validateSettingsDocument(value, targetScope) {
    const diagnostics = [];
    if (!isPlainObject(value)) {
      diagnostics.push({ severity: 'error', path: '', message: 'Root must be a JSON object' });
      return diagnostics;
    }

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

  return {
    applyPatch: (doc, patch) => batchPatches(doc, [patch]),
    batchPatches,
    buildOpenAiModelsUrl,
    clone,
    deepEqual,
    deleteAtPath,
    getAtPath,
    getDefaultKnownModels,
    inspectSettings: validateSettingsDocument,
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
