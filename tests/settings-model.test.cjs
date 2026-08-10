const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const model = require('../js/settings-model.js');

const sample = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'sample.json'), 'utf8'));

test('sample settings parse and serialize without data loss', () => {
  const parsed = model.parseSettingsJson(JSON.stringify(sample));
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.value, sample);
  assert.deepEqual(JSON.parse(model.serializeSettings(parsed.value)), sample);
});

test('rejects malformed JSON and non-object roots', () => {
  assert.equal(model.parseSettingsJson('{"broken"').ok, false);
  assert.equal(model.parseSettingsJson('[]').ok, false);
  assert.equal(model.parseSettingsJson('null').ok, false);
});

test('preserves unknown fields and explicit falsy values through patches', () => {
  const source = { unknown: { keep: true }, enabled: false, count: 0, empty: '', nullable: null };
  const changed = model.setAtPath(source, 'known.value', 'new');
  assert.deepEqual(changed.unknown, source.unknown);
  assert.equal(changed.enabled, false);
  assert.equal(changed.count, 0);
  assert.equal(changed.empty, '');
  assert.equal(changed.nullable, null);
  assert.equal(source.known, undefined);
});

test('deletes object properties and removes array entries without cleaning siblings', () => {
  const source = { env: { API_KEY: 'secret', keep: '' }, models: ['one', 'two', 'three'] };
  const withoutKey = model.deleteAtPath(source, ['env', 'API_KEY']);
  const withoutModel = model.deleteAtPath(withoutKey, ['models', 1]);
  assert.deepEqual(withoutModel, { env: { keep: '' }, models: ['one', 'three'] });
});

test('moves fallback models by array index', () => {
  const source = { fallbackModel: ['one', 'two', 'three'] };
  const moved = model.moveAtPath(source, 'fallbackModel', 2, 0);
  assert.deepEqual(moved.fallbackModel, ['three', 'one', 'two']);
  assert.deepEqual(source.fallbackModel, ['one', 'two', 'three']);
});

test('rejects prototype pollution path segments', () => {
  assert.throws(() => model.setAtPath({}, ['__proto__', 'polluted'], true), /Unsafe JSON path/);
  assert.throws(() => model.deleteAtPath({}, ['constructor']), /Unsafe JSON path/);
  assert.throws(() => model.normalizePath('prototype.value'), /Unsafe JSON path/);
});

test('reports malformed known shapes while preserving unknown values', () => {
  const parsed = model.parseSettingsJson(JSON.stringify({ fallbackModel: {}, futureSetting: { value: 1 } }));
  assert.equal(parsed.ok, false);
  assert.equal(parsed.diagnostics.some(item => item.path === 'fallbackModel'), true);
  const warning = model.parseSettingsJson(JSON.stringify({ theme: 'future-theme' }));
  assert.equal(warning.ok, true);
  assert.equal(warning.value.theme, 'future-theme');
  assert.equal(warning.diagnostics[0].severity, 'warning');
});

test('inspects every hook matcher group without flattening it', () => {
  const value = { hooks: { PreToolUse: [{ matcher: 'one', hooks: [] }, { matcher: 'two', hooks: [{ type: 'prompt' }] }] } };
  assert.deepEqual(model.getAtPath(value, 'hooks.PreToolUse.1.hooks.0.type'), 'prompt');
  assert.deepEqual(model.setAtPath(value, 'hooks.PreToolUse.1.timeout', 30), { hooks: { PreToolUse: [{ matcher: 'one', hooks: [] }, { matcher: 'two', hooks: [{ type: 'prompt' }], timeout: 30 }] } });
});

test('redacts secret-shaped keys without changing non-secret values', () => {
  const redacted = model.redactSecrets({ env: { ANTHROPIC_API_KEY: 'secret', endpoint: 'https://example.test' }, passwordHint: 'secret' });
  assert.equal(redacted.env.ANTHROPIC_API_KEY, '[redacted]');
  assert.equal(redacted.env.endpoint, 'https://example.test');
  assert.equal(redacted.passwordHint, '[redacted]');
});
