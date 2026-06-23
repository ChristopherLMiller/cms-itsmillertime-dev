/**
 * Medusa Admin API control client for managing storefront products from Payload.
 *
 * Medusa is the source of truth for all product data (title, price, image,
 * inventory). Payload only sends commands here and stores a single pointer
 * (`medusaProductId`) back on the gallery image so we can look the product up
 * again. Nothing else about the product is duplicated in Payload.
 *
 * Server-only. Authenticates with a Medusa *secret* API key using HTTP Basic
 * auth (key as the username, empty password) which is how Medusa v2 admin API
 * keys are presented.
 *
 * IMPORTANT (Medusa v2 price format): amounts are decimal major units, NOT
 * cents. $19.99 is sent as 19.99 - never multiply by 100.
 */

export interface MedusaEnv {
  backendUrl: string;
  adminApiKey: string;
  /** Public storefront sales channel. */
  salesChannelId: string;
  /** Private/family sales channel (hidden from the public storefront). */
  privateSalesChannelId?: string;
  shippingProfileId?: string;
  currency: string;
}

export function getMedusaEnv(): MedusaEnv {
  const backendUrl = process.env.MEDUSA_BACKEND_URL;
  const adminApiKey = process.env.MEDUSA_ADMIN_API_KEY;
  const salesChannelId = process.env.MEDUSA_SALES_CHANNEL_ID;

  if (!backendUrl || !adminApiKey || !salesChannelId) {
    throw new Error(
      'Medusa is not configured. Set MEDUSA_BACKEND_URL, MEDUSA_ADMIN_API_KEY and MEDUSA_SALES_CHANNEL_ID.',
    );
  }

  return {
    backendUrl: backendUrl.replace(/\/$/, ''),
    adminApiKey,
    salesChannelId,
    privateSalesChannelId: process.env.MEDUSA_PRIVATE_SALES_CHANNEL_ID || undefined,
    shippingProfileId: process.env.MEDUSA_DIGITAL_SHIPPING_PROFILE_ID || undefined,
    currency: (process.env.MEDUSA_CURRENCY || 'usd').toLowerCase(),
  };
}

export function isMedusaConfigured(): boolean {
  return Boolean(
    process.env.MEDUSA_BACKEND_URL &&
      process.env.MEDUSA_ADMIN_API_KEY &&
      process.env.MEDUSA_SALES_CHANNEL_ID,
  );
}

function authHeader(apiKey: string): string {
  // Medusa secret API key -> Basic <base64("key:")>
  return `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
}

async function adminFetch<T>(env: MedusaEnv, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${env.backendUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(env.adminApiKey),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Medusa ${init?.method ?? 'GET'} ${path} -> ${res.status} ${text}`);
  }

  const body = await res.text();
  return (body ? JSON.parse(body) : {}) as T;
}

// ---------------------------------------------------------------------------
// Uploads (-> Medusa file module, e.g. R2)
// ---------------------------------------------------------------------------

interface MedusaUploadResponse {
  files: Array<{ id: string; url: string }>;
}

/** Upload raw bytes to Medusa's file module and return the public URL. */
export async function uploadImageBuffer(
  env: MedusaEnv,
  bytes: ArrayBuffer | Uint8Array,
  filename: string,
  contentType = 'application/octet-stream',
): Promise<string> {
  const form = new FormData();
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  // Copy into a fresh ArrayBuffer-backed Blob to satisfy strict typings.
  form.append('files', new Blob([view], { type: contentType }), filename);

  // Do not set Content-Type; fetch adds the multipart boundary automatically.
  const res = await fetch(`${env.backendUrl}/admin/uploads`, {
    method: 'POST',
    headers: { Authorization: authHeader(env.adminApiKey) },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Medusa POST /admin/uploads -> ${res.status} ${text}`);
  }

  const data = (await res.json()) as MedusaUploadResponse;
  const url = data.files?.[0]?.url;
  if (!url) {
    throw new Error('Medusa upload returned no file url.');
  }
  return url;
}

/** Fetch an image by URL and re-upload it into Medusa's file module. */
export async function uploadImageFromUrl(
  env: MedusaEnv,
  sourceUrl: string,
  filename?: string,
): Promise<string> {
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`Could not fetch source image ${sourceUrl} -> ${res.status}`);
  }
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const bytes = await res.arrayBuffer();
  const name = filename || sourceUrl.split('/').pop()?.split('?')[0] || 'image.jpg';
  return uploadImageBuffer(env, bytes, name, contentType);
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export interface ProductInput {
  galleryImageId: number;
  title: string;
  description?: string;
  /** Public storefront image (watermarked). */
  imageUrl?: string;
  /** High-res, non-watermarked file the buyer downloads after purchase. */
  downloadUrl?: string;
  downloadFilename?: string;
  priceUSD: number;
  sku?: string;
  status?: 'published' | 'draft';
  /** Medusa collection to group the product under (storefront browsing). */
  collectionId?: string | null;
  /**
   * Sales channel to publish into. `undefined` uses the public channel;
   * `null` means "no channel" (kept off every storefront, saved as draft).
   */
  salesChannelId?: string | null;
}

/** A Medusa product collection (used to group products on the storefront). */
export interface MedusaCollection {
  id: string;
  title: string;
}

/** A Medusa sales channel, annotated for the Store panel UI. */
export interface MedusaSalesChannel {
  id: string;
  name: string;
  /** Matches MEDUSA_SALES_CHANNEL_ID / MEDUSA_PRIVATE_SALES_CHANNEL_ID when set. */
  role: 'public' | 'private' | 'other';
}

/** The product's variant axis. Each format is one variant of the image. */
export const FORMAT_OPTION = 'Format';
export const FORMAT_DIGITAL = 'Digital';

/** One purchasable variant of a product (e.g. Digital download, Physical print). */
export interface VariantSummary {
  id: string;
  title: string;
  /** Fulfillment type derived from the product's "Format" option. */
  format: string;
  priceUSD: number | null;
  sku: string | null;
  /** Digital variants don't manage inventory; physical ones do. */
  digital: boolean;
}

export interface ProductSummary {
  productId: string;
  /** First/primary (digital) variant id, kept for the single-variant flow. */
  variantId: string | null;
  title: string;
  description: string | null;
  status: string;
  thumbnail: string | null;
  priceUSD: number | null;
  sku: string | null;
  downloadUrl: string | null;
  downloadFilename: string | null;
  collectionId: string | null;
  collectionTitle: string | null;
  salesChannelId: string | null;
  salesChannelName: string | null;
  variants: VariantSummary[];
}

interface MedusaPrice {
  amount?: number;
  currency_code?: string;
}

interface MedusaVariantOption {
  value?: string;
  option?: { title?: string };
}

interface MedusaVariant {
  id: string;
  title?: string;
  sku?: string | null;
  manage_inventory?: boolean;
  prices?: MedusaPrice[];
  options?: MedusaVariantOption[];
  metadata?: Record<string, unknown> | null;
}

interface MedusaProduct {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  thumbnail?: string | null;
  variants?: MedusaVariant[];
  metadata?: Record<string, unknown> | null;
  collection_id?: string | null;
  collection?: { id: string; title: string } | null;
  sales_channels?: Array<{ id: string; name?: string }>;
}

function priceFor(env: MedusaEnv, variant: MedusaVariant | undefined): number | null {
  const match = variant?.prices?.find((p) => p.currency_code === env.currency);
  return typeof match?.amount === 'number' ? match.amount : null;
}

function metaString(meta: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = meta?.[key];
  return typeof value === 'string' && value ? value : null;
}

/**
 * Product-level metadata: the link back to Payload plus the high-res master
 * asset. The master asset is the non-watermarked source that is BOTH delivered
 * for digital purchases AND sent to the print-on-demand service as the print
 * file. It lives at the product level because every format shares it (and a
 * product may be physical-only, with no digital variant to hang it on).
 */
function buildProductMetadata(input: ProductInput): Record<string, unknown> {
  return {
    gallery_image_id: String(input.galleryImageId),
    payload_collection: 'gallery-images',
    ...(input.downloadUrl ? { master_asset_url: input.downloadUrl } : {}),
    ...(input.downloadFilename ? { master_asset_filename: input.downloadFilename } : {}),
  };
}

/**
 * Variant-level metadata holds fulfillment type only. Physical variants will
 * later add their own keys here (POD provider, size, paper, etc.) without
 * touching the product-level master asset.
 */
function buildDigitalVariantMetadata(): Record<string, unknown> {
  return { is_digital: true };
}

function formatFor(variant: MedusaVariant): string {
  return variant.options?.[0]?.value ?? variant.title ?? 'Default';
}

function isDigital(variant: MedusaVariant): boolean {
  if (typeof variant.metadata?.is_digital === 'boolean') {
    return variant.metadata.is_digital;
  }
  // Fall back to inventory behaviour for variants created before is_digital.
  return variant.manage_inventory === false;
}

function summarizeVariant(env: MedusaEnv, variant: MedusaVariant): VariantSummary {
  return {
    id: variant.id,
    title: variant.title ?? 'Default',
    format: formatFor(variant),
    priceUSD: priceFor(env, variant),
    sku: variant.sku ?? null,
    digital: isDigital(variant),
  };
}

function summarize(env: MedusaEnv, product: MedusaProduct): ProductSummary {
  const variants = (product.variants ?? []).map((v) => summarizeVariant(env, v));
  const primary = product.variants?.[0];
  // Master asset is product-level; `download_*` keys are read for back-compat
  // with products created before the rename.
  return {
    productId: product.id,
    variantId: primary?.id ?? null,
    title: product.title,
    description: product.description ?? null,
    status: product.status,
    thumbnail: product.thumbnail ?? null,
    priceUSD: priceFor(env, primary),
    sku: primary?.sku ?? null,
    downloadUrl:
      metaString(product.metadata, 'master_asset_url') ??
      metaString(product.metadata, 'download_url'),
    downloadFilename:
      metaString(product.metadata, 'master_asset_filename') ??
      metaString(product.metadata, 'download_filename'),
    collectionId: product.collection?.id ?? product.collection_id ?? null,
    collectionTitle: product.collection?.title ?? null,
    salesChannelId: product.sales_channels?.[0]?.id ?? null,
    salesChannelName: product.sales_channels?.[0]?.name ?? null,
    variants,
  };
}

/** List the Medusa product collections available to group products under. */
export async function listCollections(env: MedusaEnv): Promise<MedusaCollection[]> {
  const { collections } = await adminFetch<{ collections: MedusaCollection[] }>(
    env,
    '/admin/collections?fields=id,title&limit=100',
  );
  return (collections ?? []).map((c) => ({ id: c.id, title: c.title }));
}

/** Create a new Medusa product collection. */
export async function createCollection(env: MedusaEnv, title: string): Promise<MedusaCollection> {
  const { collection } = await adminFetch<{ collection: MedusaCollection }>(env, '/admin/collections', {
    method: 'POST',
    body: JSON.stringify({ title: title.trim() }),
  });
  if (!collection?.id) {
    throw new Error('Medusa did not return a collection id.');
  }
  return { id: collection.id, title: collection.title };
}

/** List sales channels, marking which env ids are public vs private. */
export async function listSalesChannels(env: MedusaEnv): Promise<MedusaSalesChannel[]> {
  const { sales_channels } = await adminFetch<{
    sales_channels: Array<{ id: string; name?: string }>;
  }>(env, '/admin/sales-channels?fields=id,name&limit=50');

  return (sales_channels ?? []).map((ch) => ({
    id: ch.id,
    name: ch.name ?? ch.id,
    role:
      ch.id === env.salesChannelId
        ? 'public'
        : ch.id === env.privateSalesChannelId
          ? 'private'
          : 'other',
  }));
}

/** Create a single-variant digital product in the resolved sales channel. */
export async function createProduct(env: MedusaEnv, input: ProductInput): Promise<ProductSummary> {
  // undefined -> public channel; null -> no channel (e.g. private image with no
  // private channel configured). A channel-less product is never visible, so we
  // force it to draft to make that explicit.
  const channelId = input.salesChannelId === undefined ? env.salesChannelId : input.salesChannelId;
  const status = channelId ? input.status ?? 'published' : 'draft';

  const { product } = await adminFetch<{ product: MedusaProduct }>(env, '/admin/products', {
    method: 'POST',
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      status,
      thumbnail: input.imageUrl,
      images: input.imageUrl ? [{ url: input.imageUrl }] : undefined,
      ...(input.collectionId ? { collection_id: input.collectionId } : {}),
      shipping_profile_id: env.shippingProfileId,
      sales_channels: channelId ? [{ id: channelId }] : [],
      // Single "Format" axis: Digital today, print formats added as new values
      // and variants later (additive, no option migration needed).
      options: [{ title: FORMAT_OPTION, values: [FORMAT_DIGITAL] }],
      metadata: buildProductMetadata(input),
      variants: [
        {
          title: FORMAT_DIGITAL,
          sku: input.sku || `GALLERY-IMG-${input.galleryImageId}`,
          manage_inventory: false,
          options: { [FORMAT_OPTION]: FORMAT_DIGITAL },
          prices: [{ amount: input.priceUSD, currency_code: env.currency }],
          metadata: buildDigitalVariantMetadata(),
        },
      ],
    }),
  });

  return summarize(env, product);
}

/** Fetch a product summary (live price/status) by id, or null if it's gone. */
export async function getProduct(env: MedusaEnv, productId: string): Promise<ProductSummary | null> {
  try {
    const { product } = await adminFetch<{ product: MedusaProduct }>(
      env,
      `/admin/products/${productId}?fields=id,title,description,status,thumbnail,metadata,collection_id,*collection,*sales_channels,*variants,*variants.prices,*variants.options,*variants.metadata`,
    );
    return summarize(env, product);
  } catch (err) {
    if (err instanceof Error && /-> 404/.test(err.message)) {
      return null;
    }
    throw err;
  }
}

/**
 * Update an existing product's core fields plus its digital variant.
 *
 * Medusa replaces `metadata` wholesale, so we rebuild it each time. Product
 * metadata holds the gallery link + the high-res master asset; the variant
 * holds the `is_digital` marker. When no new master asset is provided, the
 * caller passes the existing one through.
 */
export async function updateProduct(
  env: MedusaEnv,
  productId: string,
  variantId: string | null,
  input: ProductInput,
): Promise<ProductSummary> {
  await adminFetch(env, `/admin/products/${productId}`, {
    method: 'POST',
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      metadata: buildProductMetadata(input),
      ...(input.collectionId !== undefined ? { collection_id: input.collectionId } : {}),
      ...(input.salesChannelId !== undefined
        ? { sales_channels: input.salesChannelId ? [{ id: input.salesChannelId }] : [] }
        : {}),
      ...(input.imageUrl
        ? { thumbnail: input.imageUrl, images: [{ url: input.imageUrl }] }
        : {}),
    }),
  });

  if (variantId) {
    await adminFetch(env, `/admin/products/${productId}/variants/${variantId}`, {
      method: 'POST',
      body: JSON.stringify({
        sku: input.sku || `GALLERY-IMG-${input.galleryImageId}`,
        prices: [{ amount: input.priceUSD, currency_code: env.currency }],
        metadata: buildDigitalVariantMetadata(),
      }),
    });
  }

  const updated = await getProduct(env, productId);
  if (!updated) {
    throw new Error(`Product ${productId} disappeared after update.`);
  }
  return updated;
}

/** Publish or unpublish (draft) a product. Drafts disappear from the storefront. */
export async function setProductStatus(
  env: MedusaEnv,
  productId: string,
  status: 'published' | 'draft',
): Promise<void> {
  await adminFetch(env, `/admin/products/${productId}`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

/** Hard-delete a product. Tolerates an already-missing product. */
export async function deleteProduct(env: MedusaEnv, productId: string): Promise<void> {
  try {
    await adminFetch(env, `/admin/products/${productId}`, { method: 'DELETE' });
  } catch (err) {
    if (err instanceof Error && /-> 404/.test(err.message)) {
      return;
    }
    throw err;
  }
}
