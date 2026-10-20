import { useCallback, useEffect, useRef, useState } from 'react'
import { holderKey, holdSlot, releaseSlot, releaseSlotOnExit } from '../api/slotHolds'

/**
 * Apartado temporal del horario elegido mientras se termina de agendar. Mientras dure, nadie
 * más puede tomar ese horario (lo ven como "alguien lo está apartando"); si se cambia de
 * horario, se sale de la página o vence el tiempo, el horario vuelve a quedar libre.
 *
 * Devuelve `hold` ({ token, date, startTime, ... }), `secondsLeft` (cuenta regresiva con el
 * tiempo que dio el servidor, no con el reloj del dispositivo), `acquire(doctorId, branchId,
 * date, startTime)` y `release()`. `acquire` lanza el error de axios si no se pudo (409 =
 * alguien más lo tiene o ya se reservó).
 */
export default function useSlotHold() {
  const [hold, setHold] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [acquiring, setAcquiring] = useState(false)
  const holdRef = useRef(null)
  const key = useRef(holderKey()).current

  useEffect(() => { holdRef.current = hold }, [hold])

  // Cuenta regresiva.
  useEffect(() => {
    if (!hold) return undefined
    const tick = () => setSecondsLeft(Math.max(0, Math.round((hold.expiresAtMs - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [hold])

  // Al cerrar la pestaña o salir del asistente, se suelta el horario.
  useEffect(() => {
    const onExit = () => releaseSlotOnExit(holdRef.current?.token)
    window.addEventListener('pagehide', onExit)
    return () => {
      window.removeEventListener('pagehide', onExit)
      onExit()
    }
  }, [])

  const acquire = useCallback(async (doctorId, branchId, date, startTime) => {
    setAcquiring(true)
    try {
      const res = await holdSlot({ doctorId, branchId, date, startTime, holderKey: key })
      const data = res.data.data
      const next = { ...data, expiresAtMs: Date.now() + data.secondsLeft * 1000 }
      setHold(next)
      return next
    } finally {
      setAcquiring(false)
    }
  }, [key])

  const release = useCallback(async () => {
    const current = holdRef.current
    setHold(null)
    setSecondsLeft(0)
    if (current?.token) {
      try { await releaseSlot(current.token) } catch { /* vence solo */ }
    }
  }, [])

  /** La cita ya se confirmó: el backend consumió el apartado, solo se olvida aquí. */
  const forget = useCallback(() => {
    holdRef.current = null
    setHold(null)
    setSecondsLeft(0)
  }, [])

  return { hold, secondsLeft, expired: Boolean(hold) && secondsLeft === 0, acquiring, acquire, release, forget, holderKey: key }
}

/** "9:05" a partir de segundos. */
export function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60)
  const s = String(seconds % 60).padStart(2, '0')
  return `${m}:${s}`
}

/** El error del backend fue "alguien más lo está apartando" (409 con code SLOT_HELD). */
export function isSlotHeldError(err) {
  return err?.response?.status === 409 && err.response.data?.data?.code === 'SLOT_HELD'
}
