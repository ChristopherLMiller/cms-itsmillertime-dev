import type { PayloadRequest } from 'payload'
import { normalizeRelationIds } from './normalizeRelationIds'

export type RelationSyncContext = {
  skipRelationSync?: boolean
}

export const idsEqual = (a: number[], b: number[]) => {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort((x, y) => x - y)
  const sortedB = [...b].sort((x, y) => x - y)
  return sortedA.every((id, index) => id === sortedB[index])
}

/** Autosave fires afterChange too; skip sync there to keep keystroke saves light. */
export function isAutosaveRequest(req: PayloadRequest): boolean {
  const query = (req as { query?: Record<string, unknown> }).query
  if (query?.autosave === true || query?.autosave === 'true') return true

  const search = (req as { searchParams?: URLSearchParams }).searchParams
  if (search?.get?.('autosave') === 'true') return true

  if (req.url) {
    try {
      const url = new URL(req.url, 'http://local')
      if (url.searchParams.get('autosave') === 'true') return true
    } catch {
      // ignore invalid url
    }
  }

  return false
}

export function shouldSkipRelationSync(
  req: PayloadRequest,
  context: unknown,
  operation?: string,
): boolean {
  const syncContext = context as RelationSyncContext
  return (
    Boolean(syncContext?.skipRelationSync) ||
    operation === 'autosave' ||
    isAutosaveRequest(req)
  )
}

export { normalizeRelationIds }
