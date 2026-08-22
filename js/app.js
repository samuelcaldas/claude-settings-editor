(function initApp() {
  const model = window.SettingsModel;
  const catalog = window.SettingsCatalog;
  const i18n = window.I18n;
  if (!model) throw new Error('SettingsModel script not loaded');

  // Application document and persistence state
  const state = {
    document: {},
    baseline: {},
    fileHandle: null,
    fileName: 'sample.json',
    isSample: true,
    targetScope: 'user',
    jsonDraft: '',
    jsonError: '',
    diagnostics: [],
    activeTab: 'general',
    isDirty: false,
    history: [],
    historyIdx: -1,
    envMasked: true,
    isSaving: false,
    availableModels: model.getDefaultKnownModels ? model.getDefaultKnownModels() : [],
    modelsSource: 'defaults',
    isFetchingModels: false,
    modelsFetchError: ''
  };

  const mobileViewport = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 768px)') : { matches: false, addEventListener: () => {} };
  let statusResetTimer = null;
  let navScrollFrame = 0;

  document.addEventListener('DOMContentLoaded', () => {
    initLocale();
    initResponsiveShell();
    populateModelsDatalist(state.availableModels);
    renderModelDiscovery();
    bindEvents();
    registerLaunchQueue();
    registerServiceWorker();
    loadDefaultSample();
    checkUrlActions();
  });

  function initLocale() {
    if (!i18n) return;
    const detected = i18n.detectLocale();
    i18n.setLocale(detected, false);
    i18n.subscribe(() => {
      renderAll();
      requestAnimationFrame(() => {
        updateNavScrollControls();
        const activeTab = document.querySelector('[role="tab"][aria-selected="true"]');
        revealTab(activeTab, false);
      });
    });

    const langSelect = getElement('lang-select');
    if (langSelect) {
      langSelect.value = i18n.getLocale();
      langSelect.addEventListener('change', e => {
        i18n.setLocale(e.target.value);
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

  function registerLaunchQueue() {
    if ('launchQueue' in window && 'setConsumer' in window.launchQueue) {
      window.launchQueue.setConsumer(async launchParams => {
        if (launchParams.files && launchParams.files.length > 0) {
          const handle = launchParams.files[0];
          await loadFromFileHandle(handle);
        }
      });
    }
  }

  function checkUrlActions() {
    try {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      if (action === 'open') {
        setTimeout(() => openFile(), 150);
      } else if (action === 'sample') {
        setTimeout(() => loadDefaultSample(), 150);
      }
    } catch (_) {}
  }

  function setMobileOverflowOpen(open, restoreFocus) {
    const trigger = getElement('btn-mobile-overflow');
    const panel = getElement('mobile-overflow-panel');
    if (!trigger || !panel) return;

    const shouldOpen = Boolean(open && mobileViewport.matches);

    panel.classList.toggle('is-open', shouldOpen);
    trigger.setAttribute('aria-expanded', String(shouldOpen));

    if (mobileViewport.matches) {
      if (shouldOpen) {
        panel.removeAttribute('inert');
        panel.setAttribute('aria-hidden', 'false');
      } else {
        panel.setAttribute('inert', '');
        panel.setAttribute('aria-hidden', 'true');
      }
    } else {
      panel.removeAttribute('inert');
      panel.removeAttribute('aria-hidden');
    }

    if (shouldOpen) {
      requestAnimationFrame(() => {
        const firstControl = panel.querySelector('button:not(:disabled), select:not(:disabled)');
        firstControl?.focus();
      });
    } else if (restoreFocus && mobileViewport.matches) {
      trigger.focus();
    }
  }

  function runHeaderAction(action) {
    if (mobileViewport.matches) {
      setMobileOverflowOpen(false, true);
    }
    action();
  }

  function updateNavScrollControls() {
    const viewport = getElement('nav-scroll-viewport');
    const previous = getElement('nav-scroll-prev');
    const next = getElement('nav-scroll-next');
    if (!viewport || !previous || !next) return;

    const maxScroll = viewport.scrollWidth - viewport.clientWidth;
    previous.disabled = viewport.scrollLeft <= 2;
    next.disabled = viewport.scrollLeft >= maxScroll - 2;
  }

  function scheduleNavScrollUpdate() {
    if (navScrollFrame) return;
    navScrollFrame = requestAnimationFrame(() => {
      navScrollFrame = 0;
      updateNavScrollControls();
    });
  }

  function scrollNav(direction) {
    const viewport = getElement('nav-scroll-viewport');
    if (!viewport) return;

    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    viewport.scrollBy({
      left: direction * Math.max(88, viewport.clientWidth * 0.75),
      behavior: reducedMotion ? 'auto' : 'smooth'
    });
  }

  function revealTab(tab, smooth = true) {
    const viewport = getElement('nav-scroll-viewport');
    if (!viewport || !tab || !mobileViewport.matches) return;

    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const target = tab.offsetLeft - (viewport.clientWidth - tab.offsetWidth) / 2;

    viewport.scrollTo({
      left: Math.max(0, target),
      behavior: smooth && !reducedMotion ? 'smooth' : 'auto'
    });

    scheduleNavScrollUpdate();
  }

  function syncTabOrientation() {
    const tablist = getElement('settings-tablist');
    if (!tablist) return;
    tablist.setAttribute('aria-orientation', mobileViewport.matches ? 'horizontal' : 'vertical');
  }

  function initResponsiveShell() {
    const trigger = getElement('btn-mobile-overflow');
    const panel = getElement('mobile-overflow-panel');

    trigger?.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';
      setMobileOverflowOpen(!isOpen, false);
    });

    document.addEventListener('pointerdown', event => {
      if (!mobileViewport.matches || !panel || !trigger) return;
      if (!panel.classList.contains('is-open')) return;
      if (panel.contains(event.target) || trigger.contains(event.target)) return;
      setMobileOverflowOpen(false, false);
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && panel?.classList.contains('is-open')) {
        event.preventDefault();
        setMobileOverflowOpen(false, true);
      }
    });

    if (mobileViewport.addEventListener) {
      mobileViewport.addEventListener('change', () => {
        setMobileOverflowOpen(false, false);
        syncTabOrientation();
        updateNavScrollControls();
      });
    }

    getElement('nav-scroll-prev')?.addEventListener('click', () => scrollNav(-1));
    getElement('nav-scroll-next')?.addEventListener('click', () => scrollNav(1));
    getElement('nav-scroll-viewport')?.addEventListener('scroll', scheduleNavScrollUpdate, { passive: true });

    setMobileOverflowOpen(false, false);
    syncTabOrientation();
    updateNavScrollControls();
  }

  function loadDefaultSample() {
    fetch('./sample.json')
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(source => {
        state.fileHandle = null;
        state.fileName = 'sample.json';
        state.isSample = true;
        setDocumentFromSource(source, 'status.sampleLoaded');
      })
      .catch(err => {
        state.fileHandle = null;
        state.fileName = 'settings.json';
        state.isSample = false;
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
      return false;
    }
    state.jsonError = '';
    state.diagnostics = model.inspectSettings(result.value, state.targetScope);
    setDocumentFromObject(result.value, statusMsgKey, statusParams);
    return true;
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

  async function openFile() {
    if (state.isDirty && i18n) {
      const confirmDiscard = window.confirm(i18n.t('confirm.discardUnsaved'));
      if (!confirmDiscard) {
        setStatus('status.openCancelled', 'ok');
        return;
      }
    }

    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{
            description: i18n ? i18n.t('file.jsonDescription') : 'JSON Files',
            accept: { 'application/json': ['.json'] }
          }],
          multiple: false
        });
        await loadFromFileHandle(handle);
      } catch (err) {
        if (err.name === 'AbortError') {
          setStatus('status.openCancelled', 'ok');
        } else {
          setStatus('status.fileSaveErr', 'err', { error: err.message });
        }
      }
    } else {
      const fileInput = getElement('file-input');
      if (fileInput) fileInput.click();
    }
  }

  async function loadFromFileHandle(handle) {
    try {
      const file = await handle.getFile();
      const text = await file.text();
      const result = model.parseSettingsJson(text);
      if (!result.ok) {
        state.jsonDraft = text;
        state.jsonError = result.diagnostics.map(d => d.message).join('; ');
        state.diagnostics = result.diagnostics;
        renderDiagnostics();
        renderJsonEditor();
        setStatus('status.invalidSource', 'err');
        return;
      }
      state.fileHandle = handle;
      state.fileName = handle.name;
      state.isSample = false;
      setDocumentFromObject(result.value, 'status.fileLoaded', { name: handle.name });
    } catch (err) {
      setStatus('status.fileSaveErr', 'err', { error: err.message });
    }
  }

  async function saveFile() {
    if (state.isSaving) return;

    if (state.fileHandle && !state.isSample) {
      try {
        state.isSaving = true;
        const options = { mode: 'readwrite' };
        if (typeof state.fileHandle.queryPermission === 'function') {
          const perm = await state.fileHandle.queryPermission(options);
          if (perm !== 'granted') {
            const req = await state.fileHandle.requestPermission(options);
            if (req !== 'granted') {
              setStatus('status.permissionDenied', 'err');
              return;
            }
          }
        }
        const writable = await state.fileHandle.createWritable();
        const json = model.serializeSettings(state.document);
        await writable.write(json);
        await writable.close();

        state.baseline = model.clone(state.document);
        state.isDirty = false;
        renderHeaderStatus();
        setStatus('status.fileSavedDirect', 'ok', { name: state.fileName });
      } catch (err) {
        setStatus('status.fileSaveErr', 'err', { error: err.message });
      } finally {
        state.isSaving = false;
      }
    } else {
      await saveFileAs();
    }
  }

  async function saveFileAs() {
    if (state.isSaving) return;

    if ('showSaveFilePicker' in window) {
      try {
        state.isSaving = true;
        const suggestedName = state.fileName === 'sample.json' ? 'settings.json' : (state.fileName || 'settings.json');
        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: [{
            description: i18n ? i18n.t('file.jsonDescription') : 'JSON Files',
            accept: { 'application/json': ['.json'] }
          }]
        });
        const writable = await handle.createWritable();
        const json = model.serializeSettings(state.document);
        await writable.write(json);
        await writable.close();

        state.fileHandle = handle;
        state.fileName = handle.name;
        state.isSample = false;
        state.baseline = model.clone(state.document);
        state.isDirty = false;
        renderHeaderStatus();
        setStatus('status.fileSavedDirect', 'ok', { name: state.fileName });
      } catch (err) {
        if (err.name === 'AbortError') {
          setStatus('status.saveCancelled', 'ok');
        } else {
          setStatus('status.fileSaveErr', 'err', { error: err.message });
        }
      } finally {
        state.isSaving = false;
      }
    } else {
      downloadSettings();
    }
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
      state.history = state.history.slice(0, state.historyIdx + 1);
      state.history.push(model.clone(state.document));
      state.historyIdx++;
      state.isDirty = !model.deepEqual(state.document, state.baseline);
      state.jsonDraft = model.serializeSettings(state.document);
      state.jsonError = '';
      state.diagnostics = model.inspectSettings(state.document, state.targetScope);

      renderAll();
    } catch (err) {
      setStatus('status.editFailed', 'err', { error: err.message });
    }
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
    getElement('btn-open')?.addEventListener('click', () => runHeaderAction(openFile));
    getElement('btn-save')?.addEventListener('click', () => saveFile());
    getElement('btn-save-as')?.addEventListener('click', () => runHeaderAction(saveFileAs));
    getElement('btn-sample')?.addEventListener('click', () => runHeaderAction(loadDefaultSample));
    getElement('btn-undo')?.addEventListener('click', () => runHeaderAction(undo));
    getElement('btn-redo')?.addEventListener('click', () => runHeaderAction(redo));
    getElement('file-input')?.addEventListener('change', onFileSelected);

    // Global keyboard shortcuts
    window.addEventListener('keydown', e => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      if (!isCmdOrCtrl || e.altKey) return;
      const key = e.key ? e.key.toLowerCase() : '';

      if (key === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          saveFileAs();
        } else {
          saveFile();
        }
      } else if (key === 'o' && !e.shiftKey) {
        e.preventDefault();
        openFile();
      } else if (key === 'z' && !e.shiftKey) {
        const tag = document.activeElement ? document.activeElement.tagName : '';
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
          undo();
        }
      } else if ((key === 'y' && !e.shiftKey) || (key === 'z' && e.shiftKey)) {
        const tag = document.activeElement ? document.activeElement.tagName : '';
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
          redo();
        }
      }
    });

    // Unsaved changes guard before unload
    window.addEventListener('beforeunload', e => {
      if (state.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

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

    // Tabs keyboard navigation (roving tabindex)
    const tablist = getElement('settings-tablist');
    if (tablist) {
      tablist.addEventListener('keydown', e => {
        const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
        const idx = tabs.findIndex(t => t.getAttribute('data-tab') === state.activeTab);
        if (idx === -1) return;

        let nextIdx = -1;
        const isHorizontal = mobileViewport.matches;
        if ((isHorizontal && e.key === 'ArrowRight') || (!isHorizontal && e.key === 'ArrowDown')) {
          e.preventDefault();
          nextIdx = (idx + 1) % tabs.length;
        } else if ((isHorizontal && e.key === 'ArrowLeft') || (!isHorizontal && e.key === 'ArrowUp')) {
          e.preventDefault();
          nextIdx = (idx - 1 + tabs.length) % tabs.length;
        } else if (e.key === 'Home') {
          e.preventDefault();
          nextIdx = 0;
        } else if (e.key === 'End') {
          e.preventDefault();
          nextIdx = tabs.length - 1;
        }

        if (nextIdx !== -1) {
          const nextTab = tabs[nextIdx];
          const tabId = nextTab.getAttribute('data-tab');
          if (tabId) {
            switchTab(tabId);
            nextTab.focus();
          }
        }
      });
    }

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

    // Permission Rule Add Buttons
    bindListAdd('btn-add-deny', 'new-deny-rule', 'permissions.deny');
    bindListAdd('btn-add-deny-rule', 'new-deny-rule', 'permissions.deny');
    bindListAdd('btn-add-ask', 'new-ask-rule', 'permissions.ask');
    bindListAdd('btn-add-ask-rule', 'new-ask-rule', 'permissions.ask');
    bindListAdd('btn-add-allow', 'new-allow-rule', 'permissions.allow');
    bindListAdd('btn-add-allow-rule', 'new-allow-rule', 'permissions.allow');
    bindListAdd('btn-add-dir', 'new-dir-rule', 'permissions.additionalDirectories');
    bindListAdd('btn-add-dir', 'new-add-dir', 'permissions.additionalDirectories');

    // Sandbox Rule Add Buttons
    bindListAdd('btn-add-sb-allow-write', 'new-sb-allow-write', 'sandbox.filesystem.allowWrite');
    bindListAdd('btn-add-sb-deny-write', 'new-sb-deny-write', 'sandbox.filesystem.denyWrite');
    bindListAdd('btn-add-sb-deny-read', 'new-sb-deny-read', 'sandbox.filesystem.denyRead');
    bindListAdd('btn-add-sb-allow-read', 'new-sb-allow-read', 'sandbox.filesystem.allowRead');
    bindListAdd('btn-add-sb-allow-domain', 'new-sb-allow-domain', 'sandbox.network.allowedDomains');
    bindListAdd('btn-add-sb-deny-domain', 'new-sb-deny-domain', 'sandbox.network.deniedDomains');
    bindListAdd('btn-add-sb-ex-cmd', 'new-sb-ex-cmd', 'sandbox.excludedCommands');
    bindListAdd('btn-add-sb-excluded-cmd', 'new-sb-excluded-cmd', 'sandbox.excludedCommands');

    // Worktree Rule Add Buttons
    bindListAdd('btn-add-wt-symlink', 'new-wt-symlink', 'worktree.symlinkDirectories');
    bindListAdd('btn-add-wt-sparse', 'new-wt-sparse', 'worktree.sparsePaths');

    // MCP Policy Rule Add Buttons
    bindListAdd('btn-add-mcp-approved', 'new-mcp-approved', 'mcp.approvedServers');
    bindListAdd('btn-add-mcp-rejected', 'new-mcp-rejected', 'mcp.rejectedServers');
    bindListAdd('btn-add-mcp-enabled', 'new-mcp-enabled-server', 'enabledMcpjsonServers');
    bindListAdd('btn-add-mcp-disabled', 'new-mcp-disabled-server', 'disabledMcpjsonServers');

    // Env vars add & presets
    getElement('btn-add-env')?.addEventListener('click', addEnvVar);
    getElement('btn-add-env-var')?.addEventListener('click', addEnvVar);
    getElement('new-env-val')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') addEnvVar();
    });
    getElement('btn-mask-env')?.addEventListener('click', toggleEnvMask);
    getElement('btn-toggle-api-key')?.addEventListener('click', () => {
      const input = getElement('env_ANTHROPIC_API_KEY');
      const btn = getElement('btn-toggle-api-key');
      if (input) {
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        if (btn) btn.textContent = isPass ? (i18n ? i18n.t('env.apiKey.hide') : 'Hide') : (i18n ? i18n.t('env.apiKey.show') : 'Show');
      }
    });
    getElement('btn-toggle-auth-token')?.addEventListener('click', () => {
      const input = getElement('env_ANTHROPIC_AUTH_TOKEN');
      const btn = getElement('btn-toggle-auth-token');
      if (input) {
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        if (btn) btn.textContent = isPass ? (i18n ? i18n.t('env.apiKey.hide') : 'Hide') : (i18n ? i18n.t('env.apiKey.show') : 'Show');
      }
    });
    getElement('btn-preset-anthropic')?.addEventListener('click', () => applyPatch({ op: 'set', path: 'env.ANTHROPIC_API_KEY', value: '' }));
    getElement('btn-preset-telemetry')?.addEventListener('click', () => applyPatch({ op: 'set', path: 'env.OTEL_EXPORTER_OTLP_ENDPOINT', value: 'http://localhost:4318' }));
    getElement('btn-preset-models')?.addEventListener('click', () => applyPatch({ op: 'set', path: 'env.ANTHROPIC_MODEL', value: 'claude-sonnet-5' }));
    getElement('btn-preset-gateway')?.addEventListener('click', () => {
      batchPatches([
        { op: 'set', path: 'env.ANTHROPIC_DEFAULT_SONNET_MODEL', value: 'claude-sonnet-5' },
        { op: 'set', path: 'env.ANTHROPIC_DEFAULT_OPUS_MODEL', value: 'claude-opus-5' },
        { op: 'set', path: 'env.ANTHROPIC_DEFAULT_HAIKU_MODEL', value: 'claude-haiku-4-5-20251001' },
        { op: 'set', path: 'env.CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY', value: 'true' }
      ]);
    });

    // Fallback models add
    getElement('btn-add-fallback')?.addEventListener('click', addFallbackModel);
    getElement('new-model-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') addFallbackModel();
    });

    // Enabled plugins add
    getElement('btn-add-plugin')?.addEventListener('click', addPlugin);
    getElement('new-plugin-key')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') addPlugin();
    });

    // Marketplaces add
    getElement('btn-add-mkt')?.addEventListener('click', addMarketplace);
    getElement('btn-add-marketplace')?.addEventListener('click', addMarketplace);

    // Hook groups & URLs
    getElement('btn-add-hook')?.addEventListener('click', addHookGroup);
    getElement('btn-add-hook-group')?.addEventListener('click', addHookGroup);
    getElement('btn-add-hook-url')?.addEventListener('click', addHookUrl);

    // Model Discovery Fetch Buttons
    document.querySelectorAll('.btn-fetch-models').forEach(btn => {
      btn.addEventListener('click', () => fetchModelsFromEndpoint());
    });

    // Raw JSON toolbar
    getElement('btn-apply-json')?.addEventListener('click', applyJsonDraft);
    getElement('btn-discard-json')?.addEventListener('click', discardJsonDraft);
    getElement('btn-format-json')?.addEventListener('click', formatJsonDraft);
    getElement('btn-copy-json')?.addEventListener('click', copyJsonDraft);
    getElement('btn-reset-json')?.addEventListener('click', loadDefaultSample);

    const jsonEditor = getElement('json-editor');
    if (jsonEditor) {
      jsonEditor.addEventListener('input', e => {
        state.jsonDraft = e.target.value;
        validateJsonDraftLive();
      });
    }
  }

  function bindListAdd(btnId, inputId, basePath) {
    const btn = getElement(btnId);
    const inp = getElement(inputId);
    if (!btn || !inp) return;

    const handler = () => {
      const val = inp.value.trim();
      if (!val) return;
      const currentList = model.getAtPath(state.document, basePath) || [];
      if (Array.isArray(currentList)) {
        applyPatch({ op: 'set', path: `${basePath}.${currentList.length}`, value: val });
      } else {
        applyPatch({ op: 'set', path: basePath, value: [val] });
      }
      inp.value = '';
    };

    btn.addEventListener('click', handler);
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') handler();
    });
  }

  function switchTab(tabId) {
    state.activeTab = tabId;
    let activeTabButton = null;
    document.querySelectorAll('[role="tab"]').forEach(btn => {
      const active = btn.getAttribute('data-tab') === tabId;
      btn.setAttribute('aria-selected', String(active));
      btn.classList.toggle('active', active);
      btn.tabIndex = active ? 0 : -1;
      if (active) activeTabButton = btn;
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      const active = panel.id === `tab-${tabId}`;
      panel.classList.toggle('active', active);
      panel.setAttribute('aria-hidden', String(!active));
    });
    if (tabId === 'advanced') {
      renderJsonEditor();
    }
    revealTab(activeTabButton, true);
  }

  function renderAll() {
    renderHeaderStatus();
    renderScopeInfo();
    renderFormFields();
    renderRuleLists();
    renderEnvVars();
    renderFallbackModels();
    renderPlugins();
    renderMarketplaces();
    renderHooks();
    renderModelDiscovery();
    renderDiagnostics();
    renderJsonEditor();
  }

  function renderHeaderStatus() {
    const badge = getElement('dirty-badge');
    if (badge) badge.classList.toggle('active', state.isDirty);

    const activeFileName = getElement('active-file-name');
    if (activeFileName) {
      if (state.isSample) {
        activeFileName.textContent = i18n ? i18n.t('file.activeSample') : 'sample.json (sample)';
      } else {
        activeFileName.textContent = state.fileName || (i18n ? i18n.t('file.untitled') : 'settings.json');
      }
    }

    const pill = getElement('active-file-pill');
    if (pill) {
      pill.classList.toggle('direct-disk', Boolean(state.fileHandle && !state.isSample));
    }

    const undoBtn = getElement('btn-undo');
    if (undoBtn) undoBtn.disabled = state.historyIdx <= 0;
    const redoBtn = getElement('btn-redo');
    if (redoBtn) redoBtn.disabled = state.historyIdx >= state.history.length - 1;

    // Update document title with dirty marker
    const appTitle = i18n ? i18n.t('app.title') : 'Claude Settings Editor';
    const displayFile = state.isSample ? 'sample.json' : (state.fileName || 'settings.json');
    document.title = (state.isDirty ? '• ' : '') + displayFile + ' — ' + appTitle;
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
      } else if (input.type === 'number') {
        input.value = val === undefined ? '' : val;
      } else {
        input.value = val === undefined ? '' : val;
      }

      // Check if setting is ignored in target scope
      const def = catalog.getSettingDefinition ? catalog.getSettingDefinition(path) : (catalog.getDefinition ? catalog.getDefinition(path) : null);
      const isIgnored = def && def.scopes && !def.scopes.includes(state.targetScope);
      const fieldGroup = input.closest('.field-group') || input.closest('.checkbox-row');
      if (fieldGroup) {
        fieldGroup.classList.toggle('scope-mismatch', Boolean(isIgnored));
      }
    });
  }

  function renderRuleLists() {
    renderStringList('list-deny', 'permissions.deny');
    renderStringList('list-permissions-deny', 'permissions.deny');
    renderStringList('list-ask', 'permissions.ask');
    renderStringList('list-permissions-ask', 'permissions.ask');
    renderStringList('list-allow', 'permissions.allow');
    renderStringList('list-permissions-allow', 'permissions.allow');
    renderStringList('list-dirs', 'permissions.additionalDirectories');
    renderStringList('list-permissions-additionalDirs', 'permissions.additionalDirectories');

    renderStringList('list-sb-allow-write', 'sandbox.filesystem.allowWrite');
    renderStringList('list-sb-deny-write', 'sandbox.filesystem.denyWrite');
    renderStringList('list-sb-deny-read', 'sandbox.filesystem.denyRead');
    renderStringList('list-sb-allow-read', 'sandbox.filesystem.allowRead');
    renderStringList('list-sb-allow-domain', 'sandbox.network.allowedDomains');
    renderStringList('list-sb-allow-domains', 'sandbox.network.allowedDomains');
    renderStringList('list-sb-deny-domain', 'sandbox.network.deniedDomains');
    renderStringList('list-sb-deny-domains', 'sandbox.network.deniedDomains');
    renderStringList('list-sb-ex-cmds', 'sandbox.excludedCommands');
    renderStringList('list-sb-excluded-commands', 'sandbox.excludedCommands');

    renderStringList('list-wt-symlinks', 'worktree.symlinkDirectories');
    renderStringList('list-worktree-symlinks', 'worktree.symlinkDirectories');
    renderStringList('list-wt-sparse', 'worktree.sparsePaths');
    renderStringList('list-worktree-sparse', 'worktree.sparsePaths');

    renderStringList('list-mcp-approved', 'mcp.approvedServers');
    renderStringList('list-mcp-rejected', 'mcp.rejectedServers');
    renderStringList('list-mcp-enabled', 'enabledMcpjsonServers');
    renderStringList('list-mcp-disabled', 'disabledMcpjsonServers');
  }

  function renderStringList(containerId, basePath) {
    const el = getElement(containerId);
    if (!el) return;
    el.replaceChildren();

    const list = model.getAtPath(state.document, basePath) || [];
    if (!Array.isArray(list) || list.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'field-hint';
      empty.textContent = i18n ? i18n.t('empty.none') : 'None configured.';
      el.appendChild(empty);
      return;
    }

    list.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'rule-item';

      const txt = document.createElement('span');
      txt.className = 'rule-text';
      txt.textContent = String(item);

      const delBtn = document.createElement('button');
      delBtn.className = 'del-btn';
      delBtn.setAttribute('data-i18n-title', 'actions.remove');
      delBtn.title = i18n ? i18n.t('actions.remove') : 'Remove';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', () => {
        applyPatch({ op: 'delete', path: `${basePath}.${idx}` });
      });

      row.appendChild(txt);
      row.appendChild(delBtn);
      el.appendChild(row);
    });
  }

  function renderEnvVars() {
    const el = getElement('list-env') || getElement('env-var-list');
    if (!el) return;
    el.replaceChildren();

    renderEnvPresets();

    const envObj = model.getAtPath(state.document, 'env') || {};
    if (typeof envObj !== 'object' || Array.isArray(envObj)) {
      const err = document.createElement('div');
      err.className = 'field-hint';
      err.textContent = i18n ? i18n.t('env.notObject') : 'env is not an object; edit in Advanced JSON.';
      el.appendChild(err);
      return;
    }

    const allKeys = Object.keys(envObj);
    const keys = allKeys.filter(k => !(catalog && catalog.isDedicatedEnvKey ? catalog.isDedicatedEnvKey(k) : false));

    if (keys.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'field-hint';
      empty.textContent = i18n ? i18n.t('env.empty') : 'No additional environment variables configured.';
      el.appendChild(empty);
      return;
    }

    keys.forEach(key => {
      const val = envObj[key];
      const row = document.createElement('div');
      row.className = 'env-item';

      const keyInp = document.createElement('input');
      keyInp.type = 'text';
      keyInp.value = key;
      keyInp.addEventListener('change', () => {
        const newKey = keyInp.value.trim();
        if (newKey && newKey !== key) {
          applyPatch({ op: 'rename_key', path: 'env', fromKey: key, toKey: newKey });
        }
      });

      const valInp = document.createElement('input');
      valInp.type = state.envMasked ? 'password' : 'text';
      valInp.value = String(val);
      valInp.addEventListener('change', () => {
        applyPatch({ op: 'set', path: `env.${key}`, value: valInp.value });
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'del-btn';
      delBtn.setAttribute('data-i18n-title', 'actions.remove');
      delBtn.title = i18n ? i18n.t('actions.remove') : 'Remove';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', () => {
        applyPatch({ op: 'delete', path: `env.${key}` });
      });

      row.appendChild(keyInp);
      row.appendChild(valInp);
      row.appendChild(delBtn);
      el.appendChild(row);
    });
  }

  function renderEnvPresets() {
    const bar = getElement('env-presets');
    if (!bar) return;
    bar.replaceChildren();

    const presets = [
      { nameKey: 'env.preset.anthropic', fallback: '+ Anthropic API', key: 'ANTHROPIC_API_KEY', val: '' },
      { nameKey: 'env.preset.telemetry', fallback: '+ OpenTelemetry', key: 'OTEL_EXPORTER_OTLP_ENDPOINT', val: 'http://localhost:4318' },
      { nameKey: 'env.preset.models', fallback: '+ Default Models', key: 'ANTHROPIC_MODEL', val: 'claude-sonnet-5' },
      { nameKey: 'env.preset.gateway', fallback: '+ Gateway Models', key: 'ANTHROPIC_DEFAULT_SONNET_MODEL', val: 'claude-sonnet-5' }
    ];

    presets.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'btn small';
      btn.setAttribute('data-i18n', p.nameKey);
      btn.textContent = i18n ? i18n.t(p.nameKey) : p.fallback;
      btn.addEventListener('click', () => {
        applyPatch({ op: 'set', path: `env.${p.key}`, value: p.val });
      });
      bar.appendChild(btn);
    });
  }

  function addEnvVar() {
    const keyInp = getElement('new-env-key');
    const valInp = getElement('new-env-val');
    if (!keyInp || !valInp) return;
    const k = keyInp.value.trim();
    if (!k) return;
    applyPatch({ op: 'set', path: `env.${k}`, value: valInp.value });
    keyInp.value = '';
    valInp.value = '';
  }

  function toggleEnvMask() {
    state.envMasked = !state.envMasked;
    const btn = getElement('btn-mask-env');
    if (btn) btn.textContent = state.envMasked ? '👁 Show' : '🔒 Hide';
    renderEnvVars();
  }

  function renderFallbackModels() {
    const el = getElement('list-fallback-models') || getElement('fallback-list');
    if (!el) return;
    el.replaceChildren();

    const list = model.getAtPath(state.document, 'fallbackModel') || [];
    if (!Array.isArray(list)) {
      const err = document.createElement('div');
      err.className = 'field-hint';
      err.textContent = i18n ? i18n.t('fallback.notArray') : 'fallbackModel is not an array; edit in Advanced JSON.';
      el.appendChild(err);
      return;
    }

    list.forEach((m, idx) => {
      const row = document.createElement('div');
      row.className = 'model-item';

      const badge = document.createElement('span');
      badge.className = 'field-hint';
      badge.textContent = `#${idx + 1}`;

      const inp = document.createElement('input');
      inp.type = 'text';
      inp.value = String(m);
      inp.setAttribute('list', 'available-models-datalist');
      inp.addEventListener('change', () => {
        applyPatch({ op: 'set', path: `fallbackModel.${idx}`, value: inp.value.trim() });
      });

      const upBtn = document.createElement('button');
      upBtn.className = 'del-btn';
      upBtn.setAttribute('data-i18n-title', 'actions.moveUp');
      upBtn.title = i18n ? i18n.t('actions.moveUp') : 'Move up';
      upBtn.textContent = '↑';
      upBtn.disabled = idx === 0;
      upBtn.addEventListener('click', () => {
        applyPatch({ op: 'move', path: 'fallbackModel', fromIndex: idx, toIndex: idx - 1 });
      });

      const dnBtn = document.createElement('button');
      dnBtn.className = 'del-btn';
      dnBtn.setAttribute('data-i18n-title', 'actions.moveDown');
      dnBtn.title = i18n ? i18n.t('actions.moveDown') : 'Move down';
      dnBtn.textContent = '↓';
      dnBtn.disabled = idx === list.length - 1;
      dnBtn.addEventListener('click', () => {
        applyPatch({ op: 'move', path: 'fallbackModel', fromIndex: idx, toIndex: idx + 1 });
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'del-btn';
      delBtn.setAttribute('data-i18n-title', 'actions.remove');
      delBtn.title = i18n ? i18n.t('actions.remove') : 'Remove';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', () => {
        applyPatch({ op: 'delete', path: `fallbackModel.${idx}` });
      });

      row.appendChild(badge);
      row.appendChild(inp);
      row.appendChild(upBtn);
      row.appendChild(dnBtn);
      row.appendChild(delBtn);
      el.appendChild(row);
    });
  }

  function addFallbackModel() {
    const inp = getElement('new-model-input');
    if (!inp) return;
    const val = inp.value.trim();
    if (!val) return;
    const current = model.getAtPath(state.document, 'fallbackModel') || [];
    if (Array.isArray(current)) {
      applyPatch({ op: 'set', path: `fallbackModel.${current.length}`, value: val });
    } else {
      applyPatch({ op: 'set', path: 'fallbackModel', value: [val] });
    }
    inp.value = '';
  }

  function populateModelsDatalist(modelsList) {
    const datalist = getElement('available-models-datalist');
    if (!datalist) return;
    datalist.replaceChildren();
    const list = Array.isArray(modelsList) && modelsList.length > 0
      ? modelsList
      : (model.getDefaultKnownModels ? model.getDefaultKnownModels() : []);
    list.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      datalist.appendChild(opt);
    });
  }

  function renderModelDiscovery() {
    populateModelsDatalist(state.availableModels);

    const pills = document.querySelectorAll('.models-status-pill');
    const counts = document.querySelectorAll('.models-status-count');
    const texts = document.querySelectorAll('.models-status-text');
    const fetchBtns = document.querySelectorAll('.btn-fetch-models');

    fetchBtns.forEach(btn => {
      btn.disabled = state.isFetchingModels;
      if (state.isFetchingModels) {
        btn.textContent = i18n ? i18n.t('models.discovery.fetching') : 'Fetching models...';
      } else {
        btn.textContent = i18n ? i18n.t('models.discovery.fetchBtn') : '⚡ Fetch Models from API';
      }
    });

    pills.forEach(pill => {
      if (state.isFetchingModels) {
        pill.setAttribute('data-state', 'fetching');
      } else if (state.modelsSource === 'api') {
        pill.setAttribute('data-state', 'loaded');
      } else if (state.modelsSource === 'error') {
        pill.setAttribute('data-state', 'error');
      } else {
        pill.setAttribute('data-state', 'defaults');
      }
    });

    counts.forEach(cnt => {
      if (state.isFetchingModels) {
        cnt.textContent = i18n ? i18n.t('models.discovery.fetching') : 'Fetching...';
      } else if (state.modelsSource === 'api') {
        cnt.textContent = i18n
          ? i18n.t('models.discovery.badge.loaded', { count: state.availableModels.length })
          : `${state.availableModels.length} models`;
      } else {
        cnt.textContent = i18n
          ? i18n.t('models.discovery.badge.defaults', { count: state.availableModels.length })
          : `${state.availableModels.length} defaults`;
      }
    });

    texts.forEach(txt => {
      if (state.isFetchingModels) {
        txt.textContent = i18n ? i18n.t('models.discovery.fetching') : 'Fetching models...';
      } else if (state.modelsSource === 'api') {
        txt.textContent = i18n
          ? i18n.t('models.discovery.status.success', { count: state.availableModels.length })
          : `Loaded ${state.availableModels.length} models from endpoint`;
      } else if (state.modelsSource === 'error') {
        txt.textContent = i18n
          ? i18n.t('models.discovery.status.error', { error: state.modelsFetchError })
          : `Failed to fetch models: ${state.modelsFetchError}`;
      } else {
        txt.textContent = i18n
          ? i18n.t('models.discovery.hint')
          : 'Queries the OpenAI-compatible /v1/models endpoint to populate model dropdowns.';
      }
    });
  }

  async function fetchModelsFromEndpoint() {
    if (state.isFetchingModels) return;

    const baseUrl = model.getAtPath(state.document, 'env.ANTHROPIC_BASE_URL') ||
                    model.getAtPath(state.document, 'env.BASE_URL') ||
                    model.getAtPath(state.document, 'env.OPENAI_BASE_URL') ||
                    '';
    const apiKey = model.getAtPath(state.document, 'env.ANTHROPIC_API_KEY') ||
                   model.getAtPath(state.document, 'env.OPENAI_API_KEY') ||
                   '';
    const authToken = model.getAtPath(state.document, 'env.ANTHROPIC_AUTH_TOKEN') || '';

    const resolvedUrl = model.buildOpenAiModelsUrl(baseUrl);
    if (!resolvedUrl) {
      setStatus(i18n ? i18n.t('models.discovery.status.noCreds') : 'Configure API Base URL and Key to fetch models', 'err');
      return;
    }

    state.isFetchingModels = true;
    renderModelDiscovery();

    try {
      const headers = {
        'Accept': 'application/json'
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
        headers['x-api-key'] = apiKey;
      } else if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      let signal;
      if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        signal = AbortSignal.timeout(8000);
      }

      const response = await fetch(resolvedUrl, {
        method: 'GET',
        headers,
        signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const parsedModels = model.parseOpenAiModelsResponse(data);

      if (parsedModels && parsedModels.length > 0) {
        state.availableModels = parsedModels;
        state.modelsSource = 'api';
        state.modelsFetchError = '';
        renderModelDiscovery();
        setStatus(i18n ? i18n.t('models.discovery.status.success', { count: parsedModels.length }) : `Loaded ${parsedModels.length} models`, 'ok');
      } else {
        throw new Error('No models found in response payload');
      }
    } catch (err) {
      state.modelsSource = 'error';
      state.modelsFetchError = err.message || 'Fetch failed';
      if (!state.availableModels || state.availableModels.length === 0) {
        state.availableModels = model.getDefaultKnownModels ? model.getDefaultKnownModels() : [];
      }
      renderModelDiscovery();
      setStatus(i18n ? i18n.t('models.discovery.status.error', { error: err.message }) : `Failed to fetch models: ${err.message}`, 'err');
    } finally {
      state.isFetchingModels = false;
      renderModelDiscovery();
    }
  }

  function renderPlugins() {
    const el = getElement('list-plugins') || getElement('plugin-list');
    if (!el) return;
    el.replaceChildren();

    const pluginsObj = model.getAtPath(state.document, 'enabledPlugins') || {};
    if (typeof pluginsObj !== 'object' || Array.isArray(pluginsObj)) {
      const err = document.createElement('div');
      err.className = 'field-hint';
      err.textContent = i18n ? i18n.t('plugin.notObject') : 'enabledPlugins is not an object; edit in Advanced JSON.';
      el.appendChild(err);
      return;
    }

    const keys = Object.keys(pluginsObj);
    if (keys.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'field-hint';
      empty.textContent = i18n ? i18n.t('plugin.empty') : 'No plugins registered in settings.';
      el.appendChild(empty);
      return;
    }

    keys.forEach(key => {
      const isEnabled = Boolean(pluginsObj[key]);
      const row = document.createElement('div');
      row.className = 'plugin-item';

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = isEnabled;
      chk.addEventListener('change', () => {
        applyPatch({ op: 'set', path: `enabledPlugins.${key}`, value: chk.checked });
      });

      const lbl = document.createElement('span');
      lbl.className = 'rule-text';
      lbl.textContent = key;

      const delBtn = document.createElement('button');
      delBtn.className = 'del-btn';
      delBtn.setAttribute('data-i18n-title', 'actions.remove');
      delBtn.title = i18n ? i18n.t('actions.remove') : 'Remove';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', () => {
        applyPatch({ op: 'delete', path: `enabledPlugins.${key}` });
      });

      row.appendChild(chk);
      row.appendChild(lbl);
      row.appendChild(delBtn);
      el.appendChild(row);
    });
  }

  function addPlugin() {
    const inp = getElement('new-plugin-key');
    if (!inp) return;
    const k = inp.value.trim();
    if (!k) return;
    applyPatch({ op: 'set', path: `enabledPlugins.${k}`, value: true });
    inp.value = '';
  }

  function renderMarketplaces() {
    const el = getElement('list-marketplaces') || getElement('marketplace-list');
    if (!el) return;
    el.replaceChildren();

    const mkts = model.getAtPath(state.document, 'extraKnownMarketplaces') || model.getAtPath(state.document, 'extraMarketplaces') || {};
    const keys = Object.keys(mkts);
    if (keys.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'field-hint';
      empty.textContent = i18n ? i18n.t('mkt.empty') : 'No extra marketplaces configured.';
      el.appendChild(empty);
      return;
    }

    keys.forEach(key => {
      const mkt = mkts[key] || {};
      const card = document.createElement('div');
      card.className = 'rule-box';

      const hdr = document.createElement('div');
      hdr.className = 'field-header';

      const title = document.createElement('span');
      title.className = 'rule-title';
      title.textContent = key;

      const delBtn = document.createElement('button');
      delBtn.className = 'del-btn';
      delBtn.setAttribute('data-i18n-title', 'actions.remove');
      delBtn.title = i18n ? i18n.t('actions.remove') : 'Remove';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', () => {
        applyPatch({ op: 'delete', path: `extraKnownMarketplaces.${key}` });
      });

      hdr.appendChild(title);
      hdr.appendChild(delBtn);
      card.appendChild(hdr);

      const srcRow = document.createElement('div');
      srcRow.className = 'input-wrap';

      const srcObj = mkt && typeof mkt.source === 'object' && mkt.source !== null ? mkt.source : null;
      const srcType = srcObj ? (srcObj.source || 'github') : (typeof mkt.source === 'string' ? 'url' : 'github');
      const srcVal = srcObj ? (srcObj.repo || srcObj.url || srcObj.path || '') : (typeof mkt.source === 'string' ? mkt.source : '');

      const typeSelect = document.createElement('select');
      typeSelect.style.maxWidth = '140px';
      const optGh = document.createElement('option');
      optGh.value = 'github'; optGh.textContent = 'github';
      const optGit = document.createElement('option');
      optGit.value = 'git'; optGit.textContent = 'git';
      const optUrl = document.createElement('option');
      optUrl.value = 'url'; optUrl.textContent = 'url';
      const optDir = document.createElement('option');
      optDir.value = 'directory'; optDir.textContent = 'directory';
      const optFile = document.createElement('option');
      optFile.value = 'file'; optFile.textContent = 'file';

      typeSelect.appendChild(optGh);
      typeSelect.appendChild(optGit);
      typeSelect.appendChild(optUrl);
      typeSelect.appendChild(optDir);
      typeSelect.appendChild(optFile);
      typeSelect.value = srcType;

      const srcInp = document.createElement('input');
      srcInp.type = 'text';
      srcInp.value = srcVal;
      srcInp.placeholder = i18n ? i18n.t('mkt.srcPlaceholder') : 'Source location / repo';

      const updateHandler = () => {
        const selectedType = typeSelect.value;
        const currentVal = srcInp.value.trim();
        let formattedSource;
        if (selectedType === 'github') {
          formattedSource = { source: 'github', repo: currentVal };
        } else if (selectedType === 'git' || selectedType === 'url') {
          formattedSource = { source: selectedType, url: currentVal };
        } else {
          formattedSource = { source: selectedType, path: currentVal };
        }
        applyPatch({ op: 'set', path: `extraKnownMarketplaces.${key}`, value: { source: formattedSource } });
      };

      typeSelect.addEventListener('change', updateHandler);
      srcInp.addEventListener('change', updateHandler);

      srcRow.appendChild(typeSelect);
      srcRow.appendChild(srcInp);
      card.appendChild(srcRow);
      el.appendChild(card);
    });
  }

  function addMarketplace() {
    const nameInp = getElement('new-mkt-name') || getElement('new-marketplace-name');
    const typeSel = getElement('new-mkt-type') || getElement('new-marketplace-type');
    const srcInp = getElement('new-mkt-source') || getElement('new-marketplace-src');
    if (!nameInp || !typeSel || !srcInp) return;
    const name = nameInp.value.trim();
    if (!name) return;

    const selectedType = typeSel.value;
    const currentVal = srcInp.value.trim();
    let formattedSource;
    if (selectedType === 'github') {
      formattedSource = { source: 'github', repo: currentVal };
    } else if (selectedType === 'git' || selectedType === 'url') {
      formattedSource = { source: selectedType, url: currentVal };
    } else {
      formattedSource = { source: selectedType, path: currentVal };
    }

    applyPatch({
      op: 'set',
      path: `extraKnownMarketplaces.${name}`,
      value: {
        source: formattedSource
      }
    });

    nameInp.value = '';
    srcInp.value = '';
  }

  function renderHooks() {
    renderStringList('list-hook-urls', 'allowedHttpHookUrls');

    const el = getElement('list-hook-groups');
    if (!el) return;
    el.replaceChildren();

    const hooks = model.getAtPath(state.document, 'hooks') || {};
    const events = Object.keys(hooks);
    if (events.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'field-hint';
      empty.textContent = i18n ? i18n.t('hooks.empty') : 'No hooks configured.';
      el.appendChild(empty);
      return;
    }

    events.forEach(evtName => {
      const groupList = hooks[evtName];
      if (!Array.isArray(groupList)) return;

      groupList.forEach((group, gIdx) => {
        const card = document.createElement('div');
        card.className = 'hook-card';

        const hdr = document.createElement('div');
        hdr.className = 'field-header';

        const title = document.createElement('span');
        title.className = 'rule-title';
        const groupNum = gIdx + 1;
        if (group.matcher) {
          title.textContent = i18n ? i18n.t('hooks.groupWithMatcher', { number: groupNum, matcher: group.matcher }) : `${evtName} - Group ${groupNum} (matcher: ${group.matcher})`;
        } else {
          title.textContent = i18n ? i18n.t('hooks.group', { number: groupNum }) + ` — ${evtName}` : `${evtName} - Group ${groupNum}`;
        }

        const delGroupBtn = document.createElement('button');
        delGroupBtn.className = 'del-btn';
        delGroupBtn.setAttribute('data-i18n-title', 'hooks.deleteEvent');
        delGroupBtn.title = i18n ? i18n.t('hooks.deleteEvent') : 'Delete event';
        delGroupBtn.textContent = '×';
        delGroupBtn.addEventListener('click', () => {
          applyPatch({ op: 'delete', path: `hooks.${evtName}.${gIdx}` });
        });

        hdr.appendChild(title);
        hdr.appendChild(delGroupBtn);
        card.appendChild(hdr);

        // Handlers inside group
        const handlers = group.hooks || [];
        handlers.forEach((h, hIdx) => {
          const hRow = document.createElement('div');
          hRow.className = 'hook-handler-row';

          const typeSel = document.createElement('select');
          ['command', 'http', 'prompt', 'agent'].forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            if (h.type === t) opt.selected = true;
            typeSel.appendChild(opt);
          });
          typeSel.addEventListener('change', () => {
            applyPatch({ op: 'set', path: `hooks.${evtName}.${gIdx}.hooks.${hIdx}.type`, value: typeSel.value });
          });

          const cmdInp = document.createElement('input');
          cmdInp.type = 'text';
          cmdInp.value = h.command || h.url || h.prompt || '';
          cmdInp.placeholder = h.type === 'http' ? (i18n ? i18n.t('hooks.urlPlaceholder') : 'URL') : (i18n ? i18n.t('hooks.cmdPlaceholder') : 'Command / prompt text');
          cmdInp.addEventListener('change', () => {
            const field = h.type === 'http' ? 'url' : (h.type === 'prompt' ? 'prompt' : 'command');
            applyPatch({ op: 'set', path: `hooks.${evtName}.${gIdx}.hooks.${hIdx}.${field}`, value: cmdInp.value.trim() });
          });

          const delHBtn = document.createElement('button');
          delHBtn.className = 'del-btn';
          delHBtn.setAttribute('data-i18n-title', 'actions.remove');
          delHBtn.title = i18n ? i18n.t('actions.remove') : 'Remove';
          delHBtn.textContent = '×';
          delHBtn.addEventListener('click', () => {
            applyPatch({ op: 'delete', path: `hooks.${evtName}.${gIdx}.hooks.${hIdx}` });
          });

          hRow.appendChild(typeSel);
          hRow.appendChild(cmdInp);
          hRow.appendChild(delHBtn);
          card.appendChild(hRow);
        });

        // Add Handler Button
        const addHBtn = document.createElement('button');
        addHBtn.className = 'btn small';
        addHBtn.style.marginTop = '6px';
        addHBtn.setAttribute('data-i18n', 'hooks.addHandler');
        addHBtn.textContent = i18n ? i18n.t('hooks.addHandler') : '+ Add handler';
        addHBtn.addEventListener('click', () => {
          const nextHIdx = handlers.length;
          applyPatch({
            op: 'set',
            path: `hooks.${evtName}.${gIdx}.hooks.${nextHIdx}`,
            value: { type: 'command', command: '' }
          });
        });
        card.appendChild(addHBtn);

        el.appendChild(card);
      });
    });
  }

  function addHookGroup() {
    const evtSel = getElement('new-hook-event');
    const matchInp = getElement('new-hook-matcher');
    if (!evtSel) return;
    const evtName = evtSel.value;
    const matcher = matchInp ? matchInp.value.trim() : '';

    const current = model.getAtPath(state.document, `hooks.${evtName}`) || [];
    const groupObj = { hooks: [{ type: 'command', command: '' }] };
    if (matcher) groupObj.matcher = matcher;

    if (Array.isArray(current)) {
      applyPatch({ op: 'set', path: `hooks.${evtName}.${current.length}`, value: groupObj });
    } else {
      applyPatch({ op: 'set', path: `hooks.${evtName}`, value: [groupObj] });
    }

    if (matchInp) matchInp.value = '';
  }

  function addHookUrl() {
    const inp = getElement('new-hook-url-pattern');
    if (!inp) return;
    const val = inp.value.trim();
    if (!val) return;
    const current = model.getAtPath(state.document, 'allowedHttpHookUrls') || [];
    if (Array.isArray(current)) {
      applyPatch({ op: 'set', path: `allowedHttpHookUrls.${current.length}`, value: val });
    } else {
      applyPatch({ op: 'set', path: 'allowedHttpHookUrls', value: [val] });
    }
    inp.value = '';
  }

  function renderDiagnostics() {
    const banner = getElement('diagnostic-banner');
    const listEl = getElement('diagnostic-list');
    const titleEl = getElement('diag-banner-title');
    if (!banner || !listEl) return;

    if (!state.diagnostics || state.diagnostics.length === 0) {
      banner.classList.remove('active');
      listEl.replaceChildren();
      return;
    }

    banner.classList.add('active');
    listEl.replaceChildren();

    if (titleEl && i18n) {
      const key = state.diagnostics.length === 1 ? 'diag.title.one' : 'diag.title.other';
      titleEl.textContent = i18n.t(key, { count: state.diagnostics.length, scope: state.targetScope.toUpperCase() });
    }

    state.diagnostics.forEach(d => {
      const li = document.createElement('li');
      li.className = `diag-item diag-${d.severity}`;

      const badge = document.createElement('span');
      badge.className = 'diag-badge';
      const severityKey = `diag.severity.${d.severity}`;
      badge.textContent = i18n ? i18n.t(severityKey) : d.severity.toUpperCase();

      const pathCode = document.createElement('code');
      pathCode.textContent = d.path ? d.path + ':' : '';

      const msg = document.createElement('span');
      msg.textContent = d.message;

      li.appendChild(badge);
      if (d.path) li.appendChild(pathCode);
      li.appendChild(msg);
      listEl.appendChild(li);
    });
  }

  function renderJsonEditor() {
    const editor = getElement('json-editor');
    const errEl = getElement('json-error');
    if (editor && document.activeElement !== editor) {
      editor.value = state.jsonDraft;
    }
    if (errEl) {
      errEl.textContent = state.jsonError || '';
    }
  }

  function validateJsonDraftLive() {
    const errEl = getElement('json-error');
    const parsed = model.parseSettingsJson(state.jsonDraft);
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
    const validation = model.validateSettingsDocument(result.value);
    if (!validation.ok) {
      state.jsonError = validation.diagnostics.map(d => d.message).join('; ');
      renderJsonEditor();
      setStatus('status.cannotApply', 'err');
      return;
    }

    state.document = model.clone(result.value);
    state.jsonError = '';
    state.isDirty = !model.deepEqual(state.document, state.baseline);
    state.history = state.history.slice(0, state.historyIdx + 1);
    state.history.push(model.clone(state.document));
    state.historyIdx++;
    state.diagnostics = model.inspectSettings(state.document, state.targetScope);
    renderAll();
    setStatus('status.jsonApplied', 'ok');
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
      state.fileHandle = null;
      state.fileName = file.name;
      state.isSample = false;
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
    a.download = state.fileName === 'sample.json' ? 'settings.json' : (state.fileName || 'settings.json');
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setStatus('status.downloaded', 'ok');
  }

  function setStatus(msgKeyOrText, type, params) {
    const el = getElement('status');
    if (!el) return;
    if (statusResetTimer) clearTimeout(statusResetTimer);

    const text = i18n && msgKeyOrText.startsWith('status.') ? i18n.t(msgKeyOrText, params) : msgKeyOrText;
    el.textContent = text;
    el.className = (type || '') + ' status-visible';

    statusResetTimer = setTimeout(() => {
      const readyMsg = i18n ? i18n.t('app.ready') : 'Ready';
      const unsavedMsg = i18n ? i18n.t('app.unsaved') : 'Unsaved edits';
      el.textContent = state.isDirty ? unsavedMsg : readyMsg;
      el.className = state.isDirty ? 'err' : '';
    }, 3000);
  }

  function getElement(id) { return document.getElementById(id); }
})();
