import React from 'react';
import { TaskType } from '../../shared/types';

interface Props {
  taskType: TaskType;
  onChange: (type: TaskType) => void;
}

const TASKS: { value: TaskType; label: string }[] = [
  { value: 'bug-fix', label: 'Bug Fix' },
  { value: 'feature', label: 'Feature' },
  { value: 'refactor', label: 'Refactor' },
  { value: 'code-review', label: 'Code Review' }
];

export const TaskTypeSelector: React.FC<Props> = ({ taskType, onChange }) => {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ marginBottom: 8 }}>Task Type</label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {TASKS.map(task => {
          const isActive = task.value === taskType;
          return (
            <button
              key={task.value}
              onClick={() => onChange(task.value)}
              style={{
                padding: '6px 14px',
                borderRadius: 16,
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
                transition: 'all 0.15s ease'
              }}
            >
              {task.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
