// storage-adapter-import-placeholder
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { S3Client } from '@aws-sdk/client-s3';
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
import { ContactFormEmail } from '../emails/contact-form';
import { ResetPasswordEmail } from '../emails/reset-password';
import { VerifyAccountEmail } from '../emails/verify-account';
import { contactFormHandler } from './endpoints/contact-form';

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
    {
      path: '/contact-form',
      method: 'post',
      handler: contactFormHandler,
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
          try {
            console.log(`Start of EXIF generation task for ${input.collection} - ${input.id}`);

            const image = await req.payload.findByID({
              collection: input.collection,
              id: input.id,
              overrideAccess: true,
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

            // Skip SVG - no EXIF in vector graphics
            const mimeType = (image as { mimeType?: string }).mimeType ?? '';
            const filename = image.filename ?? '';
            if (
              mimeType === 'image/svg+xml' ||
              filename.toLowerCase().endsWith('.svg')
            ) {
              await req.payload.update({
                collection: input.collection,
                id: image.id,
                data: { exif: { _skipped: 'svg' } },
                overrideAccess: true,
              });
              return {
                output: {
                  exifGenerated: false,
                  error: 'SVG has no EXIF',
                  skipped: true,
                },
              };
            }

            // Access storage through req.payload (storage may not be in TypeScript types but is available at runtime)
            const storage = (req.payload as any).storage;
            let fileBuffer: Buffer | null = null;

            if (storage) {
              // Use payload.storage to read the file
              fileBuffer = await storage.read({
                collection: input.collection,
                filename: image.filename,
              });
            } else {
              // Fallback: try URL fetch first, then S3 direct read (bypasses access control for NSFW etc.)
              if (image.url) {
                console.log(`Fetching image from ${process.env.NEXT_PUBLIC_SERVER_URL}${image.url}`);
                const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}${image.url}`);
                if (response.ok) {
                  fileBuffer = Buffer.from(await response.arrayBuffer());
                  console.log('Image fetched from URL');
                } else {
                  console.log(`URL fetch failed: ${response.statusText}, trying S3 direct read`);
                }
              }
              if (!fileBuffer) {
                // Read directly from S3/R2 - bypasses HTTP access control (e.g. NSFW)
                const bucket = process.env.CLOUDFLARE_BUCKET;
                const endpoint = process.env.CLOUDFLARE_ENDPOINT;
                const accessKey = process.env.CLOUDFLARE_ACCESS_KEY;
                const secretKey = process.env.CLOUDFLARE_SECRET_KEY;
                const region = process.env.CLOUDFLARE_REGION;
                if (!bucket || !endpoint || !accessKey || !secretKey || !region) {
                  return {
                    output: {
                      exifGenerated: false,
                      error: 'Storage not available, URL fetch failed, and S3 env vars missing',
                    },
                  };
                }
                const prefix = (image as { prefix?: string }).prefix ?? '';
                const key = path.posix.join(prefix, filename);
                const s3 = new S3Client({
                  endpoint,
                  region,
                  credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
                });
                const obj = await s3.send(
                  new GetObjectCommand({ Bucket: bucket, Key: key }),
                );
                const chunks: Uint8Array[] = [];
                if (obj.Body) {
                  for await (const chunk of obj.Body as AsyncIterable<Uint8Array>) {
                    chunks.push(chunk);
                  }
                  fileBuffer = Buffer.concat(chunks);
                  console.log('Image read from S3');
                } else {
                  return {
                    output: {
                      exifGenerated: false,
                      error: 'S3 object has no body',
                    },
                  };
                }
              }
            }

            if (!fileBuffer) {
              return {
                output: {
                  exifGenerated: false,
                  error: 'Could not read image file',
                },
              };
            }

            // Now get the EXIF
            console.log('Loading EXIF from buffer');
            let rawExif: any;
            try {
              rawExif = (await ExifReader.load(fileBuffer, { async: true, expanded: true })) as any;
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              const isInvalidFormat =
                msg.includes('Invalid image format') ||
                msg.toLowerCase().includes('invalid') ||
                msg.toLowerCase().includes('unsupported');
              if (isInvalidFormat) {
                await req.payload.update({
                  collection: input.collection,
                  id: image.id,
                  data: { exif: { _skipped: 'invalid_format' } },
                  overrideAccess: true,
                });
                return {
                  output: {
                    exifGenerated: false,
                    error: msg,
                    skipped: true,
                  },
                };
              }
              throw err;
            }

            // Sanitize: PostgreSQL JSON does not allow \u0000 (null). XMP packets often end with <?xpacket end="w"?>\u0000
            const exif =
              rawExif == null
                ? null
                : JSON.parse(JSON.stringify(rawExif).replace(/\\u0000/g, ''));

            // Update the image with the EXIF data
            console.log('Updating image with EXIF data');
            await req.payload.update({
              collection: input.collection,
              id: image.id,
              data: {
                exif,
              },
              overrideAccess: true,
            });

            return {
              output: {
                exifGenerated: true,
              },
            };
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err ?? 'Unknown error');
            console.error('[generateImageEXIF]', message, err);
            throw new Error(`generateImageEXIF failed: ${message}`);
          }
        },
      },
      {
        slug: 'queueMissingEXIF',
        retries: 1,
        inputSchema: [],
        schedule: [
          {
            cron: '0 0 * * * *', // Every hour
            queue: 'default',
          },
        ],
        handler: async ({ req }) => {
          try {
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
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err ?? 'Unknown error');
            console.error('[queueMissingEXIF]', message, err);
            throw new Error(`queueMissingEXIF failed: ${message}`);
          }
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
          try {
            if (!process.env.RESEND_API_KEY) {
              throw new Error('RESEND_API_KEY environment variable is not set');
            }
            const user = input.user as { email?: string; name?: string };
            if (!user?.email) {
              throw new Error('sendResetPasswordEmail: user.email is required');
            }
            const emailAdapter = req.payload?.email;
            if (!emailAdapter?.sendEmail) {
              throw new Error('sendResetPasswordEmail: email adapter not available');
            }
            const html = await render(
              React.createElement(ResetPasswordEmail, {
                url: input.url,
                userName: user.name,
              }),
            );
            await emailAdapter.sendEmail({
              to: user.email,
              subject: 'Reset your password',
              html,
            });
            return { output: { sent: true } };
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err ?? 'Unknown error');
            console.error('[sendResetPasswordEmail]', message, err);
            throw new Error(`sendResetPasswordEmail failed: ${message}`);
          }
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
          try {
            if (!process.env.RESEND_API_KEY) {
              throw new Error('RESEND_API_KEY environment variable is not set');
            }
            const user = input.user as { email?: string; name?: string };
            if (!user?.email) {
              throw new Error('sendVerificationEmail: user.email is required');
            }
            const emailAdapter = req.payload?.email;
            if (!emailAdapter?.sendEmail) {
              throw new Error('sendVerificationEmail: email adapter not available');
            }
            const html = await render(
              React.createElement(VerifyAccountEmail, {
                url: input.url,
                userName: user.name,
              }),
            );
            await emailAdapter.sendEmail({
              to: user.email,
              subject: 'Verify your email',
              html,
            });
            return { output: { sent: true } };
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err ?? 'Unknown error');
            console.error('[sendVerificationEmail]', message, err);
            throw new Error(`sendVerificationEmail failed: ${message}`);
          }
        },
      },
      {
        slug: 'sendContactFormEmail',
        retries: 3,
        inputSchema: [
          { name: 'name', type: 'text', required: true },
          { name: 'email', type: 'text', required: true },
          { name: 'message', type: 'text', required: true },
        ],
        handler: async ({ input, req }) => {
          try {
            if (!process.env.RESEND_API_KEY) {
              throw new Error('RESEND_API_KEY environment variable is not set');
            }
            const toEmail = process.env.CONTACT_EMAIL;
            if (!toEmail) {
              throw new Error('CONTACT_EMAIL environment variable is not set');
            }
            const name = (input.name as string)?.trim();
            const email = (input.email as string)?.trim();
            const message = (input.message as string)?.trim();
            if (!name || !email || !message) {
              throw new Error('sendContactFormEmail: name, email, and message are required');
            }
            const emailAdapter = req.payload?.email;
            if (!emailAdapter?.sendEmail) {
              throw new Error('sendContactFormEmail: email adapter not available');
            }
            const html = await render(
              React.createElement(ContactFormEmail, {
                name,
                email,
                message,
              }),
            );
            await emailAdapter.sendEmail({
              to: toEmail,
              replyTo: email,
              subject: `Contact form: ${name}`,
              html,
            });
            return { output: { sent: true } };
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err ?? 'Unknown error');
            console.error('[sendContactFormEmail]', message, err);
            throw new Error(`sendContactFormEmail failed: ${message}`);
          }
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
