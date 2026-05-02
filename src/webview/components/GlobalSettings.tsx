import React, { useState } from 'react';
import { GlobalSettings as GlobalSettingsType, MCPServerConfig, MCPTransport, TargetTool } from '../../shared/types';
import { postMessage } from '../hooks/useVSCode';

interface Props {
  settings: GlobalSettingsType;
  onSave: (settings: GlobalSettingsType) => void;
  onCancel: () => void;
}

const TOOL_OPTIONS: { value: TargetTool; label: string }[] = [
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'copilot', label: 'Copilot' },
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'other', label: 'Other' }
];

const BLANK_SERVER = { name: '', transport: 'stdio' as MCPTransport, command: '', argsStr: '', url: '' };

export const GlobalSettings: React.FC<Props> = ({ settings, onSave, onCancel }) => {
  const [local, setLocal] = useState<GlobalSettingsType>({
    ...settings,
    mcpServers: [...(settings.mcpServers ?? [])]
  });
  const [addingServer, setAddingServer] = useState(false);
  const [newServer, setNewServer] = useState(BLANK_SERVER);

  const update = (field: keyof Omit<GlobalSettingsType, 'mcpServers'>, value: string) => {
    setLocal(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    postMessage({ type: 'saveSettings', payload: local });
    onSave(local);
  };

  const handleAddServer = () => {
    if (!newServer.name.trim()) { return; }
    const config: MCPServerConfig = {
      id: Date.now().toString(),
      name: newServer.name.trim(),
      transport: newServer.transport,
      command: newServer.transport === 'stdio' ? newServer.command.trim() || undefined : undefined,
      args: newServer.transport === 'stdio' && newServer.argsStr.trim()
        ? newServer.argsStr.trim().split(/\s+/)
        : undefined,
      url: newServer.transport === 'sse' ? newServer.url.trim() || undefined : undefined
    };
    setLocal(prev => ({ ...prev, mcpServers: [...prev.mcpServers, config] }));
    setNewServer(BLANK_SERVER);
    setAddingServer(false);
  };

  const handleDeleteServer = (id: string) => {
    setLocal(prev => ({ ...prev, mcpServers: prev.mcpServers.filter(s => s.id !== id) }));
  };

  const sectionStyle: React.CSSProperties = {
    padding: 16,
    backgroundColor: 'var(--vscode-sideBar-background)',
    border: '1px solid var(--vscode-panel-border)',
    borderRadius: 6,
    marginBottom: 16
  };

  const fieldStyle: React.CSSProperties = { marginBottom: 12 };

  const btnSecondary: React.CSSProperties = {
    backgroundColor: 'var(--vscode-input-background)',
    color: 'var(--vscode-editor-foreground)',
    border: '1px solid var(--vscode-input-border, rgba(255,255,255,0.2))',
    padding: '4px 10px', fontSize: 12, cursor: 'pointer', borderRadius: 3
  };

  return (
    <div style={sectionStyle}>
      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Global Settings</h2>

      <div style={fieldStyle}>
        <label>Primary Language</label>
        <input type="text" value={local.language} placeholder="TypeScript"
          onChange={e => update('language', e.target.value)} />
      </div>

      <div style={fieldStyle}>
        <label>Runtime / Environment</label>
        <input type="text" value={local.runtime} placeholder="Node.js 20"
          onChange={e => update('runtime', e.target.value)} />
      </div>

      <div style={fieldStyle}>
        <label>Framework</label>
        <input type="text" value={local.framework} placeholder="Express, React..."
          onChange={e => update('framework', e.target.value)} />
      </div>

      <div style={fieldStyle}>
        <label>Code Style Guide</label>
        <input type="text" value={local.styleGuide} placeholder="Airbnb, Google, PEP 8..."
          onChange={e => update('styleGuide', e.target.value)} />
      </div>

      <div style={fieldStyle}>
        <label>Default AI Tool</label>
        <select value={local.defaultTool} onChange={e => update('defaultTool', e.target.value as TargetTool)}>
          {TOOL_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* MCP Servers */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--vscode-panel-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.75 }}>
            MCP Servers
          </label>
          {!addingServer && (
            <button onClick={() => setAddingServer(true)} style={btnSecondary}>+ Add</button>
          )}
        </div>

        {local.mcpServers.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            {local.mcpServers.map(server => (
              <div key={server.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 8px', marginBottom: 4, borderRadius: 3,
                backgroundColor: 'var(--vscode-input-background)',
                fontSize: 12
              }}>
                <span style={{ flex: 1, fontWeight: 500 }}>{server.name}</span>
                <span style={{ opacity: 0.5 }}>{server.transport}</span>
                <span style={{ opacity: 0.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                  {server.transport === 'stdio' ? server.command : server.url}
                </span>
                <button
                  onClick={() => handleDeleteServer(server.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, fontSize: 12, padding: '0 2px' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {addingServer && (
          <div style={{
            padding: 12, borderRadius: 4, marginBottom: 10,
            backgroundColor: 'var(--vscode-input-background)',
            border: '1px solid var(--vscode-input-border, rgba(255,255,255,0.15))'
          }}>
            <div style={fieldStyle}>
              <label style={{ fontSize: 11 }}>Name</label>
              <input type="text" value={newServer.name} placeholder="Figma, GitHub..."
                onChange={e => setNewServer(prev => ({ ...prev, name: e.target.value }))} />
            </div>

            <div style={fieldStyle}>
              <label style={{ fontSize: 11 }}>Transport</label>
              <select
                value={newServer.transport}
                onChange={e => setNewServer(prev => ({ ...prev, transport: e.target.value as MCPTransport }))}
              >
                <option value="stdio">stdio (local process)</option>
                <option value="sse">SSE (HTTP server)</option>
              </select>
            </div>

            {newServer.transport === 'stdio' ? (
              <>
                <div style={fieldStyle}>
                  <label style={{ fontSize: 11 }}>Command</label>
                  <input type="text" value={newServer.command} placeholder="npx figma-mcp"
                    onChange={e => setNewServer(prev => ({ ...prev, command: e.target.value }))} />
                </div>
                <div style={fieldStyle}>
                  <label style={{ fontSize: 11 }}>Args (space-separated)</label>
                  <input type="text" value={newServer.argsStr} placeholder="--api-key abc123"
                    onChange={e => setNewServer(prev => ({ ...prev, argsStr: e.target.value }))} />
                </div>
              </>
            ) : (
              <div style={fieldStyle}>
                <label style={{ fontSize: 11 }}>URL</label>
                <input type="text" value={newServer.url} placeholder="http://localhost:3000/sse"
                  onChange={e => setNewServer(prev => ({ ...prev, url: e.target.value }))} />
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleAddServer}
                disabled={!newServer.name.trim()}
                style={{
                  backgroundColor: 'var(--vscode-button-background)',
                  color: 'var(--vscode-button-foreground)',
                  padding: '4px 12px', fontSize: 12, fontWeight: 600,
                  border: 'none', borderRadius: 3, cursor: newServer.name.trim() ? 'pointer' : 'default',
                  opacity: newServer.name.trim() ? 1 : 0.5
                }}
              >
                Add
              </button>
              <button onClick={() => { setAddingServer(false); setNewServer(BLANK_SERVER); }} style={btnSecondary}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          onClick={handleSave}
          style={{
            backgroundColor: 'var(--vscode-button-background)',
            color: 'var(--vscode-button-foreground)',
            padding: '6px 16px',
            fontWeight: 600
          }}
        >
          Save
        </button>
        <button onClick={onCancel} style={btnSecondary}>
          Cancel
        </button>
      </div>
    </div>
  );
};
