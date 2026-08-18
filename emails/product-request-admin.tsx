import { Button, Img, Link, Text } from '@react-email/components';
import { EmailLayout, emailStyles } from './layout';

export interface ProductRequestAdminEmailProps {
  requesterName: string;
  requesterEmail: string;
  imageTitle: string;
  imageId: number;
  imageUrl?: string;
  galleryUrl?: string;
  cmsUrl: string;
}

export function ProductRequestAdminEmail({
  requesterName,
  requesterEmail,
  imageTitle,
  imageId,
  imageUrl,
  galleryUrl,
  cmsUrl,
}: ProductRequestAdminEmailProps) {
  return (
    <EmailLayout>
      <Text style={emailStyles.heading}>Shop listing requested</Text>
      <Text style={emailStyles.paragraph}>
        <strong>{requesterName}</strong> ({requesterEmail}) asked to be notified when this
        image is available to purchase.
      </Text>
      {imageUrl ? (
        <Img
          src={imageUrl}
          alt={imageTitle}
          width={320}
          style={{
            display: 'block',
            margin: '0 0 16px',
            maxWidth: '100%',
            borderRadius: '6px',
          }}
        />
      ) : null}
      <Text style={emailStyles.paragraph}>
        <strong>Image:</strong> {imageTitle} (#{imageId})
      </Text>
      <Button href={cmsUrl} style={emailStyles.button}>
        Open in CMS
      </Button>
      {galleryUrl ? (
        <>
          <Text style={emailStyles.paragraph}>View on the site:</Text>
          <Link href={galleryUrl} style={emailStyles.link}>
            {galleryUrl}
          </Link>
        </>
      ) : null}
      <Text style={emailStyles.footer}>
        Reply to this email to write {requesterName} directly. When you publish the product,
        they will also get an automatic “now available” message.
      </Text>
    </EmailLayout>
  );
}

ProductRequestAdminEmail.PreviewProps = {
  requesterName: 'Alex Example',
  requesterEmail: 'alex@example.com',
  imageTitle: 'Sunrise over the lake',
  imageId: 1234,
  imageUrl: 'https://gallery-images.itsmillertime.dev/example.jpg',
  galleryUrl: 'https://www.itsmillertime.dev/galleries/summer-2026?selected=1234',
  cmsUrl: 'https://cms.itsmillertime.dev/admin/collections/gallery-images/1234',
} satisfies ProductRequestAdminEmailProps;

export default ProductRequestAdminEmail;
