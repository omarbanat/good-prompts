import React from 'react';
import { BugFixFields, ContextData, ContextAttachments } from '../../shared/types';

interface Props {
  fields: BugFixFields;
  contextData: ContextData;
  contextAttachments: ContextAttachments;
  onChange: (fields: BugFixFields) => void;
}

export const BugFixForm: React.FC<Props> = ({ fields, contextData, contextAttachments, onChange }) => {
  const update = (key: keyof BugFixFields, value: string) => {
    onChange({ ...fields, [key]: value });
  };

  // Pre-fill actual behavior from terminal error if attachment is enabled
  const actualBehaviorPlaceholder =
    contextAttachments.terminalError && contextData.terminalError
      ? contextData.terminalError.slice(0, 200)
      : 'Describe what actually happens...';

  const fieldStyle: React.CSSProperties = { marginBottom: 14 };

  return (
    <div>
      <div style={fieldStyle}>
        <label>What is broken?</label>
        <textarea
          value={fields.whatIsBroken}
          placeholder="Describe the bug in detail..."
          onChange={e => update('whatIsBroken', e.target.value)}
          rows={3}
        />
      </div>

      <div style={fieldStyle}>
        <label>Expected behavior</label>
        <textarea
          value={fields.expectedBehavior}
          placeholder="What should happen instead?"
          onChange={e => update('expectedBehavior', e.target.value)}
          rows={3}
        />
      </div>

      <div style={fieldStyle}>
        <label>
          Actual behavior
          {contextAttachments.terminalError && contextData.terminalError && (
            <span style={{ opacity: 0.6, marginLeft: 6, fontStyle: 'italic', textTransform: 'none', fontSize: 11 }}>
              (pre-filled from terminal error)
            </span>
          )}
        </label>
        <textarea
          value={
            fields.actualBehavior ||
            (contextAttachments.terminalError && contextData.terminalError
              ? contextData.terminalError
              : '')
          }
          placeholder={actualBehaviorPlaceholder}
          onChange={e => update('actualBehavior', e.target.value)}
          rows={3}
        />
      </div>

      <div style={fieldStyle}>
        <label>Constraints</label>
        <input
          type="text"
          value={fields.constraints}
          placeholder="e.g. do not change the function signature"
          onChange={e => update('constraints', e.target.value)}
        />
      </div>
    </div>
  );
};
