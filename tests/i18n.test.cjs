const test = require('node:test');
const assert = require('node:assert/strict');
const i18n = require('../js/i18n.js');

test('i18n exports valid API', () => {
  assert.equal(typeof i18n.t, 'function');
  assert.equal(typeof i18n.setLocale, 'function');
  assert.equal(typeof i18n.getLocale, 'function');
  assert.equal(typeof i18n.detectLocale, 'function');
  assert.equal(typeof i18n.normalizeLocale, 'function');
  assert.equal(typeof i18n.subscribe, 'function');
  assert.equal(typeof i18n.applyTranslations, 'function');
  assert.ok(i18n.DICTIONARIES.en);
  assert.ok(i18n.DICTIONARIES['pt-BR']);
});

test('en and pt-BR dictionaries have exact key parity', () => {
  const enKeys = Object.keys(i18n.DICTIONARIES.en).sort();
  const ptKeys = Object.keys(i18n.DICTIONARIES['pt-BR']).sort();

  const missingInPt = enKeys.filter(k => !(k in i18n.DICTIONARIES['pt-BR']));
  const missingInEn = ptKeys.filter(k => !(k in i18n.DICTIONARIES.en));

  assert.deepEqual(missingInPt, [], 'Keys missing in pt-BR: ' + missingInPt.join(', '));
  assert.deepEqual(missingInEn, [], 'Keys missing in en: ' + missingInEn.join(', '));
  assert.equal(enKeys.length, ptKeys.length);
  assert.ok(enKeys.length > 100, 'Expected comprehensive dictionary with >100 keys');
});

test('t() interpolates named parameters correctly', () => {
  i18n.setLocale('en', false);
  const msgEn = i18n.t('diag.title.other', { count: 3, scope: 'PROJECT' });
  assert.equal(msgEn, 'Diagnostics (3 items for PROJECT scope):');

  i18n.setLocale('pt-BR', false);
  const msgPt = i18n.t('diag.title.other', { count: 3, scope: 'PROJECT' });
  assert.equal(msgPt, 'Diagnósticos (3 itens para o escopo PROJECT):');
});

test('t() falls back gracefully for missing keys and unknown locales', () => {
  const missing = i18n.t('non.existent.key', null, 'pt-BR');
  assert.equal(missing, 'non.existent.key');
});

test('normalizeLocale maps Portuguese aliases to pt-BR and others to en', () => {
  assert.equal(i18n.normalizeLocale('pt'), 'pt-BR');
  assert.equal(i18n.normalizeLocale('pt-BR'), 'pt-BR');
  assert.equal(i18n.normalizeLocale('pt-PT'), 'pt-BR');
  assert.equal(i18n.normalizeLocale('portuguese'), 'pt-BR');
  assert.equal(i18n.normalizeLocale('português'), 'pt-BR');
  assert.equal(i18n.normalizeLocale('en'), 'en');
  assert.equal(i18n.normalizeLocale('en-US'), 'en');
  assert.equal(i18n.normalizeLocale('fr'), 'en');
  assert.equal(i18n.normalizeLocale(null), 'en');
});

test('subscribe notifies listeners on locale change', () => {
  let notifiedLocale = '';
  const unsubscribe = i18n.subscribe(loc => {
    notifiedLocale = loc;
  });

  i18n.setLocale('en', false);
  assert.equal(notifiedLocale, 'en');

  i18n.setLocale('pt-BR', false);
  assert.equal(notifiedLocale, 'pt-BR');

  unsubscribe();
  i18n.setLocale('en', false);
  assert.equal(notifiedLocale, 'pt-BR'); // not called after unsubscribe
});
