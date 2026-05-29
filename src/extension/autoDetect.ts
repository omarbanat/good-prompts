import * as vscode from 'vscode';
import * as path from 'path';
import { ContextData, TargetTool } from '../shared/types';

const EXT_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.py': 'Python',
  '.go': 'Go',
  '.rs': 'Rust',
  '.java': 'Java',
  '.cs': 'C#',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.swift': 'Swift',
  '.kt': 'Kotlin',
  '.cpp': 'C++',
  '.cc': 'C++',
  '.cxx': 'C++',
  '.c': 'C'
};

async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

async function detectTargetTool(workspaceRoot: vscode.Uri | undefined): Promise<TargetTool | null> {
  // Extension-based detection takes priority
  if (vscode.extensions.getExtension('anthropic.claude-code')) {
    return 'claude-code';
  }
  if (vscode.extensions.getExtension('GitHub.copilot') || vscode.extensions.getExtension('GitHub.copilot-chat')) {
    return 'copilot';
  }
  if (vscode.extensions.getExtension('openai.chatgpt')) {
    return 'chatgpt';
  }
  if (vscode.extensions.getExtension('Google.gemini-code-assist')) {
    return 'gemini';
  }

  if (!workspaceRoot) {
    return null;
  }

  // File-based fallbacks
  const claudeMd = vscode.Uri.joinPath(workspaceRoot, 'CLAUDE.md');
  if (await fileExists(claudeMd)) {
    return 'claude-code';
  }

  const copilotInstructions = vscode.Uri.joinPath(workspaceRoot, '.github', 'copilot-instructions.md');
  if (await fileExists(copilotInstructions)) {
    return 'copilot';
  }

  return null;
}

export async function detectContext(
  _context: vscode.ExtensionContext
): Promise<{ context: ContextData; detectedTool: TargetTool | null }> {
  const editor = vscode.window.activeTextEditor;
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const workspaceRoot = workspaceFolders?.[0]?.uri;

  let activeFile = '';
  let activeFilePath = '';
  let relativeFilePath = '';
  let language = '';

  if (editor) {
    const uri = editor.document.uri;
    activeFile = path.basename(uri.fsPath);
    activeFilePath = uri.fsPath;
    relativeFilePath = vscode.workspace.asRelativePath(uri, false);
    const ext = path.extname(uri.fsPath).toLowerCase();
    language = EXT_TO_LANGUAGE[ext] ?? editor.document.languageId ?? '';
  }

  const projectName = workspaceFolders?.[0]?.name ?? '';

  const detectedTool = await detectTargetTool(workspaceRoot);

  const contextData: ContextData = {
    activeFile,
    activeFilePath,
    relativeFilePath,
    language,
    projectName,
    codeSnippet: '',
    codeSnippetLineRange: '',
    terminalError: '',
    gitDiff: '',
    testFile: ''
  };

  return { context: contextData, detectedTool };
}
