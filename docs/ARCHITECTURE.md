# Architecture

Technical reference for contributors and anyone extending GoodPrompts.

---

## Overview

GoodPrompts is a VS Code extension with two independently-compiled halves that communicate via postMessage:

```
┌─────────────────────────────────────────────────────┐
│                  VS Code Extension                   │
│                                                     │
│  ┌──────────────────┐      ┌─────────────────────┐  │
│  │  Webview Panel   │      │  Extension Host      │  │
│  │  (React 18, web) │◄────►│  (Node.js, CommonJS) │  │
│  └──────────────────┘      └──────────┬──────────┘  │
│                                       │             │
│                          ┌────────────┼──────────┐  │
│                          │            │          │  │
│                    VS Code API   globalState    git  │
│                    (editor,      (settings,   (diff) │
│                     workspace)    library)           │
└─────────────────────────────────────────────────────┘
```

The extension host has access to all VS Code APIs. The webview is an isolated browser-like context — it cannot call VS Code APIs directly. All communication flows through structured messages.

---

## Directory layout

```
src/
├── shared/types.ts               Single source of truth for all types
├── extension/                    Node.js — has access to vscode module
│   ├── extension.ts
│   ├── GoodPromptsPanel.ts
│   ├── GoodPromptsViewProvider.ts
│   ├── mcpManager.ts
│   ├── autoDetect.ts
│   ├── contextCapture.ts
│   └── settingsManager.ts
└── webview/                      Browser — no access to vscode module
    ├── index.tsx
    ├── App.tsx
    ├── hooks/useVSCode.ts
    ├── utils/promptGenerator.ts
    ├── utils/scorer.ts
    └── components/
```

Both sides import from `src/shared/types.ts`. The webpack alias `@shared` resolves to that directory from the webview bundle; the extension host uses a relative `../shared/types` import.

---

## Build system

Webpack produces two bundles from a single `webpack.config.js` that exports an array:

### Bundle 1 — Extension host

```js
{
  target: 'node',
  entry: './src/extension/extension.ts',
  output: { libraryTarget: 'commonjs2', filename: 'out/extension/extension.js' },
  externals: { vscode: 'commonjs vscode' }
}
```

The `vscode` module is marked external — VS Code injects it at runtime. Everything else (including `child_process`, `path`, `fs`) is available as native Node.js builtins.

### Bundle 2 — Webview

```js
{
  target: 'web',
  entry: './src/webview/index.tsx',
  output: { filename: 'out/webview/index.js' }
}
```

Compiled as a standard browser bundle. React and all UI code is included. The VS Code API is accessed only through `acquireVsCodeApi()`, which VS Code injects as a global when the webview loads.

### TypeScript configs

Two separate configs exist because the extension host and webview have different module systems:

| Config | Module | JSX | Used by |
|---|---|---|---|
| `tsconfig.json` | `commonjs` | — | Extension host |
| `tsconfig.webview.json` | `ES2015` | `react` | Webview |

---

## Extension host

### `extension.ts`

Entry point. VS Code calls `activate(context)` on load:
- Registers the `goodPrompts.open` command
- Registers `GoodPromptsViewProvider` as the sidebar view for the secondary sidebar
- Calls `GoodPromptsPanel.createOrShow` on activation so the panel opens automatically

### `GoodPromptsViewProvider.ts`

Implements `vscode.WebviewViewProvider` for the secondary sidebar. Manages the sidebar webview lifecycle independently of the floating panel, handling the same message protocol as `GoodPromptsPanel`.

### `GoodPromptsPanel.ts`

Owns the `vscode.WebviewPanel` lifecycle. Key responsibilities:

**Panel creation** (`createOrShow`): Creates a singleton panel. If one already exists, brings it to front. Sets `enableScripts: true` and `retainContextWhenHidden: true` so the React app stays alive when the panel is hidden.

**HTML generation** (`_getHtmlForWebview`): Produces the webview HTML with a nonce-based Content Security Policy. The script URI is resolved via `webview.asWebviewUri` so VS Code can serve it from the extension directory.

**Message routing** (`_panel.webview.onDidReceiveMessage`):

| Incoming message | Action |
|---|---|
| `ready` | Detect context, load settings and library, send `init` |
| `saveSettings` | Persist via SettingsManager, re-detect context, send `contextUpdated` |
| `copyPrompt` | Write to clipboard via `vscode.env.clipboard.writeText` |
| `saveToLibrary` | Persist via SettingsManager, send `promptSaved` back |
| `refreshContext` | Re-run context detection, send `contextUpdated` |

**Active editor listener**: `vscode.window.onDidChangeActiveTextEditor` triggers a re-detect and sends `contextUpdated` so the webview stays in sync as you switch files.

### `autoDetect.ts`

Reads passive signals from the workspace — no user interaction required.

**Language detection**: Maps file extension to language name. Falls back to `editor.document.languageId` for unknown extensions.

**AI tool detection**: First checks installed VS Code extensions, then falls back to workspace marker files:

Extension-based (checked first):
1. `anthropic.claude-code` → `claude-code`
2. `GitHub.copilot` or `GitHub.copilot-chat` → `copilot`
3. `openai.chatgpt` → `chatgpt`
4. `Google.gemini-code-assist` → `gemini`

File-based fallbacks:
1. `CLAUDE.md` in workspace root → `claude-code`
2. `.github/copilot-instructions.md` → `copilot`

Returns `null` if none match (webview falls back to `globalSettings.defaultTool`).

**Graceful degradation**: All workspace API calls are guarded. Missing workspace, no active editor, or failed filesystem checks all return empty strings rather than throwing.

### `mcpManager.ts`

Manages connections to MCP (Model Context Protocol) servers. Exposes methods to:
- Connect to / disconnect from a configured server
- List available resources and tools on a connected server
- Invoke a tool and return the result as a string

Connections are held in memory for the extension's lifetime. Errors are surfaced as `error` messages to the webview.

### `contextCapture.ts`

Four async capture functions, all fail-safe:

**`captureCodeSnippet()`**: Returns selected text if a selection exists, along with the start/end line numbers as `codeSnippetLineRange`. Otherwise returns the visible range of the active editor, capped at 100 lines.

**`captureGitDiff()`**: Spawns `git diff HEAD` via `child_process.exec`. Limits output to 200 lines. Returns empty string if git is unavailable or the command fails.

**`captureTerminalError()`**: VS Code does not expose terminal output programmatically. Returns an empty string — the ContextSection component prompts the user to paste their error.

**`captureTestFile(activeFilePath)`**: Looks for a test file alongside the source file. Checks for `*.test.<ext>`, `*.spec.<ext>`, and `__tests__/<basename>.<ext>` variants. Reads and returns the file content if found.

### `settingsManager.ts`

Wraps `vscode.ExtensionContext.globalState`:

- Settings key: `goodprompts.globalSettings`
- Library key: `goodprompts.library`
- Library is capped at 100 entries (oldest removed first)
- Provides typed defaults for both settings and library

---

## Webview

### `index.tsx`

React 18 entry. Creates the root, renders `<App />`, then posts `{ type: 'ready' }` to the extension host to trigger the initial `init` message.

### `App.tsx`

The single stateful component. All state lives here and is passed down as props. Two values are derived via `useMemo`:

- `generatedPrompt` — recomputed whenever any form field, attachment, settings, or context changes
- `qualityScore` — recomputed on the same dependencies

The `window.addEventListener('message')` handler receives all messages from the extension host and updates state accordingly. The `init` message is the bootstrap — it populates settings, context, library, and the detected tool in one shot.

### `hooks/useVSCode.ts`

Lazily acquires the VS Code API singleton via `acquireVsCodeApi()` (which can only be called once per webview). Exports a `postMessage` helper that wraps the typed `WebviewMessage` union.

### `utils/promptGenerator.ts`

A pure function `generatePrompt(params: GeneratePromptParams): string` that dispatches to one of four tool-specific generators. No state, no side effects, fully deterministic.

Each generator is a switch over the four task types, giving 16 distinct templates:

| | Bug Fix | Feature | Refactor | Code Review |
|---|---|---|---|---|
| **Claude Code** | File reference + constraints-first | User story + scope boundaries | File reference + goal + constraints | Focus areas + depth |
| **Copilot** | Role prime + code snippet + error | Role prime + user story | Role prime + current state | Role prime + focus |
| **ChatGPT** | ## sections (Context/Problem/Expected/Output) | ## sections (Context/Story/Criteria/Output) | ## sections (Current/Goal/Constraints/Output) | ## sections (Context/Review/Output) |
| **Gemini** | Numbered steps, constraints doubled, line limit | Numbered steps, scope doubled, line limit | Numbered steps, constraints doubled, line limit | Numbered steps, exclusions doubled, line limit |

`other` falls back to the ChatGPT format.

`buildContextBlock` is a shared helper that assembles the optional context attachments (code snippet, terminal error, git diff, test file) into a formatted block.

### `utils/scorer.ts`

A pure function `computeScore(params: ScorerParams): QualityScore`. No network calls. Runs in < 1ms.

Four dimensions, each 0–25:

**Clarity**
- +10 if the primary field for the current task type has ≥ 20 characters
- +10 if that field isn't a single vague verb (fix, update, change, improve, do, make, help)
- +5 if the target tool is not `other`

**Context**
- +10 if an active file was detected
- +5 if at least one context attachment is enabled
- +5 if language or framework is set in global settings
- +5 if a project name was detected

**Scope** — task-specific:
- Bug Fix: +15 constraints filled, +10 expected behaviour filled
- Feature: +15 scope boundaries filled, +10 acceptance criteria filled
- Refactor: +15 constraints filled, +10 refactor goal selected
- Code Review: +15 any focus areas selected, +10 review depth set

**Expected Output**
- +10 if an output format field is filled (targetOutputFormat for refactor, reviewDepth for code review)
- +15 if the selected tool's template reliably produces explicit output instructions (copilot, chatgpt, gemini always qualify; claude-code qualifies if its key constraint fields are filled)

Suggestions are appended to the result for any dimension scoring below 15 out of 25.

---

## Component tree

```
App
├── (header)                  Inline — title + settings gear button
├── GlobalSettings            Modal — shown when showSettings=true (includes MCP server config)
├── TaskTypeSelector          4-button tab bar
├── TargetToolSelector        5-button group + auto-detected badge
├── ContextSection            Detected context display + attachment checkboxes + line range
├── MCPSection                Connected servers, resource browser, tool invoker
├── (task form section)
│   ├── BugFixForm            4 fields
│   ├── FeatureForm           6 fields + assembled user story preview
│   ├── RefactorForm          4 fields
│   └── CodeReviewForm        Focus area checkboxes + review depth radio
├── QualityScorer             Total score + 4 sub-scores + suggestions
├── PromptPreview             Pre block with color-coded content
├── ActionButtons             Copy / Save / Reset
└── (saved prompts list)      Last 5 library items
```

All components receive only the state slice they need and a typed `onChange` callback. No shared context, no prop drilling beyond one level.

---

## Styling

All styles are inline (`style={{ ... }}`) using VS Code CSS custom properties:

| Variable | Usage |
|---|---|
| `--vscode-editor-background` | Page background |
| `--vscode-editor-foreground` | Body text |
| `--vscode-sideBar-background` | Section card background |
| `--vscode-panel-border` | Card borders, dividers |
| `--vscode-input-background` | Input field backgrounds |
| `--vscode-input-foreground` | Input text |
| `--vscode-input-border` | Input borders |
| `--vscode-button-background` | Primary button background |
| `--vscode-button-foreground` | Primary button text |
| `--vscode-button-hoverBackground` | Button hover state |
| `--vscode-focusBorder` | Focus ring |
| `--vscode-font-family` | All typography |
| `--vscode-font-size` | Base font size |

This ensures the panel respects VS Code's light, dark, and high-contrast themes automatically.

---

## Data persistence

All persistence is via `vscode.ExtensionContext.globalState` — no external database, no filesystem writes, no network.

| Key | Type | Notes |
|---|---|---|
| `goodprompts.globalSettings` | `GlobalSettings` | Shared across all workspaces |
| `goodprompts.library` | `LibraryPrompt[]` | Max 100 entries, LIFO eviction |

---

## Adding a new task type

1. Add the new value to `TaskType` in `src/shared/types.ts`
2. Define a fields interface in `src/shared/types.ts`
3. Add a case to each tool generator in `src/webview/utils/promptGenerator.ts`
4. Add scoring logic in `src/webview/utils/scorer.ts` (Scope dimension)
5. Create the form component in `src/webview/components/`
6. Add the case to `renderTaskForm()` in `App.tsx`
7. Add the button label to `TaskTypeSelector.tsx`

## Adding a new target tool

1. Add the value to `TargetTool` in `src/shared/types.ts`
2. Write the generator function in `src/webview/utils/promptGenerator.ts` and add its case to `generatePrompt`
3. Update the Expected Output scoring rules in `scorer.ts`
4. Add the button label/id to `TargetToolSelector.tsx`
5. Add a detection signal to `autoDetect.ts` if applicable
