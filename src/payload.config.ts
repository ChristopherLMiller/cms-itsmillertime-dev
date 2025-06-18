// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres';
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

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
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
  folders: {
    debug: true,
  },
  telemetry: false,
  cors: '*',
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
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
  email: resendAdapter({
    defaultFromAddress: 'support@itsmillertime.dev',
    defaultFromName: 'Support',
    apiKey: process.env.RESEND_API_KEY || '',
  }),
  upload: {
    abortOnLimit: true,
    limits: {
      fileSize: 5 * 1024 * 1024 * 1024, // 5GB
    },
  },
});
