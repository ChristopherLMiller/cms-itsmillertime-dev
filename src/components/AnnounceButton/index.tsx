'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Banner,
  Button,
  CheckboxInput,
  Drawer,
  TextareaInput,
  toast,
  useDocumentInfo,
  useModal,
} from '@payloadcms/ui';
import styles from './AnnounceButton.module.css';

const DRAWER_SLUG = 'publish-announce-drawer';

type Destination = {
  id: string;
  label: string;
  type: string;
  typeLabel: string;
  defaultSelected: boolean;
  implemented: boolean;
};

type AnnounceDoc = {
  title?: string | null;
  slug?: string | null;
  announce?: {
    notifiedAt?: string | null;
    skippedAt?: string | null;
  } | null;
  _status?: string | null;
  model_meta?: { status?: string | null } | null;
  settings?: {
    slug?: string | null;
    visibility?: string | null;
  } | null;
};

function isEligible(
  collectionSlug: string | undefined,
  doc: AnnounceDoc | undefined,
  hasPublishedDoc: boolean | undefined,
): boolean {
  if (!collectionSlug || !doc) return false;
  if (doc.announce?.notifiedAt || doc.announce?.skippedAt) return false;

  if (collectionSlug === 'posts') {
    return doc._status === 'published' || Boolean(hasPublishedDoc);
  }
  if (collectionSlug === 'models') {
    const status = doc.model_meta?.status;
    return status === 'IN_PROGRESS' || status === 'COMPLETED';
  }
  if (collectionSlug === 'gallery-albums') return doc.settings?.visibility === 'ALL';
  return false;
}

function publicUrl(collectionSlug: string | undefined, doc: AnnounceDoc | undefined, id: unknown): string | null {
  const base = (process.env.NEXT_PUBLIC_FRONTEND_URL || '').replace(/\/+$/, '');
  if (!base || !collectionSlug || !doc) return null;

  const slugFromDoc =
    typeof doc.slug === 'string' && doc.slug.trim().length > 0 ? doc.slug.trim() : null;
  const slugFromSettings =
    typeof doc.settings?.slug === 'string' && doc.settings.slug.trim().length > 0
      ? doc.settings.slug.trim()
      : null;
  const slug =
    slugFromDoc ||
    slugFromSettings ||
    (typeof id === 'string' || typeof id === 'number' ? String(id) : null);
  if (!slug) return null;

  if (collectionSlug === 'posts') return `${base}/articles/${slug}`;
  if (collectionSlug === 'models') return `${base}/models/${slug}`;
  if (collectionSlug === 'gallery-albums') return `${base}/galleries/${slug}`;
  return null;
}

export const AnnounceButton = () => {
  const { id, collectionSlug, data, hasPublishedDoc } = useDocumentInfo();
  const { openModal, closeModal } = useModal();
  const doc = data as AnnounceDoc | undefined;
  const eligible = isEligible(collectionSlug, doc, hasPublishedDoc);
  const settled = Boolean(doc?.announce?.notifiedAt || doc?.announce?.skippedAt);
  const url = publicUrl(collectionSlug, doc, id);

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState('');
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoOpenedRef = useRef(false);

  const numericId = typeof id === 'number' ? id : Number(id);
  const hasId = Number.isFinite(numericId) && numericId > 0;
  const autoOpenKey =
    hasId && collectionSlug ? `announce-auto-opened:${collectionSlug}:${numericId}` : null;

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, on]) => on).map(([destId]) => destId),
    [selected],
  );

  const loadDestinations = useCallback(async () => {
    setLoadingDestinations(true);
    setError(null);
    try {
      const res = await fetch('/api/publish-announce/destinations', {
        credentials: 'include',
      });
      const json = (await res.json()) as { destinations?: Destination[]; error?: string };
      if (!res.ok) throw new Error(json.error || 'Failed to load destinations');
      const rows = json.destinations || [];
      setDestinations(rows);
      const next: Record<string, boolean> = {};
      for (const row of rows) {
        next[row.id] = Boolean(row.defaultSelected && row.implemented);
      }
      setSelected(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load destinations');
    } finally {
      setLoadingDestinations(false);
    }
  }, []);

  const openDrawer = useCallback(() => {
    setError(null);
    void loadDestinations();
    openModal(DRAWER_SLUG);
  }, [loadDestinations, openModal]);

  // Auto-open once when the doc first becomes eligible in this browser session.
  useEffect(() => {
    if (!eligible || !hasId || !autoOpenKey || autoOpenedRef.current || settled) return;
    try {
      if (sessionStorage.getItem(autoOpenKey) === '1') {
        autoOpenedRef.current = true;
        return;
      }
      sessionStorage.setItem(autoOpenKey, '1');
    } catch {
      // sessionStorage may be unavailable; still open once via ref
    }
    autoOpenedRef.current = true;
    openDrawer();
  }, [eligible, hasId, settled, autoOpenKey, openDrawer]);

  const toggleDestination = (destId: string, implemented: boolean) => {
    if (!implemented) return;
    setSelected((prev) => ({ ...prev, [destId]: !prev[destId] }));
  };

  const send = async () => {
    if (!collectionSlug || !hasId) return;
    if (!message.trim()) {
      setError('Write a short message to post with the link.');
      return;
    }
    if (selectedIds.length === 0) {
      setError('Select at least one destination.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/publish-announce', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection: collectionSlug,
          id: numericId,
          message: message.trim(),
          destinationIds: selectedIds,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        queued?: string[];
        unimplemented?: string[];
      };
      if (!res.ok) throw new Error(json.error || 'Announce failed');

      const queued = json.queued?.join(', ') || 'destinations';
      toast.success(`Queued announce to ${queued}`);
      if (json.unimplemented?.length) {
        toast.info(`Skipped unimplemented: ${json.unimplemented.join(', ')}`);
      }
      closeModal(DRAWER_SLUG);
      // Soft refresh so sidebar announce fields update
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Announce failed');
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    if (!collectionSlug || !hasId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/publish-announce/skip', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection: collectionSlug, id: numericId }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || 'Skip failed');
      toast.success('Announce skipped');
      closeModal(DRAWER_SLUG);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Skip failed');
    } finally {
      setBusy(false);
    }
  };

  if (!hasId) return null;
  if (!['posts', 'models', 'gallery-albums'].includes(String(collectionSlug))) return null;

  const statusLabel = settled
    ? doc?.announce?.notifiedAt
      ? 'Announced'
      : 'Announce skipped'
    : eligible
      ? 'Announce…'
      : null;

  if (!statusLabel && !eligible) return null;

  return (
    <>
      {eligible && !settled ? (
        <Button buttonStyle="secondary" onClick={openDrawer}>
          Announce…
        </Button>
      ) : settled ? (
        <Button buttonStyle="secondary" disabled>
          {statusLabel}
        </Button>
      ) : null}

      <Drawer slug={DRAWER_SLUG} title="Announce publish">
        <div className={styles.form}>
          <p className={styles.lead}>
            Choose where to share this, write your message, then send. The public link is appended
            automatically.
          </p>

          {url && (
            <p className={styles.url}>
              Link:{' '}
              <a href={url} target="_blank" rel="noreferrer">
                {url}
              </a>
            </p>
          )}

          <label className={styles.label} htmlFor="announce-message">
            Message
          </label>
          <TextareaInput
            path="announce-message"
            value={message}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
            placeholder="Come check out this article I wrote about…"
          />

          <div className={styles.destinations}>
            <div className={styles.label}>Destinations</div>
            {loadingDestinations && <p className={styles.hint}>Loading…</p>}
            {!loadingDestinations && destinations.length === 0 && (
              <Banner type="info">
                No destinations configured. Add them under Global Properties → Social Destinations.
              </Banner>
            )}
            {destinations.map((dest) => (
              <label
                key={dest.id}
                className={styles.destinationRow}
                data-disabled={!dest.implemented || undefined}
              >
                <CheckboxInput
                  id={`announce-dest-${dest.id}`}
                  name={`announce-dest-${dest.id}`}
                  checked={Boolean(selected[dest.id])}
                  onToggle={() => toggleDestination(dest.id, dest.implemented)}
                  readOnly={!dest.implemented}
                />
                <span>
                  <strong>{dest.label}</strong>
                  <span className={styles.meta}>
                    {dest.typeLabel}
                    {!dest.implemented ? ' · adapter not implemented yet' : ''}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {error && <Banner type="error">{error}</Banner>}

          <div className={styles.actions}>
            <Button buttonStyle="primary" onClick={() => void send()} disabled={busy}>
              {busy ? 'Sending…' : 'Send'}
            </Button>
            <Button buttonStyle="secondary" onClick={() => void skip()} disabled={busy}>
              Skip
            </Button>
            <Button
              buttonStyle="secondary"
              onClick={() => closeModal(DRAWER_SLUG)}
              disabled={busy}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  );
};
