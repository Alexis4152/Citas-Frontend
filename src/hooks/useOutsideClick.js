import { useEffect, useRef } from 'react'

/** Ref + listener de `mousedown`: cierra un widget embebido en el flujo normal (dropdown de
 * cuenta, menú) cuando se hace clic fuera de él. El ref debe cubrir TODO el bloque
 * interactivo del widget, no solo el control que lo abre (patrón 05). Cerrar solo debe
 * ocultar, nunca vaciar los datos del widget. */
export default function useOutsideClick(onOutsideClick) {
  const ref = useRef(null)

  useEffect(() => {
    function handleMouseDown(e) {
      if (ref.current && !ref.current.contains(e.target)) onOutsideClick()
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onOutsideClick])

  return ref
}
