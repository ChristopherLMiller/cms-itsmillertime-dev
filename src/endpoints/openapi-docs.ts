import type { OpenApiExtension } from '@seshuk/payload-plugin-openapi';

/**
 * OpenAPI Operation Objects attached via `custom.openapi` on Payload endpoints,
 * plus an extension for App Router routes the sidebar plugin requires.
 */

const errorSchema = {
  type: 'object' as const,
  properties: {
    error: { type: 'string' as const },
  },
  required: ['error'] as const,
};

const adminSecurity = [{ PayloadToken: [] }];

export const openapiHealth = {
  summary: 'Health check',
  description: 'Returns service health and database connectivity.',
  tags: ['System'],
  responses: {
    '200': {
      description: 'Service is healthy',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              healthStatus: { type: 'string', example: 'healthy' },
              timestamp: { type: 'string', format: 'date-time' },
              uptime: { type: 'number' },
              database: { type: 'string', example: 'connected' },
            },
          },
        },
      },
    },
    '500': {
      description: 'Service is unhealthy',
      content: { 'application/json': { schema: errorSchema } },
    },
  },
};

export const openapiContactForm = {
  summary: 'Submit contact form',
  description:
    'Queues a contact-form email job. Requires `CONTACT_EMAIL` and Resend configuration.',
  tags: ['Public'],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['name', 'email', 'message'],
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            message: { type: 'string' },
          },
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Message queued',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: { success: { type: 'boolean', example: true } },
          },
        },
      },
    },
    '400': {
      description: 'Validation error',
      content: { 'application/json': { schema: errorSchema } },
    },
    '500': {
      description: 'Queue or configuration failure',
      content: { 'application/json': { schema: errorSchema } },
    },
  },
};

export const openapiGalleryImageTracking = {
  summary: 'Track gallery image event',
  description: 'Increments a tracking counter on a gallery image (view, download, like, etc.).',
  tags: ['Public'],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['id', 'event'],
          properties: {
            id: { type: 'integer', minimum: 1 },
            event: {
              type: 'string',
              enum: ['view', 'download', 'like', 'dislike', 'share'],
            },
          },
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Updated tracking counts',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              tracking: {
                type: 'object',
                properties: {
                  views: { type: 'integer' },
                  downloads: { type: 'integer' },
                  likes: { type: 'integer' },
                  dislikes: { type: 'integer' },
                  comments: { type: 'integer' },
                  shares: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    '400': {
      description: 'Invalid id or event',
      content: { 'application/json': { schema: errorSchema } },
    },
    '404': {
      description: 'Gallery image not found',
      content: { 'application/json': { schema: errorSchema } },
    },
  },
};

export const openapiMedusaProductStatusGet = {
  summary: 'Get Medusa product status for a gallery image',
  description: 'Admin-only. Looks up the linked Medusa product for a gallery image.',
  tags: ['Medusa'],
  security: adminSecurity,
  parameters: [
    {
      name: 'galleryImageId',
      in: 'query',
      required: true,
      schema: { type: 'integer', minimum: 1 },
    },
  ],
  responses: {
    '200': { description: 'Product status payload' },
    '401': { description: 'Unauthorized' },
    '404': { description: 'Image or product not found' },
  },
};

export const openapiMedusaProductStatusPost = {
  summary: 'Set Medusa product publish status',
  description: 'Admin-only. Sets draft/published status on the linked Medusa product.',
  tags: ['Medusa'],
  security: adminSecurity,
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['galleryImageId', 'status'],
          properties: {
            galleryImageId: { type: 'integer', minimum: 1 },
            status: { type: 'string', enum: ['draft', 'published'] },
          },
        },
      },
    },
  },
  responses: {
    '200': { description: 'Status updated' },
    '400': { description: 'Validation error' },
    '401': { description: 'Unauthorized' },
  },
};

export const openapiMedusaProductCreate = {
  summary: 'Create Medusa product from gallery image',
  description: 'Admin-only. Creates a Medusa product and stores `medusaProductId` on the image.',
  tags: ['Medusa'],
  security: adminSecurity,
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['galleryImageId', 'title'],
          properties: {
            galleryImageId: { type: 'integer', minimum: 1 },
            title: { type: 'string' },
            description: { type: 'string' },
            sku: { type: 'string' },
            sellsDigital: { type: 'boolean' },
            digitalPriceUSD: { type: 'number' },
            offeringSetIds: { type: 'array', items: { type: 'string' } },
            imageSource: { type: 'string', enum: ['gallery', 'upload', 'keep'] },
            collectionId: { type: 'string', nullable: true },
            salesChannelId: { type: 'string', nullable: true },
            shippingProfileId: { type: 'string' },
          },
        },
      },
    },
  },
  responses: {
    '200': { description: 'Product created' },
    '400': { description: 'Validation error' },
    '401': { description: 'Unauthorized' },
    '409': { description: 'Image already listed' },
  },
};

export const openapiMedusaProductUpdate = {
  summary: 'Update Medusa product for a gallery image',
  description: 'Admin-only. Updates the linked Medusa product.',
  tags: ['Medusa'],
  security: adminSecurity,
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['galleryImageId', 'title'],
          properties: {
            galleryImageId: { type: 'integer', minimum: 1 },
            title: { type: 'string' },
            description: { type: 'string' },
            sku: { type: 'string' },
            sellsDigital: { type: 'boolean' },
            digitalPriceUSD: { type: 'number' },
            offeringSetIds: { type: 'array', items: { type: 'string' } },
            imageSource: { type: 'string', enum: ['gallery', 'upload', 'keep'] },
            collectionId: { type: 'string', nullable: true },
            salesChannelId: { type: 'string', nullable: true },
            shippingProfileId: { type: 'string' },
          },
        },
      },
    },
  },
  responses: {
    '200': { description: 'Product updated' },
    '400': { description: 'Validation error' },
    '401': { description: 'Unauthorized' },
    '409': { description: 'Image is not listed yet' },
  },
};

export const openapiMedusaProductDelete = {
  summary: 'Delete Medusa product for a gallery image',
  description: 'Admin-only. Deletes the Medusa product and clears the Payload pointer.',
  tags: ['Medusa'],
  security: adminSecurity,
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['galleryImageId'],
          properties: {
            galleryImageId: { type: 'integer', minimum: 1 },
          },
        },
      },
    },
  },
  responses: {
    '200': { description: 'Product deleted' },
    '401': { description: 'Unauthorized' },
  },
};

export const openapiMedusaCollectionsGet = {
  summary: 'List Medusa collections',
  tags: ['Medusa'],
  security: adminSecurity,
  responses: {
    '200': { description: 'Collections list' },
    '401': { description: 'Unauthorized' },
  },
};

export const openapiMedusaCollectionsPost = {
  summary: 'Create Medusa collection',
  tags: ['Medusa'],
  security: adminSecurity,
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string' },
          },
        },
      },
    },
  },
  responses: {
    '200': { description: 'Collection created' },
    '400': { description: 'Validation error' },
    '401': { description: 'Unauthorized' },
  },
};

export const openapiMedusaSalesChannels = {
  summary: 'List Medusa sales channels',
  tags: ['Medusa'],
  security: adminSecurity,
  responses: {
    '200': { description: 'Sales channels list' },
    '401': { description: 'Unauthorized' },
  },
};

export const openapiMedusaOfferingSets = {
  summary: 'List Medusa offering sets',
  tags: ['Medusa'],
  security: adminSecurity,
  responses: {
    '200': { description: 'Offering sets list' },
    '401': { description: 'Unauthorized' },
  },
};

export const openapiMedusaShippingProfiles = {
  summary: 'List Medusa shipping profiles',
  tags: ['Medusa'],
  security: adminSecurity,
  responses: {
    '200': { description: 'Shipping profiles list' },
    '401': { description: 'Unauthorized' },
  },
};

export const openapiClockifyProjects = {
  summary: 'List Clockify projects',
  description: 'Admin-only. Proxies Clockify workspace projects.',
  tags: ['Clockify'],
  security: adminSecurity,
  responses: {
    '200': { description: 'Projects list' },
    '401': { description: 'Unauthorized' },
    '502': { description: 'Upstream Clockify error' },
    '503': { description: 'Clockify not configured' },
  },
};

export const openapiClockifyTimerGet = {
  summary: 'Get in-progress Clockify timer',
  description: 'Admin-only. Returns the current running timer(s) for the API-key user.',
  tags: ['Clockify'],
  security: adminSecurity,
  responses: {
    '200': {
      description: 'Timer status',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              isRunning: { type: 'boolean' },
              timer: { nullable: true },
              timers: { type: 'array' },
            },
          },
        },
      },
    },
    '401': { description: 'Unauthorized' },
    '502': { description: 'Upstream Clockify error' },
    '503': { description: 'Clockify not configured' },
  },
};

export const openapiClockifyTimerStart = {
  summary: 'Start Clockify timer',
  description: 'Admin-only. Starts a new time entry.',
  tags: ['Clockify'],
  security: adminSecurity,
  requestBody: {
    required: false,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            projectId: { type: 'string' },
            description: { type: 'string' },
            billable: { type: 'boolean' },
            start: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  responses: {
    '200': { description: 'Timer started' },
    '400': { description: 'Validation error' },
    '401': { description: 'Unauthorized' },
    '502': { description: 'Upstream Clockify error' },
    '503': { description: 'Clockify not configured' },
  },
};

export const openapiClockifyTimerStop = {
  summary: 'Stop Clockify timer',
  description: 'Admin-only. Stops the running time entry.',
  tags: ['Clockify'],
  security: adminSecurity,
  requestBody: {
    required: false,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            end: {
              type: 'string',
              format: 'date-time',
              description: 'ISO-8601 end time; defaults to now',
            },
          },
        },
      },
    },
  },
  responses: {
    '200': { description: 'Timer stopped' },
    '401': { description: 'Unauthorized' },
    '502': { description: 'Upstream Clockify error' },
    '503': { description: 'Clockify not configured' },
  },
};

export const openapiBggCollection = {
  summary: 'BoardGameGeek collection proxy',
  description:
    'Public. Fetches a BGG collection with Redis KV stale-while-revalidate caching.',
  tags: ['Integrations'],
  parameters: [
    {
      name: 'username',
      in: 'query',
      required: true,
      schema: { type: 'string' },
    },
    {
      name: 'stats',
      in: 'query',
      required: false,
      schema: { type: 'integer', enum: [0, 1], default: 0 },
      description: 'Include BGG stats when set to 1',
    },
  ],
  responses: {
    '200': { description: 'Parsed collection (fresh, stale, revalidated, or fallback)' },
    '202': { description: 'BGG accepted the request; try again shortly' },
    '400': { description: 'Missing username or invalid stats' },
    '500': { description: 'Proxy failure' },
  },
};

export const openapiLastfmNowPlaying = {
  summary: 'Last.fm now playing',
  description: 'Public. Returns the current/last scrobbled track with Redis KV caching.',
  tags: ['Integrations'],
  responses: {
    '200': {
      description: 'Now-playing payload',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              isPlaying: { type: 'boolean' },
              track: { nullable: true },
            },
          },
        },
      },
    },
    '502': { description: 'Upstream Last.fm error' },
    '503': { description: 'Last.fm not configured' },
  },
};

const pinnedItemSchema = {
  type: 'object' as const,
  required: ['slug', 'type', 'order'],
  properties: {
    slug: { type: 'string' as const },
    type: { type: 'string' as const, enum: ['collection', 'global', 'custom'] },
    order: { type: 'integer' as const },
  },
};

/**
 * Next.js App Router routes required by `payload-sidebar-plugin` (and our jobs badge).
 * Documented via extension because they are not Payload endpoints.
 */
export const navRoutesExtension: OpenApiExtension = {
  tags: [
    {
      name: 'Admin Nav',
      description:
        'App Router routes for payload-sidebar-plugin pinned nav (`pinnedStorage: preferences`) and the jobs badge. Same-origin admin session required.',
    },
  ],
  paths: {
    '/nav/pinned': {
      get: {
        summary: 'List pinned sidebar items',
        tags: ['Admin Nav'],
        security: adminSecurity,
        responses: {
          '200': {
            description: 'Pinned items for the current user (empty when unauthenticated)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    pinnedItems: { type: 'array', items: pinnedItemSchema },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/nav/pin': {
      post: {
        summary: 'Pin a sidebar item',
        tags: ['Admin Nav'],
        security: adminSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['slug', 'type'],
                properties: {
                  slug: { type: 'string' },
                  type: { type: 'string', enum: ['collection', 'global', 'custom'] },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Pinned (or already pinned)' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/nav/unpin': {
      post: {
        summary: 'Unpin a sidebar item',
        tags: ['Admin Nav'],
        security: adminSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['slug', 'type'],
                properties: {
                  slug: { type: 'string' },
                  type: { type: 'string', enum: ['collection', 'global', 'custom'] },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Unpinned' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/nav/reorder': {
      post: {
        summary: 'Reorder pinned sidebar items',
        tags: ['Admin Nav'],
        security: adminSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items'],
                properties: {
                  items: { type: 'array', items: pinnedItemSchema },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Reordered' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/nav/jobs': {
      get: {
        summary: 'Count active Payload jobs',
        description: 'Used by NavBadgeProvider for the jobs sidebar badge.',
        tags: ['Admin Nav'],
        security: adminSecurity,
        responses: {
          '200': {
            description: 'Active jobs count (0 when unauthenticated)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    count: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
