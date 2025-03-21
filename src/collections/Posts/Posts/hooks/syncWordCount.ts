import { lexicalToText } from '@/utilities/lexicalToText'
import { FieldHook } from 'payload'

export const syncWordCount = (lexicalFieldName: string): FieldHook => {
  return ({ data, siblingData, operation }) => {
    if (operation === 'create' || operation === 'update') {
      const lexicalContent = siblingData?.[lexicalFieldName] || data?.[lexicalFieldName]

      if (lexicalContent) {
        try {
          const plainText = lexicalToText(lexicalContent)

          const wordCount = plainText.split(/\s+/).filter(Boolean).length

          return wordCount
        } catch (error) {
          console.error('Error counting words: ', error)
        }
      }
    }
  }
}
