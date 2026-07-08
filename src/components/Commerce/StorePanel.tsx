'use client';

import React, { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Banner,
  Button,
  Drawer,
  Dropzone,
  FieldLabel,
  Pill,
  PlusIcon,
  ReactSelect,
  TextInput,
  TextareaInput,
  useDocumentInfo,
  useField,
  useModal,
} from '@payloadcms/ui';
import styles from './StorePanel.module.css';

const DRAWER_SLUG = 'commerce-store-drawer';
const COLLECTION_DRAWER_SLUG = 'commerce-collection-drawer';

interface VariantSummary {
  id: string;
  title: string;
  format: string;
  priceUSD: number | null;
  sku: string | null;
  digital: boolean;
}

interface ProductSummary {
  productId: string;
  variantId: string | null;
  title: string;
  description: string | null;
  status: string;
  thumbnail: string | null;
  priceUSD: number | null;
  sku: string | null;
  sellsDigital: boolean;
  downloadUrl: string | null;
  downloadFilename: string | null;
  collectionId: string | null;
  collectionTitle: string | null;
  salesChannelId: string | null;
  salesChannelName: string | null;
  shippingProfileId: string | null;
  shippingProfileName: string | null;
  variants: VariantSummary[];
  offeringSets: Array<{ id: string; name: string }>;
}

interface MedusaOfferingSet {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
}

interface MedusaCollection {
  id: string;
  title: string;
}

interface MedusaSalesChannel {
  id: string;
  name: string;
  role: 'public' | 'private' | 'other';
}

interface MedusaShippingProfile {
  id: string;
  name: string;
  type: string;
  isDefault: boolean;
}

function defaultShippingProfileId(profiles: MedusaShippingProfile[]): string {
  return (profiles.find((p) => p.isDefault) ?? profiles[0])?.id ?? '';
}

type GalleryVisibility = 'ALL' | 'AUTHENTICATED' | 'PRIVILEGED';

function defaultSalesChannelId(
  visibility: GalleryVisibility | undefined,
  channels: MedusaSalesChannel[],
): string {
  if (visibility === 'ALL') {
    return channels.find((c) => c.role === 'public')?.id ?? channels[0]?.id ?? '';
  }
  return channels.find((c) => c.role === 'private')?.id ?? '';
}

function channelOptionLabel(channel: MedusaSalesChannel): string {
  if (channel.role === 'public') return `${channel.name} (public)`;
  if (channel.role === 'private') return `${channel.name} (private)`;
  return channel.name;
}

interface StatusResponse {
  configured?: boolean;
  linked?: boolean;
  product?: ProductSummary;
  adminUrl?: string | null;
  audience?: 'public' | 'private';
  privateChannelConfigured?: boolean;
  error?: string;
}

type ImageSource = 'gallery' | 'upload' | 'keep';
type DrawerTab = 'general' | 'digital' | 'prints';

const DRAWER_TABS: Array<{ id: DrawerTab; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'digital', label: 'Digital' },
  { id: 'prints', label: 'Prints' },
];

interface FormState {
  mode: 'create' | 'edit';
  title: string;
  description: string;
  sellsDigital: boolean;
  digitalPriceUSD: string;
  offeringSetIds: string[];
  sku: string;
  collectionId: string;
  salesChannelId: string;
  shippingProfileId: string;
  imageSource: ImageSource;
  imageFile: File | null;
  downloadFile: File | null;
}

const EMPTY_FORM: FormState = {
  mode: 'create',
  title: '',
  description: '',
  sellsDigital: true,
  digitalPriceUSD: '',
  offeringSetIds: [],
  sku: '',
  collectionId: '',
  salesChannelId: '',
  shippingProfileId: '',
  imageSource: 'gallery',
  imageFile: null,
  downloadFile: null,
};

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

/** Drag-and-drop area plus a real "Browse" button (Payload's Dropzone has no click-to-open). */
const FileChooser: React.FC<{
  accept?: string;
  label: string;
  onSelect: (file: File) => void;
}> = ({ accept, label, onSelect }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const openPicker = () => inputRef.current?.click();

  return (
    <Dropzone
      onChange={(files) => {
        if (files[0]) onSelect(files[0]);
      }}
    >
      <button type="button" className={styles.dropLabel} onClick={openPicker}>
        <span>{label}</span>
        <span className={styles.browseLink}>Browse files</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.target.value = '';
        }}
      />
    </Dropzone>
  );
};

/** Thumbnail preview of a locally-selected file (images only) + filename. */
const FilePreview: React.FC<{ file: File; onClear: () => void }> = ({ file, onClear }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file.type.startsWith('image/')) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className={styles.previewWrap}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.previewImg} src={url} alt={file.name} />
      ) : (
        <div className={styles.previewFile}>📄</div>
      )}
      <div className={styles.previewMeta}>
        <span className={styles.fileInfo}>{file.name}</span>
        <Button buttonStyle="secondary" size="small" onClick={onClear}>
          Choose a different file
        </Button>
      </div>
    </div>
  );
};

export const StorePanel: React.FC = () => {
  const { id } = useDocumentInfo();
  const { openModal, closeModal } = useModal();
  const { value: alt } = useField<string>({ path: 'alt' });
  const { value: galleryUrl } = useField<string>({ path: 'url' });
  const { value: gallerySizes } = useField<Record<string, { url?: string }> | undefined>({
    path: 'sizes',
  });
  const { value: galleryVisibility } = useField<GalleryVisibility>({ path: 'settings.visibility' });
  const galleryThumb =
    gallerySizes?.thumbnail?.url ?? gallerySizes?.small?.url ?? galleryUrl ?? null;

  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [product, setProduct] = useState<ProductSummary | null>(null);
  const [adminUrl, setAdminUrl] = useState<string | null>(null);
  const [collections, setCollections] = useState<MedusaCollection[]>([]);
  const [salesChannels, setSalesChannels] = useState<MedusaSalesChannel[]>([]);
  const [shippingProfiles, setShippingProfiles] = useState<MedusaShippingProfile[]>([]);
  const [offeringSets, setOfferingSets] = useState<MedusaOfferingSet[]>([]);
  const [newCollectionTitle, setNewCollectionTitle] = useState('');
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [audience, setAudience] = useState<'public' | 'private'>('public');
  const [privateChannelConfigured, setPrivateChannelConfigured] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DrawerTab>('general');

  const galleryImageId = typeof id === 'string' ? parseInt(id, 10) : id;

  const collectionOptions = useMemo(
    () => collections.map((c) => ({ label: c.title, value: c.id })),
    [collections],
  );

  const selectedCollection =
    collectionOptions.find((o) => o.value === form.collectionId) ?? undefined;

  const refresh = useCallback(async () => {
    if (!galleryImageId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setStatusError(null);
    try {
      const res = await fetch(`/api/medusa/product/status?galleryImageId=${galleryImageId}`);
      const data = (await res.json()) as StatusResponse;
      setConfigured(data.configured !== false);
      setProduct(data.linked && data.product ? data.product : null);
      setAdminUrl(data.adminUrl ?? null);
      setAudience(data.audience ?? 'public');
      setPrivateChannelConfigured(data.privateChannelConfigured !== false);
      if (data.error) setStatusError(data.error);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to load store status');
    } finally {
      setLoading(false);
    }
  }, [galleryImageId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!configured) return;
    let active = true;
    Promise.all([
      fetch('/api/medusa/collections').then((r) => r.json()),
      fetch('/api/medusa/sales-channels').then((r) => r.json()),
      fetch('/api/medusa/offering-sets').then((r) => r.json()),
      fetch('/api/medusa/shipping-profiles').then((r) => r.json()),
    ])
      .then(([collectionsRes, channelsRes, setsRes, profilesRes]) => {
        if (!active) return;
        setCollections((collectionsRes as { collections?: MedusaCollection[] }).collections ?? []);
        setSalesChannels((channelsRes as { channels?: MedusaSalesChannel[] }).channels ?? []);
        setOfferingSets((setsRes as { offeringSets?: MedusaOfferingSet[] }).offeringSets ?? []);
        setShippingProfiles((profilesRes as { profiles?: MedusaShippingProfile[] }).profiles ?? []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [configured]);

  // Default sales channel once channels load (create dialog may open first).
  useEffect(() => {
    if (salesChannels.length === 0) return;
    setForm((f) => {
      if (f.mode === 'create' && f.salesChannelId === '') {
        return {
          ...f,
          salesChannelId: defaultSalesChannelId(galleryVisibility, salesChannels),
        };
      }
      return f;
    });
  }, [salesChannels, galleryVisibility]);

  // Default shipping profile to the store's default once profiles load.
  useEffect(() => {
    if (shippingProfiles.length === 0) return;
    setForm((f) =>
      f.shippingProfileId === ''
        ? { ...f, shippingProfileId: defaultShippingProfileId(shippingProfiles) }
        : f,
    );
  }, [shippingProfiles]);

  const openCreate = () => {
    setFormError(null);
    setCollectionError(null);
    setNewCollectionTitle('');
    setActiveTab('general');
    setForm({
      ...EMPTY_FORM,
      mode: 'create',
      title: (alt ?? '').trim(),
      offeringSetIds: offeringSets.filter((s) => s.isDefault).map((s) => s.id),
      salesChannelId: defaultSalesChannelId(galleryVisibility, salesChannels),
      shippingProfileId: defaultShippingProfileId(shippingProfiles),
    });
    openModal(DRAWER_SLUG);
  };

  const openEdit = () => {
    if (!product) return;
    setFormError(null);
    setCollectionError(null);
    setNewCollectionTitle('');
    setActiveTab('general');
    setForm({
      mode: 'edit',
      title: product.title ?? '',
      description: product.description ?? '',
      sellsDigital: product.sellsDigital,
      digitalPriceUSD: product.priceUSD != null ? String(product.priceUSD) : '',
      offeringSetIds: product.offeringSets.map((s) => s.id),
      sku: product.sku ?? '',
      collectionId: product.collectionId ?? '',
      salesChannelId:
        product.salesChannelId ??
        defaultSalesChannelId(galleryVisibility, salesChannels),
      shippingProfileId:
        product.shippingProfileId ?? defaultShippingProfileId(shippingProfiles),
      imageSource: 'keep',
      imageFile: null,
      downloadFile: null,
    });
    openModal(DRAWER_SLUG);
  };

  const toggleOfferingSet = (setId: string) => {
    setForm((f) => ({
      ...f,
      offeringSetIds: f.offeringSetIds.includes(setId)
        ? f.offeringSetIds.filter((id) => id !== setId)
        : [...f.offeringSetIds, setId],
    }));
  };

  const openCollectionDrawer = () => {
    setCollectionError(null);
    setNewCollectionTitle('');
    openModal(COLLECTION_DRAWER_SLUG);
  };

  const createCollection = async () => {
    const title = newCollectionTitle.trim();
    if (!title) {
      setCollectionError('A collection name is required.');
      return;
    }
    setBusy(true);
    setCollectionError(null);
    try {
      const res = await fetch('/api/medusa/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        collection?: MedusaCollection;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.collection) {
        throw new Error(data.error || 'Could not create collection');
      }
      setCollections((prev) =>
        [...prev, data.collection!].sort((a, b) => a.title.localeCompare(b.title)),
      );
      setForm((f) => ({ ...f, collectionId: data.collection!.id }));
      setNewCollectionTitle('');
      closeModal(COLLECTION_DRAWER_SLUG);
    } catch (err) {
      setCollectionError(err instanceof Error ? err.message : 'Could not create collection');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!galleryImageId) return;
    const digitalPrice = Number(form.digitalPriceUSD);
    if (!form.title.trim()) {
      setActiveTab('general');
      setFormError('A title is required.');
      return;
    }
    if (form.imageSource === 'upload' && !form.imageFile) {
      setActiveTab('general');
      setFormError('Choose a storefront image file, or use the gallery image.');
      return;
    }
    if (!form.sellsDigital && form.offeringSetIds.length === 0) {
      setActiveTab('digital');
      setFormError('Enable the digital download or select at least one print offering set.');
      return;
    }
    if (form.sellsDigital && (!Number.isFinite(digitalPrice) || digitalPrice <= 0)) {
      setActiveTab('digital');
      setFormError('Enter a valid digital download price.');
      return;
    }
    if (
      form.offeringSetIds.length > 0 &&
      form.mode === 'create' &&
      !form.downloadFile
    ) {
      setActiveTab('general');
      setFormError('Upload the high-res master file — it is sent to the print service.');
      return;
    }

    setBusy(true);
    setFormError(null);
    try {
      const payload: Record<string, unknown> = {
        galleryImageId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        sellsDigital: form.sellsDigital,
        digitalPriceUSD: form.sellsDigital ? digitalPrice : undefined,
        offeringSetIds: form.offeringSetIds,
        sku: form.sku.trim() || undefined,
        collectionId: form.collectionId,
        salesChannelId: form.salesChannelId,
        shippingProfileId: form.shippingProfileId,
        imageSource: form.imageSource,
      };

      if (form.imageSource === 'upload' && form.imageFile) {
        payload.imageBase64 = await fileToDataUrl(form.imageFile);
        payload.imageFilename = form.imageFile.name;
        payload.imageContentType = form.imageFile.type;
      }
      if (form.downloadFile) {
        payload.downloadBase64 = await fileToDataUrl(form.downloadFile);
        payload.downloadFilename = form.downloadFile.name;
        payload.downloadContentType = form.downloadFile.type;
      }

      const endpoint =
        form.mode === 'create' ? '/api/medusa/product/create' : '/api/medusa/product/update';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || 'Request failed');
      closeModal(DRAWER_SLUG);
      await refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: 'published' | 'draft') => {
    if (!galleryImageId) return;
    setBusy(true);
    setStatusError(null);
    try {
      const res = await fetch('/api/medusa/product/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ galleryImageId, status }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || 'Request failed');
      await refresh();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!galleryImageId) return;
    if (!window.confirm('Remove this image from the store? This deletes the Medusa product.')) {
      return;
    }
    setBusy(true);
    setStatusError(null);
    try {
      const res = await fetch('/api/medusa/product/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ galleryImageId }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || 'Request failed');
      await refresh();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  if (!galleryImageId) {
    return (
      <div className={styles.root}>
        <Banner type="info">Save the image first, then you can list it for sale.</Banner>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.root}>
        <p className={styles.muted}>Checking store status…</p>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className={styles.root}>
        <Banner type="info">
          Medusa is not configured. Set MEDUSA_BACKEND_URL, MEDUSA_ADMIN_API_KEY and
          MEDUSA_SALES_CHANNEL_ID.
        </Banner>
      </div>
    );
  }

  const isPublished = product?.status === 'published';

  return (
    <div className={styles.root}>
      {statusError && <Banner type="error">{statusError}</Banner>}

      {audience === 'private' &&
        (privateChannelConfigured ? (
          <Banner type="info">
            This image is not public (logged-in or role/user-restricted). It will be sold through
            the private sales channel and stays hidden from the public storefront.
          </Banner>
        ) : (
          <Banner type="error">
            This image is not public, but no private sales channel is configured
            (MEDUSA_PRIVATE_SALES_CHANNEL_ID). To avoid exposing it publicly, the product will be
            saved as a hidden draft with no sales channel until you configure one.
          </Banner>
        ))}

      {!product ? (
        <>
          <Banner type="info">
            This image is not for sale. List it as a digital download and/or physical prints on the
            storefront.
          </Banner>
          <div>
            <Button buttonStyle="primary" onClick={openCreate} disabled={busy}>
              Sell this image
            </Button>
          </div>
        </>
      ) : (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.thumbWrap}>
              {product.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.thumb} src={product.thumbnail} alt={product.title} />
              ) : (
                <span className={styles.muted}>No image</span>
              )}
            </div>
            <div className={styles.meta}>
              <div className={styles.titleRow}>
                <Pill pillStyle={isPublished ? 'success' : 'light-gray'}>
                  {isPublished ? 'Listed' : 'Hidden'}
                </Pill>
              </div>
              <h4 className={styles.title}>{product.title}</h4>

              <div className={styles.variants}>
                {product.variants.map((v) => (
                  <div className={styles.variantRow} key={v.id}>
                    <Pill pillStyle={v.digital ? 'success' : 'warning'} size="small">
                      {v.digital ? 'Digital' : 'Physical'}
                    </Pill>
                    <span className={styles.variantFormat}>{v.format}</span>
                    <span className={styles.variantPrice}>
                      {v.priceUSD != null ? usd(v.priceUSD) : '—'}
                    </span>
                    <span className={styles.variantSku}>
                      {v.digital ? 'Delivered as download' : 'Printed & shipped'}
                      {v.sku ? ` · SKU ${v.sku}` : ''}
                    </span>
                  </div>
                ))}
                {product.offeringSets.length === 0 && (
                  <p className={styles.hint}>
                    No print offering sets attached — edit the listing to add prints.
                  </p>
                )}
              </div>

              <dl className={styles.dl}>
                <dt className={styles.dt}>Print offerings</dt>
                <dd className={styles.dd}>
                  {product.offeringSets.length
                    ? product.offeringSets.map((s) => s.name).join(', ')
                    : '—'}
                </dd>
                <dt className={styles.dt}>Master file</dt>
                <dd className={styles.dd}>
                  {product.downloadFilename || (product.downloadUrl ? 'Attached' : '⚠ Not set')}
                </dd>
                <dt className={styles.dt}>Collection</dt>
                <dd className={styles.dd}>{product.collectionTitle || '—'}</dd>
                <dt className={styles.dt}>Sales channel</dt>
                <dd className={styles.dd}>{product.salesChannelName || '— None (hidden) —'}</dd>
                <dt className={styles.dt}>Shipping profile</dt>
                <dd className={styles.dd}>{product.shippingProfileName || '—'}</dd>
                <dt className={styles.dt}>Product ID</dt>
                <dd className={styles.dd}>{product.productId}</dd>
                <dt className={styles.dt}>Variant ID</dt>
                <dd className={styles.dd}>{product.variantId || '—'}</dd>
              </dl>
            </div>
          </div>

          <div className={styles.actions}>
            <Button buttonStyle="secondary" size="small" onClick={openEdit} disabled={busy}>
              Edit listing
            </Button>
            <Button
              buttonStyle="secondary"
              size="small"
              onClick={() => setStatus(isPublished ? 'draft' : 'published')}
              disabled={busy}
            >
              {isPublished ? 'Unpublish' : 'Publish'}
            </Button>
            <Button buttonStyle="error" size="small" onClick={remove} disabled={busy}>
              Delete
            </Button>
            {adminUrl && (
              <a className={styles.adminLink} href={adminUrl} target="_blank" rel="noreferrer">
                Open in Medusa ↗
              </a>
            )}
          </div>
        </div>
      )}

      <Drawer slug={DRAWER_SLUG} title={form.mode === 'create' ? 'Sell this image' : 'Edit listing'}>
        <div className={styles.form}>
          <div className={styles.tabs} role="tablist">
            {DRAWER_TABS.map((t) => (
              <button
                type="button"
                key={t.id}
                role="tab"
                aria-selected={activeTab === t.id}
                className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'general' && (
            <div className={styles.tabPanel}>
              <TextInput
                path="commerce-title"
                label="Title"
                value={form.title}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Product title"
              />

              <TextareaInput
                path="commerce-description"
                label="Description"
                value={form.description}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Shown on the storefront product page"
              />

              <div>
                <p className={styles.dt} style={{ marginBottom: '0.4rem' }}>
                  Sales channel
                </p>
                <select
                  className={styles.select}
                  value={form.salesChannelId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setForm((f) => ({ ...f, salesChannelId: e.target.value }))
                  }
                >
                  <option value="">— None (hidden from all storefronts) —</option>
                  {salesChannels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {channelOptionLabel(ch)}
                    </option>
                  ))}
                </select>
                <p className={styles.hint}>
                  Defaults from gallery visibility when you open this dialog. Override to list
                  publicly or privately regardless.
                </p>
              </div>

              {shippingProfiles.length > 0 && (
                <div>
                  <p className={styles.dt} style={{ marginBottom: '0.4rem' }}>
                    Shipping profile
                  </p>
                  <select
                    className={styles.select}
                    value={form.shippingProfileId}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                      setForm((f) => ({ ...f, shippingProfileId: e.target.value }))
                    }
                  >
                    {shippingProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                        {profile.isDefault ? ' (default)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className={styles.hint}>
                    Defaults to the store&apos;s default profile. Choose a digital profile for
                    download-only listings if you keep them separate.
                  </p>
                </div>
              )}

              <div className="field-type relationship">
                <FieldLabel label="Collection" />
                <div className="relationship__wrap">
                  <ReactSelect
                    isClearable
                    isSearchable
                    options={collectionOptions}
                    placeholder="Select a collection"
                    value={selectedCollection}
                    onChange={(option) => {
                      const next = Array.isArray(option) ? option[0] : option;
                      setForm((f) => ({
                        ...f,
                        collectionId: next?.value ? String(next.value) : '',
                      }));
                    }}
                  />
                  <div className="relationship-add-new" id="commerce-collection-add-new">
                    <button
                      type="button"
                      className="relationship-add-new__add-button"
                      onClick={openCollectionDrawer}
                      aria-label="Create collection"
                      title="Create collection"
                    >
                      <PlusIcon />
                    </button>
                  </div>
                </div>
                <p className={styles.hint}>
                  Groups the product on the storefront so shoppers can browse by collection.
                </p>
              </div>

              <div>
                <p className={styles.dt} style={{ marginBottom: '0.4rem' }}>
                  Storefront image (watermarked)
                </p>
                <div className={styles.sourceToggle}>
                  {form.mode === 'edit' && (
                    <Pill
                      pillStyle={form.imageSource === 'keep' ? 'dark' : 'light'}
                      onClick={() => setForm((f) => ({ ...f, imageSource: 'keep' }))}
                    >
                      Keep current
                    </Pill>
                  )}
                  <Pill
                    pillStyle={form.imageSource === 'gallery' ? 'dark' : 'light'}
                    onClick={() => setForm((f) => ({ ...f, imageSource: 'gallery' }))}
                  >
                    Use this gallery image
                  </Pill>
                  <Pill
                    pillStyle={form.imageSource === 'upload' ? 'dark' : 'light'}
                    onClick={() => setForm((f) => ({ ...f, imageSource: 'upload' }))}
                  >
                    Upload a different image
                  </Pill>
                </div>
                {(form.imageSource === 'gallery' || form.imageSource === 'keep') && galleryThumb && (
                  <div className={styles.galleryPreview}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className={styles.previewImg} src={galleryThumb} alt={alt ?? 'Gallery image'} />
                    <span className={styles.fileInfo}>
                      {form.imageSource === 'keep'
                        ? 'Keeping the current storefront image'
                        : 'This gallery image will be used'}
                    </span>
                  </div>
                )}
                {form.imageSource === 'upload' &&
                  (form.imageFile ? (
                    <FilePreview
                      file={form.imageFile}
                      onClear={() => setForm((f) => ({ ...f, imageFile: null }))}
                    />
                  ) : (
                    <FileChooser
                      accept="image/*"
                      label="Drag an image here, or"
                      onSelect={(file) => setForm((f) => ({ ...f, imageFile: file }))}
                    />
                  ))}
                <p className={styles.hint}>
                  The storefront shows this image. It is uploaded into Medusa so it renders on the
                  shop.
                </p>
              </div>

              <div>
                <p className={styles.dt} style={{ marginBottom: '0.4rem' }}>
                  Master file (high-res, no watermark)
                </p>
                {form.downloadFile ? (
                  <FilePreview
                    file={form.downloadFile}
                    onClear={() => setForm((f) => ({ ...f, downloadFile: null }))}
                  />
                ) : (
                  <>
                    <FileChooser
                      accept="image/*"
                      label="Drag the high-res source file here, or"
                      onSelect={(file) => setForm((f) => ({ ...f, downloadFile: file }))}
                    />
                    {product?.downloadFilename && (
                      <p className={styles.fileInfo}>
                        Current: {product.downloadFilename} (leave blank to keep)
                      </p>
                    )}
                  </>
                )}
                <p className={styles.hint}>
                  Used for the digital download <em>and</em> as the print file sent to the
                  print-on-demand service. Stored in Medusa.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'digital' && (
            <div className={styles.tabPanel}>
              <div className={styles.sectionHead}>
                <Pill pillStyle="success" size="small">
                  Digital
                </Pill>
                <h5 className={styles.sectionTitle}>Digital download</h5>
              </div>
              <p className={styles.hint}>
                Buyer instantly downloads the master file after purchase.
              </p>

              <label className={styles.hint} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={form.sellsDigital}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setForm((f) => ({ ...f, sellsDigital: e.target.checked }))
                  }
                />
                Sell this image as a digital download
              </label>

              {form.sellsDigital && (
                <div className={styles.row}>
                  <div className={styles.col}>
                    <TextInput
                      path="commerce-digital-price"
                      label="Digital price (USD)"
                      value={form.digitalPriceUSD}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setForm((f) => ({ ...f, digitalPriceUSD: e.target.value }))
                      }
                      placeholder="19.99"
                    />
                  </div>
                  <div className={styles.col}>
                    <TextInput
                      path="commerce-sku"
                      label="SKU (optional)"
                      value={form.sku}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setForm((f) => ({ ...f, sku: e.target.value }))
                      }
                      placeholder="Auto-generated"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'prints' && (
            <div className={styles.tabPanel}>
              <div className={styles.sectionHead}>
                <Pill pillStyle="warning" size="small">
                  Prints
                </Pill>
                <h5 className={styles.sectionTitle}>Physical prints (Prodigi)</h5>
              </div>
              <p className={styles.hint}>
                Each offering set is a paper type with its print sizes and prices, managed in the
                Medusa admin under Prodigi. Selecting a set creates one variant per size; the master
                file (General tab) is sent as the print file. Print prices come from the catalog.
              </p>

              {offeringSets.length === 0 ? (
                <Banner type="info">
                  No offering sets defined yet. Create them in the Medusa admin under Prodigi →
                  Offering sets.
                </Banner>
              ) : (
                <div className={styles.chipRow}>
                  {offeringSets.map((set) => {
                    const selected = form.offeringSetIds.includes(set.id);
                    return (
                      <Pill
                        key={set.id}
                        pillStyle={selected ? 'dark' : 'light'}
                        onClick={() => toggleOfferingSet(set.id)}
                      >
                        {selected ? '✓ ' : ''}
                        {set.name}
                        {set.isDefault ? ' (default)' : ''}
                      </Pill>
                    );
                  })}
                </div>
              )}

              {form.mode === 'edit' && (
                <p className={styles.hint}>
                  Removing a set deletes its print variants from the product; adding one creates
                  them.
                </p>
              )}
            </div>
          )}

          {formError && <Banner type="error">{formError}</Banner>}

          <div className={styles.actions}>
            <Button buttonStyle="primary" onClick={submit} disabled={busy}>
              {busy ? 'Saving…' : form.mode === 'create' ? 'Create product' : 'Save changes'}
            </Button>
            <Button buttonStyle="secondary" onClick={() => closeModal(DRAWER_SLUG)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      </Drawer>

      <Drawer slug={COLLECTION_DRAWER_SLUG} title="New collection">
        <div className={styles.form}>
          <TextInput
            path="commerce-collection-title"
            label="Name"
            value={newCollectionTitle}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNewCollectionTitle(e.target.value)}
            placeholder="e.g. Landscapes"
          />
          {collectionError && <Banner type="error">{collectionError}</Banner>}
          <div className={styles.actions}>
            <Button buttonStyle="primary" onClick={() => void createCollection()} disabled={busy}>
              {busy ? 'Creating…' : 'Create collection'}
            </Button>
            <Button
              buttonStyle="secondary"
              onClick={() => closeModal(COLLECTION_DRAWER_SLUG)}
              disabled={busy}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default StorePanel;
