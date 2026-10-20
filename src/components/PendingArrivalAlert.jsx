import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { Link } from '../router'
import { getChargeToConfirm } from '../api/reception'
import { useAuth } from '../context/AuthContext'
import usePolling from '../hooks/usePolling'
import { staffBasePath } from '../utils/staffPath'

/**
 * Aviso del tablero: cuántas citas ya pasaron de su hora sin que nadie confirmara si el
 * paciente llegó. Lleva a "Cobrar", donde se confirman (Llegó → Cobrar / No asistió).
 * No se muestra si no hay pendientes o si la persona no tiene permiso de cobrar.
 */
export default function PendingArrivalAlert() {
  const { can } = useAuth()
  const allowed = can('PAYMENTS_CHARGE')
  const cobroPath = `${staffBasePath(useLocation().pathname)}/cobro`
  const [items, setItems] = useState([])

  const load = useCallback(() => {
    if (!allowed) return
    getChargeToConfirm().then((r) => setItems(r.data.data)).catch(() => {})
  }, [allowed])
  useEffect(() => { load() }, [load])
  usePolling(load, 60000)

  if (!allowed || items.length === 0) return null
  const today = new Date().toLocaleDateString('en-CA')
  const older = items.filter((a) => a.appointmentDate < today).length

  return (
    <Link to={cobroPath}
      className="group mb-5 flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 transition hover:border-amber-300">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><AlertTriangle className="h-5 w-5" /></div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {items.length === 1 ? '1 cita ya pasó su hora' : `${items.length} citas ya pasaron su hora`} y nadie confirmó si el paciente llegó
        </p>
        <p className="text-sm text-amber-800">
          {older > 0 ? `${older} de días anteriores. ` : ''}Confírmalas en Cobrar: "Llegó → Cobrar" o "No asistió".
        </p>
      </div>
      <span className="hidden items-center gap-1 text-sm font-semibold sm:flex">Revisar <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
    </Link>
  )
}
