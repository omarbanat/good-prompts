import React, { useState } from 'react';
import { GlobalSettings as GlobalSettingsType, TargetTool } from '../../shared/types';
import { postMessage } from '../hooks/useVSCode';

interface Props {
  settings: GlobalSettingsType;
  onSave: (settings: GlobalSettingsType) => void;
  onCancel: () => void;
}

const TOOL_OPTIONS: { value: TargetTool; label: string }[] = [
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'copilot', label: 'Copilot' },
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'other', label: 'Other' }
];

export const GlobalSettings: React.FC<Props> = ({ settings, onSave, onCancel }) => {
  const [local, setLocal] = useState<GlobalSettingsType>({ ...settings });

  const update = (field: keyof GlobalSettingsType, value: string) => {
    setLocal(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    postMessage({ type: 'saveSettings', payload: local });
    onSave(local);
  };

  const sectionStyle: React.CSSProperties = {
    padding: 16,
    backgroundColor: 'var(--vscode-sideBar-background)',
    border: '1px solid var(--vscode-panel-border)',
    borderRadius: 6,
    marginBottom: 16
  };

  const fieldStyle: React.CSSProperties = {
    marginBottom: 12
  };

  return (
    <div style={sectionStyle}>
      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Global Settings</h2>

      <div style={fieldStyle}>
        <label>Primary Language</label>
        <input
          type="text"
          value={local.language}
          placeholder="TypeScript"
          onChange={e => update('language', e.target.value)}
        />
      </div>

      <div style={fieldStyle}>
        <label>Runtime / Environment</label>
        <input
          type="text"
          value={local.runtime}
          placeholder="Node.js 20"
          onChange={e => update('runtime', e.target.value)}
        />
      </div>

      <div style={fieldStyle}>
        <label>Framework</label>
        <input
          type="text"
          value={local.framework}
          placeholder="Express, React..."
          onChange={e => update('framework', e.target.value)}
        />
      </div>

      <div style={fieldStyle}>
        <label>Code Style Guide</label>
        <input
          type="text"
          value={local.styleGuide}
          placeholder="Airbnb, Google, PEP 8..."
          onChange={e => update('styleGuide', e.target.value)}
        />
      </div>

      <div style={fieldStyle}>
        <label>Default AI Tool</label>
        <select
          value={local.defaultTool}
          onChange={e => update('defaultTool', e.target.value as TargetTool)}
        >
          {TOOL_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          onClick={handleSave}
          style={{
            backgroundColor: 'var(--vscode-button-background)',
            color: 'var(--vscode-button-foreground)',
            padding: '6px 16px',
            fontWeight: 600
          }}
        >
          Save
        </button>
        <button
          onClick={onCancel}
          style={{
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-editor-foreground)',
            border: '1px solid var(--vscode-input-border, rgba(255,255,255,0.2))',
            padding: '6px 16px'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
