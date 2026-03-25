import { Text } from '@react-email/components';
import { EmailLayout, emailStyles } from './layout';

export interface ContactFormEmailProps {
  senderName: string;
  senderEmail: string;
  message: string;
}

export function ContactFormEmail({
  senderName,
  senderEmail,
  message,
}: ContactFormEmailProps) {
  return (
    <EmailLayout>
      <Text style={emailStyles.heading}>New contact form message</Text>
      <Text style={emailStyles.paragraph}>
        <strong>From:</strong> {senderName} &lt;{senderEmail}&gt;
      </Text>
      <Text style={{ ...emailStyles.paragraph, marginBottom: '8px' }}>
        <strong>Message</strong>
      </Text>
      <Text
        style={{
          ...emailStyles.paragraph,
          whiteSpace: 'pre-wrap',
          margin: '0',
          padding: '16px',
          backgroundColor: '#f4f4f5',
          borderRadius: '6px',
          border: '1px solid #e6ebf1',
        }}
      >
        {message}
      </Text>
    </EmailLayout>
  );
}

ContactFormEmail.PreviewProps = {
  senderName: 'Alex Example',
  senderEmail: 'alex@example.com',
  message:
    'Hello,\n\nI wanted to reach out about your site. Thanks for reading!\n\n— Alex',
} satisfies ContactFormEmailProps;

export default ContactFormEmail;
