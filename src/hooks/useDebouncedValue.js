import { useEffect, useState } from 'react'

/** Devuelve `value` retrasado `delayMs` sin cambios -- para que un campo de texto de
 * búsqueda filtre solo mientras el usuario hace una pausa al escribir, en vez de disparar
 * una petición por cada tecla o exigir un botón "Buscar" explícito. */
export default function useDebouncedValue(value, delayMs = 400) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
