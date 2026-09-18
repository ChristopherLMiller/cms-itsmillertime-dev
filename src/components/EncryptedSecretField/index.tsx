'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FieldDescription,
  FieldError,
  FieldLabel,
  toast,
  useField,
} from '@payloadcms/ui';
import type { TextFieldClientComponent } from 'payload';
import { isEncryptedSecret } from '@/lib/settings-encryption-shared';
import styles from './EncryptedSecretField.module.css';

const MASK = '••••••••••••';

function EyeIcon({ active }: { active: boolean }) {
  // active=false → open eye (click to show); active=true → eye-off (click to hide)
  if (!active) {
    return (
      <svg viewBox="0 0 16 12" aria-hidden="true">
        <circle cx="8.5" cy="6" r="2.5" />
        <path d="M8.5 1C3.83333 1 1.5 6 1.5 6C1.5 6 3.83333 11 8.5 11C13.1667 11 15.5 6 15.5 6C15.5 6 13.1667 1 8.5 1Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 12" aria-hidden="true">
      <path d="M2 11.5L4.35141 9.51035M15 0.5L12.6486 2.48965M10.915 6.64887C10.6493 7.64011 9.78959 8.38832 8.7408 8.48855M10.4085 4.38511C9.94992 3.84369 9.2651 3.5 8.5 3.5C7.11929 3.5 6 4.61929 6 6C6 6.61561 6.22251 7.17926 6.59149 7.61489M10.4085 4.38511L6.59149 7.61489M10.4085 4.38511L12.6486 2.48965M6.59149 7.61489L4.35141 9.51035M14.1292 3.92915C15.0431 5.02085 15.5 6 15.5 6C15.5 6 13.1667 11 8.5 11C7.67995 11 6.93195 10.8456 6.256 10.5911M4.35141 9.51035C2.45047 8.03672 1.5 6 1.5 6C1.5 6 3.83333 1 8.5 1C10.1882 1 11.5711 1.65437 12.6486 2.48965" />
    </svg>
  );
}

export const EncryptedSecretField: TextFieldClientComponent = ({
  field,
  path,
  readOnly: readOnlyFromProps,
}) => {
  const { value, setValue, disabled, showError, errorMessage } = useField<string>({ path });
  const readOnly = Boolean(readOnlyFromProps || disabled);

  const raw = typeof value === 'string' ? value : '';
  const encrypted = isEncryptedSecret(raw);

  const [visible, setVisible] = useState(false);
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lastEncrypted = useRef<string | null>(encrypted ? raw : null);

  // Reset reveal state when the saved ciphertext changes (reload / external update).
  useEffect(() => {
    if (encrypted && raw !== lastEncrypted.current) {
      lastEncrypted.current = raw;
      setDecrypted(null);
      setVisible(false);
    } else if (!encrypted && !raw) {
      lastEncrypted.current = null;
      setDecrypted(null);
    }
  }, [encrypted, raw]);

  const label =
    typeof field.label === 'string'
      ? field.label
      : typeof field.name === 'string'
        ? field.name
        : 'Secret';
  const description =
    typeof field.admin?.description === 'string' ? field.admin.description : undefined;
  const required = Boolean(field.required);

  const displayValue = (() => {
    if (encrypted && !visible) return MASK;
    if (encrypted && visible) return decrypted ?? '';
    return raw;
  })();

  // Masked ciphertext uses a fixed mask string (type=text). Plain drafts use password dots.
  const inputType = visible || encrypted ? 'text' : 'password';

  const reveal = useCallback(async () => {
    if (visible) {
      setVisible(false);
      return;
    }

    if (!encrypted) {
      setVisible(true);
      return;
    }

    if (decrypted != null) {
      setVisible(true);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/secrets/decrypt', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciphertext: raw }),
      });
      const json = (await res.json()) as { plaintext?: string; error?: string };
      if (!res.ok || typeof json.plaintext !== 'string') {
        toast.error(json.error || 'Could not decrypt secret');
        return;
      }
      setDecrypted(json.plaintext);
      setVisible(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not decrypt secret');
    } finally {
      setBusy(false);
    }
  }, [visible, encrypted, decrypted, raw]);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      if (encrypted && !visible) {
        // Typing over the mask replaces the saved secret with new plaintext.
        lastEncrypted.current = null;
        setDecrypted(null);
        setVisible(true);
        const replaced =
          next === MASK ? '' : next.startsWith(MASK) ? next.slice(MASK.length) : next;
        setValue(replaced);
        return;
      }
      if (encrypted && visible) {
        lastEncrypted.current = null;
        setDecrypted(next);
        setValue(next);
        return;
      }
      setValue(next);
    },
    [encrypted, visible, setValue],
  );

  const onFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      if (encrypted && !visible) {
        e.target.select();
      }
    },
    [encrypted, visible],
  );

  return (
    <div
      className={[
        'field-type',
        'text',
        styles.field,
        showError && 'error',
        readOnly && 'read-only',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <FieldLabel label={label} path={path} required={required} />
      <div className={styles.wrap}>
        <input
          className={styles.input}
          id={`field-${path}`}
          name={path}
          autoComplete="off"
          spellCheck={false}
          type={inputType}
          value={displayValue}
          onChange={onChange}
          onFocus={onFocus}
          disabled={readOnly || busy}
        />
        <button
          type="button"
          className={styles.toggle}
          onClick={() => void reveal()}
          disabled={readOnly || busy}
          title={visible ? 'Hide secret' : 'Show secret'}
          aria-label={visible ? 'Hide secret' : 'Show secret'}
          aria-pressed={visible}
        >
          <EyeIcon active={visible} />
        </button>
      </div>
      <FieldError showError={Boolean(showError)} message={errorMessage} path={path} />
      {description ? <FieldDescription description={description} path={path} /> : null}
      {encrypted && !visible ? (
        <p className={styles.hint}>Saved secret is hidden. Reveal to view, or type to replace.</p>
      ) : null}
    </div>
  );
};
