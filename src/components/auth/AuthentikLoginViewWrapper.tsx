import type { AdminViewServerProps } from 'payload';
import { isAuthentikConfigured } from '@/lib/auth/authentik';
import { AuthentikLoginView } from './AuthentikLoginView';

type LoginConfig = {
  title?: string;
  afterLoginPath?: string;
  requiredRole?: string | string[] | null;
  requireAllRoles?: boolean;
  enablePasskey?: boolean | 'auto';
  enableSignUp?: boolean | 'auto';
  enableForgotPassword?: boolean | 'auto';
  enablePassword?: boolean | 'auto';
  resetPasswordUrl?: string;
};

/**
 * Admin login view: Authentik OIDC primary when configured, with local
 * email/password (+ passkey) as break-glass under a disclosure.
 */
export async function AuthentikLoginViewWrapper({ initPageResult }: AdminViewServerProps) {
  const { payload } = initPageResult.req;
  const loginConfig = (payload.config.custom?.betterAuth?.login ?? {}) as LoginConfig;
  const authentikEnabled = isAuthentikConfigured();

  return (
    <AuthentikLoginView
      authentikEnabled={authentikEnabled}
      title={loginConfig.title ?? 'Admin Login'}
      afterLoginPath={loginConfig.afterLoginPath ?? '/admin'}
      requiredRole={loginConfig.requiredRole ?? ['admin']}
      requireAllRoles={loginConfig.requireAllRoles ?? false}
      enablePasskey={loginConfig.enablePasskey ?? true}
      enableSignUp={false}
      enableForgotPassword={loginConfig.enableForgotPassword ?? true}
      enablePassword={loginConfig.enablePassword ?? true}
      enableMagicLink={false}
      enableEmailOtp={false}
      resetPasswordUrl={loginConfig.resetPasswordUrl}
    />
  );
}

export default AuthentikLoginViewWrapper;
