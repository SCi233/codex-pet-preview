import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  ThemeContext,
  type ResolvedTheme,
  type ThemePreference,
} from './themeContext'

const STORAGE_KEY = 'codex-pet-preview.theme'
const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)'

const getSavedPreference = (): ThemePreference => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'system' || saved === 'dark' || saved === 'light') return saved
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
  return 'system'
}

const getSystemTheme = (): ResolvedTheme =>
  window.matchMedia(SYSTEM_DARK_QUERY).matches ? 'dark' : 'light'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] =
    useState<ThemePreference>(getSavedPreference)
  const [systemTheme, setSystemTheme] =
    useState<ResolvedTheme>(getSystemTheme)

  useEffect(() => {
    const media = window.matchMedia(SYSTEM_DARK_QUERY)
    const handleChange = (event: MediaQueryListEvent) =>
      setSystemTheme(event.matches ? 'dark' : 'light')

    setSystemTheme(media.matches ? 'dark' : 'light')
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  const resolvedTheme = preference === 'system' ? systemTheme : preference

  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.theme = resolvedTheme
    root.dataset.themePreference = preference
    root.style.colorScheme = resolvedTheme

    try {
      localStorage.setItem(STORAGE_KEY, preference)
    } catch {
      // The selected theme still applies for this session without persistence.
    }
  }, [preference, resolvedTheme])

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
