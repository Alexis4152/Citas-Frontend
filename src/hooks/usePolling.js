import { useEffect, useRef } from 'react'

/** Repite `callback` cada `intervalMs` y además lo dispara de inmediato al recuperar el foco
 * de la pestaña -- refresco de datos en segundo plano sin necesitar conexiones en tiempo
 * real (patrón 14). Útil para dashboards que deben verse "vivos" (agenda del día, cola de
 * recepción) sin montar websockets. */
export default function usePolling(callback, intervalMs) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    const id = setInterval(() => callbackRef.current(), intervalMs)

    function onFocus() {
      callbackRef.current()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    return () => {
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [intervalMs])
}
