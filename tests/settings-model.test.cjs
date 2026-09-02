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

test('buildOpenAiModelsUrl resolves endpoint URL correctly across permutations', () => {
  assert.equal(model.buildOpenAiModelsUrl('https://api.openai.com'), 'https://api.openai.com/v1/models');
  assert.equal(model.buildOpenAiModelsUrl('https://api.openai.com/'), 'https://api.openai.com/v1/models');
  assert.equal(model.buildOpenAiModelsUrl('https://api.openai.com/v1'), 'https://api.openai.com/v1/models');
  assert.equal(model.buildOpenAiModelsUrl('https://api.openai.com/v1/'), 'https://api.openai.com/v1/models');
  assert.equal(model.buildOpenAiModelsUrl('http://localhost:11434'), 'http://localhost:11434/v1/models');
  assert.equal(model.buildOpenAiModelsUrl('http://localhost:11434/v1/models'), 'http://localhost:11434/v1/models');
  assert.equal(model.buildOpenAiModelsUrl('https://custom.gateway.internal/models'), 'https://custom.gateway.internal/models');
  assert.equal(model.buildOpenAiModelsUrl('   https://gateway.com/v1   '), 'https://gateway.com/v1/models');
  assert.equal(model.buildOpenAiModelsUrl(''), '');
  assert.equal(model.buildOpenAiModelsUrl(null), '');
  assert.equal(model.buildOpenAiModelsUrl('javascript:alert(1)'), '');
  assert.equal(model.buildOpenAiModelsUrl('file:///etc/passwd'), '');
  assert.equal(model.buildOpenAiModelsUrl('data:text/plain,hello'), '');
});

test('parseOpenAiModelsResponse handles OpenAI, Ollama, array formats with sorting and deduplication', () => {
  // Standard OpenAI format
  const openAiPayload = {
    object: 'list',
    data: [
      { id: 'gpt-4o', object: 'model' },
      { id: 'claude-3-7-sonnet', object: 'model' },
      { id: 'gpt-4o-mini', object: 'model' }
    ]
  };
  assert.deepEqual(model.parseOpenAiModelsResponse(openAiPayload), [
    'claude-3-7-sonnet',
    'gpt-4o',
    'gpt-4o-mini'
  ]);

  // Ollama / LiteLLM format with models array and name
  const ollamaPayload = {
    models: [
      { name: 'llama3:latest' },
      { name: 'mistral:7b' },
      { name: 'llama3:latest' } // duplicate
    ]
  };
  assert.deepEqual(model.parseOpenAiModelsResponse(ollamaPayload), [
    'llama3:latest',
    'mistral:7b'
  ]);

  // Plain JSON string with mixed objects and string entries
  const jsonStr = JSON.stringify({
    data: [{ id: 'model-b' }, { model: 'model-a' }, { id: '' }]
  });
  assert.deepEqual(model.parseOpenAiModelsResponse(jsonStr), [
    'model-a',
    'model-b'
  ]);

  // Edge cases
  assert.deepEqual(model.parseOpenAiModelsResponse(null), []);
  assert.deepEqual(model.parseOpenAiModelsResponse('invalid json'), []);
  assert.deepEqual(model.parseOpenAiModelsResponse({}), []);
});

test('getDefaultKnownModels returns curated default models list', () => {
  const defaults = model.getDefaultKnownModels();
  assert.ok(Array.isArray(defaults));
  assert.ok(defaults.length >= 10);
  assert.ok(defaults.includes('claude-3-7-sonnet-20250219'));
  assert.ok(defaults.includes('claude-sonnet-5'));
  assert.ok(defaults.includes('gpt-4o'));
});

test('renameKeyAtPath rejects prototype pollution keys', () => {
  assert.throws(() => model.renameKeyAtPath({ env: { KEY: 'val' } }, 'env', 'KEY', '__proto__'), /Unsafe key name/);
  assert.throws(() => model.renameKeyAtPath({ env: { KEY: 'val' } }, 'env', 'KEY', 'constructor'), /Unsafe key name/);
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
  assert.ok(catalog.getSettingDefinition('showClearContextOnPlanAccept'));
  assert.ok(catalog.getSettingDefinition('awaySummaryEnabled'));
  assert.ok(catalog.getSettingDefinition('autoMode.classifyAllShell'));
  assert.ok(catalog.getSettingDefinition('feedbackSurveyRate'));
  assert.ok(catalog.getSettingDefinition('skillListingBudgetFraction'));
  assert.ok(catalog.getSettingDefinition('skillListingMaxDescChars'));
  assert.ok(catalog.getSettingDefinition('vimInsertModeRemaps'));
  assert.ok(catalog.getSettingDefinition('spinnerVerbs'));
  assert.ok(catalog.getSettingDefinition('spinnerTipsOverride'));
  assert.equal(catalog.getSettingDefinition('showClearContextOnPlanAccept').type, 'boolean');
  assert.equal(catalog.getSettingDefinition('showClearContextOnPlanAccept').default, false);
  assert.ok(catalog.getSettingDefinition('advisorModel'));
  assert.equal(catalog.getSettingDefinition('advisorModel').type, 'string');
  assert.ok(catalog.getSettingDefinition('env.CLAUDE_CODE_DISABLE_ADVISOR_TOOL'));
  assert.equal(catalog.isDedicatedEnvKey('ANTHROPIC_API_KEY'), true);
  assert.equal(catalog.isDedicatedEnvKey('ANTHROPIC_DEFAULT_SONNET_MODEL'), true);
  assert.equal(catalog.isDedicatedEnvKey('CLAUDE_CODE_DISABLE_ADVISOR_TOOL'), true);
  assert.equal(catalog.isDedicatedEnvKey('CLAUDE_CODE_USE_POWERSHELL_TOOL'), true);
  assert.equal(catalog.isDedicatedEnvKey('CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL'), false);
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

test('validateSettingsDocument returns ok boolean and diagnostics array', () => {
  const validDoc = { theme: 'dark', permissions: { allow: ['Bash'] } };
  const validResult = model.validateSettingsDocument(validDoc);
  assert.equal(typeof validResult, 'object');
  assert.equal(validResult.ok, true);
  assert.ok(Array.isArray(validResult.diagnostics));

  const invalidDoc = { permissions: { allow: 'not-an-array' } };
  const invalidResult = model.validateSettingsDocument(invalidDoc);
  assert.equal(invalidResult.ok, false);
  assert.ok(Array.isArray(invalidResult.diagnostics));
  assert.equal(invalidResult.diagnostics.some(d => d.severity === 'error'), true);

  const nonObjectResult = model.validateSettingsDocument('not-an-object');
  assert.equal(nonObjectResult.ok, false);
  assert.ok(Array.isArray(nonObjectResult.diagnostics));
  assert.equal(nonObjectResult.diagnostics.some(d => d.severity === 'error'), true);
});

test('inspectSettings returns diagnostics array directly', () => {
  const doc = { theme: 'invalid-theme' };
  const diagnostics = model.inspectSettings(doc);
  assert.ok(Array.isArray(diagnostics));
  assert.equal(diagnostics.some(d => d.path === 'theme'), true);
});
