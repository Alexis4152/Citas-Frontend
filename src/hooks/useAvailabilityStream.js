import { useEffect, useRef, useState } from 'react'
import api from '../api/axios'
import { getHospitalSlug } from '../tenant'

/**
 * Avisos en vivo de cambios en la agenda de un doctor (Server-Sent Events, ver
 * AvailabilityEvents en el backend): cuando alguien aparta, agenda o cancela un horario, se
 * llama `onChange` y la pantalla vuelve a pedir la disponibilidad al instante. Si la conexión
 * se cae, EventSource reintenta solo; mientras tanto el refresco periódico sigue de respaldo.
 * Devuelve `connected` para mostrar el indicador "En vivo".
 */
export default function useAvailabilityStream(doctorId, onChange, enabled = true) {
  const callback = useRef(onChange)
  callback.current = onChange
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const slug = getHospitalSlug()
    if (!enabled || !doctorId || !slug || typeof EventSource === 'undefined') return undefined
    const url = `${api.defaults.baseURL}/public/doctors/${doctorId}/availability/stream?hospital=${encodeURIComponent(slug)}`
    const source = new EventSource(url)
    let timer = null
    source.addEventListener('ready', () => setConnected(true))
    source.addEventListener('changed', () => {
      // Varios cambios seguidos (ej. apartar y luego agendar) se juntan en una sola recarga.
      clearTimeout(timer)
      timer = setTimeout(() => callback.current?.(), 250)
    })
    source.onerror = () => setConnected(false)
    return () => {
      clearTimeout(timer)
      source.close()
      setConnected(false)
    }
  }, [doctorId, enabled])

  return connected
}
