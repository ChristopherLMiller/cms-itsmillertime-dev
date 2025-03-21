// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { resendAdapter } from '@payloadcms/email-resend'
import { Media } from './collections/Media'
import { PostsCategories } from './collections/Posts/Categories'
import { Posts } from './collections/Posts/Posts'
import { PostsTags } from './collections/Posts/Tags'
import { Users } from './collections/Users'
import { plugins } from './plugins'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      beforeLogin: ['/components/Auth#AuthComponent'],
    },
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Posts, PostsCategories, PostsTags],
  editor: lexicalEditor(),
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
})
