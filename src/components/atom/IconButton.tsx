/* eslint-disable react/prop-types */
// File Header: Circular icon button used for toggles and compact actions.
import React from 'react'

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
}

const baseClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2'

// Function Header: Renders a circular button that swaps emphasis when set to active.
export default function IconButton({
  className = '',
  active = false,
  ...rest
}: IconButtonProps): React.ReactElement {
  const stateClass = active ? 'text-slate-900 border-slate-300' : 'hover:border-slate-300 hover:text-slate-900'
  const mergedClassName = [baseClass, stateClass, className].filter(Boolean).join(' ')
  return <button className={mergedClassName} {...rest} />
}
