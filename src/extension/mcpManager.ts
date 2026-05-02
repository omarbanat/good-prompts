import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { MCPServerConfig, MCPResourceItem, MCPToolItem } from '../shared/types';

export class MCPManager {
  private clients = new Map<string, Client>();

  private async connect(config: MCPServerConfig): Promise<Client> {
    const existing = this.clients.get(config.id);
    if (existing) { return existing; }

    let transport;
    if (config.transport === 'stdio') {
      if (!config.command) { throw new Error(`Server "${config.name}" requires a command`); }
      transport = new StdioClientTransport({
        command: config.command,
        args: config.args ?? [],
        env: config.env ? { ...process.env, ...config.env } as Record<string, string> : undefined
      });
    } else {
      if (!config.url) { throw new Error(`Server "${config.name}" requires a URL`); }
      transport = new SSEClientTransport(new URL(config.url));
    }

    const client = new Client(
      { name: 'goodprompts', version: '0.2.0' },
      { capabilities: {} }
    );
    await client.connect(transport);
    this.clients.set(config.id, client);
    return client;
  }

  async browse(config: MCPServerConfig): Promise<{ resources: MCPResourceItem[]; tools: MCPToolItem[] }> {
    // Reconnect if a previous connection was lost
    if (this.clients.has(config.id)) {
      this.clients.delete(config.id);
    }
    const client = await this.connect(config);

    const [resourcesResult, toolsResult] = await Promise.allSettled([
      client.listResources(),
      client.listTools()
    ]);

    const resources: MCPResourceItem[] = resourcesResult.status === 'fulfilled'
      ? resourcesResult.value.resources.map(r => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: r.mimeType
        }))
      : [];

    const tools: MCPToolItem[] = toolsResult.status === 'fulfilled'
      ? toolsResult.value.tools.map(t => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema as Record<string, unknown> | undefined
        }))
      : [];

    return { resources, tools };
  }

  async readResource(config: MCPServerConfig, uri: string): Promise<string> {
    const client = await this.connect(config);
    const { contents } = await client.readResource({ uri });
    return contents
      .map(c => ('text' in c ? (c.text as string) : `[binary: ${('uri' in c ? c.uri : uri)}]`))
      .join('\n');
  }

  async callTool(config: MCPServerConfig, toolName: string, args: Record<string, unknown>): Promise<string> {
    const client = await this.connect(config);
    const result = await client.callTool({ name: toolName, arguments: args });
    const content = result.content as Array<{ type: string; text?: string }>;
    return content.filter(c => c.type === 'text').map(c => c.text ?? '').join('\n');
  }

  async dispose(): Promise<void> {
    await Promise.all(Array.from(this.clients.values()).map(c => c.close().catch(() => {})));
    this.clients.clear();
  }
}
