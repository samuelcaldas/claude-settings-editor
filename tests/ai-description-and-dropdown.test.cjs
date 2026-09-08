const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const model = require('../js/settings-model.js');
const i18n = require('../js/i18n.js');

test('HTML structure: 5 model description fields are wrapped in ai-input-wrap with btn-ai-generate', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  const expectedPaths = [
    'env.ANTHROPIC_DEFAULT_FABLE_MODEL_DESCRIPTION',
    'env.ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION',
    'env.ANTHROPIC_DEFAULT_SONNET_MODEL_DESCRIPTION',
    'env.ANTHROPIC_DEFAULT_HAIKU_MODEL_DESCRIPTION',
    'env.ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION'
  ];

  for (const p of expectedPaths) {
    assert.ok(
      html.includes(`data-target-path="${p}"`),
      `index.html must have a .btn-ai-generate with data-target-path="${p}"`
    );
  }

  const aiWrapCount = (html.match(/class="ai-input-wrap"/g) || []).length;
  assert.equal(aiWrapCount, 5, 'Must have exactly 5 .ai-input-wrap elements');

  const btnAiCount = (html.match(/class="btn-ai-generate"/g) || []).length;
  assert.equal(btnAiCount, 5, 'Must have exactly 5 .btn-ai-generate buttons');
});

test('Model ID inputs do not use native datalist to allow complete unfiltered custom dropdown', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  const modelInputIds = [
    'env_ANTHROPIC_DEFAULT_FABLE_MODEL',
    'env_ANTHROPIC_DEFAULT_OPUS_MODEL',
    'env_ANTHROPIC_DEFAULT_SONNET_MODEL',
    'env_ANTHROPIC_DEFAULT_HAIKU_MODEL',
    'env_ANTHROPIC_CUSTOM_MODEL_OPTION',
    'env_CLAUDE_CODE_SUBAGENT_MODEL',
    'new-override-target',
    'model',
    'advisorModel',
    'new-model-input'
  ];

  for (const id of modelInputIds) {
    const inputRegex = new RegExp(`<input[^>]*id="${id}"[^>]*>`, 'g');
    const match = html.match(inputRegex);
    assert.ok(match, `input#${id} must exist in index.html`);
    assert.ok(
      !match[0].includes('list='),
      `input#${id} must not have list attribute (should use custom unfiltered dropdown)`
    );
  }
});

test('buildOpenAiChatCompletionsUrl normalizes base URLs correctly', () => {
  assert.equal(typeof model.buildOpenAiChatCompletionsUrl, 'function');

  // Empty or invalid
  assert.equal(model.buildOpenAiChatCompletionsUrl(''), '');
  assert.equal(model.buildOpenAiChatCompletionsUrl(null), '');
  assert.equal(model.buildOpenAiChatCompletionsUrl('not-a-url'), '');

  // Base without /v1
  assert.equal(
    model.buildOpenAiChatCompletionsUrl('https://api.openai.com'),
    'https://api.openai.com/v1/chat/completions'
  );
  assert.equal(
    model.buildOpenAiChatCompletionsUrl('https://api.openai.com/'),
    'https://api.openai.com/v1/chat/completions'
  );

  // Base with /v1
  assert.equal(
    model.buildOpenAiChatCompletionsUrl('https://api.openai.com/v1'),
    'https://api.openai.com/v1/chat/completions'
  );
  assert.equal(
    model.buildOpenAiChatCompletionsUrl('https://api.openai.com/v1/'),
    'https://api.openai.com/v1/chat/completions'
  );

  // Base ending with /models
  assert.equal(
    model.buildOpenAiChatCompletionsUrl('https://api.openai.com/v1/models'),
    'https://api.openai.com/v1/chat/completions'
  );

  // Base already ending with /chat/completions
  assert.equal(
    model.buildOpenAiChatCompletionsUrl('https://api.openai.com/v1/chat/completions'),
    'https://api.openai.com/v1/chat/completions'
  );
});

test('createDescriptionPrompt returns structured messages and limits', () => {
  assert.equal(typeof model.createDescriptionPrompt, 'function');

  const prompt = model.createDescriptionPrompt('sonnet', 'claude-sonnet-5', 'Claude Sonnet 5');
  assert.ok(Array.isArray(prompt.messages));
  assert.equal(prompt.messages.length, 2);
  assert.equal(prompt.messages[0].role, 'system');
  assert.equal(prompt.messages[1].role, 'user');
  assert.ok(prompt.messages[1].content.includes('claude-sonnet-5'));
  assert.ok(prompt.messages[1].content.includes('Claude Sonnet 5'));
  assert.ok(prompt.messages[1].content.includes('sonnet'));
  assert.equal(prompt.max_tokens, 60);
  assert.equal(prompt.temperature, 0.3);
});

test('Localization parity for AI description generator keys', () => {
  const enKeys = [
    'models.ai.generateBtn',
    'models.ai.generateTitle',
    'models.ai.generating',
    'models.ai.success',
    'models.ai.error',
    'models.ai.noModel',
    'models.ai.noApi'
  ];

  for (const k of enKeys) {
    const enVal = i18n.t(k, {}, 'en');
    const ptVal = i18n.t(k, {}, 'pt-BR');

    assert.ok(enVal && enVal !== k, `Translation key ${k} must exist in EN`);
    assert.ok(ptVal && ptVal !== k, `Translation key ${k} must exist in pt-BR`);
  }
});
