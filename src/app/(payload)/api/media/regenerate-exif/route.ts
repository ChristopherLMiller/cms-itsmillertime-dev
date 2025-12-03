import ExifReader from 'exifreader';
import { PayloadRequest } from 'payload';
import { getPayload } from 'payload';
import config from '@/payload.config';

const exifSupportedMimeTypes = [
  'image/jpeg',
  'image/tiff',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/webp',
];

export async function POST(request: Request) {
  try {
    const payload = await getPayload({ config });
    const { id } = await request.json();

    if (!id) {
      return Response.json({ error: 'Media ID is required' }, { status: 400 });
    }

    // Get the media document
    const media = await payload.findByID({
      collection: 'media',
      id: typeof id === 'string' ? parseInt(id, 10) : id,
    });

    if (!media) {
      return Response.json({ error: 'Media not found' }, { status: 404 });
    }

    // Check if media has a file (url or filename)
    const fileUrl = media.url || media.filename;
    if (!fileUrl) {
      return Response.json({ error: 'No file found for this media' }, { status: 400 });
    }

    // Check if it's a supported image type
    const mimeType = media.mimeType;
    if (!mimeType || !mimeType.startsWith('image/') || !exifSupportedMimeTypes.includes(mimeType)) {
      return Response.json({ error: 'File type does not support EXIF data' }, { status: 400 });
    }

    // Fetch the file from S3
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      return Response.json({ error: 'Failed to fetch file' }, { status: 500 });
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract EXIF data
    const exif = await ExifReader.load(buffer, { async: true, expanded: true });

    // Update the media document with EXIF data
    // Cast exif to any to avoid type issues with JSON field
    await payload.update({
      collection: 'media',
      id: typeof id === 'string' ? parseInt(id, 10) : id,
      data: {
        exif: (exif || null) as any,
      },
    });

    return Response.json({ success: true, exif });
  } catch (error) {
    console.error('Error regenerating EXIF:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate EXIF' },
      { status: 500 },
    );
  }
}
