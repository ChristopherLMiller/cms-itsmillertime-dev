import { Text } from '@react-email/components';
import { ActionEmailTemplate, emailStyles } from './layout';

export interface ProductRequestAvailableEmailProps {
  requesterName: string;
  imageTitle: string;
  galleryUrl: string;
}

export function ProductRequestAvailableEmail({
  requesterName,
  imageTitle,
  galleryUrl,
}: ProductRequestAvailableEmailProps) {
  const greeting = requesterName ? `Hi ${requesterName},` : 'Hi,';

  return (
    <ActionEmailTemplate
      greeting={greeting}
      body={
        <Text style={emailStyles.paragraph}>
          You asked to be notified when <strong>{imageTitle}</strong> was available to
          purchase. It is listed now — open the image and use the Prints &amp; Products
          tab to add it to your cart.
        </Text>
      }
      buttonText="View in the gallery"
      buttonHref={galleryUrl}
      fallbackText="If the button doesn't work, copy and paste this link into your browser:"
      footerText="You received this because you requested this image be made available in the shop."
    />
  );
}

ProductRequestAvailableEmail.PreviewProps = {
  requesterName: 'Alex',
  imageTitle: 'Sunrise over the lake',
  galleryUrl: 'https://www.itsmillertime.dev/galleries/summer-2026?selected=1234',
} satisfies ProductRequestAvailableEmailProps;

export default ProductRequestAvailableEmail;
