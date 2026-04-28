# Contributing

## Prerequisites

- Node.js 18 LTS or later
- VS Code 1.85 or later
- Git

## Setup

```bash
npm install
npm run build
```

Open the project in VS Code and press **F5** to launch the Extension Development Host. The GoodPrompts panel will open automatically in the new window.

## Development workflow

```bash
npm run watch
```

Webpack watches both the extension host and webview bundles and rebuilds on change. After a rebuild, reload the Extension Development Host window (`Ctrl+R` / `Cmd+R`) to pick up the changes.

## Project layout

```
src/shared/    — TypeScript types shared by both halves
src/extension/ — Extension host (Node.js, has access to vscode module)
src/webview/   — Webview UI (React 18, browser context)
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a full technical breakdown.

## Key constraints

**Types in `src/shared/types.ts` only.** Never duplicate type definitions between the extension host and the webview. Both sides import from the shared file.

**No network calls in Phase 1.** The prompt generator and quality scorer are pure client-side functions. Keep them that way. Network calls belong in `GoodPromptsPanel.ts` in the extension host, gated behind a future phase.

**Graceful degradation everywhere.** All VS Code API calls in the extension host must handle the case where the API returns `undefined` (no active editor, no workspace, etc.). Return empty strings, not thrown errors.

**VS Code CSS variables for all styling.** Do not hardcode colours. Use the `--vscode-*` custom properties so the panel respects all VS Code themes.

## Adding a new task type

1. Add the value to `TaskType` in `src/shared/types.ts`
2. Define a fields interface in `src/shared/types.ts`
3. Add a case to each of the four tool generators in `promptGenerator.ts`
4. Add scoring logic for the Scope dimension in `scorer.ts`
5. Create `src/webview/components/<TaskName>Form.tsx`
6. Add the case to `renderTaskForm()` in `App.tsx`
7. Add the button label in `TaskTypeSelector.tsx`

## Adding a new target tool

1. Add the value to `TargetTool` in `src/shared/types.ts`
2. Write `generateXxxPrompt()` in `promptGenerator.ts` covering all four task types
3. Add its case to the `generatePrompt` switch
4. Update Expected Output scoring in `scorer.ts`
5. Add the button in `TargetToolSelector.tsx`
6. Optionally add an auto-detection signal in `autoDetect.ts`

## Builds

| Command | Output |
|---|---|
| `npm run build` | Production bundles in `out/` |
| `npm run watch` | Development rebuild on save |
| `npm run vscode:prepublish` | Same as `build` (called by vsce) |

## Packaging

```bash
npm install -g @vscode/vsce
vsce package
```

This produces a `.vsix` file that can be installed via **Extensions: Install from VSIX** in VS Code.
