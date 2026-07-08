import type { PayloadRequest } from 'payload';
import { allowedRoles } from '@/access/methods/allowedRoles';
import {
  createCollection,
  createProduct,
  deleteProduct,
  getMedusaEnv,
  getProduct,
  isMedusaConfigured,
  listCollections,
  listOfferingSets,
  listSalesChannels,
  setProductStatus,
  updateProduct,
  uploadImageBuffer,
  uploadImageFromUrl,
  type MedusaEnv,
  type ProductSummary,
} from '@/lib/medusa/client';

/**
 * Admin-only endpoints that let the gallery-image "Store" panel drive Medusa.
 *
 * Medusa owns the product; Payload stores only `medusaProductId` as a pointer.
 * All of these run server-side with the Medusa secret key, so the key never
 * reaches the browser.
 */

type ImageSource = 'gallery' | 'upload' | 'keep';

interface GalleryImageDoc {
  id: number;
  alt?: string | null;
  url?: string | null;
  medusaProductId?: string | null;
  sizes?: Record<string, { url?: string | null } | undefined> | null;
  settings?: { visibility?: string | null } | null;
}

/** Non-public images must stay off the public storefront sales channel. */
function isPrivateImage(image: GalleryImageDoc): boolean {
  const visibility = image.settings?.visibility;
  return visibility === 'PRIVILEGED' || visibility === 'AUTHENTICATED';
}

/**
 * Resolve which sales channel a product belongs in based on the image's
 * visibility. Only ALL (public) images use the public channel; PRIVILEGED and
 * AUTHENTICATED go to the private channel. If that channel isn't configured we
 * return `null` (no channel) so the product is NEVER exposed publicly by
 * accident.
 */
function resolveSalesChannelId(env: MedusaEnv, image: GalleryImageDoc): string | null {
  if (isPrivateImage(image)) return env.privateSalesChannelId ?? null;
  return env.salesChannelId;
}

/**
 * Sales channel from the Store panel form. Empty string means "none" (hidden).
 * When omitted, falls back to the gallery visibility default.
 */
function salesChannelFromBody(
  body: Record<string, unknown>,
  env: MedusaEnv,
  image: GalleryImageDoc,
): string | null {
  if (!('salesChannelId' in body)) {
    return resolveSalesChannelId(env, image);
  }
  const raw = body.salesChannelId;
  if (raw === '' || raw === null) return null;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

async function requireAdmin(req: PayloadRequest): Promise<boolean> {
  return allowedRoles(['admin'])({ req });
}

async function readJson(req: PayloadRequest): Promise<Record<string, unknown> | null> {
  const parseJson = req.json;
  if (!parseJson) return null;
  try {
    const body = await parseJson.call(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

function absoluteUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = (process.env.NEXT_PUBLIC_SERVER_URL ?? '').replace(/\/$/, '');
  if (!base) return null;
  return `${base}${pathOrUrl}`;
}

/**
 * Best public URL for the gallery image's pixels for the storefront listing.
 * Prefer aspect-preserving sizes (xlarge/large) and the original; never the
 * cropped `og`/`square` derivatives, which would cut the image off.
 */
function galleryImageSourceUrl(image: GalleryImageDoc): string | null {
  const candidate =
    image.sizes?.xlarge?.url ?? image.sizes?.large?.url ?? image.url ?? null;
  return absoluteUrl(candidate);
}

async function loadImage(req: PayloadRequest, id: number): Promise<GalleryImageDoc | null> {
  return (await req.payload.findByID({
    collection: 'gallery-images',
    id,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })) as GalleryImageDoc | null;
}

async function persistPointer(
  req: PayloadRequest,
  id: number,
  productId: string | null,
): Promise<void> {
  await req.payload.update({
    collection: 'gallery-images',
    id,
    depth: 0,
    overrideAccess: true,
    data: { medusaProductId: productId },
  });
}

interface DecodedUpload {
  bytes: Buffer;
  filename: string;
  contentType: string;
}

/** Read a base64 upload (`<key>Base64`/`<key>Filename`/`<key>ContentType`). */
function decodeUpload(
  body: Record<string, unknown>,
  key: string,
  fallbackName: string,
): DecodedUpload | null {
  const base64 = typeof body[`${key}Base64`] === 'string' ? (body[`${key}Base64`] as string) : '';
  if (!base64) return null;
  const filename =
    typeof body[`${key}Filename`] === 'string' && body[`${key}Filename`]
      ? (body[`${key}Filename`] as string)
      : fallbackName;
  const contentType =
    typeof body[`${key}ContentType`] === 'string' && body[`${key}ContentType`]
      ? (body[`${key}ContentType`] as string)
      : 'application/octet-stream';
  const data = base64.includes(',') ? base64.slice(base64.indexOf(',') + 1) : base64;
  return { bytes: Buffer.from(data, 'base64'), filename, contentType };
}

/** Resolve the public storefront (watermarked) image URL, uploading into Medusa. */
async function resolveStorefrontImage(
  env: MedusaEnv,
  image: GalleryImageDoc,
  source: ImageSource,
  body: Record<string, unknown>,
): Promise<string | undefined> {
  if (source === 'keep') return undefined;

  if (source === 'upload') {
    const file = decodeUpload(body, 'image', `gallery-image-${image.id}`);
    if (!file) throw new Error('No storefront image file provided.');
    return uploadImageBuffer(env, file.bytes, file.filename, file.contentType);
  }

  // 'gallery' (default): re-upload this gallery image (watermarked) into Medusa.
  const src = galleryImageSourceUrl(image);
  if (!src) {
    throw new Error(
      'Could not resolve a public URL for this gallery image. Set NEXT_PUBLIC_SERVER_URL.',
    );
  }
  return uploadImageFromUrl(env, src, `gallery-image-${image.id}`);
}

/** Resolve the buyer's download asset (high-res, no watermark), if provided. */
async function resolveDownloadAsset(
  env: MedusaEnv,
  image: GalleryImageDoc,
  body: Record<string, unknown>,
): Promise<{ url: string; filename: string } | null> {
  const file = decodeUpload(body, 'download', `gallery-image-${image.id}-original`);
  if (!file) return null;
  const url = await uploadImageBuffer(env, file.bytes, file.filename, file.contentType);
  return { url, filename: file.filename };
}

/** Deep-link to a product in the Medusa admin dashboard. */
function adminProductUrl(productId: string): string | null {
  const base = (
    process.env.MEDUSA_ADMIN_URL ||
    (process.env.MEDUSA_BACKEND_URL ? `${process.env.MEDUSA_BACKEND_URL.replace(/\/$/, '')}/app` : '')
  ).replace(/\/$/, '');
  return base ? `${base}/products/${productId}` : null;
}

function num(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === 'string' && !!entry.trim())
    .map((entry) => entry.trim());
}

interface SellablePlan {
  sellsDigital: boolean;
  digitalPriceUSD: number | null;
  offeringSetIds: string[];
}

/**
 * Validate the digital/print selling choices shared by create and update.
 * Returns an error message when invalid.
 */
function parseSellablePlan(body: Record<string, unknown>): SellablePlan | string {
  const sellsDigital = body.sellsDigital === true;
  // priceUSD accepted as a legacy alias for the digital price.
  const digitalPriceUSD = num(body.digitalPriceUSD ?? body.priceUSD);
  const offeringSetIds = strArray(body.offeringSetIds);

  if (!sellsDigital && offeringSetIds.length === 0) {
    return 'Enable the digital download or select at least one print offering set.';
  }
  if (sellsDigital && (digitalPriceUSD == null || digitalPriceUSD <= 0)) {
    return 'A valid digital download price is required.';
  }

  return { sellsDigital, digitalPriceUSD, offeringSetIds };
}

// ---------------------------------------------------------------------------
// GET /api/medusa/product/status?galleryImageId=ID
// ---------------------------------------------------------------------------
export async function medusaProductStatusHandler(req: PayloadRequest): Promise<Response> {
  if (!(await requireAdmin(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isMedusaConfigured()) {
    return Response.json({ configured: false, linked: false });
  }

  const idParam = req.searchParams?.get('galleryImageId');
  const id = num(idParam);
  if (id == null) {
    return Response.json({ error: 'galleryImageId is required' }, { status: 400 });
  }

  const image = await loadImage(req, id);
  if (!image) {
    return Response.json({ error: 'Gallery image not found' }, { status: 404 });
  }

  const audience = isPrivateImage(image) ? 'private' : 'public';
  const privateChannelConfigured = Boolean(process.env.MEDUSA_PRIVATE_SALES_CHANNEL_ID);

  if (!image.medusaProductId) {
    return Response.json({ configured: true, linked: false, audience, privateChannelConfigured });
  }

  try {
    const env = getMedusaEnv();
    const product = await getProduct(env, image.medusaProductId);
    if (!product) {
      // Pointer is stale (product deleted in Medusa); clear it.
      await persistPointer(req, id, null);
      return Response.json({
        configured: true,
        linked: false,
        audience,
        privateChannelConfigured,
        staleCleared: true,
      });
    }
    return Response.json({
      configured: true,
      linked: true,
      product,
      adminUrl: adminProductUrl(product.productId),
      audience,
      privateChannelConfigured,
    });
  } catch (err) {
    return Response.json(
      { configured: true, linked: true, error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/medusa/product/create
// ---------------------------------------------------------------------------
export async function medusaProductCreateHandler(req: PayloadRequest): Promise<Response> {
  if (!(await requireAdmin(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await readJson(req);
  if (!body) return Response.json({ error: 'Invalid JSON body' }, { status: 400 });

  const id = num(body.galleryImageId);
  const title = str(body.title);
  if (id == null) return Response.json({ error: 'galleryImageId is required' }, { status: 400 });
  if (!title) return Response.json({ error: 'title is required' }, { status: 400 });

  const plan = parseSellablePlan(body);
  if (typeof plan === 'string') {
    return Response.json({ error: plan }, { status: 400 });
  }

  const image = await loadImage(req, id);
  if (!image) return Response.json({ error: 'Gallery image not found' }, { status: 404 });
  if (image.medusaProductId) {
    return Response.json({ error: 'This image is already listed.' }, { status: 409 });
  }

  try {
    const env = getMedusaEnv();
    const source = (str(body.imageSource) as ImageSource) || 'gallery';
    const imageUrl = await resolveStorefrontImage(env, image, source, body);
    const download = await resolveDownloadAsset(env, image, body);

    if (plan.offeringSetIds.length > 0 && !download) {
      return Response.json(
        {
          error:
            'Upload the high-res master file (General tab) — it is sent to the print service as the print file.',
        },
        { status: 400 },
      );
    }

    const product: ProductSummary = await createProduct(env, {
      galleryImageId: id,
      title,
      description: str(body.description),
      sku: str(body.sku),
      sellsDigital: plan.sellsDigital,
      digitalPriceUSD: plan.digitalPriceUSD,
      offeringSetIds: plan.offeringSetIds,
      imageUrl,
      downloadUrl: download?.url,
      downloadFilename: download?.filename,
      collectionId: str(body.collectionId) ?? null,
      salesChannelId: salesChannelFromBody(body, env, image),
      status: 'published',
    });
    await persistPointer(req, id, product.productId);
    return Response.json({ ok: true, product });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/medusa/product/update
// ---------------------------------------------------------------------------
export async function medusaProductUpdateHandler(req: PayloadRequest): Promise<Response> {
  if (!(await requireAdmin(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await readJson(req);
  if (!body) return Response.json({ error: 'Invalid JSON body' }, { status: 400 });

  const id = num(body.galleryImageId);
  const title = str(body.title);
  if (id == null) return Response.json({ error: 'galleryImageId is required' }, { status: 400 });
  if (!title) return Response.json({ error: 'title is required' }, { status: 400 });

  const plan = parseSellablePlan(body);
  if (typeof plan === 'string') {
    return Response.json({ error: plan }, { status: 400 });
  }

  const image = await loadImage(req, id);
  if (!image) return Response.json({ error: 'Gallery image not found' }, { status: 404 });
  if (!image.medusaProductId) {
    return Response.json({ error: 'This image is not listed yet.' }, { status: 409 });
  }

  try {
    const env = getMedusaEnv();
    const existing = await getProduct(env, image.medusaProductId);
    if (!existing) {
      await persistPointer(req, id, null);
      return Response.json({ error: 'Product no longer exists in Medusa.' }, { status: 404 });
    }
    const source = (str(body.imageSource) as ImageSource) || 'keep';
    const imageUrl = await resolveStorefrontImage(env, image, source, body);
    const download = await resolveDownloadAsset(env, image, body);
    const downloadUrl = download?.url ?? existing.downloadUrl ?? undefined;

    if (plan.offeringSetIds.length > 0 && !downloadUrl) {
      return Response.json(
        {
          error:
            'Upload the high-res master file (General tab) — it is sent to the print service as the print file.',
        },
        { status: 400 },
      );
    }

    const product = await updateProduct(env, existing.productId, existing, {
      galleryImageId: id,
      title,
      description: str(body.description),
      sku: str(body.sku),
      sellsDigital: plan.sellsDigital,
      digitalPriceUSD: plan.digitalPriceUSD,
      offeringSetIds: plan.offeringSetIds,
      imageUrl,
      // Keep the existing download asset unless a new one was uploaded.
      downloadUrl,
      downloadFilename: download?.filename ?? existing.downloadFilename ?? undefined,
      collectionId: 'collectionId' in body ? str(body.collectionId) ?? null : undefined,
      salesChannelId: salesChannelFromBody(body, env, image),
    });
    return Response.json({ ok: true, product });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/medusa/product/status  { galleryImageId, status: 'published'|'draft' }
// ---------------------------------------------------------------------------
export async function medusaProductSetStatusHandler(req: PayloadRequest): Promise<Response> {
  if (!(await requireAdmin(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await readJson(req);
  if (!body) return Response.json({ error: 'Invalid JSON body' }, { status: 400 });

  const id = num(body.galleryImageId);
  const status = str(body.status);
  if (id == null) return Response.json({ error: 'galleryImageId is required' }, { status: 400 });
  if (status !== 'published' && status !== 'draft') {
    return Response.json({ error: 'status must be published or draft' }, { status: 400 });
  }

  const image = await loadImage(req, id);
  if (!image?.medusaProductId) {
    return Response.json({ error: 'This image is not listed.' }, { status: 409 });
  }

  try {
    const env = getMedusaEnv();
    await setProductStatus(env, image.medusaProductId, status);
    const product = await getProduct(env, image.medusaProductId);
    return Response.json({ ok: true, product });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/medusa/product/delete  { galleryImageId }
// ---------------------------------------------------------------------------
export async function medusaProductDeleteHandler(req: PayloadRequest): Promise<Response> {
  if (!(await requireAdmin(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await readJson(req);
  if (!body) return Response.json({ error: 'Invalid JSON body' }, { status: 400 });

  const id = num(body.galleryImageId);
  if (id == null) return Response.json({ error: 'galleryImageId is required' }, { status: 400 });

  const image = await loadImage(req, id);
  if (!image) return Response.json({ error: 'Gallery image not found' }, { status: 404 });

  try {
    if (image.medusaProductId) {
      const env = getMedusaEnv();
      await deleteProduct(env, image.medusaProductId);
    }
    await persistPointer(req, id, null);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/medusa/collections  -> [{ id, title }]
// ---------------------------------------------------------------------------
export async function medusaCollectionsHandler(req: PayloadRequest): Promise<Response> {
  if (!(await requireAdmin(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isMedusaConfigured()) {
    return Response.json({ collections: [] });
  }
  try {
    const collections = await listCollections(getMedusaEnv());
    return Response.json({ collections });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/medusa/collections  { title }
// ---------------------------------------------------------------------------
export async function medusaCollectionCreateHandler(req: PayloadRequest): Promise<Response> {
  if (!(await requireAdmin(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await readJson(req);
  if (!body) return Response.json({ error: 'Invalid JSON body' }, { status: 400 });

  const title = str(body.title);
  if (!title) return Response.json({ error: 'title is required' }, { status: 400 });

  try {
    const collection = await createCollection(getMedusaEnv(), title);
    return Response.json({ ok: true, collection });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/medusa/offering-sets  -> [{ id, name, description, isDefault }]
// ---------------------------------------------------------------------------
export async function medusaOfferingSetsHandler(req: PayloadRequest): Promise<Response> {
  if (!(await requireAdmin(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isMedusaConfigured()) {
    return Response.json({ offeringSets: [] });
  }
  try {
    const offeringSets = await listOfferingSets(getMedusaEnv());
    return Response.json({ offeringSets });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/medusa/sales-channels  -> [{ id, name, role }]
// ---------------------------------------------------------------------------
export async function medusaSalesChannelsHandler(req: PayloadRequest): Promise<Response> {
  if (!(await requireAdmin(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isMedusaConfigured()) {
    return Response.json({ channels: [] });
  }
  try {
    const channels = await listSalesChannels(getMedusaEnv());
    return Response.json({ channels });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
