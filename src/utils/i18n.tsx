/* eslint-disable react-refresh/only-export-components */
// File Header: Locale context and helpers enabling bilingual UI copy selections.
import React from 'react'

export type Locale = 'ja' | 'en'

const DEFAULT_LOCALE: Locale = 'ja'
const LOCALE_STORAGE_KEY = 'gridelle.locale'

type LocaleSelector = <T>(_jaValue: T, _enValue: T) => T

interface I18nContextValue {
  readonly locale: Locale
  readonly setLocale: (_locale: Locale) => void
  readonly toggleLocale: () => void
  readonly select: LocaleSelector
}

const defaultContextValue: I18nContextValue = {
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  toggleLocale: () => {},
  select: <T,>(jaValue: T, _enValue: T): T => jaValue,
}

const LocaleContext = React.createContext<I18nContextValue>(defaultContextValue)

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE
  }

  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    return stored === 'en' ? 'en' : DEFAULT_LOCALE
  } catch {
    return DEFAULT_LOCALE
  }
}

function persistLocale(locale: Locale): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Persistence failures do not block UI updates.
  }
}

// Function Header: Shares locale state with descendants while persisting user preference.
export function LocaleProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [locale, setLocaleState] = React.useState<Locale>(() => readStoredLocale())

  const setLocale = React.useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale)
    persistLocale(nextLocale)
  }, [])

  const toggleLocale = React.useCallback(() => {
    setLocaleState((prev) => {
      const next = prev === 'ja' ? 'en' : 'ja'
      persistLocale(next)
      return next
    })
  }, [])

  const contextValue = React.useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      select: <T,>(jaValue: T, enValue: T): T => (locale === 'ja' ? jaValue : enValue),
    }),
    [locale, setLocale, toggleLocale],
  )

  return <LocaleContext.Provider value={contextValue}>{children}</LocaleContext.Provider>
}

// Function Header: Provides convenient access to the shared locale context.
export function useI18n(): I18nContextValue {
  return React.useContext(LocaleContext)
}
