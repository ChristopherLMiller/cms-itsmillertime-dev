/** Shared Resend From values. The adapter default is the site brand; CMS jobs override. */
export const DEFAULT_FROM_ADDRESS = 'support@itsmillertime.dev';
export const DEFAULT_FROM_NAME = 'ItsMillerTime';
export const CMS_FROM_NAME = 'ItsMillerTime CMS';

function namedFrom(name: string): string {
  return `${name} <${DEFAULT_FROM_ADDRESS}>`;
}

export const emailFrom = {
  /** Account emails: password reset, verify address. */
  cms: namedFrom(CMS_FROM_NAME),
  /** Public site / shop emails: contact form, waitlist. */
  site: namedFrom(DEFAULT_FROM_NAME),
} as const;
