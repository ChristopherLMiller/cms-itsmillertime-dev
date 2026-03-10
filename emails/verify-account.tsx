import { Text } from '@react-email/components';
import { ActionEmailTemplate, emailStyles } from './layout';

interface VerifyAccountEmailProps {
  url: string;
  userName?: string;
}

export function VerifyAccountEmail({ url, userName }: VerifyAccountEmailProps) {
  const greeting = userName ? `Hi ${userName},` : 'Hi,';

  return (
    <ActionEmailTemplate
      greeting={greeting}
      body={
        <Text style={emailStyles.paragraph}>
          Click the button below to verify your email address. This link will
          expire in 1 hour.
        </Text>
      }
      buttonText="Verify email"
      buttonHref={url}
      fallbackText="If the button doesn't work, copy and paste this link into your browser:"
      footerText="If you didn't request this, you can safely ignore this email."
    />
  );
}

VerifyAccountEmail.PreviewProps = {
  url: 'https://example.com/auth/verify-email?token=abc123def456',
  userName: 'Alex',
} satisfies VerifyAccountEmailProps;

export default VerifyAccountEmail;
