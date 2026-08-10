(function exposeSettingsModel(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SettingsModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSettingsModel() {
  const UNSAFE_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);
  const SECRET_KEY_PATTERN = /(api[_-]?key|auth[_-]?token|access[_-]?token|secret|password|private[_-]?key)/i;
  const KNOWN_SHAPES = [
    ['env', 'object'],
    ['permissions', 'object'],
    ['worktree', 'object'],
    ['statusLine', 'object'],
    ['fallbackModel', 'array'],
    ['enabledPlugins', 'object'],
    ['hooks', 'object'],
    ['extraKnownMarketplaces', 'object']
  ];
  const ENUMS = {
    'permissions.defaultMode': ['default', 'autoEdit', 'bypassPermissions', 'plan'],
    theme: ['dark', 'light', 'system'],
    tui: ['fullscreen', 'default'],
    editorMode: ['normal', 'vim'],
    effortLevel: ['low', 'medium', 'high', 'xhigh', 'max'],
    preferredNotifChannel: ['terminal_bell', 'desktop', 'none'],
    'worktree.baseRef': ['fresh', 'head']
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

  function inspectSettings(value) {
    if (!isPlainObject(value)) return [{ severity: 'error', path: '$', message: 'Settings root must be a JSON object' }];
    const diagnostics = [];
    KNOWN_SHAPES.forEach(([path, expected]) => {
      if (!(path in value)) return;
      const actual = Array.isArray(value[path]) ? 'array' : typeof value[path];
      if (actual !== expected || (expected === 'object' && !isPlainObject(value[path]))) {
        diagnostics.push({ severity: 'error', path, message: path + ' must be a ' + expected });
      }
    });
    Object.entries(ENUMS).forEach(([path, allowed]) => {
      const current = getAtPath(value, path);
      if (current === undefined || current === null || current === '') return;
      if (!allowed.includes(current)) {
        diagnostics.push({ severity: 'warning', path, message: 'Unknown value preserved: ' + String(current) });
      }
    });
    inspectHooks(value, diagnostics);
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

  function applyPatch(root, patch) {
    if (!patch || typeof patch !== 'object') throw new Error('Patch must be an object');
    if (patch.op === 'set') return setAtPath(root, patch.path, patch.value);
    if (patch.op === 'delete') return deleteAtPath(root, patch.path);
    if (patch.op === 'move') return moveAtPath(root, patch.path, patch.from, patch.to);
    throw new Error('Unsupported patch operation: ' + patch.op);
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
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, SECRET_KEY_PATTERN.test(key) ? '[redacted]' : redactSecrets(entry)]));
  }

  function isArrayIndex(segment) {
    return /^(0|[1-9]\d*)$/.test(String(segment));
  }

  return {
    clone,
    deepEqual,
    deleteAtPath,
    getAtPath,
    inspectSettings,
    isPlainObject,
    moveAtPath,
    normalizePath,
    parseSettingsJson,
    redactSecrets,
    serializeSettings,
    setAtPath,
    validateSettingsDocument
  };
});
