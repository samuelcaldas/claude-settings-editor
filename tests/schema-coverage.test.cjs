const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const schemaAdapter = require('../js/settings-schema.js');
const catalog = require('../js/settings-catalog.js');

const rawSchema = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'docs', 'claude-code-settings.json'), 'utf8')
);

const adapter = schemaAdapter.createSchemaAdapter(rawSchema);
catalog.setSchemaAdapter(adapter);

test('every named schema property is present in the normalized adapter definitions', () => {
  const schemaPaths = adapter.getAllPaths();
  assert.ok(schemaPaths.length > 50);

  schemaPaths.forEach(propPath => {
    const def = adapter.getDefinition(propPath);
    assert.ok(def, `Missing schema definition for ${propPath}`);
    assert.ok(def.name, `Missing name for ${propPath}`);
    assert.ok(def.type, `Missing type for ${propPath}`);
    assert.ok(typeof def.description === 'string', `Description must be string for ${propPath}`);
  });
});

test('every supported catalog setting resolves against the schema', () => {
  const allCatalogSettings = catalog.getAllSettings();
  assert.ok(allCatalogSettings.length > 50);

  allCatalogSettings.forEach(s => {
    assert.ok(s.path, 'Setting must have a path');
    assert.ok(s.labelKey, `Setting ${s.path} must have labelKey`);
    assert.ok(s.category, `Setting ${s.path} must have a category`);
    assert.ok(Array.isArray(s.scopes), `Setting ${s.path} must specify valid scopes`);
    assert.ok(s.scopes.length > 0, `Setting ${s.path} scopes cannot be empty`);
  });
});

test('catalog does not advertise undocumented keys as supported schema properties', () => {
  const schemaPaths = new Set(adapter.getAllPaths());
  const allCatalogSettings = catalog.getAllSettings();

  allCatalogSettings.forEach(s => {
    if (!s.path.startsWith('env.')) {
      assert.ok(
        schemaPaths.has(s.path),
        `Catalog setting "${s.path}" is not in official schema`
      );
    }
  });
});
