import { useEffect, useState } from 'react'
import {
  getOwnProfile, searchOwnAppointments, cancelOwnAppointment, releaseSlot, downloadAppointmentReceipt,
  rescheduleOwnAppointment, markAppointmentCompleted, markAppointmentNoShow, markAppointmentArrived,
} from '../../api/doctorPortal'
import { useNotify } from '../../context/NotifyContext'
import { downloadBlob } from '../../utils/media'
import {
  formatDateOnly, formatTimeOnly, canMarkAppointmentCompleted, canMarkAppointmentNoShow, canRegisterArrival,
} from '../../utils/format'
import AdminPagination from '../../components/AdminPagination'
import LoadingOverlay from '../../components/LoadingOverlay'
import StatusBadge, { STATUS_LABELS, AppointmentFlags, PaymentBadge } from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import usePolling from '../../hooks/usePolling'
import usePersistedState from '../../hooks/usePersistedState'
import useDebouncedValue from '../../hooks/useDebouncedValue'

const EMPTY_FILTERS = { branchId: '', from: '', to: '', status: '', patientQuery: '' }
const STATUS_OPTIONS = ['SCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']

/**
 * Lista de "Mis citas" del doctor -- a diferencia de "Mi agenda" (calendario semanal), esta
 * es la vista tipo tabla con filtros y paginación, mismo lenguaje visual que Citas de
 * recepción (ReceptionAppointments.jsx) pero sin selector de doctor (siempre son las propias)
 * ni agrupado por especialidad (no hace falta con un solo doctor).
 */
export default function DoctorMyAppointments() {
  const { notify, confirmDialog } = useNotify()
  const [branches, setBranches] = useState([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const debouncedPatientQuery = useDebouncedValue(filters.patientQuery, 400)
  const [page, setPage] = useState(0)
  const [size, setSize] = usePersistedState('doctor-my-appointments-page-size', 20)
  const [result, setResult] = useState({ content: [], page: 0, totalPages: 0, totalElements: 0 })
  const [loading, setLoading] = useState(true)
  // Evita doble clic en Cancelar/Liberar/Comprobante de una fila mientras la petición está en curso.
  const [busyKey, setBusyKey] = useState(null)
  const [rescheduling, setRescheduling] = useState(null)

  function load() {
    setLoading(true)
    searchOwnAppointments({
      branchId: filters.branchId || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      status: filters.status || undefined,
      patientQuery: debouncedPatientQuery || undefined,
      page, size,
    }).then((r) => setResult(r.data.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page, size, filters.branchId, filters.from, filters.to, filters.status, debouncedPatientQuery])
  usePolling(load, 30000)
  useEffect(() => { setPage(0) }, [debouncedPatientQuery])

  useEffect(() => {
    getOwnProfile().then((r) => setBranches(r.data.data.branches || [])).catch(() => {})
  }, [])

  function updateFilter(field, value) {
    setFilters((f) => ({ ...f, [field]: value }))
    if (field !== 'patientQuery') setPage(0)
  }

  function handleClearFilters() {
    setFilters(EMPTY_FILTERS)
    setPage(0)
  }

  const hasActiveFilters = Object.values(filters).some((v) => !!v)

  async function handleCancel(id) {
    const ok = await confirmDialog('¿Cancelar esta cita?', { confirmText: 'Cancelar cita' })
    if (!ok) return
    const key = `cancel-${id}`
    setBusyKey(key)
    try {
      await cancelOwnAppointment(id)
      notify('Cita cancelada', 'success')
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo cancelar', 'error')
    } finally {
      setBusyKey((k) => (k === key ? null : k))
    }
  }

  async function handleRelease(id) {
    const ok = await confirmDialog('¿Liberar este horario? El espacio quedará disponible de nuevo para agendar.', { confirmText: 'Liberar horario' })
    if (!ok) return
    const key = `release-${id}`
    setBusyKey(key)
    try {
      await releaseSlot(id)
      notify('Espacio liberado correctamente', 'success')
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo liberar el espacio', 'error')
    } finally {
      setBusyKey((k) => (k === key ? null : k))
    }
  }

  async function handleDownloadReceipt(id) {
    const key = `download-${id}`
    setBusyKey(key)
    try {
      const res = await downloadAppointmentReceipt(id)
      downloadBlob(res.data, `comprobante-cita-${id}.pdf`)
    } catch {
      notify('No se pudo descargar el comprobante', 'error')
    } finally {
      setBusyKey((k) => (k === key ? null : k))
    }
  }

  async function handleMarkCompleted(id) {
    const ok = await confirmDialog('¿Marcar esta cita como atendida?', { confirmText: 'Marcar atendida' })
    if (!ok) return
    const key = `complete-${id}`
    setBusyKey(key)
    try {
      await markAppointmentCompleted(id)
      notify('Cita marcada como atendida', 'success')
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo marcar', 'error')
    } finally {
      setBusyKey((k) => (k === key ? null : k))
    }
  }

  async function handleArrived(id) {
    const key = `arrived-${id}`
    setBusyKey(key)
    try {
      await markAppointmentArrived(id)
      notify('Llegada del paciente registrada', 'success')
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo registrar la llegada', 'error')
    } finally {
      setBusyKey((k) => (k === key ? null : k))
    }
  }

  async function handleMarkNoShow(id) {
    const ok = await confirmDialog('¿Marcar esta cita como no asistió?', { confirmText: 'Marcar no asistió' })
    if (!ok) return
    const key = `no-show-${id}`
    setBusyKey(key)
    try {
      await markAppointmentNoShow(id)
      notify('Cita marcada como no asistió', 'success')
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo marcar', 'error')
    } finally {
      setBusyKey((k) => (k === key ? null : k))
    }
  }

  return (
    <div>
      <LoadingOverlay show={!!busyKey && busyKey.startsWith('cancel-')} message="Cancelando la cita..." />
      <LoadingOverlay show={!!busyKey && busyKey.startsWith('release-')} message="Liberando el espacio..." />
      <LoadingOverlay show={!!busyKey && busyKey.startsWith('download-')} message="Generando comprobante..." />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mis citas</h1>

      <div className="card p-4 mb-4 flex flex-wrap items-end gap-3">
        {branches.length > 1 && (
          <div className="min-w-[160px]">
            <label className="text-xs font-medium text-gray-600 block mb-1">Sede</label>
            <select className="input" value={filters.branchId} onChange={(e) => updateFilter('branchId', e.target.value)}>
              <option value="">Todas</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Desde</label>
          <input type="date" className="input" value={filters.from} onChange={(e) => updateFilter('from', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Hasta</label>
          <input type="date" className="input" value={filters.to} onChange={(e) => updateFilter('to', e.target.value)} />
        </div>
        <div className="min-w-[140px]">
          <label className="text-xs font-medium text-gray-600 block mb-1">Estado</label>
          <select className="input" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
            <option value="">Todos</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div className="min-w-[180px]">
          <label className="text-xs font-medium text-gray-600 block mb-1">Paciente (nombre o teléfono)</label>
          <input className="input" value={filters.patientQuery} onChange={(e) => updateFilter('patientQuery', e.target.value)} />
        </div>
        {hasActiveFilters && (
          <button type="button" className="btn-secondary text-sm" onClick={handleClearFilters}>Limpiar</button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <p className="text-gray-500 text-sm p-4">Cargando...</p>
        ) : (
          <>
            {(() => {
              const renderActions = (a) => (
                <>
                  <button
                    onClick={() => handleDownloadReceipt(a.id)}
                    disabled={busyKey === `download-${a.id}`}
                    className="text-primary-700 hover:underline mr-3 disabled:opacity-50 disabled:no-underline"
                  >
                    {busyKey === `download-${a.id}` ? 'Descargando...' : 'Comprobante'}
                  </button>
                  {a.status === 'SCHEDULED' && (
                    <>
                      <button onClick={() => setRescheduling(a)} className="text-primary-700 hover:underline mr-3">
                        Reprogramar
                      </button>
                      <button
                        onClick={() => handleCancel(a.id)}
                        disabled={busyKey === `cancel-${a.id}`}
                        className="text-red-600 hover:underline mr-3 disabled:opacity-50 disabled:no-underline"
                      >
                        {busyKey === `cancel-${a.id}` ? 'Cancelando...' : 'Cancelar'}
                      </button>
                    </>
                  )}
                  {a.status === 'CANCELLED' && a.canRelease && (
                    <button
                      onClick={() => handleRelease(a.id)}
                      disabled={busyKey === `release-${a.id}`}
                      className="text-primary-700 hover:underline disabled:opacity-50 disabled:no-underline"
                    >
                      {busyKey === `release-${a.id}` ? 'Liberando...' : 'Liberar horario'}
                    </button>
                  )}
                  {canRegisterArrival(a) && (
                    <button
                      onClick={() => handleArrived(a.id)}
                      disabled={busyKey === `arrived-${a.id}`}
                      className="text-emerald-700 hover:underline mr-3 disabled:opacity-50 disabled:no-underline"
                    >
                      {busyKey === `arrived-${a.id}` ? 'Guardando...' : 'Llegó'}
                    </button>
                  )}
                  {canMarkAppointmentCompleted(a) && (
                    <button
                      onClick={() => handleMarkCompleted(a.id)}
                      disabled={busyKey === `complete-${a.id}`}
                      className="text-green-700 hover:underline mr-3 disabled:opacity-50 disabled:no-underline"
                    >
                      {busyKey === `complete-${a.id}` ? 'Guardando...' : a.status === 'NO_SHOW' ? 'Corregir a atendida' : 'Marcar atendida'}
                    </button>
                  )}
                  {canMarkAppointmentNoShow(a) && (
                    <button
                      onClick={() => handleMarkNoShow(a.id)}
                      disabled={busyKey === `no-show-${a.id}`}
                      className="text-gray-600 hover:underline disabled:opacity-50 disabled:no-underline"
                    >
                      {busyKey === `no-show-${a.id}` ? 'Guardando...' : 'No asistió'}
                    </button>
                  )}
                </>
              )
              return (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-left text-gray-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">Paciente</th>
                          <th className="px-4 py-3 font-medium">Fecha</th>
                          <th className="px-4 py-3 font-medium">Sede</th>
                          <th className="px-4 py-3 font-medium">Estado</th>
                          <th className="px-4 py-3 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.content.map((a) => (
                          <tr key={a.id} className="border-t border-gray-100">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">{a.patient?.firstName} {a.patient?.lastName}</p>
                              <p className="text-xs text-gray-500">{a.patient?.phone}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-600 capitalize">{formatDateOnly(a.appointmentDate)}, {formatTimeOnly(a.startTime)}</td>
                            <td className="px-4 py-3 text-gray-600">{a.branch?.name}</td>
                            <td className="px-4 py-3"><StatusBadge status={a.status} /><AppointmentFlags appointment={a} /><PaymentBadge appointment={a} /></td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">{renderActions(a)}</td>
                          </tr>
                        ))}
                        {result.content.length === 0 && (
                          <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin citas</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:hidden divide-y divide-gray-100">
                    {result.content.map((a) => (
                      <div key={a.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-gray-900">{a.patient?.firstName} {a.patient?.lastName}</p>
                            <p className="text-xs text-gray-500">{a.patient?.phone}</p>
                          </div>
                          <StatusBadge status={a.status} /><AppointmentFlags appointment={a} /><PaymentBadge appointment={a} />
                        </div>
                        <p className="text-sm text-gray-500 capitalize mt-1">{formatDateOnly(a.appointmentDate)}, {formatTimeOnly(a.startTime)} · {a.branch?.name}</p>
                        <div className="flex flex-wrap items-center gap-x-1 mt-2 text-sm">{renderActions(a)}</div>
                      </div>
                    ))}
                    {result.content.length === 0 && (
                      <p className="px-4 py-8 text-center text-gray-400 text-sm">Sin citas</p>
                    )}
                  </div>
                </>
              )
            })()}
          </>
        )}
        <AdminPagination
          page={result.page} size={size} totalPages={result.totalPages} totalElements={result.totalElements}
          contentLength={result.content.length}
          onPageChange={setPage} onSizeChange={(s) => { setSize(s); setPage(0) }}
        />
      </div>

      {rescheduling && (
        <RescheduleModal
          appointment={rescheduling}
          branches={branches}
          onClose={() => setRescheduling(null)}
          onSaved={() => { setRescheduling(null); load() }}
        />
      )}
    </div>
  )
}

function RescheduleModal({ appointment, branches, onClose, onSaved }) {
  const { notify } = useNotify()
  const [appointmentDate, setAppointmentDate] = useState(appointment.appointmentDate)
  const [startTime, setStartTime] = useState(appointment.startTime.slice(0, 5))
  const [branchId, setBranchId] = useState(String(appointment.branch?.id || ''))
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await rescheduleOwnAppointment(appointment.id, { appointmentDate, startTime, branchId: branchId ? Number(branchId) : undefined })
      notify('Cita reprogramada correctamente', 'success')
      onSaved()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo reprogramar la cita', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Reprogramar cita" onClose={onClose}>
      <LoadingOverlay show={saving} message="Reprogramando la cita..." />
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className="block text-gray-700 mb-1 font-medium">Nueva fecha</span>
          <input required type="date" className="input" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="block text-gray-700 mb-1 font-medium">Nueva hora</span>
          <input required type="time" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </label>
        {branches.length > 1 && (
          <label className="block text-sm">
            <span className="block text-gray-700 mb-1 font-medium">Sede</span>
            <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
        )}
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Reprogramar'}</button>
        </div>
      </form>
    </Modal>
  )
}
