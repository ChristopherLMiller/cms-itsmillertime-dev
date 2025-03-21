import { NumberField } from 'payload'

type WordCount = (fieldToUse?: string) => [NumberField]

export const wordCountField: WordCount = (fieldToUse = 'content') => {
  const wordCountField: NumberField = {
    name: 'word_count',
    type: 'number',
    index: false,
    label: 'Word Count',
    admin: {
      position: 'sidebar',
      components: {
        Field: {
          path: '@/fields/wordCount/WordCountComponent#WordCountComponent',
          clientProps: {
            fieldToUse,
          },
        },
      },
    },
  }

  return [wordCountField]
}
