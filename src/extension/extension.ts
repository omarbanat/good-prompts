import * as vscode from "vscode";
import { GoodPromptsPanel } from "./GoodPromptsPanel";
import { GoodPromptsViewProvider } from "./GoodPromptsViewProvider";

export function activate(context: vscode.ExtensionContext): void {
  const provider = new GoodPromptsViewProvider(context.extensionUri, context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      GoodPromptsViewProvider.viewType,
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  const openCommand = vscode.commands.registerCommand(
    "goodPrompts.open",
    () => {
      GoodPromptsPanel.createOrShow(context.extensionUri, context);
    },
  );

  context.subscriptions.push(openCommand);
}

export function deactivate(): void {
  // Clean up handled by disposables registered in subscriptions
}
