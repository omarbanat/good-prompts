import React from 'react';
import { FeatureFields } from '../../shared/types';

interface Props {
  fields: FeatureFields;
  onChange: (fields: FeatureFields) => void;
}

export const FeatureForm: React.FC<Props> = ({ fields, onChange }) => {
  const update = (key: keyof FeatureFields, value: string) => {
    onChange({ ...fields, [key]: value });
  };

  const fieldStyle: React.CSSProperties = { marginBottom: 14 };

  const role = fields.role || 'developer';
  const goal = fields.goal || '...';
  const reason = fields.reason || '...';

  return (
    <div>
      <div style={fieldStyle}>
        <label>Role</label>
        <input
          type="text"
          value={fields.role}
          placeholder="developer"
          onChange={e => update('role', e.target.value)}
        />
      </div>

      <div style={fieldStyle}>
        <label>Goal (I want to...)</label>
        <textarea
          value={fields.goal}
          placeholder="I want to..."
          onChange={e => update('goal', e.target.value)}
          rows={2}
        />
      </div>

      <div style={fieldStyle}>
        <label>Reason (so that...)</label>
        <input
          type="text"
          value={fields.reason}
          placeholder="so that..."
          onChange={e => update('reason', e.target.value)}
        />
      </div>

      <div style={{
        padding: '8px 12px',
        backgroundColor: 'var(--vscode-input-background)',
        border: '1px solid var(--vscode-input-border, rgba(255,255,255,0.15))',
        borderRadius: 4,
        marginBottom: 14,
        fontSize: 12,
        fontStyle: 'italic',
        opacity: 0.85,
        lineHeight: 1.6
      }}>
        <span style={{ opacity: 0.6 }}>User story preview: </span>
        As a <strong>{role}</strong>, I want to <strong>{goal}</strong>, so that <strong>{reason}</strong>.
      </div>

      <div style={fieldStyle}>
        <label>Acceptance Criteria</label>
        <textarea
          value={fields.acceptanceCriteria}
          placeholder="- Given..., When..., Then...&#10;- The feature should..."
          onChange={e => update('acceptanceCriteria', e.target.value)}
          rows={4}
        />
      </div>

      <div style={fieldStyle}>
        <label>Scope Boundaries</label>
        <textarea
          value={fields.scopeBoundaries}
          placeholder="What should NOT be changed (e.g. do not modify the DB schema)"
          onChange={e => update('scopeBoundaries', e.target.value)}
          rows={2}
        />
      </div>

      <div style={fieldStyle}>
        <label>Dependencies / Constraints</label>
        <textarea
          value={fields.dependencies}
          placeholder="List any technical dependencies or constraints..."
          onChange={e => update('dependencies', e.target.value)}
          rows={2}
        />
      </div>
    </div>
  );
};
