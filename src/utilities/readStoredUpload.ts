import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import path from 'path';

/**
 * Read an upload document's object from R2/S3 using its stored prefix + filename.
 * Used when the Payload file route is admin-only (e.g. gallery-masters).
 */
export async function readStoredUpload(doc: {
  filename?: string | null;
  prefix?: string | null;
}): Promise<Buffer> {
  const filename = doc.filename;
  if (!filename) {
    throw new Error('Upload is missing a filename');
  }

  const bucket = process.env.CLOUDFLARE_BUCKET;
  const endpoint = process.env.CLOUDFLARE_ENDPOINT;
  const accessKey = process.env.CLOUDFLARE_ACCESS_KEY;
  const secretKey = process.env.CLOUDFLARE_SECRET_KEY;
  const region = process.env.CLOUDFLARE_REGION;
  if (!bucket || !endpoint || !accessKey || !secretKey || !region) {
    throw new Error('Cloudflare R2 env vars are missing; cannot read stored upload');
  }

  const key = path.posix.join(doc.prefix ?? '', filename);
  const s3 = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });
  const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const chunks: Uint8Array[] = [];
  if (!obj.Body) {
    throw new Error(`S3 object has no body: ${key}`);
  }
  for await (const chunk of obj.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
