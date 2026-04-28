import React, { useState } from 'react';
import { postMessage } from '../hooks/useVSCode';
import { TaskType, TargetTool } from '../../shared/types';

interface Props {
  prompt: string;
  taskType: TaskType;
  targetTool: TargetTool;
  score: number;
  onReset: () => void;
}

export const ActionButtons: React.FC<Props> = ({ prompt, taskType, targetTool, score, onReset }) => {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [title, setTitle] = useState('');

  const handleCopy = () => {
    postMessage({ type: 'copyPrompt', payload: prompt });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveClick = () => {
    setShowTitleInput(true);
    setTitle(`${taskType} prompt - ${new Date().toLocaleDateString()}`);
  };

  const handleSaveConfirm = () => {
    if (!title.trim()) { return; }
    postMessage({
      type: 'saveToLibrary',
      payload: {
        prompt,
        taskType,
        targetTool,
        title: title.trim(),
        score
      }
    });
    setShowTitleInput(false);
    setTitle('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveCancel = () => {
    setShowTitleInput(false);
    setTitle('');
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {showTitleInput && (
        <div style={{
          marginBottom: 10,
          padding: 10,
          backgroundColor: 'var(--vscode-input-background)',
          borderRadius: 4,
          border: '1px solid var(--vscode-input-border, rgba(255,255,255,0.2))'
        }}>
          <label style={{ marginBottom: 4 }}>Save title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { handleSaveConfirm(); }
              if (e.key === 'Escape') { handleSaveCancel(); }
            }}
            autoFocus
            style={{ marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={handleSaveConfirm}
              style={{
                backgroundColor: 'var(--vscode-button-background)',
                color: 'var(--vscode-button-foreground)',
                padding: '4px 12px',
                fontWeight: 600
              }}
            >
              Save
            </button>
            <button
              onClick={handleSaveCancel}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--vscode-editor-foreground)',
                border: '1px solid var(--vscode-input-border, rgba(255,255,255,0.2))',
                padding: '4px 12px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={handleCopy}
          disabled={!prompt}
          style={{
            backgroundColor: copied ? '#4daf4a' : 'var(--vscode-button-background)',
            color: 'var(--vscode-button-foreground)',
            padding: '7px 18px',
            fontWeight: 600,
            fontSize: 13,
            opacity: !prompt ? 0.5 : 1,
            cursor: !prompt ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s ease'
          }}
        >
          {copied ? 'Copied!' : 'Copy Prompt'}
        </button>

        <button
          onClick={handleSaveClick}
          disabled={!prompt || showTitleInput}
          style={{
            backgroundColor: saved ? '#4daf4a' : 'var(--vscode-input-background)',
            color: saved ? '#fff' : 'var(--vscode-editor-foreground)',
            border: '1px solid var(--vscode-input-border, rgba(255,255,255,0.2))',
            padding: '7px 18px',
            fontWeight: 500,
            opacity: (!prompt || showTitleInput) ? 0.5 : 1,
            cursor: (!prompt || showTitleInput) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {saved ? 'Saved!' : 'Save to Library'}
        </button>

        <button
          onClick={onReset}
          style={{
            backgroundColor: 'transparent',
            color: 'var(--vscode-editor-foreground)',
            border: '1px solid var(--vscode-input-border, rgba(255,255,255,0.2))',
            padding: '7px 18px',
            opacity: 0.7
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
};
