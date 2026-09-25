import { useEffect } from 'react'

/** Cierra un modal/dropdown con Escape. Solo agrega el listener mientras `active` es true, y
 * lo quita al desmontar/cerrar -- usar siempre este hook en vez de reimplementar la cadena
 * if/else a mano evita "olvidar" un modal en la lista (patrón 04). */
export default function useEscapeKey(active, onEscape) {
  useEffect(() => {
    if (!active) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') onEscape()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [active, onEscape])
}
