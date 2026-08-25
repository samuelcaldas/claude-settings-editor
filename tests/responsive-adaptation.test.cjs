/**
 * 9x16 Desktop and Mobile View Adaptation Tests
 * Tests layout responsiveness, touch targets, container wrapping, and overflow safety for narrow/vertical viewports.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'app.css'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('app.css defines responsive breakpoints and touch adaptation for mobile and portrait', () => {
  assert.ok(css.includes('@media (max-width: 768px)'), 'Must include 768px mobile breakpoint');
  assert.ok(css.includes('@media (pointer: coarse)'), 'Must include coarse pointer touch target rules');
  assert.ok(css.includes('--nav-h-mobile'), 'Must define mobile navigation height token');
  assert.ok(css.includes('--topbar-h-mobile'), 'Must define mobile topbar height token');
  assert.ok(css.includes('min-height: 44px'), 'Must enforce 44px touch target minimum');
});

test('vertical 9x16 viewport layout tokens preserve scrolling and prevent horizontal clipping', () => {
  assert.ok(css.includes('overflow-y: auto'), 'Content area must have independent vertical scroll');
  assert.ok(css.includes('overflow-x: auto'), 'Mobile nav viewport must enable horizontal pan');
  assert.ok(css.includes('grid-template-columns: 1fr'), 'Mobile/portrait grid must collapse to single column');
});

test('feature header popover supports responsive boundaries and accessible tooltips', () => {
  assert.ok(css.includes('.field-help-btn'), 'Must define accessible help button');
  assert.ok(css.includes('.feature-tooltip-popover'), 'Must define popover tooltip');
  assert.ok(css.includes('max-width: 320px'), 'Tooltip popover must have max-width constraint');
});
