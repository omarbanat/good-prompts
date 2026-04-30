import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';

export async function captureCodeSnippet(): Promise<string> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return '';
  }

  const selection = editor.selection;
  if (!selection.isEmpty) {
    return editor.document.getText(selection);
  }

  // No selection — grab visible range, max 100 lines
  const visibleRange = editor.visibleRanges[0];
  if (!visibleRange) {
    return '';
  }

  const startLine = visibleRange.start.line;
  const endLine = Math.min(visibleRange.end.line, startLine + 99);
  const range = new vscode.Range(startLine, 0, endLine, Number.MAX_SAFE_INTEGER);
  return editor.document.getText(range);
}

export async function captureGitDiff(): Promise<string> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return '';
  }

  const cwd = workspaceFolders[0].uri.fsPath;

  return new Promise<string>((resolve) => {
    cp.exec('git diff HEAD', { cwd, timeout: 5000 }, (error, stdout) => {
      if (error) {
        resolve('');
        return;
      }
      const lines = stdout.split('\n');
      const limited = lines.slice(0, 200).join('\n');
      resolve(limited);
    });
  });
}

export async function captureTerminalError(): Promise<string> {
  return '';
}

export async function captureTestFile(activeFilePath: string): Promise<string> {
  if (!activeFilePath) {
    return '';
  }

  const dir = path.dirname(activeFilePath);
  const ext = path.extname(activeFilePath);
  const base = path.basename(activeFilePath, ext);

  const candidates: string[] = [
    path.join(dir, `${base}.test${ext}`),
    path.join(dir, `${base}.spec${ext}`),
    path.join(dir, '__tests__', `${base}.test${ext}`),
    path.join(dir, '__tests__', `${base}.spec${ext}`),
    path.join(dir, '__tests__', `${base}${ext}`)
  ];

  for (const candidate of candidates) {
    const uri = vscode.Uri.file(candidate);
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.type === vscode.FileType.File) {
        const bytes = await vscode.workspace.fs.readFile(uri);
        const content = Buffer.from(bytes).toString('utf8');
        return content;
      }
    } catch {
      // File doesn't exist, try next
    }
  }

  return '';
}
