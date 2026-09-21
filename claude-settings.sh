#!/usr/bin/env bash
set -euo pipefail

readonly VERSION="1.0.0"
readonly SCRIPT_NAME="${0##*/}"

# ---------------------------------------------------------------------------
# Color support (respects NO_COLOR)
# ---------------------------------------------------------------------------
if [[ -t 1 ]] && [[ -z "${NO_COLOR:-}" ]]; then
  readonly C_RED=$'\033[31m' C_GREEN=$'\033[32m' C_YELLOW=$'\033[33m'
  readonly C_CYAN=$'\033[36m' C_BOLD=$'\033[1m' C_DIM=$'\033[2m' C_RESET=$'\033[0m'
else
  readonly C_RED='' C_GREEN='' C_YELLOW='' C_CYAN='' C_BOLD='' C_DIM='' C_RESET=''
fi

# ---------------------------------------------------------------------------
# Dialog / whiptail detection
# ---------------------------------------------------------------------------
DIALOG_CMD=""
detect_dialog() {
  if command -v dialog >/dev/null 2>&1; then
    DIALOG_CMD="dialog"
  elif command -v whiptail >/dev/null 2>&1; then
    DIALOG_CMD="whiptail"
  fi
}
detect_dialog

# ---------------------------------------------------------------------------
# Messaging helpers
# ---------------------------------------------------------------------------
die()  { printf '%s%b%s\n' "$C_RED" "$*" "$C_RESET" >&2; exit 1; }
warn() { printf '%s%b%s\n' "$C_YELLOW" "$*" "$C_RESET" >&2; }
info() { printf '%s%b%s\n' "$C_GREEN" "$*" "$C_RESET" >&2; }
dim()  { printf '%s%b%s\n' "$C_DIM" "$*" "$C_RESET" >&2; }

require_jq() {
  command -v jq >/dev/null 2>&1 || die "jq is required but not found. Install it: https://jqlang.github.io/jq/"
}
require_jq

# ---------------------------------------------------------------------------
# Embedded settings catalog
# ---------------------------------------------------------------------------
declare -A CATALOG_TYPE CATALOG_ENUM CATALOG_DEFAULT CATALOG_CATEGORY CATALOG_DESC

register_setting() {
  local path="$1" type="$2" category="$3" desc="$4"
  local enum="${5:-}" default="${6:-}"
  CATALOG_TYPE["$path"]="$type"
  CATALOG_CATEGORY["$path"]="$category"
  CATALOG_DESC["$path"]="$desc"
  [[ -n "$enum" ]] && CATALOG_ENUM["$path"]="$enum" || true
  [[ -n "$default" ]] && CATALOG_DEFAULT["$path"]="$default" || true
}

# --- General & UI ---
register_setting 'theme'                        string  general "Color theme"                          "auto|dark|light|dark-daltonized|light-daltonized|dark-ansi|light-ansi" "dark"
register_setting 'tui'                          string  general "TUI layout mode"                      "fullscreen|default" ""
register_setting 'editorMode'                   string  general "Editor input mode"                    "normal|vim" ""
register_setting 'effortLevel'                  string  general "Reasoning effort level"               "low|medium|high|xhigh" ""
register_setting 'language'                     string  general "Interface language"                   "" ""
register_setting 'preferredNotifChannel'        string  general "Notification channel"                 "auto|terminal_bell|iterm2|iterm2_with_bell|kitty|ghostty|notifications_disabled" ""
register_setting 'viewMode'                     string  general "View mode"                            "default|verbose|focus" ""
register_setting 'autoScrollEnabled'            boolean general "Auto-scroll output"                   "" "true"
register_setting 'showTurnDuration'             boolean general "Show turn duration"                   "" ""
register_setting 'terminalProgressBarEnabled'   boolean general "Terminal progress bar"                "" ""
register_setting 'verbose'                      boolean general "Verbose logging"                      "" ""
register_setting 'diffTool'                     string  general "Diff display tool"                    "auto|terminal" "auto"
register_setting 'respectGitignore'             boolean general "Respect .gitignore in file search"    "" ""
register_setting 'cleanupPeriodDays'            integer general "Session cleanup period (days)"        "" "30"
register_setting 'includeCoAuthoredBy'          boolean general "Include Co-Authored-By in commits"    "" ""
register_setting 'includeGitInstructions'       boolean general "Include git instructions in prompts"  "" ""
register_setting 'defaultShell'                 string  general "Default shell interpreter"            "bash|powershell" ""
register_setting 'autoUpdatesChannel'           string  general "Auto-update release channel"          "stable|latest" "latest"
register_setting 'spinnerTipsEnabled'           boolean general "Show spinner tips"                    "" ""
register_setting 'fileCheckpointingEnabled'     boolean general "Enable file checkpointing"            "" ""
register_setting 'syntaxHighlightingDisabled'   boolean general "Disable syntax highlighting"          "" ""
register_setting 'axScreenReader'               boolean general "Screen reader mode"                   "" ""
register_setting 'hasCompletedOnboarding'       boolean general "Onboarding completed"                 "" ""
register_setting 'plansDirectory'               string  general "Plans directory path"                 "" ""

# --- Permissions ---
register_setting 'permissions.defaultMode'              string  permissions "Default permission mode"       "acceptEdits|bypassPermissions|default|delegate|dontAsk|plan|auto|manual" "default"
register_setting 'permissions.allow'                    array   permissions "Allowed tool rules"            "" ""
register_setting 'permissions.ask'                      array   permissions "Ask-before-run rules"          "" ""
register_setting 'permissions.deny'                     array   permissions "Denied tool rules"             "" ""
register_setting 'permissions.additionalDirectories'    array   permissions "Additional allowed directories" "" ""
register_setting 'skipDangerousModePermissionPrompt'    boolean permissions "Skip dangerous mode prompt"    "" ""
register_setting 'skipAutoPermissionPrompt'             boolean permissions "Skip auto mode prompt"         "" ""
register_setting 'autoMode.classifyAllShell'            boolean permissions "Classify all shell commands"   "" ""
register_setting 'askUserQuestionTimeout'               string  permissions "Question timeout"              "60s|5m|10m|never" ""
register_setting 'dialogExpiry'                         string  permissions "Dialog expiry duration"        "" ""

# --- Sandbox ---
register_setting 'sandbox.enabled'                      boolean sandbox "Enable sandboxing"                "" ""
register_setting 'sandbox.autoAllowBashIfSandboxed'     boolean sandbox "Auto-allow bash if sandboxed"     "" ""
register_setting 'sandbox.allowUnsandboxedCommands'     boolean sandbox "Allow unsandboxed commands"       "" ""
register_setting 'sandbox.excludedCommands'             array   sandbox "Excluded sandbox commands"        "" ""
register_setting 'sandbox.filesystem.allowWrite'        array   sandbox "Allowed write paths"              "" ""
register_setting 'sandbox.filesystem.denyWrite'         array   sandbox "Denied write paths"               "" ""
register_setting 'sandbox.filesystem.denyRead'          array   sandbox "Denied read paths"                "" ""
register_setting 'sandbox.filesystem.allowRead'         array   sandbox "Allowed read paths"               "" ""
register_setting 'sandbox.network.allowedDomains'       array   sandbox "Allowed network domains"          "" ""
register_setting 'sandbox.network.deniedDomains'        array   sandbox "Denied network domains"           "" ""

# --- Environment ---
register_setting 'env' object env "Environment variables map" "" ""

# --- Models & Workflows ---
register_setting 'model'                    string  models "Primary model"                    "" ""
register_setting 'advisorModel'             string  models "Advisor model"                    "" ""
register_setting 'fallbackModel'            array   models "Fallback models (max 3)"          "" ""
register_setting 'availableModels'          array   models "Available model list"             "" ""
register_setting 'alwaysThinkingEnabled'    boolean models "Always use thinking"              "" ""
register_setting 'showThinkingSummaries'    boolean models "Show thinking summaries"          "" ""
register_setting 'fastMode'                 boolean models "Enable fast mode"                 "" ""
register_setting 'autoCompactEnabled'       boolean models "Auto-compact context"             "" ""
register_setting 'autoCompactWindow'        integer models "Auto-compact window (tokens)"     "" ""
register_setting 'autoCompactThreshold'     number  models "Auto-compact threshold"           "" ""
register_setting 'workflowSizeGuideline'    string  models "Workflow size guideline"          "unrestricted|small|medium|large" ""
register_setting 'disableWorkflows'         boolean models "Disable workflows"                "" ""
register_setting 'teammateMode'             string  models "Teammate mode"                    "auto|in-process|tmux|iterm2" ""
register_setting 'crossSessionInbound'      string  models "Cross-session inbound policy"    "" ""
register_setting 'modelOverrides'           object  models "Model overrides map"             "" ""

# --- Hooks & Status Line ---
register_setting 'hooks'            object  hooks "Hook definitions"          "" ""
register_setting 'statusLine'       object  hooks "Status line configuration" "" ""
register_setting 'disableAllHooks'  boolean hooks "Disable all hooks"        "" ""

# --- MCP ---
register_setting 'enableMcpServers'         boolean mcp "Enable MCP servers"               "" ""
register_setting 'enabledMcpjsonServers'    array   mcp "Enabled MCP JSON servers"         "" ""
register_setting 'disabledMcpjsonServers'   array   mcp "Disabled MCP JSON servers"        "" ""

# --- Worktree & Memory ---
register_setting 'worktree.baseRef'             string  worktree "Worktree base ref"             "fresh|head" ""
register_setting 'worktree.bgIsolation'         string  worktree "Background isolation mode"     "worktree|none" ""
register_setting 'worktree.symlinkDirectories'  array   worktree "Symlinked directories"         "" ""
register_setting 'worktree.sparsePaths'         array   worktree "Sparse checkout paths"         "" ""
register_setting 'autoMemoryEnabled'            boolean worktree "Auto memory saves"             "" "true"
register_setting 'claudeMdExcludes'             array   worktree "CLAUDE.md exclude patterns"    "" ""
register_setting 'disableRemoteControl'         boolean worktree "Disable remote control"        "" ""

# --- Plugins & Marketplaces ---
register_setting 'channelsEnabled'          boolean plugins "Enable plugin channels"       "" ""
register_setting 'enabledPlugins'           object  plugins "Enabled plugins map"          "" ""
register_setting 'extraKnownMarketplaces'   object  plugins "Extra marketplace sources"   "" ""
register_setting 'skippedMarketplaces'      array   plugins "Skipped marketplaces"        "" ""
register_setting 'skippedPlugins'           array   plugins "Skipped plugins"             "" ""

# Sensitive env var patterns for masking
readonly SENSITIVE_PATTERNS='KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL'

# ---------------------------------------------------------------------------
# Scope-to-file resolution
# ---------------------------------------------------------------------------
resolve_file() {
  local scope="${1:-user}"
  case "$scope" in
    user)
      local config_dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
      printf '%s/settings.json' "$config_dir"
      ;;
    project)
      local git_root
      git_root="$(git rev-parse --show-toplevel 2>/dev/null)" || die "Not in a git repository (required for project scope)"
      printf '%s/.claude/settings.json' "$git_root"
      ;;
    local)
      local git_root
      git_root="$(git rev-parse --show-toplevel 2>/dev/null)" || die "Not in a git repository (required for local scope)"
      printf '%s/.claude/settings.local.json' "$git_root"
      ;;
    managed)
      if [[ "$(uname -s)" == "Darwin" ]]; then
        printf '/Library/Application Support/ClaudeCode/managed-settings.json'
      else
        printf '/etc/claude-code/managed-settings.json'
      fi
      ;;
    *) die "Unknown scope: $scope (use: user, project, local, managed)" ;;
  esac
}

# ---------------------------------------------------------------------------
# File I/O helpers
# ---------------------------------------------------------------------------
read_settings() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    printf '{}'
    return 0
  fi
  local json
  json="$(jq '.' "$file" 2>/dev/null)" || die "Failed to parse JSON: $file"
  local root_type
  root_type="$(printf '%s' "$json" | jq -r 'type')"
  [[ "$root_type" == "object" ]] || die "Settings root must be an object, got: $root_type"
  printf '%s' "$json"
}

write_settings() {
  local file="$1" json="$2" force="${3:-false}"
  local root_type
  root_type="$(printf '%s' "$json" | jq -r 'type' 2>/dev/null)" || die "Invalid JSON"
  [[ "$root_type" == "object" ]] || die "Settings root must be an object"

  local managed_path
  managed_path="$(resolve_file managed)"
  if [[ "$file" == "$managed_path" ]] && [[ "$force" != "true" ]]; then
    die "Writing to managed scope requires --force (this overrides organization policy)"
  fi

  local dir
  dir="$(dirname "$file")"
  [[ -d "$dir" ]] || mkdir -p "$dir"

  local tmpfile
  tmpfile="$(mktemp "${dir}/.settings.XXXXXX")"
  if printf '%s' "$json" | jq '.' > "$tmpfile" 2>/dev/null; then
    mv "$tmpfile" "$file"
  else
    rm -f "$tmpfile"
    die "Failed to write settings"
  fi
}

ensure_backup() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  local backup
  backup="${file}.bak.$(date +%Y%m%d-%H%M%S)"
  cp "$file" "$backup"
  local dir
  dir="$(dirname "$file")"
  local base
  base="$(basename "$file")"
  local old_backups
  old_backups="$(find "$dir" -maxdepth 1 -name "${base}.bak.*" -type f 2>/dev/null | sort -r | tail -n +6)"
  if [[ -n "$old_backups" ]]; then
    printf '%s\n' "$old_backups" | xargs rm -f
  fi
  dim "Backup: $backup"
}

# ---------------------------------------------------------------------------
# JSON path helpers (dot-separated → jq path array)
# ---------------------------------------------------------------------------
path_to_jq_array() {
  local path="$1"
  local parts
  IFS='.' read -ra parts <<< "$path"
  local arr="["
  local first=true
  for p in "${parts[@]}"; do
    $first || arr+=","
    arr+="\"$p\""
    first=false
  done
  arr+="]"
  printf '%s' "$arr"
}

get_at_path() {
  local json="$1" path="$2"
  local jq_path
  jq_path="$(path_to_jq_array "$path")"
  printf '%s' "$json" | jq "getpath($jq_path)"
}

set_at_path() {
  local json="$1" path="$2" value="$3"
  local jq_path
  jq_path="$(path_to_jq_array "$path")"

  local typed_value
  typed_value="$(auto_type_value "$value")"

  printf '%s' "$json" | jq "setpath($jq_path; $typed_value)"
}

delete_at_path() {
  local json="$1" path="$2"
  local jq_path
  jq_path="$(path_to_jq_array "$path")"
  printf '%s' "$json" | jq "delpaths([$jq_path])"
}

auto_type_value() {
  local value="$1"
  case "$value" in
    true|false) printf '%s' "$value" ;;
    null) printf 'null' ;;
    *)
      if printf '%s' "$value" | jq '.' >/dev/null 2>&1; then
        local vtype
        vtype="$(printf '%s' "$value" | jq -r 'type' 2>/dev/null)"
        case "$vtype" in
          array|object|number) printf '%s' "$value" ;;
          *) printf '%s' "$value" | jq -R '.' ;;
        esac
      elif [[ "$value" =~ ^-?[0-9]+$ ]]; then
        printf '%s' "$value"
      elif [[ "$value" =~ ^-?[0-9]*\.[0-9]+$ ]]; then
        printf '%s' "$value"
      else
        printf '%s' "$value" | jq -R '.'
      fi
      ;;
  esac
}

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
validate_settings() {
  local json="$1"
  local errors=0

  local root_type
  root_type="$(printf '%s' "$json" | jq -r 'type')"
  if [[ "$root_type" != "object" ]]; then
    printf '%sRoot must be an object, got: %s%s\n' "$C_RED" "$root_type" "$C_RESET"
    return 1
  fi

  for path in "${!CATALOG_ENUM[@]}"; do
    local enum_str="${CATALOG_ENUM[$path]}"
    [[ -z "$enum_str" ]] && continue
    local jq_expr
    if [[ "$path" == *.* ]]; then
      jq_expr=".$(printf '%s' "$path" | sed 's/\././g')"
    else
      jq_expr=".$path"
    fi
    local val
    val="$(printf '%s' "$json" | jq -r "$jq_expr // empty" 2>/dev/null)" || continue
    [[ -z "$val" ]] && continue
    if [[ "$path" == "theme" ]] && [[ "$val" == custom:* ]]; then
      continue
    fi
    local found=false
    local IFS='|'
    for a in $enum_str; do
      if [[ "$val" == "$a" ]]; then
        found=true
        break
      fi
    done
    if ! $found; then
      printf '%sInvalid %s: "%s" (allowed: %s)%s\n' "$C_RED" "$path" "$val" "$enum_str" "$C_RESET"
      ((errors++)) || true
    fi
  done

  for perm_key in permissions.allow permissions.ask permissions.deny permissions.additionalDirectories; do
    local jq_expr
    jq_expr=".$(printf '%s' "$perm_key" | sed 's/\././g')"
    local arr_type
    arr_type="$(printf '%s' "$json" | jq -r "$jq_expr | type" 2>/dev/null)" || continue
    if [[ "$arr_type" != "null" ]] && [[ "$arr_type" != "array" ]]; then
      printf '%s%s must be an array, got: %s%s\n' "$C_RED" "$perm_key" "$arr_type" "$C_RESET"
      ((errors++)) || true
    fi
  done

  local env_type
  env_type="$(printf '%s' "$json" | jq -r '.env | type' 2>/dev/null)"
  if [[ "$env_type" != "null" ]] && [[ "$env_type" != "object" ]]; then
    printf '%senv must be an object, got: %s%s\n' "$C_RED" "$env_type" "$C_RESET"
    ((errors++)) || true
  fi

  if [[ "$env_type" == "object" ]]; then
    local bad_keys
    bad_keys="$(printf '%s' "$json" | jq -r '.env | keys[] | select(test("^[A-Z_][A-Z0-9_]*$") | not)')"
    if [[ -n "$bad_keys" ]]; then
      while IFS= read -r k; do
        printf '%sInvalid env var name: "%s" (must match ^[A-Z_][A-Z0-9_]*$)%s\n' "$C_RED" "$k" "$C_RESET"
        ((errors++)) || true
      done <<< "$bad_keys"
    fi
  fi

  local fb_count
  fb_count="$(printf '%s' "$json" | jq '.fallbackModel | if type == "array" then length else 0 end' 2>/dev/null)"
  if [[ "$fb_count" -gt 3 ]]; then
    printf '%sfallbackModel has %d items (max 3)%s\n' "$C_RED" "$fb_count" "$C_RESET"
    ((errors++)) || true
  fi

  if [[ $errors -gt 0 ]]; then
    printf '%s%d validation error(s)%s\n' "$C_RED" "$errors" "$C_RESET"
    return 1
  fi
  info "Settings valid"
  return 0
}

# ---------------------------------------------------------------------------
# Sensitive value masking
# ---------------------------------------------------------------------------
mask_value() {
  local key="$1" val="$2"
  if printf '%s' "$key" | grep -qiE "$SENSITIVE_PATTERNS"; then
    local len=${#val}
    if [[ $len -le 4 ]]; then
      printf '****'
    else
      printf '%s****' "${val:0:4}"
    fi
  else
    printf '%s' "$val"
  fi
}

# ---------------------------------------------------------------------------
# CLI: show
# ---------------------------------------------------------------------------
cmd_show() {
  local file json
  file="$(resolve_file "$SCOPE")"
  if [[ ! -f "$file" ]]; then
    dim "No settings file: $file"
    printf '{}\n'
    return 0
  fi
  json="$(read_settings "$file")"
  if [[ "$RAW_OUTPUT" == "true" ]]; then
    printf '%s' "$json" | jq '.'
  else
    printf '%sScope: %s%s\n' "$C_CYAN" "$SCOPE" "$C_RESET"
    printf '%sFile:  %s%s\n' "$C_DIM" "$file" "$C_RESET"
    printf '\n'
    if [[ -z "${NO_COLOR:-}" ]] && [[ -t 1 ]]; then
      printf '%s' "$json" | jq -C '.'
    else
      printf '%s' "$json" | jq '.'
    fi
  fi
}

# ---------------------------------------------------------------------------
# CLI: get
# ---------------------------------------------------------------------------
cmd_get() {
  local path="$1"
  local file json val
  file="$(resolve_file "$SCOPE")"
  json="$(read_settings "$file")"
  val="$(get_at_path "$json" "$path")"
  if [[ "$val" == "null" ]]; then
    warn "Not set: $path"
    return 1
  fi
  if [[ "$RAW_OUTPUT" == "true" ]]; then
    printf '%s' "$val" | jq -r 'if type == "string" then . else tostring end'
  else
    printf '%s' "$val" | jq '.'
  fi
}

# ---------------------------------------------------------------------------
# CLI: set
# ---------------------------------------------------------------------------
cmd_set() {
  local path="$1" value="$2"
  local file json new_json
  file="$(resolve_file "$SCOPE")"
  json="$(read_settings "$file")"
  ensure_backup "$file"
  new_json="$(set_at_path "$json" "$path" "$value")"
  write_settings "$file" "$new_json" "$FORCE"
  info "Set $path in $SCOPE scope"
}

# ---------------------------------------------------------------------------
# CLI: delete
# ---------------------------------------------------------------------------
cmd_delete() {
  local path="$1"
  local file json current new_json
  file="$(resolve_file "$SCOPE")"
  json="$(read_settings "$file")"
  current="$(get_at_path "$json" "$path")"
  if [[ "$current" == "null" ]]; then
    warn "Key not found: $path"
    return 0
  fi
  ensure_backup "$file"
  new_json="$(delete_at_path "$json" "$path")"
  write_settings "$file" "$new_json" "$FORCE"
  info "Deleted $path from $SCOPE scope"
}

# ---------------------------------------------------------------------------
# CLI: validate
# ---------------------------------------------------------------------------
cmd_validate() {
  local file json
  file="$(resolve_file "$SCOPE")"
  printf '%sValidating: %s%s\n' "$C_CYAN" "$file" "$C_RESET"
  if [[ ! -f "$file" ]]; then
    warn "File does not exist: $file"
    return 0
  fi
  json="$(read_settings "$file")"
  validate_settings "$json"
}

# ---------------------------------------------------------------------------
# CLI: backup
# ---------------------------------------------------------------------------
cmd_backup() {
  local file
  file="$(resolve_file "$SCOPE")"
  [[ -f "$file" ]] || die "No settings file to back up: $file"
  ensure_backup "$file"
  info "Backup created for $SCOPE scope"
}

# ---------------------------------------------------------------------------
# CLI: restore
# ---------------------------------------------------------------------------
cmd_restore() {
  local backup_file="$1"
  [[ -f "$backup_file" ]] || die "Backup file not found: $backup_file"
  local json
  json="$(jq '.' "$backup_file" 2>/dev/null)" || die "Invalid JSON in backup: $backup_file"
  local file
  file="$(resolve_file "$SCOPE")"
  ensure_backup "$file"
  write_settings "$file" "$json" "$FORCE"
  info "Restored $SCOPE scope from $backup_file"
}

# ---------------------------------------------------------------------------
# CLI: import
# ---------------------------------------------------------------------------
cmd_import() {
  local import_file="$1"
  [[ -f "$import_file" ]] || die "Import file not found: $import_file"
  local json
  json="$(jq '.' "$import_file" 2>/dev/null)" || die "Invalid JSON in import file: $import_file"
  local file
  file="$(resolve_file "$SCOPE")"
  ensure_backup "$file"
  write_settings "$file" "$json" "$FORCE"
  info "Imported settings to $SCOPE scope from $import_file"
}

# ---------------------------------------------------------------------------
# CLI: export
# ---------------------------------------------------------------------------
cmd_export() {
  local output_file="${1:-}"
  local file json
  file="$(resolve_file "$SCOPE")"
  json="$(read_settings "$file")"
  if [[ -n "$output_file" ]]; then
    printf '%s' "$json" | jq '.' > "$output_file"
    info "Exported $SCOPE scope to $output_file"
  else
    printf '%s' "$json" | jq '.'
  fi
}

# ---------------------------------------------------------------------------
# CLI: diff
# ---------------------------------------------------------------------------
cmd_diff() {
  local scope1="${1:-user}" scope2="${2:-project}"
  local file1 file2
  file1="$(resolve_file "$scope1")"
  file2="$(resolve_file "$scope2")"
  local json1 json2
  json1="$(read_settings "$file1")"
  json2="$(read_settings "$file2")"
  local tmp1 tmp2
  tmp1="$(mktemp)"
  tmp2="$(mktemp)"
  printf '%s' "$json1" | jq -S '.' > "$tmp1"
  printf '%s' "$json2" | jq -S '.' > "$tmp2"
  printf '%s--- %s (%s)%s\n' "$C_RED" "$file1" "$scope1" "$C_RESET"
  printf '%s+++ %s (%s)%s\n' "$C_GREEN" "$file2" "$scope2" "$C_RESET"
  diff -u "$tmp1" "$tmp2" --label "$scope1" --label "$scope2" || true
  rm -f "$tmp1" "$tmp2"
}

# ---------------------------------------------------------------------------
# CLI: edit
# ---------------------------------------------------------------------------
cmd_edit() {
  local file
  file="$(resolve_file "$SCOPE")"
  local editor="${EDITOR:-${VISUAL:-vi}}"
  if [[ ! -f "$file" ]]; then
    local dir
    dir="$(dirname "$file")"
    [[ -d "$dir" ]] || mkdir -p "$dir"
    printf '{}' | jq '.' > "$file"
    dim "Created new settings file: $file"
  fi
  ensure_backup "$file"
  "$editor" "$file"
  if [[ -f "$file" ]]; then
    local json
    json="$(jq '.' "$file" 2>/dev/null)" || { warn "File contains invalid JSON after editing"; return 1; }
    validate_settings "$json" || warn "Settings have validation warnings"
  fi
}

# ---------------------------------------------------------------------------
# CLI: reset
# ---------------------------------------------------------------------------
cmd_reset() {
  local file
  file="$(resolve_file "$SCOPE")"
  if [[ -f "$file" ]]; then
    ensure_backup "$file"
  fi
  write_settings "$file" '{}' "$FORCE"
  info "Reset $SCOPE scope to empty settings"
}

# ---------------------------------------------------------------------------
# CLI: list
# ---------------------------------------------------------------------------
cmd_list() {
  local filter_category="${LIST_CATEGORY:-}"

  if [[ "$JSON_OUTPUT" == "true" ]]; then
    local items="[]"
    for path in $(printf '%s\n' "${!CATALOG_TYPE[@]}" | sort); do
      local cat="${CATALOG_CATEGORY[$path]}"
      [[ -n "$filter_category" ]] && [[ "$cat" != "$filter_category" ]] && continue
      local type="${CATALOG_TYPE[$path]}"
      local desc="${CATALOG_DESC[$path]:-}"
      local enum="${CATALOG_ENUM[$path]:-}"
      local def="${CATALOG_DEFAULT[$path]:-}"
      items="$(printf '%s' "$items" | jq --arg p "$path" --arg t "$type" --arg c "$cat" --arg d "$desc" --arg e "$enum" --arg df "$def" \
        '. + [{ path: $p, type: $t, category: $c, description: $d, enum: (if $e == "" then null else ($e | split("|")) end), default: (if $df == "" then null else $df end) }]')"
    done
    printf '%s' "$items" | jq '.'
    return
  fi

  local current_cat=""
  for path in $(printf '%s\n' "${!CATALOG_TYPE[@]}" | sort); do
    local cat="${CATALOG_CATEGORY[$path]}"
    [[ -n "$filter_category" ]] && [[ "$cat" != "$filter_category" ]] && continue
    local type="${CATALOG_TYPE[$path]}"
    local desc="${CATALOG_DESC[$path]:-}"
    local enum="${CATALOG_ENUM[$path]:-}"
    local def="${CATALOG_DEFAULT[$path]:-}"

    if [[ "$cat" != "$current_cat" ]]; then
      [[ -n "$current_cat" ]] && printf '\n'
      printf '%s%s━━ %s ━━%s\n' "$C_BOLD" "$C_CYAN" "$cat" "$C_RESET"
      current_cat="$cat"
    fi

    printf '  %s%-40s%s  %s%-8s%s' "$C_BOLD" "$path" "$C_RESET" "$C_DIM" "$type" "$C_RESET"
    if [[ -n "$enum" ]]; then
      printf '  %s[%s]%s' "$C_YELLOW" "$enum" "$C_RESET"
    fi
    if [[ -n "$def" ]]; then
      printf '  %s(default: %s)%s' "$C_DIM" "$def" "$C_RESET"
    fi
    printf '\n'
    if [[ -n "$desc" ]]; then
      printf '    %s%s%s\n' "$C_DIM" "$desc" "$C_RESET"
    fi
  done
}

# ---------------------------------------------------------------------------
# CLI: permissions subcommand
# ---------------------------------------------------------------------------
cmd_permissions() {
  local subcmd="${1:-list}"
  shift || true
  local file json
  file="$(resolve_file "$SCOPE")"
  json="$(read_settings "$file")"

  case "$subcmd" in
    list)
      for tier in deny ask allow; do
        local jq_expr=".permissions.$tier // []"
        local rules
        rules="$(printf '%s' "$json" | jq -r "$jq_expr | .[]" 2>/dev/null)" || rules=""
        local count
        count="$(printf '%s' "$json" | jq "$jq_expr | length" 2>/dev/null)" || count=0
        printf '%s%s%s (%d rules):\n' "$C_BOLD" "$tier" "$C_RESET" "$count"
        if [[ -n "$rules" ]]; then
          while IFS= read -r rule; do
            printf '  %s%s%s\n' "$C_CYAN" "$rule" "$C_RESET"
          done <<< "$rules"
        else
          printf '  %s(none)%s\n' "$C_DIM" "$C_RESET"
        fi
      done
      local dirs
      dirs="$(printf '%s' "$json" | jq -r '.permissions.additionalDirectories // [] | .[]' 2>/dev/null)" || dirs=""
      if [[ -n "$dirs" ]]; then
        printf '\n%sadditional directories:%s\n' "$C_BOLD" "$C_RESET"
        while IFS= read -r d; do
          printf '  %s%s%s\n' "$C_CYAN" "$d" "$C_RESET"
        done <<< "$dirs"
      fi
      ;;
    add-allow|add-ask|add-deny)
      local tier="${subcmd#add-}"
      local rule="${1:?Rule required}"
      ensure_backup "$file"
      local new_json
      new_json="$(printf '%s' "$json" | jq --arg r "$rule" ".permissions.$tier = ((.permissions.$tier // []) | if index(\$r) then . else . + [\$r] end)")"
      write_settings "$file" "$new_json" "$FORCE"
      info "Added to permissions.$tier: $rule"
      ;;
    remove)
      local rule="${1:?Rule required}"
      ensure_backup "$file"
      local new_json="$json"
      for tier in allow ask deny; do
        new_json="$(printf '%s' "$new_json" | jq --arg r "$rule" ".permissions.$tier = ((.permissions.$tier // []) | map(select(. != \$r)))")"
      done
      write_settings "$file" "$new_json" "$FORCE"
      info "Removed from permissions: $rule"
      ;;
    add-dir)
      local dir_path="${1:?Directory path required}"
      ensure_backup "$file"
      local new_json
      new_json="$(printf '%s' "$json" | jq --arg d "$dir_path" '.permissions.additionalDirectories = ((.permissions.additionalDirectories // []) | if index($d) then . else . + [$d] end)')"
      write_settings "$file" "$new_json" "$FORCE"
      info "Added additional directory: $dir_path"
      ;;
    *) die "Unknown permissions subcommand: $subcmd (use: list, add-allow, add-ask, add-deny, remove, add-dir)" ;;
  esac
}

# ---------------------------------------------------------------------------
# CLI: env subcommand
# ---------------------------------------------------------------------------
cmd_env() {
  local subcmd="${1:-list}"
  shift || true
  local file json
  file="$(resolve_file "$SCOPE")"
  json="$(read_settings "$file")"

  case "$subcmd" in
    list)
      local env_obj
      env_obj="$(printf '%s' "$json" | jq '.env // {}' 2>/dev/null)"
      local count
      count="$(printf '%s' "$env_obj" | jq 'length')"
      printf '%sEnvironment variables (%d):%s\n' "$C_BOLD" "$count" "$C_RESET"
      if [[ "$count" -gt 0 ]]; then
        printf '%s' "$env_obj" | jq -r 'to_entries[] | "\(.key)=\(.value)"' | while IFS='=' read -r key val; do
          local display_val
          display_val="$(mask_value "$key" "$val")"
          printf '  %s%s%s=%s%s%s\n' "$C_CYAN" "$key" "$C_RESET" "$C_DIM" "$display_val" "$C_RESET"
        done
      fi
      ;;
    get)
      local name="${1:?Variable name required}"
      local val
      val="$(printf '%s' "$json" | jq -r ".env[\"$name\"] // empty")"
      if [[ -z "$val" ]]; then
        warn "Not set: $name"
        return 1
      fi
      if [[ "$RAW_OUTPUT" == "true" ]]; then
        printf '%s\n' "$val"
      else
        printf '%s=%s\n' "$name" "$val"
      fi
      ;;
    set)
      local name="${1:?Variable name required}" value="${2:?Value required}"
      if ! printf '%s' "$name" | grep -qE '^[A-Z_][A-Z0-9_]*$'; then
        die "Invalid env var name: $name (must match ^[A-Z_][A-Z0-9_]*\$)"
      fi
      ensure_backup "$file"
      local new_json
      new_json="$(printf '%s' "$json" | jq --arg k "$name" --arg v "$value" '.env = ((.env // {}) + {($k): $v})')"
      write_settings "$file" "$new_json" "$FORCE"
      info "Set env.$name"
      ;;
    delete)
      local name="${1:?Variable name required}"
      ensure_backup "$file"
      local new_json
      new_json="$(printf '%s' "$json" | jq --arg k "$name" 'if .env then .env |= del(.[$k]) else . end')"
      write_settings "$file" "$new_json" "$FORCE"
      info "Deleted env.$name"
      ;;
    catalog)
      local cat_filter="${ENV_CATALOG_CATEGORY:-}"
      printf '%sKnown environment variables:%s\n\n' "$C_BOLD" "$C_RESET"
      printf '  %s%-45s  %s%s\n' "$C_BOLD" "NAME" "CATEGORY" "$C_RESET"
      printf '  %s─────────────────────────────────────────────  ────────%s\n' "$C_DIM" "$C_RESET"
      local known_vars=(
        "ANTHROPIC_API_KEY:network"
        "ANTHROPIC_AUTH_TOKEN:network"
        "ANTHROPIC_BASE_URL:network"
        "ANTHROPIC_BEDROCK_BASE_URL:network"
        "ANTHROPIC_BEDROCK_REGION_PREFIX:network"
        "ANTHROPIC_MODEL:model"
        "ANTHROPIC_SMALL_FAST_MODEL:model"
        "CLAUDE_CODE_SUBAGENT_MODEL:model"
        "CLAUDE_CODE_SUBAGENT_MODEL_FORCE:model"
        "CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY:model"
        "CLAUDE_CODE_DISABLE_ADVISOR_TOOL:model"
        "CLAUDE_CODE_MAX_THINKING_TOKENS:model"
        "CLAUDE_CODE_PROMPT_CACHING:model"
        "CLAUDE_CODE_USE_BEDROCK:network"
        "CLAUDE_CODE_USE_VERTEX:network"
        "CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS:network"
        "CLAUDE_CODE_BASH_TIMEOUT:runtime"
        "CLAUDE_CODE_DISABLE_AUTO_MEMORY:runtime"
        "CLAUDE_CODE_ATTRIBUTION_HEADER:runtime"
        "DISABLE_AUTOUPDATER:runtime"
        "DISABLE_UPDATES:runtime"
        "DISABLE_BUG_COMMAND:runtime"
        "DISABLE_ERROR_REPORTING:runtime"
        "CLAUDE_CODE_GIT_STASH_ENABLED:runtime"
        "CLAUDE_CODE_MAX_OUTPUT_TOKENS:model"
        "ENABLE_TOOL_SEARCH:model"
      )
      for entry in "${known_vars[@]}"; do
        local name="${entry%%:*}"
        local cat="${entry#*:}"
        [[ -n "$cat_filter" ]] && [[ "$cat" != "$cat_filter" ]] && continue
        printf '  %s%-45s%s  %s%s%s\n' "$C_CYAN" "$name" "$C_RESET" "$C_DIM" "$cat" "$C_RESET"
      done
      ;;
    *) die "Unknown env subcommand: $subcmd (use: list, get, set, delete, catalog)" ;;
  esac
}

# ---------------------------------------------------------------------------
# CLI: array subcommand
# ---------------------------------------------------------------------------
cmd_array() {
  local subcmd="${1:?Subcommand required (list, add, remove, move)}"
  local path="${2:?Array path required}"
  shift 2

  local file json
  file="$(resolve_file "$SCOPE")"
  json="$(read_settings "$file")"

  local jq_path
  jq_path="$(path_to_jq_array "$path")"

  case "$subcmd" in
    list)
      local arr
      arr="$(printf '%s' "$json" | jq "getpath($jq_path) // []")"
      if [[ "$RAW_OUTPUT" == "true" ]]; then
        printf '%s\n' "$arr"
      else
        local count
        count="$(printf '%s' "$arr" | jq 'length')"
        printf '%s%s (%d items):%s\n' "$C_BOLD" "$path" "$count" "$C_RESET"
        printf '%s' "$arr" | jq -r '.[] | if type == "string" then . else tostring end' 2>/dev/null | while IFS= read -r item; do
          printf '  %s•%s %s\n' "$C_CYAN" "$C_RESET" "$item"
        done
      fi
      ;;
    add)
      local value="${1:?Value required}"
      ensure_backup "$file"
      local typed_val
      typed_val="$(auto_type_value "$value")"
      local new_json
      new_json="$(printf '%s' "$json" | jq "setpath($jq_path; ((getpath($jq_path) // []) | if index($typed_val) then . else . + [$typed_val] end))")"
      write_settings "$file" "$new_json" "$FORCE"
      info "Added to $path: $value"
      ;;
    remove)
      local value="${1:?Value required}"
      ensure_backup "$file"
      local typed_val
      typed_val="$(auto_type_value "$value")"
      local new_json
      new_json="$(printf '%s' "$json" | jq "setpath($jq_path; ((getpath($jq_path) // []) | map(select(. != $typed_val))))")"
      write_settings "$file" "$new_json" "$FORCE"
      info "Removed from $path: $value"
      ;;
    move)
      local from_idx="${1:?From index required}" to_idx="${2:?To index required}"
      ensure_backup "$file"
      local new_json
      new_json="$(printf '%s' "$json" | jq --argjson from_i "$from_idx" --argjson to_i "$to_idx" "
        getpath($jq_path) as \$arr |
        if \$arr == null then error(\"Array not found\")
        elif (\$from_i < 0 or \$from_i >= (\$arr | length)) then error(\"From index out of range\")
        elif (\$to_i < 0 or \$to_i >= (\$arr | length)) then error(\"To index out of range\")
        else
          \$arr[\$from_i] as \$item |
          (\$arr | del(.[\$from_i])) | .[:\$to_i] + [\$item] + .[\$to_i:] |
          . as \$new_arr |
          \$ARGS.positional[0] | setpath($jq_path; \$new_arr)
        end
      " --jsonargs "$json")" || die "Failed to move array element"
      write_settings "$file" "$new_json" "$FORCE"
      info "Moved ${path}[${from_idx}] → [${to_idx}]"
      ;;
    *) die "Unknown array subcommand: $subcmd (use: list, add, remove, move)" ;;
  esac
}

# ---------------------------------------------------------------------------
# Shell completions
# ---------------------------------------------------------------------------
cmd_completions() {
  cat << 'COMPLETIONS_EOF'
_claude_settings() {
  local cur prev words cword
  _init_completion || return

  local subcommands="tui show get set delete list validate edit import export diff backup restore reset permissions env array completions"
  local scopes="user project local managed"
  local categories="general permissions sandbox env models hooks mcp worktree plugins advanced"
  local perm_subcmds="list add-allow add-ask add-deny remove add-dir"
  local env_subcmds="list get set delete catalog"
  local array_subcmds="list add remove move"

  case "${words[1]}" in
    permissions)
      if [[ $cword -eq 2 ]]; then
        COMPREPLY=($(compgen -W "$perm_subcmds" -- "$cur"))
        return
      fi
      ;;
    env)
      if [[ $cword -eq 2 ]]; then
        COMPREPLY=($(compgen -W "$env_subcmds" -- "$cur"))
        return
      fi
      ;;
    array)
      if [[ $cword -eq 2 ]]; then
        COMPREPLY=($(compgen -W "$array_subcmds" -- "$cur"))
        return
      fi
      ;;
  esac

  case "$prev" in
    --scope) COMPREPLY=($(compgen -W "$scopes" -- "$cur")); return ;;
    --category) COMPREPLY=($(compgen -W "$categories" -- "$cur")); return ;;
  esac

  if [[ $cword -eq 1 ]]; then
    COMPREPLY=($(compgen -W "$subcommands" -- "$cur"))
    return
  fi

  COMPREPLY=($(compgen -W "--scope --raw --json --force --category --output" -- "$cur"))
}
complete -F _claude_settings claude-settings.sh
COMPLETIONS_EOF
}

# ===========================================================================
#  TUI Mode
# ===========================================================================
TUI_DIRTY=false
TUI_JSON=""
TUI_FILE=""

tui_require_dialog() {
  [[ -n "$DIALOG_CMD" ]] || die "TUI mode requires 'dialog' or 'whiptail'. Install one:\n  apt install dialog  OR  apt install whiptail"
  if [[ ! -t 0 ]] || [[ ! -t 1 ]] || [[ "${TERM:-dumb}" == "dumb" ]]; then
    die "TUI mode requires an interactive terminal (TTY) with a supported TERM.\nRun with a command or --help, e.g.:\n  $SCRIPT_NAME show\n  $SCRIPT_NAME --help"
  fi
}

tui_dims() {
  local rows cols
  rows="$(tput lines 2>/dev/null || printf '%s' "${LINES:-24}")"
  cols="$(tput cols 2>/dev/null || printf '%s' "${COLUMNS:-80}")"
  [[ "$rows" =~ ^[0-9]+$ ]] || rows=24
  [[ "$cols" =~ ^[0-9]+$ ]] || cols=80

  # Responsive width: small screens utilize full width; ultrawide screens capped
  if (( cols < 80 )); then
    DIALOG_WIDTH=$(( cols > 26 ? cols - 2 : cols ))
  elif (( cols <= 110 )); then
    DIALOG_WIDTH=$(( cols - 4 ))
  else
    DIALOG_WIDTH=104
  fi

  # Responsive height
  if (( rows < 14 )); then
    DIALOG_HEIGHT=$(( rows > 2 ? rows - 1 : rows ))
  elif (( rows < 24 )); then
    DIALOG_HEIGHT=$(( rows - 2 ))
  elif (( rows <= 40 )); then
    DIALOG_HEIGHT=$(( rows - 4 ))
  else
    DIALOG_HEIGHT=36
  fi

  # Dynamic menu list height
  DIALOG_MENU_HEIGHT=$(( DIALOG_HEIGHT - 8 ))
  if (( DIALOG_MENU_HEIGHT < 3 )); then
    DIALOG_MENU_HEIGHT=3
  fi
}

tui_box_w() {
  local desired="${1:-60}"
  if (( desired > DIALOG_WIDTH )); then
    printf '%d' "$DIALOG_WIDTH"
  else
    printf '%d' "$desired"
  fi
}

tui_box_h() {
  local desired="${1:-10}"
  if (( desired > DIALOG_HEIGHT )); then
    printf '%d' "$DIALOG_HEIGHT"
  else
    printf '%d' "$desired"
  fi
}

tui_msgbox() {
  local title="$1" text="$2" h="${3:-8}" w="${4:-50}"
  local actual_w actual_h
  actual_w="$(tui_box_w "$w")"
  actual_h="$(tui_box_h "$h")"
  "$DIALOG_CMD" --backtitle "$(tui_backtitle)" --title "$title" --msgbox "$text" "$actual_h" "$actual_w"
}

tui_yesno() {
  local title="$1" prompt="$2" h="${3:-10}" w="${4:-50}"
  local actual_w actual_h
  actual_w="$(tui_box_w "$w")"
  actual_h="$(tui_box_h "$h")"
  "$DIALOG_CMD" --backtitle "$(tui_backtitle)" --title "$title" --yesno "$prompt" "$actual_h" "$actual_w" 3>&1 1>&2 2>&3
}

tui_inputbox() {
  local title="$1" prompt="$2" init="${3:-}" h="${4:-10}" w="${5:-60}"
  local actual_w actual_h
  actual_w="$(tui_box_w "$w")"
  actual_h="$(tui_box_h "$h")"
  "$DIALOG_CMD" --backtitle "$(tui_backtitle)" --title "$title" --inputbox "$prompt" "$actual_h" "$actual_w" "$init" 3>&1 1>&2 2>&3
}

tui_truncate_path() {
  local p="$1" max_len="${2:-35}"
  if (( ${#p} > max_len && max_len > 10 )); then
    local keep=$(( max_len - 4 ))
    printf '...%s' "${p: -keep}"
  else
    printf '%s' "$p"
  fi
}

tui_backtitle() {
  printf 'Claude Code Settings Editor — %s — %s' "$SCOPE" "$TUI_FILE"
}

tui_setup_dialogrc() {
  if [[ "$DIALOG_CMD" == "dialog" ]]; then
    export DIALOGRC
    DIALOGRC="$(mktemp)"
    cat > "$DIALOGRC" << 'RCEOF'
use_shadow = OFF
use_colors = ON
use_scrollbar = ON
visit_items = ON
tab_len = 2
screen_color = (CYAN,BLACK,ON)
dialog_color = (BLACK,WHITE,OFF)
title_color = (CYAN,WHITE,ON)
border_color = (WHITE,WHITE,ON)
button_active_color = (WHITE,CYAN,ON)
button_inactive_color = (BLACK,WHITE,OFF)
button_key_active_color = (WHITE,CYAN,ON)
button_key_inactive_color = (RED,WHITE,OFF)
button_label_active_color = (WHITE,CYAN,ON)
button_label_inactive_color = (BLACK,WHITE,ON)
inputbox_color = (BLACK,WHITE,OFF)
inputbox_border_color = (BLACK,WHITE,OFF)
searchbox_color = (BLACK,WHITE,OFF)
searchbox_title_color = (CYAN,WHITE,ON)
searchbox_border_color = (WHITE,WHITE,ON)
position_indicator_color = (CYAN,WHITE,ON)
menubox_color = (BLACK,WHITE,OFF)
menubox_border_color = (WHITE,WHITE,ON)
item_color = (BLACK,WHITE,OFF)
item_selected_color = (WHITE,CYAN,ON)
tag_color = (CYAN,WHITE,ON)
tag_selected_color = (WHITE,CYAN,ON)
tag_key_color = (RED,WHITE,OFF)
tag_key_selected_color = (RED,CYAN,ON)
check_color = (BLACK,WHITE,OFF)
check_selected_color = (WHITE,CYAN,ON)
uarrow_color = (GREEN,WHITE,ON)
darrow_color = (GREEN,WHITE,ON)
RCEOF
  fi
}

tui_cleanup_dialogrc() {
  if [[ -n "${DIALOGRC:-}" ]] && [[ -f "$DIALOGRC" ]]; then
    rm -f "$DIALOGRC"
  fi
}

tui_enable_mouse() {
  if [[ "$DIALOG_CMD" == "dialog" ]] && [[ -t 1 ]]; then
    # Enable DEC 1000 (normal tracking), 1002 (button-event tracking), 1006 (SGR extended mouse tracking)
    printf '\033[?1000h\033[?1002h\033[?1006h'
  fi
}

tui_disable_mouse() {
  if [[ "$DIALOG_CMD" == "dialog" ]] && [[ -t 1 ]]; then
    # Cleanly restore terminal mouse tracking
    printf '\033[?1006l\033[?1002l\033[?1000l'
  fi
}

tui_handle_winch() {
  tui_dims
}

tui_cleanup() {
  tui_disable_mouse
  tui_cleanup_dialogrc
}

tui_load() {
  TUI_FILE="$(resolve_file "$SCOPE")"
  TUI_JSON="$(read_settings "$TUI_FILE")"
  TUI_DIRTY=false
}

tui_save() {
  if $TUI_DIRTY; then
    ensure_backup "$TUI_FILE"
    write_settings "$TUI_FILE" "$TUI_JSON" "$FORCE"
    TUI_DIRTY=false
    info "Saved $SCOPE settings"
  fi
}

tui_count_category() {
  local cat="$1"
  local count=0
  for path in "${!CATALOG_CATEGORY[@]}"; do
    [[ "${CATALOG_CATEGORY[$path]}" != "$cat" ]] && continue
    local val
    val="$(get_at_path "$TUI_JSON" "$path")"
    if [[ "$val" != "null" ]]; then
      count=$((count + 1))
    fi
  done
  printf '%d' "$count"
}

# ---------------------------------------------------------------------------
# TUI: Scope selector
# ---------------------------------------------------------------------------
tui_select_scope() {
  tui_dims
  local user_file project_file local_file managed_file
  user_file="$(resolve_file user)"
  project_file="$(resolve_file project 2>/dev/null || printf '(not in git repo)')"
  local_file="$(resolve_file local 2>/dev/null || printf '(not in git repo)')"
  managed_file="$(resolve_file managed)"

  local max_path_len=$(( DIALOG_WIDTH - 16 ))
  if (( max_path_len < 15 )); then max_path_len=15; fi
  local disp_user disp_proj disp_local disp_managed
  disp_user="$(tui_truncate_path "$user_file" "$max_path_len")"
  disp_proj="$(tui_truncate_path "$project_file" "$max_path_len")"
  disp_local="$(tui_truncate_path "$local_file" "$max_path_len")"
  disp_managed="$(tui_truncate_path "$managed_file" "$max_path_len")"

  local result
  result="$("$DIALOG_CMD" --backtitle "Claude Code Settings Editor" \
    --title "Select Scope" \
    --radiolist "Choose the settings scope to edit:\n\nUse SPACE to select, ENTER to confirm." \
    "$DIALOG_HEIGHT" "$DIALOG_WIDTH" 4 \
    "user"    "$disp_user"    "$([ "$SCOPE" = "user" ] && printf ON || printf OFF)" \
    "project" "$disp_proj" "$([ "$SCOPE" = "project" ] && printf ON || printf OFF)" \
    "local"   "$disp_local"   "$([ "$SCOPE" = "local" ] && printf ON || printf OFF)" \
    "managed" "$disp_managed" "$([ "$SCOPE" = "managed" ] && printf ON || printf OFF)" \
    3>&1 1>&2 2>&3)" || return 1

  [[ -n "$result" ]] && SCOPE="$result"
  tui_load
}

# ---------------------------------------------------------------------------
# TUI: Boolean editor
# ---------------------------------------------------------------------------
tui_edit_boolean() {
  local path="$1" desc="$2"
  local current
  current="$(get_at_path "$TUI_JSON" "$path")"
  local default_btn="--defaultno"
  [[ "$current" == "true" ]] && default_btn=""

  tui_dims
  if "$DIALOG_CMD" --backtitle "$(tui_backtitle)" \
    --title "$path" \
    $default_btn \
    --yesno "$desc\n\nCurrent: ${current}\n\nSet to true?" \
    "$(tui_box_h 12)" "$(tui_box_w 60)" 3>&1 1>&2 2>&3; then
    TUI_JSON="$(printf '%s' "$TUI_JSON" | jq "$(printf 'setpath(%s; true)' "$(path_to_jq_array "$path")")")"
    TUI_DIRTY=true
  else
    local exit_code=$?
    if [[ $exit_code -eq 1 ]]; then
      TUI_JSON="$(printf '%s' "$TUI_JSON" | jq "$(printf 'setpath(%s; false)' "$(path_to_jq_array "$path")")")"
      TUI_DIRTY=true
    fi
  fi
}

# ---------------------------------------------------------------------------
# TUI: Enum editor
# ---------------------------------------------------------------------------
tui_edit_enum() {
  local path="$1" desc="$2" enum_str="$3"
  local current
  current="$(get_at_path "$TUI_JSON" "$path" | jq -r 'if type == "string" then . else tostring end' 2>/dev/null)"
  [[ "$current" == "null" ]] && current=""

  local items=()
  local IFS='|'
  for val in $enum_str; do
    local state="OFF"
    [[ "$val" == "$current" ]] && state="ON"
    items+=("$val" "" "$state")
  done

  tui_dims
  local result
  result="$("$DIALOG_CMD" --backtitle "$(tui_backtitle)" \
    --title "$path" \
    --radiolist "$desc\n\nCurrent: ${current:-[not set]}" \
    "$DIALOG_HEIGHT" "$DIALOG_WIDTH" "$DIALOG_MENU_HEIGHT" \
    "${items[@]}" \
    3>&1 1>&2 2>&3)" || return 0

  if [[ -n "$result" ]]; then
    TUI_JSON="$(set_at_path "$TUI_JSON" "$path" "$result")"
    TUI_DIRTY=true
  fi
}

# ---------------------------------------------------------------------------
# TUI: String editor
# ---------------------------------------------------------------------------
tui_edit_string() {
  local path="$1" desc="$2"
  local current
  current="$(get_at_path "$TUI_JSON" "$path" | jq -r 'if type == "string" then . else tostring end' 2>/dev/null)"
  [[ "$current" == "null" ]] && current=""

  tui_dims
  local result
  result="$(tui_inputbox "$path" "$desc" "$current" 10 60)" || return 0

  TUI_JSON="$(set_at_path "$TUI_JSON" "$path" "$result")"
  TUI_DIRTY=true
}

# ---------------------------------------------------------------------------
# TUI: Number editor
# ---------------------------------------------------------------------------
tui_edit_number() {
  local path="$1" desc="$2"
  local current
  current="$(get_at_path "$TUI_JSON" "$path")"
  [[ "$current" == "null" ]] && current=""

  tui_dims
  local result
  result="$(tui_inputbox "$path" "$desc\n\nEnter a number:" "$current" 10 60)" || return 0

  if ! [[ "$result" =~ ^-?[0-9]*\.?[0-9]+$ ]]; then
    tui_msgbox "Error" "Invalid number: $result" 8 40
    return 0
  fi
  TUI_JSON="$(set_at_path "$TUI_JSON" "$path" "$result")"
  TUI_DIRTY=true
}

# ---------------------------------------------------------------------------
# TUI: Array (string list) editor
# ---------------------------------------------------------------------------
tui_edit_array() {
  local path="$1" desc="$2"

  while true; do
    local jq_path
    jq_path="$(path_to_jq_array "$path")"
    local arr
    arr="$(printf '%s' "$TUI_JSON" | jq "getpath($jq_path) // []")"
    local count
    count="$(printf '%s' "$arr" | jq 'length')"

    local items=()
    items+=("ADD" "Add new item" "")
    local i=0
    while [[ $i -lt $count ]]; do
      local val
      val="$(printf '%s' "$arr" | jq -r ".[$i] | if type == \"string\" then . else tostring end")"
      items+=("$i" "$val" "")
      i=$((i + 1))
    done

    tui_dims
    local choice
    choice="$("$DIALOG_CMD" --backtitle "$(tui_backtitle)" \
      --title "$path ($count items)" \
      --menu "$desc\n\nSelect item to remove, or ADD new:" \
      "$DIALOG_HEIGHT" "$DIALOG_WIDTH" "$DIALOG_MENU_HEIGHT" \
      "${items[@]}" \
      3>&1 1>&2 2>&3)" || break

    if [[ "$choice" == "ADD" ]]; then
      local new_val
      new_val="$(tui_inputbox "Add to $path" "Enter new value:" "" 10 60)" || continue
      if [[ -n "$new_val" ]]; then
        local typed_val
        typed_val="$(auto_type_value "$new_val")"
        TUI_JSON="$(printf '%s' "$TUI_JSON" | jq "setpath($jq_path; ((getpath($jq_path) // []) | if index($typed_val) then . else . + [$typed_val] end))")"
        TUI_DIRTY=true
      fi
    else
      local item_val
      item_val="$(printf '%s' "$arr" | jq -r ".[$choice]")"
      if tui_yesno "Remove item" "Remove: $item_val ?" 8 60; then
        TUI_JSON="$(printf '%s' "$TUI_JSON" | jq "setpath($jq_path; (getpath($jq_path) | del(.[$choice])))")"
        TUI_DIRTY=true
      fi
    fi
  done
}

# ---------------------------------------------------------------------------
# TUI: Object editor (falls back to $EDITOR)
# ---------------------------------------------------------------------------
tui_edit_object() {
  local path="$1" desc="$2"
  local jq_path
  jq_path="$(path_to_jq_array "$path")"
  local obj
  obj="$(printf '%s' "$TUI_JSON" | jq "getpath($jq_path) // {}")"

  local tmpfile
  tmpfile="$(mktemp --suffix=.json)"
  printf '%s' "$obj" | jq '.' > "$tmpfile"

  local editor="${EDITOR:-${VISUAL:-vi}}"
  "$editor" "$tmpfile"

  if [[ -f "$tmpfile" ]]; then
    local new_obj
    new_obj="$(jq '.' "$tmpfile" 2>/dev/null)" || {
      tui_msgbox "Error" "Invalid JSON — changes discarded." 8 50
      rm -f "$tmpfile"
      return 0
    }
    TUI_JSON="$(printf '%s' "$TUI_JSON" | jq "setpath($jq_path; $new_obj)")"
    TUI_DIRTY=true
  fi
  rm -f "$tmpfile"
}

# ---------------------------------------------------------------------------
# TUI: Setting dispatcher
# ---------------------------------------------------------------------------
tui_edit_setting() {
  local path="$1"
  local type="${CATALOG_TYPE[$path]:-string}"
  local desc="${CATALOG_DESC[$path]:-$path}"
  local enum="${CATALOG_ENUM[$path]:-}"

  if [[ -n "$enum" ]]; then
    tui_edit_enum "$path" "$desc" "$enum"
    return
  fi

  case "$type" in
    boolean) tui_edit_boolean "$path" "$desc" ;;
    string)  tui_edit_string "$path" "$desc" ;;
    integer|number) tui_edit_number "$path" "$desc" ;;
    array)   tui_edit_array "$path" "$desc" ;;
    object)  tui_edit_object "$path" "$desc" ;;
    *)       tui_edit_string "$path" "$desc" ;;
  esac
}

# ---------------------------------------------------------------------------
# TUI: Unset a setting
# ---------------------------------------------------------------------------
tui_unset_setting() {
  local path="$1"
  local current
  current="$(get_at_path "$TUI_JSON" "$path")"
  if [[ "$current" == "null" ]]; then
    return 0
  fi
  if tui_yesno "Unset $path" "Remove this setting?\n\nCurrent value: $current" 10 60; then
    TUI_JSON="$(delete_at_path "$TUI_JSON" "$path")"
    TUI_DIRTY=true
  fi
}

# ---------------------------------------------------------------------------
# TUI: Category view
# ---------------------------------------------------------------------------
tui_category_view() {
  local category="$1"
  local cat_label
  case "$category" in
    general)     cat_label="General & UI" ;;
    permissions) cat_label="Permissions" ;;
    sandbox)     cat_label="Sandboxing" ;;
    env)         cat_label="Environment Variables" ;;
    models)      cat_label="Models & Workflows" ;;
    hooks)       cat_label="Hooks & Status Line" ;;
    mcp)         cat_label="MCP Policy" ;;
    worktree)    cat_label="Worktree & Memory" ;;
    plugins)     cat_label="Plugins & Marketplaces" ;;
    advanced)    cat_label="Advanced / Managed" ;;
    *)           cat_label="$category" ;;
  esac

  while true; do
    local sorted_paths=()
    for p in "${!CATALOG_CATEGORY[@]}"; do
      if [[ "${CATALOG_CATEGORY[$p]}" == "$category" ]]; then
        sorted_paths+=("$p")
      fi
    done
    if [[ ${#sorted_paths[@]} -gt 0 ]]; then
      mapfile -t sorted_paths < <(printf '%s\n' "${sorted_paths[@]}" | sort)
    fi

    local max_desc_len=$(( DIALOG_WIDTH - 36 ))
    if (( max_desc_len < 12 )); then max_desc_len=12; fi

    local items=()
    for path in "${sorted_paths[@]}"; do
      local val
      val="$(get_at_path "$TUI_JSON" "$path")"
      local display
      if [[ "$val" == "null" ]]; then
        display="[not set]"
      else
        display="$(printf '%s' "$val" | jq -r 'if type == "string" then . elif type == "array" then "\(length) items" elif type == "object" then "\(length) keys" else tostring end' 2>/dev/null)"
        [[ ${#display} -gt $max_desc_len ]] && display="${display:0:$((max_desc_len - 3))}..."
      fi
      local type_hint="${CATALOG_TYPE[$path]:-}"
      items+=("$path" "($type_hint) $display")
    done

    [[ ${#items[@]} -eq 0 ]] && {
      tui_msgbox "$cat_label" "No settings in this category." 8 50
      return
    }

    tui_dims
    local choice
    choice="$("$DIALOG_CMD" --backtitle "$(tui_backtitle)" \
      --title "$cat_label" \
      --cancel-label "Back" \
      --extra-button --extra-label "Unset" \
      --menu "Select a setting to edit:" \
      "$DIALOG_HEIGHT" "$DIALOG_WIDTH" "$DIALOG_MENU_HEIGHT" \
      "${items[@]}" \
      3>&1 1>&2 2>&3)"
    local exit_code=$?

    case $exit_code in
      0) [[ -n "$choice" ]] && tui_edit_setting "$choice" ;;
      3) [[ -n "$choice" ]] && tui_unset_setting "$choice" ;;
      *) break ;;
    esac
  done
}

# ---------------------------------------------------------------------------
# TUI: Permission rules editor
# ---------------------------------------------------------------------------
tui_permissions_editor() {
  while true; do
    local deny_count ask_count allow_count dir_count
    deny_count="$(printf '%s' "$TUI_JSON" | jq '.permissions.deny // [] | length')"
    ask_count="$(printf '%s' "$TUI_JSON" | jq '.permissions.ask // [] | length')"
    allow_count="$(printf '%s' "$TUI_JSON" | jq '.permissions.allow // [] | length')"
    dir_count="$(printf '%s' "$TUI_JSON" | jq '.permissions.additionalDirectories // [] | length')"

    tui_dims
    local choice
    choice="$("$DIALOG_CMD" --backtitle "$(tui_backtitle)" \
      --title "Permission Rules" \
      --cancel-label "Back" \
      --menu "Manage permission rules by tier:" \
      "$DIALOG_HEIGHT" "$DIALOG_WIDTH" "$DIALOG_MENU_HEIGHT" \
      "deny"    "Deny rules ($deny_count)" \
      "ask"     "Ask rules ($ask_count)" \
      "allow"   "Allow rules ($allow_count)" \
      "dirs"    "Additional directories ($dir_count)" \
      3>&1 1>&2 2>&3)" || break

    case "$choice" in
      deny|ask|allow) tui_edit_array "permissions.$choice" "Rules evaluated in order. Format: Tool or Tool(pattern)" ;;
      dirs) tui_edit_array "permissions.additionalDirectories" "Extra directories Claude can access" ;;
    esac
  done
}

# ---------------------------------------------------------------------------
# TUI: Environment variables editor
# ---------------------------------------------------------------------------
tui_env_editor() {
  while true; do
    local env_obj
    env_obj="$(printf '%s' "$TUI_JSON" | jq '.env // {}')"
    local keys
    keys="$(printf '%s' "$env_obj" | jq -r 'keys[]' 2>/dev/null)" || keys=""
    local count
    count="$(printf '%s' "$env_obj" | jq 'length')"

    local items=()
    items+=("ADD" "Add new variable")
    if [[ -n "$keys" ]]; then
      while IFS= read -r key; do
        local val
        val="$(printf '%s' "$env_obj" | jq -r ".[\"$key\"]")"
        local display_val
        display_val="$(mask_value "$key" "$val")"
        items+=("$key" "= $display_val")
      done <<< "$keys"
    fi

    tui_dims
    local choice
    choice="$("$DIALOG_CMD" --backtitle "$(tui_backtitle)" \
      --title "Environment Variables ($count)" \
      --cancel-label "Back" \
      --menu "Select variable to edit/remove, or ADD:" \
      "$DIALOG_HEIGHT" "$DIALOG_WIDTH" "$DIALOG_MENU_HEIGHT" \
      "${items[@]}" \
      3>&1 1>&2 2>&3)" || break

    if [[ "$choice" == "ADD" ]]; then
      local new_name
      new_name="$(tui_inputbox "Add Environment Variable" "Variable name (UPPER_CASE):" "" 10 60)" || continue
      if [[ -z "$new_name" ]]; then
        continue
      fi
      if ! printf '%s' "$new_name" | grep -qE '^[A-Z_][A-Z0-9_]*$'; then
        tui_msgbox "Error" "Invalid name. Must match ^[A-Z_][A-Z0-9_]*\$" 8 50
        continue
      fi
      local new_val
      new_val="$(tui_inputbox "Set $new_name" "Value:" "" 10 60)" || continue
      TUI_JSON="$(printf '%s' "$TUI_JSON" | jq --arg k "$new_name" --arg v "$new_val" '.env = ((.env // {}) + {($k): $v})')"
      TUI_DIRTY=true
    else
      local current_val
      current_val="$(printf '%s' "$env_obj" | jq -r ".[\"$choice\"]")"

      tui_dims
      local action
      action="$("$DIALOG_CMD" --backtitle "$(tui_backtitle)" \
        --title "$choice" \
        --menu "Current: $(mask_value "$choice" "$current_val")" \
        "$(tui_box_h 12)" "$(tui_box_w 60)" 3 \
        "edit"   "Edit value" \
        "show"   "Show full value" \
        "delete" "Remove variable" \
        3>&1 1>&2 2>&3)" || continue

      case "$action" in
        edit)
          local new_val
          new_val="$(tui_inputbox "Edit $choice" "New value:" "$current_val" 10 60)" || continue
          TUI_JSON="$(printf '%s' "$TUI_JSON" | jq --arg k "$choice" --arg v "$new_val" '.env[$k] = $v')"
          TUI_DIRTY=true
          ;;
        show)
          tui_msgbox "$choice" "$current_val" 10 70
          ;;
        delete)
          if tui_yesno "Delete $choice" "Remove $choice from environment variables?" 8 50; then
            TUI_JSON="$(printf '%s' "$TUI_JSON" | jq --arg k "$choice" 'if .env then .env |= del(.[$k]) else . end')"
            TUI_DIRTY=true
          fi
          ;;
      esac
    fi
  done
}

# ---------------------------------------------------------------------------
# TUI: Save confirmation
# ---------------------------------------------------------------------------
tui_confirm_save() {
  if ! $TUI_DIRTY; then
    return 0
  fi
  tui_dims
  tui_yesno "Unsaved Changes" "You have unsaved changes.\n\nSave before exiting?" 10 50
  local exit_code=$?
  case $exit_code in
    0) tui_save ;;
    1) dim "Changes discarded" ;;
    255) return 1 ;;
  esac
  return 0
}

# ---------------------------------------------------------------------------
# TUI: Main menu
# ---------------------------------------------------------------------------
tui_main_menu() {
  tui_load

  while true; do
    local gen_c perm_c sand_c env_c mod_c hook_c mcp_c wt_c plug_c
    gen_c="$(tui_count_category general)"
    perm_c="$(tui_count_category permissions)"
    sand_c="$(tui_count_category sandbox)"
    env_c="$(printf '%s' "$TUI_JSON" | jq '.env // {} | length')"
    mod_c="$(tui_count_category models)"
    hook_c="$(tui_count_category hooks)"
    mcp_c="$(tui_count_category mcp)"
    wt_c="$(tui_count_category worktree)"
    plug_c="$(tui_count_category plugins)"

    tui_dims
    local choice
    choice="$("$DIALOG_CMD" --backtitle "$(tui_backtitle)" \
      --title "Main Menu" \
      --cancel-label "Quit" \
      --menu "Select a category to configure:" \
      "$DIALOG_HEIGHT" "$DIALOG_WIDTH" "$DIALOG_MENU_HEIGHT" \
      "general"     "General & UI ($gen_c configured)" \
      "permissions" "Permissions ($perm_c configured)" \
      "perm-rules"  "  Permission Rules Editor" \
      "sandbox"     "Sandboxing ($sand_c configured)" \
      "env"         "Environment Variables ($env_c vars)" \
      "models"      "Models & Workflows ($mod_c configured)" \
      "hooks"       "Hooks & Status Line ($hook_c configured)" \
      "mcp"         "MCP Policy ($mcp_c configured)" \
      "worktree"    "Worktree & Memory ($wt_c configured)" \
      "plugins"     "Plugins & Marketplaces ($plug_c configured)" \
      "---"         "─────────────────" \
      "scope"       "Switch Scope" \
      "import"      "Import File" \
      "export"      "Export / Save" \
      "backup"      "Create Backup" \
      "validate"    "Validate Settings" \
      "editor"      "Open in \$EDITOR" \
      3>&1 1>&2 2>&3)"
    local exit_code=$?

    if [[ $exit_code -ne 0 ]]; then
      tui_confirm_save || continue
      break
    fi

    case "$choice" in
      general|permissions|sandbox|models|hooks|mcp|worktree|plugins)
        tui_category_view "$choice"
        ;;
      perm-rules)
        tui_permissions_editor
        ;;
      env)
        tui_env_editor
        ;;
      scope)
        tui_confirm_save || continue
        tui_select_scope || true
        ;;
      import)
        local import_path
        import_path="$(tui_inputbox "Import Settings" "Path to JSON file:" "" 10 60)" || continue
        if [[ -n "$import_path" ]] && [[ -f "$import_path" ]]; then
          local imported
          imported="$(jq '.' "$import_path" 2>/dev/null)" || {
            tui_msgbox "Error" "Invalid JSON file" 8 40
            continue
          }
          TUI_JSON="$imported"
          TUI_DIRTY=true
        fi
        ;;
      export)
        tui_save
        ;;
      backup)
        ensure_backup "$TUI_FILE"
        tui_msgbox "Backup" "Backup created." 8 40
        ;;
      validate)
        local val_output
        val_output="$(validate_settings "$TUI_JSON" 2>&1)" || true
        tui_msgbox "Validation" "$val_output" 15 70
        ;;
      editor)
        tui_save
        local editor="${EDITOR:-${VISUAL:-vi}}"
        "$editor" "$TUI_FILE"
        tui_load
        ;;
      "---") ;;
    esac
  done
}

# ---------------------------------------------------------------------------
# TUI: Entry point
# ---------------------------------------------------------------------------
cmd_tui() {
  tui_require_dialog
  tui_dims
  tui_setup_dialogrc
  tui_enable_mouse

  trap tui_cleanup EXIT INT TERM
  trap 'tui_handle_winch' WINCH

  tui_select_scope || {
    tui_cleanup
    trap - EXIT INT TERM WINCH
    return 0
  }
  tui_main_menu
  tui_cleanup
  trap - EXIT INT TERM WINCH
}

# ===========================================================================
#  Help & Usage
# ===========================================================================
show_help() {
  cat << EOF
${C_BOLD}Claude Code Settings Editor v${VERSION}${C_RESET}
Bash CLI & TUI for editing Claude Code settings.json

${C_BOLD}USAGE${C_RESET}
  $SCRIPT_NAME [--scope SCOPE] [COMMAND] [ARGS...]

${C_BOLD}SCOPES${C_RESET}
  user      ~/.claude/settings.json (default)
  project   .claude/settings.json (git root)
  local     .claude/settings.local.json (git root)
  managed   /etc/claude-code/managed-settings.json

${C_BOLD}COMMANDS${C_RESET}
  ${C_CYAN}(none)${C_RESET}            Launch interactive TUI (default)
  ${C_CYAN}tui${C_RESET}               Launch interactive TUI
  ${C_CYAN}show${C_RESET}              Pretty-print current settings
  ${C_CYAN}get${C_RESET} PATH          Get value at JSON path
  ${C_CYAN}set${C_RESET} PATH VALUE    Set value at JSON path
  ${C_CYAN}delete${C_RESET} PATH       Delete key at JSON path
  ${C_CYAN}list${C_RESET}              List known settings with types
  ${C_CYAN}validate${C_RESET}          Validate settings file
  ${C_CYAN}edit${C_RESET}              Open in \$EDITOR with validation
  ${C_CYAN}import${C_RESET} FILE       Import from JSON file
  ${C_CYAN}export${C_RESET}            Export settings to file/stdout
  ${C_CYAN}diff${C_RESET} [S1] [S2]    Diff two scope files
  ${C_CYAN}backup${C_RESET}            Create timestamped backup
  ${C_CYAN}restore${C_RESET} FILE      Restore from backup
  ${C_CYAN}reset${C_RESET}             Reset to empty settings
  ${C_CYAN}permissions${C_RESET} CMD   Permission rule management
  ${C_CYAN}env${C_RESET} CMD           Environment variable management
  ${C_CYAN}array${C_RESET} CMD PATH    Array manipulation
  ${C_CYAN}completions${C_RESET}       Output shell completions

${C_BOLD}PERMISSIONS SUBCOMMANDS${C_RESET}
  list, add-allow RULE, add-ask RULE, add-deny RULE, remove RULE, add-dir PATH

${C_BOLD}ENV SUBCOMMANDS${C_RESET}
  list, get NAME, set NAME VALUE, delete NAME, catalog

${C_BOLD}ARRAY SUBCOMMANDS${C_RESET}
  list PATH, add PATH VALUE, remove PATH VALUE, move PATH FROM TO

${C_BOLD}FLAGS${C_RESET}
  --scope SCOPE     Target scope (user|project|local|managed)
  --raw             Output raw values (no formatting)
  --json            Output structured JSON
  --force           Allow writes to managed scope
  --category CAT    Filter by category (for list/env catalog)
  --output FILE     Output file (for export)
  --help, -h        Show this help
  --version, -v     Show version

${C_BOLD}EXAMPLES${C_RESET}
  $SCRIPT_NAME                                      # Launch TUI
  $SCRIPT_NAME show                                  # Show user settings
  $SCRIPT_NAME get theme                             # Get theme value
  $SCRIPT_NAME set theme dark                        # Set theme to dark
  $SCRIPT_NAME set effortLevel high --scope project  # Set in project scope
  $SCRIPT_NAME permissions add-allow "Bash(npm run *)"
  $SCRIPT_NAME env set ANTHROPIC_MODEL claude-opus-5
  $SCRIPT_NAME array add sandbox.network.allowedDomains github.com
  $SCRIPT_NAME diff user project                     # Compare scopes
  $SCRIPT_NAME validate --scope project              # Validate project settings
EOF
}

# ===========================================================================
#  Argument Parsing & Dispatch
# ===========================================================================
SCOPE="user"
RAW_OUTPUT="false"
JSON_OUTPUT="false"
FORCE="false"
LIST_CATEGORY=""
EXPORT_OUTPUT=""
ENV_CATALOG_CATEGORY=""

main() {
  local positional=()

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --scope)
        SCOPE="${2:?--scope requires a value}"
        shift 2
        ;;
      --raw)
        RAW_OUTPUT="true"
        shift
        ;;
      --json)
        JSON_OUTPUT="true"
        RAW_OUTPUT="true"
        shift
        ;;
      --force)
        FORCE="true"
        shift
        ;;
      --category)
        LIST_CATEGORY="${2:?--category requires a value}"
        ENV_CATALOG_CATEGORY="$2"
        shift 2
        ;;
      --output)
        EXPORT_OUTPUT="${2:?--output requires a value}"
        shift 2
        ;;
      --help|-h)
        show_help
        exit 0
        ;;
      --version|-v)
        printf 'claude-settings %s\n' "$VERSION"
        exit 0
        ;;
      --)
        shift
        positional+=("$@")
        break
        ;;
      -*)
        die "Unknown flag: $1 (try --help)"
        ;;
      *)
        positional+=("$1")
        shift
        ;;
    esac
  done

  local cmd="${positional[0]:-}"
  if [[ -z "$cmd" ]]; then
    if [[ -t 0 ]] && [[ -t 1 ]] && [[ "${TERM:-dumb}" != "dumb" ]]; then
      cmd="tui"
    else
      cmd="show"
    fi
  fi
  case "$cmd" in
    tui)        cmd_tui ;;
    show)       cmd_show ;;
    get)        cmd_get "${positional[1]:?Path required (e.g., theme)}" ;;
    set)        cmd_set "${positional[1]:?Path required}" "${positional[2]:?Value required}" ;;
    delete)     cmd_delete "${positional[1]:?Path required}" ;;
    list)       cmd_list ;;
    validate)   cmd_validate ;;
    edit)       cmd_edit ;;
    import)     cmd_import "${positional[1]:?File required}" ;;
    export)     cmd_export "${EXPORT_OUTPUT:-${positional[1]:-}}" ;;
    diff)       cmd_diff "${positional[1]:-user}" "${positional[2]:-project}" ;;
    backup)     cmd_backup ;;
    restore)    cmd_restore "${positional[1]:?Backup file required}" ;;
    reset)      cmd_reset ;;
    permissions) cmd_permissions "${positional[@]:1}" ;;
    env)         cmd_env "${positional[@]:1}" ;;
    array)       cmd_array "${positional[@]:1}" ;;
    completions) cmd_completions ;;
    help)        show_help ;;
    *)           die "Unknown command: $cmd (try --help)" ;;
  esac
}

main "$@"
