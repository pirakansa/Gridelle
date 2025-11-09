/* eslint-disable react/prop-types */
// File Header: Atomic button component exposing unified style variants.
import React from 'react'
import { buildButtonClassName, type ButtonSize, type ButtonVariant } from './buttonStyles'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

// Function Header: Renders a themed button with consistent sizing and variants.
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', fullWidth, ...rest }, ref) => {
    const mergedClassName = buildButtonClassName({ variant, size, fullWidth, className })
    return <button ref={ref} className={mergedClassName} {...rest} />
  },
)

Button.displayName = 'Button'

export default Button
