# Changelog

## [0.4.0] - 2026-05-31

### Added

- XML output format — an alternative to the tool-specific format that wraps the prompt in `<role>`, `<task>`, `<constraints>`, `<context>`, and `<output_format>` XML tags; available for all target tools via the Output Options controls
- `OutputFormat` type (`'structured' | 'xml'`) and `format` field on `OutputOptions`
- `generateXmlPrompt` generator in `promptGenerator.ts`; `generatePrompt` checks this before dispatching to tool-specific generators
- **Open in Tool** button in `ActionButtons` — copies the prompt and opens the AI tool directly; shown as the primary action whenever a specific tool (Claude Code, Copilot, ChatGPT, Gemini) is detected
- `openInTool` message type in `WebviewMessage` for extension-host routing

### Changed

- Claude Code prompt generator now uses `@relative/path/to/file` and `@file#lineRange` syntax instead of backtick-wrapped filenames, letting Claude Code attach files natively
- `ContextData` gains a `relativeFilePath` field populated via `vscode.workspace.asRelativePath`
- New `buildClaudeCodeContextBlock` helper used by all four Claude Code task templates
- Copy button is demoted to a secondary style when a specific tool is detected and the Open button takes the primary slot

## [0.3.0] - 2026-05-02

### Added

- MCP (Model Context Protocol) integration — connect to MCP servers, browse resources, and invoke tools directly from the panel
- `MCPSection` component for displaying connected servers, available resources, and callable tools
- `mcpManager.ts` — extension-host service that manages MCP server connections
- MCP server configuration in the Global Settings panel (add / delete servers)
- MCP items included in generated prompts when selected
- Output options injected into prompt generation for finer control

### Changed

- Prompt generation updated to incorporate MCP context items
- Scoring logic updated to factor in code snippets from context data
- `ContextSection` streamlined with improved UI feedback for active selections
- `GlobalSettings` component extended to manage MCP server list

## [0.2.0] - 2026-04-30

### Added

- `GoodPromptsViewProvider` — replaces the floating panel with a sidebar view registered in the secondary sidebar (`secondarySidebar`)
- `codeSnippetLineRange` field on `ContextAttachments` so prompts can reference the exact line range of the attached snippet
- Terminal error input field rendered directly in the `ContextSection` component (no longer requires pasting elsewhere)

### Changed

- Extension entry point refactored to register `GoodPromptsViewProvider` alongside the open command
- `App.tsx` updated to handle the new line-range field and inline terminal error input
- `ContextSection` overhauled with line-range display and terminal error text area
- Prompt generator updated to include the line range when a code snippet is attached
- Activity bar icon updated to a cleaner SVG

## [0.1.0] - 2026-04-28

### Added

- Structured prompt form with 4 task types: Bug Fix, Feature Request, Refactor, Code Review
- 4 model-specific prompt templates: Claude Code, GitHub Copilot, ChatGPT, Gemini (plus a generic fallback)
- Real-time quality scorer (0–100) across Clarity, Context, Scope, and Expected Output
- Auto-detection of active file, language, project name, and target AI tool from workspace signals
- Context attachments: code snippet, git diff, terminal error, test file
- Personal prompt library with save and reuse across sessions
- Global settings panel for language, runtime, framework, style guide, and default AI tool
- Fully offline — no API calls required
