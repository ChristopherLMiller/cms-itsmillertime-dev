import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

const LOGO_URL = 'https://cms.itsmillertime.dev/api/media/file/logo_2acde3523f.svg';

export const emailStyles = {
  main: {
    backgroundColor: '#a52b1e',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
    padding: '32px 0',
  },
  container: {
    backgroundColor: '#fafafa',
    margin: '0 auto',
    padding: '40px 20px',
    marginBottom: '64px',
    borderRadius: '8px',
    maxWidth: '480px',
  },
  section: {
    padding: '0 24px',
  },
  logoSection: {
    textAlign: 'center' as const,
    padding: '0 24px 24px',
  },
  logo: {
    margin: '0 auto',
  },
  heading: {
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '32px',
    margin: '0 0 24px',
    color: '#1a1a1a',
  },
  paragraph: {
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 16px',
    color: '#525f7f',
  },
  button: {
    backgroundColor: '#a52b1e',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    padding: '12px 24px',
    textDecoration: 'none',
    display: 'inline-block',
    marginBottom: '24px',
  },
  link: {
    color: '#000',
    fontSize: '14px',
    textDecoration: 'underline',
    wordBreak: 'break-all' as const,
    display: 'block',
    marginBottom: '24px',
  },
  hr: {
    borderColor: '#e6ebf1',
    margin: '24px 0',
  },
  footer: {
    color: '#8898aa',
    fontSize: '14px',
    lineHeight: '20px',
    margin: '0',
  },
} as const;

interface EmailLayoutProps {
  children: React.ReactNode;
}

export function EmailLayout({ children }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Body style={emailStyles.main}>
        <Container style={emailStyles.container}>
          <Section style={emailStyles.logoSection}>
            <Img
              src={LOGO_URL}
              alt="Logo"
              width={120}
              style={emailStyles.logo}
            />
          </Section>
          <Section style={emailStyles.section}>{children}</Section>
        </Container>
      </Body>
    </Html>
  );
}

interface ActionEmailTemplateProps {
  greeting: string;
  body: React.ReactNode;
  buttonText: string;
  buttonHref: string;
  fallbackText: string;
  footerText: string;
}

export function ActionEmailTemplate({
  greeting,
  body,
  buttonText,
  buttonHref,
  fallbackText,
  footerText,
}: ActionEmailTemplateProps) {
  return (
    <EmailLayout>
      <Text style={emailStyles.heading}>{greeting}</Text>
      {body}
      <Button href={buttonHref} style={emailStyles.button}>
        {buttonText}
      </Button>
      <Text style={emailStyles.paragraph}>{fallbackText}</Text>
      <Link href={buttonHref} style={emailStyles.link}>
        {buttonHref}
      </Link>
      <Hr style={emailStyles.hr} />
      <Text style={emailStyles.footer}>{footerText}</Text>
    </EmailLayout>
  );
}
