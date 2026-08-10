(function initApp() {
  const model = window.SettingsModel;
  if (!model) throw new Error('SettingsModel script not loaded');

  // Application document state
  const state = {
    document: {},
    baseline: {},
    jsonDraft: '',
    jsonError: '',
    diagnostics: [],
    activeTab: 'api',
    isDirty: false,
    history: [],
    historyIdx: -1
  };

  document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    loadDefaultSample();
  });

  function loadDefaultSample() {
    fetch('./sample.json')
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(source => setDocumentFromSource(source, 'Sample loaded'))
      .catch(err => {
        setDocumentFromObject({}, 'Initialized empty settings');
        setStatus('Could not load sample: ' + err.message, 'err');
      });
  }

  function setDocumentFromSource(source, statusMsg) {
    const result = model.parseSettingsJson(source);
    state.jsonDraft = source;
    if (!result.ok) {
      state.jsonError = result.diagnostics.map(d => d.message).join('; ');
      state.diagnostics = result.diagnostics;
      renderDiagnostics();
      renderJsonEditor();
      setStatus('Invalid JSON source', 'err');
      return;
    }
    state.jsonError = '';
    state.diagnostics = result.diagnostics || [];
    setDocumentFromObject(result.value, statusMsg);
  }

  function setDocumentFromObject(obj, statusMsg) {
    state.document = model.clone(obj);
    state.baseline = model.clone(obj);
    state.jsonDraft = model.serializeSettings(state.document);
    state.jsonError = '';
    state.isDirty = false;
    state.history = [model.clone(state.document)];
    state.historyIdx = 0;

    renderAll();
    if (statusMsg) setStatus(statusMsg, 'ok');
  }

  function applyPatch(patch) {
    try {
      const next = model.applyPatch(state.document, patch);
      const validation = model.validateSettingsDocument(next);
      if (!validation.ok) {
        setStatus('Invalid patch: ' + validation.diagnostics.map(d => d.message).join('; '), 'err');
        return;
      }
      state.document = next;
      state.jsonDraft = model.serializeSettings(state.document);
      state.jsonError = '';
      state.diagnostics = validation.diagnostics;
      state.isDirty = !model.deepEqual(state.document, state.baseline);

      pushHistory(state.document);
      renderAll();
    } catch (err) {
      setStatus('Edit failed: ' + err.message, 'err');
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
    state.isDirty = !model.deepEqual(state.document, state.baseline);
    renderAll();
    setStatus('Undo', 'ok');
  }

  function redo() {
    if (state.historyIdx >= state.history.length - 1) return;
    state.historyIdx++;
    state.document = model.clone(state.history[state.historyIdx]);
    state.jsonDraft = model.serializeSettings(state.document);
    state.isDirty = !model.deepEqual(state.document, state.baseline);
    renderAll();
    setStatus('Redo', 'ok');
  }

  // Bind static DOM event listeners
  function bindEvents() {
    // Header buttons
    getElement('btn-load')?.addEventListener('click', () => getElement('file-input')?.click());
    getElement('btn-load-mobile')?.addEventListener('click', () => getElement('file-input')?.click());
    getElement('btn-sample')?.addEventListener('click', () => loadDefaultSample());
    getElement('btn-download')?.addEventListener('click', downloadSettings);
    getElement('btn-download-mobile')?.addEventListener('click', downloadSettings);
    getElement('btn-undo')?.addEventListener('click', undo);
    getElement('btn-redo')?.addEventListener('click', redo);

    getElement('file-input')?.addEventListener('change', onFileSelected);

    // Tab buttons
    document.querySelectorAll('[role="tab"]').forEach(btn => {
      btn.addEventListener('click', e => {
        const tab = e.currentTarget.getAttribute('data-tab');
        if (tab) switchTab(tab);
      });
    });

    // Form fields path-binding
    document.querySelectorAll('[data-setting-path]').forEach(input => {
      const path = input.getAttribute('data-setting-path');
      const eventType = input.type === 'checkbox' || input.tagName === 'SELECT' ? 'change' : 'input';
      input.addEventListener(eventType, () => {
        let val;
        if (input.type === 'checkbox') {
          val = input.checked;
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

    // Explicit unset buttons
    document.querySelectorAll('[data-unset-path]').forEach(btn => {
      btn.addEventListener('click', () => {
        const path = btn.getAttribute('data-unset-path');
        applyPatch({ op: 'delete', path });
      });
    });

    // API Key visibility toggle
    getElement('btn-toggle-key')?.addEventListener('click', () => {
      const input = getElement('env_ANTHROPIC_API_KEY');
      const btn = getElement('btn-toggle-key');
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = 'Hide';
      } else {
        input.type = 'password';
        btn.textContent = 'Show';
      }
    });

    // Dynamic inputs: Fallback Models
    getElement('btn-add-fallback')?.addEventListener('click', addFallbackModel);
    getElement('new-model-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') addFallbackModel();
    });

    // Dynamic inputs: Plugins
    getElement('btn-add-plugin')?.addEventListener('click', addPlugin);
    getElement('new-plugin-key')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') addPlugin();
    });

    // Dynamic inputs: Hooks
    getElement('btn-add-hook')?.addEventListener('click', addHookEvent);
    getElement('new-hook-event')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') addHookEvent();
    });

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
    renderFormFields();
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

  function renderFallbackList() {
    const container = getElement('fallback-list');
    if (!container) return;
    container.replaceChildren();

    const list = model.getAtPath(state.document, 'fallbackModel') || [];
    if (!Array.isArray(list)) {
      const err = document.createElement('div');
      err.className = 'section-desc';
      err.textContent = 'fallbackModel is not an array; edit in Advanced JSON.';
      container.appendChild(err);
      return;
    }

    list.forEach((m, idx) => {
      const item = document.createElement('div');
      item.className = 'model-item';

      const num = document.createElement('span');
      num.style.fontSize = '10px';
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
      up.title = 'Move up';
      up.disabled = idx === 0;
      up.addEventListener('click', () => applyPatch({ op: 'move', path: 'fallbackModel', from: idx, to: idx - 1 }));

      const down = document.createElement('button');
      down.className = 'btn small';
      down.textContent = '▼';
      down.title = 'Move down';
      down.disabled = idx === list.length - 1;
      down.addEventListener('click', () => applyPatch({ op: 'move', path: 'fallbackModel', from: idx, to: idx + 1 }));

      const del = document.createElement('button');
      del.className = 'del-btn';
      del.textContent = '×';
      del.title = 'Remove';
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
      err.className = 'section-desc';
      err.textContent = 'enabledPlugins is not an object; edit in Advanced JSON.';
      container.appendChild(err);
      return;
    }

    Object.entries(plugins).forEach(([key, enabled]) => {
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
      del.title = 'Remove plugin';
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
      empty.className = 'section-desc';
      empty.textContent = 'No extra marketplaces configured.';
      container.appendChild(empty);
      return;
    }

    Object.entries(mkts).forEach(([name, config]) => {
      const item = document.createElement('div');
      item.className = 'plugin-item';

      const code = document.createElement('code');
      code.textContent = name;

      const desc = document.createElement('span');
      desc.style.fontSize = '11px';
      desc.style.color = 'var(--text-muted)';
      desc.style.marginLeft = 'auto';
      desc.textContent = typeof config === 'object' ? JSON.stringify(config.source || config) : String(config);

      item.append(code, desc);
      container.appendChild(item);
    });
  }

  function renderHooks() {
    const container = getElement('hooks-container');
    if (!container) return;
    container.replaceChildren();

    const hooks = model.getAtPath(state.document, 'hooks') || {};
    if (!model.isPlainObject(hooks)) {
      const err = document.createElement('div');
      err.className = 'section-desc';
      err.textContent = 'hooks is not an object; edit in Advanced JSON.';
      container.appendChild(err);
      return;
    }

    Object.entries(hooks).forEach(([eventName, groups]) => {
      const card = document.createElement('div');
      card.style.background = 'var(--bg-surface)';
      card.style.border = '1px solid var(--border)';
      card.style.borderRadius = 'var(--radius)';
      card.style.padding = '10px';
      card.style.marginBottom = '8px';

      const head = document.createElement('div');
      head.className = 'field-header';

      const title = document.createElement('strong');
      title.style.color = 'var(--blue)';
      title.textContent = eventName;

      const delEvt = document.createElement('button');
      delEvt.className = 'del-btn';
      delEvt.textContent = '×';
      delEvt.title = 'Delete event';
      delEvt.addEventListener('click', () => applyPatch({ op: 'delete', path: ['hooks', eventName] }));

      head.append(title, delEvt);
      card.appendChild(head);

      if (Array.isArray(groups)) {
        groups.forEach((group, gIdx) => {
          const list = group && Array.isArray(group.hooks) ? group.hooks : [];
          list.forEach((cmd, cIdx) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.gap = '6px';
            row.style.marginTop = '6px';

            const cmdInp = document.createElement('input');
            cmdInp.type = 'text';
            cmdInp.value = String(cmd.command || '');
            cmdInp.placeholder = 'Shell command';
            cmdInp.addEventListener('change', () => {
              applyPatch({ op: 'set', path: ['hooks', eventName, gIdx, 'hooks', cIdx, 'command'], value: cmdInp.value });
            });

            const delCmd = document.createElement('button');
            delCmd.className = 'del-btn';
            delCmd.textContent = '×';
            delCmd.addEventListener('click', () => {
              applyPatch({ op: 'delete', path: ['hooks', eventName, gIdx, 'hooks', cIdx] });
            });

            row.append(cmdInp, delCmd);
            card.appendChild(row);
          });
        });
      }

      const addCmd = document.createElement('button');
      addCmd.className = 'btn small';
      addCmd.style.marginTop = '8px';
      addCmd.textContent = '+ Add command';
      addCmd.addEventListener('click', () => {
        const groups = model.getAtPath(state.document, ['hooks', eventName]) || [];
        const firstGroup = Array.isArray(groups) && groups[0] ? groups[0] : { hooks: [] };
        const currentCmds = Array.isArray(firstGroup.hooks) ? firstGroup.hooks : [];
        const updatedCmds = [...currentCmds, { type: 'command', command: '', timeout: 30 }];
        applyPatch({ op: 'set', path: ['hooks', eventName, 0, 'hooks'], value: updatedCmds });
      });

      card.appendChild(addCmd);
      container.appendChild(card);
    });
  }

  function addHookEvent() {
    const input = getElement('new-hook-event');
    const ev = input.value.trim();
    if (!ev) return;
    applyPatch({ op: 'set', path: ['hooks', ev], value: [{ hooks: [] }] });
    input.value = '';
  }

  function renderDiagnostics() {
    const banner = getElement('diagnostic-banner');
    if (!banner) return;
    if (!state.diagnostics.length) {
      banner.classList.remove('active');
      banner.textContent = '';
      return;
    }
    banner.classList.add('active');
    banner.textContent = state.diagnostics.map(d => d.message).join(' | ');
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
      setStatus('Cannot apply invalid JSON', 'err');
      return;
    }
    setDocumentFromObject(result.value, 'JSON applied');
  }

  function discardJsonDraft() {
    state.jsonDraft = model.serializeSettings(state.document);
    state.jsonError = '';
    renderJsonEditor();
    setStatus('Draft discarded', 'ok');
  }

  function formatJsonDraft() {
    try {
      const obj = JSON.parse(state.jsonDraft);
      state.jsonDraft = JSON.stringify(obj, null, 2);
      state.jsonError = '';
      renderJsonEditor();
    } catch (err) {
      state.jsonError = 'Format error: ' + err.message;
      renderJsonEditor();
    }
  }

  function copyJsonDraft() {
    navigator.clipboard.writeText(state.jsonDraft)
      .then(() => setStatus('Copied to clipboard', 'ok'))
      .catch(err => setStatus('Copy failed: ' + err.message, 'err'));
  }

  function onFileSelected(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      setDocumentFromSource(evt.target.result, 'Loaded ' + file.name);
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
    setStatus('Downloaded settings.json', 'ok');
  }

  function setStatus(msg, type) {
    const el = getElement('status');
    if (!el) return;
    el.textContent = msg;
    el.className = type || '';
    setTimeout(() => {
      el.textContent = state.isDirty ? 'Unsaved edits' : 'Ready';
      el.className = state.isDirty ? 'err' : '';
    }, 3000);
  }

  function getElement(id) { return document.getElementById(id); }
})();
