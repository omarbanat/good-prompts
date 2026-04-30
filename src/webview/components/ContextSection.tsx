import React, { useState } from 'react';
import { ContextData, ContextAttachments } from '../../shared/types';
import { postMessage } from '../hooks/useVSCode';

interface Props {
  contextData: ContextData;
  contextAttachments: ContextAttachments;
  onAttachmentChange: (key: keyof ContextAttachments, value: boolean) => void;
  onLineRangeChange: (value: string) => void;
  onTerminalErrorChange: (value: string) => void;
}

function charCount(text: string): string {
  if (!text) { return ''; }
  return `${text.length} chars`;
}

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', gap: 6, marginBottom: 4, fontSize: 12 }}>
    <span style={{ opacity: 0.6, minWidth: 70 }}>{label}:</span>
    <span style={{
      opacity: 0.85,
      color: 'var(--vscode-descriptionForeground)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      maxWidth: 200
    }}>
      {value || '—'}
    </span>
  </div>
);

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 4,
  cursor: 'pointer',
  textTransform: 'none',
  letterSpacing: 'normal',
  fontSize: 12,
  opacity: 1
};

export const ContextSection: React.FC<Props> = ({
  contextData,
  contextAttachments,
  onAttachmentChange,
  onLineRangeChange,
  onTerminalErrorChange
}) => {
  const [terminalExpanded, setTerminalExpanded] = useState(false);

  const handleRefresh = () => {
    postMessage({ type: 'refreshContext' });
  };

  return (
    <div style={{
      marginBottom: 16,
      padding: 12,
      backgroundColor: 'var(--vscode-sideBar-background)',
      border: '1px solid var(--vscode-panel-border)',
      borderRadius: 6
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.75 }}>
          Detected Context
        </span>
        <button
          onClick={handleRefresh}
          title="Refresh context"
          style={{
            backgroundColor: 'transparent',
            color: 'var(--vscode-editor-foreground)',
            border: '1px solid var(--vscode-input-border, rgba(255,255,255,0.2))',
            padding: '2px 8px',
            fontSize: 11,
            cursor: 'pointer',
            borderRadius: 3
          }}
        >
          Refresh
        </button>
      </div>

      <InfoRow label="File" value={contextData.activeFile} />
      <InfoRow label="Project" value={contextData.projectName} />
      <InfoRow label="Language" value={contextData.language} />

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Attachments
        </div>

        {/* Code snippet */}
        {contextData.codeSnippet && (
          <div style={{ marginBottom: 8 }}>
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={contextAttachments.codeSnippet}
                onChange={e => onAttachmentChange('codeSnippet', e.target.checked)}
                style={{ width: 'auto', cursor: 'pointer' }}
              />
              <span>Code snippet</span>
              <span style={{ opacity: 0.5, fontSize: 10 }}>({charCount(contextData.codeSnippet)})</span>
            </label>
            {contextAttachments.codeSnippet && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 24, marginTop: 2 }}>
                <span style={{ fontSize: 11, opacity: 0.6 }}>Lines:</span>
                <input
                  type="text"
                  value={contextAttachments.codeSnippetLineRange}
                  onChange={e => onLineRangeChange(e.target.value)}
                  placeholder="e.g. 10-50"
                  style={{
                    width: 70,
                    fontSize: 11,
                    padding: '2px 5px',
                    backgroundColor: 'var(--vscode-input-background)',
                    color: 'var(--vscode-input-foreground)',
                    border: '1px solid var(--vscode-input-border, rgba(255,255,255,0.15))',
                    borderRadius: 3,
                    outline: 'none'
                  }}
                />
                {contextAttachments.codeSnippetLineRange && (
                  <button
                    onClick={() => onLineRangeChange('')}
                    title="Clear line range"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--vscode-editor-foreground)',
                      cursor: 'pointer',
                      fontSize: 11,
                      opacity: 0.5,
                      padding: '0 2px'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Terminal error */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ ...checkboxLabelStyle, marginBottom: 0 }}>
              <input
                type="checkbox"
                checked={contextAttachments.terminalError}
                onChange={e => onAttachmentChange('terminalError', e.target.checked)}
                disabled={!contextData.terminalError}
                style={{ width: 'auto', cursor: contextData.terminalError ? 'pointer' : 'default' }}
              />
              <span style={{ opacity: contextData.terminalError ? 1 : 0.5 }}>Terminal error</span>
              {contextData.terminalError && (
                <span style={{ opacity: 0.5, fontSize: 10 }}>({charCount(contextData.terminalError)})</span>
              )}
            </label>
            <button
              onClick={() => setTerminalExpanded(e => !e)}
              title={terminalExpanded ? 'Collapse' : 'Paste error'}
              style={{
                background: 'none',
                border: '1px solid var(--vscode-input-border, rgba(255,255,255,0.2))',
                borderRadius: 3,
                color: 'var(--vscode-editor-foreground)',
                cursor: 'pointer',
                fontSize: 10,
                padding: '1px 6px',
                opacity: 0.7
              }}
            >
              {terminalExpanded ? 'Hide' : 'Paste'}
            </button>
          </div>
          {terminalExpanded && (
            <textarea
              value={contextData.terminalError}
              onChange={e => onTerminalErrorChange(e.target.value)}
              placeholder="Paste terminal error output here..."
              rows={4}
              style={{
                width: '100%',
                marginTop: 6,
                padding: '6px 8px',
                fontSize: 11,
                fontFamily: 'var(--vscode-editor-font-family, monospace)',
                backgroundColor: 'var(--vscode-input-background)',
                color: 'var(--vscode-input-foreground)',
                border: '1px solid var(--vscode-input-border, rgba(255,255,255,0.15))',
                borderRadius: 3,
                resize: 'vertical',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          )}
        </div>

        {/* Git diff */}
        {contextData.gitDiff && (
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={contextAttachments.gitDiff}
              onChange={e => onAttachmentChange('gitDiff', e.target.checked)}
              style={{ width: 'auto', cursor: 'pointer' }}
            />
            <span>Git diff</span>
            <span style={{ opacity: 0.5, fontSize: 10 }}>({charCount(contextData.gitDiff)})</span>
          </label>
        )}

        {/* Test file */}
        {contextData.testFile && (
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={contextAttachments.testFile}
              onChange={e => onAttachmentChange('testFile', e.target.checked)}
              style={{ width: 'auto', cursor: 'pointer' }}
            />
            <span>Test file</span>
            <span style={{ opacity: 0.5, fontSize: 10 }}>({charCount(contextData.testFile)})</span>
          </label>
        )}

        {!contextData.codeSnippet && !contextData.gitDiff && !contextData.testFile && (
          <span style={{ fontSize: 11, opacity: 0.5 }}>No attachments available. Open a file or make a git commit.</span>
        )}
      </div>
    </div>
  );
};
