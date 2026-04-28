import React from 'react';

interface Props {
  prompt: string;
  contextData: { activeFile: string; codeSnippet: string; terminalError: string };
}

function classifyLine(line: string, activeFile: string): 'context' | 'code' | 'normal' {
  // Lines referencing the active file or auto-detected context → green
  if (activeFile && line.includes(`\`${activeFile}\``)) {
    return 'context';
  }
  if (line.startsWith('In `') || line.startsWith('File:') || line.startsWith('Project:') ||
      line.startsWith('Language:') || line.startsWith('Framework:')) {
    return 'context';
  }
  // Code block lines → muted
  if (line.startsWith('```') || line.startsWith('    ')) {
    return 'code';
  }
  return 'normal';
}

export const PromptPreview: React.FC<Props> = ({ prompt, contextData }) => {
  if (!prompt) {
    return (
      <div style={{
        marginBottom: 16,
        padding: 12,
        backgroundColor: 'var(--vscode-sideBar-background)',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: 6
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.75, marginBottom: 8 }}>
          Prompt Preview
        </div>
        <span style={{ opacity: 0.4, fontSize: 12 }}>Fill in the form above to see your generated prompt.</span>
      </div>
    );
  }

  const lines = prompt.split('\n');

  return (
    <div style={{
      marginBottom: 16,
      padding: 12,
      backgroundColor: 'var(--vscode-sideBar-background)',
      border: '1px solid var(--vscode-panel-border)',
      borderRadius: 6
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.75 }}>
          Prompt Preview
        </span>
        <span style={{ fontSize: 11, opacity: 0.5 }}>{prompt.length} chars</span>
      </div>
      <pre style={{
        backgroundColor: 'var(--vscode-editor-background)',
        border: '1px solid var(--vscode-input-border, rgba(255,255,255,0.1))',
        borderRadius: 4,
        padding: 10,
        fontFamily: 'var(--vscode-editor-font-family, monospace)',
        fontSize: 12,
        lineHeight: 1.6,
        maxHeight: 320,
        overflowY: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        margin: 0
      }}>
        {lines.map((line, i) => {
          const type = classifyLine(line, contextData.activeFile);
          let color: string;
          if (type === 'context') {
            color = 'var(--vscode-gitDecoration-addedResourceForeground, #4daf4a)';
          } else if (type === 'code') {
            color = 'var(--vscode-descriptionForeground)';
          } else {
            color = 'var(--vscode-editor-foreground)';
          }
          return (
            <span key={i} style={{ color, display: 'block' }}>
              {line || ' '}
            </span>
          );
        })}
      </pre>
    </div>
  );
};
