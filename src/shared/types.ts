export type TaskType = 'bug-fix' | 'feature' | 'refactor' | 'code-review';
export type TargetTool = 'claude-code' | 'copilot' | 'chatgpt' | 'gemini' | 'other';
export type ReviewDepth = 'quick' | 'thorough';
export type RefactorGoal = 'performance' | 'readability' | 'security' | 'testability';
export type MCPTransport = 'stdio' | 'sse';

export interface MCPServerConfig {
  id: string;
  name: string;
  transport: MCPTransport;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

export interface MCPResourceItem {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPToolItem {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface MCPAttachedItem {
  id: string;
  serverName: string;
  label: string;
  content: string;
}

export interface GlobalSettings {
  language: string;
  runtime: string;
  framework: string;
  styleGuide: string;
  defaultTool: TargetTool;
  mcpServers: MCPServerConfig[];
}

export interface ContextData {
  activeFile: string;
  activeFilePath: string;
  language: string;
  projectName: string;
  codeSnippet: string;
  codeSnippetLineRange: string;
  terminalError: string;
  gitDiff: string;
  testFile: string;
}

export interface ContextAttachments {
  terminalError: boolean;
  gitDiff: boolean;
  testFile: boolean;
}

export interface BugFixFields {
  whatIsBroken: string;
  expectedBehavior: string;
  actualBehavior: string;
  constraints: string;
}

export interface FeatureFields {
  role: string;
  goal: string;
  reason: string;
  acceptanceCriteria: string;
  scopeBoundaries: string;
  dependencies: string;
}

export interface RefactorFields {
  currentState: string;
  refactorGoal: RefactorGoal | '';
  constraints: string;
  targetOutputFormat: string;
}

export interface CodeReviewFields {
  focusAreas: string[];
  knownExclusions: string;
  reviewDepth: ReviewDepth;
}

export interface OutputOptions {
  scopeToFile: boolean;
  codeOnly: boolean;
}

export interface QualityScore {
  total: number;
  clarity: number;
  context: number;
  scope: number;
  expectedOutput: number;
  suggestions: string[];
}

export interface LibraryPrompt {
  id: string;
  title: string;
  prompt: string;
  taskType: TaskType;
  targetTool: TargetTool;
  score: number;
  createdAt: string;
}

// Messages: extension host → webview
export type ExtensionMessage =
  | { type: 'init'; payload: { settings: GlobalSettings; context: ContextData; library: LibraryPrompt[]; detectedTool: TargetTool | null } }
  | { type: 'contextUpdated'; payload: Partial<ContextData> }
  | { type: 'promptCopied' }
  | { type: 'promptSaved'; payload: LibraryPrompt }
  | { type: 'mcpServerBrowsed'; payload: { serverId: string; resources: MCPResourceItem[]; tools: MCPToolItem[] } }
  | { type: 'mcpContentFetched'; payload: MCPAttachedItem }
  | { type: 'mcpError'; payload: { serverId: string; message: string } }
  | { type: 'error'; payload: string };

// Messages: webview → extension host
export type WebviewMessage =
  | { type: 'ready' }
  | { type: 'saveSettings'; payload: GlobalSettings }
  | { type: 'copyPrompt'; payload: string }
  | { type: 'saveToLibrary'; payload: { prompt: string; taskType: TaskType; targetTool: TargetTool; title: string; score: number } }
  | { type: 'deleteFromLibrary'; payload: string }
  | { type: 'refreshContext' }
  | { type: 'browseMCPServer'; payload: { serverId: string } }
  | { type: 'fetchMCPResource'; payload: { serverId: string; uri: string; label: string } }
  | { type: 'callMCPTool'; payload: { serverId: string; toolName: string; args: Record<string, unknown>; label: string } };
