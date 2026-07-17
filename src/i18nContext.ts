import { createContext, useContext } from 'react'
import type {
  Locale,
  TranslationKey,
  TranslationValues,
} from './i18n'

export type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, values?: TranslationValues) => string
}

export const I18nContext = createContext<I18nContextValue | null>(null)

export const useI18n = () => {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used within I18nProvider')
  return context
}
