const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const model = require('../js/settings-model.js');
const i18n = require('../js/i18n.js');

test('inspectSettings emits warning when fallbackModel exceeds 3 items', () => {
  const docValid = {
    fallbackModel: ['model-1', 'model-2', 'model-3']
  };
  const diagValid = model.inspectSettings(docValid);
  assert.equal(
    diagValid.some(d => d.path === 'fallbackModel' && d.severity === 'warning'),
    false,
    '3 or fewer fallback models must not produce a cap warning'
  );

  const docOverCap = {
    fallbackModel: ['model-1', 'model-2', 'model-3', 'model-4']
  };
  const diagOverCap = model.inspectSettings(docOverCap);
  const capWarning = diagOverCap.find(
    d => d.path === 'fallbackModel' && d.severity === 'warning'
  );
  assert.ok(capWarning, 'Over-cap fallbackModel must emit a warning diagnostic');
  assert.equal(
    capWarning.message,
    'fallbackModel accepts a maximum of 3 models; additional entries are ignored.'
  );
});

test('serializeSettings truncates fallbackModel to at most 3 items', () => {
  const docOverCap = {
    fallbackModel: ['m1', 'm2', 'm3', 'm4', 'm5'],
    theme: 'dark'
  };

  const serialized = model.serializeSettings(docOverCap);
  const parsed = JSON.parse(serialized);

  assert.equal(parsed.fallbackModel.length, 3);
  assert.deepEqual(parsed.fallbackModel, ['m1', 'm2', 'm3']);
  assert.equal(parsed.theme, 'dark');

  // Input with <= 3 models is preserved exactly
  const docValid = {
    fallbackModel: ['m1', 'm2']
  };
  const parsedValid = JSON.parse(model.serializeSettings(docValid));
  assert.deepEqual(parsedValid.fallbackModel, ['m1', 'm2']);
});

test('HTML shell contains fallback list, input, and add button with localization attributes', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.ok(html.includes('id="fallback-list"'), 'HTML must contain #fallback-list container');
  assert.ok(html.includes('id="new-model-input"'), 'HTML must contain #new-model-input');
  assert.ok(html.includes('id="btn-add-fallback"'), 'HTML must contain #btn-add-fallback');
  assert.ok(
    html.includes('data-i18n-placeholder="fallback.placeholder"'),
    'new-model-input must have data-i18n-placeholder="fallback.placeholder"'
  );
  assert.ok(
    html.includes('data-i18n="fallback.add"'),
    'btn-add-fallback must have data-i18n="fallback.add"'
  );
});

test('app.js integrates fallback models dropdown, slot badges, and 3-item cap guards', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

  // Renders slot badges
  assert.ok(
    appJs.includes('fallback-slot-badge'),
    'app.js must use fallback-slot-badge for #1, #2, #3 items'
  );

  // Fallback model inputs have data-setting-path and class for model dropdown recognition
  assert.ok(
    appJs.includes("`fallbackModel.${idx}`"),
    'app.js must attach data-setting-path with fallbackModel index'
  );
  assert.ok(
    appJs.includes('fallback-model-input'),
    'app.js must add fallback-model-input class'
  );

  // Disables add button and input when at maximum 3 models
  assert.ok(
    appJs.includes('isMax = count >= 3') || appJs.includes('count >= 3'),
    'app.js must check 3-model cap in renderFallbackModels'
  );
  assert.ok(
    appJs.includes('addBtn.disabled = isMax'),
    'app.js must disable add button when capped'
  );

  // Guards addFallbackModel from exceeding 3 models
  assert.ok(
    appJs.includes('current.length >= 3'),
    'addFallbackModel must guard against adding more than 3 models'
  );

  // Model dropdown recognition in isModelInput
  assert.ok(
    appJs.includes("path.startsWith('fallbackModel')"),
    'isModelInput must recognize fallbackModel path'
  );
  assert.ok(
    appJs.includes("id === 'new-model-input'"),
    'isModelInput must recognize new-model-input'
  );
  assert.ok(
    appJs.includes("classList.contains('fallback-model-input')"),
    'isModelInput must recognize fallback-model-input class'
  );
});

test('Localization parity for fallback model keys', () => {
  const fallbackKeys = [
    'fallback.placeholder',
    'fallback.add',
    'fallback.notArray',
    'fallback.empty',
    'fallback.capReached',
    'fallback.capBadge',
    'fallback.slot'
  ];

  for (const k of fallbackKeys) {
    const enVal = i18n.t(k, { count: 2, slot: 1 }, 'en');
    const ptVal = i18n.t(k, { count: 2, slot: 1 }, 'pt-BR');

    assert.ok(enVal && enVal !== k, `Key ${k} must exist and translate in EN`);
    assert.ok(ptVal && ptVal !== k, `Key ${k} must exist and translate in pt-BR`);
  }
});
