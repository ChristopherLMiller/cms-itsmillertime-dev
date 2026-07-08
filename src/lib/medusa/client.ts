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
  /**
   * High-res, non-watermarked master file. Used as BOTH the buyer's digital
   * download and the print file sent to Prodigi.
   */
  downloadUrl?: string;
  downloadFilename?: string;
  /** Whether to sell a digital-download variant. */
  sellsDigital: boolean;
  /** Price of the digital download (required when sellsDigital). */
  digitalPriceUSD?: number | null;
  /** Prodigi offering sets to attach; each creates its print variants. */
  offeringSetIds?: string[];
  /** Optional SKU for the digital variant. */
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

/**
 * Variant option axes, matching the Medusa backend's offering-set workflows.
 * Print variants are `Paper (set name) x Format (offering label)`; the digital
 * variant lives at `Paper: "Digital", Format: "Digital Download"`.
 */
export const PAPER_OPTION = 'Paper';
export const FORMAT_OPTION = 'Format';
export const DIGITAL_PAPER = 'Digital';
export const DIGITAL_FORMAT = 'Digital Download';

/** A Prodigi offering set (paper type) defined in the Medusa backend. */
export interface MedusaOfferingSet {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
}

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
  /** Digital variant id when one exists. */
  variantId: string | null;
  title: string;
  description: string | null;
  status: string;
  thumbnail: string | null;
  /** Digital download price (print prices come from the offering catalog). */
  priceUSD: number | null;
  sku: string | null;
  sellsDigital: boolean;
  downloadUrl: string | null;
  downloadFilename: string | null;
  collectionId: string | null;
  collectionTitle: string | null;
  salesChannelId: string | null;
  salesChannelName: string | null;
  variants: VariantSummary[];
  /** Offering sets currently attached to the product. */
  offeringSets: Array<{ id: string; name: string }>;
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
 * Product-level metadata using the Medusa backend's conventions:
 * - `print_asset_url` is the file sent to Prodigi as the print master.
 * - `digital_download_files` is what the buyer downloads after purchase.
 * - `sells_digital` tells the offering-set workflows to (re)create the
 *   digital variant when a set is applied.
 * The same high-res master file backs both print and digital.
 */
function buildProductMetadata(input: ProductInput): Record<string, unknown> {
  return {
    gallery_image_id: String(input.galleryImageId),
    payload_collection: 'gallery-images',
    sells_digital: input.sellsDigital,
    ...(input.downloadUrl
      ? {
          print_asset_url: input.downloadUrl,
          digital_download_files: [
            {
              url: input.downloadUrl,
              ...(input.downloadFilename ? { filename: input.downloadFilename } : {}),
            },
          ],
        }
      : {}),
  };
}

/** Variant metadata the backend's digital fulfillment workflow recognizes. */
function buildDigitalVariantMetadata(): Record<string, unknown> {
  return { fulfillment_type: 'digital' };
}

function optionValue(variant: MedusaVariant, title: string): string | undefined {
  return variant.options?.find((o) => o.option?.title === title)?.value ?? undefined;
}

function formatFor(variant: MedusaVariant): string {
  const paper = optionValue(variant, PAPER_OPTION);
  const format = optionValue(variant, FORMAT_OPTION);
  if (paper && format) {
    return paper === DIGITAL_PAPER ? format : `${paper} · ${format}`;
  }
  return format ?? variant.options?.[0]?.value ?? variant.title ?? 'Default';
}

function isDigital(variant: MedusaVariant): boolean {
  const fulfillmentType = variant.metadata?.fulfillment_type;
  if (typeof fulfillmentType === 'string') {
    return fulfillmentType === 'digital';
  }
  if (typeof variant.metadata?.is_digital === 'boolean') {
    return variant.metadata.is_digital;
  }
  // Legacy single-variant products created before fulfillment_type existed.
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

/** First configured digital download file from product metadata, if any. */
function digitalDownloadFile(
  meta: Record<string, unknown> | null | undefined,
): { url: string; filename: string | null } | null {
  const raw = meta?.digital_download_files;
  if (!Array.isArray(raw)) return null;
  const entry = raw.find(
    (e): e is { url: string; filename?: string } =>
      !!e && typeof e === 'object' && typeof (e as { url?: unknown }).url === 'string',
  );
  if (!entry) return null;
  return { url: entry.url, filename: typeof entry.filename === 'string' ? entry.filename : null };
}

function summarize(
  env: MedusaEnv,
  product: MedusaProduct,
  offeringSets: Array<{ id: string; name: string }> = [],
): ProductSummary {
  const variants = (product.variants ?? []).map((v) => summarizeVariant(env, v));
  const digitalVariant = product.variants?.find((v) => isDigital(v));
  const download = digitalDownloadFile(product.metadata);
  // Old-key fallbacks (`master_asset_*`, `download_*`) cover products created
  // before the print_asset_url / digital_download_files rename.
  return {
    productId: product.id,
    variantId: digitalVariant?.id ?? null,
    title: product.title,
    description: product.description ?? null,
    status: product.status,
    thumbnail: product.thumbnail ?? null,
    priceUSD: priceFor(env, digitalVariant),
    sku: digitalVariant?.sku ?? null,
    sellsDigital: product.metadata?.sells_digital === true || !!digitalVariant,
    downloadUrl:
      download?.url ??
      metaString(product.metadata, 'print_asset_url') ??
      metaString(product.metadata, 'master_asset_url') ??
      metaString(product.metadata, 'download_url'),
    downloadFilename:
      download?.filename ??
      metaString(product.metadata, 'master_asset_filename') ??
      metaString(product.metadata, 'download_filename'),
    collectionId: product.collection?.id ?? product.collection_id ?? null,
    collectionTitle: product.collection?.title ?? null,
    salesChannelId: product.sales_channels?.[0]?.id ?? null,
    salesChannelName: product.sales_channels?.[0]?.name ?? null,
    variants,
    offeringSets,
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

/** List the Prodigi offering sets defined in the Medusa backend. */
export async function listOfferingSets(env: MedusaEnv): Promise<MedusaOfferingSet[]> {
  const { offering_sets } = await adminFetch<{
    offering_sets: Array<{
      id: string;
      name: string;
      description?: string | null;
      is_default?: boolean;
    }>;
  }>(env, '/admin/offering-sets?limit=100');

  return (offering_sets ?? []).map((set) => ({
    id: set.id,
    name: set.name,
    description: set.description ?? null,
    isDefault: set.is_default === true,
  }));
}

/** Offering sets currently attached to a product. */
export async function getAttachedOfferingSets(
  env: MedusaEnv,
  productId: string,
): Promise<Array<{ id: string; name: string }>> {
  const { offering_sets } = await adminFetch<{
    offering_sets: Array<{ id: string; name: string }>;
  }>(env, `/admin/products/${productId}/offering-set`);
  return offering_sets ?? [];
}

/**
 * Apply an offering set to a product. The backend workflow creates one print
 * variant per offering (priced from the catalog) and, when `sells_digital`,
 * a digital variant priced at `digital_price`. Idempotent and additive.
 */
async function applyOfferingSet(
  env: MedusaEnv,
  productId: string,
  offeringSetId: string,
  input: Pick<ProductInput, 'sellsDigital' | 'digitalPriceUSD'>,
): Promise<void> {
  await adminFetch(env, `/admin/products/${productId}/offering-set`, {
    method: 'POST',
    body: JSON.stringify({
      offering_set_id: offeringSetId,
      sells_digital: input.sellsDigital,
      ...(input.sellsDigital && input.digitalPriceUSD != null && input.digitalPriceUSD > 0
        ? {
            digital_price: input.digitalPriceUSD,
            digital_price_currency: env.currency,
          }
        : {}),
    }),
  });
}

/** Detach an offering set from a product (removes that set's print variants). */
async function removeOfferingSet(
  env: MedusaEnv,
  productId: string,
  offeringSetId: string,
): Promise<void> {
  await adminFetch(env, `/admin/products/${productId}/offering-set`, {
    method: 'DELETE',
    body: JSON.stringify({ offering_set_id: offeringSetId }),
  });
}

function digitalVariantBody(env: MedusaEnv, input: ProductInput): Record<string, unknown> {
  return {
    title: DIGITAL_FORMAT,
    sku: input.sku || `GALLERY-IMG-${input.galleryImageId}`,
    manage_inventory: false,
    options: { [PAPER_OPTION]: DIGITAL_PAPER, [FORMAT_OPTION]: DIGITAL_FORMAT },
    prices:
      input.digitalPriceUSD != null && input.digitalPriceUSD > 0
        ? [{ amount: input.digitalPriceUSD, currency_code: env.currency }]
        : [],
    metadata: buildDigitalVariantMetadata(),
  };
}

interface MedusaOption {
  id: string;
  title?: string;
  values?: Array<{ value?: string }>;
}

/**
 * Ensure the Paper/Format options carry the digital values, then create the
 * digital variant. Used when digital selling is enabled on a product that has
 * no offering set to piggyback on.
 */
async function createDigitalVariant(
  env: MedusaEnv,
  productId: string,
  input: ProductInput,
): Promise<void> {
  const { product } = await adminFetch<{ product: { options?: MedusaOption[] } }>(
    env,
    `/admin/products/${productId}?fields=id,*options,*options.values`,
  );

  const ensureOptionValue = async (title: string, value: string) => {
    const option = product.options?.find((o) => o.title === title);
    if (!option) {
      await adminFetch(env, `/admin/products/${productId}/options`, {
        method: 'POST',
        body: JSON.stringify({ title, values: [value] }),
      });
      return;
    }
    const values = (option.values ?? []).map((v) => v.value).filter((v): v is string => !!v);
    if (!values.includes(value)) {
      await adminFetch(env, `/admin/products/${productId}/options/${option.id}`, {
        method: 'POST',
        body: JSON.stringify({ title, values: [...values, value] }),
      });
    }
  };

  await ensureOptionValue(PAPER_OPTION, DIGITAL_PAPER);
  await ensureOptionValue(FORMAT_OPTION, DIGITAL_FORMAT);

  await adminFetch(env, `/admin/products/${productId}/variants`, {
    method: 'POST',
    body: JSON.stringify(digitalVariantBody(env, input)),
  });
}

/**
 * Create a product using the Medusa backend's photo-product conventions.
 *
 * With offering sets: the product is created bare (no options/variants) and
 * each set application creates the print variants — plus the digital variant
 * when enabled. Digital-only: the Paper/Format options and digital variant are
 * created inline.
 */
export async function createProduct(env: MedusaEnv, input: ProductInput): Promise<ProductSummary> {
  // undefined -> public channel; null -> no channel (e.g. private image with no
  // private channel configured). A channel-less product is never visible, so we
  // force it to draft to make that explicit.
  const channelId = input.salesChannelId === undefined ? env.salesChannelId : input.salesChannelId;
  const status = channelId ? input.status ?? 'published' : 'draft';
  const offeringSetIds = input.offeringSetIds ?? [];
  const digitalOnly = offeringSetIds.length === 0;

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
      metadata: buildProductMetadata(input),
      ...(digitalOnly && input.sellsDigital
        ? {
            options: [
              { title: PAPER_OPTION, values: [DIGITAL_PAPER] },
              { title: FORMAT_OPTION, values: [DIGITAL_FORMAT] },
            ],
            variants: [digitalVariantBody(env, input)],
          }
        : {}),
    }),
  });

  for (const setId of offeringSetIds) {
    await applyOfferingSet(env, product.id, setId, input);
  }

  const created = await getProduct(env, product.id);
  if (!created) {
    throw new Error(`Product ${product.id} disappeared after creation.`);
  }

  // Apply-created digital variants have no SKU; backfill it for parity with
  // the digital-only path.
  if (input.sellsDigital && created.variantId && !created.sku) {
    await adminFetch(env, `/admin/products/${product.id}/variants/${created.variantId}`, {
      method: 'POST',
      body: JSON.stringify({ sku: input.sku || `GALLERY-IMG-${input.galleryImageId}` }),
    });
    return (await getProduct(env, product.id)) ?? created;
  }

  return created;
}

/** Fetch a product summary (live price/status/sets) by id, or null if it's gone. */
export async function getProduct(env: MedusaEnv, productId: string): Promise<ProductSummary | null> {
  try {
    const [{ product }, offeringSets] = await Promise.all([
      adminFetch<{ product: MedusaProduct }>(
        env,
        `/admin/products/${productId}?fields=id,title,description,status,thumbnail,metadata,collection_id,*collection,*sales_channels,*variants,*variants.prices,*variants.options,*variants.options.option,*variants.metadata`,
      ),
      getAttachedOfferingSets(env, productId).catch(() => []),
    ]);
    return summarize(env, product, offeringSets);
  } catch (err) {
    if (err instanceof Error && /-> 404/.test(err.message)) {
      return null;
    }
    throw err;
  }
}

/**
 * Update a product's core fields, reconcile its offering sets, and sync the
 * digital variant (price, creation, or removal).
 *
 * Medusa replaces `metadata` wholesale, so we rebuild it each time. When no
 * new master asset is provided, the caller passes the existing one through.
 */
export async function updateProduct(
  env: MedusaEnv,
  productId: string,
  existing: ProductSummary,
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

  // Reconcile offering sets when the caller provided a selection.
  if (input.offeringSetIds) {
    const currentIds = new Set(existing.offeringSets.map((s) => s.id));
    const nextIds = new Set(input.offeringSetIds);

    for (const setId of input.offeringSetIds) {
      if (!currentIds.has(setId)) {
        await applyOfferingSet(env, productId, setId, input);
      }
    }
    for (const set of existing.offeringSets) {
      if (!nextIds.has(set.id)) {
        await removeOfferingSet(env, productId, set.id);
      }
    }
  }

  // Sync the digital variant with the (possibly changed) selling choice.
  const refreshed = await getProduct(env, productId);
  const digitalVariantId = refreshed?.variantId ?? null;

  if (input.sellsDigital) {
    if (digitalVariantId) {
      await adminFetch(env, `/admin/products/${productId}/variants/${digitalVariantId}`, {
        method: 'POST',
        body: JSON.stringify({
          ...(input.sku ? { sku: input.sku } : {}),
          ...(input.digitalPriceUSD != null && input.digitalPriceUSD > 0
            ? { prices: [{ amount: input.digitalPriceUSD, currency_code: env.currency }] }
            : {}),
          metadata: buildDigitalVariantMetadata(),
        }),
      });
    } else {
      await createDigitalVariant(env, productId, input);
    }
  } else if (digitalVariantId) {
    await adminFetch(env, `/admin/products/${productId}/variants/${digitalVariantId}`, {
      method: 'DELETE',
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
