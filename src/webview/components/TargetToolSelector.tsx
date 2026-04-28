import React from 'react';
import { TargetTool } from '../../shared/types';

interface Props {
  targetTool: TargetTool;
  toolAutoDetected: boolean;
  onChange: (tool: TargetTool) => void;
}

const TOOLS: { value: TargetTool; label: string }[] = [
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'copilot', label: 'Copilot' },
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'other', label: 'Other' }
];

export const TargetToolSelector: React.FC<Props> = ({ targetTool, toolAutoDetected, onChange }) => {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <label style={{ margin: 0 }}>Target AI Tool</label>
        {toolAutoDetected && (
          <span style={{
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 10,
            backgroundColor: 'var(--vscode-gitDecoration-addedResourceForeground)',
            color: 'var(--vscode-editor-background)',
            fontWeight: 600,
            letterSpacing: '0.03em'
          }}>
            auto-detected
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {TOOLS.map(tool => {
          const isActive = tool.value === targetTool;
          return (
            <button
              key={tool.value}
              onClick={() => onChange(tool.value)}
              style={{
                padding: '5px 12px',
                borderRadius: 4,
                border: isActive
                  ? '1px solid var(--vscode-focusBorder)'
                  : '1px solid var(--vscode-input-border, rgba(255,255,255,0.2))',
                backgroundColor: isActive
                  ? 'var(--vscode-button-background)'
                  : 'var(--vscode-input-background)',
                color: isActive
                  ? 'var(--vscode-button-foreground)'
                  : 'var(--vscode-editor-foreground)',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                fontSize: 12,
                transition: 'all 0.15s ease'
              }}
            >
              {tool.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
