const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const model = require('../js/settings-model.js');
const catalog = require('../js/settings-catalog.js');

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

test('renames keys dynamically in maps via renameKeyAtPath', () => {
  const source = { env: { OLD_VAR: 'value1', OTHER: 'value2' } };
  const updated = model.renameKeyAtPath(source, 'env', 'OLD_VAR', 'NEW_VAR');
  assert.deepEqual(updated.env, { NEW_VAR: 'value1', OTHER: 'value2' });
});

test('applies batch patches sequentially', () => {
  const source = { env: { A: '1' }, fallbackModel: ['m1'] };
  const patched = model.batchPatches(source, [
    { op: 'set', path: 'env.B', value: '2' },
    { op: 'delete', path: 'env.A' },
    { op: 'set', path: 'theme', value: 'dark' }
  ]);
  assert.deepEqual(patched, { env: { B: '2' }, fallbackModel: ['m1'], theme: 'dark' });
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

test('inspects scope mismatches for project and managed scopes', () => {
  const projectDoc = {
    claudeMd: 'managed content',
    permissions: { defaultMode: 'auto' },
    allowManagedPermissionRulesOnly: true
  };
  const diagnostics = model.inspectSettings(projectDoc, 'project');
  assert.equal(diagnostics.some(d => d.path === 'claudeMd'), true);
  assert.equal(diagnostics.some(d => d.path === 'permissions.defaultMode'), true);
  assert.equal(diagnostics.some(d => d.path === 'allowManagedPermissionRulesOnly'), true);
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

test('settings catalog contains full schema paths, gateway tier definitions and dedicated keys helper', () => {
  assert.ok(catalog.CATALOG.length > 50);
  assert.ok(catalog.getSettingDefinition('permissions.defaultMode'));
  assert.ok(catalog.getSettingDefinition('sandbox.enabled'));
  assert.ok(catalog.getSettingDefinition('hooks'));
  assert.ok(catalog.getSettingDefinition('$schema'));
  assert.ok(catalog.getSettingDefinition('skipDangerousModePermissionPrompt'));
  assert.ok(catalog.getSettingDefinition('skipWorkflowUsageWarning'));
  assert.ok(catalog.getSettingDefinition('skipAutoPermissionPrompt'));
  assert.ok(catalog.getSettingDefinition('autoCompactThreshold'));
  assert.ok(catalog.getSettingDefinition('hasCompletedOnboarding'));
  assert.ok(catalog.getSettingDefinition('env.ANTHROPIC_API_KEY'));
  assert.ok(catalog.getSettingDefinition('env.ANTHROPIC_BASE_URL'));
  assert.ok(catalog.getSettingDefinition('env.ANTHROPIC_DEFAULT_FABLE_MODEL'));
  assert.ok(catalog.getSettingDefinition('env.ANTHROPIC_DEFAULT_OPUS_MODEL'));
  assert.ok(catalog.getSettingDefinition('env.ANTHROPIC_DEFAULT_SONNET_MODEL'));
  assert.ok(catalog.getSettingDefinition('env.ANTHROPIC_DEFAULT_HAIKU_MODEL'));
  assert.ok(catalog.getSettingDefinition('env.ANTHROPIC_CUSTOM_MODEL_OPTION'));
  assert.ok(catalog.getSettingDefinition('env.CLAUDE_CODE_SUBAGENT_MODEL'));
  assert.equal(catalog.isDedicatedEnvKey('ANTHROPIC_API_KEY'), true);
  assert.equal(catalog.isDedicatedEnvKey('ANTHROPIC_DEFAULT_SONNET_MODEL'), true);
  assert.equal(catalog.isDedicatedEnvKey('CUSTOM_UNTRACKED_VAR'), false);
  assert.equal(catalog.isSettingSupportedInScope('allowManagedPermissionRulesOnly', 'user'), false);
  assert.equal(catalog.isSettingSupportedInScope('allowManagedPermissionRulesOnly', 'managed'), true);
});

test('real ~/.claude/settings.json parses and serializes with 100% roundtrip fidelity', () => {
  const homeSettingsPath = path.join(process.env.HOME || '', '.claude', 'settings.json');
  if (fs.existsSync(homeSettingsPath)) {
    const raw = fs.readFileSync(homeSettingsPath, 'utf8');
    const parsed = model.parseSettingsJson(raw);
    assert.equal(parsed.ok, true, 'Parsing real settings.json failed');
    assert.equal(parsed.diagnostics.filter(d => d.severity === 'error').length, 0);

    const serialized = model.serializeSettings(parsed.value);
    const roundTripped = JSON.parse(serialized);
    const expected = JSON.parse(raw);
    assert.deepEqual(roundTripped, expected);
  }
});
