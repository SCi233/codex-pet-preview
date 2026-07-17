import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  translate,
  type Locale,
  type TranslationKey,
  type TranslationValues,
} from './i18n'
import { I18nContext } from './i18nContext'

const STORAGE_KEY = 'codex-pet-preview.locale'

const getInitialLocale = (): Locale => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'en' || saved === 'zh') return saved
  return navigator.languages.some((language) =>
    language.toLowerCase().startsWith('zh'),
  )
    ? 'zh'
    : 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(getInitialLocale)
  const t = useCallback(
    (key: TranslationKey, values?: TranslationValues) =>
      translate(locale, key, values),
    [locale],
  )

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, locale)
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
  }, [locale])

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
