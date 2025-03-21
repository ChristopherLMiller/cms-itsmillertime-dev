import { Post } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'
import { searchPlugin } from '@payloadcms/plugin-search'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { s3Storage } from '@payloadcms/storage-s3'
import { Plugin } from 'payload'
import { adminAuthPlugin } from 'payload-auth-plugin'
import { GoogleAuthProvider } from 'payload-auth-plugin/providers'

const generateTitle: GenerateTitle<Post> = ({ doc }) => {
  return doc?.title ? `${doc.title} | ItsMillerTime` : 'ItsMillerTime'
}

const generateURL: GenerateURL<Post> = ({ doc }) => {
  const url = getServerSideURL()

  return doc?.slug ? `${url}/${doc.slug}` : url
}

export const plugins: Plugin[] = [
  seoPlugin({
    generateTitle,
    generateURL,
  }),
  searchPlugin({
    collections: ['posts'],
    defaultPriorities: {
      posts: 20,
    },
  }),
  adminAuthPlugin({
    providers: [
      GoogleAuthProvider({
        client_id: process.env.GOOGLE_PROVIDER_CLIENT_ID as string,
        client_secret: process.env.GOOGLE_PROVIDER_CLIENT_SECRET as string,
      }),
    ],
  }),
  s3Storage({
    collections: {
      media: true,
    },
    bucket: process.env.CLOUDFLARE_BUCKET as string,
    config: {
      endpoint: process.env.CLOUDFLARE_ENDPOINT as string,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY as string,
        secretAccessKey: process.env.CLOUDFLARE_SECRET_KEY as string,
      },
      region: process.env.CLOUDFLARE_REGION as string,
    },
  }),
]
