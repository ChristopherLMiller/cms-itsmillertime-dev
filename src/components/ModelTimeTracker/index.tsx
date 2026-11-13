'use client';

import { formatClock } from '@/lib/duration';
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
    status: ModelStatus | null;
  };
};

type ModelStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

type StartResult = { modelStatus: ModelStatus | null };

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
  const { id, lastUpdateTime } = useDocumentInfo();
  const modelId = typeof id === 'number' ? id : id ? Number(id) : null;
  // The form's status drives the buttons (so switching to Completed hides
  // Start immediately) and is kept in step when starting bumps the model to
  // In Progress, so a later Save doesn't write NOT_STARTED back.
  const statusField = useField<ModelStatus | null>({ path: 'model_meta.status' });
  const isCompleted = statusField.value === 'COMPLETED';

  const [status, setStatus] = useState<Status | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  // Re-fetch after each save too: saving as Completed stops a running timer
  // on the server, and the panel should show that.
  useEffect(() => {
    void refresh();
  }, [refresh, lastUpdateTime]);

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
        ) : isCompleted ? null : (
          <Button
            buttonStyle="primary"
            size="small"
            disabled={busy || status == null}
            onClick={() =>
              run(async () => {
                const result = (await post('timer/start', { modelId })) as StartResult;
                if (result.modelStatus && result.modelStatus !== statusField.value) {
                  statusField.setValue(result.modelStatus, true);
                  toast.success('Timer started, model marked In Progress');
                } else {
                  toast.success('Timer started');
                }
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
      {isCompleted && !runningHere && (
        <p className={styles.muted}>This model is completed, so timers are off.</p>
      )}
      {running && !runningHere && !isCompleted && (
        <p className={styles.muted}>
          Starting will stop the timer on <strong>{running.modelTitle ?? `model #${running.modelId}`}</strong>.
        </p>
      )}
    </div>
  );
}
