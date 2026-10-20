import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const KEY = 'citas-theme'
const ThemeContext = createContext({ dark: false, toggle: () => {} })

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

function readStored() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

/** Tema claro / oscuro. Sin preferencia guardada sigue al sistema operativo; al alternarlo se
 * recuerda en este navegador. index.html aplica la clase antes de pintar (sin destello). */
export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const stored = readStored()
    return stored ? stored === 'dark' : systemPrefersDark()
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  }, [dark])

  // Si nunca eligió, acompaña los cambios del sistema (ej. modo oscuro automático de noche).
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return undefined
    const onChange = (e) => { if (!readStored()) setDark(e.matches) }
    media.addEventListener?.('change', onChange)
    return () => media.removeEventListener?.('change', onChange)
  }, [])

  const toggle = useCallback(() => setDark((d) => {
    try { localStorage.setItem(KEY, d ? 'light' : 'dark') } catch { /* solo esta visita */ }
    return !d
  }), [])

  return <ThemeContext.Provider value={{ dark, toggle }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
