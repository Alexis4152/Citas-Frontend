import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { searchOwnAppointments, cancelOwnAppointment, downloadOwnReceipt, rescheduleOwnAppointment } from '../api/appointments'
import { getSpecialties, searchDoctors } from '../api/publicCatalog'
import { getOwnPatient, updateOwnMedicalInfo } from '../api/patients'
import { useNotify } from '../context/NotifyContext'
import { downloadBlob } from '../utils/media'
import { formatDateOnly, formatTimeOnly } from '../utils/format'
import LoadingOverlay from '../components/LoadingOverlay'
import { AppointmentBadges } from '../components/StatusBadge'
import AppointmentDetailCard from '../components/AppointmentDetailCard'
import { ChevronRight } from 'lucide-react'
import RefundNotice from '../components/RefundNotice'
import { formatMoney, hasPrice } from '../utils/money'
import AdminPagination from '../components/AdminPagination'
import Modal from '../components/Modal'
import RescheduleSlotModal from '../components/RescheduleSlotModal'
import MedicalInfoFields, {
  EMPTY_MEDICAL_INFO, allergiesLabel, bloodTypeLabel, fromPatientResponse, toMedicalInfoPayload,
} from '../components/MedicalInfoFields'
import usePersistedState from '../hooks/usePersistedState'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

const EMPTY_FILTERS = { specialtyId: '', doctorId: '', from: '', to: '' }

export default function MyAppointments() {
  const { notify, confirmDialog } = useNotify()
  const location = useLocation()
  // Cuando se llega aquí desde una notificación de cancelación/reprogramación (ver
  // NotificationBell.jsx) -- Mis citas ya está scopeado a la cuenta propia, así que solo
  // hace falta resaltar/saltar al registro exacto, no filtrar nada.
  const highlightAppointmentId = location.state?.highlightAppointmentId

  const [upcoming, setUpcoming] = useState([])
  const [loadingUpcoming, setLoadingUpcoming] = useState(true)

  const [ownPatient, setOwnPatient] = useState(null)
  const [editingMedicalInfo, setEditingMedicalInfo] = useState(false)
  const [medicalInfoForm, setMedicalInfoForm] = useState(EMPTY_MEDICAL_INFO)
  const [savingMedicalInfo, setSavingMedicalInfo] = useState(false)

  const [specialties, setSpecialties] = useState([])
  const [doctors, setDoctors] = useState([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(0)
  const [size, setSize] = usePersistedState('my-appointments-page-size', 10)
  const [result, setResult] = useState({ content: [], page: 0, totalPages: 0, totalElements: 0 })
  const [loadingHistory, setLoadingHistory] = useState(true)

  // Evita doble envío si el usuario da doble clic en "Cancelar"/"Comprobante" mientras la
  // petición sigue en curso: cada fila guarda su propia llave de acción en curso.
  const [busyKey, setBusyKey] = useState(null)

  // Cita que el paciente está reprogramando (abre el selector de horarios del mismo doctor).
  const [rescheduling, setRescheduling] = useState(null)
  // Cita pagada por anticipado que se está por cancelar: se avisa la política de reembolso antes.
  const [cancelPaid, setCancelPaid] = useState(null)
  const [savingReschedule, setSavingReschedule] = useState(false)
  // Cita abierta en el panel de detalle (ahí están Comprobante, Reprogramar y Cancelar).
  const [selected, setSelected] = useState(null)

  function loadUpcoming() {
    setLoadingUpcoming(true)
    searchOwnAppointments({ status: 'SCHEDULED', from: todayIso(), size: 100 })
      .then((r) => setUpcoming(r.data.data.content))
      .finally(() => setLoadingUpcoming(false))
  }

  function loadHistory() {
    setLoadingHistory(true)
    searchOwnAppointments({
      specialtyId: filters.specialtyId || undefined,
      doctorId: filters.doctorId || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      page, size,
    }).then((r) => setResult(r.data.data)).finally(() => setLoadingHistory(false))
  }

  useEffect(() => { loadUpcoming() }, [])
  useEffect(() => { loadHistory() }, [page, size, filters.specialtyId, filters.doctorId, filters.from, filters.to])
  useEffect(() => { getOwnPatient().then((r) => setOwnPatient(r.data.data)).catch(() => {}) }, [])

  useEffect(() => {
    getSpecialties().then((r) => setSpecialties(r.data.data)).catch(() => {})
  }, [])

  // Especialidad acota el selector de doctor -- mismo patrón cascada que ReceptionDoctorAgenda.jsx.
  useEffect(() => {
    searchDoctors({ specialtyId: filters.specialtyId || undefined, page: 0, size: 200 })
      .then((r) => {
        const list = r.data.data.content
        setDoctors(list)
        setFilters((f) => (f.doctorId && !list.some((d) => String(d.id) === String(f.doctorId)) ? { ...f, doctorId: '' } : f))
      })
      .catch(() => {})
  }, [filters.specialtyId])

  useEffect(() => {
    if (!highlightAppointmentId) return
    document.getElementById(`appointment-card-${highlightAppointmentId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcoming, result])

  function updateFilter(field, value) {
    setFilters((f) => ({ ...f, [field]: value }))
    setPage(0)
  }

  function handleClearFilters() {
    setFilters(EMPTY_FILTERS)
    setPage(0)
  }

  const hasActiveFilters = Object.values(filters).some((v) => !!v)

  function reloadAll() {
    loadUpcoming()
    loadHistory()
  }

  async function handleCancel(id) {
    const target = [...upcoming, ...result.content].find((a) => a.id === id)
    if (target?.paymentStatus === 'PAID') {
      setCancelPaid(target)
      return
    }
    const ok = await confirmDialog('¿Cancelar esta cita? Si cancelas con menos de 24 horas de anticipación, el espacio no podrá liberarse de inmediato.', { confirmText: 'Cancelar cita' })
    if (!ok) return
    await runCancel(id)
  }

  async function runCancel(id) {
    const key = `cancel-${id}`
    setBusyKey(key)
    try {
      await cancelOwnAppointment(id)
      notify('Cita cancelada', 'success')
      reloadAll()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo cancelar la cita', 'error')
    } finally {
      setBusyKey((k) => (k === key ? null : k))
    }
  }

  async function handleReschedule(date, startTime) {
    setSavingReschedule(true)
    try {
      await rescheduleOwnAppointment(rescheduling.id, { appointmentDate: date, startTime })
      notify('Cita reprogramada correctamente', 'success')
      setRescheduling(null)
      reloadAll()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo reprogramar la cita', 'error')
    } finally {
      setSavingReschedule(false)
    }
  }

  async function handleDownloadReceipt(id) {
    const key = `download-${id}`
    setBusyKey(key)
    try {
      const res = await downloadOwnReceipt(id)
      downloadBlob(res.data, `comprobante-cita-${id}.pdf`)
    } catch {
      notify('No se pudo descargar el comprobante', 'error')
    } finally {
      setBusyKey((k) => (k === key ? null : k))
    }
  }

  function openEditMedicalInfo() {
    setMedicalInfoForm(fromPatientResponse(ownPatient))
    setEditingMedicalInfo(true)
  }

  async function handleSaveMedicalInfo(e) {
    e.preventDefault()
    setSavingMedicalInfo(true)
    try {
      const res = await updateOwnMedicalInfo(toMedicalInfoPayload(medicalInfoForm))
      setOwnPatient(res.data.data)
      setEditingMedicalInfo(false)
      notify('Información médica actualizada', 'success')
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar', 'error')
    } finally {
      setSavingMedicalInfo(false)
    }
  }

  return (
    <div className="container-app py-8 sm:py-10">
      <LoadingOverlay show={!!busyKey && busyKey.startsWith('cancel-')} message="Cancelando tu cita..." />
      <LoadingOverlay show={!!busyKey && busyKey.startsWith('download-')} message="Generando comprobante..." />
      <h1 className="page-title mb-6">Mis citas</h1>

      {ownPatient && (
        <div className="card p-4 mb-6 flex items-start justify-between gap-3 flex-wrap">
          <div className="text-sm text-gray-700">
            <p className="font-semibold text-gray-900 mb-1">Mi información médica</p>
            <p><span className="font-medium">Alergias:</span> {allergiesLabel(ownPatient)}</p>
            <p><span className="font-medium">Tipo de sangre:</span> {bloodTypeLabel(ownPatient)}</p>
          </div>
          <button onClick={openEditMedicalInfo} className="btn-secondary text-sm shrink-0">Editar</button>
        </div>
      )}

      <div className="space-y-10">
        <section>
          <h2 className="font-semibold text-gray-800 mb-3">Próximas</h2>
          {loadingUpcoming ? (
            <p className="text-sm text-gray-500">Cargando...</p>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-gray-400">No tienes citas próximas.</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((a) => (
                <AppointmentCard key={a.id} a={a} onOpen={() => setSelected(a)} highlighted={String(a.id) === String(highlightAppointmentId)} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-semibold text-gray-800 mb-3">Historial</h2>

          <div className="card p-4 mb-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[160px]">
              <label className="text-xs font-medium text-gray-600 block mb-1">Especialidad</label>
              <select className="input" value={filters.specialtyId} onChange={(e) => updateFilter('specialtyId', e.target.value)}>
                <option value="">Todas</option>
                {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="min-w-[200px]">
              <label className="text-xs font-medium text-gray-600 block mb-1">Doctor</label>
              <select className="input" value={filters.doctorId} onChange={(e) => updateFilter('doctorId', e.target.value)}>
                <option value="">Todos</option>
                {doctors.map((d) => <option key={d.id} value={d.id}>Dr(a). {d.firstName} {d.lastName}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Desde</label>
              <input type="date" className="input" value={filters.from} onChange={(e) => updateFilter('from', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Hasta</label>
              <input type="date" className="input" value={filters.to} onChange={(e) => updateFilter('to', e.target.value)} />
            </div>
            {hasActiveFilters && (
              <button type="button" className="btn-secondary text-sm" onClick={handleClearFilters}>Limpiar</button>
            )}
          </div>

          {loadingHistory ? (
            <p className="text-sm text-gray-500">Cargando...</p>
          ) : result.content.length === 0 ? (
            <p className="text-sm text-gray-400">Sin citas en el historial.</p>
          ) : (
            <div className="space-y-3">
              {result.content.map((a) => (
                <AppointmentCard key={a.id} a={a} onOpen={() => setSelected(a)} highlighted={String(a.id) === String(highlightAppointmentId)} />
              ))}
            </div>
          )}

          <div className="card p-0 mt-3">
            <AdminPagination
              page={result.page} size={size} totalPages={result.totalPages} totalElements={result.totalElements}
              contentLength={result.content.length}
              onPageChange={setPage} onSizeChange={(s) => { setSize(s); setPage(0) }}
            />
          </div>
        </section>
      </div>

      {selected && (
        <AppointmentDetailCard appointment={selected} onClose={() => setSelected(null)}
          busyAction={busyKey === `download-${selected.id}` ? 'download' : busyKey === `cancel-${selected.id}` ? 'cancel' : null}
          onDownload={() => handleDownloadReceipt(selected.id)}
          onReschedule={() => { setRescheduling(selected); setSelected(null) }}
          onCancel={() => { const id = selected.id; setSelected(null); handleCancel(id) }} />
      )}

      {cancelPaid && (
        <Modal title="Cancelar cita pagada" onClose={() => setCancelPaid(null)} maxWidth="max-w-md">
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Dr(a). {cancelPaid.doctor?.firstName} {cancelPaid.doctor?.lastName} · <span className="capitalize">{formatDateOnly(cancelPaid.appointmentDate)}, {formatTimeOnly(cancelPaid.startTime)}</span>
            </p>
            <RefundNotice />
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" className="btn-secondary" onClick={() => setCancelPaid(null)}>Conservar mi cita</button>
              <button type="button" className="btn-danger" onClick={() => { const id = cancelPaid.id; setCancelPaid(null); runCancel(id) }}>Cancelar cita</button>
            </div>
          </div>
        </Modal>
      )}

      {rescheduling && (
        <RescheduleSlotModal
          doctor={rescheduling.doctor}
          hint="Puedes cambiar tu cita por tu cuenta si faltan al menos 24 horas; después, comunícate con el hospital."
          saving={savingReschedule}
          onClose={() => setRescheduling(null)}
          onConfirm={handleReschedule}
        />
      )}

      {editingMedicalInfo && (
        <Modal title="Editar mi información médica" onClose={() => setEditingMedicalInfo(false)} maxWidth="max-w-sm">
          <form onSubmit={handleSaveMedicalInfo} className="space-y-4">
            <MedicalInfoFields value={medicalInfoForm} onChange={setMedicalInfoForm} idPrefix="my-medical-info" />
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" className="btn-secondary" onClick={() => setEditingMedicalInfo(false)}>Cancelar</button>
              <button type="submit" disabled={savingMedicalInfo} className="btn-primary">{savingMedicalInfo ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function AppointmentCard({ a, onOpen, highlighted }) {
  return (
    <button
      id={`appointment-card-${a.id}`}
      onClick={onOpen}
      className={`card card-hover group flex w-full flex-col gap-3 p-4 text-left sm:flex-row sm:items-center ${
        highlighted ? 'ring-2 ring-primary-300 bg-primary-50/40' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900">Dr(a). {a.doctor?.firstName} {a.doctor?.lastName} — {a.doctor?.specialty?.name}</p>
        <p className="text-sm capitalize text-slate-500">{formatDateOnly(a.appointmentDate)}, {formatTimeOnly(a.startTime)} · {a.branch?.name}</p>
        {a.reasonForVisit && <p className="mt-1 truncate text-xs text-slate-400">{a.reasonForVisit}</p>}
        {hasPrice(a.price) && <p className="mt-1 text-xs text-slate-500">Consulta: <span className="font-medium text-slate-700">{formatMoney(a.price)}</span></p>}
      </div>
      <div className="flex items-center gap-2">
        <AppointmentBadges appointment={a} showOverdue={false} />
        <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:text-primary-600" />
      </div>
    </button>
  )
}
