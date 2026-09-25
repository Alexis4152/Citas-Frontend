import { useState } from 'react'

/** `useState` respaldado en `localStorage`: mismo mini-patrón reutilizable para cualquier
 * preferencia de UI que deba sobrevivir a un refresh (tamaño de página, vista elegida, etc.)
 * (patrón 11). */
export default function usePersistedState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored !== null ? JSON.parse(stored) : defaultValue
    } catch {
      return defaultValue
    }
  })

  function setPersistedValue(next) {
    setValue((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next
      try {
        localStorage.setItem(key, JSON.stringify(resolved))
      } catch {
        // localStorage no disponible (privado/bloqueado): la preferencia simplemente no persiste.
      }
      return resolved
    })
  }

  return [value, setPersistedValue]
}
