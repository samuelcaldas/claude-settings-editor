const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const schemaAdapter = require('../js/settings-schema.js');
const catalog = require('../js/settings-catalog.js');
const model = require('../js/settings-model.js');

const rawSchema = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'docs', 'claude-code-settings.json'), 'utf8')
);
const adapter = schemaAdapter.createSchemaAdapter(rawSchema);
catalog.setSchemaAdapter(adapter);

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('every select element in index.html has unique option values and unique option texts', () => {
  const selectRegex = /<select[^>]*>([\s\S]*?)<\/select>/gi;
  let match;
  let selectCount = 0;

  while ((match = selectRegex.exec(html)) !== null) {
    selectCount++;
    const selectHtml = match[0];
    const idMatch = selectHtml.match(/id="([^"]+)"/);
    const pathMatch = selectHtml.match(/data-setting-path="([^"]+)"/);
    const identifier = (idMatch ? `#${idMatch[1]}` : '') + (pathMatch ? ` [path="${pathMatch[1]}"]` : '') || `select[${selectCount}]`;

    const optRegex = /<option[^>]*>([\s\S]*?)<\/option>/gi;
    let optMatch;
    const values = [];
    const texts = [];

    while ((optMatch = optRegex.exec(selectHtml)) !== null) {
      const fullOpt = optMatch[0];
      const valMatch = fullOpt.match(/value="([^"]*)"/);
      const val = valMatch ? valMatch[1] : '';
      const text = optMatch[1].replace(/<[^>]+>/g, '').trim();

      values.push(val);
      texts.push(text);
    }

    const duplicateValues = values.filter((v, i) => values.indexOf(v) !== i);
    const duplicateTexts = texts.filter((t, i) => texts.indexOf(t) !== i);

    assert.deepEqual(
      duplicateValues,
      [],
      `Select ${identifier} contains duplicate option values: ${duplicateValues.join(', ')}`
    );
    assert.deepEqual(
      duplicateTexts,
      [],
      `Select ${identifier} contains duplicate option text labels: ${duplicateTexts.join(', ')}`
    );
  }

  assert.ok(selectCount >= 15, `Expected at least 15 select elements, found ${selectCount}`);
});

test('index.html contains zero duplicate data-setting-path attributes', () => {
  const settingRegex = /data-setting-path="([^"]+)"/g;
  let match;
  const paths = [];

  while ((match = settingRegex.exec(html)) !== null) {
    paths.push(match[1]);
  }

  const duplicates = paths.filter((p, i) => paths.indexOf(p) !== i);
  assert.deepEqual(
    duplicates,
    [],
    `Found duplicate data-setting-path attributes in index.html: ${duplicates.join(', ')}`
  );
});

test('permissions tab contains single canonical skipDangerousModePermissionPrompt setting without redundant nested duplicate', () => {
  assert.ok(
    html.includes('data-setting-path="skipDangerousModePermissionPrompt"'),
    'index.html must include top-level skipDangerousModePermissionPrompt checkbox'
  );
  assert.ok(
    !html.includes('data-setting-path="permissions.skipDangerousModePermissionPrompt"'),
    'index.html must NOT include invalid duplicate permissions.skipDangerousModePermissionPrompt'
  );
  assert.ok(
    !html.includes('id="permissions_skipDangerousModePermissionPrompt"'),
    'index.html must NOT contain permissions_skipDangerousModePermissionPrompt element ID'
  );
});

test('presentation catalog contains no duplicate or schema-invalid alias keys', () => {
  assert.ok(
    'skipDangerousModePermissionPrompt' in catalog.PRESENTATION_CATALOG,
    'Catalog must contain skipDangerousModePermissionPrompt'
  );
  assert.ok(
    !('permissions.skipDangerousModePermissionPrompt' in catalog.PRESENTATION_CATALOG),
    'Catalog must not contain duplicate permissions.skipDangerousModePermissionPrompt'
  );
  assert.ok(
    !('permissions.allowManagedPermissionRulesOnly' in catalog.PRESENTATION_CATALOG),
    'Catalog must not contain invalid duplicate permissions.allowManagedPermissionRulesOnly'
  );
  assert.ok(
    !('disableBypassPermissionsMode' in catalog.PRESENTATION_CATALOG),
    'Catalog must not contain invalid duplicate disableBypassPermissionsMode'
  );
});

test('model discovery parser deduplicates models across all endpoint formats', () => {
  const duplicateJson = {
    data: [
      { id: 'claude-3-7-sonnet-20250219' },
      { id: 'claude-3-7-sonnet-20250219' },
      { id: 'gpt-4o' },
      { id: 'gpt-4o' }
    ]
  };

  const parsed = model.parseOpenAiModelsResponse(duplicateJson);
  assert.deepEqual(parsed, ['claude-3-7-sonnet-20250219', 'gpt-4o']);

  const arrayPayload = ['model-a', 'model-b', 'model-a', 'model-c', 'model-b'];
  const parsedArray = model.parseOpenAiModelsResponse(arrayPayload);
  assert.deepEqual(parsedArray, ['model-a', 'model-b', 'model-c']);
});
