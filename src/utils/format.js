// `es-MX` por defecto usa reloj de 12 horas (a. m./p. m.) para toLocaleString/toLocaleTimeString
// -- `hour12: false` lo fuerza a 24 horas en todo el sistema, para que coincida con
// formatTimeOnly (que ya arma "HH:mm" a mano a partir del LocalTime del backend, siempre en
// 24h) y no se vean formatos distintos en la misma pantalla (ej. "13:00" en la cita junto a
// "11:00 p. m." en la fecha de cancelación).
export function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short', hour12: false })
}

/** "HH:mm" a partir de un string "HH:mm:ss" (formato LocalTime del backend) o un Date. */
export function formatTimeOnly(value) {
  if (!value) return ''
  if (value instanceof Date) {
    return value.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  const [h, m] = String(value).split(':')
  return `${h}:${m}`
}

/** "lun, 31 ago" a partir de un string "YYYY-MM-DD" (formato LocalDate del backend) o un Date.
 * Se parsea manualmente para evitar el corrimiento de zona horaria de `new Date('YYYY-MM-DD')`. */
export function formatDateOnly(value) {
  if (!value) return ''
  let date
  if (value instanceof Date) {
    date = value
  } else {
    const [y, m, d] = String(value).split('-').map(Number)
    date = new Date(y, m - 1, d)
  }
  return date.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Horas entre el momento en que se canceló una cita y el inicio original de esa cita --
 * mismo cálculo que hace el backend para fijar `releaseEligible` (>= 24h). Null si la cita
 * no tiene fecha de cancelación (no está cancelada). */
export function hoursOfNotice(appointment) {
  if (!appointment?.cancelledAt || !appointment?.appointmentDate || !appointment?.startTime) return null
  const [y, m, d] = appointment.appointmentDate.split('-').map(Number)
  const [h, min] = appointment.startTime.split(':').map(Number)
  const originalStart = new Date(y, m - 1, d, h, min)
  const cancelledAt = new Date(appointment.cancelledAt)
  return (originalStart - cancelledAt) / (1000 * 60 * 60)
}

/** "21 h 45 min" a partir de un número de horas (puede tener decimales). */
export function formatHoursNotice(hours) {
  if (hours == null || Number.isNaN(hours)) return ''
  const totalMinutes = Math.max(0, Math.round(hours * 60))
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

/** true si el inicio de la cita ya pasó -- mismo criterio que el backend usa para permitir
 * "Marcar atendida"/"Marcar no asistió" (ver AppointmentServiceImpl.validateTransitionToTerminal):
 * no tiene sentido ofrecer esos botones para una cita que todavía no ocurre. Solo un filtro
 * de UI (el backend igual lo vuelve a validar) -- mismo parseo manual que hoursOfNotice para
 * evitar el corrimiento de zona horaria de `new Date('YYYY-MM-DD')`. */
export function hasAppointmentOccurred(appointment) {
  if (!appointment?.appointmentDate || !appointment?.startTime) return false
  const [y, m, d] = appointment.appointmentDate.split('-').map(Number)
  const [h, min] = appointment.startTime.split(':').map(Number)
  return new Date(y, m - 1, d, h, min) <= new Date()
}

/** "YYYY-MM-DD" de HOY en la hora local del navegador (no UTC: toISOString() cambia de día
 * a las 6 pm en México). */
export function localTodayIso() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Una cita se puede marcar "atendida" si ya empezó, si el paciente ya llegó (se le atendió
 * antes de la hora), o si estaba marcada "no asistió" por error (corrección). El backend igual
 * lo valida -- esto solo decide qué botones mostrar. */
export function canMarkAppointmentCompleted(a) {
  return (a.status === 'SCHEDULED' && (!!a.arrivedAt || hasAppointmentOccurred(a))) || a.status === 'NO_SHOW'
}

/** "No asistió" solo tiene sentido si ya empezó y el paciente NO registró su llegada. */
export function canMarkAppointmentNoShow(a) {
  return a.status === 'SCHEDULED' && !a.arrivedAt && hasAppointmentOccurred(a)
}

/** Registrar la llegada del paciente: solo el día de la cita y una vez. */
export function canRegisterArrival(a) {
  return a.status === 'SCHEDULED' && !a.arrivedAt && a.appointmentDate === localTodayIso()
}
