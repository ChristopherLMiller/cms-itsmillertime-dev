'use client';

import { useEffect, useState } from 'react';
import { LoginView, type LoginViewProps } from '@delmaredigital/payload-better-auth/components';
import { AUTHENTIK_PROVIDER_ID } from '@/lib/auth/authentik-constants';
import { authClient } from '@/lib/auth/auth-client';

type AuthentikLoginViewProps = Omit<LoginViewProps, 'authClient' | 'logo' | 'socialProviders'> & {
  authentikEnabled: boolean;
};

function humanizeOAuthError(code: string): string {
  const messages: Record<string, string> = {
    access_denied: 'Access was denied by Authentik.',
    oauth_provider_not_found: 'Authentik is not configured. Please contact support.',
    oauth_code_verification_failed: 'Could not complete Authentik sign-in. Please try again.',
    user_info_is_missing: 'Authentik did not return user information.',
    email_is_missing: 'Authentik did not share an email address.',
    unable_to_link_account: 'Could not link this Authentik account to an existing user.',
  };
  return messages[code] ?? `Sign-in failed (${code}). Please try again or use local login.`;
}

function wantsLocalLogin(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('local') === '1';
}

export function AuthentikLoginView({
  authentikEnabled,
  title = 'Admin Login',
  afterLoginPath = '/admin',
  ...loginProps
}: AuthentikLoginViewProps) {
  const [authentikLoading, setAuthentikLoading] = useState(false);
  const [authentikError, setAuthentikError] = useState<string | null>(null);
  const [showLocal, setShowLocal] = useState(() => !authentikEnabled || wantsLocalLogin());

  useEffect(() => {
    if (!authentikEnabled) {
      setShowLocal(true);
      return;
    }
    setShowLocal(wantsLocalLogin());
  }, [authentikEnabled]);

  useEffect(() => {
    if (!authentikEnabled || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (!error) return;
    setAuthentikError(humanizeOAuthError(error));
    params.delete('error');
    params.delete('error_description');
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
    window.history.replaceState({}, '', next);
  }, [authentikEnabled]);

  async function handleAuthentikSignIn() {
    if (authentikLoading) return;
    setAuthentikLoading(true);
    setAuthentikError(null);

    const loginUrl =
      typeof window !== 'undefined' ? window.location.href.split('?')[0]! : '/admin/login';

    try {
      const result = await authClient.signIn.oauth2({
        providerId: AUTHENTIK_PROVIDER_ID,
        callbackURL: loginUrl,
        errorCallbackURL: loginUrl,
      });

      if (result.error) {
        setAuthentikError(result.error.message || 'Authentik sign-in failed.');
        setAuthentikLoading(false);
        return;
      }

      // Better Auth returns { url, redirect } when it does not navigate itself.
      const data = result.data as { url?: string; redirect?: boolean } | undefined;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
    } catch (error) {
      setAuthentikError(error instanceof Error ? error.message : 'Authentik sign-in failed.');
      setAuthentikLoading(false);
    }
  }

  function openLocalLogin() {
    const url = new URL(window.location.href);
    url.searchParams.set('local', '1');
    window.history.replaceState({}, '', url.toString());
    setShowLocal(true);
  }

  function backToAuthentik() {
    const url = new URL(window.location.href);
    url.searchParams.delete('local');
    window.history.replaceState({}, '', url.toString());
    setShowLocal(false);
  }

  if (!authentikEnabled || showLocal) {
    return (
      <div>
        {authentikEnabled && (
          <div
            style={{
              position: 'fixed',
              top: 'calc(var(--base) * 1)',
              left: 0,
              right: 0,
              zIndex: 10,
              textAlign: 'center',
            }}
          >
            <button
              type="button"
              onClick={backToAuthentik}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--theme-text)',
                opacity: 0.8,
                cursor: 'pointer',
                fontSize: 'var(--font-size-small)',
                textDecoration: 'underline',
              }}
            >
              ← Back to Authentik login
            </button>
          </div>
        )}
        <LoginView
          {...loginProps}
          title={authentikEnabled ? 'Local login' : title}
          afterLoginPath={afterLoginPath}
          authClient={authClient}
          socialProviders={[]}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--theme-bg)',
        padding: 'var(--base)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: 'calc(var(--base) * 2)',
          borderRadius: 'var(--style-radius-m)',
          background: 'var(--theme-elevation-50)',
          boxShadow: '0 2px 20px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h1
          style={{
            color: 'var(--theme-text)',
            fontSize: 'var(--font-size-h3)',
            fontWeight: 600,
            textAlign: 'center',
            margin: '0 0 calc(var(--base) * 1.5) 0',
          }}
        >
          {title}
        </h1>

        {authentikError && (
          <div
            role="alert"
            style={{
              marginBottom: 'calc(var(--base) * 1)',
              padding: 'calc(var(--base) * 0.75)',
              borderRadius: 'var(--style-radius-s)',
              background: 'var(--theme-error-100, #fee2e2)',
              color: 'var(--theme-error-750, #991b1b)',
              fontSize: 'var(--font-size-small)',
            }}
          >
            {authentikError}
          </div>
        )}

        <button
          type="button"
          disabled={authentikLoading}
          onClick={handleAuthentikSignIn}
          style={{
            width: '100%',
            padding: 'calc(var(--base) * 0.75)',
            borderRadius: 'var(--style-radius-s)',
            fontSize: 'var(--font-size-base)',
            fontWeight: 500,
            cursor: authentikLoading ? 'not-allowed' : 'pointer',
            opacity: authentikLoading ? 0.7 : 1,
            background: 'var(--theme-elevation-800)',
            border: 'none',
            color: 'var(--theme-elevation-50)',
          }}
        >
          {authentikLoading ? 'Redirecting to Authentik…' : 'Continue with Authentik'}
        </button>

        <p
          style={{
            margin: 'calc(var(--base) * 1.25) 0 calc(var(--base) * 1)',
            textAlign: 'center',
            fontSize: 'var(--font-size-small)',
            color: 'var(--theme-text)',
            opacity: 0.7,
          }}
        >
          Sign in with your itsmillertime.dev identity
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'calc(var(--base) * 0.75)',
            margin: 'calc(var(--base) * 0.5) 0',
            color: 'var(--theme-text)',
            opacity: 0.5,
            fontSize: 'var(--font-size-small)',
          }}
        >
          <div style={{ flex: 1, height: 1, background: 'var(--theme-elevation-250)' }} />
          or
          <div style={{ flex: 1, height: 1, background: 'var(--theme-elevation-250)' }} />
        </div>

        <button
          type="button"
          onClick={openLocalLogin}
          style={{
            width: '100%',
            padding: 'calc(var(--base) * 0.75)',
            borderRadius: 'var(--style-radius-s)',
            fontSize: 'var(--font-size-base)',
            fontWeight: 500,
            cursor: 'pointer',
            background: 'transparent',
            border: '1px solid var(--theme-elevation-300)',
            color: 'var(--theme-text)',
          }}
        >
          Use local email &amp; password
        </button>
      </div>
    </div>
  );
}

export default AuthentikLoginView;
