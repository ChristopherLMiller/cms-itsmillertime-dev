// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres';
import { redisKVAdapter } from '@payloadcms/kv-redis';
import path from 'path';
import { buildConfig, PayloadRequest, Where } from 'payload';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { resendAdapter } from '@payloadcms/email-resend';
import { GalleryAlbums } from './collections/Gallery/Album';
import { GalleryCategories } from './collections/Gallery/Categories';
import { GalleryImages } from './collections/Gallery/Image';
import { GalleryTags } from './collections/Gallery/Tags';
import { Gardens } from './collections/Gardens';
import { MapMarkers } from './collections/Map';
import { Media } from './collections/Media/Media';
import { Kits } from './collections/Models/Kits';
import { Manufacturers } from './collections/Models/Manufacturers';
import { Models } from './collections/Models/Models';
import { Scales } from './collections/Models/Scales';
import { ModelsTags } from './collections/Models/Tags';
import { Pages } from './collections/Pages';
import { PostsCategories } from './collections/Posts/Categories';
import { Posts } from './collections/Posts/Posts';
import { PostsTags } from './collections/Posts/Tags';
import { ProjectsCategories } from './collections/Projects/Categories';
import { Projects } from './collections/Projects/Projects';
import { ProjectsTechnologies } from './collections/Projects/Technologies';
import { Users } from './collections/Users';
import { defaultLexical } from './fields/defaultLexical';
import { SiteMeta } from './globals/site-meta';
import { SiteNavigation } from './globals/site-navigation';
import { plugins } from './plugins';
import ExifReader from 'exifreader';
import { render } from '@react-email/render';
import React from 'react';
import { ResetPasswordEmail } from '../emails/reset-password';
import { VerifyAccountEmail } from '../emails/verify-account';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  email: resendAdapter({
    defaultFromAddress: 'support@itsmillertime.dev',
    defaultFromName: 'Payload CMS',
    apiKey: process.env.RESEND_API_KEY || '',
  }),
  endpoints: [
    {
      path: '/health',
      method: 'get',
      handler: async (req: PayloadRequest) => {
        try {
          // Tests database connectivity
          await req.payload.find({
            collection: 'users',
            limit: 1,
          });
          const response = {
            healthStatus: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: 'connected',
          };

          return Response.json(response, { status: 200 });
        } catch (error) {
          const response = {
            healthStatus: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
          };

          return Response.json(response, { status: 500 });
        }
      },
    },
  ],
  kv: redisKVAdapter({
    keyPrefix: 'payload:',
    redisURL: process.env.REDIS_URL || '',
  }),
  telemetry: false,
  cors: process.env.TRUSTED_ORIGINS?.split(',').map((o) => o.trim()) || [],
  csrf: process.env.TRUSTED_ORIGINS?.split(',').map((o) => o.trim()) || [],
  admin: {
    user: 'users',
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      providers: ['@/components/NavBadgeProvider'],
      views: {
        dashboard: {
          Component: '@/components/Dashboard#Dashboard',
        },
        bgg: {
          Component: '@/components/BGG',
          path: '/bgg',
        },
      },
    },
  },
  folders: {
    collectionSpecific: true,
    browseByFolder: false,
  },
  globals: [SiteMeta, SiteNavigation],
  collections: [
    MapMarkers,
    Users,
    Media,
    Posts,
    PostsCategories,
    PostsTags,
    Pages,
    GalleryAlbums,
    GalleryImages,
    GalleryTags,
    GalleryCategories,
    Gardens,
    Kits,
    Scales,
    Manufacturers,
    ModelsTags,
    Models,
    Projects,
    ProjectsCategories,
    ProjectsTechnologies,
  ],
  editor: defaultLexical,
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
  sharp,
  plugins: plugins,
  upload: {
    abortOnLimit: true,
    limits: {
      fileSize: 5 * 1024 * 1024 * 1024, // 5GB
    },
  },
  jobs: {
    jobsCollectionOverrides: ({ defaultJobsCollection }) => {
      if (!defaultJobsCollection.admin) {
        defaultJobsCollection.admin = {};
      }

      defaultJobsCollection.admin.hidden = false;
      return defaultJobsCollection;
    },
    tasks: [
      {
        slug: 'generateImageEXIF',
        retries: 5,
        inputSchema: [
          {
            name: 'id',
            type: 'number',
            required: true,
          },
          {
            name: 'collection',
            type: 'text',
            required: true,
          },
        ],
        handler: async ({ input, req }) => {
          console.log(`Start of EXIF generation task for ${input.collection} - ${input.id}`);

          const image = await req.payload.findByID({
            collection: input.collection,
            id: input.id,
          });

          // If the field isn't empty its already been generated, no need to proceed
          if (image.exif && image.exif !== null && image.exif !== undefined) {
            console.log('EXIF already generated');
            return {
              output: {
                exifGenerated: false,
                error: 'EXIF already generated',
              },
            };
          }

          // Now get the image file from payload storage so we can use that
          if (!image.filename) {
            console.log(`Image ${image.id} filename not found`);
            return {
              output: {
                exifGenerated: false,
                error: 'Image filename not found',
              },
            };
          }

          // Access storage through req.payload (storage may not be in TypeScript types but is available at runtime)
          const storage = (req.payload as any).storage;
          let fileBuffer: Buffer;

          if (storage) {
            // Use payload.storage to read the file
            fileBuffer = await storage.read({
              collection: input.collection,
              filename: image.filename,
            });
          } else {
            // Fallback to fetching from URL if storage is not available
            if (!image.url) {
              console.log(`Image ${image.id} URL not found`);
              return {
                output: {
                  exifGenerated: false,
                  error: 'Storage not available and image URL not found',
                },
              };
            }
            console.log(`Fetching image from ${process.env.NEXT_PUBLIC_SERVER_URL}${image.url}`);
            const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}${image.url}`);
            if (!response.ok) {
              console.log(`Failed to fetch image: ${response.statusText}`);
              return {
                output: {
                  exifGenerated: false,
                  error: `Failed to fetch image: ${response.statusText}`,
                },
              };
            }
            console.log('Image fetched, creating buffer from respose');
            fileBuffer = Buffer.from(await response.arrayBuffer());
          }

          // Now get the EXIF
          console.log('Loading EXIF from buffer');
          const exif = (await ExifReader.load(fileBuffer, { async: true, expanded: true })) as any;

          // updat the image with the EXIF data
          console.log('Updating image with EXIF data');
          await req.payload.update({
            collection: input.collection,
            id: image.id,
            data: {
              exif: exif || null,
            },
          });

          return {
            output: {
              exifGenerated: true,
            },
          };
        },
      },
      {
        slug: 'queueMissingEXIF',
        retries: 1,
        inputSchema: [],
        schedule: [
          {
            cron: '0 0 * * * *', // Every hour
            queue: 'exif',
          },
        ],
        handler: async ({ req }) => {
          const collections = ['media', 'gallery-images'] as const;
          let queued = 0;

          for (const collection of collections) {
            const where: Where =
              collection === 'media'
                ? { exif: { equals: null }, mimeType: { like: 'image%' } }
                : { exif: { equals: null } };

            let page = 1;
            const limit = 50;
            let hasMore = true;

            while (hasMore) {
              const result = await req.payload.find({
                collection,
                where,
                limit,
                page,
                depth: 0,
                overrideAccess: true,
              });

              for (const doc of result.docs) {
                await req.payload.jobs.queue({
                  task: 'generateImageEXIF',
                  input: { id: doc.id, collection },
                  queue: 'exif',
                });
                queued++;
              }

              hasMore = result.hasNextPage;
              page++;
            }
          }

          return { output: { queued } };
        },
      },
      {
        slug: 'sendResetPasswordEmail',
        retries: 3,
        inputSchema: [
          { name: 'user', type: 'json', required: true },
          { name: 'url', type: 'text', required: true },
        ],
        handler: async ({ input, req }) => {
          const user = input.user as { email: string; name?: string };
          const html = await render(
            React.createElement(ResetPasswordEmail, {
              url: input.url,
              userName: user.name,
            }),
          );
          await req.payload.email.sendEmail({
            to: user.email,
            subject: 'Reset your password',
            html,
          });
          return { output: { sent: true } };
        },
      },
      {
        slug: 'sendVerificationEmail',
        retries: 3,
        inputSchema: [
          { name: 'user', type: 'json', required: true },
          { name: 'url', type: 'text', required: true },
        ],
        handler: async ({ input, req }) => {
          const user = input.user as { email: string; name?: string };
          const html = await render(
            React.createElement(VerifyAccountEmail, {
              url: input.url,
              userName: user.name,
            }),
          );
          await req.payload.email.sendEmail({
            to: user.email,
            subject: 'Verify your email',
            html,
          });
          return { output: { sent: true } };
        },
      },
    ],
    autoRun: [
      {
        cron: '* * * * * *', // Every minute
        queue: 'default',
      },
      {
        cron: '* 0 * * * *', // Every hour
        queue: 'exif',
      },
      {
        cron: '* * * * * *', // Every minute
        queue: 'email',
      },
    ],
  },
});
