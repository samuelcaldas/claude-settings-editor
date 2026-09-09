const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const catalog = require('../js/env-var-catalog.js');
const model = require('../js/settings-model.js');

const rawSchema = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'docs', 'claude-code-settings.json'), 'utf8')
);

test('EnvVarCatalog exports expected API and immutable constants', () => {
  assert.ok(catalog);
  assert.equal(typeof catalog.resolveAll, 'function');
  assert.equal(typeof catalog.resolve, 'function');
  assert.equal(typeof catalog.suggest, 'function');
  assert.ok(Array.isArray(catalog.ENTRIES));
  assert.ok(catalog.OFFICIAL_SOURCE.startsWith('https://code.claude.com/'));
  assert.ok(catalog.SETTINGS_SOURCE.startsWith('https://code.claude.com/'));
  assert.ok(catalog.SCHEMA_SOURCE.startsWith('https://json.schemastore.org/'));
  assert.ok(catalog.GIST_SOURCE.startsWith('https://gist.githubusercontent.com/'));
  assert.equal(typeof catalog.REVIEWED_AT, 'string');
});

test('resolveAll merges schema, fallback dictionary, and curated catalog with full fidelity', () => {
  const fallback = {
    CUSTOM_FALLBACK_VAR: 'Legacy description for testing',
    ANTHROPIC_API_KEY: 'Legacy Anthropic key description'
  };

  const all = catalog.resolveAll(rawSchema, fallback);
  assert.ok(Array.isArray(all));
  assert.ok(all.length >= 340, `Expected at least 340 entries, got ${all.length}`);

  // Test alphabetical ordering
  for (let i = 1; i < all.length; i++) {
    assert.ok(
      all[i - 1].name < all[i].name,
      `Entries must be sorted alphabetically: ${all[i - 1].name} before ${all[i].name}`
    );
  }

  // Fallback entry preserved when absent from schema
  const custom = all.find(e => e.name === 'CUSTOM_FALLBACK_VAR');
  assert.ok(custom, 'CUSTOM_FALLBACK_VAR must be preserved in resolved list');
  assert.equal(custom.description, 'Legacy description for testing');
  assert.equal(custom.documentationStatus, 'unclassified');

  // Curated official entries absent from schema properties are included
  const newOfficial = all.find(e => e.name === 'ANTHROPIC_DEFAULT_MODEL');
  assert.ok(newOfficial, 'ANTHROPIC_DEFAULT_MODEL must be resolved');
  assert.equal(newOfficial.documentationStatus, 'official');
  assert.equal(newOfficial.minVersion, '2.1.236');
});

test('resolveAll handles null/empty/partial schema without losing fallback entries', () => {
  const fallback = {
    VAR_ONE: 'Description one',
    VAR_TWO: 'Description two'
  };

  const emptySchemaAll = catalog.resolveAll({}, fallback);
  assert.ok(emptySchemaAll.some(e => e.name === 'VAR_ONE'));
  assert.ok(emptySchemaAll.some(e => e.name === 'VAR_TWO'));
  assert.ok(emptySchemaAll.some(e => e.name === 'ANTHROPIC_DEFAULT_MODEL'));

  const nullSchemaAll = catalog.resolveAll(null, fallback);
  assert.ok(nullSchemaAll.some(e => e.name === 'VAR_ONE'));
});

test('resolve returns detailed metadata for official, unofficial, and unclassified keys', () => {
  // Official curated
  const cacheTtl = catalog.resolve('CLAUDE_CODE_PROMPT_CACHE_TTL', rawSchema);
  assert.ok(cacheTtl);
  assert.equal(cacheTtl.name, 'CLAUDE_CODE_PROMPT_CACHE_TTL');
  assert.equal(cacheTtl.documentationStatus, 'official');
  assert.equal(cacheTtl.category, 'performance');
  assert.equal(cacheTtl.minVersion, '2.1.242');
  assert.deepEqual(cacheTtl.values, ['5m', '1h']);
  assert.equal(cacheTtl.guidanceKey, 'env.guidance.cacheCost');

  // Unofficial curated
  const pwsh = catalog.resolve('CLAUDE_CODE_PWSH_PARSE_TIMEOUT_MS', rawSchema);
  assert.ok(pwsh);
  assert.equal(pwsh.documentationStatus, 'unofficial');
  assert.equal(pwsh.category, 'tools');
  assert.equal(pwsh.applicability, 'unknown');
  assert.equal(pwsh.sourceVersion, '2.1.202');
  assert.equal(pwsh.guidanceKey, 'env.guidance.pwsh');

  // Unclassified from schema
  const schemaOnly = catalog.resolve('CLOUD_ML_REGION', rawSchema);
  assert.ok(schemaOnly);
  assert.equal(schemaOnly.documentationStatus, 'unclassified');
  assert.equal(schemaOnly.schemaPresent, true);

  // Unknown key returns null
  assert.equal(catalog.resolve('COMPLETELY_NONEXISTENT_VAR', rawSchema), null);
  assert.equal(catalog.resolve('', rawSchema), null);
  assert.equal(catalog.resolve(null, rawSchema), null);
});

test('suggest filters by category, query, scope, and opt-in unofficial toggle', () => {
  const entries = catalog.resolveAll(rawSchema, {});

  // 1. Default suggestion excludes unofficial and unclassified
  const defaults = catalog.suggest(entries, {});
  assert.ok(defaults.length > 0);
  assert.ok(defaults.every(e => e.documentationStatus === 'official'));
  assert.ok(!defaults.some(e => e.documentationStatus === 'unofficial'));
  assert.ok(!defaults.some(e => e.documentationStatus === 'unclassified'));

  // 2. Opt-in unofficial toggle includes unofficial
  const withUnofficial = catalog.suggest(entries, { includeUnofficial: true });
  assert.ok(withUnofficial.some(e => e.name === 'CLAUDE_CODE_PWSH_PARSE_TIMEOUT_MS'));
  assert.ok(withUnofficial.some(e => e.name === 'CLAUDE_CODE_SLOW_OPERATION_THRESHOLD_MS'));

  // 3. Launch-only and runtime-ignored entries are never suggested
  assert.ok(!defaults.some(e => e.name === 'CLAUDE_CODE_REMOTE'));
  assert.ok(!defaults.some(e => e.name === 'CLAUDE_CODE_PROJECT_DIR_NAME'));
  assert.ok(!defaults.some(e => e.name === 'CLAUDE_CODE_ACCOUNT_UUID'));

  // 4. Dedicated UI fields are excluded from suggestions
  assert.ok(!defaults.some(e => e.name === 'ANTHROPIC_API_KEY'));
  assert.ok(!defaults.some(e => e.name === 'ANTHROPIC_BASE_URL'));
  assert.ok(!defaults.some(e => e.name === 'ANTHROPIC_AUTH_TOKEN'));
  assert.ok(!defaults.some(e => e.name === 'CLAUDE_CODE_USE_POWERSHELL_TOOL'));
  assert.ok(!defaults.some(e => e.name === 'CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY'));

  // 5. Native setting duplicates are excluded from suggestions
  assert.ok(!defaults.some(e => e.name === 'ANTHROPIC_MODEL'));
  assert.ok(!defaults.some(e => e.name === 'CLAUDE_CODE_EFFORT_LEVEL'));
  assert.ok(!defaults.some(e => e.name === 'CLAUDE_CODE_DISABLE_FAST_MODE'));

  // 6. Category filtering
  const perfSuggestions = catalog.suggest(entries, { category: 'performance' });
  assert.ok(perfSuggestions.length > 0);
  assert.ok(perfSuggestions.every(e => e.category === 'performance'));
  assert.ok(perfSuggestions.some(e => e.name === 'CLAUDE_CODE_PROMPT_CACHE_TTL'));
  assert.ok(!perfSuggestions.some(e => e.name === 'ANTHROPIC_DEFAULT_MODEL'));

  // 7. Query filtering (case-insensitive substring on name and description)
  const querySuggestions = catalog.suggest(entries, { query: 'prompt_cache' });
  assert.ok(querySuggestions.some(e => e.name === 'CLAUDE_CODE_PROMPT_CACHE_TTL'));
  assert.ok(querySuggestions.length >= 1);

  const queryDesc = catalog.suggest(entries, { query: 'WebFetch' });
  assert.ok(queryDesc.some(e => e.name === 'CLAUDE_CODE_WEBFETCH_CACHE_TTL_MS'));

  // 8. Scope-aware filtering: CLAUDE_CONFIG_DIR ignored in project and local
  const userScope = catalog.suggest(entries, { scope: 'user' });
  assert.ok(userScope.some(e => e.name === 'CLAUDE_CONFIG_DIR'));

  const projectScope = catalog.suggest(entries, { scope: 'project' });
  assert.ok(!projectScope.some(e => e.name === 'CLAUDE_CONFIG_DIR'));

  const localScope = catalog.suggest(entries, { scope: 'local' });
  assert.ok(!localScope.some(e => e.name === 'CLAUDE_CONFIG_DIR'));

  // 9. Managed scope filtering: managed variables only suggested in managed scope
  assert.ok(!userScope.some(e => e.category === 'managed'));
  assert.ok(!projectScope.some(e => e.category === 'managed'));
  const managedScope = catalog.suggest(entries, { scope: 'managed' });
  assert.ok(managedScope.some(e => e.category === 'managed'));
});

test('settings-model exports getClaudeEnvVarMetadata and getSuggestedClaudeEnvVars', () => {
  assert.equal(typeof model.getClaudeEnvVarMetadata, 'function');
  assert.equal(typeof model.getSuggestedClaudeEnvVars, 'function');

  const meta = model.getClaudeEnvVarMetadata('ANTHROPIC_DEFAULT_MODEL', rawSchema);
  assert.ok(meta);
  assert.equal(meta.name, 'ANTHROPIC_DEFAULT_MODEL');
  assert.equal(meta.documentationStatus, 'official');

  const suggested = model.getSuggestedClaudeEnvVars(rawSchema, { category: 'telemetry' });
  assert.ok(Array.isArray(suggested));
  assert.ok(suggested.every(e => e.category === 'telemetry'));
});
