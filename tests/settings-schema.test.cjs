const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const schemaAdapter = require('../js/settings-schema.js');

const rawSchema = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'docs', 'claude-code-settings.json'), 'utf8')
);

test('schema adapter resolves pointer correctly, including escaped characters', () => {
  const dummySchema = {
    $defs: {
      'simple/item': { type: 'string', description: 'Simple' },
      'special~name/here': { type: 'integer', minimum: 10 }
    }
  };
  const resolvedSimple = schemaAdapter.resolvePointer(dummySchema, '#/$defs/simple~1item');
  assert.equal(resolvedSimple.type, 'string');
  assert.equal(resolvedSimple.description, 'Simple');

  const resolvedSpecial = schemaAdapter.resolvePointer(dummySchema, '#/$defs/special~0name~1here');
  assert.equal(resolvedSpecial.type, 'integer');
  assert.equal(resolvedSpecial.minimum, 10);
});

test('schema adapter detects circular references and throws a descriptive error', () => {
  const circularSchema = {
    $defs: {
      a: { $ref: '#/$defs/b' },
      b: { $ref: '#/$defs/a' }
    }
  };
  assert.throws(
    () => schemaAdapter.resolveSchema({ $ref: '#/$defs/a' }, circularSchema),
    /Circular \$ref detected/
  );
});

test('schema adapter normalizes allOf and preserves constraints', () => {
  const root = {
    $defs: {
      base: { type: 'integer', minimum: 1, default: 5 },
      extra: { maximum: 10, description: 'Bounded number' }
    }
  };
  const normalized = schemaAdapter.normalizeDefinition(
    { allOf: [{ $ref: '#/$defs/base' }, { $ref: '#/$defs/extra' }] },
    root,
    'myNumber'
  );
  assert.equal(normalized.type, 'integer');
  assert.equal(normalized.minimum, 1);
  assert.equal(normalized.maximum, 10);
  assert.equal(normalized.default, 5);
  assert.equal(normalized.description, 'Bounded number');
});

test('schema adapter flattens real vendored schema without errors', () => {
  const adapter = schemaAdapter.createSchemaAdapter(rawSchema);
  const paths = adapter.getAllPaths();
  assert.ok(paths.length > 50, 'Expected at least 50 flattened paths, got: ' + paths.length);

  // Check top-level properties
  assert.ok(adapter.hasDefinition('theme'));
  assert.ok(adapter.hasDefinition('model'));
  assert.ok(adapter.hasDefinition('permissions'));
  assert.ok(adapter.hasDefinition('permissions.defaultMode'));
  assert.ok(adapter.hasDefinition('permissions.allow'));
  assert.ok(adapter.hasDefinition('sandbox.network.allowedDomains'));
  assert.ok(adapter.hasDefinition('worktree.symlinkDirectories'));

  // Validate theme definition (union of presets and custom file path)
  const themeDef = adapter.getDefinition('theme');
  assert.equal(themeDef.type, 'union');
  assert.ok(Array.isArray(themeDef.enum));
  assert.ok(themeDef.enum.includes('dark'));
  assert.ok(themeDef.enum.includes('light'));

  // Validate permissions.defaultMode enum
  const defaultModeDef = adapter.getDefinition('permissions.defaultMode');
  assert.equal(defaultModeDef.type, 'string');
  assert.ok(Array.isArray(defaultModeDef.enum));
  assert.ok(defaultModeDef.enum.includes('acceptEdits'));
  assert.ok(defaultModeDef.enum.includes('bypassPermissions'));

  // Validate workflowSizeGuideline schema default is 'unrestricted'
  const wfDef = adapter.getDefinition('workflowSizeGuideline');
  assert.equal(wfDef.default, 'unrestricted');
  assert.ok(wfDef.enum.includes('unrestricted'));
  assert.ok(wfDef.enum.includes('medium'));
});

test('schema adapter handles arrays, maps, and unions gracefully', () => {
  const adapter = schemaAdapter.createSchemaAdapter(rawSchema);

  const fallbackDef = adapter.getDefinition('fallbackModel');
  assert.equal(fallbackDef.type, 'array');
  assert.ok(fallbackDef.items);

  const allowDef = adapter.getDefinition('permissions.allow');
  assert.equal(allowDef.type, 'array');
  assert.ok(allowDef.items);

  const envDef = adapter.getDefinition('env');
  assert.equal(envDef.type, 'object');
  assert.ok(envDef.additionalProperties);
});
