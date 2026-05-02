import * as vscode from 'vscode';
import { SettingsManager } from './settingsManager';
import { MCPManager } from './mcpManager';
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

export class GoodPromptsPanel {
  public static currentPanel: GoodPromptsPanel | undefined;
  private static readonly viewType = 'goodPrompts';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _context: vscode.ExtensionContext;
  private readonly _settingsManager: SettingsManager;
  private readonly _mcpManager: MCPManager;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri, context: vscode.ExtensionContext): GoodPromptsPanel {
    if (GoodPromptsPanel.currentPanel) {
      GoodPromptsPanel.currentPanel._panel.reveal(vscode.ViewColumn.Two);
      return GoodPromptsPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      GoodPromptsPanel.viewType,
      'GoodPrompts',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri]
      }
    );

    GoodPromptsPanel.currentPanel = new GoodPromptsPanel(panel, extensionUri, context);
    return GoodPromptsPanel.currentPanel;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._context = context;
    this._settingsManager = new SettingsManager(context);
    this._mcpManager = new MCPManager();

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

    this._panel.webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
        await this._handleMessage(message);
      },
      null,
      this._disposables
    );

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  private async _handleMessage(message: WebviewMessage): Promise<void> {
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
        this._panel.webview.postMessage(initMsg);
        break;
      }

      case 'saveSettings': {
        await this._settingsManager.saveSettings(message.payload);
        await this._sendContextUpdate();
        break;
      }

      case 'copyPrompt': {
        await vscode.env.clipboard.writeText(message.payload);
        const copiedMsg: ExtensionMessage = { type: 'promptCopied' };
        this._panel.webview.postMessage(copiedMsg);
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
        this._panel.webview.postMessage(savedMsg);
        break;
      }

      case 'deleteFromLibrary': {
        await this._settingsManager.deletePromptFromLibrary(message.payload);
        break;
      }
      case 'refreshContext': {
        await this._sendContextUpdate();
        break;
      }

      case 'browseMCPServer': {
        const { serverId } = message.payload;
        const config = this._settingsManager.getSettings().mcpServers.find(s => s.id === serverId);
        if (!config) { break; }
        try {
          const { resources, tools } = await this._mcpManager.browse(config);
          const msg: ExtensionMessage = { type: 'mcpServerBrowsed', payload: { serverId, resources, tools } };
          this._panel.webview.postMessage(msg);
        } catch (err) {
          const msg: ExtensionMessage = { type: 'mcpError', payload: { serverId, message: err instanceof Error ? err.message : String(err) } };
          this._panel.webview.postMessage(msg);
        }
        break;
      }

      case 'fetchMCPResource': {
        const { serverId, uri, label } = message.payload;
        const config = this._settingsManager.getSettings().mcpServers.find(s => s.id === serverId);
        if (!config) { break; }
        try {
          const content = await this._mcpManager.readResource(config, uri);
          const item = { id: `${serverId}-${Date.now()}`, serverName: config.name, label, content };
          const msg: ExtensionMessage = { type: 'mcpContentFetched', payload: item };
          this._panel.webview.postMessage(msg);
        } catch (err) {
          const msg: ExtensionMessage = { type: 'mcpError', payload: { serverId, message: err instanceof Error ? err.message : String(err) } };
          this._panel.webview.postMessage(msg);
        }
        break;
      }

      case 'callMCPTool': {
        const { serverId, toolName, args, label } = message.payload;
        const config = this._settingsManager.getSettings().mcpServers.find(s => s.id === serverId);
        if (!config) { break; }
        try {
          const content = await this._mcpManager.callTool(config, toolName, args);
          const item = { id: `${serverId}-${Date.now()}`, serverName: config.name, label, content };
          const msg: ExtensionMessage = { type: 'mcpContentFetched', payload: item };
          this._panel.webview.postMessage(msg);
        } catch (err) {
          const msg: ExtensionMessage = { type: 'mcpError', payload: { serverId, message: err instanceof Error ? err.message : String(err) } };
          this._panel.webview.postMessage(msg);
        }
        break;
      }
    }
  }

  private async _enrichContext(context: ContextData): Promise<ContextData> {
    const [snippet, gitDiff, terminalError, testFile] = await Promise.all([
      captureCodeSnippet(),
      captureGitDiff(),
      captureTerminalError(),
      captureTestFile(context.activeFilePath)
    ]);

    return {
      ...context,
      codeSnippet: snippet.text,
      codeSnippetLineRange: snippet.lineRange,
      gitDiff,
      terminalError,
      testFile
    };
  }

  private async _sendContextUpdate(): Promise<void> {
    try {
      const { context } = await detectContext(this._context);
      const enrichedContext = await this._enrichContext(context);
      const updateMsg: ExtensionMessage = {
        type: 'contextUpdated',
        payload: enrichedContext
      };
      this._panel.webview.postMessage(updateMsg);
    } catch {
      // Gracefully ignore errors during context update
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
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

  public dispose(): void {
    GoodPromptsPanel.currentPanel = undefined;
    this._mcpManager.dispose().catch(() => {});
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
