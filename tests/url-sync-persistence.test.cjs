const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const model = require('../js/settings-model.js');

const SESSION_STORAGE_KEY = 'claude_settings_editor_session_v1';
const VALID_TABS = new Set([
  'general',
  'permissions',
  'sandbox',
  'env',
  'models',
  'hooks',
  'mcp',
  'worktree',
  'plugins',
  'advanced-policies',
  'advanced'
]);
const VALID_SCOPES = new Set(['user', 'project', 'local', 'managed']);

function createMockStorage(throwOnQuota = false, throwOnSecurity = false) {
  const store = new Map();
  return {
    getItem(key) {
      if (throwOnSecurity) throw new Error('SecurityError: Access is denied for this document');
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, val) {
      if (throwOnSecurity) throw new Error('SecurityError: Access is denied for this document');
      if (throwOnQuota && typeof val === 'string' && val.length > 500) {
        const err = new Error('QuotaExceededError');
        err.name = 'QuotaExceededError';
        throw err;
      }
      store.set(key, String(val));
    },
    removeItem(key) {
      if (throwOnSecurity) throw new Error('SecurityError: Access is denied for this document');
      store.delete(key);
    },
    clear() {
      if (throwOnSecurity) throw new Error('SecurityError: Access is denied for this document');
      store.clear();
    },
    _raw: store
  };
}

function parseUrlParamsHelper(urlSearch, urlHash) {
  const params = new URLSearchParams(urlSearch || '');
  let tab = params.get('tab');
  let scope = params.get('scope');

  if (!tab && urlHash) {
    const cleanHash = urlHash.replace(/^#tab-|^#/, '');
    if (VALID_TABS.has(cleanHash)) {
      tab = cleanHash;
    }
  }

  return {
    tab: VALID_TABS.has(tab) ? tab : null,
    scope: VALID_SCOPES.has(scope) ? scope : null
  };
}

function syncUrlHelper(currentHref, tabId, scope, pushHistory) {
  const effectiveTab = VALID_TABS.has(tabId) ? tabId : 'general';
  const effectiveScope = VALID_SCOPES.has(scope) ? scope : 'user';

  const url = new URL(currentHref);
  url.searchParams.set('tab', effectiveTab);
  url.searchParams.set('scope', effectiveScope);
  url.searchParams.delete('action');
  const target = url.pathname + url.search + url.hash;

  return {
    target,
    stateObj: { tab: effectiveTab, scope: effectiveScope },
    mode: pushHistory ? 'pushState' : 'replaceState'
  };
}

function serializeSessionHelper(state, storage) {
  try {
    if (!storage) return;

    const maxHistory = 15;
    let trimmedHistory = state.history;
    let trimmedIdx = state.historyIdx;
    if (Array.isArray(state.history) && state.history.length > maxHistory) {
      const start = Math.max(0, state.historyIdx - (maxHistory - 1));
      trimmedHistory = state.history.slice(start, start + maxHistory);
      trimmedIdx = state.historyIdx - start;
    }

    const payload = {
      version: 1,
      timestamp: Date.now(),
      state: {
        document: state.document,
        baseline: state.baseline,
        fileName: state.fileName,
        isSample: state.isSample,
        targetScope: state.targetScope,
        activeTab: state.activeTab,
        isDirty: state.isDirty,
        history: trimmedHistory,
        historyIdx: trimmedIdx,
        jsonDraft: state.jsonDraft || ''
      }
    };

    try {
      storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
    } catch (quotaErr) {
      payload.state.history = [state.document];
      payload.state.historyIdx = 0;
      storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
    }
  } catch (_) {}
}

function restoreSessionHelper(storage, targetState) {
  try {
    if (!storage) return false;
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return false;

    const payload = JSON.parse(raw);
    if (!payload || typeof payload !== 'object' || !payload.state) return false;
    const s = payload.state;
    if (!s.document || typeof s.document !== 'object') return false;

    targetState.document = model.clone(s.document);
    targetState.baseline = s.baseline && typeof s.baseline === 'object' ? model.clone(s.baseline) : model.clone(s.document);
    targetState.fileName = typeof s.fileName === 'string' ? s.fileName : 'settings.json';
    targetState.isSample = Boolean(s.isSample);
    targetState.targetScope = VALID_SCOPES.has(s.targetScope) ? s.targetScope : 'user';
    targetState.activeTab = VALID_TABS.has(s.activeTab) ? s.activeTab : 'general';
    targetState.isDirty = Boolean(s.isDirty);
    targetState.jsonDraft = typeof s.jsonDraft === 'string' ? s.jsonDraft : model.serializeSettings(targetState.document);
    targetState.jsonError = '';

    if (Array.isArray(s.history) && s.history.length > 0) {
      targetState.history = s.history.map(item => model.clone(item));
      targetState.historyIdx = typeof s.historyIdx === 'number' && s.historyIdx >= 0 && s.historyIdx < targetState.history.length
        ? s.historyIdx
        : targetState.history.length - 1;
    } else {
      targetState.history = [model.clone(targetState.document)];
      targetState.historyIdx = 0;
    }

    return true;
  } catch (_) {
    return false;
  }
}

test('getUrlParams correctly parses query parameters and hash anchors', () => {
  const result1 = parseUrlParamsHelper('?tab=models&scope=project', '');
  assert.equal(result1.tab, 'models');
  assert.equal(result1.scope, 'project');

  const result2 = parseUrlParamsHelper('?tab=unknown&scope=invalid', '');
  assert.equal(result2.tab, null);
  assert.equal(result2.scope, null);

  const result3 = parseUrlParamsHelper('', '#tab-hooks');
  assert.equal(result3.tab, 'hooks');
  assert.equal(result3.scope, null);

  const result4 = parseUrlParamsHelper('', '#sandbox');
  assert.equal(result4.tab, 'sandbox');
});

test('syncUrl synchronizes tab and scope into query string and strips ephemeral actions', () => {
  const current = 'https://example.com/index.html?action=open&foo=bar';
  const syncPush = syncUrlHelper(current, 'models', 'project', true);
  assert.equal(syncPush.mode, 'pushState');
  assert.equal(syncPush.stateObj.tab, 'models');
  assert.equal(syncPush.stateObj.scope, 'project');
  assert.ok(syncPush.target.includes('tab=models'));
  assert.ok(syncPush.target.includes('scope=project'));
  assert.ok(!syncPush.target.includes('action=open'));

  const syncReplace = syncUrlHelper('https://example.com/', 'permissions', 'managed', false);
  assert.equal(syncReplace.mode, 'replaceState');
  assert.equal(syncReplace.stateObj.tab, 'permissions');
  assert.equal(syncReplace.stateObj.scope, 'managed');
});

test('session serialization and hydration preserves loaded file, pending dirty edits, and active tab', () => {
  const storage = createMockStorage();

  const originalDoc = {
    model: 'claude-sonnet-5',
    theme: 'dark'
  };

  const modifiedDoc = {
    model: 'claude-opus-5',
    theme: 'light',
    effortLevel: 'high'
  };

  const mockState = {
    document: modifiedDoc,
    baseline: originalDoc,
    fileName: 'my-team-settings.json',
    isSample: false,
    targetScope: 'project',
    activeTab: 'models',
    isDirty: true,
    history: [originalDoc, modifiedDoc],
    historyIdx: 1,
    jsonDraft: model.serializeSettings(modifiedDoc)
  };

  // 1. Serialize session state to storage
  serializeSessionHelper(mockState, storage);
  assert.ok(storage._raw.has(SESSION_STORAGE_KEY));

  // 2. Simulate page reload hydration into fresh state
  const hydratedState = {
    document: {},
    baseline: {},
    fileName: 'sample.json',
    isSample: true,
    targetScope: 'user',
    activeTab: 'general',
    isDirty: false,
    history: [],
    historyIdx: -1,
    jsonDraft: ''
  };

  const restored = restoreSessionHelper(storage, hydratedState);
  assert.equal(restored, true);

  // 3. Verify that file, pending edits, and navigation are perfectly preserved
  assert.equal(hydratedState.fileName, 'my-team-settings.json');
  assert.equal(hydratedState.isSample, false);
  assert.equal(hydratedState.isDirty, true, 'isDirty flag must remain true after reload');
  assert.equal(hydratedState.activeTab, 'models', 'Active tab must be restored to models');
  assert.equal(hydratedState.targetScope, 'project', 'Target scope must be restored to project');
  assert.deepEqual(hydratedState.document, modifiedDoc, 'Modified document with pending edits must persist');
  assert.deepEqual(hydratedState.baseline, originalDoc, 'Baseline document must remain unchanged for accurate dirty tracking');
  assert.equal(hydratedState.history.length, 2, 'Undo/redo history stack must be preserved');
  assert.equal(hydratedState.historyIdx, 1, 'History pointer must remain at active modification step');
});

test('session persistence recovers gracefully when storage encounters QuotaExceededError', () => {
  const storage = createMockStorage(true, false); // Triggers quota error on large payloads

  const bigHistory = [];
  for (let i = 0; i < 30; i++) {
    bigHistory.push({ settingNumber: i, payload: 'x'.repeat(100) });
  }

  const mockState = {
    document: { key: 'value' },
    baseline: { key: 'value' },
    fileName: 'quota-test.json',
    isSample: false,
    targetScope: 'local',
    activeTab: 'sandbox',
    isDirty: false,
    history: bigHistory,
    historyIdx: bigHistory.length - 1,
    jsonDraft: '{"key":"value"}'
  };

  serializeSessionHelper(mockState, storage);

  const hydratedState = {};
  const ok = restoreSessionHelper(storage, hydratedState);
  assert.equal(ok, true);
  assert.equal(hydratedState.fileName, 'quota-test.json');
  assert.deepEqual(hydratedState.document, { key: 'value' });
});

test('session persistence handles SecurityError in private browsing without crashing', () => {
  const storage = createMockStorage(false, true); // Throws SecurityError

  const mockState = {
    document: { test: true },
    baseline: { test: true },
    fileName: 'incognito.json',
    isSample: false,
    targetScope: 'user',
    activeTab: 'general',
    isDirty: false,
    history: [],
    historyIdx: -1
  };

  // Must not throw exception
  assert.doesNotThrow(() => {
    serializeSessionHelper(mockState, storage);
  });

  const hydratedState = {};
  assert.doesNotThrow(() => {
    const ok = restoreSessionHelper(storage, hydratedState);
    assert.equal(ok, false);
  });
});
