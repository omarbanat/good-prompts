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

export class GoodPromptsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'goodPrompts.panel';

  private _view?: vscode.WebviewView;
  private readonly _settingsManager: SettingsManager;
  private readonly _mcpManager: MCPManager;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) {
    this._settingsManager = new SettingsManager(_context);
    this._mcpManager = new MCPManager();
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

    const editorListener = vscode.window.onDidChangeActiveTextEditor(() => {
      this._sendContextUpdate(webviewView.webview);
    });

    let selectionTimer: ReturnType<typeof setTimeout> | undefined;
    const selectionListener = vscode.window.onDidChangeTextEditorSelection(() => {
      clearTimeout(selectionTimer);
      selectionTimer = setTimeout(() => {
        this._sendContextUpdate(webviewView.webview);
      }, 300);
    });

    webviewView.onDidDispose(() => {
      editorListener.dispose();
      selectionListener.dispose();
      clearTimeout(selectionTimer);
      this._mcpManager.dispose().catch(() => {});
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
      case 'deleteFromLibrary': {
        await this._settingsManager.deletePromptFromLibrary(message.payload);
        break;
      }
      case 'refreshContext': {
        await this._sendContextUpdate(webview);
        break;
      }

      case 'openInTool': {
        await this._openInAITool(message.payload.tool, message.payload.prompt);
        break;
      }

      case 'browseMCPServer': {
        const { serverId } = message.payload;
        const config = this._settingsManager.getSettings().mcpServers.find(s => s.id === serverId);
        if (!config) { break; }
        try {
          const { resources, tools } = await this._mcpManager.browse(config);
          const msg: ExtensionMessage = { type: 'mcpServerBrowsed', payload: { serverId, resources, tools } };
          webview.postMessage(msg);
        } catch (err) {
          const msg: ExtensionMessage = { type: 'mcpError', payload: { serverId, message: err instanceof Error ? err.message : String(err) } };
          webview.postMessage(msg);
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
          webview.postMessage(msg);
        } catch (err) {
          const msg: ExtensionMessage = { type: 'mcpError', payload: { serverId, message: err instanceof Error ? err.message : String(err) } };
          webview.postMessage(msg);
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
          webview.postMessage(msg);
        } catch (err) {
          const msg: ExtensionMessage = { type: 'mcpError', payload: { serverId, message: err instanceof Error ? err.message : String(err) } };
          webview.postMessage(msg);
        }
        break;
      }
    }
  }

  private async _openInAITool(tool: string, prompt: string): Promise<void> {
    const toolNames: Record<string, string> = {
      'claude-code': 'Claude Code',
      'copilot': 'GitHub Copilot',
      'chatgpt': 'ChatGPT',
      'gemini': 'Gemini Code Assist'
    };

    const name = toolNames[tool] ?? tool;

    if (tool === 'claude-code') {
      // primaryEditor.open accepts (sessionId, promptText) and injects the
      // prompt via data-initial-prompt on the webview root element.
      try {
        await vscode.commands.executeCommand('claude-vscode.primaryEditor.open', undefined, prompt);
        return;
      } catch {
        // fall through to sidebar fallbacks (no prompt injection, but still opens)
      }
      const fallbacks = [
        'claude-vscode.sidebar.open',
        'workbench.view.extension.claude-sidebar-secondary',
        'workbench.view.extension.claude-sidebar'
      ];
      for (const cmd of fallbacks) {
        try {
          await vscode.commands.executeCommand(cmd);
          return;
        } catch { /* try next */ }
      }
    } else {
      const toolCommands: Record<string, string[]> = {
        'copilot': ['workbench.view.extension.copilot-chat', 'workbench.action.chat.open'],
        'chatgpt': ['openai.chatgpt.focus', 'workbench.view.extension.chatgpt'],
        'gemini': ['cloudcode.googleCloudCodeShow', 'workbench.view.extension.gemini-code-assist']
      };
      const commands = toolCommands[tool];
      if (!commands) { return; }
      for (const cmd of commands) {
        try {
          await vscode.commands.executeCommand(cmd);
          return;
        } catch { /* try next */ }
      }
    }

    vscode.window.showInformationMessage(
      `Could not open ${name} automatically. Make sure it is installed and try opening it manually.`
    );
  }

  private async _enrichContext(context: ContextData): Promise<ContextData> {
    const [snippet, gitDiff, terminalError, testFile] = await Promise.all([
      captureCodeSnippet(),
      captureGitDiff(),
      captureTerminalError(),
      captureTestFile(context.activeFilePath)
    ]);
    return { ...context, codeSnippet: snippet.text, codeSnippetLineRange: snippet.lineRange, gitDiff, terminalError, testFile };
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
