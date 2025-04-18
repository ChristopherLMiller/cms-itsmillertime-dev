import { withPayload } from '@payloadcms/next/withPayload';

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['http://localhost:3000', 'http://10.19.136.30:3000'],
  // Your Next.js config here
};

export default withPayload(nextConfig);
