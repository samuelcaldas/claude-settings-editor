(function exposeEnvEditor(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.EnvEditor = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function envEditorModule() {
  'use strict';
  const CREDENTIAL_KEYS = new Set(['ANTHROPIC_BASE_URL', 'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN']);
  const CATEGORIES = ['behavior', 'tools', 'network', 'telemetry', 'performance', 'managed'];

  /** Recognize exact credential paths without interpreting dots inside literal keys. */
  function isCredentialPath(path) {
    if (Array.isArray(path)) return path.length === 2 && path[0] === 'env' && CREDENTIAL_KEYS.has(path[1]);
    return typeof path === 'string' && [...CREDENTIAL_KEYS].some(key => path === `env.${key}`);
  }

  /** Return a localized error key for an unsafe add/rename, without mutating the document. */
  function keyError(env, name, previous) {
    if (!name || !/^[A-Z_][A-Z0-9_]*$/.test(name)) return 'env.error.name';
    if (name !== previous && Object.prototype.hasOwnProperty.call(env, name)) return 'env.error.duplicate';
    return '';
  }

  function isBooleanChecked(value, boolType) {
    if (boolType === 'nonempty') {
      return value !== '' && value !== undefined && value !== null;
    }
    if (boolType === 'true_false') {
      return String(value).toLowerCase() === 'true';
    }
    return String(value) === '1' || String(value).toLowerCase() === 'true';
  }

  function getBooleanString(checked, boolType) {
    if (boolType === 'true_false') {
      return checked ? 'true' : 'false';
    }
    if (boolType === 'nonempty') {
      return checked ? '1' : '';
    }
    return checked ? '1' : '0';
  }

  /** Bind the additional env editor to the existing history and schema-aware controller. */
  function create({ model, catalog, state, patch, translate, navigate, help }) {
    const get = id => document.getElementById(id);
    const form = () => ({ key: get('new-env-key'), value: get('new-env-val') });
    const environment = () => model.getAtPath(state.document, 'env') || {};
    const dedicated = name => catalog.isDedicatedEnvKey(name);
    let rowSnapshot = '';
    let renderedRows = false;

    function message(key, target = get('env-add-error')) {
      target.textContent = key ? translate(key) : '';
      target.hidden = !key;
    }

    function showHelp(name, target = get('new-env-desc')) {
      target.hidden = !name;
      target.style.display = name ? '' : 'none';
      help.render(target, model.getClaudeEnvVarMetadata(name, state.rawSchema), translate, state.targetScope);
      if (!name || !dedicated(name)) return;
      const action = button('env.editDedicated', () => navigate(name));
      target.appendChild(action);
    }

    function options() {
      return {
        query: get('env-search').value,
        category: get('env-category').value,
        includeUnofficial: get('env-include-unofficial').checked,
        scope: state.targetScope
      };
    }

    function refresh(schema) {
      const entries = model.getSuggestedClaudeEnvVars(schema || state.rawSchema, options());
      const select = get('select-env-var');
      const previous = select.value;
      select.replaceChildren(option('', translate('env.selectVar.placeholder')));
      select.firstElementChild.disabled = true;
      const datalist = get('claude-env-vars-datalist');
      datalist.replaceChildren();

      // Group entries by category
      const groups = new Map();
      entries.forEach(entry => {
        const cat = entry.category || 'behavior';
        if (!groups.has(cat)) groups.set(cat, []);
        groups.get(cat).push(entry);
        datalist.appendChild(option(entry.name, entry.name));
      });

      // Populate optgroups in canonical category order, followed by any remaining
      const orderedCats = [
        ...CATEGORIES.filter(c => groups.has(c)),
        ...[...groups.keys()].filter(c => !CATEGORIES.includes(c))
      ];

      orderedCats.forEach(cat => {
        const groupEntries = groups.get(cat);
        if (!groupEntries || !groupEntries.length) return;
        const optgroup = document.createElement('optgroup');
        optgroup.label = translate(`env.category.${cat}`);
        groupEntries.forEach(entry => {
          optgroup.appendChild(option(entry.name, entry.name));
        });
        select.appendChild(optgroup);
      });

      select.value = entries.some(entry => entry.name === previous) ? previous : '';
      get('env-result-count').textContent = translate('env.results', { count: entries.length });
      get('env-no-results').hidden = entries.length !== 0;
      showHelp(form().key.value.trim());
    }

    function option(value, label) {
      const element = document.createElement('option');
      element.value = value;
      element.textContent = label;
      return element;
    }

    function button(key, action) {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = 'btn small';
      element.textContent = translate(key);
      element.setAttribute('data-env-label', key);
      element.addEventListener('click', action);
      return element;
    }

    function syncAddBoolBadge(meta) {
      const cb = get('new-env-val-bool');
      const badge = get('new-env-val-bool-wrap')?.querySelector('.env-bool-badge');
      if (!cb || !badge) return;
      if (meta && meta.boolType === 'true_false') {
        badge.textContent = translate(cb.checked ? 'env.bool.true' : 'env.bool.false');
      } else {
        badge.textContent = translate(cb.checked ? 'env.bool.on' : 'env.bool.off');
      }
    }

    function updateAddValueControl(name) {
      const meta = model.getClaudeEnvVarMetadata(name, state.rawSchema);
      const isBool = Boolean(meta && (meta.isBoolean || meta.boolType));
      const valInput = get('new-env-val');
      let boolWrap = get('new-env-val-bool-wrap');

      if (isBool) {
        valInput.style.display = 'none';
        if (!boolWrap) {
          boolWrap = document.createElement('label');
          boolWrap.id = 'new-env-val-bool-wrap';
          boolWrap.className = 'env-bool-control';
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.id = 'new-env-val-bool';
          cb.className = 'env-bool-checkbox';
          cb.checked = true;
          cb.setAttribute('aria-label', translate('env.value'));
          const badge = document.createElement('span');
          badge.className = 'env-bool-badge badge';
          boolWrap.append(cb, badge);
          valInput.parentNode.appendChild(boolWrap);
          cb.addEventListener('change', () => {
            const currentMeta = model.getClaudeEnvVarMetadata(form().key.value.trim(), state.rawSchema);
            syncAddBoolBadge(currentMeta);
          });
        }
        boolWrap.style.display = 'inline-flex';
        const cb = get('new-env-val-bool');
        cb.checked = true;
        syncAddBoolBadge(meta);
      } else {
        valInput.style.display = '';
        if (boolWrap) boolWrap.style.display = 'none';
      }
    }

    function add() {
      const fields = form();
      const name = fields.key.value.trim();
      if (dedicated(name)) return message('env.error.dedicated');
      const error = keyError(environment(), name);
      if (error) return message(error);

      const meta = model.getClaudeEnvVarMetadata(name, state.rawSchema);
      let valueToSet = fields.value.value;
      if (meta && (meta.isBoolean || meta.boolType)) {
        const cb = get('new-env-val-bool');
        if (cb) {
          valueToSet = getBooleanString(cb.checked, meta.boolType);
        }
      }

      if (!patch({ op: 'set', path: ['env', name], value: valueToSet })) return;
      fields.key.value = '';
      fields.value.value = '';
      get('select-env-var').value = '';
      updateAddValueControl('');
      message('');
      showHelp('');
    }

    function rename(row, key, input) {
      const name = input.value.trim();
      if (name === key) return;
      const error = dedicated(name) ? 'env.error.dedicated' : keyError(environment(), name, key);
      if (error) return message(error, row.querySelector('.env-row-error'));
      patch({ op: 'rename_key', path: ['env'], fromKey: key, toKey: name });
    }

    function valueControl(row, key, value) {
      const meta = model.getClaudeEnvVarMetadata(key, state.rawSchema);
      if (meta && (meta.isBoolean || meta.boolType)) {
        return booleanValueControl(row, key, value, meta);
      }
      return textValueControl(row, key, value);
    }

    function textValueControl(row, key, value) {
      const input = document.createElement('input');
      input.type = state.envMasked ? 'password' : 'text';
      input.setAttribute('data-env-value', '');
      input.setAttribute('aria-label', translate('env.row.value', { name: key }));
      const unsupported = typeof value !== 'string' || /[\r\n]/.test(value);
      input.value = unsupported ? '' : value;
      input.readOnly = unsupported;
      if (unsupported) row.appendChild(button('env.editRaw', () => navigate(null)));
      if (unsupported) input.placeholder = translate('env.help.multiline');
      input.addEventListener('change', () => {
        if (!unsupported) patch({ op: 'set', path: ['env', key], value: input.value });
      });
      return input;
    }

    function booleanValueControl(row, key, value, meta) {
      const wrap = document.createElement('label');
      wrap.className = 'env-bool-control';
      wrap.setAttribute('data-env-control', 'boolean');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'env-bool-checkbox';
      checkbox.setAttribute('data-env-value', '');
      checkbox.setAttribute('data-env-type', 'boolean');
      checkbox.setAttribute('aria-label', translate('env.row.value', { name: key }));
      checkbox.checked = isBooleanChecked(value, meta.boolType);

      const badge = document.createElement('span');
      badge.className = 'env-bool-badge badge';

      function syncBadge() {
        if (meta.boolType === 'true_false') {
          badge.textContent = translate(checkbox.checked ? 'env.bool.true' : 'env.bool.false');
        } else {
          badge.textContent = translate(checkbox.checked ? 'env.bool.on' : 'env.bool.off');
        }
      }
      syncBadge();

      checkbox.addEventListener('change', () => {
        syncBadge();
        patch({ op: 'set', path: ['env', key], value: getBooleanString(checkbox.checked, meta.boolType) });
      });

      wrap.append(checkbox, badge);
      return wrap;
    }

    function buildRow(key, value) {
      const row = document.createElement('div');
      row.className = 'env-item';
      row.dataset.envKey = key;
      const input = document.createElement('input');
      input.value = key;
      input.setAttribute('list', 'claude-env-vars-datalist');
      input.setAttribute('data-env-key', '');
      input.setAttribute('aria-label', translate('env.row.key', { name: key }));
      input.addEventListener('change', () => rename(row, key, input));
      row.append(input, valueControl(row, key, value), button('actions.remove', () => patch({ op: 'delete', path: ['env', key] })));
      appendRowHelp(row, key);
      return row;
    }

    function appendRowHelp(row, key) {
      const error = document.createElement('p');
      error.className = 'env-row-error env-caution';
      error.setAttribute('role', 'alert');
      error.hidden = true;
      const details = document.createElement('details');
      details.className = 'env-row-help';
      const summary = document.createElement('summary');
      summary.textContent = translate('env.help.label');
      const content = document.createElement('div');
      content.className = 'env-help-content';
      showHelp(key, content);
      details.append(summary, content);
      row.append(error, details);
    }

    function updateRows() {
      get('env-var-list').querySelectorAll('.env-item').forEach(row => {
        const key = row.dataset.envKey;
        row.querySelector('[data-env-key]').setAttribute('aria-label', translate('env.row.key', { name: key }));
        const valueInput = row.querySelector('[data-env-value]');
        if (valueInput) {
          valueInput.setAttribute('aria-label', translate('env.row.value', { name: key }));
          if (valueInput.type !== 'checkbox') {
            valueInput.type = state.envMasked ? 'password' : 'text';
          }
        }
        const badge = row.querySelector('.env-bool-badge');
        if (badge && valueInput && valueInput.type === 'checkbox') {
          const meta = model.getClaudeEnvVarMetadata(key, state.rawSchema);
          const boolType = meta ? meta.boolType : '';
          if (boolType === 'true_false') {
            badge.textContent = translate(valueInput.checked ? 'env.bool.true' : 'env.bool.false');
          } else {
            badge.textContent = translate(valueInput.checked ? 'env.bool.on' : 'env.bool.off');
          }
        }
        const summary = row.querySelector('summary');
        if (summary) summary.textContent = translate('env.help.label');
        row.querySelectorAll('[data-env-label]').forEach(element => { element.textContent = translate(element.dataset.envLabel); });
        showHelp(key, row.querySelector('.env-help-content'));
      });
    }

    function render() {
      const env = environment();
      const snapshot = JSON.stringify(env);
      if (!renderedRows || snapshot !== rowSnapshot) rebuildRows(env, snapshot);
      updateRows();
      get('new-env-val').type = state.envMasked ? 'password' : 'text';
      get('btn-mask-env').textContent = translate(state.envMasked ? 'env.mask.show' : 'env.mask.hide');
      get('btn-mask-env').setAttribute('aria-pressed', String(!state.envMasked));
      const currentAddKey = form().key.value.trim();
      const meta = model.getClaudeEnvVarMetadata(currentAddKey, state.rawSchema);
      syncAddBoolBadge(meta);
      refresh();
    }

    function rebuildRows(env, snapshot) {
      const container = get('env-var-list');
      container.replaceChildren();
      rowSnapshot = snapshot;
      renderedRows = true;
      if (typeof env !== 'object' || Array.isArray(env)) return emptyMessage(container, 'env.notObject');
      const keys = Object.keys(env).filter(key => !dedicated(key));
      if (!keys.length) return emptyMessage(container, 'env.empty');
      keys.forEach(key => container.appendChild(buildRow(key, env[key])));
    }

    function emptyMessage(container, key) {
      const text = document.createElement('p');
      text.className = 'field-hint';
      text.textContent = translate(key);
      text.setAttribute('data-i18n', key);
      container.appendChild(text);
    }

    function bind() {
      ['env-search', 'env-category', 'env-include-unofficial'].forEach(id => get(id).addEventListener('input', () => refresh()));
      get('select-env-var').addEventListener('change', () => {
        const val = get('select-env-var').value;
        form().key.value = val;
        showHelp(val);
        updateAddValueControl(val);
        const cb = get('new-env-val-bool');
        if (cb && cb.offsetParent !== null) {
          cb.focus();
        } else {
          form().value.focus();
        }
      });
      get('new-env-key').addEventListener('input', () => {
        message('');
        const val = form().key.value.trim();
        showHelp(val);
        updateAddValueControl(val);
      });
      get('btn-mask-env').addEventListener('click', () => { state.envMasked = !state.envMasked; render(); });
    }

    return { bind, render, refresh, add };
  }

  return { create, keyError, isCredentialPath, isBooleanChecked, getBooleanString };
});
