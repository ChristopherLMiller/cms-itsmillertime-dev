'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Banner, Button, FieldLabel, toast, useFormFields } from '@payloadcms/ui';
import type { UIFieldClientComponent } from 'payload';
import styles from './DestinationTestButton.module.css';

type TestResponse = {
  success?: boolean;
  error?: string;
  detail?: string;
  destinationLabel?: string;
  destinationType?: string;
};

export const DestinationTestButton: UIFieldClientComponent = ({ path }) => {
  const rowPath = useMemo(() => {
    if (!path) return '';
    // path is like "destinations.0.testConnection"
    const parts = path.split('.');
    parts.pop();
    return parts.join('.');
  }, [path]);

  const rowId = useFormFields(([fields]) => {
    if (!rowPath) return '';
    const value = fields[`${rowPath}.id`]?.value;
    return typeof value === 'string' ? value : '';
  });

  const rowLabel = useFormFields(([fields]) => {
    if (!rowPath) return '';
    const value = fields[`${rowPath}.label`]?.value;
    return typeof value === 'string' ? value : '';
  });

  const rowType = useFormFields(([fields]) => {
    if (!rowPath) return '';
    const value = fields[`${rowPath}.type`]?.value;
    return typeof value === 'string' ? value : '';
  });

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const runTest = useCallback(async () => {
    if (!rowId) {
      const message = 'Save Social Destinations first so this row has an id, then test.';
      setResult({ ok: false, message });
      toast.error(message);
      return;
    }
    if (!rowType) {
      const message = 'Choose a platform type before testing.';
      setResult({ ok: false, message });
      toast.error(message);
      return;
    }

    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/publish-announce/test', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationId: rowId }),
      });
      const json = (await res.json()) as TestResponse;
      if (!res.ok || !json.success) {
        const message = json.error || json.detail || 'Test failed';
        setResult({ ok: false, message });
        toast.error(message);
        return;
      }
      const message = `Sent test to ${json.destinationLabel || rowLabel || rowType}`;
      setResult({ ok: true, message });
      toast.success(message);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Test failed';
      setResult({ ok: false, message });
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }, [rowId, rowLabel, rowType]);

  return (
    <div className={styles.field}>
      <FieldLabel label="Connection test" />
      <p className={styles.hint}>
        Posts a short live test message to this destination using the saved credentials. Save the
        global first if you just added or changed this row.
      </p>
      <div className={styles.actions}>
        <Button buttonStyle="secondary" onClick={() => void runTest()} disabled={busy}>
          {busy ? 'Testing…' : 'Send test message'}
        </Button>
      </div>
      {result && (
        <Banner type={result.ok ? 'success' : 'error'}>
          {result.message}
        </Banner>
      )}
    </div>
  );
};
