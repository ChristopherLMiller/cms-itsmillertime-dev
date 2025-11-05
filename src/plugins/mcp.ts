import { mcpPlugin as payloadMcpPlugin } from '@payloadcms/plugin-mcp';
export function mcpPlugin() {
  return payloadMcpPlugin({
    collections: {
      models: {
        enabled: true,
        description: 'Models',
      },
      'gallery-albums': {
        enabled: true,
        description: 'Gallery Albums',
      },
      'gallery-images': {
        enabled: true,
        description: 'Gallery Images',
      },
      'gallery-tags': {
        enabled: true,
        description: 'Gallery Tags',
      },
      'gallery-categories': {
        enabled: true,
        description: 'Gallery Categories',
      },
      media: {
        enabled: true,
        description: 'Media',
      },
      gardens: {
        enabled: true,
        description: 'Gardens',
      },
      kits: {
        enabled: true,
        description: 'Kits',
      },
      scales: {
        enabled: true,
        description: 'Scales',
      },
      manufacturers: {
        enabled: true,
        description: 'Manufacturers',
      },
      'models-tags': {
        enabled: true,
        description: 'Models Tags',
      },
      posts: {
        enabled: true,
        description: 'Posts',
      },
      'posts-categories': {
        enabled: true,
        description: 'Posts Categories',
      },
      'posts-tags': {
        enabled: true,
        description: 'Posts Tags',
      },
      pages: {
        enabled: true,
        description: 'Pages',
      },
      'map-markers': {
        enabled: true,
        description: 'Map Markers',
      },
    },
  });
}
