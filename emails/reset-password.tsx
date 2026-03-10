import { Text } from '@react-email/components';
import { ActionEmailTemplate, emailStyles } from './layout';

interface ResetPasswordEmailProps {
  url: string;
  userName?: string;
}

export function ResetPasswordEmail({ url, userName }: ResetPasswordEmailProps) {
  const greeting = userName ? `Hi ${userName},` : 'Hi,';

  return (
    <ActionEmailTemplate
      greeting={greeting}
      body={
        <Text style={emailStyles.paragraph}>
          You requested a password reset. Click the button below to reset your
          password. This link will expire in 1 hour.
        </Text>
      }
      buttonText="Reset password"
      buttonHref={url}
      fallbackText="If the button doesn't work, copy and paste this link into your browser:"
      footerText="If you didn't request this, you can safely ignore this email."
    />
  );
}

ResetPasswordEmail.PreviewProps = {
  url: 'https://example.com/auth/reset-password?token=abc123def456',
  userName: 'Alex',
} satisfies ResetPasswordEmailProps;

export default ResetPasswordEmail;
