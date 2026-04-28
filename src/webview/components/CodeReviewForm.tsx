import React from 'react';
import { CodeReviewFields, ReviewDepth } from '../../shared/types';

interface Props {
  fields: CodeReviewFields;
  onChange: (fields: CodeReviewFields) => void;
}

const FOCUS_AREA_OPTIONS = [
  'security',
  'performance',
  'readability',
  'correctness',
  'test coverage'
];

export const CodeReviewForm: React.FC<Props> = ({ fields, onChange }) => {
  const toggleFocusArea = (area: string) => {
    const current = fields.focusAreas;
    const updated = current.includes(area)
      ? current.filter(a => a !== area)
      : [...current, area];
    onChange({ ...fields, focusAreas: updated });
  };

  const fieldStyle: React.CSSProperties = { marginBottom: 14 };

  return (
    <div>
      <div style={fieldStyle}>
        <label>Focus Areas</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {FOCUS_AREA_OPTIONS.map(area => {
            const isChecked = fields.focusAreas.includes(area);
            return (
              <label
                key={area}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  textTransform: 'none',
                  letterSpacing: 'normal',
                  fontSize: 12,
                  opacity: 1,
                  padding: '3px 8px',
                  borderRadius: 12,
                  border: isChecked
                    ? '1px solid var(--vscode-focusBorder)'
                    : '1px solid var(--vscode-input-border, rgba(255,255,255,0.2))',
                  backgroundColor: isChecked
                    ? 'var(--vscode-button-background)'
                    : 'var(--vscode-input-background)',
                  color: isChecked ? 'var(--vscode-button-foreground)' : 'var(--vscode-editor-foreground)'
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleFocusArea(area)}
                  style={{ display: 'none' }}
                />
                {area}
              </label>
            );
          })}
        </div>
      </div>

      <div style={fieldStyle}>
        <label>Known Issues to Exclude</label>
        <textarea
          value={fields.knownExclusions}
          placeholder="Known issues or patterns that should not be flagged..."
          onChange={e => onChange({ ...fields, knownExclusions: e.target.value })}
          rows={2}
        />
      </div>

      <div style={fieldStyle}>
        <label>Review Depth</label>
        <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
          {(['quick', 'thorough'] as ReviewDepth[]).map(depth => (
            <label
              key={depth}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                textTransform: 'none',
                letterSpacing: 'normal',
                fontSize: 13,
                opacity: 1
              }}
            >
              <input
                type="radio"
                name="reviewDepth"
                value={depth}
                checked={fields.reviewDepth === depth}
                onChange={() => onChange({ ...fields, reviewDepth: depth })}
                style={{ width: 'auto', cursor: 'pointer' }}
              />
              {depth === 'quick' ? 'Quick Scan' : 'Thorough Review'}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
