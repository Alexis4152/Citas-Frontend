import {
  AlertTriangle, Banknote, Building2, CalendarClock, CalendarX2, CheckCircle2, Clock3, Download, FileText, HeartPulse,
  Pencil, Stethoscope, Undo2, UserCheck, UserX,
} from 'lucide-react'
import {
  formatDate, formatDateOnly, formatTimeOnly, hoursOfNotice, formatHoursNotice, hasAppointmentOccurred,
  canMarkAppointmentCompleted, canMarkAppointmentNoShow, canRegisterArrival,
} from '../utils/format'
import { AppointmentBadges } from './StatusBadge'
import { formatMoney, hasPrice } from '../utils/money'
import { allergiesLabel, bloodTypeLabel } from './MedicalInfoFields'
import Drawer, { DetailRow, DrawerAction } from './Drawer'
import { Avatar } from './ui'

/** La hora de inicio ya pasó y el paciente no ha llegado ni se marcó otra cosa. */
export function isOverdueWithoutArrival(a) {
  if (!a || a.status !== 'SCHEDULED' || a.arrivedAt) return false
  const [y, m, d] = a.appointmentDate.split('-').map(Number)
  const [hh, mm] = a.startTime.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm) < new Date()
}

/**
 * Detalle de una cita en un panel lateral (antes era una tarjeta que aparecía abajo de la
 * agenda y pasaba desapercibida). Lo usan las agendas y las listas de citas: al hacer clic en
 * un registro se abre aquí, con TODAS sus acciones adentro. Cada acción aparece solo si el
 * caller pasa su handler y si aplica al estado de la cita (el backend igual lo valida).
 */
export default function AppointmentDetailCard({
  appointment, onClose, onDownload, onRelease, onCancel, onReschedule, onEditMedicalInfo, onMarkCompleted, onMarkNoShow,
  onGeneratePrescription, onMarkArrived, onCharge, onViewPatient, busyAction, showDoctor = true,
}) {
  if (!appointment) return null
  const a = appointment
  const patient = a.patient
  const patientName = patient ? `${patient.firstName} ${patient.lastName}`.trim() : '—'
  const busy = !!busyAction
  const overdue = isOverdueWithoutArrival(a)
  const hasAllergies = patient?.allergies && patient.allergies !== 'Ninguna'
  const canCharge = onCharge && (a.paymentStatus === 'UNPAID' || a.paymentStatus === 'PENDING')
    && (a.status === 'COMPLETED' || (a.status === 'SCHEDULED' && a.arrivedAt))

  const primary = []
  const secondary = []
  if (canCharge) primary.push(<DrawerAction key="charge" tone="primary" icon={Banknote} disabled={busy} onClick={onCharge}>Cobrar {hasPrice(a.price) ? formatMoney(a.price) : ''}</DrawerAction>)
  if (canRegisterArrival(a) && onMarkArrived) primary.push(<DrawerAction key="arrived" tone={primary.length ? 'secondary' : 'primary'} icon={UserCheck} disabled={busy} onClick={onMarkArrived}>{busyAction === 'arrived' ? 'Guardando...' : 'Registrar llegada'}</DrawerAction>)
  if (canMarkAppointmentCompleted(a) && onMarkCompleted) primary.push(<DrawerAction key="complete" tone={primary.length ? 'secondary' : 'primary'} icon={CheckCircle2} disabled={busy} onClick={onMarkCompleted}>{busyAction === 'complete' ? 'Guardando...' : a.status === 'NO_SHOW' ? 'Corregir a atendida' : 'Marcar atendida'}</DrawerAction>)
  if (a.status !== 'CANCELLED' && onGeneratePrescription && (hasAppointmentOccurred(a) || a.arrivedAt)) primary.push(<DrawerAction key="rx" tone="secondary" icon={FileText} disabled={busy} onClick={onGeneratePrescription}>Generar receta</DrawerAction>)
  if (canMarkAppointmentNoShow(a) && onMarkNoShow) secondary.push(<DrawerAction key="noshow" icon={UserX} disabled={busy} onClick={onMarkNoShow}>{busyAction === 'no-show' ? 'Guardando...' : 'No asistió'}</DrawerAction>)
  if (a.status === 'SCHEDULED' && onReschedule) secondary.push(<DrawerAction key="resched" icon={CalendarClock} disabled={busy} onClick={onReschedule}>Reprogramar</DrawerAction>)
  if (a.status === 'CANCELLED' && a.canRelease && onRelease) secondary.push(<DrawerAction key="release" icon={Undo2} disabled={busy} onClick={onRelease}>{busyAction === 'release' ? 'Liberando...' : 'Liberar horario'}</DrawerAction>)
  if (onDownload) secondary.push(<DrawerAction key="pdf" icon={Download} disabled={busy} onClick={onDownload}>{busyAction === 'download' ? 'Descargando...' : 'Comprobante'}</DrawerAction>)
  if (a.status === 'SCHEDULED' && onCancel) secondary.push(<DrawerAction key="cancel" tone="danger" icon={CalendarX2} disabled={busy} onClick={onCancel}>{busyAction === 'cancel' ? 'Cancelando...' : 'Cancelar cita'}</DrawerAction>)

  return (
    <Drawer open onClose={onClose} title="Detalle de la cita" subtitle={`Folio #${String(a.id).padStart(6, '0')}`}
      badges={<AppointmentBadges appointment={a} />}
      footer={(primary.length || secondary.length) ? (
        <div className="space-y-2">
          {primary.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{primary}</div>}
          {secondary.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{secondary}</div>}
        </div>
      ) : null}>
      {overdue && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-600/20">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>La hora de la cita ya pasó y no se ha registrado la llegada. Usa <strong>Registrar llegada</strong> si el paciente está aquí o <strong>No asistió</strong> si no vino.</p>
        </div>
      )}

      <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
        <Avatar first={patient?.firstName} last={patient?.lastName} size="h-12 w-12 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{patientName}</p>
          <p className="truncate text-sm text-slate-500">{[patient?.phone, patient?.email].filter(Boolean).join(' · ') || 'Sin datos de contacto'}</p>
        </div>
        {onViewPatient && <button className="btn-ghost btn-sm" onClick={onViewPatient}>Ver expediente</button>}
      </div>

      <div className="mt-4 divide-y divide-slate-100">
        <DetailRow icon={Clock3} label="Fecha y hora">
          <span className="font-semibold">{capitalize(formatDateOnly(a.appointmentDate))}</span>, {formatTimeOnly(a.startTime)} – {formatTimeOnly(a.endTime)}
        </DetailRow>
        {showDoctor && a.doctor && (
          <DetailRow icon={Stethoscope} label="Doctor">Dr(a). {a.doctor.firstName} {a.doctor.lastName}{a.doctor.specialty?.name ? ` · ${a.doctor.specialty.name}` : ''}</DetailRow>
        )}
        <DetailRow icon={Building2} label="Sede">{a.branch?.name || '—'}</DetailRow>
        <DetailRow icon={Banknote} label="Consulta">{hasPrice(a.price) ? formatMoney(a.price) : 'Precio por confirmar'}</DetailRow>
        <DetailRow icon={FileText} label="Motivo">{a.reasonForVisit || '—'}</DetailRow>
      </div>

      <div className={`mt-4 rounded-2xl p-4 ring-1 ring-inset ${hasAllergies ? 'bg-rose-50 ring-rose-600/20' : 'bg-slate-50 ring-slate-200'}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><HeartPulse className="h-4 w-4" /> Información médica</p>
          {onEditMedicalInfo && <button className="btn-ghost btn-sm" onClick={onEditMedicalInfo}><Pencil className="h-3.5 w-3.5" /> Editar</button>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-slate-500">Alergias</p><p className={`font-semibold ${hasAllergies ? 'text-rose-700' : 'text-slate-800'}`}>{allergiesLabel(patient)}</p></div>
          <div><p className="text-xs text-slate-500">Tipo de sangre</p><p className="font-semibold text-slate-800">{bloodTypeLabel(patient)}</p></div>
        </div>
      </div>

      {a.status === 'CANCELLED' && (
        <div className="mt-4 space-y-1.5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-inset ring-slate-200">
          <p><span className="font-semibold text-slate-800">Cancelada por</span> {a.cancelledByName || 'el paciente'}{a.cancelReason ? ` — ${a.cancelReason}` : ''}</p>
          {a.cancelledAt && <p className="text-xs text-slate-400">el {formatDate(a.cancelledAt)}</p>}
          {a.slotReleased && <p className="text-xs font-medium text-emerald-700">El horario quedó libre para otra persona.</p>}
          {!a.slotReleased && !a.releaseEligible && (
            <p className="text-xs text-amber-700">No se puede liberar: se canceló con {formatHoursNotice(hoursOfNotice(a))} de anticipación.</p>
          )}
        </div>
      )}
      {a.status !== 'CANCELLED' && onGeneratePrescription && !(hasAppointmentOccurred(a) || a.arrivedAt) && (
        <p className="mt-4 text-xs text-slate-400">Podrás generar la receta a partir de las {formatTimeOnly(a.startTime)}, cuando empiece la consulta.</p>
      )}
    </Drawer>
  )
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}
