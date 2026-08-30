import type { CollectionAfterChangeHook } from 'payload'
import { getMedusaEnv, isMedusaConfigured, patchProductTitle } from '@/lib/medusa/client'
import { shouldSkipRelationSync } from '@/utilities/relationSync'

function trimmedAlt(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * When a listed gallery image's alt text changes, push it onto the Medusa
 * product title. The storefront uses title as image alt, and alt is often
 * filled in after the product already exists.
 *
 * Best-effort: a Medusa failure must not block saving the image in the CMS.
 * Empty alt is ignored so we never wipe a product title.
 */
export const syncAltToMedusa: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  context,
  operation,
}) => {
  if (shouldSkipRelationSync(req, context, operation)) return doc
  if (operation !== 'update') return doc

  const productId =
    typeof doc?.medusaProductId === 'string' ? doc.medusaProductId.trim() : ''
  if (!productId || !isMedusaConfigured()) return doc

  const nextAlt = trimmedAlt(doc?.alt)
  const prevAlt = trimmedAlt(previousDoc?.alt)
  if (!nextAlt || nextAlt === prevAlt) return doc

  try {
    await patchProductTitle(getMedusaEnv(), productId, nextAlt)
  } catch (err) {
    req.payload.logger.error(
      `[medusa] failed to sync alt/title for gallery-image ${doc.id} → ${productId}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
  }

  return doc
}
