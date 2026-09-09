(function exposeEnvVarHelp(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.EnvVarHelp = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createEnvVarHelp() {
  'use strict';
  const SOURCE_HOSTS = new Set(['code.claude.com', 'gist.githubusercontent.com', 'json.schemastore.org', 'www.schemastore.org', 'schemastore.org']);

  /** Accept only HTTPS links to reviewed documentation hosts. */
  function safeSource(url) {
    if (typeof url !== 'string' || !url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' && !parsed.username && !parsed.password && SOURCE_HOSTS.has(parsed.hostname);
    } catch (error) {
      if (error instanceof TypeError) return false;
      throw error;
    }
  }

  /** Render plain-text metadata and user-activated provenance links, never setting values. */
  function render(container, metadata, translate, scope) {
    container.replaceChildren();
    if (!metadata) return appendText(container, translate('env.help.custom'));
    appendText(container, translate(`env.status.${metadata.documentationStatus}`), 'env-source-status');
    appendText(container, translate('env.help.sourceDescription') + ':');
    appendText(container, metadata.description);
    appendText(container, translate(`env.applicability.${metadata.applicability}`));
    appendCautions(container, metadata, translate, scope);
    appendSource(container, metadata.descriptionSourceUrl, translate('env.help.source'));
    if (metadata.sourceUrl !== metadata.descriptionSourceUrl) appendSource(container, metadata.sourceUrl, translate('env.help.provenance'));
  }

  function appendCautions(container, metadata, translate, scope) {
    if (metadata.sourceVersion) appendText(container, translate('env.help.observed', { version: metadata.sourceVersion }));
    if (metadata.minVersion) appendText(container, translate('env.help.minimum', { version: metadata.minVersion }));
    if (metadata.restartRequired) appendText(container, translate('env.help.restart'));
    if (metadata.ignoredScopes.includes(scope)) appendText(container, translate('env.help.ignoredScope'), 'env-caution');
    if (metadata.sensitive) appendText(container, translate('env.help.sensitive'), 'env-caution');
    if (metadata.guidanceKey) appendText(container, translate(metadata.guidanceKey), 'env-caution');
    if (metadata.values.length) appendText(container, translate('env.help.values', { values: metadata.values.join(', ') }));
  }

  function appendText(container, text, className = '') {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    paragraph.className = className;
    container.appendChild(paragraph);
  }

  function appendSource(container, url, label) {
    if (!safeSource(url)) return;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = label;
    container.appendChild(link);
  }

  return { render, safeSource };
});
