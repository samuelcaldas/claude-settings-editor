const test = require('node:test');
const assert = require('node:assert/strict');
const Toast = require('../js/toast.js');

// Minimal Fake DOM Implementation for deterministic Node testing
class FakeClassList {
  constructor() {
    this.classes = new Set();
  }

  add(...tokens) {
    for (const t of tokens) {
      if (t) this.classes.add(String(t));
    }
  }

  remove(...tokens) {
    for (const t of tokens) {
      this.classes.delete(String(t));
    }
  }

  contains(token) {
    return this.classes.has(String(token));
  }

  has(token) {
    return this.contains(token);
  }

  toggle(token, force) {
    if (force === true) {
      this.add(token);
      return true;
    } else if (force === false) {
      this.remove(token);
      return false;
    }
    if (this.contains(token)) {
      this.remove(token);
      return false;
    } else {
      this.add(token);
      return true;
    }
  }

  toString() {
    return Array.from(this.classes).join(' ');
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = String(tagName).toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.classList = new FakeClassList();
    this.attributes = new Map();
    this.listeners = new Map();
    this._textContent = '';
    this.type = '';
    this.title = '';
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(val) {
    this._textContent = String(val);
  }

  get className() {
    return this.classList.toString();
  }

  set className(val) {
    this.classList.classes = new Set(String(val || '').split(/\s+/).filter(Boolean));
  }

  setAttribute(k, v) {
    this.attributes.set(k, String(v));
  }

  getAttribute(k) {
    return this.attributes.get(k) || null;
  }

  removeAttribute(k) {
    this.attributes.delete(k);
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  get firstChild() {
    return this.children[0] || null;
  }

  addEventListener(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
  }

  dispatchEvent(event) {
    const list = this.listeners.get(event.type) || [];
    for (const h of list) {
      h(event);
    }
  }

  querySelector(selector) {
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      for (const c of this.children) {
        if (c.classList && c.classList.has(cls)) return c;
        const found = c.querySelector(selector);
        if (found) return found;
      }
    }
    return null;
  }

  querySelectorAll(selector) {
    const results = [];
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      for (const c of this.children) {
        if (c.classList && c.classList.has(cls)) results.push(c);
        results.push(...c.querySelectorAll(selector));
      }
    }
    return results;
  }
}

class FakeDocument {
  constructor() {
    this.toastRegion = null;
  }

  createElement(tag) {
    return new FakeElement(tag);
  }

  getElementById(id) {
    if (id === 'toast-region') return this.toastRegion;
    return null;
  }
}

function setupMockClock() {
  let currentTime = 1000;
  let timerCounter = 1;
  const activeTimers = new Map();

  const mockNow = () => currentTime;
  const mockSetTimeout = (fn, delay) => {
    const id = timerCounter++;
    activeTimers.set(id, { fn, triggerAt: currentTime + delay });
    return id;
  };
  const mockClearTimeout = (id) => {
    activeTimers.delete(id);
  };
  const advance = (ms) => {
    currentTime += ms;
    const due = [];
    for (const [id, timer] of activeTimers.entries()) {
      if (timer.triggerAt <= currentTime) {
        due.push({ id, fn: timer.fn });
      }
    }
    for (const item of due) {
      activeTimers.delete(item.id);
      item.fn();
    }
  };

  return { mockNow, mockSetTimeout, mockClearTimeout, advance, getActiveCount: () => activeTimers.size };
}

test('Toast module exports valid API and normalizes types', () => {
  assert.equal(typeof Toast.createManager, 'function');
  assert.equal(typeof Toast.normalizeType, 'function');

  assert.equal(Toast.normalizeType('ok'), 'success');
  assert.equal(Toast.normalizeType('success'), 'success');
  assert.equal(Toast.normalizeType('err'), 'error');
  assert.equal(Toast.normalizeType('error'), 'error');
  assert.equal(Toast.normalizeType('warn'), 'warning');
  assert.equal(Toast.normalizeType('warning'), 'warning');
  assert.equal(Toast.normalizeType('info'), 'info');
  assert.equal(Toast.normalizeType(null), 'info');
  assert.equal(Toast.normalizeType('unknown-type'), 'info');
});

test('Toast manager provides show alias compatible with notify', () => {
  const doc = new FakeDocument();
  const container = doc.createElement('section');
  doc.toastRegion = container;

  const clock = setupMockClock();
  const manager = Toast.createManager({
    document: doc,
    container,
    setTimeout: clock.mockSetTimeout,
    clearTimeout: clock.mockClearTimeout,
    now: clock.mockNow
  });

  assert.equal(typeof manager.show, 'function');
  assert.equal(typeof manager.notify, 'function');

  const id = manager.show('models.discovery.status.noCreds', { type: 'warning' });
  assert.ok(id);
  assert.equal(manager.getVisibleCount(), 1);
});

test('Toast renders safely without innerHTML and mounts DOM nodes', () => {
  const doc = new FakeDocument();
  const container = doc.createElement('section');
  doc.toastRegion = container;

  const clock = setupMockClock();
  const manager = Toast.createManager({
    document: doc,
    container,
    setTimeout: clock.mockSetTimeout,
    clearTimeout: clock.mockClearTimeout,
    now: clock.mockNow
  });

  const malicious = '<img src="x" onerror="alert(1)"> & "hello"';
  const id = manager.notify(malicious, { type: 'success' });

  assert.equal(manager.getVisibleCount(), 1);
  assert.equal(container.children.length, 1);

  const toastEl = container.children[0];
  assert.equal(toastEl.getAttribute('data-toast-type'), 'success');
  assert.equal(toastEl.getAttribute('data-toast-id'), String(id));

  const msgEl = toastEl.querySelector('.toast-message');
  assert.ok(msgEl);
  assert.equal(msgEl.textContent, malicious); // textContent keeps it as inert plain text

  const typeLabel = toastEl.querySelector('.toast-type-label');
  assert.ok(typeLabel);
  assert.equal(typeLabel.textContent, 'SUCCESS');
});

test('Toast manages maximum visible limit and FIFO queue promotion', () => {
  const doc = new FakeDocument();
  const container = doc.createElement('section');
  doc.toastRegion = container;

  const clock = setupMockClock();
  const manager = Toast.createManager({
    document: doc,
    container,
    maxVisible: 3,
    setTimeout: clock.mockSetTimeout,
    clearTimeout: clock.mockClearTimeout,
    now: clock.mockNow
  });

  const id1 = manager.notify('Toast 1');
  manager.notify('Toast 2');
  manager.notify('Toast 3');
  manager.notify('Toast 4'); // queued
  manager.notify('Toast 5'); // queued

  assert.equal(manager.getVisibleCount(), 3);
  assert.equal(manager.getQueuedCount(), 2);
  assert.equal(container.children.length, 3);

  // Explicitly dismiss one toast to promote next from FIFO queue
  manager.dismiss(id1);
  assert.equal(manager.getVisibleCount(), 3);
  assert.equal(manager.getQueuedCount(), 1);
});

test('Toast handles timer auto-dismiss and pause/resume on hover/focus', () => {
  const doc = new FakeDocument();
  const container = doc.createElement('section');
  doc.toastRegion = container;

  const clock = setupMockClock();
  const manager = Toast.createManager({
    document: doc,
    container,
    setTimeout: clock.mockSetTimeout,
    clearTimeout: clock.mockClearTimeout,
    now: clock.mockNow
  });

  const id = manager.notify('Hover test', { duration: 4000 });
  assert.equal(manager.getVisibleCount(), 1);

  // Advance 2s (2s remaining)
  clock.advance(2000);

  const toastEl = container.children[0];
  toastEl.dispatchEvent({ type: 'mouseenter' }); // pause

  // Advance 10s while hovered
  clock.advance(10000);
  assert.equal(manager.getVisibleCount(), 1); // should still be visible

  toastEl.dispatchEvent({ type: 'mouseleave' }); // resume

  // Advance 1.5s (0.5s remaining)
  clock.advance(1500);
  assert.equal(manager.getVisibleCount(), 1);

  // Advance final 600ms (exceeding remaining 2s)
  clock.advance(600);
  assert.equal(manager.getVisibleCount(), 0);
});

test('Toast updates translations when locale changes', () => {
  const doc = new FakeDocument();
  const container = doc.createElement('section');
  doc.toastRegion = container;

  let currentLang = 'en';
  const translations = {
    en: { 'status.saved': 'Settings saved successfully', 'toast.type.success': 'SUCCESS', 'toast.dismiss': 'Dismiss' },
    'pt-BR': { 'status.saved': 'Configurações salvas com sucesso', 'toast.type.success': 'SUCESSO', 'toast.dismiss': 'Dispensar' }
  };

  const manager = Toast.createManager({
    document: doc,
    container,
    translate: (key) => (translations[currentLang] && translations[currentLang][key]) || key
  });

  manager.notify('status.saved', { type: 'success' });
  const toastEl = container.children[0];

  assert.equal(toastEl.querySelector('.toast-message').textContent, 'Settings saved successfully');
  assert.equal(toastEl.querySelector('.toast-type-label').textContent, 'SUCCESS');

  // Switch locale
  currentLang = 'pt-BR';
  manager.refreshTranslations();

  assert.equal(toastEl.querySelector('.toast-message').textContent, 'Configurações salvas com sucesso');
  assert.equal(toastEl.querySelector('.toast-type-label').textContent, 'SUCESSO');
});
