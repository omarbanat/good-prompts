import React from 'react';
import { QualityScore } from '../../shared/types';

interface Props {
  score: QualityScore;
}

function getScoreColor(total: number): string {
  if (total < 50) { return '#f44747'; }
  if (total < 75) { return '#ddb100'; }
  return '#4daf4a';
}

function getScoreLabel(total: number): string {
  if (total < 50) { return 'Not ready'; }
  if (total < 75) { return 'Needs improvement'; }
  return 'Ready to submit';
}

interface SubScoreProps {
  label: string;
  value: number;
  max: number;
}

const SubScore: React.FC<SubScoreProps> = ({ label, value, max }) => {
  const color = getScoreColor((value / max) * 100);
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 10,
      backgroundColor: 'var(--vscode-input-background)',
      border: '1px solid var(--vscode-input-border, rgba(255,255,255,0.15))',
      fontSize: 11
    }}>
      <span style={{ opacity: 0.75 }}>{label}:</span>
      <span style={{ color, fontWeight: 600 }}>{value}/{max}</span>
    </div>
  );
};

export const QualityScorer: React.FC<Props> = ({ score }) => {
  const color = getScoreColor(score.total);
  const label = getScoreLabel(score.total);

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
          Prompt Quality
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color }}>{score.total}</span>
          <span style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 10,
            backgroundColor: color,
            color: '#fff',
            fontWeight: 600
          }}>
            {label}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 6,
        backgroundColor: 'var(--vscode-input-background)',
        borderRadius: 3,
        marginBottom: 10,
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${score.total}%`,
          backgroundColor: color,
          borderRadius: 3,
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Sub-scores */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: score.suggestions.length > 0 ? 10 : 0 }}>
        <SubScore label="Clarity" value={score.clarity} max={25} />
        <SubScore label="Context" value={score.context} max={25} />
        <SubScore label="Scope" value={score.scope} max={25} />
        <SubScore label="Output" value={score.expectedOutput} max={25} />
      </div>

      {/* Suggestions (shown if score < 60) */}
      {score.total < 60 && score.suggestions.length > 0 && (
        <div style={{
          padding: '8px 10px',
          backgroundColor: 'var(--vscode-input-background)',
          borderRadius: 4,
          borderLeft: `3px solid ${color}`
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, opacity: 0.75 }}>Suggestions</div>
          <ul style={{ paddingLeft: 16, margin: 0 }}>
            {score.suggestions.map((s, i) => (
              <li key={i} style={{ fontSize: 11, opacity: 0.85, marginBottom: 2 }}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
