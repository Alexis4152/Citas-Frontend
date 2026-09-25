import {
  formatDate, formatDateOnly, formatTimeOnly, hoursOfNotice, formatHoursNotice, hasAppointmentOccurred,
  canMarkAppointmentCompleted, canMarkAppointmentNoShow, canRegisterArrival,
} from '../utils/format'
import StatusBadge, { AppointmentFlags, PaymentBadge } from './StatusBadge'
import { formatMoney, hasPrice } from '../utils/money'
import { allergiesLabel, bloodTypeLabel } from './MedicalInfoFields'

/**
 * Tarjeta de detalle de una cita, usada tanto en "Mi agenda" (doctor) como en "Agenda
 * doctores" (recepción) al hacer clic en un slot del calendario -- antes duplicada casi
 * idéntica en ambos archivos, ahora centralizada para que el diseño (y futuros ajustes)
 * quede en un solo lugar. Cada acción es opcional: el botón correspondiente solo aparece
 * si el caller pasa su handler (ej. el doctor no tiene "onCancel" desde otra vista, etc.,
 * aunque hoy ambas vistas pasan las tres).
 */
export default function AppointmentDetailCard({
  appointment, onClose, onDownload, onRelease, onCancel, onEditMedicalInfo, onMarkCompleted, onMarkNoShow,
  onGeneratePrescription, onMarkArrived, onCharge, busyAction,
}) {
  if (!appointment) return null

  const patient = appointment.patient
  const patientName = patient ? `${patient.firstName} ${patient.lastName}`.trim() : '—'
  const initials = patient ? `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase() : '?'

  return (
    <div className="card p-6 mt-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-semibold text-gray-900">Detalle de la cita</h2>
          <StatusBadge status={appointment.status} />
          <AppointmentFlags appointment={appointment} />
          <PaymentBadge appointment={appointment} />
        </div>
        <button className="text-gray-400 hover:text-gray-700" onClick={onClose}>✕</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
        <div className="flex gap-3">
          <div className="h-11 w-11 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-gray-400 text-[11px] font-medium uppercase tracking-wide">Paciente</p>
            <p className="text-gray-900 font-semibold truncate">{patientName}</p>
            <p className="text-gray-500">{patient?.phone}</p>
            {patient?.email && <p className="text-gray-500 truncate">{patient.email}</p>}
          </div>
        </div>
        <div>
          <p className="text-gray-400 text-[11px] font-medium uppercase tracking-wide">Fecha y hora</p>
          <p className="text-gray-900 font-semibold capitalize">{formatDateOnly(appointment.appointmentDate)}</p>
          <p className="text-gray-600">{formatTimeOnly(appointment.startTime)} – {formatTimeOnly(appointment.endTime)}</p>
          <p className="text-gray-500">{appointment.branch?.name}</p>
          {hasPrice(appointment.price) && (
            <p className="text-gray-700 mt-1">Consulta: <span className="font-semibold">{formatMoney(appointment.price)}</span></p>
          )}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-gray-400 text-[11px] font-medium uppercase tracking-wide">Motivo</p>
        <p className="text-gray-700 text-sm mt-0.5">{appointment.reasonForVisit || '—'}</p>
      </div>

      <div className="mt-5 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start justify-between gap-3 flex-wrap">
        <div className="text-sm">
          <p className="text-amber-900"><span className="font-semibold">Alergias:</span> {allergiesLabel(patient)}</p>
          <p className="text-amber-900"><span className="font-semibold">Tipo de sangre:</span> {bloodTypeLabel(patient)}</p>
        </div>
        {onEditMedicalInfo && (
          <button className="text-primary-700 text-xs font-medium hover:underline shrink-0" onClick={onEditMedicalInfo}>
            Editar información médica
          </button>
        )}
      </div>

      {appointment.status === 'CANCELLED' && (
        <div className="mt-5 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 space-y-1.5">
          <p>
            <span className="font-medium text-gray-800">Cancelada por</span> {appointment.cancelledByName || '—'}
            {appointment.cancelReason && <span className="text-gray-500"> — {appointment.cancelReason}</span>}
          </p>
          {appointment.cancelledAt && <p className="text-gray-400">el {formatDate(appointment.cancelledAt)}</p>}
          {appointment.slotReleased && appointment.releasedByName && (
            <p className="text-green-700 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-600 shrink-0" />
              Espacio liberado por {appointment.releasedByName} ({appointment.releasedByRole})
            </p>
          )}
          {!appointment.slotReleased && !appointment.releaseEligible && (
            <p className="text-amber-700 flex items-start gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 mt-1" />
              <span>
                No se puede liberar el espacio: se canceló con {formatHoursNotice(hoursOfNotice(appointment))} de
                anticipación a la cita (se requieren al menos 24 horas).
              </span>
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2 pt-4 mt-5 border-t border-gray-100">
        {onDownload && (
          <button className="btn-secondary" disabled={!!busyAction} onClick={onDownload}>
            {busyAction === 'download' ? 'Descargando...' : 'Descargar comprobante'}
          </button>
        )}
        {appointment.status === 'CANCELLED' && appointment.canRelease && onRelease && (
          <button className="btn-primary" disabled={!!busyAction} onClick={onRelease}>
            {busyAction === 'release' ? 'Liberando...' : 'Liberar horario'}
          </button>
        )}
        {appointment.status === 'SCHEDULED' && onCancel && (
          <button className="btn-danger" disabled={!!busyAction} onClick={onCancel}>
            {busyAction === 'cancel' ? 'Cancelando...' : 'Cancelar cita'}
          </button>
        )}
        {/* Cada botón aparece solo cuando aplica (el backend igual lo valida): la llegada solo el
            día de la cita; "no asistió" solo si ya empezó y no llegó; "atendida" si ya empezó, si
            el paciente ya llegó, o para corregir un "no asistió" por error. */}
        {onCharge && (appointment.status === 'COMPLETED' && (appointment.paymentStatus === 'UNPAID' || appointment.paymentStatus === 'PENDING')) && (
          <button className="btn-primary" disabled={!!busyAction} onClick={onCharge}>Cobrar</button>
        )}
        {canRegisterArrival(appointment) && onMarkArrived && (
          <button className="btn-secondary" disabled={!!busyAction} onClick={onMarkArrived}>
            {busyAction === 'arrived' ? 'Guardando...' : 'Registrar llegada'}
          </button>
        )}
        {canMarkAppointmentNoShow(appointment) && onMarkNoShow && (
          <button className="btn-secondary" disabled={!!busyAction} onClick={onMarkNoShow}>
            {busyAction === 'no-show' ? 'Guardando...' : 'No asistió'}
          </button>
        )}
        {canMarkAppointmentCompleted(appointment) && onMarkCompleted && (
          <button className="btn-primary" disabled={!!busyAction} onClick={onMarkCompleted}>
            {busyAction === 'complete' ? 'Guardando...' : appointment.status === 'NO_SHOW' ? 'Corregir a atendida' : 'Marcar atendida'}
          </button>
        )}
        {appointment.status !== 'CANCELLED' && onGeneratePrescription && (
          hasAppointmentOccurred(appointment) || appointment.arrivedAt ? (
            <button className="btn-primary" disabled={!!busyAction} onClick={onGeneratePrescription}>
              Generar receta
            </button>
          ) : (
            // No tiene sentido "atender" una consulta que todavía no empieza -- el backend
            // igual lo valida, esto solo evita el intento y explica cuándo sí se podrá.
            <p className="text-xs text-gray-400 self-center">
              Podrás generar la receta a partir de las {formatTimeOnly(appointment.startTime)}, cuando empiece la consulta.
            </p>
          )
        )}
      </div>
    </div>
  )
}
