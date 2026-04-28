import React from 'react';
import { RefactorFields, RefactorGoal } from '../../shared/types';

interface Props {
  fields: RefactorFields;
  onChange: (fields: RefactorFields) => void;
}

const REFACTOR_GOALS: { value: RefactorGoal; label: string }[] = [
  { value: 'performance', label: 'Performance' },
  { value: 'readability', label: 'Readability' },
  { value: 'security', label: 'Security' },
  { value: 'testability', label: 'Testability' }
];

export const RefactorForm: React.FC<Props> = ({ fields, onChange }) => {
  const update = (key: keyof RefactorFields, value: string) => {
    onChange({ ...fields, [key]: value });
  };

  const fieldStyle: React.CSSProperties = { marginBottom: 14 };

  return (
    <div>
      <div style={fieldStyle}>
        <label>Current State</label>
        <textarea
          value={fields.currentState}
          placeholder="Describe what exists now and what the problems are..."
          onChange={e => update('currentState', e.target.value)}
          rows={3}
        />
      </div>

      <div style={fieldStyle}>
        <label>Refactor Goal</label>
        <select
          value={fields.refactorGoal}
          onChange={e => update('refactorGoal', e.target.value as RefactorGoal)}
        >
          <option value="">Select a goal...</option>
          {REFACTOR_GOALS.map(g => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
      </div>

      <div style={fieldStyle}>
        <label>Constraints</label>
        <textarea
          value={fields.constraints}
          placeholder="e.g. no new dependencies, keep same public API"
          onChange={e => update('constraints', e.target.value)}
          rows={2}
        />
      </div>

      <div style={fieldStyle}>
        <label>Target Output Format</label>
        <input
          type="text"
          value={fields.targetOutputFormat}
          placeholder="e.g. inline comments explaining changes"
          onChange={e => update('targetOutputFormat', e.target.value)}
        />
      </div>
    </div>
  );
};
