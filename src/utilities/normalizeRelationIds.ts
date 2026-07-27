/**
 * Normalize Payload relationship values (ids or populated docs) to a unique id list.
 */
export const normalizeRelationIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) return []

  const ids = value
    .map((item) => {
      if (typeof item === 'number') return item
      if (typeof item === 'string' && item !== '' && !Number.isNaN(Number(item))) {
        return Number(item)
      }
      if (item && typeof item === 'object' && 'id' in item) {
        const id = (item as { id: unknown }).id
        if (typeof id === 'number') return id
        if (typeof id === 'string' && id !== '' && !Number.isNaN(Number(id))) {
          return Number(id)
        }
      }
      return null
    })
    .filter((id): id is number => id != null)

  return [...new Set(ids)]
}
