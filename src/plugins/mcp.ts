import { mcpPlugin as payloadMcpPlugin } from '@payloadcms/plugin-mcp';
export function mcpPlugin() {
  return payloadMcpPlugin({
    collections: {
      models: {
        enabled: true,
        description: 'Models',
      },
    },
  });
}
