const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const schemaAdapter = require('../js/settings-schema.js');
const catalog = require('../js/settings-catalog.js');

const rawSchema = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'docs', 'claude-code-settings.json'), 'utf8')
);

// Initialize catalog with schema adapter
const adapter = schemaAdapter.createSchemaAdapter(rawSchema);
catalog.setSchemaAdapter(adapter);

test('settings catalog contains valid scopes and categories', () => {
  assert.ok(catalog.SCOPES.user);
  assert.ok(catalog.SCOPES.project);
  assert.ok(catalog.SCOPES.local);
  assert.ok(catalog.SCOPES.managed);
  assert.ok(catalog.CATEGORIES.length >= 8);
});

test('settings catalog derives schema facts for properties dynamically', () => {
  const themeDef = catalog.getSettingDefinition('theme');
  assert.equal(themeDef.path, 'theme');
  assert.equal(themeDef.category, 'general');
  assert.ok(Array.isArray(themeDef.enum));
  assert.ok(themeDef.enum.includes('dark'));

  const wfDef = catalog.getSettingDefinition('workflowSizeGuideline');
  assert.equal(wfDef.default, 'unrestricted');
  assert.equal(wfDef.category, 'models');

  const defaultModeDef = catalog.getSettingDefinition('permissions.defaultMode');
  assert.equal(defaultModeDef.category, 'permissions');
  assert.ok(defaultModeDef.enum.includes('acceptEdits'));
});

test('getAllSettings returns definitions for all schema properties', () => {
  const all = catalog.getAllSettings();
  assert.ok(all.length >= 50, 'Expected >= 50 settings, got: ' + all.length);

  const envDef = all.find(s => s.path === 'env');
  assert.ok(envDef);
  assert.equal(envDef.category, 'env');
  assert.equal(envDef.editorId, 'env-map');
});

test('getSettingsByCategory filters settings by tab category', () => {
  const generalSettings = catalog.getSettingsByCategory('general');
  assert.ok(generalSettings.length > 0);
  assert.ok(generalSettings.every(s => s.category === 'general'));

  const permissionsSettings = catalog.getSettingsByCategory('permissions');
  assert.ok(permissionsSettings.length > 0);
  assert.ok(permissionsSettings.every(s => s.category === 'permissions'));
});
