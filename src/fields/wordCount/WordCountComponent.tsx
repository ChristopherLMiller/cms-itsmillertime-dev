'use client'

import { lexicalToText } from '@/utilities/lexicalToText'
import { FieldLabel, TextInput, useField, useFormFields } from '@payloadcms/ui'
import { NumberFieldClientProps } from 'payload'
import React, { useEffect } from 'react'

type WordCountComponentProps = {
  fieldToUse: string
} & NumberFieldClientProps

export const WordCountComponent: React.FC<WordCountComponentProps> = ({ field, fieldToUse }) => {
  const { value, setValue } = useField<string>({ path: field.name})

  const contentValue = useFormFields(([fields]) => {
    return fields[fieldToUse]?.value as string
  })

  useEffect(() => {
    if (contentValue) {
      try {
        const plainText = lexicalToText(contentValue)
        const wordCount = plainText.split(/\s+/).filter(Boolean).length
        console.log(wordCount)
        setValue(wordCount)
      } catch (error) {
        console.error(error)
      }
    }
  }, [contentValue, setValue, value])

  return (
    <div className="field-type">
      <div className="label-wrapper">
        <FieldLabel htmlFor={`${field.name}`} label={field.label} />
        <TextInput value={value} path={field.name} readOnly={true} />
      </div>
    </div>
  )
}
