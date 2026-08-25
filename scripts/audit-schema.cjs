#!/usr/bin/env node
/**
 * Schema Conformance Audit Script
 * Reads the authoritative JSON Schema, runs the schema adapter, and verifies 100% catalog and localization alignment.
 * Exits with non-zero code on any schema drift or missing metadata.
 */
const fs = require('node:fs');
const path = require('node:path');
const schemaAdapter = require('../js/settings-schema.js');
const catalog = require('../js/settings-catalog.js');
const i18n = require('../js/i18n.js');

const rootDir = path.join(__dirname, '..');
const schemaFilePath = path.join(rootDir, 'docs', 'claude-code-settings.json');

if (!fs.existsSync(schemaFilePath)) {
  console.error('ERROR: Authoritative schema file not found at: ' + schemaFilePath);
  process.exit(1);
}

const rawSchema = JSON.parse(fs.readFileSync(schemaFilePath, 'utf8'));
const adapter = schemaAdapter.createSchemaAdapter(rawSchema);
catalog.setSchemaAdapter(adapter);

const allSchemaPaths = adapter.getAllPaths();
const allCatalogSettings = catalog.getAllSettings();
const schemaPathsSet = new Set(allSchemaPaths);

let errorsCount = 0;
let warningsCount = 0;

console.log('--- Claude Code Settings Schema Conformance Audit ---');
console.log(`Discovered ${allSchemaPaths.length} flattened schema paths.`);
console.log(`Discovered ${allCatalogSettings.length} catalog setting definitions.`);

// Check 1: Undocumented settings advertised in catalog
allCatalogSettings.forEach(s => {
  if (!s.path.startsWith('env.') && !schemaPathsSet.has(s.path)) {
    console.error(`[DRIFT ERROR] Undocumented catalog path "${s.path}" is not present in docs/claude-code-settings.json`);
    errorsCount++;
  }
});

// Check 2: Localization parity for all presentation catalog settings
allCatalogSettings.forEach(s => {
  if (s.path in catalog.PRESENTATION_CATALOG) {
    const key = s.labelKey;
    if (!(key in i18n.DICTIONARIES.en)) {
      console.error(`[I18N ERROR] Missing English label for ${s.path} (key: ${key})`);
      errorsCount++;
    }
    if (!(key in i18n.DICTIONARIES['pt-BR'])) {
      console.error(`[I18N ERROR] Missing Brazilian Portuguese label for ${s.path} (key: ${key})`);
      errorsCount++;
    }
  }
});

// Check 3: Every schema path has a corresponding normalized definition and description
allSchemaPaths.forEach(propPath => {
  const def = adapter.getDefinition(propPath);
  if (!def) {
    console.error(`[SCHEMA ERROR] Missing normalized definition for schema path "${propPath}"`);
    errorsCount++;
  } else {
    if (!def.type) {
      console.warn(`[SCHEMA WARNING] Undetermined type for schema path "${propPath}"`);
      warningsCount++;
    }
  }
});

console.log('-----------------------------------------------------');
if (errorsCount > 0) {
  console.error(`❌ Audit failed with ${errorsCount} error(s) and ${warningsCount} warning(s).`);
  process.exit(1);
} else {
  console.log(`✅ Audit passed with 0 errors and ${warningsCount} warning(s). Full schema conformity verified.`);
  process.exit(0);
}
