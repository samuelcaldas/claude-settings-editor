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

test('models screen mobile UI adheres to Impeccable touch targets and responsive adaptations', () => {
  // 44x44px touch target floor
  assert.ok(css.includes('.btn-ai-generate { min-height: 44px'), 'AI generate button must have 44px touch target on coarse pointer');
  assert.ok(css.includes('.model-dropdown-item { min-height: 44px'), 'Model dropdown items must have 44px touch target');
  assert.ok(css.includes('#status { display: none; }'), 'Header status must be hidden on mobile to prevent squishing header actions');

  // Mobile layout adaptations
  assert.ok(css.includes('.model-override-item {'), 'Must style model override item for mobile');
  assert.ok(css.includes('grid-template-areas:'), 'Must use grid template areas for mobile override item');
  assert.ok(css.includes('#tab-models .input-wrap'), 'Must stack input wraps vertically on mobile models screen');
  assert.ok(css.includes('.field-group-checkbox'), 'Must stack checkbox groups cleanly without horizontal clipping');

  // Custom model dropdown uses fixed positioning with touch scrolling
  assert.ok(css.includes('.model-dropdown-menu {'), 'Must style model dropdown menu');
  assert.ok(css.includes('position: fixed;'), 'Model dropdown menu must use fixed positioning');
  assert.ok(css.includes('-webkit-overflow-scrolling: touch;'), 'Model dropdown menu must enable smooth touch scrolling');

  // Mobile responsiveness for model tier cards & grid containment
  assert.ok(css.includes('grid-template-columns: minmax(0, 1fr)'), 'Mobile grid-2 must use minmax(0, 1fr) to prevent overflow');
  assert.ok(css.includes('.feature-canonical-path'), 'Must style feature-canonical-path');
  assert.ok(css.includes('overflow-wrap: anywhere'), 'Canonical path must wrap anywhere on mobile');
  assert.ok(css.includes('.model-tier-card'), 'Must style model-tier-card');
  assert.ok(css.includes('display: none;'), 'Feature tooltip popover must have display: none when inactive to avoid off-screen overflow');
});

