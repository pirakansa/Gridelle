/* eslint-disable react/prop-types */
// File Header: Atomic text input providing consistent rounded styling.
import React from 'react'

type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  fullWidth?: boolean
}

const baseClass =
  'rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200'

// Function Header: Renders a themed input element with optional full-width behavior.
const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className = '', fullWidth, ...rest }, ref) => {
    const mergedClassName = [baseClass, fullWidth ? 'w-full' : '', className].filter(Boolean).join(' ')
    return <input ref={ref} className={mergedClassName} {...rest} />
  },
)

TextInput.displayName = 'TextInput'

export default TextInput
