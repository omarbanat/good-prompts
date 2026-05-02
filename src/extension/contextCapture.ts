import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';

export async function captureCodeSnippet(): Promise<{ text: string; lineRange: string }> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return { text: '', lineRange: '' };
  }

  const selection = editor.selection;
  if (selection.isEmpty) {
    return { text: '', lineRange: '' };
  }

  const text = editor.document.getText(selection);
  const start = selection.start.line + 1;
  const end = selection.end.line + 1;
  const lineRange = start === end ? `${start}` : `${start}-${end}`;
  return { text, lineRange };
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
