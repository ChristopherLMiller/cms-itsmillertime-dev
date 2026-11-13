'use client';

import { formatClock, formatHuman } from '@/lib/duration';
import { Button, toast, useDocumentInfo, useField } from '@payloadcms/ui';
import { useCallback, useEffect, useState } from 'react';
import styles from './ModelTimeTracker.module.css';

type RunningEntry = {
  id: number;
  modelId: number | null;
  modelTitle: string | null;
  startedAt: string;
};

type Status = {
  isRunning: boolean;
  entry: RunningEntry | null;
  model?: {
    id: number;
    totalSeconds: number;
    clockifyProjectId: string | null;
    clockifyImport: {
      id: number;
      durationSeconds: number;
      clockifyProjectId: string | null;
    } | null;
  };
};

type ImportResult = {
  clockify: { name: string; seconds: number; duration: string | null };
  entry: { id: number; durationSeconds: number };
  replaced: boolean;
};

async function readError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

async function post(path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(`/api/model-time/${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

export function ModelTimeTracker() {
  const { id } = useDocumentInfo();
  const modelId = typeof id === 'number' ? id : id ? Number(id) : null;
  // Keep the form's copy of clockify_project in step after an unlink, so a
  // later Save doesn't write the old project id back.
  const clockifyField = useField<string | null>({ path: 'clockify_project' });

  const [status, setStatus] = useState<Status | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastImport, setLastImport] = useState<ImportResult | null>(null);

  const refresh = useCallback(async () => {
    if (modelId == null) return;
    try {
      const response = await fetch(`/api/model-time/timer?modelId=${modelId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error(await readError(response));
      setStatus((await response.json()) as Status);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load time tracking');
    }
  }, [modelId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const running = status?.entry ?? null;
  const runningHere = running != null && running.modelId === modelId;
  const now = useNow(runningHere);
  const liveSeconds =
    runningHere && running ? Math.max(0, Math.floor((now - Date.parse(running.startedAt)) / 1000)) : 0;
  const totalSeconds = (status?.model?.totalSeconds ?? 0) + liveSeconds;

  const run = useCallback(
    async (action: () => Promise<void>) => {
      setBusy(true);
      try {
        await action();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setBusy(false);
        await refresh();
      }
    },
    [refresh],
  );

  if (modelId == null) {
    return (
      <div className={styles.panel}>
        <p className={styles.label}>Time tracking</p>
        <p className={styles.muted}>Save the model to start tracking time.</p>
      </div>
    );
  }

  const clockifyProjectId = status?.model?.clockifyProjectId ?? null;
  const importEntry = status?.model?.clockifyImport ?? null;
  const importMatchesLink =
    importEntry != null && clockifyProjectId != null && importEntry.clockifyProjectId === clockifyProjectId;

  return (
    <div className={styles.panel}>
      <p className={styles.label}>Time tracking</p>
      {loadError && <p className={styles.error}>{loadError}</p>}

      <p className={styles.total}>{formatClock(totalSeconds)}</p>
      <p className={styles.muted}>
        {runningHere ? `Running: ${formatClock(liveSeconds)} this session` : 'Total tracked'}
      </p>

      <div className={styles.actions}>
        {runningHere ? (
          <Button
            buttonStyle="primary"
            size="small"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await post('timer/stop');
                toast.success('Timer stopped');
              })
            }
          >
            Stop timer
          </Button>
        ) : (
          <Button
            buttonStyle="primary"
            size="small"
            disabled={busy || status == null}
            onClick={() =>
              run(async () => {
                await post('timer/start', { modelId });
                toast.success('Timer started');
              })
            }
          >
            Start timer
          </Button>
        )}
        <Button
          buttonStyle="secondary"
          size="small"
          el="link"
          url={`/admin/collections/model-time-entries?where[model][equals]=${modelId}`}
        >
          View all entries
        </Button>
      </div>
      {running && !runningHere && (
        <p className={styles.muted}>
          Starting will stop the timer on <strong>{running.modelTitle ?? `model #${running.modelId}`}</strong>.
        </p>
      )}

      {clockifyProjectId && (
        <div className={styles.clockify}>
          <p className={styles.label}>Clockify migration</p>
          {lastImport ? (
            <p className={styles.muted}>
              Clockify “{lastImport.clockify.name}”: {formatHuman(lastImport.clockify.seconds)} → saved
              entry #{lastImport.entry.id} ({formatHuman(lastImport.entry.durationSeconds)})
              {lastImport.clockify.seconds === lastImport.entry.durationSeconds ? ' ✓' : ' ⚠ mismatch'}
            </p>
          ) : importMatchesLink && importEntry ? (
            <p className={styles.muted}>
              Imported: {formatHuman(importEntry.durationSeconds)} (entry #{importEntry.id})
            </p>
          ) : (
            <p className={styles.muted}>This model&apos;s Clockify total hasn&apos;t been imported yet.</p>
          )}
          <div className={styles.actions}>
            <Button
              buttonStyle="secondary"
              size="small"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const result = (await post('clockify-import', { modelId })) as ImportResult;
                  setLastImport(result);
                  toast.success(result.replaced ? 'Clockify total re-synced' : 'Clockify total imported');
                })
              }
            >
              {importEntry ? 'Re-sync from Clockify' : 'Import from Clockify'}
            </Button>
            {importMatchesLink && (
              <Button
                buttonStyle="error"
                size="small"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    if (!window.confirm('Remove the Clockify link from this model? The imported time is kept.')) {
                      return;
                    }
                    await post('clockify-unlink', { modelId });
                    clockifyField.setValue(null, true);
                    setLastImport(null);
                    toast.success('Clockify link removed');
                  })
                }
              >
                Remove Clockify link
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
