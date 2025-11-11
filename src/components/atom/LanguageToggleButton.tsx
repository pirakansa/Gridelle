// File Header: Atom component exposing the locale toggle control for the UI.
import React from 'react'
import { useI18n } from '../../utils/i18n'

type Props = {
  readonly className?: string
}

// Function Header: Renders a compact button that flips between Japanese and English copy.
export default function LanguageToggleButton({ className }: Props): React.ReactElement {
  const { locale, toggleLocale, select } = useI18n()
  const buttonLabel = select('UIを英語表示に切り替える', 'Switch UI to Japanese')
  const buttonText = locale === 'ja' ? 'EN' : 'JA'

  return (
    <button
      type="button"
      onClick={toggleLocale}
      className={`inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 ${className ?? ''}`}
      aria-label={buttonLabel}
      title={buttonLabel}
    >
      {buttonText}
    </button>
  )
}
