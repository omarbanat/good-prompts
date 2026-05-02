# GoodPrompts

A VS Code extension that turns vague AI prompts into structured, model-optimized requests — without slowing you down.

GoodPrompts sits between you and your AI coding assistant. Fill in a structured form, get a real-time quality score, and copy a prompt that's specifically formatted for your target tool (Claude Code, Copilot, ChatGPT, or Gemini).

---

## Features

- **4 task types** — Bug Fix, Feature Request, Refactor, Code Review — each with its own form fields
- **4 model-specific prompt templates** — the same task produces a different, optimized prompt for each AI tool
- **Real-time quality scorer** — 0–100 score across Clarity, Context, Scope, and Expected Output, computed locally with no API call
- **Auto-detection** — active file, language, project name, and target AI tool detected passively from your workspace
- **Context injection** — attach code snippet (with line range), git diff, terminal error, or test file with one checkbox each
- **MCP integration** — connect to MCP servers, browse resources, and invoke tools; selected items are injected into the generated prompt
- **Personal prompt library** — save and reuse prompts across sessions
- **Fully offline** — the form, scorer, and prompt generator all work without network access (MCP connections are optional)

---

## Installation

### From VSIX (recommended)

Download the latest `.vsix` from the [releases page](https://github.com/omarbanat/good-prompts/releases), then install it in VS Code:

```
Extensions: Install from VSIX...
```

Or from the terminal:

```bash
code --install-extension goodprompts-0.3.0.vsix
```

### From source (development)

```bash
git clone <repo>
cd good-prompts
npm install
npm run build
```

Then press **F5** in VS Code to open an Extension Development Host with GoodPrompts loaded.

### Run in watch mode

```bash
npm run watch
```

Webpack will rebuild both bundles on every file change. Re-run the Extension Development Host to pick up changes.

---

## Usage

Open the GoodPrompts panel via the activity bar icon (left sidebar) or run **GoodPrompts: Open Panel** from the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).

### Step 1 — Pick a task type

| Task | Use when |
|---|---|
| Bug Fix | Something is broken and you know what it is |
| Feature Request | You want to add new behaviour |
| Refactor | The code works but needs restructuring |
| Code Review | You want the AI to review existing code |

### Step 2 — Select your target AI tool

GoodPrompts auto-detects the tool from your workspace, first by checking installed VS Code extensions, then by falling back to project files:

| Signal | Detected tool |
|---|---|
| `anthropic.claude-code` extension installed | Claude Code |
| `GitHub.copilot` or `GitHub.copilot-chat` extension installed | GitHub Copilot |
| `openai.chatgpt` extension installed | ChatGPT |
| `Google.gemini-code-assist` extension installed | Gemini |
| `CLAUDE.md` in project root | Claude Code |
| `.github/copilot-instructions.md` in project root | GitHub Copilot |
| None of the above | Uses your default from Settings |

The auto-detected tool is shown with a badge. You can override it at any time.

### Step 3 — Configure global settings (once)

Click the ⚙ gear icon to set your language, runtime, framework, style guide, and default AI tool. These are saved across sessions and pre-filled into every prompt automatically.

### Step 4 — Fill in the form

Each task type has its own fields:

**Bug Fix**
- What is broken (required)
- Expected behaviour (required)
- Actual behaviour (auto-filled from terminal error attachment if enabled)
- Constraints — e.g. "do not change the function signature" (optional)

**Feature Request**
- User story — role / goal / reason, assembled into "As a [role], I want [goal], so that [reason]"
- Acceptance criteria (required)
- Scope boundaries — what must NOT be changed (required)
- Dependencies / constraints (optional)

**Refactor**
- Current state description (required)
- Refactor goal — performance, readability, security, or testability (required)
- Constraints — e.g. "no new dependencies, keep same public API" (required)
- Target output format — e.g. "inline comments explaining changes" (optional)

**Code Review**
- Focus areas — checkboxes: security, performance, readability, correctness, test coverage
- Known issues to exclude (optional)
- Review depth — Quick Scan or Thorough Review

### Step 5 — Attach context (optional)

The Context section shows what was auto-detected (file, project, language). Optionally attach:

- **Code snippet** — selected text or visible range (up to 100 lines)
- **Git diff** — `git diff HEAD`, limited to 200 lines
- **Terminal error** — paste in your stack trace
- **Test file** — looks for `*.test.ts` / `*.spec.ts` / `__tests__/*` matching the active file

Each attachment shows its character count before you enable it.

### Step 6 — Read the quality score

The scorer runs locally on every keystroke and gives you a score from 0–100:

| Score | Status |
|---|---|
| 0–49 | Not ready |
| 50–74 | Needs improvement |
| 75–100 | Ready to submit |

Four sub-scores are shown: **Clarity** (0–25), **Context** (0–25), **Scope** (0–25), **Expected Output** (0–25). When the score is below 60, inline suggestions explain exactly what is missing.

### Step 7 — Copy and use the prompt

- **Copy Prompt** — writes the generated prompt to your clipboard
- **Save to Library** — saves the prompt with a title; accessible in the Saved Prompts section at the bottom of the panel
- **Reset** — clears all task-specific fields and attachments while keeping your global settings

---

## Model-specific prompt formats

The same task produces a different prompt depending on the target tool.

### Claude Code

Short and direct. References files by name only (Claude Code already has your repo). Leads with scope constraints. Appends "Do not modify any other files."

```
In `middleware/auth.ts`, fix the following bug.

What is broken: JWT expiry returns 500 instead of 401
Expected behavior: Return HTTP 401 with { "error": "Token expired" }
Actual behavior: Server crashes with 500

Constraints: do not change the function signature
Do not modify any other files.
Return only the modified code with inline comments.
```

### GitHub Copilot

Role-primed. Injects code snippet and stack trace directly. Closes with "Provide only the corrected code block."

```
You are a senior TypeScript engineer working on an Express application.

```
[code snippet]
```

Error:
[stack trace]

Issue: JWT expiry returns 500 instead of 401
Expected behavior: Return HTTP 401 with { "error": "Token expired" }
Provide only the corrected code block.
```

### ChatGPT

Fully structured with labelled markdown sections: Context, Code, Problem, Expected Behavior, Constraints, Output Format.

### Gemini

Numbered steps. Constraints stated twice. Explicit `Keep your response under 500 lines.` at the end.

---

## Architecture

```
VS Code Extension
├── Extension Host (Node.js)          src/extension/
│   ├── extension.ts                  Registers command and sidebar view provider
│   ├── GoodPromptsPanel.ts           WebviewPanel lifecycle + message routing
│   ├── GoodPromptsViewProvider.ts    Sidebar view provider (secondary sidebar)
│   ├── mcpManager.ts                 MCP server connection management
│   ├── autoDetect.ts                 Detects installed extensions + workspace file signals
│   ├── contextCapture.ts             Captures code snippet (with line range), git diff, test file
│   └── settingsManager.ts            Persists settings + library via globalState
│
├── Shared Types                       src/shared/types.ts
│
└── Webview UI (React 18)             src/webview/
    ├── App.tsx                        All state; useMemo for prompt + score
    ├── hooks/useVSCode.ts             acquireVsCodeApi() wrapper
    ├── utils/promptGenerator.ts       16 model×task templates (pure function)
    ├── utils/scorer.ts                0–100 scorer (pure function, no API)
    └── components/                    11 React components, VS Code CSS variables
```

### Extension host ↔ Webview communication

All communication is via VS Code's postMessage API.

**Extension → Webview:**

| Message type | Payload | When |
|---|---|---|
| `init` | settings, context, library, detectedTool | Webview sends 'ready' |
| `contextUpdated` | Partial ContextData | Active editor changes |
| `promptSaved` | LibraryPrompt | After saving to library |
| `error` | string | On failure |

**Webview → Extension:**

| Message type | Payload | When |
|---|---|---|
| `ready` | — | React mounts |
| `saveSettings` | GlobalSettings | User saves settings |
| `copyPrompt` | string | User clicks Copy |
| `saveToLibrary` | prompt, taskType, tool, title, score | User saves to library |
| `refreshContext` | — | User clicks Refresh |

### Build

Webpack produces two separate bundles:

| Bundle | Target | Output |
|---|---|---|
| Extension host | `node` (CommonJS) | `out/extension/extension.js` |
| Webview UI | `web` (browser IIFE) | `out/webview/index.js` |

`vscode` is marked external in the extension bundle — the VS Code runtime provides it at run time.

### Quality scorer

The scorer is a pure function (`computeScore`) with no side effects and no network calls. It runs on every React render cycle via `useMemo`.

| Dimension | Max | Key signals |
|---|---|---|
| Clarity | 25 | Primary field length ≥ 20 chars (+10), non-vague (+10), tool selected (+5) |
| Context | 25 | Active file detected (+10), attachment enabled (+5), language/framework set (+5), project name (+5) |
| Scope | 25 | Task-specific: constraints / scope boundaries (+15), secondary required field (+10) |
| Expected Output | 25 | Output format field filled (+10), tool-specific template has explicit format instruction (+15) |

### Prompt generator

`generatePrompt` is a pure function that dispatches to one of four tool-specific generators. Each generator is a switch over the four task types, producing 16 distinct templates total.

---

## Configuration

Global settings are stored in VS Code's `globalState` under the key `goodprompts.globalSettings`. They persist across workspaces and VS Code restarts.

| Setting | Description | Example |
|---|---|---|
| Language | Primary programming language | `TypeScript` |
| Runtime | Execution environment | `Node.js 20` |
| Framework | Libraries / frameworks in use | `Express`, `React` |
| Style guide | Code style standard | `Airbnb`, `PEP 8` |
| Default AI tool | Fallback when auto-detection finds nothing | `claude-code` |

---

## Project structure

```
good-prompts/
├── package.json               VS Code extension manifest
├── tsconfig.json              TypeScript config — extension host
├── tsconfig.webview.json      TypeScript config — webview
├── webpack.config.js          Two-bundle build config
├── media/
│   └── icon.svg               Activity bar icon
├── src/
│   ├── shared/
│   │   └── types.ts           Shared TypeScript interfaces and union types
│   ├── extension/
│   │   ├── extension.ts
│   │   ├── GoodPromptsPanel.ts
│   │   ├── GoodPromptsViewProvider.ts
│   │   ├── mcpManager.ts
│   │   ├── autoDetect.ts
│   │   ├── contextCapture.ts
│   │   └── settingsManager.ts
│   └── webview/
│       ├── index.tsx
│       ├── index.css
│       ├── App.tsx
│       ├── hooks/
│       │   └── useVSCode.ts
│       ├── utils/
│       │   ├── promptGenerator.ts
│       │   └── scorer.ts
│       └── components/
│           ├── TaskTypeSelector.tsx
│           ├── TargetToolSelector.tsx
│           ├── GlobalSettings.tsx
│           ├── ContextSection.tsx
│           ├── MCPSection.tsx
│           ├── BugFixForm.tsx
│           ├── FeatureForm.tsx
│           ├── RefactorForm.tsx
│           ├── CodeReviewForm.tsx
│           ├── PromptPreview.tsx
│           ├── QualityScorer.tsx
│           └── ActionButtons.tsx
└── out/                       Compiled output (generated, not committed)
    ├── extension/
    │   └── extension.js
    └── webview/
        └── index.js
```

---

## Requirements

- VS Code 1.85 or later
- Node.js 18 LTS or later (for building)

---

## Support

If GoodPrompts saves you time, consider buying me a coffee:

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-yellow?logo=buy-me-a-coffee)](https://buymeacoffee.com/omarbanat)
