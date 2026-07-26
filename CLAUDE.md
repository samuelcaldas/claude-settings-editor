# Claude Settings Editor — Codebase

Single-file static web app. No build step. No dependencies.

## File Structure

```
index.html        Main editor — all HTML, CSS, JS in one file
sample.json       Public sample settings (placeholder values, no real keys)
artifacts/        Gitignored — store your personal settings.json here locally
README.md         User documentation
```

## Key JS Functions (index.html)

| Function | Purpose |
|----------|---------|
| `loadSample()` | Fetches `./sample.json`, sets `state`, re-renders |
| `renderForm()` | Populates all form fields from `state` |
| `formToState()` | Reads all form fields back into `state` |
| `syncJsonEditor()` | Serializes `state` → Advanced JSON textarea |
| `onJsonChange()` | Parses JSON textarea → `state` → re-renders form |
| `onFormChange()` | Debounced: calls `formToState()` + `syncJsonEditor()` |
| `downloadFile()` | Triggers `settings.json` download of current `state` |
| `renderFallbackList()` | Rebuilds fallback models drag-reorder list |
| `renderPluginList()` | Rebuilds plugin toggle list |
| `renderHooks()` | Rebuilds hooks editor |

## Extending

To add a new settings field:
1. Add an input element in the relevant tab panel with a unique `id`
2. Add `oninput="onFormChange()"` or `onchange="onFormChange()"`
3. In `formToState()`: read from the element and set `state.fieldName`
4. In `renderForm()`: call `setField('id', state.fieldName)` or `setCheck('id', state.fieldName)`

## State Flow

```
loadSample() → state → renderForm() → DOM
DOM change   → onFormChange() → formToState() → state → syncJsonEditor()
JSON edit    → onJsonChange() → state → renderForm()
Download     → formToState() → JSON.stringify(state)
```
