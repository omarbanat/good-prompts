import React, { useState } from 'react';
import { MCPServerConfig, MCPResourceItem, MCPToolItem, MCPAttachedItem } from '../../shared/types';
import { postMessage } from '../hooks/useVSCode';

export interface ServerBrowseState {
  loading: boolean;
  error?: string;
  resources: MCPResourceItem[];
  tools: MCPToolItem[];
}

interface Props {
  servers: MCPServerConfig[];
  mcpItems: MCPAttachedItem[];
  browseState: Record<string, ServerBrowseState>;
  onBrowse: (serverId: string) => void;
  onRemoveItem: (id: string) => void;
}

const btnStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  color: 'var(--vscode-editor-foreground)',
  border: '1px solid var(--vscode-input-border, rgba(255,255,255,0.2))',
  padding: '2px 8px',
  fontSize: 11,
  cursor: 'pointer',
  borderRadius: 3,
  whiteSpace: 'nowrap'
};

const ToolRow: React.FC<{ tool: MCPToolItem; serverId: string; serverName: string }> = ({ tool, serverId, serverName }) => {
  const [expanded, setExpanded] = useState(false);
  const [argsText, setArgsText] = useState('{}');

  const hasArgs = Boolean(
    tool.inputSchema &&
    typeof tool.inputSchema === 'object' &&
    Object.keys((tool.inputSchema as { properties?: object }).properties ?? {}).length > 0
  );

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    let args: Record<string, unknown> = {};
    try { args = JSON.parse(argsText); } catch { return; }
    postMessage({ type: 'callMCPTool', payload: { serverId, toolName: tool.name, args, label: `${tool.name} (${serverName})` } });
    setExpanded(false);
  };

  return (
    <div style={{ padding: '5px 0', borderBottom: '1px solid var(--vscode-panel-border)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 500 }}>{tool.name}</div>
          {tool.description && (
            <div style={{ fontSize: 11, opacity: 0.55, marginTop: 1 }}>{tool.description}</div>
          )}
        </div>
        {hasArgs ? (
          <button onClick={() => setExpanded(e => !e)} style={btnStyle}>
            {expanded ? 'Hide' : 'Args'}
          </button>
        ) : (
          <button onClick={handleCall} style={btnStyle}>Call</button>
        )}
      </div>
      {expanded && (
        <div style={{ marginTop: 6 }}>
          <textarea
            value={argsText}
            onChange={e => setArgsText(e.target.value)}
            rows={3}
            placeholder='{"key": "value"}'
            style={{
              width: '100%', fontSize: 11,
              fontFamily: 'var(--vscode-editor-font-family, monospace)',
              backgroundColor: 'var(--vscode-input-background)',
              color: 'var(--vscode-input-foreground)',
              border: '1px solid var(--vscode-input-border, rgba(255,255,255,0.15))',
              borderRadius: 3, padding: '4px 6px', boxSizing: 'border-box', resize: 'vertical', outline: 'none'
            }}
          />
          <button onClick={handleCall} style={{ ...btnStyle, marginTop: 4 }}>Call tool</button>
        </div>
      )}
    </div>
  );
};

export const MCPSection: React.FC<Props> = ({ servers, mcpItems, browseState, onBrowse, onRemoveItem }) => {
  const [activeServerIds, setActiveServerIds] = useState<string[]>([]);
  const [expandedServer, setExpandedServer] = useState<string | null>(null);

  const inactiveServers = servers.filter(s => !activeServerIds.includes(s.id));
  const activeServers = servers.filter(s => activeServerIds.includes(s.id));

  const activateServer = (id: string) => {
    setActiveServerIds(prev => [...prev, id]);
  };

  const deactivateServer = (id: string) => {
    setActiveServerIds(prev => prev.filter(s => s !== id));
    if (expandedServer === id) { setExpandedServer(null); }
  };

  const toggleExpand = (serverId: string) => {
    if (expandedServer === serverId) {
      setExpandedServer(null);
    } else {
      setExpandedServer(serverId);
      if (!browseState[serverId]) { onBrowse(serverId); }
    }
  };

  if (servers.length === 0) { return null; }

  return (
    <div style={{
      marginBottom: 16, padding: 12,
      backgroundColor: 'var(--vscode-sideBar-background)',
      border: '1px solid var(--vscode-panel-border)', borderRadius: 6
    }}>
      <div style={{ marginBottom: 10 }}>
        <span style={{ fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.75 }}>
          MCP Context
        </span>
        {inactiveServers.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
            {inactiveServers.map(s => (
              <button
                key={s.id}
                onClick={() => activateServer(s.id)}
                style={{
                  backgroundColor: 'var(--vscode-input-background)',
                  color: 'var(--vscode-editor-foreground)',
                  border: '1px solid var(--vscode-input-border, rgba(255,255,255,0.2))',
                  borderRadius: 3, fontSize: 11, padding: '2px 8px', cursor: 'pointer'
                }}
              >
                + {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Attached items */}
      {mcpItems.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {mcpItems.map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
              padding: '3px 8px', borderRadius: 3,
              backgroundColor: 'var(--vscode-input-background)',
              borderLeft: '2px solid var(--vscode-button-background)'
            }}>
              <span style={{ fontSize: 12, flex: 1 }}>{item.label}</span>
              <span style={{ fontSize: 10, opacity: 0.5 }}>{item.serverName}</span>
              <button
                onClick={() => onRemoveItem(item.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, opacity: 0.5, padding: '0 2px' }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {activeServers.length === 0 && mcpItems.length === 0 && (
        <div style={{ fontSize: 11, opacity: 0.5 }}>
          Select a server above to attach context for this issue.
        </div>
      )}

      {/* Active servers */}
      {activeServers.map(server => {
        const state = browseState[server.id];
        const isExpanded = expandedServer === server.id;

        return (
          <div key={server.id} style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, flex: 1 }}>{server.name}</span>
              <span style={{ fontSize: 10, opacity: 0.45 }}>{server.transport}</span>
              {isExpanded && state && !state.loading && (
                <button onClick={() => onBrowse(server.id)} style={btnStyle} title="Refresh">↺</button>
              )}
              <button onClick={() => toggleExpand(server.id)} style={btnStyle}>
                {isExpanded ? 'Hide' : 'Browse'}
              </button>
              <button
                onClick={() => deactivateServer(server.id)}
                title="Remove from this issue"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: 0.45, padding: '0 2px' }}
              >
                ✕
              </button>
            </div>

            {isExpanded && (
              <div style={{
                marginTop: 6, padding: '8px 10px', borderRadius: 4,
                backgroundColor: 'var(--vscode-input-background)',
                maxHeight: 280, overflowY: 'auto'
              }}>
                {!state || state.loading ? (
                  <div style={{ fontSize: 11, opacity: 0.6 }}>Connecting...</div>
                ) : state.error ? (
                  <div style={{ fontSize: 11, color: 'var(--vscode-errorForeground, #f48771)' }}>
                    {state.error}
                  </div>
                ) : (
                  <>
                    {state.resources.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, opacity: 0.55, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Resources ({state.resources.length})
                        </div>
                        {state.resources.map(r => (
                          <div
                            key={r.uri}
                            onClick={() => postMessage({ type: 'fetchMCPResource', payload: { serverId: server.id, uri: r.uri, label: `${r.name} (${server.name})` } })}
                            title={r.description ?? r.uri}
                            style={{
                              padding: '4px 0', cursor: 'pointer',
                              borderBottom: '1px solid var(--vscode-panel-border)',
                              display: 'flex', alignItems: 'center', gap: 8
                            }}
                          >
                            <span style={{ fontSize: 12, flex: 1 }}>{r.name}</span>
                            {r.description && (
                              <span style={{ fontSize: 10, opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                                {r.description}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {state.tools.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, opacity: 0.55, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Tools ({state.tools.length})
                        </div>
                        {state.tools.map(t => (
                          <ToolRow key={t.name} tool={t} serverId={server.id} serverName={server.name} />
                        ))}
                      </div>
                    )}

                    {state.resources.length === 0 && state.tools.length === 0 && (
                      <div style={{ fontSize: 11, opacity: 0.5 }}>No resources or tools found.</div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
