const fs = require('fs');
const path = require('path');

const markdownPath = '/tmp/claude-env-vars.md';
const text = fs.readFileSync(markdownPath, 'utf8');
const lines = text.split('\n').slice(133, 490).filter(l => l.startsWith('| `'));

const rawSchema = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'docs', 'claude-code-settings.json'), 'utf8')
);
const schemaProps = (rawSchema && rawSchema.properties && rawSchema.properties.env && rawSchema.properties.env.properties) || {};

const DEDICATED = new Set([
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_CUSTOM_MODEL_OPTION',
  'ANTHROPIC_CUSTOM_MODEL_OPTION_NAME',
  'ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION',
  'ANTHROPIC_DEFAULT_FABLE_MODEL',
  'ANTHROPIC_DEFAULT_FABLE_MODEL_NAME',
  'ANTHROPIC_DEFAULT_FABLE_MODEL_DESCRIPTION',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL_NAME',
  'ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL_NAME',
  'ANTHROPIC_DEFAULT_SONNET_MODEL_DESCRIPTION',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL_DESCRIPTION',
  'CLAUDE_CODE_SUBAGENT_MODEL',
  'CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY',
  'CLAUDE_CODE_DISABLE_ADVISOR_TOOL',
  'CLAUDE_CODE_USE_POWERSHELL_TOOL'
]);

const NATIVE_MAP = {
  'ANTHROPIC_MODEL': 'model',
  'CLAUDE_CODE_EFFORT_LEVEL': 'effortLevel',
  'CLAUDE_EFFORT': 'effortLevel',
  'CLAUDE_CODE_DISABLE_FAST_MODE': 'fastMode',
  'CLAUDE_CODE_FAST_MODE': 'fastMode',
  'CLAUDE_AUTOCOMPACT_PCT_OVERRIDE': 'autoCompactThreshold'
};

const APPLICABILITY_MAP = {
  'CLAUDE_CODE_REMOTE': 'ignored',
  'CLAUDE_CODE_ACCOUNT_UUID': 'ignored',
  'CLAUDE_CODE_MESSAGING_SOCKET': 'ignored',
  'CLAUDE_CODE_MESSAGING_TOKEN': 'ignored',
  'CLAUDE_CODE_CHILD_SESSION': 'ignored',
  'CLAUDECODE': 'ignored',
  'CLAUDE_CODE_PROJECT_DIR_NAME': 'launch',
  'CLAUDE_CODE_RESTRICTED': 'launch',
  'NO_COLOR': 'subprocess',
  'FORCE_COLOR': 'subprocess'
};

const PROJECT_IGNORED = new Set([
  'CLAUDE_CONFIG_DIR',
  'CLAUDE_CODE_TMPDIR',
  'OTEL_LOG_RAW_API_BODIES',
  'ENABLE_BETA_TRACING_DETAILED',
  'BETA_TRACING_ENDPOINT',
  'CLAUDE_CODE_PROCESS_WRAPPER',
  'CLAUDE_CODE_SYNC_SKILLS',
  'CLAUDE_CODE_SYNC_PLUGINS',
  'CLAUDE_CODE_PLUGIN_CACHE_DIR',
  'CLAUDE_CODE_PLUGIN_SEED_DIR'
]);

const NONEMPTY_BOOLS = new Set([
  'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC',
  'DISABLE_TELEMETRY',
  'DISABLE_ERROR_REPORTING',
  'CLAUDE_CODE_TMUX_TRUECOLOR',
  'FALLBACK_FOR_ALL_PRIMARY_MODELS',
  'IS_DEMO'
]);

const GUIDANCE_MAP = {
  'CLAUDE_CODE_PROMPT_CACHE_TTL': 'env.guidance.cacheCost',
  'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC': 'env.guidance.nonempty',
  'DISABLE_TELEMETRY': 'env.guidance.nonempty',
  'DISABLE_ERROR_REPORTING': 'env.guidance.nonempty',
  'CLAUDE_AFK_TIMEOUT_MS': 'env.guidance.afk',
  'CLAUDE_CODE_PWSH_PARSE_TIMEOUT_MS': 'env.guidance.pwsh',
  'CLAUDE_CODE_SLOW_OPERATION_THRESHOLD_MS': 'env.guidance.slowOperation'
};

function categorize(name, desc) {
  const n = name.toUpperCase();
  const d = desc.toLowerCase();

  const managedNames = new Set([
    'CLAUDE_CODE_DISABLE_ADMIN_ENV_UNION',
    'CLAUDE_CODE_DISABLE_POLICY_SKILLS',
    'CLAUDE_CODE_POWERSHELL_RESPECT_EXECUTION_POLICY',
    'CLAUDE_CODE_PROCESS_WRAPPER',
    'CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST',
    'CLAUDE_CODE_SAFE_MODE',
    'DISABLE_DOCTOR_COMMAND',
    'DISABLE_EXTRA_USAGE_COMMAND',
    'DISABLE_FEEDBACK_COMMAND',
    'DISABLE_INSTALLATION_CHECKS',
    'DISABLE_INSTALL_GITHUB_APP_COMMAND',
    'DISABLE_LOGIN_COMMAND',
    'DISABLE_LOGOUT_COMMAND',
    'DISABLE_UPGRADE_COMMAND',
    'CLAUDE_CODE_MCP_ALLOWLIST_ENV',
    'CLAUDE_CODE_SUBPROCESS_ENV_SCRUB'
  ]);
  if (managedNames.has(n)) return 'managed';

  if (
    n.startsWith('OTEL_') ||
    n.startsWith('BETA_TRACING_') ||
    n === 'ENABLE_BETA_TRACING_DETAILED' ||
    n === 'DISABLE_TELEMETRY' ||
    n === 'DISABLE_ERROR_REPORTING' ||
    n === 'DO_NOT_TRACK' ||
    n === 'CLAUDE_CODE_ENABLE_TELEMETRY' ||
    n === 'CLAUDE_CODE_ENHANCED_TELEMETRY_BETA' ||
    n === 'CLAUDE_CODE_OTEL_DIAG_STDERR' ||
    n === 'CLAUDE_CODE_SLOW_OPERATION_THRESHOLD_MS' ||
    n === 'CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL' ||
    n === 'DISABLE_GROWTHBOOK' ||
    n === 'CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY' ||
    n === 'CLAUDE_CODE_PROPAGATE_TRACEPARENT'
  ) {
    return 'telemetry';
  }

  if (
    n === 'CLAUDE_CODE_PROMPT_CACHE_TTL' ||
    n === 'CLAUDE_CODE_TOOL_MEMORY_LIMIT' ||
    n === 'CLAUDE_CODE_WEBFETCH_CACHE_TTL_MS' ||
    n.includes('PROMPT_CACHING') ||
    n === 'CLAUDE_CODE_AUTO_COMPACT_WINDOW' ||
    n === 'DISABLE_AUTO_COMPACT' ||
    n === 'DISABLE_COMPACT' ||
    n === 'MAX_THINKING_TOKENS' ||
    n === 'CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS' ||
    n === 'CLAUDE_BYTE_STREAM_IDLE_TIMEOUT_MS' ||
    n === 'CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT' ||
    n === 'CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS' ||
    n === 'API_TIMEOUT_MS' ||
    n === 'API_FORCE_IDLE_TIMEOUT' ||
    n === 'BASH_DEFAULT_TIMEOUT_MS' ||
    n === 'BASH_MAX_TIMEOUT_MS' ||
    n === 'BASH_MAX_OUTPUT_LENGTH' ||
    n.includes('WATCHDOG') ||
    n === 'CLAUDE_CODE_API_KEY_HELPER_TTL_MS' ||
    n === 'CLAUDE_CODE_PWSH_PARSE_TIMEOUT_MS' ||
    n === 'CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS'
  ) {
    return 'performance';
  }

  if (
    n.startsWith('ANTHROPIC_') ||
    n.startsWith('AWS_') ||
    n.startsWith('GOOGLE_') ||
    n.startsWith('VERTEX_') ||
    n.startsWith('GCLOUD_') ||
    n.includes('PROXY') ||
    n.startsWith('SSL_') ||
    n === 'NODE_EXTRA_CA_CERTS' ||
    n.includes('_AUTH') ||
    n.includes('BEDROCK') ||
    n.includes('MANTLE') ||
    n.includes('FOUNDRY') ||
    n === 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC' ||
    n === 'CLAUDE_CODE_PROXY_RESOLVES_HOSTS' ||
    n === 'CLAUDE_CODE_USE_ANTHROPIC_AWS' ||
    n === 'CLAUDE_CODE_USE_BEDROCK' ||
    n === 'CLAUDE_CODE_USE_FOUNDRY' ||
    n === 'CLAUDE_CODE_USE_MANTLE' ||
    n === 'CLAUDE_CODE_USE_VERTEX'
  ) {
    if (n === 'ANTHROPIC_DEFAULT_MODEL') return 'behavior';
    return 'network';
  }

  if (
    n.startsWith('BASH_') ||
    n.startsWith('CLAUDE_BASH_') ||
    n.startsWith('CLAUDE_AGENT_SDK_') ||
    n.startsWith('MCP_') ||
    n.startsWith('CLAUDE_CODE_MCP_') ||
    n.startsWith('CLAUDE_CODE_POWERSHELL_') ||
    n.startsWith('CLAUDE_CODE_SUBAGENT_') ||
    n === 'CLAUDE_CODE_TMPDIR' ||
    n.startsWith('CLAUDE_CODE_MESSAGING_') ||
    n === 'USE_BUILTIN_RIPGREP' ||
    n === 'CLAUDE_CODE_DISABLE_ARTIFACT' ||
    n === 'CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS' ||
    n === 'CLAUDE_CODE_FORK_SUBAGENT' ||
    n === 'CLAUDE_CODE_FORWARD_SUBAGENT_TEXT' ||
    n === 'CLAUDE_CODE_AUTO_BACKGROUND_TASKS' ||
    n === 'CLAUDE_CODE_DISABLE_BACKGROUND_TASKS' ||
    n === 'CLAUDE_CODE_DISABLE_CRON' ||
    n === 'CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS' ||
    n === 'CLAUDE_CODE_DISABLE_WORKFLOWS' ||
    n === 'CLAUDE_CODE_PERFORCE_MODE' ||
    n === 'ENABLE_CLAUDEAI_MCP_SERVERS' ||
    n === 'CLAUDE_CODE_USE_POWERSHELL_TOOL' ||
    n === 'CLAUDE_CODE_USE_NATIVE_FILE_SEARCH' ||
    n === 'CLAUDE_CODE_DISABLE_ADVISOR_TOOL'
  ) {
    return 'tools';
  }

  return 'behavior';
}

function cleanMarkdownLinks(str) {
  // Convert [Text](url) -> Text
  return str.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

function extractMinVersion(desc) {
  const m1 = desc.match(/\(v([0-9]+\.[0-9]+\.[0-9]+)\+\)/);
  if (m1) return m1[1];
  const m2 = desc.match(/Requires Claude Code v([0-9]+\.[0-9]+\.[0-9]+)/);
  if (m2) return m2[1];
  const m3 = desc.match(/Added in v([0-9]+\.[0-9]+\.[0-9]+)/);
  if (m3) return m3[1];
  return '';
}

const EXPLICIT_VALUES = {
  'ANTHROPIC_BEDROCK_REGION_PREFIX': ['us', 'eu', 'apac', 'jp', 'au', 'global'],
  'CLAUDE_CODE_PROMPT_CACHE_TTL': ['5m', '1h']
};

const entries = [];
for (const line of lines) {
  const match = line.match(/^\|\s*`([^`]+)`\s*\|\s*(.*?)\s*\|?$/);
  if (!match) continue;
  const name = match[1];
  const rawDesc = match[2];
  const cleanDesc = cleanMarkdownLinks(rawDesc);

  const schemaDef = schemaProps[name];
  const enums = (schemaDef && Array.isArray(schemaDef.enum)) ? schemaDef.enum : (EXPLICIT_VALUES[name] || []);

  let boolType = '';
  let isBoolean = false;
  if (NONEMPTY_BOOLS.has(name)) {
    isBoolean = true;
    boolType = 'nonempty';
  } else if (enums.includes('true') && enums.includes('false')) {
    isBoolean = true;
    boolType = 'true_false';
  } else if (enums.includes('0') && enums.includes('1')) {
    isBoolean = true;
    boolType = '0_1';
  } else if (
    cleanDesc.toLowerCase().includes('set to `1`') ||
    cleanDesc.toLowerCase().includes('set `1` to') ||
    cleanDesc.toLowerCase().includes('set to 1') ||
    cleanDesc.toLowerCase().includes('set to `0`') ||
    cleanDesc.toLowerCase().includes('set `0` to') ||
    cleanDesc.toLowerCase().includes('set to 0')
  ) {
    isBoolean = true;
    boolType = '0_1';
  }

  const category = categorize(name, cleanDesc);
  const minVersion = extractMinVersion(rawDesc);
  const restartRequired = cleanDesc.toLowerCase().includes('restart') || cleanDesc.toLowerCase().includes('relaunch');
  const sensitive = name.includes('KEY') || name.includes('TOKEN') || name.includes('SECRET') || name.includes('CREDENTIAL') || name.includes('RAW_API_BODIES') || name.includes('TRACE');

  const entry = {
    name,
    category
  };

  if (isBoolean) {
    entry.isBoolean = true;
    entry.boolType = boolType;
  }

  if (NATIVE_MAP[name]) {
    entry.nativeSetting = NATIVE_MAP[name];
  }

  if (DEDICATED.has(name)) {
    entry.isDedicated = true;
  }

  if (APPLICABILITY_MAP[name]) {
    entry.applicability = APPLICABILITY_MAP[name];
  }

  if (PROJECT_IGNORED.has(name)) {
    entry.ignoredScopes = ['project', 'local'];
  }

  if (minVersion) {
    entry.minVersion = minVersion;
  }

  if (restartRequired) {
    entry.restartRequired = true;
  }

  if (sensitive) {
    entry.sensitive = true;
  }

  if (EXPLICIT_VALUES[name]) {
    entry.values = EXPLICIT_VALUES[name];
  } else if (enums.length > 0 && !isBoolean) {
    entry.values = enums;
  }

  if (GUIDANCE_MAP[name]) {
    entry.guidanceKey = GUIDANCE_MAP[name];
  }

  entry.description = cleanDesc;
  entries.push(entry);
}

// Add entries from settings-reference#env that are not in the main table
entries.push({
  name: 'CLAUDE_CODE_SYNC_PLUGINS',
  category: 'behavior',
  ignoredScopes: ['project', 'local'],
  sourceUrl: 'https://code.claude.com/docs/en/settings-reference#env',
  description: 'Configure plugin synchronization outside project and local settings.'
});

entries.push({
  name: 'CLAUDE_CODE_ACCOUNT_UUID',
  category: 'behavior',
  applicability: 'ignored',
  sourceUrl: 'https://code.claude.com/docs/en/settings-reference#env',
  description: 'Runtime-owned account identity. Claude Code ignores values supplied through settings.json.'
});

entries.push({
  name: 'NO_COLOR',
  category: 'behavior',
  applicability: 'subprocess',
  sourceUrl: 'https://code.claude.com/docs/en/settings-reference#env',
  description: 'In settings.json, this affects subprocesses only. To change Claude Code’s own interface colors, set it in the shell before launch.'
});

entries.push({
  name: 'FORCE_COLOR',
  category: 'behavior',
  applicability: 'subprocess',
  sourceUrl: 'https://code.claude.com/docs/en/settings-reference#env',
  description: 'In settings.json, this affects subprocesses only. To change Claude Code’s own interface colors, set it in the shell before launch.'
});

// Add unofficial entries
entries.push({
  name: 'CLAUDE_CODE_PWSH_PARSE_TIMEOUT_MS',
  category: 'tools',
  documentationStatus: 'unofficial',
  applicability: 'unknown',
  guidanceKey: 'env.guidance.pwsh',
  description: 'The v2.1.202 gist reports a PowerShell parser timeout in milliseconds: a positive parsed integer, default 5000. Current support and settings-load timing are unverified.'
});

entries.push({
  name: 'CLAUDE_CODE_SLOW_OPERATION_THRESHOLD_MS',
  category: 'telemetry',
  documentationStatus: 'unofficial',
  applicability: 'unknown',
  sensitive: true,
  guidanceKey: 'env.guidance.slowOperation',
  description: 'The v2.1.202 gist reports a nonnegative numeric threshold for slow-operation logging; absent or invalid values disable logging. Current support and settings-load timing are unverified.'
});

console.log('Total entries:', entries.length);

module.exports = { entries };
