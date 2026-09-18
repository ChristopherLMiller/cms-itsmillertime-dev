import type { TaskHandler } from 'payload';
import { buildAnnounceContent } from '@/utilities/publishAnnounce';
import {
  sendToDestination,
  type SocialDestinationRow,
} from '@/utilities/socialAdapters';

export const sendPublishAnnounceTask = {
  slug: 'sendPublishAnnounce',
  retries: 3,
  inputSchema: [
    { name: 'destinationId', type: 'text' as const, required: true },
    { name: 'destinationLabel', type: 'text' as const, required: false },
    { name: 'destinationType', type: 'text' as const, required: true },
    { name: 'message', type: 'text' as const, required: true },
    { name: 'url', type: 'text' as const, required: true },
    { name: 'title', type: 'text' as const, required: true },
    { name: 'collection', type: 'text' as const, required: true },
    { name: 'documentId', type: 'number' as const, required: true },
  ],
  handler: (async ({ input, req }) => {
    const destinationId = String(input.destinationId ?? '').trim();
    const message = String(input.message ?? '').trim();
    const url = String(input.url ?? '').trim();
    const title = String(input.title ?? '').trim();
    const collection = String(input.collection ?? '').trim();
    const documentId = Number(input.documentId);

    if (!destinationId || !message || !url || !collection || !Number.isFinite(documentId)) {
      throw new Error('sendPublishAnnounce: missing required fields');
    }

    const globalDoc = await req.payload.findGlobal({
      slug: 'social-destinations',
      overrideAccess: true,
      depth: 0,
    });

    const destinations = Array.isArray(globalDoc?.destinations)
      ? (globalDoc.destinations as SocialDestinationRow[])
      : [];
    const destination = destinations.find((row) => row?.id === destinationId);
    if (!destination) {
      throw new Error(`sendPublishAnnounce: destination ${destinationId} not found`);
    }
    if (destination.enabled === false) {
      return {
        output: {
          sent: false,
          skipped: true,
          reason: 'destination disabled',
        },
      };
    }

    const content = buildAnnounceContent(message, url);
    const result = await sendToDestination({
      destination,
      content,
      url,
      title,
      collection,
    });

    if (result.skipped) {
      return {
        output: {
          sent: false,
          skipped: true,
          reason: result.error,
          destinationLabel: destination.label,
          destinationType: destination.type,
        },
      };
    }

    if (!result.ok) {
      throw new Error(
        `sendPublishAnnounce failed for ${destination.label || destinationId}: ${result.error}`,
      );
    }

    return {
      output: {
        sent: true,
        status: result.status,
        destinationLabel: destination.label,
        destinationType: destination.type,
        documentId,
        collection,
      },
    };
  }) satisfies TaskHandler<'sendPublishAnnounce'>,
};
