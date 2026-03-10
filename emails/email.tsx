import { Html, Head, Body, Button, Container } from '@react-email/components';
import * as React from 'react';

export default function Email() {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Button
            href="https://example.com"
            style={{
              background: '#000',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: '5px',
              textDecoration: 'none',
            }}
          >
            Click here
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
