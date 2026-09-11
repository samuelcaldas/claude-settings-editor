const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const model = require('../js/settings-model.js');
const i18n = require('../js/i18n.js');

const rawSchema = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'docs', 'claude-code-settings.json'), 'utf8')
);

test('model.getKnownClaudeEnvVars returns all authoritative Claude CLI environment variables', () => {
  const varsFromSchema = model.getKnownClaudeEnvVars(rawSchema);
  assert.ok(Array.isArray(varsFromSchema));
  assert.ok(varsFromSchema.length >= 340, `Expected at least 340 env vars, got ${varsFromSchema.length}`);

  // Test fallback when no schema is passed
  const varsFallback = model.getKnownClaudeEnvVars();
  assert.ok(Array.isArray(varsFallback));
  assert.ok(varsFallback.length >= 340, `Expected at least 340 fallback env vars, got ${varsFallback.length}`);

  // Check key known variables exist and have descriptions
  const checkKeys = [
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_AUTH_TOKEN',
    'ANTHROPIC_BASE_URL',
    'ANTHROPIC_MODEL',
    'ANTHROPIC_DEFAULT_SONNET_MODEL',
    'ANTHROPIC_DEFAULT_OPUS_MODEL',
    'ANTHROPIC_DEFAULT_HAIKU_MODEL',
    'CLAUDE_CODE_USE_POWERSHELL_TOOL',
    'CLAUDE_CODE_SUBAGENT_MODEL',
    'OTEL_EXPORTER_OTLP_ENDPOINT',
    'BASH_MAX_TIMEOUT_MS',
    'VERTEX_REGION_CLAUDE_FABLE_5'
  ];

  for (const k of checkKeys) {
    const item = varsFromSchema.find(v => v.name === k);
    assert.ok(item, `Variable ${k} must exist in getKnownClaudeEnvVars result`);
    assert.ok(item.description && item.description.length > 0, `Variable ${k} must have non-empty description`);

    const desc = model.getClaudeEnvVarDescription(k, rawSchema);
    assert.equal(desc, item.description, `getClaudeEnvVarDescription must match for ${k}`);

    const descFallback = model.getClaudeEnvVarDescription(k);
    assert.ok(descFallback && descFallback.length > 0, `getClaudeEnvVarDescription fallback must return description for ${k}`);
  }

  // Ensure alphabetical ordering
  for (let i = 1; i < varsFromSchema.length; i++) {
    assert.ok(
      varsFromSchema[i - 1].name < varsFromSchema[i].name,
      `Items must be sorted alphabetically: ${varsFromSchema[i - 1].name} before ${varsFromSchema[i].name}`
    );
  }
});

test('HTML shell contains select-env-var dropdown, datalist, and description hint element', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.ok(html.includes('id="select-env-var"'), 'index.html must contain #select-env-var');
  assert.ok(html.includes('id="claude-env-vars-datalist"'), 'index.html must contain #claude-env-vars-datalist');
  assert.ok(html.includes('id="new-env-desc"'), 'index.html must contain #new-env-desc');
  assert.ok(
    html.includes('list="claude-env-vars-datalist"'),
    'new-env-key input must be wired with list="claude-env-vars-datalist"'
  );
  assert.ok(
    html.includes('data-i18n="env.selectVar.label"'),
    'select-env-var label must have data-i18n="env.selectVar.label"'
  );
  assert.ok(
    html.includes('data-i18n="env.selectVar.placeholder"'),
    'select-env-var placeholder must have data-i18n="env.selectVar.placeholder"'
  );
});

test('Localization parity for Claude CLI env var discovery and editing keys', () => {
  const keys = [
    'env.selectVar.label',
    'env.selectVar.placeholder',
    'env.search',
    'env.category',
    'env.category.all',
    'env.category.behavior',
    'env.category.tools',
    'env.category.network',
    'env.category.telemetry',
    'env.category.performance',
    'env.includeUnofficial',
    'env.discoveryHint',
    'env.results',
    'env.noResults',
    'env.name',
    'env.value',
    'env.emptyHint',
    'env.mask.show',
    'env.mask.hide',
    'env.editDedicated',
    'env.editRaw',
    'env.row.key',
    'env.row.value',
    'env.error.name',
    'env.error.duplicate',
    'env.error.dedicated',
    'env.help.label',
    'env.help.custom',
    'env.help.sourceDescription',
    'env.help.source',
    'env.help.provenance',
    'env.help.observed',
    'env.help.minimum',
    'env.help.restart',
    'env.help.ignoredScope',
    'env.help.sensitive',
    'env.help.values',
    'env.help.multiline',
    'env.status.official',
    'env.status.unofficial',
    'env.status.unclassified',
    'env.applicability.settings',
    'env.applicability.subprocess',
    'env.applicability.launch',
    'env.applicability.ignored',
    'env.applicability.unknown',
    'env.guidance.nonempty',
    'env.guidance.afk',
    'env.guidance.pwsh',
    'env.guidance.slowOperation',
    'env.guidance.cacheCost'
  ];

  for (const k of keys) {
    const enVal = i18n.t(k, { count: 5, name: 'TEST_VAR', version: '2.1.202', values: 'a, b' }, 'en');
    const ptVal = i18n.t(k, { count: 5, name: 'TEST_VAR', version: '2.1.202', values: 'a, b' }, 'pt-BR');

    assert.ok(enVal && enVal !== k, `Key ${k} must exist in EN dictionary`);
    assert.ok(ptVal && ptVal !== k, `Key ${k} must exist in pt-BR dictionary`);
  }
});

test('app.js integrates populateClaudeEnvVarsDropdownAndDatalist delegating to envEditor', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

  assert.ok(
    appJs.includes('populateClaudeEnvVarsDropdownAndDatalist'),
    'app.js must declare and invoke populateClaudeEnvVarsDropdownAndDatalist'
  );
  assert.ok(
    appJs.includes('envEditor.refresh(schemaObj)'),
    'populateClaudeEnvVarsDropdownAndDatalist must delegate to envEditor.refresh'
  );
  assert.ok(
    appJs.includes('envEditor.render()'),
    'renderEnvVars must delegate to envEditor.render'
  );
  assert.ok(
    appJs.includes('envEditor.add()'),
    'addEnvVar must delegate to envEditor.add'
  );
});

test('env-editor.js binds row datalists, discovery controls, and safe mutations', () => {
  const envEditorJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'env-editor.js'), 'utf8');
  const envEditor = require('../js/env-editor.js');

  assert.ok(
    envEditorJs.includes("input.setAttribute('list', 'claude-env-vars-datalist')"),
    'env-editor must link key inputs with claude-env-vars-datalist'
  );
  assert.ok(
    envEditorJs.includes("'select-env-var'"),
    'env-editor must reference select-env-var'
  );
  assert.ok(
    envEditorJs.includes("'new-env-desc'"),
    'env-editor must reference new-env-desc'
  );
  assert.ok(
    envEditorJs.includes("'env-search'"),
    'env-editor must bind env-search'
  );
  assert.ok(
    envEditorJs.includes("'env-include-unofficial'"),
    'env-editor must bind env-include-unofficial'
  );

  // Unit tests for keyError
  assert.equal(envEditor.keyError({}, 'VALID_VAR_123'), '');
  assert.equal(envEditor.keyError({}, '123_INVALID'), 'env.error.name');
  assert.equal(envEditor.keyError({}, 'invalid-lowercase'), 'env.error.name');
  assert.equal(envEditor.keyError({}, ''), 'env.error.name');
  assert.equal(envEditor.keyError({ EXISTING_VAR: 'val' }, 'EXISTING_VAR'), 'env.error.duplicate');
  assert.equal(envEditor.keyError({ EXISTING_VAR: 'val' }, 'EXISTING_VAR', 'EXISTING_VAR'), '');

  // Unit tests for isCredentialPath
  assert.equal(envEditor.isCredentialPath(['env', 'ANTHROPIC_API_KEY']), true);
  assert.equal(envEditor.isCredentialPath(['env', 'ANTHROPIC_AUTH_TOKEN']), true);
  assert.equal(envEditor.isCredentialPath(['env', 'ANTHROPIC_BASE_URL']), true);
  assert.equal(envEditor.isCredentialPath(['env', 'OTHER_VAR']), false);
  assert.equal(envEditor.isCredentialPath('env.ANTHROPIC_API_KEY'), true);
  assert.equal(envEditor.isCredentialPath('env.OTHER_VAR'), false);

  // Unit tests for isBooleanChecked
  assert.equal(envEditor.isBooleanChecked('1', '0_1'), true);
  assert.equal(envEditor.isBooleanChecked('0', '0_1'), false);
  assert.equal(envEditor.isBooleanChecked('true', '0_1'), true);
  assert.equal(envEditor.isBooleanChecked('false', '0_1'), false);
  assert.equal(envEditor.isBooleanChecked('', '0_1'), false);
  assert.equal(envEditor.isBooleanChecked('true', 'true_false'), true);
  assert.equal(envEditor.isBooleanChecked('True', 'true_false'), true);
  assert.equal(envEditor.isBooleanChecked('false', 'true_false'), false);
  assert.equal(envEditor.isBooleanChecked('anything', 'nonempty'), true);
  assert.equal(envEditor.isBooleanChecked('', 'nonempty'), false);

  // Unit tests for getBooleanString
  assert.equal(envEditor.getBooleanString(true, '0_1'), '1');
  assert.equal(envEditor.getBooleanString(false, '0_1'), '0');
  assert.equal(envEditor.getBooleanString(true, 'true_false'), 'true');
  assert.equal(envEditor.getBooleanString(false, 'true_false'), 'false');
  assert.equal(envEditor.getBooleanString(true, 'nonempty'), '1');
  assert.equal(envEditor.getBooleanString(false, 'nonempty'), '');

  // Optgroup categorization logic in envEditor
  assert.ok(
    envEditorJs.includes("document.createElement('optgroup')"),
    'env-editor must create optgroup elements for categorized dropdown'
  );
  assert.ok(
    envEditorJs.includes('env-bool-checkbox'),
    'env-editor must render env-bool-checkbox for boolean variables'
  );
});

test('index.html renders canonical variable names without redundant env. prefix in code tags', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  // Verify dedicated field code tags do not have env. prefix
  assert.ok(html.includes('<code>ANTHROPIC_API_KEY</code>'), 'Must display bare ANTHROPIC_API_KEY');
  assert.ok(html.includes('<code>ANTHROPIC_BASE_URL</code>'), 'Must display bare ANTHROPIC_BASE_URL');
  assert.ok(html.includes('<code>ANTHROPIC_AUTH_TOKEN</code>'), 'Must display bare ANTHROPIC_AUTH_TOKEN');
  assert.ok(html.includes('<code>CLAUDE_CODE_USE_POWERSHELL_TOOL</code>'), 'Must display bare CLAUDE_CODE_USE_POWERSHELL_TOOL');
  assert.ok(html.includes('<code>CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY</code>'), 'Must display bare CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY');
  assert.ok(html.includes('<code>CLAUDE_CODE_DISABLE_ADVISOR_TOOL</code>'), 'Must display bare CLAUDE_CODE_DISABLE_ADVISOR_TOOL');

  // Ensure redundant prefixes do not appear in code tags or section title
  assert.ok(!html.includes('<code>env.ANTHROPIC_API_KEY</code>'), 'Must not have <code>env.ANTHROPIC_API_KEY</code>');
  assert.ok(!html.includes('<code>env.ANTHROPIC_BASE_URL</code>'), 'Must not have <code>env.ANTHROPIC_BASE_URL</code>');
  assert.ok(!html.includes('(env.ANTHROPIC_DEFAULT_*)'), 'Section title must not have env. prefix');
});

test('env-editor dynamically excludes configured env vars from select and datalist, and restores on removal', () => {
  const envEditor = require('../js/env-editor.js');
  const catalog = require('../js/settings-catalog.js');
  const envVarHelp = require('../js/env-var-help.js');

  class FakeNode {
    constructor(tagName = 'div', id = '') {
      this.tagName = tagName.toUpperCase();
      this.id = id;
      this.value = '';
      this.checked = false;
      this.hidden = false;
      this.textContent = '';
      this.style = {};
      this.dataset = {};
      this.children = [];
      this.attributes = new Map();
      this.listeners = new Map();
      this.offsetParent = null;
    }

    get firstElementChild() {
      return this.children[0] || null;
    }

    replaceChildren(...items) {
      this.children = [...items];
      for (const item of items) {
        if (item && typeof item === 'object') item.parentNode = this;
      }
    }

    appendChild(child) {
      this.children.push(child);
      if (child && typeof child === 'object') child.parentNode = this;
      return child;
    }

    append(...items) {
      for (const item of items) {
        this.appendChild(item);
      }
    }

    setAttribute(name, val) {
      this.attributes.set(name, String(val));
    }

    getAttribute(name) {
      return this.attributes.get(name);
    }

    addEventListener(event, fn) {
      if (!this.listeners.has(event)) this.listeners.set(event, []);
      this.listeners.get(event).push(fn);
    }

    querySelector(selector) {
      if (selector === '.env-row-error') return new FakeNode('p');
      if (selector === '.env-help-content') return new FakeNode('div');
      return null;
    }

    querySelectorAll(selector) {
      return [];
    }

    focus() {}
  }

  const elements = new Map();
  function getOrCreate(id, tag = 'div') {
    if (!elements.has(id)) {
      elements.set(id, new FakeNode(tag, id));
    }
    return elements.get(id);
  }

  const requiredIds = [
    'env-search', 'env-category', 'env-include-unofficial',
    'select-env-var', 'claude-env-vars-datalist',
    'env-result-count', 'env-no-results',
    'new-env-key', 'new-env-val', 'new-env-desc',
    'env-add-error', 'env-var-list', 'btn-mask-env'
  ];
  for (const id of requiredIds) {
    getOrCreate(id);
  }

  const prevDoc = global.document;
  global.document = {
    getElementById: id => getOrCreate(id),
    createElement: tag => new FakeNode(tag)
  };

  try {
    const state = {
      document: {
        env: {
          CLAUDE_CODE_PROMPT_CACHE_TTL: '5m'
        }
      },
      rawSchema,
      targetScope: 'user',
      envMasked: false
    };

    let lastPatch = null;
    const patch = p => {
      lastPatch = p;
      if (p.op === 'set') {
        const key = p.path[1];
        state.document.env = state.document.env || {};
        state.document.env[key] = p.value;
      } else if (p.op === 'delete') {
        const key = p.path[1];
        if (state.document.env) delete state.document.env[key];
      }
      editor.render();
      return true;
    };

    const editor = envEditor.create({
      model,
      catalog,
      state,
      patch,
      translate: (key, params) => {
        if (params && params.count !== undefined) return `${key}:${params.count}`;
        return key;
      },
      navigate: () => {},
      help: envVarHelp
    });

    // 1. Verify options() includes configured keys in exclude
    const optsInitial = editor.options();
    assert.ok(Array.isArray(optsInitial.exclude));
    assert.ok(optsInitial.exclude.includes('CLAUDE_CODE_PROMPT_CACHE_TTL'));

    // 2. Render and refresh initial state
    editor.render();

    const select = getOrCreate('select-env-var');
    const datalist = getOrCreate('claude-env-vars-datalist');

    function getSelectOptionValues() {
      const values = [];
      for (const group of select.children) {
        for (const opt of group.children || []) {
          values.push(opt.value);
        }
      }
      return values;
    }

    function getDatalistValues() {
      return datalist.children.map(opt => opt.value);
    }

    // CLAUDE_CODE_PROMPT_CACHE_TTL must be excluded
    assert.ok(!getSelectOptionValues().includes('CLAUDE_CODE_PROMPT_CACHE_TTL'));
    assert.ok(!getDatalistValues().includes('CLAUDE_CODE_PROMPT_CACHE_TTL'));

    // API_TIMEOUT_MS is unconfigured, so it must be present
    assert.ok(getSelectOptionValues().includes('API_TIMEOUT_MS'));
    assert.ok(getDatalistValues().includes('API_TIMEOUT_MS'));

    // 3. Add API_TIMEOUT_MS via add()
    getOrCreate('new-env-key').value = 'API_TIMEOUT_MS';
    getOrCreate('new-env-val').value = '600000';
    editor.add();

    assert.equal(lastPatch.op, 'set');
    assert.equal(lastPatch.path[1], 'API_TIMEOUT_MS');

    // Both variables must now be excluded
    assert.ok(!getSelectOptionValues().includes('CLAUDE_CODE_PROMPT_CACHE_TTL'));
    assert.ok(!getSelectOptionValues().includes('API_TIMEOUT_MS'));
    assert.ok(!getDatalistValues().includes('CLAUDE_CODE_PROMPT_CACHE_TTL'));
    assert.ok(!getDatalistValues().includes('API_TIMEOUT_MS'));

    // 4. Remove CLAUDE_CODE_PROMPT_CACHE_TTL
    patch({ op: 'delete', path: ['env', 'CLAUDE_CODE_PROMPT_CACHE_TTL'] });

    // CLAUDE_CODE_PROMPT_CACHE_TTL must be restored, API_TIMEOUT_MS still excluded
    assert.ok(getSelectOptionValues().includes('CLAUDE_CODE_PROMPT_CACHE_TTL'));
    assert.ok(getDatalistValues().includes('CLAUDE_CODE_PROMPT_CACHE_TTL'));
    assert.ok(!getSelectOptionValues().includes('API_TIMEOUT_MS'));
    assert.ok(!getDatalistValues().includes('API_TIMEOUT_MS'));

    // 5. Search query matching only an excluded variable shows 0 results
    patch({ op: 'set', path: ['env', 'ANTHROPIC_BEDROCK_REGION_PREFIX'], value: 'us-east-1' });
    getOrCreate('env-search').value = 'ANTHROPIC_BEDROCK_REGION_PREFIX';
    editor.refresh();
    assert.equal(getSelectOptionValues().length, 0);
    assert.equal(getDatalistValues().length, 0);
    assert.equal(getOrCreate('env-no-results').hidden, false);

  } finally {
    global.document = prevDoc;
  }
});
