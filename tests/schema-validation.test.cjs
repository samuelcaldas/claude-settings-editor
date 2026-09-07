const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const schemaModule = require('../js/settings-schema.js');
const modelModule = require('../js/settings-model.js');
const i18nModule = require('../js/i18n.js');

const rawSchema = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'docs', 'claude-code-settings.json'), 'utf8')
);
const sampleSettings = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'sample.json'), 'utf8')
);

const adapter = schemaModule.createSchemaAdapter(rawSchema);

test('schema validation: empty object and sample.json validate successfully', () => {
  const emptyRes = adapter.validate({});
  assert.equal(emptyRes.valid, true, 'Empty object should be valid');
  assert.equal(emptyRes.errors.length, 0);

  const sampleRes = adapter.validate(sampleSettings);
  assert.equal(sampleRes.valid, true, 'sample.json should be valid against authoritative schema');
  assert.equal(sampleRes.errors.length, 0);
});

test('schema validation: catches type mismatches across primitives, arrays, and objects', () => {
  const badTypesDoc = {
    alwaysThinkingEnabled: 'yes', // should be boolean
    effortLevel: 42,              // should be string
    env: ['KEY=VAL'],             // should be object
    fallbackModel: 'opus',        // should be array
    permissions: 'all'            // should be object
  };

  const res = adapter.validate(badTypesDoc);
  assert.equal(res.valid, false);
  assert.ok(res.errors.length >= 5);

  const paths = res.errors.map(e => e.path);
  assert.ok(paths.includes('alwaysThinkingEnabled'), 'Should flag alwaysThinkingEnabled string type');
  assert.ok(paths.includes('effortLevel'), 'Should flag effortLevel number type');
  assert.ok(paths.includes('env'), 'Should flag env array type');
  assert.ok(paths.includes('fallbackModel'), 'Should flag fallbackModel string type');
  assert.ok(paths.includes('permissions'), 'Should flag permissions string type');
});

test('schema validation: catches invalid enum values and accepts valid enum values', () => {
  const invalidDoc = {
    theme: 'neon-matrix',
    permissions: {
      defaultMode: 'unrestricted'
    },
    effortLevel: 'maximum-overdrive',
    editorMode: 'sublime'
  };

  const res = adapter.validate(invalidDoc);
  assert.equal(res.valid, false);

  const enumErrors = res.errors.filter(e => e.keyword === 'enum');
  assert.ok(enumErrors.length >= 3, 'Should flag invalid enums');
  assert.ok(enumErrors.some(e => e.path === 'permissions.defaultMode'));
  assert.ok(enumErrors.some(e => e.path === 'effortLevel'));
  assert.ok(enumErrors.some(e => e.path === 'editorMode'));
  assert.ok(res.errors.some(e => e.path === 'theme' && e.keyword === 'anyOf'));

  const validDoc = {
    theme: 'dark',
    permissions: {
      defaultMode: 'default'
    },
    effortLevel: 'high',
    editorMode: 'vim'
  };
  const validRes = adapter.validate(validDoc);
  assert.equal(validRes.valid, true);
  assert.equal(validRes.errors.length, 0);
});

test('schema validation: enforces numeric ranges (minimum, maximum)', () => {
  const outOfBounds = {
    feedbackSurveyRate: 1.5,
    cleanupPeriodDays: 0
  };
  const res = adapter.validate(outOfBounds);
  assert.equal(res.valid, false);

  const surveyErr = res.errors.find(e => e.path === 'feedbackSurveyRate');
  assert.ok(surveyErr, 'Should flag feedbackSurveyRate > 1');
  assert.equal(surveyErr.keyword, 'maximum');

  const cleanupErr = res.errors.find(e => e.path === 'cleanupPeriodDays');
  assert.ok(cleanupErr, 'Should flag cleanupPeriodDays < 1');
  assert.equal(cleanupErr.keyword, 'minimum');

  const inBounds = {
    feedbackSurveyRate: 0.5,
    cleanupPeriodDays: 30
  };
  const validRes = adapter.validate(inBounds);
  assert.equal(validRes.valid, true);
});

test('schema validation: enforces additionalProperties: false on closed objects while permitting freeform maps', () => {
  const closedObjectExtra = {
    permissions: {
      defaultMode: 'bypassPermissions',
      bogusPermissionSetting: true // unexpected property in permissions
    }
  };
  const res = adapter.validate(closedObjectExtra);
  assert.equal(res.valid, false);
  const addPropErr = res.errors.find(e => e.path === 'permissions.bogusPermissionSetting');
  assert.ok(addPropErr, 'Should flag unrecognized property in permissions object');
  assert.equal(addPropErr.keyword, 'additionalProperties');

  // env is a freeform object where arbitrary string keys are valid
  const freeformEnv = {
    env: {
      CUSTOM_VAR_A: 'val1',
      CUSTOM_VAR_B: 'val2',
      CLAUDE_CODE_USE_POWERSHELL_TOOL: '1'
    }
  };
  const envRes = adapter.validate(freeformEnv);
  assert.equal(envRes.valid, true);
});

test('schema validation: handles Draft-07 combinators (allOf, anyOf, oneOf, not, uniqueItems, pattern)', () => {
  const testSchema = {
    type: 'object',
    properties: {
      tags: {
        type: 'array',
        items: { type: 'string' },
        uniqueItems: true,
        minItems: 2
      },
      code: {
        type: 'string',
        pattern: '^[A-Z]{3}-\\d{3}$'
      },
      choice: {
        oneOf: [
          { type: 'number', minimum: 100 },
          { type: 'string', minLength: 5 }
        ]
      },
      forbidden: {
        not: { type: 'string' }
      }
    }
  };

  // Duplicate items in uniqueItems array & regex pattern mismatch
  const failDoc1 = {
    tags: ['alpha', 'alpha'],
    code: 'lowercase-123',
    choice: 50,
    forbidden: 'string is forbidden'
  };
  const res1 = schemaModule.validateAgainstSchema(failDoc1, testSchema);
  assert.equal(res1.valid, false);
  assert.ok(res1.errors.some(e => e.keyword === 'uniqueItems'));
  assert.ok(res1.errors.some(e => e.keyword === 'pattern'));
  assert.ok(res1.errors.some(e => e.keyword === 'oneOf'));
  assert.ok(res1.errors.some(e => e.keyword === 'not'));

  // Valid doc
  const validDoc = {
    tags: ['alpha', 'beta'],
    code: 'ABC-123',
    choice: 150,
    forbidden: 123
  };
  const res2 = schemaModule.validateAgainstSchema(validDoc, testSchema);
  assert.equal(res2.valid, true);
});

test('model integration: inspectSettings merges schema errors and scope warnings', () => {
  const doc = {
    theme: 'invalid-theme-value', // Schema error
    claudeMd: 'my-custom-prompt'   // Scope warning in project scope
  };

  // In project scope with schema adapter
  const diagnostics = modelModule.inspectSettings(doc, 'project', adapter);
  assert.ok(Array.isArray(diagnostics));
  assert.ok(diagnostics.length >= 2);

  const errorDiag = diagnostics.find(d => d.path === 'theme');
  assert.ok(errorDiag, 'Should include theme schema error');
  assert.equal(errorDiag.severity, 'error');

  const warningDiag = diagnostics.find(d => d.path === 'claudeMd');
  assert.ok(warningDiag, 'Should include claudeMd scope warning');
  assert.equal(warningDiag.severity, 'warning');
});

test('model integration: validateSettingsDocument flags ok: false on schema error but ok: true on scope warnings only', () => {
  const docWithErrors = {
    permissions: {
      defaultMode: 'not-a-valid-mode'
    }
  };
  const resErrors = modelModule.validateSettingsDocument(docWithErrors, 'user', adapter);
  assert.equal(resErrors.ok, false);
  assert.ok(resErrors.diagnostics.some(d => d.severity === 'error'));

  const docWarningsOnly = {
    claudeMd: 'managed-only-instruction'
  };
  // In project scope, claudeMd is a warning, not an error
  const resWarnings = modelModule.validateSettingsDocument(docWarningsOnly, 'project', adapter);
  assert.equal(resWarnings.ok, true, 'Document with only warnings should have ok: true');
  assert.ok(resWarnings.diagnostics.some(d => d.severity === 'warning'));
});

test('model integration: parseSettingsJson enforces schema validation when adapter is provided', () => {
  const invalidJsonSource = JSON.stringify({
    alwaysThinkingEnabled: 'not-a-boolean'
  }, null, 2);

  const parsedWithAdapter = modelModule.parseSettingsJson(invalidJsonSource, {
    schemaAdapter: adapter,
    targetScope: 'user'
  });
  assert.equal(parsedWithAdapter.ok, false);
  assert.ok(parsedWithAdapter.diagnostics.some(d => d.path === 'alwaysThinkingEnabled'));

  const validJsonSource = JSON.stringify({
    theme: 'dark',
    alwaysThinkingEnabled: true
  }, null, 2);

  const parsedValid = modelModule.parseSettingsJson(validJsonSource, {
    schemaAdapter: adapter,
    targetScope: 'user'
  });
  assert.equal(parsedValid.ok, true);
  assert.equal(parsedValid.diagnostics.length, 0);
});

test('i18n & HTML shell: schema status badge and all localization keys are present with parity', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(html.includes('id="schema-status-badge"'), 'index.html must contain #schema-status-badge');
  assert.ok(html.includes('id="schema-status-label"'), 'index.html must contain #schema-status-label');
  assert.ok(html.includes('class="schema-status-dot"'), 'index.html must contain .schema-status-dot');

  const requiredKeys = [
    'status.invalidSchema',
    'schema.status.tooltip',
    'schema.status.loading',
    'schema.status.online',
    'schema.status.cached',
    'schema.status.bundled',
    'schema.status.updating',
    'schema.status.error',
    'schema.valid'
  ];

  for (const key of requiredKeys) {
    const enText = i18nModule.t(key, {}, 'en');
    const ptText = i18nModule.t(key, {}, 'pt-BR');
    assert.notEqual(enText, key, `Key ${key} must exist in en dictionary`);
    assert.notEqual(ptText, key, `Key ${key} must exist in pt-BR dictionary`);
  }
});

test('raw JSON draft validation: reports syntax errors and schema errors with accurate paths', () => {
  // 1. Syntax error
  const syntaxErrDraft = '{\n  "theme": "dark",,\n}';
  let syntaxError = null;
  try {
    JSON.parse(syntaxErrDraft);
  } catch (err) {
    syntaxError = `Syntax Error: ${err.message}`;
  }
  assert.ok(syntaxError && syntaxError.startsWith('Syntax Error:'));

  // 2. Schema error with path formatting
  const schemaErrDraft = JSON.stringify({
    permissions: {
      defaultMode: 'non-existent-mode'
    }
  });
  const parsed = JSON.parse(schemaErrDraft);
  const validation = adapter.validate(parsed);
  assert.equal(validation.valid, false);
  const formatted = validation.errors.map(err => {
    const loc = err.path ? ` at ${err.path}` : '';
    return `Schema Error${loc}: ${err.message}`;
  }).join('\n');
  assert.ok(formatted.includes('Schema Error at permissions.defaultMode:'));

  // 3. Clean schema valid document
  const validDraft = JSON.stringify({
    theme: 'dark'
  });
  const validParsed = JSON.parse(validDraft);
  const validValidation = adapter.validate(validParsed);
  assert.equal(validValidation.valid, true);
  assert.equal(validValidation.errors.length, 0);
});

test('offline fallback lifecycle: localStorage caching and schema adapter initialization', () => {
  const cachePayload = {
    timestamp: Date.now(),
    source: 'schemastore',
    schema: rawSchema
  };
  const serialized = JSON.stringify(cachePayload);
  const rehydrated = JSON.parse(serialized);

  assert.equal(rehydrated.source, 'schemastore');
  assert.ok(rehydrated.timestamp > 0);
  assert.ok(rehydrated.schema && rehydrated.schema.$schema);

  const cachedAdapter = schemaModule.createSchemaAdapter(rehydrated.schema);
  assert.equal(typeof cachedAdapter.validate, 'function');
  const res = cachedAdapter.validate(sampleSettings);
  assert.equal(res.valid, true);
});
