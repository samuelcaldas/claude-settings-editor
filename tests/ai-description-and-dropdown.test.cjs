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

test('parseOpenAiChatResponse parses standard JSON, SSE stream, Ollama, Anthropic, and raw text', () => {
  assert.equal(typeof model.parseOpenAiChatResponse, 'function');

  // 1. Standard OpenAI JSON object
  const standardJson = {
    id: 'chatcmpl-123',
    choices: [
      {
        message: {
          role: 'assistant',
          content: 'Fast and reliable model for general coding.'
        }
      }
    ]
  };
  assert.equal(
    model.parseOpenAiChatResponse(standardJson),
    'Fast and reliable model for general coding.'
  );

  // 2. Standard OpenAI JSON string
  assert.equal(
    model.parseOpenAiChatResponse(JSON.stringify(standardJson)),
    'Fast and reliable model for general coding.'
  );

  // 3. SSE Stream lines with delta content
  const sseStream = [
    'data: {"choices":[{"delta":{"content":"High-capacity"}}]}',
    'data: {"choices":[{"delta":{"content":" reasoning"}}]}',
    'data: {"choices":[{"delta":{"content":" model."}}]}',
    'data: [DONE]'
  ].join('\n');
  assert.equal(
    model.parseOpenAiChatResponse(sseStream),
    'High-capacity reasoning model.'
  );

  // 4. SSE Stream with comments, blank lines, and message objects
  const sseStreamWithComments = [
    ': keep-alive',
    '',
    'data: {"choices":[{"message":{"content":"Specialized model for code generation."}}]}',
    '',
    'data: [DONE]'
  ].join('\n');
  assert.equal(
    model.parseOpenAiChatResponse(sseStreamWithComments),
    'Specialized model for code generation.'
  );

  // 5. Ollama response format
  assert.equal(
    model.parseOpenAiChatResponse({ response: 'Compact local model for editing.' }),
    'Compact local model for editing.'
  );

  // 6. Anthropic native content format
  assert.equal(
    model.parseOpenAiChatResponse({ content: [{ type: 'text', text: 'Anthropic reasoning tier.' }] }),
    'Anthropic reasoning tier.'
  );

  // 7. Text field format
  assert.equal(
    model.parseOpenAiChatResponse({ text: 'Fallback direct text field.' }),
    'Fallback direct text field.'
  );

  // 8. Raw text string with quotes or backticks to strip
  assert.equal(
    model.parseOpenAiChatResponse('"Versatile fast assistant."'),
    'Versatile fast assistant.'
  );
  assert.equal(
    model.parseOpenAiChatResponse('`Smart coding companion.`'),
    'Smart coding companion.'
  );

  // 9. Empty or null inputs
  assert.equal(model.parseOpenAiChatResponse(null), '');
  assert.equal(model.parseOpenAiChatResponse(''), '');
  assert.equal(model.parseOpenAiChatResponse({}), '');
});

test('sanitizeModelName trims whitespace and strips bracket annotations', () => {
  assert.equal(typeof model.sanitizeModelName, 'function');

  assert.equal(model.sanitizeModelName('claude-sonnet-4-6[1m]'), 'claude-sonnet-4-6');
  assert.equal(model.sanitizeModelName('gemini-3.7-flash-high[1m]'), 'gemini-3.7-flash-high');
  assert.equal(model.sanitizeModelName('  claude-haiku-4-5-20251001  '), 'claude-haiku-4-5-20251001');
  assert.equal(model.sanitizeModelName(''), '');
  assert.equal(model.sanitizeModelName(null), '');
});

test('resolveGeneratorModel follows exact 6-step precedence', () => {
  assert.equal(typeof model.resolveGeneratorModel, 'function');

  // Step 1: ANTHROPIC_DEFAULT_HAIKU_MODEL takes top priority
  const doc1 = {
    env: {
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'my-custom-haiku[1m]',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'my-custom-sonnet'
    },
    fallbackModel: ['fb-1']
  };
  assert.equal(
    model.resolveGeneratorModel(doc1, 'tier-model', ['api-model-1']),
    'my-custom-haiku'
  );

  // Step 2: Else ANTHROPIC_DEFAULT_SONNET_MODEL
  const doc2 = {
    env: {
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'my-custom-sonnet[1m]'
    },
    fallbackModel: ['fb-1']
  };
  assert.equal(
    model.resolveGeneratorModel(doc2, 'tier-model', ['api-model-1']),
    'my-custom-sonnet'
  );

  // Step 3: Else fallbackModel[0]
  const doc3 = {
    env: {},
    fallbackModel: ['fallback-top[high]', 'fallback-2']
  };
  assert.equal(
    model.resolveGeneratorModel(doc3, 'tier-model', ['api-model-1']),
    'fallback-top'
  );

  // Step 4: Else current tier model ID
  const doc4 = {
    env: {},
    fallbackModel: []
  };
  assert.equal(
    model.resolveGeneratorModel(doc4, 'current-tier-model[1m]', ['api-model-1']),
    'current-tier-model'
  );

  // Step 5: Else discovered availableModels (prefers haiku/flash/mini)
  const doc5 = {
    env: {},
    fallbackModel: []
  };
  assert.equal(
    model.resolveGeneratorModel(doc5, '', ['gpt-4o', 'gemini-2.0-flash', 'other-model']),
    'gemini-2.0-flash'
  );
  assert.equal(
    model.resolveGeneratorModel(doc5, '', ['first-discovered-model', 'second-model']),
    'first-discovered-model'
  );

  // Step 6: Else default canonical haiku
  assert.equal(
    model.resolveGeneratorModel({}, '', []),
    'claude-haiku-4-5-20251001'
  );
});
