import React from 'react';
import { ContextData, ContextAttachments } from '../../shared/types';
import { postMessage } from '../hooks/useVSCode';

interface Props {
  contextData: ContextData;
  contextAttachments: ContextAttachments;
  onAttachmentChange: (key: keyof ContextAttachments, value: boolean) => void;
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

interface CheckboxItemProps {
  label: string;
  checked: boolean;
  available: boolean;
  charCountStr: string;
  onChange: (checked: boolean) => void;
}

const CheckboxItem: React.FC<CheckboxItemProps> = ({ label, checked, available, charCountStr, onChange }) => {
  if (!available) { return null; }
  return (
    <label style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
      cursor: 'pointer',
      textTransform: 'none',
      letterSpacing: 'normal',
      fontSize: 12,
      opacity: 1
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ width: 'auto', cursor: 'pointer' }}
      />
      <span>{label}</span>
      {charCountStr && (
        <span style={{ opacity: 0.5, fontSize: 10 }}>({charCountStr})</span>
      )}
    </label>
  );
};

export const ContextSection: React.FC<Props> = ({ contextData, contextAttachments, onAttachmentChange }) => {
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
        <CheckboxItem
          label="Code snippet"
          checked={contextAttachments.codeSnippet}
          available={!!contextData.codeSnippet}
          charCountStr={charCount(contextData.codeSnippet)}
          onChange={v => onAttachmentChange('codeSnippet', v)}
        />
        <CheckboxItem
          label="Terminal error"
          checked={contextAttachments.terminalError}
          available={!!contextData.terminalError}
          charCountStr={charCount(contextData.terminalError)}
          onChange={v => onAttachmentChange('terminalError', v)}
        />
        <CheckboxItem
          label="Git diff"
          checked={contextAttachments.gitDiff}
          available={!!contextData.gitDiff}
          charCountStr={charCount(contextData.gitDiff)}
          onChange={v => onAttachmentChange('gitDiff', v)}
        />
        <CheckboxItem
          label="Test file"
          checked={contextAttachments.testFile}
          available={!!contextData.testFile}
          charCountStr={charCount(contextData.testFile)}
          onChange={v => onAttachmentChange('testFile', v)}
        />
        {!contextData.codeSnippet && !contextData.terminalError && !contextData.gitDiff && !contextData.testFile && (
          <span style={{ fontSize: 11, opacity: 0.5 }}>No attachments available. Open a file or make a git commit.</span>
        )}
      </div>
    </div>
  );
};
