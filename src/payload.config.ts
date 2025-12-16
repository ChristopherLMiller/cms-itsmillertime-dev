// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres';
import { redisKVAdapter } from '@payloadcms/kv-redis';
import path from 'path';
import { buildConfig, PayloadRequest } from 'payload';
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
import { Roles } from './collections/RBAC/Roles';
import { Users } from './collections/Users';
import { defaultLexical } from './fields/defaultLexical';
import { SiteMeta } from './globals/site-meta';
import { SiteNavigation } from './globals/site-navigation';
import { plugins } from './plugins';
import ExifReader from 'exifreader';

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
  graphQL: {
    disable: true,
  },
  kv: redisKVAdapter({
    keyPrefix: 'payload:',
    redisURL: process.env.REDIS_URL || '',
  }),
  telemetry: false,
  cors: '*',
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      providers: ['@/components/NavBadgeProvider'],
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
    Roles,
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
  serverURL: process.env.PAYLOAD_SERVER_URL,
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
        slug: 'sendWelcomeEmail',
        retries: 3,
        inputSchema: [
          {
            name: 'userEmail',
            type: 'email',
            required: true,
          },
          {
            name: 'userName',
            type: 'text',
            required: true,
          },
        ],
        handler: async ({ input, req }) => {
          await req.payload.sendEmail({
            to: input.userEmail,
            subject: 'Welcome!',
            text: `Hi ${input.username}, welcome to our platform!`,
          });

          return {
            output: {
              emailSent: true,
            },
          };
        },
      },
      {
        slug: 'generateImageEXIF',
        retries: 1,
        inputSchema: [
          {
            name: 'imageId',
            type: 'number',
            required: true,
          },
        ],
        handler: async ({ input, req }) => {
          const image = await req.payload.findByID({
            collection: 'media',
            id: input.imageId,
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
              collection: 'media',
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
            const response = await fetch(image.url);
            if (!response.ok) {
              console.log(`Failed to fetch image: ${response.statusText}`);
              return {
                output: {
                  exifGenerated: false,
                  error: `Failed to fetch image: ${response.statusText}`,
                },
              };
            }
            fileBuffer = Buffer.from(await response.arrayBuffer());
          }

          // Now get the EXIF
          const exif = (await ExifReader.load(fileBuffer, { async: true, expanded: true })) as any;

          // updat the image with the EXIF data
          await req.payload.update({
            collection: 'media',
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
    ],
    autoRun: [
      {
        cron: '* * * * * *',
        queue: 'default',
      },
      {
        queue: 'metadata',
        cron: '0 * * * * *',
      },
    ],
  },
});
