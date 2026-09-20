const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const scriptPath = path.resolve(__dirname, '..', 'claude-settings.sh');

test('claude-settings.sh --help outputs usage information', () => {
  const result = execFileSync(scriptPath, ['--help'], { encoding: 'utf8' });
  assert.match(result, /Claude Code Settings Editor/i);
  assert.match(result, /USAGE/);
  assert.match(result, /SCOPES/);
  assert.match(result, /COMMANDS/);
});

test('claude-settings.sh --version outputs version 1.0.0', () => {
  const result = execFileSync(scriptPath, ['--version'], { encoding: 'utf8' });
  assert.match(result, /^claude-settings 1\.0\.0/);
});

test('claude-settings.sh defaults to show in non-interactive environment without crashing', () => {
  const result = spawnSync(scriptPath, [], {
    encoding: 'utf8',
    env: { ...process.env, TERM: 'dumb' }
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Scope: user/);
  assert.match(result.stdout, /"cleanupPeriodDays":/);
});

test('claude-settings.sh tui fails gracefully with actionable message when no TTY is available', () => {
  const result = spawnSync(scriptPath, ['tui'], {
    encoding: 'utf8',
    env: { ...process.env, TERM: 'dumb' }
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /TUI mode requires an interactive terminal/);
});

test('claude-settings.sh list --json outputs a valid JSON array with catalog settings', () => {
  const result = execFileSync(scriptPath, ['list', '--json'], { encoding: 'utf8' });
  const catalog = JSON.parse(result);
  assert.ok(Array.isArray(catalog));
  assert.ok(catalog.length > 20);
  const theme = catalog.find(item => item.path === 'theme');
  assert.ok(theme);
  assert.equal(theme.type, 'string');
  assert.equal(theme.category, 'general');
});

test('claude-settings.sh list --category permissions filters settings', () => {
  const result = execFileSync(scriptPath, ['list', '--category', 'permissions'], { encoding: 'utf8' });
  assert.match(result, /━━ permissions ━━/);
  assert.match(result, /permissions\.defaultMode/);
});

test('claude-settings.sh env list displays environment variables safely', () => {
  const result = execFileSync(scriptPath, ['env', 'list'], { encoding: 'utf8' });
  assert.match(result, /Environment variables/);
  assert.match(result, /ANTHROPIC_BASE_URL/);
});

test('claude-settings.sh validate succeeds on valid settings', () => {
  const result = spawnSync(scriptPath, ['validate'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  const combined = result.stdout + result.stderr;
  assert.match(combined, /Settings valid/);
});
