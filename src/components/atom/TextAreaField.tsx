/* eslint-disable react/prop-types */
// File Header: Atomic textarea component providing consistent styling.
import React from 'react'

type TextAreaFieldProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  fullWidth?: boolean
  minRows?: number
}

const baseClass =
  'rounded-md border border-slate-200 px-4 py-2 text-sm leading-relaxed focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200'

// Function Header: Renders a themed textarea element with optional sizing helpers.
const TextAreaField = React.forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ className = '', fullWidth, rows, minRows = 3, ...rest }, ref) => {
    const mergedClassName = [baseClass, fullWidth ? 'w-full' : '', className].filter(Boolean).join(' ')
    return <textarea ref={ref} className={mergedClassName} rows={rows ?? minRows} {...rest} />
  },
)

TextAreaField.displayName = 'TextAreaField'

export default TextAreaField
