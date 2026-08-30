import { allowedRoles } from '@/access/methods/allowedRoles';
import { render } from '@react-email/render';
import type { PayloadRequest } from 'payload';
import React from 'react';
import { ContactFormEmail } from '../../emails/contact-form';
import { ProductRequestAdminEmail } from '../../emails/product-request-admin';
import { ProductRequestAvailableEmail } from '../../emails/product-request-available';
import { ResetPasswordEmail } from '../../emails/reset-password';
import { VerifyAccountEmail } from '../../emails/verify-account';

const TEMPLATE_META = [
  { id: 'contact-form', label: 'Contact form' },
  { id: 'reset-password', label: 'Reset password' },
  { id: 'verify-account', label: 'Verify account' },
  { id: 'product-request-admin', label: 'Product request (admin)' },
  { id: 'product-request-available', label: 'Product request (available)' },
] as const;

type TemplateId = (typeof TEMPLATE_META)[number]['id'];

async function renderTemplate(id: TemplateId): Promise<string> {
  switch (id) {
    case 'contact-form':
      return render(React.createElement(ContactFormEmail, ContactFormEmail.PreviewProps));
    case 'reset-password':
      return render(React.createElement(ResetPasswordEmail, ResetPasswordEmail.PreviewProps));
    case 'verify-account':
      return render(React.createElement(VerifyAccountEmail, VerifyAccountEmail.PreviewProps));
    case 'product-request-admin':
      return render(
        React.createElement(ProductRequestAdminEmail, ProductRequestAdminEmail.PreviewProps),
      );
    case 'product-request-available':
      return render(
        React.createElement(
          ProductRequestAvailableEmail,
          ProductRequestAvailableEmail.PreviewProps,
        ),
      );
  }
}

function isTemplateId(value: string): value is TemplateId {
  return TEMPLATE_META.some((t) => t.id === value);
}

async function requireAdmin(req: PayloadRequest): Promise<boolean> {
  return allowedRoles(['admin'])({ req });
}

/** GET /api/email-preview — list templates, or ?template=id for HTML. */
export async function emailPreviewHandler(req: PayloadRequest): Promise<Response> {
  if (!(await requireAdmin(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = req.url ? new URL(req.url) : null;
  const templateId = url?.searchParams.get('template')?.trim() ?? '';

  if (!templateId) {
    return Response.json({ templates: TEMPLATE_META.map(({ id, label }) => ({ id, label })) });
  }

  if (!isTemplateId(templateId)) {
    return Response.json({ error: 'Unknown template' }, { status: 404 });
  }

  const meta = TEMPLATE_META.find((t) => t.id === templateId);
  if (!meta) {
    return Response.json({ error: 'Unknown template' }, { status: 404 });
  }

  try {
    const html = await renderTemplate(templateId);
    return Response.json({
      id: meta.id,
      label: meta.label,
      html,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[email-preview]', message, err);
    return Response.json({ error: 'Failed to render template' }, { status: 500 });
  }
}
