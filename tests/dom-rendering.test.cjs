const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const schemaAdapter = require('../js/settings-schema.js');
const catalog = require('../js/settings-catalog.js');
const i18n = require('../js/i18n.js');

const rawSchema = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'docs', 'claude-code-settings.json'), 'utf8')
);
const adapter = schemaAdapter.createSchemaAdapter(rawSchema);
catalog.setSchemaAdapter(adapter);

test('every presentation catalog setting has a corresponding localized label in en and pt-BR dictionaries', () => {
  const allSettings = catalog.getAllSettings();
  assert.ok(allSettings.length > 50);

  const missingEn = [];
  const missingPt = [];

  allSettings.forEach(s => {
    const key = s.labelKey;
    if (s.path in catalog.PRESENTATION_CATALOG) {
      if (!(key in i18n.DICTIONARIES.en)) {
        missingEn.push(`${s.path} -> ${key}`);
      }
      if (!(key in i18n.DICTIONARIES['pt-BR'])) {
        missingPt.push(`${s.path} -> ${key}`);
      }
    }
  });

  assert.deepEqual(missingEn, [], 'Missing English setting labels: ' + missingEn.join(', '));
  assert.deepEqual(missingPt, [], 'Missing Portuguese setting labels: ' + missingPt.join(', '));
});

test('index.html contains expected category panels and script tags', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(html.includes('js/settings-schema.js'), 'HTML must include settings-schema.js script tag');
  assert.ok(html.includes('js/settings-catalog.js'), 'HTML must include settings-catalog.js script tag');
  assert.ok(html.includes('id="tab-general"'), 'HTML must contain general tab');
  assert.ok(html.includes('id="tab-permissions"'), 'HTML must contain permissions tab');
  assert.ok(html.includes('id="tab-sandbox"'), 'HTML must contain sandbox tab');
  assert.ok(html.includes('id="tab-models"'), 'HTML must contain models tab');
  assert.ok(html.includes('id="tab-hooks"'), 'HTML must contain hooks tab');
  assert.ok(html.includes('id="tab-mcp"'), 'HTML must contain mcp tab');
  assert.ok(html.includes('id="tab-worktree"'), 'HTML must contain worktree tab');
  assert.ok(html.includes('id="tab-plugins"'), 'HTML must contain plugins tab');
  assert.ok(html.includes('id="tab-advanced-policies"'), 'HTML must contain advanced-policies tab');
});

test('boolean and 0/1 settings are represented as accessible checkbox inputs in index.html', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  // Check permissions boolean flags converted from select
  assert.ok(
    html.includes('type="checkbox" id="permissions_disableAutoMode" data-setting-path="permissions.disableAutoMode" data-checkbox-true="disable"'),
    'permissions.disableAutoMode must be a checkbox with data-checkbox-true="disable"'
  );
  assert.ok(
    html.includes('type="checkbox" id="permissions_disableBypassPermissionsMode" data-setting-path="permissions.disableBypassPermissionsMode" data-checkbox-true="disable"'),
    'permissions.disableBypassPermissionsMode must be a checkbox with data-checkbox-true="disable"'
  );

  // Check model and shell environment 0/1 flags converted from text inputs
  assert.ok(
    html.includes('type="checkbox" id="env_CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY" data-setting-path="env.CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY" data-checkbox-true="1"'),
    'env.CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY must be a checkbox with data-checkbox-true="1"'
  );
  assert.ok(
    html.includes('type="checkbox" id="env_CLAUDE_CODE_DISABLE_ADVISOR_TOOL" data-setting-path="env.CLAUDE_CODE_DISABLE_ADVISOR_TOOL" data-checkbox-true="1"'),
    'env.CLAUDE_CODE_DISABLE_ADVISOR_TOOL must be a checkbox with data-checkbox-true="1"'
  );
  assert.ok(
    html.includes('type="checkbox" id="env_CLAUDE_CODE_USE_POWERSHELL_TOOL" data-setting-path="env.CLAUDE_CODE_USE_POWERSHELL_TOOL" data-checkbox-true="1"'),
    'env.CLAUDE_CODE_USE_POWERSHELL_TOOL must be a checkbox with data-checkbox-true="1"'
  );
  assert.ok(
    html.includes('id="btn-preset-powershell"'),
    'index.html must include btn-preset-powershell preset button'
  );

  // Ensure no select elements remain for disableAutoMode or disableBypass
  assert.ok(!html.includes('<select id="permissions_disableAutoMode"'), 'No select element for permissions_disableAutoMode');
  assert.ok(!html.includes('<select id="permissions_disableBypassPermissionsMode"'), 'No select element for permissions_disableBypassPermissionsMode');
});

test('css/app.css defines 2-line layout rules for field-label and feature-meta-line', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'app.css'), 'utf8');
  assert.ok(css.includes('.feature-meta-line'), 'CSS must define .feature-meta-line class');
  assert.ok(css.includes('flex-direction: column'), 'CSS must define column flex direction for stacked field labels');
  assert.ok(css.includes('.checkbox-row label'), 'CSS must define .checkbox-row label rules');
});

test('subagent and gateway option checkboxes have distinct IDs, setting paths, and label bindings', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  // Verify distinct inputs
  assert.ok(html.includes('id="env_CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY"'));
  assert.ok(html.includes('id="env_CLAUDE_CODE_DISABLE_ADVISOR_TOOL"'));

  // Verify distinct label for associations
  assert.ok(html.includes('for="env_CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY"'));
  assert.ok(html.includes('for="env_CLAUDE_CODE_DISABLE_ADVISOR_TOOL"'));

  // Verify setting paths are distinct
  assert.ok(html.includes('data-setting-path="env.CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY"'));
  assert.ok(html.includes('data-setting-path="env.CLAUDE_CODE_DISABLE_ADVISOR_TOOL"'));

  // Verify app.js uses innermost container (.checkbox-row) or explicit label[for] matching
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
  assert.ok(
    appJs.includes("input.closest('.checkbox-row') || input.closest('.field-group')"),
    'app.js must prioritize innermost .checkbox-row over ancestor .field-group'
  );
  assert.ok(
    appJs.includes('group.querySelector(`label[for="${input.id}"]`)'),
    'app.js must target specific label matching input id'
  );
});

test('header actions do not contain load sample button and default file displays clean settings.json', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(!html.includes('id="btn-sample"'), 'index.html must NOT contain id="btn-sample"');
  assert.ok(!html.includes('data-i18n="actions.loadSample"'), 'index.html must NOT contain data-i18n="actions.loadSample"');
  assert.ok(!html.includes('data-i18n="file.activeSample"'), 'index.html must NOT contain data-i18n="file.activeSample"');
  assert.ok(html.includes('<span id="active-file-name">settings.json</span>'), 'index.html must display clean settings.json by default');

  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'app.css'), 'utf8');
  assert.ok(!css.includes('#btn-sample'), 'css/app.css must NOT contain #btn-sample');

  const appJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
  assert.ok(appJs.includes('initCleanDocument()'), 'app.js must initialize a clean document on start');
  assert.ok(appJs.includes("fileName: 'settings.json'"), "app.js state must default to settings.json");
  assert.ok(appJs.includes('isSample: false'), 'app.js state must default to isSample: false');
});

test('save, undo, redo, and open buttons in header are icon-only with accessible tooltip titles', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  const buttonIds = ['btn-save', 'btn-undo', 'btn-redo', 'btn-open'];
  buttonIds.forEach(id => {
    const btnRegex = new RegExp(`<button[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/button>`, 'i');
    const match = html.match(btnRegex);
    assert.ok(match, `Button #${id} must exist in index.html`);

    const buttonHtml = match[0];
    const buttonContent = match[1];

    assert.ok(buttonHtml.includes('icon-only'), `#${id} must have icon-only class`);
    assert.ok(buttonContent.includes('<svg'), `#${id} must contain SVG icon`);
    assert.ok(!buttonContent.includes('<span'), `#${id} must not contain span text element`);
    assert.ok(buttonHtml.includes('data-i18n-title='), `#${id} must have data-i18n-title for hover tooltip`);
    assert.ok(buttonHtml.includes('data-i18n-aria-label='), `#${id} must have data-i18n-aria-label for screen reader accessibility`);
  });

  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'app.css'), 'utf8');
  assert.ok(css.includes('.btn.icon-only'), 'css/app.css must define .btn.icon-only');
});

test('header does not contain manual language selector, relying purely on browser locale detection', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(!html.includes('id="lang-select"'), 'index.html must NOT contain id="lang-select"');
  assert.ok(!html.includes('class="lang-selector-wrap"'), 'index.html must NOT contain .lang-selector-wrap');
  assert.ok(!html.includes('data-i18n="app.languageLabel"'), 'index.html must NOT contain data-i18n="app.languageLabel"');

  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'app.css'), 'utf8');
  assert.ok(!css.includes('.lang-selector-wrap'), 'css/app.css must NOT define .lang-selector-wrap');
  assert.ok(!css.includes('.lang-select'), 'css/app.css must NOT define .lang-select');

  const appJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
  assert.ok(!appJs.includes("getElement('lang-select')"), 'app.js must not bind lang-select change events');
});


