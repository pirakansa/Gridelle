/* eslint-disable react/prop-types */
// File Header: Atomic select component aligned with rounded input styling.
import React from 'react'

type SelectFieldProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  fullWidth?: boolean
}

const baseClass =
  'rounded border border-slate-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200'

// Function Header: Renders a styled select element with optional full-width application.
const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ className = '', fullWidth, ...rest }, ref) => {
    const mergedClassName = [baseClass, fullWidth ? 'w-full' : '', className].filter(Boolean).join(' ')
    return <select ref={ref} className={mergedClassName} {...rest} />
  },
)

SelectField.displayName = 'SelectField'

export default SelectField
