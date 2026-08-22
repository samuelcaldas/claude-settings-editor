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
    this.body = new FakeElement('body');
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
  let timerSeq = 1;
  const activeTimers = new Map();

  const mockNow = () => currentTime;
  const mockSetTimeout = (fn, ms) => {
    const id = timerSeq++;
    activeTimers.set(id, { fn, triggerAt: currentTime + ms });
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

  const id1 = manager.notify('Message 1', { type: 'info', duration: 4000 });
  const id2 = manager.notify('Message 2', { type: 'info', duration: 4000 });
  const id3 = manager.notify('Message 3', { type: 'info', duration: 4000 });
  const id4 = manager.notify('Message 4', { type: 'info', duration: 4000 });
  const id5 = manager.notify('Message 5', { type: 'info', duration: 4000 });

  assert.equal(manager.getVisibleCount(), 3);
  assert.equal(manager.getQueuedCount(), 2);
  assert.equal(container.children.length, 3);

  // Dismiss first toast manually
  manager.dismiss(id1);
  clock.advance(220); // fire exit-animation cleanup timeout

  assert.equal(manager.getVisibleCount(), 3); // id4 promoted
  assert.equal(manager.getQueuedCount(), 1); // id5 remaining in queue

  const msgs = container.children.map(c => c.querySelector('.toast-message').textContent);
  assert.deepEqual(msgs, ['Message 2', 'Message 3', 'Message 4']);

  // Dismiss all
  manager.dismissAll();
  assert.equal(manager.getVisibleCount(), 0);
  assert.equal(manager.getQueuedCount(), 0);
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

  manager.notify('Auto dismiss toast', { type: 'success', duration: 4000 });
  assert.equal(manager.getVisibleCount(), 1);
  const toastEl = container.children[0];

  // Advance 2000ms (half duration)
  clock.advance(2000);
  assert.equal(manager.getVisibleCount(), 1);

  // Hover pauses
  toastEl.dispatchEvent({ type: 'mouseenter' });

  // Advance 5000ms while paused
  clock.advance(5000);
  assert.equal(manager.getVisibleCount(), 1); // Still visible

  // Also focusin (multiple pause reasons)
  toastEl.dispatchEvent({ type: 'focusin' });

  // Mouseleave (focus still active)
  toastEl.dispatchEvent({ type: 'mouseleave' });
  clock.advance(3000);
  assert.equal(manager.getVisibleCount(), 1); // Still visible because focus is retained

  // Focusout (all pause reasons cleared, resumes remaining ~2000ms)
  toastEl.dispatchEvent({ type: 'focusout' });

  // Advance 1000ms (1000ms left)
  clock.advance(1000);
  assert.equal(manager.getVisibleCount(), 1);

  // Advance remaining 1000ms + margin
  clock.advance(1100);
  assert.equal(manager.getVisibleCount(), 0);
});

test('Toast updates translations when locale changes', () => {
  const doc = new FakeDocument();
  const container = doc.createElement('section');
  doc.toastRegion = container;

  let currentLang = 'en';
  const translations = {
    en: {
      'status.fileLoaded': 'Loaded {name}',
      'toast.type.success': 'SUCCESS',
      'toast.dismiss': 'Dismiss notification'
    },
    'pt-BR': {
      'status.fileLoaded': 'Carregado {name}',
      'toast.type.success': 'SUCESSO',
      'toast.dismiss': 'Dispensar notificação'
    }
  };

  const translate = (key, params) => {
    let str = translations[currentLang][key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{${k}}`, v);
      }
    }
    return str;
  };

  const clock = setupMockClock();
  const manager = Toast.createManager({
    document: doc,
    container,
    translate,
    setTimeout: clock.mockSetTimeout,
    clearTimeout: clock.mockClearTimeout,
    now: clock.mockNow
  });

  manager.notify('status.fileLoaded', { type: 'success', params: { name: 'config.json' } });

  const toastEl = container.children[0];
  const msgEl = toastEl.querySelector('.toast-message');
  const typeEl = toastEl.querySelector('.toast-type-label');
  const dismissBtn = toastEl.querySelector('.toast-dismiss');

  assert.equal(msgEl.textContent, 'Loaded config.json');
  assert.equal(typeEl.textContent, 'SUCCESS');
  assert.equal(dismissBtn.getAttribute('aria-label'), 'Dismiss notification');

  // Switch locale
  currentLang = 'pt-BR';
  manager.refreshTranslations();

  assert.equal(msgEl.textContent, 'Carregado config.json');
  assert.equal(typeEl.textContent, 'SUCESSO');
  assert.equal(dismissBtn.getAttribute('aria-label'), 'Dispensar notificação');
});
