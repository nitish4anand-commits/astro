/* eslint-disable react/no-danger */
import React from 'react'
import { sanitizeHtml } from '@/lib/sanitize'

type Props = {
  html: string
  className?: string
}

/**
 * Renders sanitized HTML. Only use this component for controlled,
 * non-user-editable content after validation.
 */
export default function SafeHTML({ html, className }: Props) {
  const clean = sanitizeHtml(html || '')
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />
}
