'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Banner, Button, FieldLabel, toast, useFormFields } from '@payloadcms/ui';
import type { UIFieldClientComponent } from 'payload';
import { getPlatformSetupGuide } from '@/utilities/socialDestinationGuides';
import { platformLabel } from '@/utilities/socialPlatforms';
import styles from './DestinationSetupGuide.module.css';

function fieldValue(
  fields: Record<string, { value?: unknown } | undefined>,
  path: string,
): string {
  const value = fields[path]?.value;
  return typeof value === 'string' ? value : '';
}

export const DestinationSetupGuide: UIFieldClientComponent = ({ path }) => {
  const rowPath = useMemo(() => {
    if (!path) return '';
    const parts = path.split('.');
    parts.pop();
    return parts.join('.');
  }, [path]);

  const rowId = useFormFields(([fields]) => fieldValue(fields, `${rowPath}.id`));
  const rowType = useFormFields(([fields]) => fieldValue(fields, `${rowPath}.type`));
  const clientId = useFormFields(([fields]) => fieldValue(fields, `${rowPath}.clientId`));
  const clientSecret = useFormFields(([fields]) =>
    fieldValue(fields, `${rowPath}.clientSecret`),
  );
  const instanceUrl = useFormFields(([fields]) => fieldValue(fields, `${rowPath}.instanceUrl`));
  const apiKey = useFormFields(([fields]) => fieldValue(fields, `${rowPath}.apiKey`));
  const apiSecret = useFormFields(([fields]) => fieldValue(fields, `${rowPath}.apiSecret`));

  const guide = useMemo(() => getPlatformSetupGuide(rowType), [rowType]);

  const [callbackUrl, setCallbackUrl] = useState('');
  const [banner, setBanner] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get('oauth');
    const oauthError = params.get('oauthError');
    const oauthType = params.get('oauthType');
    if (oauth === 'success') {
      const label = oauthType ? platformLabel(oauthType) : 'destination';
      setBanner({ ok: true, message: `Authorized ${label}. Tokens were saved — review fields and send a test.` });
      toast.success(`Authorized ${label}`);
    } else if (oauthError) {
      setBanner({ ok: false, message: oauthError });
      toast.error(oauthError);
    }
  }, []);

  useEffect(() => {
    if (!guide?.oauth) {
      setCallbackUrl('');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/social-destinations/oauth/callback-url', {
          credentials: 'include',
        });
        if (!res.ok) return;
        const json = (await res.json()) as { callbackUrl?: string };
        if (!cancelled && typeof json.callbackUrl === 'string') {
          setCallbackUrl(json.callbackUrl);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [guide?.oauth]);

  const missingOauthReqs = useMemo(() => {
    if (!guide?.oauth) return [] as string[];
    const missing: string[] = [];
    for (const req of guide.oauth.requires) {
      const val =
        req === 'clientId'
          ? clientId
          : req === 'clientSecret'
            ? clientSecret
            : req === 'instanceUrl'
              ? instanceUrl
              : req === 'apiKey'
                ? apiKey
                : apiSecret;
      if (!val.trim()) missing.push(req);
    }
    return missing;
  }, [guide, clientId, clientSecret, instanceUrl, apiKey, apiSecret]);

  const startOauth = useCallback(() => {
    if (!rowId) {
      toast.error('Save Social Destinations first so this row has an id.');
      return;
    }
    if (!rowType) {
      toast.error('Choose a platform type first.');
      return;
    }
    if (missingOauthReqs.length > 0) {
      toast.error(`Fill and save first: ${missingOauthReqs.join(', ')}`);
      return;
    }
    const url = `/api/social-destinations/oauth/start?destinationId=${encodeURIComponent(rowId)}&type=${encodeURIComponent(rowType)}`;
    window.location.assign(url);
  }, [rowId, rowType, missingOauthReqs]);

  const copyCallback = useCallback(async () => {
    if (!callbackUrl) return;
    try {
      await navigator.clipboard.writeText(callbackUrl);
      toast.success('Callback URL copied');
    } catch {
      toast.error('Could not copy — select the URL manually');
    }
  }, [callbackUrl]);

  if (!rowType) {
    return (
      <div className={styles.guide}>
        <FieldLabel label="Setup guide" />
        <p className={styles.empty}>Choose a platform type to see setup steps and links.</p>
      </div>
    );
  }

  if (!guide) {
    return null;
  }

  return (
    <div className={styles.guide}>
      <div className={styles.header}>
        <h4 className={styles.title}>Setup — {platformLabel(rowType)}</h4>
        {guide.docsUrl ? (
          <a href={guide.docsUrl} target="_blank" rel="noreferrer">
            {guide.docsLabel || 'Docs'} ↗
          </a>
        ) : null}
      </div>
      <p className={styles.summary}>{guide.summary}</p>

      {banner ? (
        <Banner type={banner.ok ? 'success' : 'error'}>{banner.message}</Banner>
      ) : null}

      <ol className={styles.steps}>
        {guide.steps.map((step) => (
          <li key={step.title}>
            <div className={styles.stepTitle}>{step.title}</div>
            <p className={styles.stepBody}>{step.body}</p>
            {step.href ? (
              <div className={styles.links}>
                <a href={step.href} target="_blank" rel="noreferrer">
                  {step.hrefLabel || step.href} ↗
                </a>
              </div>
            ) : null}
          </li>
        ))}
      </ol>

      {guide.oauth ? (
        <div className={styles.oauth}>
          <p className={styles.oauthHint}>{guide.oauth.hint}</p>
          {callbackUrl ? (
            <div className={styles.callbackRow}>
              <span className={styles.callbackLabel}>OAuth callback URL</span>
              <input className={styles.callbackValue} readOnly value={callbackUrl} />
              <Button buttonStyle="secondary" onClick={() => void copyCallback()}>
                Copy
              </Button>
            </div>
          ) : null}
          <div className={styles.actions}>
            <Button
              buttonStyle="primary"
              onClick={startOauth}
              disabled={!rowId || missingOauthReqs.length > 0}
            >
              {guide.oauth.authorizeLabel}
            </Button>
            {!rowId ? (
              <span className={styles.oauthHint}>Save the global first.</span>
            ) : missingOauthReqs.length > 0 ? (
              <span className={styles.oauthHint}>
                Save these first: {missingOauthReqs.join(', ')}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};
