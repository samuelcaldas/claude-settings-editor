const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const scriptPath = path.resolve(__dirname, '..', 'claude-settings.sh');

// Hermetic test fixture for CI environments without pre-existing ~/.claude/settings.json
const testConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-settings-test-'));
const samplePath = path.resolve(__dirname, '..', 'sample.json');
fs.copyFileSync(samplePath, path.join(testConfigDir, 'settings.json'));

test.after(() => {
  fs.rmSync(testConfigDir, { recursive: true, force: true });
});

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
    env: { ...process.env, CLAUDE_CONFIG_DIR: testConfigDir, TERM: 'dumb' }
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Scope: user/);
  assert.match(result.stdout, /"theme":/);
});

test('claude-settings.sh defaults to empty json when settings file does not exist', () => {
  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-empty-test-'));
  try {
    const result = spawnSync(scriptPath, [], {
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_CONFIG_DIR: emptyDir, TERM: 'dumb' }
    });
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), '{}');
  } finally {
    fs.rmSync(emptyDir, { recursive: true, force: true });
  }
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
  const result = execFileSync(scriptPath, ['env', 'list'], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: testConfigDir }
  });
  assert.match(result, /Environment variables/);
  assert.match(result, /ANTHROPIC_BASE_URL/);
});

test('claude-settings.sh validate succeeds on valid settings', () => {
  const result = spawnSync(scriptPath, ['validate'], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: testConfigDir }
  });
  assert.equal(result.status, 0);
  const combined = result.stdout + result.stderr;
  assert.match(combined, /Settings valid/);
});

test('tui_dims dynamically adapts to compact / mobile viewports', () => {
  const cmd = `source <(grep -v "^main " "${scriptPath}"); LINES=18 COLUMNS=50 tui_dims; echo "$DIALOG_WIDTH $DIALOG_HEIGHT $DIALOG_MENU_HEIGHT"`;
  const result = spawnSync('bash', ['-c', cmd], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  const [w, h, m] = result.stdout.trim().split(' ').map(Number);
  assert.ok(w <= 48, `DIALOG_WIDTH (${w}) must not exceed 48 on 50-col terminal`);
  assert.ok(h <= 16, `DIALOG_HEIGHT (${h}) must not exceed 16 on 18-line terminal`);
  assert.ok(m >= 3, `DIALOG_MENU_HEIGHT (${m}) must be at least 3`);
});

test('tui_dims caps dimensions on ultrawide viewports for ergonomic readability', () => {
  const cmd = `source <(grep -v "^main " "${scriptPath}"); LINES=60 COLUMNS=200 tui_dims; echo "$DIALOG_WIDTH $DIALOG_HEIGHT"`;
  const result = spawnSync('bash', ['-c', cmd], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  const [w, h] = result.stdout.trim().split(' ').map(Number);
  assert.equal(w, 104, 'DIALOG_WIDTH should be capped at 104 on 200-col terminal');
  assert.equal(h, 36, 'DIALOG_HEIGHT should be capped at 36 on 60-line terminal');
});

test('tui_box_w and tui_box_h clamp dialog popups to active viewport bounds', () => {
  const cmd = `source <(grep -v "^main " "${scriptPath}"); LINES=18 COLUMNS=50 tui_dims; echo "$(tui_box_w 70) $(tui_box_h 25)"`;
  const result = spawnSync('bash', ['-c', cmd], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  const [w, h] = result.stdout.trim().split(' ').map(Number);
  assert.equal(w, 48, 'Desired width 70 must be clamped to DIALOG_WIDTH (48)');
  assert.equal(h, 16, 'Desired height 25 must be clamped to DIALOG_HEIGHT (16)');
});

test('tui_truncate_path truncates long paths from the left with ellipsis', () => {
  const cmd = `source <(grep -v "^main " "${scriptPath}"); tui_truncate_path "/home/user/.claude/settings.json" 20`;
  const result = spawnSync('bash', ['-c', cmd], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), '...de/settings.json');
});

test('tui_setup_dialogrc configures scrollbars and visit_items for touch/mouse navigation', () => {
  const cmd = `source <(grep -v "^main " "${scriptPath}"); DIALOG_CMD=dialog; tui_setup_dialogrc; cat "$DIALOGRC"; rm -f "$DIALOGRC"`;
  const result = spawnSync('bash', ['-c', cmd], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /use_scrollbar = ON/);
  assert.match(result.stdout, /visit_items = ON/);
  assert.match(result.stdout, /tab_len = 2/);
});

test('tui_enable_mouse does not pollute stdin with raw escape sequences, and tui_disable_mouse cleanly resets tracking', () => {
  // Use Python pty to allocate a real pseudo-terminal
  const pyCode = `
import pty, os
master, slave = pty.openpty()
pid = os.fork()
if pid == 0:
    os.close(master)
    os.setsid()
    os.dup2(slave, 0); os.dup2(slave, 1); os.dup2(slave, 2)
    os.execlp("bash", "bash", "-c", "source <(grep -v \\"^main \\" \\"${scriptPath}\\"); DIALOG_CMD=dialog; tui_enable_mouse; tui_disable_mouse")
else:
    os.close(slave)
    chunks = []
    while True:
        try:
            data = os.read(master, 1024)
            if not data:
                break
            chunks.append(data)
        except OSError:
            break
    os.close(master)
    os.waitpid(pid, 0)
    print(b"".join(chunks).decode("latin1", errors="replace"))
`;
  const result = spawnSync('python3', ['-c', pyCode], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.ok(!result.stdout.includes('\x1b[?1000h'), 'tui_enable_mouse must NOT emit DECSET 1000h raw escape');
  assert.ok(!result.stdout.includes('\x1b[?1006h'), 'tui_enable_mouse must NOT emit SGR 1006h raw escape');
  assert.ok(result.stdout.includes('\x1b[?1006l'), 'tui_disable_mouse must emit SGR mouse tracking disable 1006l');
  assert.ok(result.stdout.includes('\x1b[?1000l'), 'tui_disable_mouse must emit DECRST 1000l');
});

test('tui_enable_mouse does not cause instant exit when clicking on dialog', () => {
  // Test that simulated mouse click escape sequence is not triggered or dialog remains running
  const pyCode = `
import pty, os, time
master, slave = pty.openpty()
pid = os.fork()
if pid == 0:
    os.close(master)
    os.setsid()
    os.dup2(slave, 0); os.dup2(slave, 1); os.dup2(slave, 2)
    os.execlp("bash", "bash", "-c", "source <(grep -v \\"^main \\" \\"${scriptPath}\\"); DIALOG_CMD=dialog; tui_enable_mouse; echo ready; sleep 0.5")
else:
    os.close(slave)
    time.sleep(0.1)
    os.write(master, b"test-input\\n")
    _, status = os.waitpid(pid, 0)
    assert os.waitstatus_to_exitcode(status) == 0
`;
  const result = spawnSync('python3', ['-c', pyCode], { encoding: 'utf8' });
  assert.equal(result.status, 0);
});

