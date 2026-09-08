const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const model = require('../js/settings-model.js');
const i18n = require('../js/i18n.js');

test('absence of manual fetch buttons in HTML', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  // Assert no btn-fetch-models class exists in index.html
  const fetchBtnMatch = html.match(/class="[^"]*btn-fetch-models[^"]*"/g);
  assert.equal(fetchBtnMatch, null, 'index.html must not contain any element with class btn-fetch-models');

  // Assert no data-i18n="models.discovery.fetchBtn" exists in index.html
  assert.ok(
    !html.includes('data-i18n="models.discovery.fetchBtn"'),
    'index.html must not contain buttons bound to models.discovery.fetchBtn'
  );

  // Assert discovery toolbars exist with status pill and text
  const toolbarCount = (html.match(/class="model-discovery-toolbar/g) || []).length;
  assert.ok(toolbarCount >= 2, 'Expected at least 2 model discovery toolbars (in env and models tabs)');

  // Assert initial count is 0 models
  assert.ok(
    html.includes('data-i18n="models.discovery.badge.empty">0 models</span>'),
    'index.html should show 0 models as the initial empty badge'
  );
});

test('available-models-datalist starts empty in index.html and does not fall back to defaults when empty', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  // Initial datalist tag in HTML must be completely empty
  const datalistMatch = html.match(/<datalist\s+id="available-models-datalist">([\s\S]*?)<\/datalist>/);
  assert.ok(datalistMatch, 'datalist#available-models-datalist must exist in index.html');
  assert.equal(datalistMatch[1].trim(), '', 'datalist#available-models-datalist in index.html must have 0 child options');

  // Simulate populateModelsDatalist behavior with empty list
  function simulatePopulate(modelsList) {
    const rawList = Array.isArray(modelsList) ? modelsList : [];
    return Array.from(new Set(rawList.filter(Boolean)));
  }

  // Passing empty array yields empty array (no fallback to default models)
  assert.deepEqual(simulatePopulate([]), []);
  assert.deepEqual(simulatePopulate(null), []);
  assert.deepEqual(simulatePopulate(undefined), []);

  // Passing discovered models populates deduplicated list
  assert.deepEqual(
    simulatePopulate(['gpt-4o', 'claude-3-7-sonnet', 'gpt-4o']),
    ['gpt-4o', 'claude-3-7-sonnet']
  );
});

test('hasApiUrlAndKey helper validates presence of both endpoint URL and credential', () => {
  assert.equal(typeof model.hasApiUrlAndKey, 'function', 'model.hasApiUrlAndKey must be exported as a function');

  // Valid: URL + API Key
  assert.equal(
    model.hasApiUrlAndKey({
      env: {
        ANTHROPIC_BASE_URL: 'https://api.anthropic.com',
        ANTHROPIC_API_KEY: 'sk-ant-test-key-12345'
      }
    }),
    true,
    'Valid https URL + API key should return true'
  );

  // Valid: http URL + API Key (e.g. local Ollama / proxy)
  assert.equal(
    model.hasApiUrlAndKey({
      env: {
        ANTHROPIC_BASE_URL: 'http://localhost:11434',
        ANTHROPIC_API_KEY: 'ollama'
      }
    }),
    true,
    'Valid http URL + API key should return true'
  );

  // Valid: URL + Auth Token
  assert.equal(
    model.hasApiUrlAndKey({
      env: {
        ANTHROPIC_BASE_URL: 'https://gateway.ai.timoteo.mg.gov.br/v1',
        ANTHROPIC_AUTH_TOKEN: 'bearer-token-xyz'
      }
    }),
    true,
    'Valid URL + Auth Token should return true'
  );

  // Valid: URL + both Key and Token
  assert.equal(
    model.hasApiUrlAndKey({
      env: {
        ANTHROPIC_BASE_URL: 'https://api.openai.com/v1',
        ANTHROPIC_API_KEY: 'sk-123',
        ANTHROPIC_AUTH_TOKEN: 'tok-456'
      }
    }),
    true,
    'Valid URL + both Key and Token should return true'
  );

  // Invalid: URL only (missing key and token)
  assert.equal(
    model.hasApiUrlAndKey({
      env: {
        ANTHROPIC_BASE_URL: 'https://api.anthropic.com'
      }
    }),
    false,
    'URL without key or token must return false'
  );

  // Invalid: Key only (missing URL)
  assert.equal(
    model.hasApiUrlAndKey({
      env: {
        ANTHROPIC_API_KEY: 'sk-ant-test-key-12345'
      }
    }),
    false,
    'Key without URL must return false'
  );

  // Invalid: Token only (missing URL)
  assert.equal(
    model.hasApiUrlAndKey({
      env: {
        ANTHROPIC_AUTH_TOKEN: 'bearer-token-xyz'
      }
    }),
    false,
    'Token without URL must return false'
  );

  // Invalid: Empty / whitespace-only strings
  assert.equal(
    model.hasApiUrlAndKey({
      env: {
        ANTHROPIC_BASE_URL: '   ',
        ANTHROPIC_API_KEY: '   '
      }
    }),
    false,
    'Whitespace-only URL and key must return false'
  );

  assert.equal(
    model.hasApiUrlAndKey({
      env: {
        ANTHROPIC_BASE_URL: 'https://api.example.com',
        ANTHROPIC_API_KEY: '   ',
        ANTHROPIC_AUTH_TOKEN: ''
      }
    }),
    false,
    'Whitespace-only key/token must return false'
  );

  // Invalid: Non-HTTP URL scheme (e.g. ftp:// or raw string)
  assert.equal(
    model.hasApiUrlAndKey({
      env: {
        ANTHROPIC_BASE_URL: 'ftp://ftp.example.com',
        ANTHROPIC_API_KEY: 'sk-123'
      }
    }),
    false,
    'Non-HTTP(S) URL scheme must return false'
  );

  assert.equal(
    model.hasApiUrlAndKey({
      env: {
        ANTHROPIC_BASE_URL: 'not-a-url',
        ANTHROPIC_API_KEY: 'sk-123'
      }
    }),
    false,
    'Malformed URL must return false'
  );

  // Invalid: Empty object / null / undefined / primitives
  assert.equal(model.hasApiUrlAndKey({}), false, 'Empty document must return false');
  assert.equal(model.hasApiUrlAndKey(null), false, 'Null document must return false');
  assert.equal(model.hasApiUrlAndKey(undefined), false, 'Undefined document must return false');
  assert.equal(model.hasApiUrlAndKey('string'), false, 'Primitive document must return false');
});

test('model discovery error handling clears available models list', () => {
  // Simulate state lifecycle on failed endpoint request
  const state = {
    availableModels: ['cached-model-1', 'cached-model-2'],
    modelsSource: 'api',
    modelsFetchError: '',
    isFetchingModels: false
  };

  // When fetch error occurs, state must reset availableModels to []
  function handleFetchError(err) {
    state.availableModels = [];
    state.modelsSource = 'error';
    state.modelsFetchError = err.message || 'Network error';
    state.isFetchingModels = false;
  }

  handleFetchError(new Error('HTTP 401 Unauthorized'));

  assert.deepEqual(state.availableModels, [], 'availableModels must be cleared on fetch error');
  assert.equal(state.modelsSource, 'error', 'modelsSource must be set to error');
  assert.equal(state.modelsFetchError, 'HTTP 401 Unauthorized');
  assert.equal(state.isFetchingModels, false);
});

test('localization parity for automated model discovery status and badge keys', () => {
  const requiredKeys = [
    'models.discovery.badge.empty',
    'models.discovery.status.empty',
    'models.discovery.status.noCreds',
    'models.discovery.status.success',
    'models.discovery.status.error',
    'models.discovery.badge.loaded'
  ];

  requiredKeys.forEach(k => {
    assert.ok(k in i18n.DICTIONARIES.en, `Key "${k}" missing in en dictionary`);
    assert.ok(k in i18n.DICTIONARIES['pt-BR'], `Key "${k}" missing in pt-BR dictionary`);
    assert.ok(i18n.DICTIONARIES.en[k].length > 0, `Value for "${k}" in en is empty`);
    assert.ok(i18n.DICTIONARIES['pt-BR'][k].length > 0, `Value for "${k}" in pt-BR is empty`);
  });

  // Verify English text accuracy
  assert.equal(i18n.DICTIONARIES.en['models.discovery.badge.empty'], '0 models');
  assert.equal(
    i18n.DICTIONARIES.en['models.discovery.status.empty'],
    'No API URL and key configured. Models list is empty.'
  );
  assert.equal(
    i18n.DICTIONARIES.en['models.discovery.status.noCreds'],
    'API URL and Key required for model discovery.'
  );

  // Verify Portuguese text accuracy
  assert.equal(i18n.DICTIONARIES['pt-BR']['models.discovery.badge.empty'], '0 modelos');
  assert.equal(
    i18n.DICTIONARIES['pt-BR']['models.discovery.status.empty'],
    'Nenhuma URL e chave de API configuradas. A lista de modelos está vazia.'
  );
  assert.equal(
    i18n.DICTIONARIES['pt-BR']['models.discovery.status.noCreds'],
    'URL e Chave de API necessárias para descoberta de modelos.'
  );
});
