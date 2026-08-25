/**
 * Claude Settings Editor — Toast Notification Component
 *
 * Lightweight, accessible, zero-dependency stacked toast notification manager.
 * Supports canonical types (success, error, warning, info) with legacy aliases (ok, err, warn).
 * Provides pause-on-hover/focus, live re-translation, FIFO queueing, and safe DOM manipulation.
 */

(function exposeToast(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.Toast = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createToastApi() {
  'use strict';

  const TYPE_MAP = Object.freeze({
    success: 'success',
    ok: 'success',
    error: 'error',
    err: 'error',
    warning: 'warning',
    warn: 'warning',
    info: 'info'
  });

  const DEFAULT_DURATIONS = Object.freeze({
    success: 4000,
    info: 5000,
    warning: 7000,
    error: 8000
  });

  function normalizeType(type) {
    if (!type) return 'info';
    const key = String(type).toLowerCase().trim();
    return TYPE_MAP[key] || 'info';
  }

  function resolveDuration(type, overrideDuration) {
    if (typeof overrideDuration === 'number') {
      return Math.max(0, overrideDuration);
    }
    return DEFAULT_DURATIONS[type] || 5000;
  }

  function createManager(options = {}) {
    const doc = options.document || (typeof document !== 'undefined' ? document : null);
    const container = options.container || (doc ? doc.getElementById('toast-region') : null);
    const maxVisible = typeof options.maxVisible === 'number' ? Math.max(1, options.maxVisible) : 3;
    const translateFn = typeof options.translate === 'function' ? options.translate : null;
    const setTimeoutFn = options.setTimeout || (typeof setTimeout !== 'undefined' ? setTimeout : null);
    const clearTimeoutFn = options.clearTimeout || (typeof clearTimeout !== 'undefined' ? clearTimeout : null);
    const nowFn = options.now || (typeof Date !== 'undefined' ? () => Date.now() : () => 0);

    let nextId = 1;
    const visibleToasts = [];
    const queue = [];

    function translate(key, params, fallback) {
      if (translateFn) {
        try {
          const res = translateFn(key, params);
          if (res && res !== key) return res;
        } catch (_) {}
      }
      return fallback !== undefined ? fallback : key;
    }

    function resolveMessage(item) {
      const { source } = item;
      if (source.isKey || (typeof source.value === 'string' && (source.value.startsWith('status.') || source.value.startsWith('toast.')))) {
        return translate(source.value, source.params, source.value);
      }
      return String(source.value || '');
    }

    function resolveTypeLabel(type) {
      const key = `toast.type.${type}`;
      return translate(key, null, type.toUpperCase());
    }

    function resolveDismissLabel() {
      return translate('toast.dismiss', null, 'Dismiss notification');
    }

    function renderToastElement(item) {
      if (!doc) return null;

      const toast = doc.createElement('article');
      toast.className = `toast toast-${item.type}`;
      toast.setAttribute('data-toast-type', item.type);
      toast.setAttribute('data-toast-id', String(item.id));

      const marker = doc.createElement('span');
      marker.className = 'toast-marker';
      marker.setAttribute('aria-hidden', 'true');

      const content = doc.createElement('div');
      content.className = 'toast-content';

      const typeLabel = doc.createElement('span');
      typeLabel.className = 'toast-type-label';
      typeLabel.textContent = resolveTypeLabel(item.type);

      const msg = doc.createElement('p');
      msg.className = 'toast-message';
      msg.textContent = resolveMessage(item);

      content.appendChild(typeLabel);
      content.appendChild(msg);

      const dismissBtn = doc.createElement('button');
      dismissBtn.className = 'toast-dismiss';
      dismissBtn.type = 'button';
      dismissBtn.setAttribute('aria-label', resolveDismissLabel());
      dismissBtn.title = resolveDismissLabel();

      const dismissIcon = doc.createElement('span');
      dismissIcon.className = 'toast-dismiss-icon';
      dismissIcon.setAttribute('aria-hidden', 'true');
      dismissIcon.textContent = '✕';
      dismissBtn.appendChild(dismissIcon);

      dismissBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dismiss(item.id);
      });

      toast.addEventListener('mouseenter', () => pauseToast(item, 'hover'));
      toast.addEventListener('mouseleave', () => resumeToast(item, 'hover'));
      toast.addEventListener('focusin', () => pauseToast(item, 'focus'));
      toast.addEventListener('focusout', () => resumeToast(item, 'focus'));

      toast.appendChild(marker);
      toast.appendChild(content);
      toast.appendChild(dismissBtn);

      return toast;
    }

    function startTimer(item) {
      if (item.duration <= 0 || !setTimeoutFn) return;
      item.startedAt = nowFn();
      if (item.timerId && clearTimeoutFn) {
        clearTimeoutFn(item.timerId);
      }
      item.timerId = setTimeoutFn(() => {
        dismiss(item.id);
      }, item.remaining);
    }

    function pauseToast(item, reason) {
      if (!item.pauseReasons) item.pauseReasons = new Set();
      const wasRunning = item.pauseReasons.size === 0;
      item.pauseReasons.add(reason);

      if (wasRunning && item.timerId && clearTimeoutFn) {
        clearTimeoutFn(item.timerId);
        item.timerId = null;
        if (item.startedAt > 0) {
          const elapsed = Math.max(0, nowFn() - item.startedAt);
          item.remaining = Math.max(0, item.remaining - elapsed);
        }
      }
    }

    function resumeToast(item, reason) {
      if (!item.pauseReasons) return;
      item.pauseReasons.delete(reason);
      if (item.pauseReasons.size === 0 && item.state === 'visible' && !item.isExiting) {
        startTimer(item);
      }
    }

    function showItem(item) {
      item.state = 'visible';
      item.element = renderToastElement(item);

      if (container && item.element) {
        container.appendChild(item.element);
        // Trigger entrance animation frame
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(() => {
            if (item.element) item.element.classList.add('toast-visible');
          });
        } else {
          item.element.classList.add('toast-visible');
        }
      }

      startTimer(item);
      visibleToasts.push(item);
    }

    function processQueue() {
      while (visibleToasts.length < maxVisible && queue.length > 0) {
        const next = queue.shift();
        showItem(next);
      }
    }

    function notify(msgKeyOrText, opts = {}) {
      const type = normalizeType(opts.type || (typeof opts === 'string' ? opts : 'info'));
      const duration = resolveDuration(type, opts.duration);
      const isKey = Boolean(opts.isKey || (typeof msgKeyOrText === 'string' && (msgKeyOrText.startsWith('status.') || msgKeyOrText.startsWith('toast.') || msgKeyOrText.startsWith('models.'))));

      const item = {
        id: nextId++,
        source: {
          value: msgKeyOrText,
          params: opts.params || null,
          isKey
        },
        type,
        duration,
        remaining: duration,
        createdAt: nowFn(),
        startedAt: 0,
        pauseReasons: new Set(),
        state: 'queued',
        element: null,
        timerId: null,
        isExiting: false
      };

      if (visibleToasts.length < maxVisible) {
        showItem(item);
      } else {
        queue.push(item);
      }

      return item.id;
    }

    function dismiss(id) {
      const idx = visibleToasts.findIndex(t => t.id === id);
      if (idx === -1) {
        // Check in queue
        const qIdx = queue.findIndex(t => t.id === id);
        if (qIdx !== -1) queue.splice(qIdx, 1);
        return;
      }

      const item = visibleToasts[idx];
      if (item.isExiting) return;
      item.isExiting = true;

      if (item.timerId && clearTimeoutFn) {
        clearTimeoutFn(item.timerId);
        item.timerId = null;
      }

      visibleToasts.splice(idx, 1);

      const el = item.element;
      if (el) {
        el.classList.remove('toast-visible');
        el.classList.add('toast-exiting');

        const cleanup = () => {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
          item.element = null;
        };

        // Transitionend listener with safety fallback timeout
        let cleaned = false;
        const onEnd = () => {
          if (cleaned) return;
          cleaned = true;
          cleanup();
        };

        el.addEventListener('transitionend', onEnd, { once: true });
        if (setTimeoutFn) {
          setTimeoutFn(onEnd, 220); // 200ms transition + 20ms margin
        } else {
          cleanup();
        }
      }

      processQueue();
    }

    function dismissAll() {
      queue.length = 0;
      const copy = [...visibleToasts];
      for (const item of copy) {
        dismiss(item.id);
      }
    }

    function refreshTranslations() {
      for (const item of visibleToasts) {
        if (!item.element) continue;
        const typeEl = item.element.querySelector('.toast-type-label');
        if (typeEl) typeEl.textContent = resolveTypeLabel(item.type);

        const msgEl = item.element.querySelector('.toast-message');
        if (msgEl) msgEl.textContent = resolveMessage(item);

        const dismissBtn = item.element.querySelector('.toast-dismiss');
        if (dismissBtn) {
          const label = resolveDismissLabel();
          dismissBtn.setAttribute('aria-label', label);
          dismissBtn.title = label;
        }
      }
    }

    function destroy() {
      dismissAll();
      if (container && container.parentNode) {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      }
    }

    return {
      notify,
      show: notify,
      dismiss,
      dismissAll,
      refreshTranslations,
      destroy,
      getVisibleCount: () => visibleToasts.length,
      getQueuedCount: () => queue.length
    };
  }

  return {
    createManager,
    normalizeType,
    DEFAULT_DURATIONS
  };
});
