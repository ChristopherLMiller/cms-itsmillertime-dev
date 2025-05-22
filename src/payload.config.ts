// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres';
import path from 'path';
import { buildConfig } from 'payload';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

import { resendAdapter } from '@payloadcms/email-resend';
import { Nav } from './app/(payload)/globals/Nav/config';
import { GalleryAlbums } from './collections/Gallery/Album';
import { GalleryImages } from './collections/Gallery/Image';
import { GalleryTags } from './collections/Gallery/Tags';
import { Media } from './collections/Media/Media';
import { NavItems } from './collections/NavItems';
import { Pages } from './collections/Pages';
import { PostsCategories } from './collections/Posts/Categories';
import { Posts } from './collections/Posts/Posts';
import { PostsTags } from './collections/Posts/Tags';
import { Roles } from './collections/RBAC/Roles';
import { Users } from './collections/Users';
import { defaultLexical } from './fields/defaultLexical';
import { plugins } from './plugins';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  cors: '*',
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  globals: [Nav],
  collections: [
    Users,
    Media,
    Posts,
    PostsCategories,
    PostsTags,
    Pages,
    NavItems,
    Roles,
    GalleryAlbums,
    GalleryImages,
    GalleryTags,
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
});
