// SCHEDULED usa azul fijo (no `primary-*`) a propósito: el color de marca del hospital
// cambia por admin (ver theme.js), pero el código de colores de estado de una cita debe
// verse igual sin importar qué color eligieron -- si no, "Programada" cambiaría de azul a
// lo que sea que el admin haya puesto como color principal.
const STATUS_BADGE = {
  SCHEDULED: { label: 'Programada', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  COMPLETED: { label: 'Atendida', classes: 'bg-green-50 text-green-700 border-green-200' },
  CANCELLED: { label: 'Cancelada', classes: 'bg-red-50 text-red-700 border-red-200' },
  NO_SHOW: { label: 'No asistió', classes: 'bg-gray-100 text-gray-600 border-gray-200' },
}

// Mismas etiquetas que el badge de arriba, para los <select> de filtro por estado (Citas de
// recepción/admin, Mis citas del doctor) -- una sola fuente de verdad para que el estado de
// una cita siempre se lea igual en español sin importar dónde se muestre.
export const STATUS_LABELS = Object.fromEntries(
  Object.entries(STATUS_BADGE).map(([status, { label }]) => [status, label])
)

/**
 * Pill de estado de una cita -- antes duplicado en AppointmentDetailCard.jsx, ahora
 * compartido para que también lo use la lista de Citas (ReceptionAppointments.jsx).
 */
export default function StatusBadge({ status }) {
  const badge = STATUS_BADGE[status] || STATUS_BADGE.SCHEDULED
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${badge.classes}`}>
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
        <span className="ml-1 text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap bg-emerald-50 text-emerald-700 border-emerald-200">
          Llegó
        </span>
      )}
      {appointment.overbooked && (
        <span className="ml-1 text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap bg-purple-50 text-purple-700 border-purple-200">
          Sobrecupo
        </span>
      )}
    </>
  )
}

const PAYMENT_BADGE = {
  UNPAID: { label: "Sin pagar", classes: "bg-amber-50 text-amber-700 border-amber-200" },
  PENDING: { label: "SPEI pendiente", classes: "bg-blue-50 text-blue-700 border-blue-200" },
  PAID: { label: "Pagada", classes: "bg-green-50 text-green-700 border-green-200" },
  REFUNDED: { label: "Reembolsada", classes: "bg-gray-100 text-gray-600 border-gray-200" },
}

/** Estado de pago de una cita. Una cita cancelada sin pago no muestra nada (no hay nada que cobrar). */
export function PaymentBadge({ appointment }) {
  if (!appointment?.paymentStatus) return null
  if (appointment.status === "CANCELLED" && appointment.paymentStatus === "UNPAID") return null
  const badge = PAYMENT_BADGE[appointment.paymentStatus]
  if (!badge) return null
  return (
    <span className={`ml-1 text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${badge.classes}`}>
      {badge.label}
    </span>
  )
}
