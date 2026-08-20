(function initApp() {
  const model = window.SettingsModel;
  const catalog = window.SettingsCatalog;
  const i18n = window.I18n;
  if (!model) throw new Error('SettingsModel script not loaded');

  // Application document state
  const state = {
    document: {},
    baseline: {},
    targetScope: 'user',
    jsonDraft: '',
    jsonError: '',
    diagnostics: [],
    activeTab: 'general',
    isDirty: false,
    history: [],
    historyIdx: -1,
    envMasked: true
  };

  document.addEventListener('DOMContentLoaded', () => {
    initLocale();
    bindEvents();
    registerServiceWorker();
    loadDefaultSample();
  });

  function initLocale() {
    if (!i18n) return;
    const detected = i18n.detectLocale();
    i18n.setLocale(detected, false);

    const langSelect = getElement('lang-select');
    if (langSelect) {
      langSelect.value = i18n.getLocale();
      langSelect.addEventListener('change', e => {
        i18n.setLocale(e.target.value);
        renderAll();
      });
    }
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.warn('Service worker registration failed:', err);
      });
    }
  }

  function loadDefaultSample() {
    fetch('./sample.json')
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(source => setDocumentFromSource(source, 'status.sampleLoaded'))
      .catch(err => {
        setDocumentFromObject({}, 'status.initEmpty');
        setStatus('status.loadSampleErr', 'err', { error: err.message });
      });
  }

  function setDocumentFromSource(source, statusMsgKey, statusParams) {
    const result = model.parseSettingsJson(source);
    state.jsonDraft = source;
    if (!result.ok) {
      state.jsonError = result.diagnostics.map(d => d.message).join('; ');
      state.diagnostics = result.diagnostics;
      renderDiagnostics();
      renderJsonEditor();
      setStatus('status.invalidSource', 'err');
      return;
    }
    state.jsonError = '';
    state.diagnostics = model.inspectSettings(result.value, state.targetScope);
    setDocumentFromObject(result.value, statusMsgKey, statusParams);
  }

  function setDocumentFromObject(obj, statusMsgKey, statusParams) {
    state.document = model.clone(obj);
    state.baseline = model.clone(obj);
    state.jsonDraft = model.serializeSettings(state.document);
    state.jsonError = '';
    state.isDirty = false;
    state.history = [model.clone(state.document)];
    state.historyIdx = 0;
    state.diagnostics = model.inspectSettings(state.document, state.targetScope);

    renderAll();
    if (statusMsgKey) setStatus(statusMsgKey, 'ok', statusParams);
  }

  function applyPatch(patch) {
    try {
      const next = model.applyPatch(state.document, patch);
      const validation = model.validateSettingsDocument(next);
      if (!validation.ok) {
        setStatus('status.invalidChange', 'err', { message: validation.diagnostics.map(d => d.message).join('; ') });
        return;
      }
      state.document = next;
      state.jsonDraft = model.serializeSettings(state.document);
      state.jsonError = '';
      state.diagnostics = model.inspectSettings(state.document, state.targetScope);
      state.isDirty = !model.deepEqual(state.document, state.baseline);

      pushHistory(state.document);
      renderAll();
    } catch (err) {
      setStatus('status.editFailed', 'err', { error: err.message });
    }
  }

  function pushHistory(doc) {
    if (state.historyIdx < state.history.length - 1) {
      state.history = state.history.slice(0, state.historyIdx + 1);
    }
    state.history.push(model.clone(doc));
    if (state.history.length > 50) state.history.shift();
    state.historyIdx = state.history.length - 1;
  }

  function undo() {
    if (state.historyIdx <= 0) return;
    state.historyIdx--;
    state.document = model.clone(state.history[state.historyIdx]);
    state.jsonDraft = model.serializeSettings(state.document);
    state.diagnostics = model.inspectSettings(state.document, state.targetScope);
    state.isDirty = !model.deepEqual(state.document, state.baseline);
    renderAll();
    setStatus('status.undo', 'ok');
  }

  function redo() {
    if (state.historyIdx >= state.history.length - 1) return;
    state.historyIdx++;
    state.document = model.clone(state.history[state.historyIdx]);
    state.jsonDraft = model.serializeSettings(state.document);
    state.diagnostics = model.inspectSettings(state.document, state.targetScope);
    state.isDirty = !model.deepEqual(state.document, state.baseline);
    renderAll();
    setStatus('status.redo', 'ok');
  }

  function bindEvents() {
    // Header actions
    getElement('btn-load')?.addEventListener('click', () => getElement('file-input')?.click());
    getElement('btn-load-mobile')?.addEventListener('click', () => getElement('file-input')?.click());
    getElement('btn-sample')?.addEventListener('click', () => loadDefaultSample());
    getElement('btn-download')?.addEventListener('click', downloadSettings);
    getElement('btn-download-mobile')?.addEventListener('click', downloadSettings);
    getElement('btn-undo')?.addEventListener('click', undo);
    getElement('btn-redo')?.addEventListener('click', redo);
    getElement('file-input')?.addEventListener('change', onFileSelected);

    // Scope selection
    const scopeSelect = getElement('scope-select');
    if (scopeSelect) {
      scopeSelect.value = state.targetScope;
      scopeSelect.addEventListener('change', e => {
        state.targetScope = e.target.value;
        state.diagnostics = model.inspectSettings(state.document, state.targetScope);
        renderScopeInfo();
        renderDiagnostics();
      });
    }

    // Tabs
    document.querySelectorAll('[role="tab"]').forEach(btn => {
      btn.addEventListener('click', e => {
        const tab = e.currentTarget.getAttribute('data-tab');
        if (tab) switchTab(tab);
      });
    });

    // Form fields two-way binding
    document.querySelectorAll('[data-setting-path]').forEach(input => {
      const path = input.getAttribute('data-setting-path');
      const eventType = input.type === 'checkbox' || input.tagName === 'SELECT' ? 'change' : 'input';
      input.addEventListener(eventType, () => {
        let val;
        if (input.type === 'checkbox') {
          val = input.checked;
          if (val === false) {
            applyPatch({ op: 'set', path, value: false });
            return;
          }
        } else if (input.type === 'number') {
          val = input.value === '' ? undefined : Number(input.value);
        } else {
          val = input.value.trim();
          if (val === '') val = undefined;
        }

        if (val === undefined) {
          applyPatch({ op: 'delete', path });
        } else {
          applyPatch({ op: 'set', path, value: val });
        }
      });
    });

    // Unset buttons
    document.querySelectorAll('[data-unset-path]').forEach(btn => {
      btn.addEventListener('click', () => {
        const path = btn.getAttribute('data-unset-path');
        applyPatch({ op: 'delete', path });
      });
    });

    // String lists add buttons
    setupStringListAdders();

    // Environment Presets
    getElement('btn-preset-anthropic')?.addEventListener('click', () => {
      const current = model.getAtPath(state.document, 'env') || {};
      const next = { ...current, ANTHROPIC_API_KEY: current.ANTHROPIC_API_KEY || 'sk-ant-api03-...', ANTHROPIC_BASE_URL: current.ANTHROPIC_BASE_URL || 'https://api.anthropic.com' };
      applyPatch({ op: 'set', path: 'env', value: next });
    });

    getElement('btn-preset-telemetry')?.addEventListener('click', () => {
      const current = model.getAtPath(state.document, 'env') || {};
      const next = { ...current, OTEL_EXPORTER_OTLP_ENDPOINT: current.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317', OTEL_EXPORTER_OTLP_HEADERS: current.OTEL_EXPORTER_OTLP_HEADERS || 'api-key=secret' };
      applyPatch({ op: 'set', path: 'env', value: next });
    });

    getElement('btn-preset-models')?.addEventListener('click', () => {
      const current = model.getAtPath(state.document, 'env') || {};
      const next = { ...current, ANTHROPIC_MODEL: current.ANTHROPIC_MODEL || 'claude-sonnet-5' };
      applyPatch({ op: 'set', path: 'env', value: next });
    });

    getElement('btn-add-env-var')?.addEventListener('click', addEnvVar);
    getElement('new-env-val')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') addEnvVar();
    });

    // Dynamic builders
    getElement('btn-add-fallback')?.addEventListener('click', addFallbackModel);
    getElement('new-model-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') addFallbackModel();
    });

    getElement('btn-add-plugin')?.addEventListener('click', addPlugin);
    getElement('new-plugin-key')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') addPlugin();
    });

    getElement('btn-add-marketplace')?.addEventListener('click', addMarketplace);
    getElement('btn-add-hook')?.addEventListener('click', addHookEvent);

    // Advanced JSON Toolbar
    getElement('btn-apply-json')?.addEventListener('click', applyJsonDraft);
    getElement('btn-discard-json')?.addEventListener('click', discardJsonDraft);
    getElement('btn-format-json')?.addEventListener('click', formatJsonDraft);
    getElement('btn-copy-json')?.addEventListener('click', copyJsonDraft);
    getElement('btn-reset-json')?.addEventListener('click', loadDefaultSample);

    getElement('json-editor')?.addEventListener('input', e => {
      state.jsonDraft = e.target.value;
      validateDraftOnly(state.jsonDraft);
    });
  }

  function setupStringListAdders() {
    const mappings = [
      { btn: 'btn-add-deny-rule', inp: 'new-deny-rule', path: 'permissions.deny' },
      { btn: 'btn-add-ask-rule', inp: 'new-ask-rule', path: 'permissions.ask' },
      { btn: 'btn-add-allow-rule', inp: 'new-allow-rule', path: 'permissions.allow' },
      { btn: 'btn-add-dir', inp: 'new-add-dir', path: 'permissions.additionalDirectories' },
      { btn: 'btn-add-sb-allow-write', inp: 'new-sb-allow-write', path: 'sandbox.filesystem.allowWrite' },
      { btn: 'btn-add-sb-deny-write', inp: 'new-sb-deny-write', path: 'sandbox.filesystem.denyWrite' },
      { btn: 'btn-add-sb-deny-read', inp: 'new-sb-deny-read', path: 'sandbox.filesystem.denyRead' },
      { btn: 'btn-add-sb-allow-read', inp: 'new-sb-allow-read', path: 'sandbox.filesystem.allowRead' },
      { btn: 'btn-add-sb-allow-domain', inp: 'new-sb-allow-domain', path: 'sandbox.network.allowedDomains' },
      { btn: 'btn-add-sb-deny-domain', inp: 'new-sb-deny-domain', path: 'sandbox.network.deniedDomains' },
      { btn: 'btn-add-sb-excluded-cmd', inp: 'new-sb-excluded-cmd', path: 'sandbox.excludedCommands' },
      { btn: 'btn-add-hook-url', inp: 'new-hook-url', path: 'allowedHttpHookUrls' },
      { btn: 'btn-add-mcp-enabled', inp: 'new-mcp-enabled-server', path: 'enabledMcpjsonServers' },
      { btn: 'btn-add-mcp-disabled', inp: 'new-mcp-disabled-server', path: 'disabledMcpjsonServers' },
      { btn: 'btn-add-wt-symlink', inp: 'new-wt-symlink', path: 'worktree.symlinkDirectories' },
      { btn: 'btn-add-wt-sparse', inp: 'new-wt-sparse', path: 'worktree.sparsePaths' }
    ];

    mappings.forEach(({ btn, inp, path }) => {
      const btnEl = getElement(btn);
      const inpEl = getElement(inp);
      if (!btnEl || !inpEl) return;

      const handler = () => {
        const val = inpEl.value.trim();
        if (!val) return;
        const current = model.getAtPath(state.document, path) || [];
        const next = Array.isArray(current) ? [...current, val] : [val];
        applyPatch({ op: 'set', path, value: next });
        inpEl.value = '';
      };

      btnEl.addEventListener('click', handler);
      inpEl.addEventListener('keydown', e => {
        if (e.key === 'Enter') handler();
      });
    });
  }

  function switchTab(tabName) {
    state.activeTab = tabName;
    document.querySelectorAll('[role="tab"]').forEach(b => {
      const isActive = b.getAttribute('data-tab') === tabName;
      b.setAttribute('aria-selected', isActive ? 'true' : 'false');
      b.classList.toggle('active', isActive);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      const isActive = panel.id === 'tab-' + tabName;
      panel.classList.toggle('active', isActive);
      panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });

    if (tabName === 'advanced') {
      renderJsonEditor();
    }
  }

  function renderAll() {
    renderHeaderStatus();
    renderScopeInfo();
    renderFormFields();
    renderStringLists();
    renderEnvVars();
    renderFallbackList();
    renderPluginList();
    renderMarketplaces();
    renderHooks();
    renderDiagnostics();
    renderJsonEditor();
  }

  function renderHeaderStatus() {
    const badge = getElement('dirty-badge');
    if (badge) badge.classList.toggle('active', state.isDirty);
    const undoBtn = getElement('btn-undo');
    if (undoBtn) undoBtn.disabled = state.historyIdx <= 0;
    const redoBtn = getElement('btn-redo');
    if (redoBtn) redoBtn.disabled = state.historyIdx >= state.history.length - 1;
  }

  function renderScopeInfo() {
    const pill = getElement('scope-info-pill');
    if (!pill) return;
    const scopeDef = catalog ? catalog.getScopeDefinition(state.targetScope) : null;
    const localizedScope = i18n ? i18n.t('scope.info.' + state.targetScope) : '';
    if (localizedScope && localizedScope !== 'scope.info.' + state.targetScope) {
      pill.textContent = localizedScope;
    } else if (scopeDef) {
      pill.textContent = scopeDef.label + ' (' + scopeDef.path + ')';
    } else {
      pill.textContent = state.targetScope.toUpperCase() + ' Scope';
    }
  }

  function renderFormFields() {
    document.querySelectorAll('[data-setting-path]').forEach(input => {
      const path = input.getAttribute('data-setting-path');
      const val = model.getAtPath(state.document, path);
      if (input.type === 'checkbox') {
        input.checked = Boolean(val);
      } else {
        input.value = val !== undefined && val !== null ? String(val) : '';
      }
    });
  }

  function renderStringLists() {
    const lists = [
      { id: 'list-permissions-deny', path: 'permissions.deny' },
      { id: 'list-permissions-ask', path: 'permissions.ask' },
      { id: 'list-permissions-allow', path: 'permissions.allow' },
      { id: 'list-permissions-additionalDirs', path: 'permissions.additionalDirectories' },
      { id: 'list-sb-allow-write', path: 'sandbox.filesystem.allowWrite' },
      { id: 'list-sb-deny-write', path: 'sandbox.filesystem.denyWrite' },
      { id: 'list-sb-deny-read', path: 'sandbox.filesystem.denyRead' },
      { id: 'list-sb-allow-read', path: 'sandbox.filesystem.allowRead' },
      { id: 'list-sb-allow-domains', path: 'sandbox.network.allowedDomains' },
      { id: 'list-sb-deny-domains', path: 'sandbox.network.deniedDomains' },
      { id: 'list-sb-excluded-commands', path: 'sandbox.excludedCommands' },
      { id: 'list-hook-allowed-urls', path: 'allowedHttpHookUrls' },
      { id: 'list-mcp-enabled', path: 'enabledMcpjsonServers' },
      { id: 'list-mcp-disabled', path: 'disabledMcpjsonServers' },
      { id: 'list-worktree-symlinks', path: 'worktree.symlinkDirectories' },
      { id: 'list-worktree-sparse', path: 'worktree.sparsePaths' }
    ];

    lists.forEach(({ id, path }) => {
      const container = getElement(id);
      if (!container) return;
      container.replaceChildren();

      const items = model.getAtPath(state.document, path) || [];
      if (!Array.isArray(items)) {
        const err = document.createElement('div');
        err.className = 'field-hint';
        err.textContent = path + ' is not an array; edit in Advanced JSON.';
        container.appendChild(err);
        return;
      }

      if (items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'field-hint';
        empty.textContent = i18n ? i18n.t('empty.none') : 'None configured.';
        container.appendChild(empty);
        return;
      }

      items.forEach((itemVal, idx) => {
        const row = document.createElement('div');
        row.className = 'rule-item';

        const text = document.createElement('code');
        text.className = 'rule-text';
        text.textContent = String(itemVal);

        const del = document.createElement('button');
        del.className = 'del-btn';
        del.textContent = '×';
        del.title = i18n ? i18n.t('actions.remove') : 'Remove';
        del.addEventListener('click', () => {
          applyPatch({ op: 'delete', path: [...path.split('.'), idx] });
        });

        row.append(text, del);
        container.appendChild(row);
      });
    });
  }

  function renderEnvVars() {
    const container = getElement('env-var-list');
    if (!container) return;
    container.replaceChildren();

    const env = model.getAtPath(state.document, 'env') || {};
    if (!model.isPlainObject(env)) {
      const err = document.createElement('div');
      err.className = 'field-hint';
      err.textContent = i18n ? i18n.t('env.notObject') : 'env is not an object; edit in Advanced JSON.';
      container.appendChild(err);
      return;
    }

    const entries = Object.entries(env);
    if (!entries.length) {
      const empty = document.createElement('div');
      empty.className = 'field-hint';
      empty.textContent = i18n ? i18n.t('env.empty') : 'No environment variables set in settings.';
      container.appendChild(empty);
      return;
    }

    entries.forEach(([key, val]) => {
      const row = document.createElement('div');
      row.className = 'env-item';

      const keyInp = document.createElement('input');
      keyInp.type = 'text';
      keyInp.value = key;
      keyInp.style.flex = '1';
      keyInp.addEventListener('change', () => {
        const newKey = keyInp.value.trim();
        if (newKey && newKey !== key) {
          applyPatch({ op: 'renameKey', path: 'env', oldKey: key, newKey });
        }
      });

      const valInp = document.createElement('input');
      valInp.type = 'text';
      valInp.value = String(val);
      valInp.style.flex = '2';
      valInp.addEventListener('change', () => {
        applyPatch({ op: 'set', path: ['env', key], value: valInp.value });
      });

      const del = document.createElement('button');
      del.className = 'del-btn';
      del.textContent = '×';
      del.title = i18n ? i18n.t('actions.remove') : 'Delete variable';
      del.addEventListener('click', () => {
        applyPatch({ op: 'delete', path: ['env', key] });
      });

      row.append(keyInp, valInp, del);
      container.appendChild(row);
    });
  }

  function addEnvVar() {
    const keyInp = getElement('new-env-key');
    const valInp = getElement('new-env-val');
    const k = keyInp?.value.trim();
    const v = valInp?.value ?? '';
    if (!k) return;
    applyPatch({ op: 'set', path: ['env', k], value: v });
    keyInp.value = '';
    valInp.value = '';
  }

  function renderFallbackList() {
    const container = getElement('fallback-list');
    if (!container) return;
    container.replaceChildren();

    const list = model.getAtPath(state.document, 'fallbackModel') || [];
    if (!Array.isArray(list)) {
      const err = document.createElement('div');
      err.className = 'field-hint';
      err.textContent = i18n ? i18n.t('fallback.notArray') : 'fallbackModel is not an array; edit in Advanced JSON.';
      container.appendChild(err);
      return;
    }

    list.forEach((m, idx) => {
      const item = document.createElement('div');
      item.className = 'model-item';

      const num = document.createElement('span');
      num.style.fontSize = '12px';
      num.style.color = 'var(--text-muted)';
      num.textContent = (idx + 1) + '.';

      const input = document.createElement('input');
      input.type = 'text';
      input.value = String(m);
      input.addEventListener('change', () => {
        const next = input.value.trim();
        if (next) {
          applyPatch({ op: 'set', path: ['fallbackModel', idx], value: next });
        }
      });

      const up = document.createElement('button');
      up.className = 'btn small';
      up.textContent = '▲';
      up.title = i18n ? i18n.t('actions.moveUp') : 'Move up';
      up.disabled = idx === 0;
      up.addEventListener('click', () => applyPatch({ op: 'move', path: 'fallbackModel', from: idx, to: idx - 1 }));

      const down = document.createElement('button');
      down.className = 'btn small';
      down.textContent = '▼';
      down.title = i18n ? i18n.t('actions.moveDown') : 'Move down';
      down.disabled = idx === list.length - 1;
      down.addEventListener('click', () => applyPatch({ op: 'move', path: 'fallbackModel', from: idx, to: idx + 1 }));

      const del = document.createElement('button');
      del.className = 'del-btn';
      del.textContent = '×';
      del.title = i18n ? i18n.t('actions.remove') : 'Remove';
      del.addEventListener('click', () => applyPatch({ op: 'delete', path: ['fallbackModel', idx] }));

      item.append(num, input, up, down, del);
      container.appendChild(item);
    });
  }

  function addFallbackModel() {
    const input = getElement('new-model-input');
    const v = input.value.trim();
    if (!v) return;
    const current = model.getAtPath(state.document, 'fallbackModel') || [];
    const list = Array.isArray(current) ? [...current, v] : [v];
    applyPatch({ op: 'set', path: 'fallbackModel', value: list });
    input.value = '';
  }

  function renderPluginList() {
    const container = getElement('plugin-list');
    if (!container) return;
    container.replaceChildren();

    const plugins = model.getAtPath(state.document, 'enabledPlugins') || {};
    if (!model.isPlainObject(plugins)) {
      const err = document.createElement('div');
      err.className = 'field-hint';
      err.textContent = i18n ? i18n.t('plugin.notObject') : 'enabledPlugins is not an object; edit in Advanced JSON.';
      container.appendChild(err);
      return;
    }

    const entries = Object.entries(plugins);
    if (!entries.length) {
      const empty = document.createElement('div');
      empty.className = 'field-hint';
      empty.textContent = i18n ? i18n.t('plugin.empty') : 'No plugins registered in settings.';
      container.appendChild(empty);
      return;
    }

    entries.forEach(([key, enabled]) => {
      const item = document.createElement('div');
      item.className = 'plugin-item';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = Boolean(enabled);
      cb.addEventListener('change', () => {
        applyPatch({ op: 'set', path: ['enabledPlugins', key], value: cb.checked });
      });

      const label = document.createElement('code');
      label.style.flex = '1';
      label.textContent = key;

      const del = document.createElement('button');
      del.className = 'del-btn';
      del.textContent = '×';
      del.title = i18n ? i18n.t('actions.remove') : 'Remove plugin';
      del.addEventListener('click', () => {
        applyPatch({ op: 'delete', path: ['enabledPlugins', key] });
      });

      item.append(cb, label, del);
      container.appendChild(item);
    });
  }

  function addPlugin() {
    const input = getElement('new-plugin-key');
    const k = input.value.trim();
    if (!k) return;
    applyPatch({ op: 'set', path: ['enabledPlugins', k], value: true });
    input.value = '';
  }

  function renderMarketplaces() {
    const container = getElement('marketplace-list');
    if (!container) return;
    container.replaceChildren();

    const mkts = model.getAtPath(state.document, 'extraKnownMarketplaces') || {};
    if (!Object.keys(mkts).length) {
      const empty = document.createElement('div');
      empty.className = 'field-hint';
      empty.textContent = i18n ? i18n.t('mkt.empty') : 'No extra marketplaces configured.';
      container.appendChild(empty);
      return;
    }

    Object.entries(mkts).forEach(([name, config]) => {
      const item = document.createElement('div');
      item.className = 'plugin-item';

      const code = document.createElement('code');
      code.textContent = name;

      const desc = document.createElement('span');
      desc.style.fontSize = '12px';
      desc.style.color = 'var(--text-muted)';
      desc.style.flex = '1';
      desc.style.marginLeft = '12px';

      if (typeof config === 'object' && config !== null) {
        desc.textContent = (config.source?.type || 'source') + ': ' + (config.source?.repo || config.source?.url || config.source?.path || JSON.stringify(config.source));
      } else {
        desc.textContent = String(config);
      }

      const del = document.createElement('button');
      del.className = 'del-btn';
      del.textContent = '×';
      del.title = i18n ? i18n.t('actions.remove') : 'Remove marketplace';
      del.addEventListener('click', () => {
        applyPatch({ op: 'delete', path: ['extraKnownMarketplaces', name] });
      });

      item.append(code, desc, del);
      container.appendChild(item);
    });
  }

  function addMarketplace() {
    const nameInp = getElement('new-marketplace-name');
    const typeSel = getElement('new-marketplace-type');
    const srcInp = getElement('new-marketplace-src');
    const name = nameInp?.value.trim();
    const type = typeSel?.value || 'github';
    const src = srcInp?.value.trim();
    if (!name || !src) return;

    let sourceObj = { type };
    if (type === 'github') sourceObj.repo = src;
    else if (type === 'git' || type === 'url') sourceObj.url = src;
    else if (type === 'directory') sourceObj.path = src;

    applyPatch({ op: 'set', path: ['extraKnownMarketplaces', name], value: { source: sourceObj } });
    nameInp.value = '';
    srcInp.value = '';
  }

  function renderHooks() {
    const container = getElement('hooks-container');
    if (!container) return;
    container.replaceChildren();

    const hooks = model.getAtPath(state.document, 'hooks') || {};
    if (!model.isPlainObject(hooks)) {
      const err = document.createElement('div');
      err.className = 'field-hint';
      err.textContent = i18n ? i18n.t('hooks.notObject') : 'hooks is not an object; edit in Advanced JSON.';
      container.appendChild(err);
      return;
    }

    const events = Object.entries(hooks);
    if (!events.length) {
      const empty = document.createElement('div');
      empty.className = 'field-hint';
      empty.textContent = i18n ? i18n.t('hooks.empty') : 'No hooks configured.';
      container.appendChild(empty);
      return;
    }

    events.forEach(([eventName, groups]) => {
      const card = document.createElement('div');
      card.className = 'hook-card';

      const head = document.createElement('div');
      head.className = 'field-header';

      const title = document.createElement('strong');
      title.style.color = 'var(--blue)';
      title.textContent = eventName;

      const delEvt = document.createElement('button');
      delEvt.className = 'del-btn';
      delEvt.textContent = '×';
      delEvt.title = i18n ? i18n.t('hooks.deleteEvent') : 'Delete event';
      delEvt.addEventListener('click', () => applyPatch({ op: 'delete', path: ['hooks', eventName] }));

      head.append(title, delEvt);
      card.appendChild(head);

      if (Array.isArray(groups)) {
        groups.forEach((group, gIdx) => {
          const groupEl = document.createElement('div');
          groupEl.className = 'hook-group';

          const groupHead = document.createElement('div');
          groupHead.className = 'hook-group-header';

          const matchLabel = document.createElement('span');
          if (group?.matcher) {
            matchLabel.textContent = i18n ? i18n.t('hooks.groupWithMatcher', { number: gIdx + 1, matcher: group.matcher }) : ('Group ' + (gIdx + 1) + ' (matcher: ' + group.matcher + ')');
          } else {
            matchLabel.textContent = i18n ? i18n.t('hooks.group', { number: gIdx + 1 }) : ('Group ' + (gIdx + 1));
          }
          matchLabel.className = 'field-hint';

          groupHead.appendChild(matchLabel);
          groupEl.appendChild(groupHead);

          const list = group && Array.isArray(group.hooks) ? group.hooks : [];
          list.forEach((hookItem, cIdx) => {
            const row = document.createElement('div');
            row.className = 'hook-handler-row';

            const typeSelect = document.createElement('select');
            ['command', 'http', 'prompt', 'agent'].forEach(t => {
              const opt = document.createElement('option');
              opt.value = t;
              opt.textContent = t;
              if (t === (hookItem.type || 'command')) opt.selected = true;
              typeSelect.appendChild(opt);
            });
            typeSelect.addEventListener('change', () => {
              applyPatch({ op: 'set', path: ['hooks', eventName, gIdx, 'hooks', cIdx, 'type'], value: typeSelect.value });
            });

            const valInp = document.createElement('input');
            valInp.type = 'text';
            valInp.placeholder = hookItem.type === 'http' ? (i18n ? i18n.t('hooks.urlPlaceholder') : 'URL (https://...)') : (i18n ? i18n.t('hooks.cmdPlaceholder') : 'Command / prompt text');
            valInp.value = String(hookItem.command || hookItem.url || hookItem.prompt || '');
            valInp.style.flex = '1';
            valInp.addEventListener('change', () => {
              const key = hookItem.type === 'http' ? 'url' : (hookItem.type === 'prompt' ? 'prompt' : 'command');
              applyPatch({ op: 'set', path: ['hooks', eventName, gIdx, 'hooks', cIdx, key], value: valInp.value });
            });

            const delCmd = document.createElement('button');
            delCmd.className = 'del-btn';
            delCmd.textContent = '×';
            delCmd.addEventListener('click', () => {
              applyPatch({ op: 'delete', path: ['hooks', eventName, gIdx, 'hooks', cIdx] });
            });

            row.append(typeSelect, valInp, delCmd);
            groupEl.appendChild(row);
          });

          const addHandlerBtn = document.createElement('button');
          addHandlerBtn.className = 'btn small';
          addHandlerBtn.style.marginTop = '6px';
          addHandlerBtn.textContent = i18n ? i18n.t('hooks.addHandler') : '+ Add handler';
          addHandlerBtn.addEventListener('click', () => {
            const currentHandlers = group?.hooks || [];
            const nextHandlers = [...currentHandlers, { type: 'command', command: '', timeout: 30 }];
            applyPatch({ op: 'set', path: ['hooks', eventName, gIdx, 'hooks'], value: nextHandlers });
          });

          groupEl.appendChild(addHandlerBtn);
          card.appendChild(groupEl);
        });
      }

      container.appendChild(card);
    });
  }

  function addHookEvent() {
    const sel = getElement('new-hook-event-select');
    const ev = sel?.value;
    if (!ev) return;
    const current = model.getAtPath(state.document, ['hooks', ev]);
    if (!current) {
      applyPatch({ op: 'set', path: ['hooks', ev], value: [{ hooks: [{ type: 'command', command: '' }] }] });
    }
  }

  function renderDiagnostics() {
    const banner = getElement('diagnostic-banner');
    if (!banner) return;
    banner.replaceChildren();

    if (!state.diagnostics || !state.diagnostics.length) {
      banner.classList.remove('active');
      return;
    }

    banner.classList.add('active');

    const title = document.createElement('div');
    title.className = 'diag-title';
    const titleKey = state.diagnostics.length === 1 ? 'diag.title.one' : 'diag.title.other';
    title.textContent = i18n ? i18n.t(titleKey, { count: state.diagnostics.length, scope: state.targetScope.toUpperCase() }) : ('Diagnostics (' + state.diagnostics.length + ' item' + (state.diagnostics.length > 1 ? 's' : '') + ' for ' + state.targetScope.toUpperCase() + ' scope):');
    banner.appendChild(title);

    const list = document.createElement('ul');
    list.className = 'diag-list';

    state.diagnostics.forEach(diag => {
      const li = document.createElement('li');
      li.className = 'diag-item diag-' + diag.severity;

      const badge = document.createElement('span');
      badge.className = 'diag-badge';
      const severityKey = 'diag.severity.' + diag.severity.toLowerCase();
      badge.textContent = i18n ? i18n.t(severityKey) : diag.severity.toUpperCase();

      const pathCode = document.createElement('code');
      pathCode.textContent = diag.path + ': ';

      const msg = document.createElement('span');
      msg.textContent = diag.message;

      li.append(badge, pathCode, msg);
      list.appendChild(li);
    });

    banner.appendChild(list);
  }

  function renderJsonEditor() {
    const editor = getElement('json-editor');
    const errEl = getElement('json-error');
    if (editor && document.activeElement !== editor) {
      editor.value = state.jsonDraft;
    }
    if (errEl) errEl.textContent = state.jsonError;
  }

  function validateDraftOnly(src) {
    const parsed = model.parseSettingsJson(src);
    const errEl = getElement('json-error');
    if (!parsed.ok) {
      state.jsonError = parsed.diagnostics.map(d => d.message).join('; ');
    } else {
      state.jsonError = '';
    }
    if (errEl) errEl.textContent = state.jsonError;
  }

  function applyJsonDraft() {
    const src = state.jsonDraft;
    const result = model.parseSettingsJson(src);
    if (!result.ok) {
      state.jsonError = result.diagnostics.map(d => d.message).join('; ');
      renderJsonEditor();
      setStatus('status.cannotApply', 'err');
      return;
    }
    setDocumentFromObject(result.value, 'status.jsonApplied');
  }

  function discardJsonDraft() {
    state.jsonDraft = model.serializeSettings(state.document);
    state.jsonError = '';
    renderJsonEditor();
    setStatus('status.draftDiscarded', 'ok');
  }

  function formatJsonDraft() {
    try {
      const obj = JSON.parse(state.jsonDraft);
      state.jsonDraft = JSON.stringify(obj, null, 2);
      state.jsonError = '';
      renderJsonEditor();
    } catch (err) {
      setStatus('status.formatErr', 'err', { error: err.message });
      state.jsonError = 'Format error: ' + err.message;
      renderJsonEditor();
    }
  }

  function copyJsonDraft() {
    navigator.clipboard.writeText(state.jsonDraft)
      .then(() => setStatus('status.copied', 'ok'))
      .catch(err => setStatus('status.copyFailed', 'err', { error: err.message }));
  }

  function onFileSelected(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      setDocumentFromSource(evt.target.result, 'status.fileLoaded', { name: file.name });
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function downloadSettings() {
    const json = model.serializeSettings(state.document);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'settings.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setStatus('status.downloaded', 'ok');
  }

  function setStatus(msgKeyOrText, type, params) {
    const el = getElement('status');
    if (!el) return;
    const text = i18n && msgKeyOrText.startsWith('status.') ? i18n.t(msgKeyOrText, params) : msgKeyOrText;
    el.textContent = text;
    el.className = type || '';
    setTimeout(() => {
      const readyMsg = i18n ? i18n.t('app.ready') : 'Ready';
      const unsavedMsg = i18n ? i18n.t('app.unsaved') : 'Unsaved edits';
      el.textContent = state.isDirty ? unsavedMsg : readyMsg;
      el.className = state.isDirty ? 'err' : '';
    }, 3000);
  }

  function getElement(id) { return document.getElementById(id); }
})();
