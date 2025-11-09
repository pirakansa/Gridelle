// File Header: Shared button style tokens for atom components.
export type ButtonVariant = 'primary' | 'ghost' | 'subtle'
export type ButtonSize = 'md' | 'sm'

const baseClass =
  'inline-flex items-center justify-center rounded-full font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-200'

const variantClassMap: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500',
  ghost:
    'border border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-800 disabled:border-slate-200 disabled:text-slate-400',
  subtle:
    'border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent',
}

const sizeClassMap: Record<ButtonSize, string> = {
  md: 'px-4 py-2 text-sm',
  sm: 'px-3 py-1 text-xs',
}

// Function Header: Builds the composed class name for a button variant/size pair.
export const buildButtonClassName = ({
  variant,
  size,
  fullWidth,
  className,
}: {
  variant: ButtonVariant
  size: ButtonSize
  fullWidth?: boolean
  className?: string
}): string => {
  const variantClass = variantClassMap[variant]
  const sizeClass = sizeClassMap[size]
  const widthClass = fullWidth ? 'w-full' : ''
  return [baseClass, variantClass, sizeClass, widthClass, className].filter(Boolean).join(' ')
}
