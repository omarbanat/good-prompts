import * as vscode from 'vscode';
import { GoodPromptsPanel } from './GoodPromptsPanel';

export function activate(context: vscode.ExtensionContext): void {
  // Register the command to open the panel
  const openCommand = vscode.commands.registerCommand('goodPrompts.open', () => {
    GoodPromptsPanel.createOrShow(context.extensionUri, context);
  });

  context.subscriptions.push(openCommand);

  // Auto-open the panel on activation
  GoodPromptsPanel.createOrShow(context.extensionUri, context);
}

export function deactivate(): void {
  // Clean up handled by disposables registered in subscriptions
}
