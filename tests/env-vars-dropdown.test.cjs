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

test('Localization parity for Claude CLI env var dropdown keys', () => {
  const keys = [
    'env.selectVar.label',
    'env.selectVar.placeholder'
  ];

  for (const k of keys) {
    const enVal = i18n.t(k, {}, 'en');
    const ptVal = i18n.t(k, {}, 'pt-BR');

    assert.ok(enVal && enVal !== k, `Key ${k} must exist in EN dictionary`);
    assert.ok(ptVal && ptVal !== k, `Key ${k} must exist in pt-BR dictionary`);
  }
});

test('app.js integrates populateClaudeEnvVarsDropdownAndDatalist and row datalist bindings', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

  assert.ok(
    appJs.includes('populateClaudeEnvVarsDropdownAndDatalist'),
    'app.js must declare and invoke populateClaudeEnvVarsDropdownAndDatalist'
  );
  assert.ok(
    appJs.includes("keyInp.setAttribute('list', 'claude-env-vars-datalist')"),
    'renderEnvVars must link key inputs with claude-env-vars-datalist'
  );
  assert.ok(
    appJs.includes("getElement('select-env-var')"),
    'app.js must reference #select-env-var'
  );
  assert.ok(
    appJs.includes("getElement('new-env-desc')"),
    'app.js must reference #new-env-desc'
  );
});
