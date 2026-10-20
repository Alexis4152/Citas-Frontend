// Colores de estado fijos (no `primary-*`) a propósito: el color de marca cambia por hospital,
// pero el código de colores de una cita debe verse igual en todos -- "Programada" siempre azul.
const STATUS_BADGE = {
  SCHEDULED: { label: 'Programada', classes: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  COMPLETED: { label: 'Atendida', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  CANCELLED: { label: 'Cancelada', classes: 'bg-rose-50 text-rose-700 ring-rose-600/20' },
  NO_SHOW: { label: 'No asistió', classes: 'bg-slate-100 text-slate-600 ring-slate-500/20' },
}

// Mismas etiquetas que el badge, para los <select> de filtro por estado: una sola fuente de
// verdad para que el estado de una cita siempre se lea igual.
export const STATUS_LABELS = Object.fromEntries(
  Object.entries(STATUS_BADGE).map(([status, { label }]) => [status, label])
)

const PILL = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap'

/** Pill de estado de una cita. */
export default function StatusBadge({ status }) {
  const badge = STATUS_BADGE[status] || STATUS_BADGE.SCHEDULED
  return (
    <span className={`${PILL} ${badge.classes}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {badge.label}
    </span>
  )
}

/** Marcas extra de una cita (junto al estado): el paciente ya llegó / es un sobrecupo. */
export function AppointmentFlags({ appointment }) {
  if (!appointment) return null
  return (
    <>
      {appointment.arrivedAt && appointment.status === 'SCHEDULED' && (
        <span className={`${PILL} bg-teal-50 text-teal-700 ring-teal-600/20`}>Llegó</span>
      )}
      {appointment.overbooked && (
        <span className={`${PILL} bg-violet-50 text-violet-700 ring-violet-600/20`}>Sobrecupo</span>
      )}
    </>
  )
}

const PAYMENT_BADGE = {
  UNPAID: { label: 'Sin pagar', classes: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  PENDING: { label: 'SPEI pendiente', classes: 'bg-sky-50 text-sky-700 ring-sky-600/20' },
  PAID: { label: 'Pagada', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  REFUNDED: { label: 'Reembolsada', classes: 'bg-slate-100 text-slate-600 ring-slate-500/20' },
}

/** Estado de pago de una cita. Una cita cancelada sin pago no muestra nada (no hay nada que cobrar). */
export function PaymentBadge({ appointment }) {
  if (!appointment?.paymentStatus) return null
  if (appointment.status === 'CANCELLED' && appointment.paymentStatus === 'UNPAID') return null
  const badge = PAYMENT_BADGE[appointment.paymentStatus]
  if (!badge) return null
  return <span className={`${PILL} ${badge.classes}`}>{badge.label}</span>
}

/** La hora de inicio ya pasó, sigue programada y nadie registró la llegada. */
function isOverdue(a) {
  if (!a || a.status !== 'SCHEDULED' || a.arrivedAt || !a.appointmentDate || !a.startTime) return false
  const [y, m, d] = a.appointmentDate.split('-').map(Number)
  const [hh, mm] = a.startTime.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm) < new Date()
}

/**
 * Todas las etiquetas de una cita juntas (estado, llegada, sobrecupo, pago, hora pasada) en un
 * contenedor que se acomoda en varias líneas: antes cada etiqueta llevaba su propio margen y en
 * columnas angostas se encimaban.
 */
export function AppointmentBadges({ appointment, showOverdue = true }) {
  if (!appointment) return null
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <StatusBadge status={appointment.status} />
      <AppointmentFlags appointment={appointment} />
      <PaymentBadge appointment={appointment} />
      {showOverdue && isOverdue(appointment) && (
        <span className={`${PILL} bg-amber-50 text-amber-700 ring-amber-600/20`}>Hora pasada</span>
      )}
    </span>
  )
}
