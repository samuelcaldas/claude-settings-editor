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

  // Check model environment 0/1 flags converted from text inputs
  assert.ok(
    html.includes('type="checkbox" id="env_CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY" data-setting-path="env.CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY" data-checkbox-true="1"'),
    'env.CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY must be a checkbox with data-checkbox-true="1"'
  );
  assert.ok(
    html.includes('type="checkbox" id="env_CLAUDE_CODE_DISABLE_ADVISOR_TOOL" data-setting-path="env.CLAUDE_CODE_DISABLE_ADVISOR_TOOL" data-checkbox-true="1"'),
    'env.CLAUDE_CODE_DISABLE_ADVISOR_TOOL must be a checkbox with data-checkbox-true="1"'
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
