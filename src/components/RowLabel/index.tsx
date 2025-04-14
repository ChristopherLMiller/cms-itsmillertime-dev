'use client'

import { useRowLabel } from '@payloadcms/ui'

export const RowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ title?: string }>()
  console.log(data)

  const customLabel = `${data.title || 'Slide'} ${String(rowNumber).padStart(2, '0')} `

  return <div>{customLabel}</div>
}
