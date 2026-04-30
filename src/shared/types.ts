export type TaskType = 'bug-fix' | 'feature' | 'refactor' | 'code-review';
export type TargetTool = 'claude-code' | 'copilot' | 'chatgpt' | 'gemini' | 'other';
export type ReviewDepth = 'quick' | 'thorough';
export type RefactorGoal = 'performance' | 'readability' | 'security' | 'testability';

export interface GlobalSettings {
  language: string;
  runtime: string;
  framework: string;
  styleGuide: string;
  defaultTool: TargetTool;
}

export interface ContextData {
  activeFile: string;
  activeFilePath: string;
  language: string;
  projectName: string;
  codeSnippet: string;
  terminalError: string;
  gitDiff: string;
  testFile: string;
}

export interface ContextAttachments {
  codeSnippet: boolean;
  codeSnippetLineRange: string;
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
  | { type: 'error'; payload: string };

// Messages: webview → extension host
export type WebviewMessage =
  | { type: 'ready' }
  | { type: 'saveSettings'; payload: GlobalSettings }
  | { type: 'copyPrompt'; payload: string }
  | { type: 'saveToLibrary'; payload: { prompt: string; taskType: TaskType; targetTool: TargetTool; title: string; score: number } }
  | { type: 'refreshContext' };
