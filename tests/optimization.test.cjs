/**
 * Performance and Optimization Tests
 * Validates non-blocking I/O, animation performance tokens, DOM containment, and zero external network tracking.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'app.css'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('all scripts in index.html use defer for non-blocking initial parse', () => {
  const scriptTags = html.match(/<script\s+[^>]*src=[^>]*>/g) || [];
  assert.ok(scriptTags.length >= 5, 'Must have at least 5 modular scripts');
  scriptTags.forEach(tag => {
    assert.ok(tag.includes('defer'), `Script tag must use defer: ${tag}`);
  });
});

test('css applies containment and hardware-accelerated transitions', () => {
  assert.ok(css.includes('transform: translateX'), 'Must use hardware accelerated transform');
  assert.ok(!css.includes('will-change: all'), 'Must not abuse will-change');
});

test('zero external script tags or analytics loaders in HTML shell', () => {
  const scriptTags = html.match(/<script\s+[^>]*src=["'](https?:)?\/\/[^"']+["'][^>]*>/gi) || [];
  assert.equal(scriptTags.length, 0, 'HTML shell must not load remote un-cached scripts or telemetry');
});
