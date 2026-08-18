import type { TaskHandler } from 'payload';
import { render } from '@react-email/render';
import React from 'react';
import { ProductRequestAdminEmail } from '../../emails/product-request-admin';
import { ProductRequestAvailableEmail } from '../../emails/product-request-available';
import {
  safeProductRequestAdminSubject,
  safeProductRequestAvailableSubject,
} from '../utilities/sanitizeProductRequest';

export const sendProductRequestAdminEmailTask = {
  slug: 'sendProductRequestAdminEmail',
  retries: 3,
  inputSchema: [
    { name: 'requesterName', type: 'text' as const, required: true, maxLength: 200 },
    { name: 'requesterEmail', type: 'text' as const, required: true, maxLength: 320 },
    { name: 'imageTitle', type: 'text' as const, required: true, maxLength: 300 },
    { name: 'imageId', type: 'number' as const, required: true },
    { name: 'imageUrl', type: 'text' as const, required: false, maxLength: 2000 },
    { name: 'galleryUrl', type: 'text' as const, required: false, maxLength: 2000 },
    { name: 'cmsUrl', type: 'text' as const, required: true, maxLength: 2000 },
  ],
  handler: (async ({ input, req }) => {
    try {
      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY environment variable is not set');
      }
      const toEmail = process.env.CONTACT_EMAIL;
      if (!toEmail) {
        throw new Error('CONTACT_EMAIL environment variable is not set');
      }

      const requesterName = String(input.requesterName ?? '').trim();
      const requesterEmail = String(input.requesterEmail ?? '').trim();
      const imageTitle = String(input.imageTitle ?? '').trim();
      const imageId = Number(input.imageId);
      const cmsUrl = String(input.cmsUrl ?? '').trim();
      const imageUrl = String(input.imageUrl ?? '').trim();
      const galleryUrl = String(input.galleryUrl ?? '').trim();

      if (!requesterName || !requesterEmail || !imageTitle || !Number.isFinite(imageId) || !cmsUrl) {
        throw new Error('sendProductRequestAdminEmail: missing required fields');
      }

      const emailAdapter = req.payload?.email;
      if (!emailAdapter?.sendEmail) {
        throw new Error('sendProductRequestAdminEmail: email adapter not available');
      }

      const html = await render(
        React.createElement(ProductRequestAdminEmail, {
          requesterName,
          requesterEmail,
          imageTitle,
          imageId,
          imageUrl: imageUrl || undefined,
          galleryUrl: galleryUrl || undefined,
          cmsUrl,
        }),
      );

      await emailAdapter.sendEmail({
        to: toEmail,
        replyTo: requesterEmail,
        subject: safeProductRequestAdminSubject(imageTitle, requesterName),
        html,
      });

      return { output: { sent: true } };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err ?? 'Unknown error');
      console.error('[sendProductRequestAdminEmail]', message, err);
      throw new Error(`sendProductRequestAdminEmail failed: ${message}`);
    }
  }) satisfies TaskHandler<'sendProductRequestAdminEmail'>,
};

export const sendProductRequestAvailableEmailTask = {
  slug: 'sendProductRequestAvailableEmail',
  retries: 3,
  inputSchema: [
    { name: 'requestId', type: 'number' as const, required: true },
    { name: 'requesterName', type: 'text' as const, required: true, maxLength: 200 },
    { name: 'requesterEmail', type: 'text' as const, required: true, maxLength: 320 },
    { name: 'imageTitle', type: 'text' as const, required: true, maxLength: 300 },
    { name: 'galleryUrl', type: 'text' as const, required: true, maxLength: 2000 },
  ],
  handler: (async ({ input, req }) => {
    try {
      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY environment variable is not set');
      }

      const requestId = Number(input.requestId);
      const requesterName = String(input.requesterName ?? '').trim();
      const requesterEmail = String(input.requesterEmail ?? '').trim();
      const imageTitle = String(input.imageTitle ?? '').trim();
      const galleryUrl = String(input.galleryUrl ?? '').trim();

      if (
        !Number.isFinite(requestId) ||
        !requesterName ||
        !requesterEmail ||
        !imageTitle ||
        !galleryUrl
      ) {
        throw new Error('sendProductRequestAvailableEmail: missing required fields');
      }

      const existing = await req.payload.findByID({
        collection: 'gallery-product-requests',
        id: requestId,
        depth: 0,
        overrideAccess: true,
        disableErrors: true,
      });

      if (!existing || existing.status !== 'pending') {
        return { output: { sent: false, skipped: true } };
      }

      const emailAdapter = req.payload?.email;
      if (!emailAdapter?.sendEmail) {
        throw new Error('sendProductRequestAvailableEmail: email adapter not available');
      }

      const html = await render(
        React.createElement(ProductRequestAvailableEmail, {
          requesterName,
          imageTitle,
          galleryUrl,
        }),
      );

      await emailAdapter.sendEmail({
        to: requesterEmail,
        subject: safeProductRequestAvailableSubject(imageTitle),
        html,
      });

      await req.payload.update({
        collection: 'gallery-product-requests',
        id: requestId,
        depth: 0,
        overrideAccess: true,
        data: {
          status: 'notified',
          notifiedAt: new Date().toISOString(),
        },
      });

      return { output: { sent: true } };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err ?? 'Unknown error');
      console.error('[sendProductRequestAvailableEmail]', message, err);
      throw new Error(`sendProductRequestAvailableEmail failed: ${message}`);
    }
  }) satisfies TaskHandler<'sendProductRequestAvailableEmail'>,
};
