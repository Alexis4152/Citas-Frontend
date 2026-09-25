import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  searchAppointments, cancelAppointment, releaseAppointmentSlot, downloadAppointmentReceipt,
  markAppointmentCompleted, markAppointmentNoShow, markAppointmentArrived,
} from '../../api/reception'
import { searchDoctors, getSpecialties, getBranches } from '../../api/publicCatalog'
import { useAuth } from '../../context/AuthContext'
import { useNotify } from '../../context/NotifyContext'
import AvailabilityCalendar from '../../components/AvailabilityCalendar'
import AppointmentDetailCard from '../../components/AppointmentDetailCard'
import ChargeModal from '../../components/ChargeModal'
import LoadingOverlay from '../../components/LoadingOverlay'
import { downloadBlob } from '../../utils/media'
import { formatDateOnly } from '../../utils/format'
import usePersistedState from '../../hooks/usePersistedState'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * Agenda semanal de CUALQUIER doctor, vista desde recepción -- mismo componente
 * AvailabilityCalendar (mode="agenda") que usa DoctorAgenda.jsx para el doctor mismo, pero
 * aquí se elige el doctor primero y las citas se traen vía /api/reception/appointments
 * (doctorId + rango de fechas), que no está restringido a "mis citas" como el endpoint del
 * doctor. Sirve sobre todo para que recepción libere el espacio de una cita cancelada de
 * cualquier doctor sin tener que pedirle a él que entre a hacerlo.
 */
export default function ReceptionDoctorAgenda() {
  const { notify, confirmDialog } = useNotify()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  // null = recepcionista general (o admin), sin restricción. Ver ReceptionNewAppointment.jsx.
  const allowedSpecialtyIds = user?.specialties?.length ? new Set(user.specialties.map((s) => s.id)) : null
  const [specialties, setSpecialties] = useState([])
  const [branches, setBranches] = useState([])
  const [specialtyId, setSpecialtyId] = useState('')
  const [branchId, setBranchId] = useState('')
  const [doctors, setDoctors] = useState([])
  const [doctorId, setDoctorId] = usePersistedState('reception-doctor-agenda-doctor-id', '')
  const [weekStart, setWeekStart] = useState(todayIso())
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  // Evita doble clic en Cancelar/Liberar/Comprobante del detalle mientras la petición está en curso.
  const [busyAction, setBusyAction] = useState(null)

  const weekEnd = addDays(weekStart, 6)
  const selectedDoctor = doctors.find((d) => String(d.id) === String(doctorId))

  useEffect(() => {
    getSpecialties().then((r) => {
      const list = r.data.data
      setSpecialties(allowedSpecialtyIds ? list.filter((s) => allowedSpecialtyIds.has(s.id)) : list)
    }).catch(() => {})
    getBranches().then((r) => setBranches(r.data.data)).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Llegada desde el botón "Ver agenda" de AdminDoctorDetail (?doctorId=X): preselecciona
  // ese doctor, por encima de lo que haya quedado guardado de una visita anterior.
  useEffect(() => {
    const fromUrl = searchParams.get('doctorId')
    if (fromUrl) setDoctorId(fromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Especialidad/sede acotan la lista de doctores -- con 20+ doctores un solo select plano
  // era imposible de navegar. Si el doctor ya elegido deja de aparecer en la lista filtrada,
  // se limpia la selección para no dejar un doctorId "fantasma" fuera de lo visible.
  useEffect(() => {
    searchDoctors({ specialtyId: specialtyId || undefined, branchId: branchId || undefined, page: 0, size: 200 })
      .then((r) => {
        const raw = r.data.data.content
        const list = allowedSpecialtyIds ? raw.filter((d) => allowedSpecialtyIds.has(d.specialty?.id)) : raw
        setDoctors(list)
        setDoctorId((current) => (current && !list.some((d) => String(d.id) === String(current)) ? '' : current))
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialtyId, branchId])

  function load() {
    if (!doctorId) {
      setAppointments([])
      return
    }
    setLoading(true)
    searchAppointments({ doctorId, from: weekStart, to: weekEnd, size: 200 })
      .then((r) => setAppointments(r.data.data.content))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(); setSelected(null) }, [doctorId, weekStart])

  const dateList = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const days = dateList.map((date) => ({
    date,
    slots: appointments
      .filter((a) => a.appointmentDate === date)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((a) => ({ startTime: a.startTime, endTime: a.endTime, appointment: a })),
  }))

  function handleSlotClick(date, slot) {
    setSelected(slot.appointment)
  }

  async function handleCancel(id) {
    const ok = await confirmDialog('¿Cancelar esta cita?', { confirmText: 'Cancelar cita' })
    if (!ok) return
    setBusyAction('cancel')
    try {
      await cancelAppointment(id)
      notify('Cita cancelada', 'success')
      setSelected(null)
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo cancelar la cita', 'error')
    } finally {
      setBusyAction(null)
    }
  }

  async function handleRelease(id) {
    const ok = await confirmDialog('¿Liberar este horario? El espacio quedará disponible de nuevo para agendar.', { confirmText: 'Liberar horario' })
    if (!ok) return
    setBusyAction('release')
    try {
      await releaseAppointmentSlot(id)
      notify('Espacio liberado correctamente', 'success')
      setSelected(null)
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo liberar el espacio', 'error')
    } finally {
      setBusyAction(null)
    }
  }

  async function handleDownloadReceipt(id) {
    setBusyAction('download')
    try {
      const res = await downloadAppointmentReceipt(id)
      downloadBlob(res.data, `comprobante-cita-${id}.pdf`)
    } catch {
      notify('No se pudo descargar el comprobante', 'error')
    } finally {
      setBusyAction(null)
    }
  }

  const [charging, setCharging] = useState(null)

  async function handleMarkCompleted(id) {
    const ok = await confirmDialog('¿Marcar esta cita como atendida?', { confirmText: 'Marcar atendida' })
    if (!ok) return
    setBusyAction('complete')
    try {
      const res = await markAppointmentCompleted(id)
      notify('Cita marcada como atendida', 'success')
      setSelected(null)
      load()
      // Al marcar "atendida" se abre el cobro (si la cita no está ya pagada por anticipado).
      if (res.data.data.paymentStatus !== 'PAID') setCharging(res.data.data)
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo marcar', 'error')
    } finally {
      setBusyAction(null)
    }
  }

  async function handleMarkArrived(id) {
    setBusyAction('arrived')
    try {
      await markAppointmentArrived(id)
      notify('Llegada del paciente registrada', 'success')
      setSelected(null)
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo registrar la llegada', 'error')
    } finally {
      setBusyAction(null)
    }
  }

  async function handleMarkNoShow(id) {
    const ok = await confirmDialog('¿Marcar esta cita como no asistió?', { confirmText: 'Marcar no asistió' })
    if (!ok) return
    setBusyAction('no-show')
    try {
      await markAppointmentNoShow(id)
      notify('Cita marcada como no asistió', 'success')
      setSelected(null)
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo marcar', 'error')
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div>
      <LoadingOverlay show={busyAction === 'cancel'} message="Cancelando la cita..." />
      <LoadingOverlay show={busyAction === 'release'} message="Liberando el espacio..." />
      <LoadingOverlay show={busyAction === 'download'} message="Generando comprobante..." />
      <LoadingOverlay show={busyAction === 'complete'} message="Guardando..." />
      <LoadingOverlay show={busyAction === 'no-show'} message="Guardando..." />

      {/* Solo cuando se llega aquí con ?doctorId= (botón "Ver agenda" de AdminDoctorDetail) --
          la entrada normal por el menú lateral no tiene una pantalla "anterior" a la que
          volver. navigate(-1) regresa exactamente a la pestaña de la que se vino, con su
          estado (filtros, scroll) intacto, en vez de fijar un destino a mano. */}
      {searchParams.get('doctorId') && (
        <button type="button" onClick={() => navigate(-1)} className="text-sm text-primary-700 hover:underline mb-3 block">
          ‹ Volver
        </button>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Agenda doctores</h1>
        <p className="text-sm text-gray-500 mt-1">
          {allowedSpecialtyIds
            ? `Consulta la agenda semanal de doctores de: ${user.specialties.map((s) => s.name).join(', ')}.`
            : 'Consulta la agenda semanal de cualquier doctor y libera el espacio de una cita cancelada.'}
        </p>
      </div>

      <div className="card p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[180px]">
          <label className="text-xs font-medium text-gray-600 block mb-1">Especialidad</label>
          <select className="input" value={specialtyId} onChange={(e) => setSpecialtyId(e.target.value)}>
            <option value="">Todas</option>
            {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="min-w-[160px]">
          <label className="text-xs font-medium text-gray-600 block mb-1">Sede</label>
          <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">Todas</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="min-w-[260px]">
          <label className="text-xs font-medium text-gray-600 block mb-1">Doctor</label>
          <select className="input" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            <option value="">Selecciona un doctor...</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>Dr(a). {d.firstName} {d.lastName} — {d.specialty?.name}</option>
            ))}
          </select>
          {(specialtyId || branchId) && doctors.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">Sin doctores para ese filtro.</p>
          )}
        </div>
        {doctorId && (
          <div className="flex items-center gap-2 text-sm ml-auto">
            <button className="btn-secondary py-1 px-3" onClick={() => setWeekStart(addDays(weekStart, -7))}>‹ Semana anterior</button>
            <span className="text-gray-600 capitalize">{formatDateOnly(weekStart)} – {formatDateOnly(weekEnd)}</span>
            <button className="btn-secondary py-1 px-3" onClick={() => setWeekStart(addDays(weekStart, 7))}>Semana siguiente ›</button>
          </div>
        )}
      </div>

      {!doctorId ? (
        <div className="card p-10 text-center text-gray-400 text-sm">Selecciona un doctor para ver su agenda.</div>
      ) : (
        <div className="card p-6">
          {selectedDoctor && (
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pb-4 border-b border-gray-100">
              <div>
                <p className="font-semibold text-gray-900">Dr(a). {selectedDoctor.firstName} {selectedDoctor.lastName}</p>
                <p className="text-sm text-gray-500">{selectedDoctor.specialty?.name} · {selectedDoctor.branches?.map((b) => b.name).join(' · ') || 'Sin sede asignada'}</p>
              </div>
            </div>
          )}
          <AvailabilityCalendar days={days} mode="agenda" loading={loading} onSlotClick={handleSlotClick} />
        </div>
      )}

      <AppointmentDetailCard
        appointment={selected}
        onClose={() => setSelected(null)}
        onDownload={() => handleDownloadReceipt(selected.id)}
        onRelease={() => handleRelease(selected.id)}
        onCancel={() => handleCancel(selected.id)}
        onMarkNoShow={() => handleMarkNoShow(selected.id)}
        onMarkCompleted={() => handleMarkCompleted(selected.id)}
        onMarkArrived={() => handleMarkArrived(selected.id)}
        onCharge={() => setCharging(selected)}
        busyAction={busyAction}
      />

      {charging && (
        <ChargeModal appointment={charging} onClose={() => setCharging(null)} onPaid={() => { setCharging(null); setSelected(null); load() }} />
      )}
    </div>
  )
}
