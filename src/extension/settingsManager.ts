import * as vscode from 'vscode';
import { GlobalSettings, LibraryPrompt } from '../shared/types';

const SETTINGS_KEY = 'goodprompts.globalSettings';
const LIBRARY_KEY = 'goodprompts.library';

const DEFAULT_SETTINGS: GlobalSettings = {
  language: '',
  runtime: '',
  framework: '',
  styleGuide: '',
  defaultTool: 'claude-code',
  mcpServers: []
};

export class SettingsManager {
  constructor(private readonly context: vscode.ExtensionContext) {}

  getSettings(): GlobalSettings {
    const stored = this.context.globalState.get<GlobalSettings>(SETTINGS_KEY);
    if (!stored) {
      return { ...DEFAULT_SETTINGS };
    }
    return { ...DEFAULT_SETTINGS, ...stored };
  }

  async saveSettings(settings: GlobalSettings): Promise<void> {
    await this.context.globalState.update(SETTINGS_KEY, settings);
  }

  getLibrary(): LibraryPrompt[] {
    return this.context.globalState.get<LibraryPrompt[]>(LIBRARY_KEY) ?? [];
  }

  async savePromptToLibrary(item: LibraryPrompt): Promise<void> {
    const library = this.getLibrary();
    library.unshift(item);
    const trimmed = library.slice(0, 100);
    await this.context.globalState.update(LIBRARY_KEY, trimmed);
  }

  async deletePromptFromLibrary(id: string): Promise<void> {
    const library = this.getLibrary().filter(item => item.id !== id);
    await this.context.globalState.update(LIBRARY_KEY, library);
  }
}
