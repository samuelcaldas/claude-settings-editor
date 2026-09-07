const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const model = require('../js/settings-model.js');
const catalog = require('../js/settings-catalog.js');
const schemaAdapter = require('../js/settings-schema.js');
const i18n = require('../js/i18n.js');

const rawSchema = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'docs', 'claude-code-settings.json'), 'utf8')
);
const adapter = schemaAdapter.createSchemaAdapter(rawSchema);
catalog.setSchemaAdapter(adapter);

test('modelOverrides catalog definition uses model-overrides editor and valid scopes', () => {
  const def = catalog.getSettingDefinition('modelOverrides');
  assert.ok(def, 'modelOverrides definition must exist in catalog');
  assert.equal(def.category, 'models');
  assert.equal(def.editorId, 'model-overrides');
  assert.deepEqual(def.scopes, ['user', 'project', 'local', 'managed']);
});

test('getCanonicalAnthropicModels returns curated canonical Anthropic model identifiers', () => {
  assert.equal(typeof model.getCanonicalAnthropicModels, 'function');
  const canonical = model.getCanonicalAnthropicModels();
  assert.ok(Array.isArray(canonical));
  assert.ok(canonical.length >= 8);
  assert.ok(canonical.includes('claude-fable-5'));
  assert.ok(canonical.includes('claude-opus-5'));
  assert.ok(canonical.includes('claude-sonnet-5'));
  assert.ok(canonical.includes('claude-haiku-4-5-20251001'));
  assert.ok(canonical.includes('claude-3-7-sonnet-20250219'));
});

test('model layer operations: setAtPath, deleteAtPath, and renameKeyAtPath with array segments', () => {
  let doc = {};

  // Setting mapping with dots in key (e.g. claude-3.7-sonnet or custom.model.id)
  doc = model.setAtPath(doc, ['modelOverrides', 'claude-3.7-sonnet'], 'arn:aws:bedrock:us-east-1:123:custom-sonnet');
  assert.equal(doc.modelOverrides['claude-3.7-sonnet'], 'arn:aws:bedrock:us-east-1:123:custom-sonnet');
  // Ensure it did not create nested object for .7 or .sonnet
  assert.equal(typeof doc.modelOverrides['claude-3.7-sonnet'], 'string');
  assert.equal(doc.modelOverrides['claude-3'], undefined);

  // Setting another standard model mapping
  doc = model.setAtPath(doc, ['modelOverrides', 'claude-opus-5'], 'arn:aws:bedrock:us-east-1:123:custom-opus');
  assert.equal(doc.modelOverrides['claude-opus-5'], 'arn:aws:bedrock:us-east-1:123:custom-opus');

  // Renaming a key via renameKeyAtPath
  doc = model.renameKeyAtPath(doc, 'modelOverrides', 'claude-opus-5', 'claude-opus-4-6');
  assert.equal(doc.modelOverrides['claude-opus-5'], undefined);
  assert.equal(doc.modelOverrides['claude-opus-4-6'], 'arn:aws:bedrock:us-east-1:123:custom-opus');

  // Deleting mapping via deleteAtPath
  doc = model.deleteAtPath(doc, ['modelOverrides', 'claude-3.7-sonnet']);
  assert.equal(doc.modelOverrides['claude-3.7-sonnet'], undefined);
  assert.equal(doc.modelOverrides['claude-opus-4-6'], 'arn:aws:bedrock:us-east-1:123:custom-opus');

  // Deleting the entire modelOverrides dictionary
  doc = model.deleteAtPath(doc, 'modelOverrides');
  assert.equal(doc.modelOverrides, undefined);
});

test('schema validation: modelOverrides string mappings pass, non-string mappings fail', () => {
  const validDoc = {
    modelOverrides: {
      'claude-sonnet-5': 'arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0',
      'claude-haiku-4-5-20251001': 'arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-3-5-haiku-20241022-v1:0'
    }
  };
  const validRes = adapter.validate(validDoc);
  assert.equal(validRes.valid, true);

  const invalidDoc = {
    modelOverrides: {
      'claude-sonnet-5': 12345 // Must be string
    }
  };
  const invalidRes = adapter.validate(invalidDoc);
  assert.equal(invalidRes.valid, false);
  assert.ok(invalidRes.errors.length > 0);
  assert.ok(invalidRes.errors.some(e => e.path.includes('modelOverrides')));
});

test('side-by-side coexistence: env.ANTHROPIC_DEFAULT_* and modelOverrides operate independently', () => {
  let doc = {
    env: {
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'gemini-3.7-flash-high[1m]',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'gemini-3.7-flash-medium[1m]'
    },
    modelOverrides: {
      'claude-sonnet-5': 'arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0'
    }
  };

  // Validates cleanly against schema
  const validation = adapter.validate(doc);
  assert.equal(validation.valid, true);

  // Updating gateway tier does not mutate modelOverrides
  doc = model.setAtPath(doc, 'env.ANTHROPIC_DEFAULT_OPUS_MODEL', 'gpt-5.6-sol[1m]');
  assert.equal(doc.env.ANTHROPIC_DEFAULT_OPUS_MODEL, 'gpt-5.6-sol[1m]');
  assert.equal(doc.modelOverrides['claude-sonnet-5'], 'arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0');

  // Updating modelOverrides does not mutate gateway env vars
  doc = model.setAtPath(doc, ['modelOverrides', 'claude-opus-5'], 'arn:aws:bedrock:us-east-1:123456789012:opus-arn');
  assert.equal(doc.modelOverrides['claude-opus-5'], 'arn:aws:bedrock:us-east-1:123456789012:opus-arn');
  assert.equal(doc.env.ANTHROPIC_DEFAULT_OPUS_MODEL, 'gpt-5.6-sol[1m]');
  assert.equal(doc.env.ANTHROPIC_DEFAULT_SONNET_MODEL, 'gemini-3.7-flash-medium[1m]');

  // Roundtrips cleanly through serialize / parse
  const serialized = model.serializeSettings(doc);
  const parsed = model.parseSettingsJson(serialized, { schemaAdapter: adapter });
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.value.modelOverrides, doc.modelOverrides);
  assert.deepEqual(parsed.value.env, doc.env);
});

test('preservation of custom and unknown model keys through serialize and parse cycles', () => {
  const customDoc = {
    modelOverrides: {
      'custom-finetuned-claude-v1': 'my-cloud-provider-model-endpoint',
      'org.internal.model-router.v2': 'http://internal.gateway:8080/v1'
    }
  };

  const validation = adapter.validate(customDoc);
  assert.equal(validation.valid, true, 'Schema should allow arbitrary string keys in modelOverrides');

  const jsonStr = model.serializeSettings(customDoc);
  const parsed = model.parseSettingsJson(jsonStr, { schemaAdapter: adapter });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.modelOverrides['custom-finetuned-claude-v1'], 'my-cloud-provider-model-endpoint');
  assert.equal(parsed.value.modelOverrides['org.internal.model-router.v2'], 'http://internal.gateway:8080/v1');
});

test('localization parity for all model override and refined tier keys', () => {
  const keysToCheck = [
    'sections.models.tiers.title',
    'sections.models.tiers.desc',
    'sections.models.overrides.title',
    'sections.models.overrides.desc',
    'models.overrides.presets',
    'models.overrides.presetBedrock',
    'models.overrides.sourcePlaceholder',
    'models.overrides.targetPlaceholder',
    'models.overrides.add',
    'models.overrides.empty',
    'models.overrides.notObject',
    'models.overrides.duplicateKey',
    'models.overrides.invalidKey',
    'models.overrides.invalidValue'
  ];

  keysToCheck.forEach(key => {
    assert.ok(i18n.DICTIONARIES.en[key], `Key "${key}" must exist in English dictionary`);
    assert.ok(i18n.DICTIONARIES['pt-BR'][key], `Key "${key}" must exist in Portuguese dictionary`);
  });
});

test('index.html contains expected model overrides markup and datalist', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.ok(html.includes('id="canonical-anthropic-models-datalist"'), 'Must include canonical models datalist');
  assert.ok(html.includes('id="model-overrides-list"'), 'Must include model-overrides-list container');
  assert.ok(html.includes('id="new-override-source"'), 'Must include new-override-source input');
  assert.ok(html.includes('id="new-override-target"'), 'Must include new-override-target input');
  assert.ok(html.includes('id="btn-add-model-override"'), 'Must include add override button');
  assert.ok(html.includes('id="btn-preset-bedrock"'), 'Must include bedrock preset button');
  assert.ok(html.includes('id="btn-unset-model-overrides"'), 'Must include unset model overrides button');
  assert.ok(html.includes('Gateway Model Tiers &amp; Family Aliases (env.ANTHROPIC_DEFAULT_*)'), 'Must include refined section heading');
});
