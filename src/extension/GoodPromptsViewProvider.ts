import * as vscode from 'vscode';
import { SettingsManager } from './settingsManager';
import { detectContext } from './autoDetect';
import { captureCodeSnippet, captureGitDiff, captureTerminalError, captureTestFile } from './contextCapture';
import { ContextData, ExtensionMessage, WebviewMessage } from '../shared/types';

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export class GoodPromptsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'goodPrompts.panel';

  private _view?: vscode.WebviewView;
  private readonly _settingsManager: SettingsManager;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) {
    this._settingsManager = new SettingsManager(_context);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _resolveContext: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      await this._handleMessage(message, webviewView.webview);
    });
  }

  private async _handleMessage(message: WebviewMessage, webview: vscode.Webview): Promise<void> {
    switch (message.type) {
      case 'ready': {
        const settings = this._settingsManager.getSettings();
        const { context, detectedTool } = await detectContext(this._context);
        const enrichedContext = await this._enrichContext(context);
        const library = this._settingsManager.getLibrary();
        const initMsg: ExtensionMessage = {
          type: 'init',
          payload: { settings, context: enrichedContext, library, detectedTool }
        };
        webview.postMessage(initMsg);
        break;
      }
      case 'saveSettings': {
        await this._settingsManager.saveSettings(message.payload);
        break;
      }
      case 'copyPrompt': {
        await vscode.env.clipboard.writeText(message.payload);
        const copiedMsg: ExtensionMessage = { type: 'promptCopied' };
        webview.postMessage(copiedMsg);
        break;
      }
      case 'saveToLibrary': {
        const { prompt, taskType, targetTool, title, score } = message.payload;
        const item = {
          id: Date.now().toString(),
          title,
          prompt,
          taskType,
          targetTool,
          score,
          createdAt: new Date().toISOString()
        };
        await this._settingsManager.savePromptToLibrary(item);
        const savedMsg: ExtensionMessage = { type: 'promptSaved', payload: item };
        webview.postMessage(savedMsg);
        break;
      }
      case 'refreshContext': {
        await this._sendContextUpdate(webview);
        break;
      }
    }
  }

  private async _enrichContext(context: ContextData): Promise<ContextData> {
    const [codeSnippet, gitDiff, terminalError, testFile] = await Promise.all([
      captureCodeSnippet(),
      captureGitDiff(),
      captureTerminalError(),
      captureTestFile(context.activeFilePath)
    ]);
    return { ...context, codeSnippet, gitDiff, terminalError, testFile };
  }

  private async _sendContextUpdate(webview: vscode.Webview): Promise<void> {
    try {
      const { context } = await detectContext(this._context);
      const enrichedContext = await this._enrichContext(context);
      const updateMsg: ExtensionMessage = {
        type: 'contextUpdated',
        payload: enrichedContext
      };
      webview.postMessage(updateMsg);
    } catch {
      // ignore
    }
  }

  private _getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'webview', 'index.js')
    );
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>GoodPrompts</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
