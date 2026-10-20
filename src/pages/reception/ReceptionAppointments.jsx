import { useEffect, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import {
  searchAppointments, cancelAppointment, rescheduleAppointment, downloadAppointmentReceipt,
  markAppointmentCompleted, markAppointmentNoShow, markAppointmentArrived, releaseAppointmentSlot,
} from '../../api/reception'
import { getBranches, searchDoctors } from '../../api/publicCatalog'
import { useAuth } from '../../context/AuthContext'
import { useNotify } from '../../context/NotifyContext'
import { downloadBlob } from '../../utils/media'
import {
  formatDateOnly, formatTimeOnly,
} from '../../utils/format'
import AdminPagination from '../../components/AdminPagination'
import LoadingOverlay from '../../components/LoadingOverlay'
import { STATUS_LABELS, AppointmentBadges } from '../../components/StatusBadge'
import ChargeModal from '../../components/ChargeModal'
import AppointmentDetailCard from '../../components/AppointmentDetailCard'
import { ChevronRight } from 'lucide-react'
import { useNavigate as useHospitalNavigate } from '../../router'
import { staffBasePath } from '../../utils/staffPath'
import { formatMoney, hasPrice } from '../../utils/money'
import SearchableSelect from '../../components/SearchableSelect'
import usePolling from '../../hooks/usePolling'
import useEscapeKey from '../../hooks/useEscapeKey'
import usePersistedState from '../../hooks/usePersistedState'
import useDebouncedValue from '../../hooks/useDebouncedValue'

const EMPTY_FILTERS = { doctorId: '', branchId: '', from: '', to: '', status: '', patientQuery: '', pendingRelease: false, pendingPayment: false }
const STATUS_OPTIONS = ['SCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']

// Agrupa las citas de la página actual por especialidad y, dentro, por doctor -- con 24+
// doctores una tabla plana se sentía "tirada" (ver feedback del usuario); agrupar deja
// escanear por especialidad sin tener que filtrar primero. Solo tiene sentido cuando NO hay
// un doctor específico elegido en los filtros (con un solo doctor, agrupar no aporta nada).
function groupBySpecialtyAndDoctor(list) {
  const bySpecialty = new Map()
  for (const a of list) {
    const specialtyName = a.doctor?.specialty?.name || 'Sin especialidad'
    const doctorName = `Dr(a). ${a.doctor?.firstName || ''} ${a.doctor?.lastName || ''}`.trim()
    if (!bySpecialty.has(specialtyName)) bySpecialty.set(specialtyName, new Map())
    const byDoctor = bySpecialty.get(specialtyName)
    if (!byDoctor.has(doctorName)) byDoctor.set(doctorName, [])
    byDoctor.get(doctorName).push(a)
  }
  return Array.from(bySpecialty.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([specialty, byDoctor]) => ({
      specialty,
      count: Array.from(byDoctor.values()).reduce((sum, arr) => sum + arr.length, 0),
      doctors: Array.from(byDoctor.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([doctorName, appts]) => ({ doctorName, appts })),
    }))
}

// Lee los filtros iniciales de la URL (?from=&to=&status=), los mismos que arma el
// Dashboard al enlazar aquí desde una tarjeta (ej. "Citas hoy", "Canceladas esta semana") —
// mismo patrón que Sales.jsx/Inventory.jsx en el proyecto de referencia.
function filtersFromSearchParams(searchParams) {
  return {
    ...EMPTY_FILTERS,
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
    status: searchParams.get('status') || '',
    // ?pendingRelease=1 -- lo arma el Dashboard de recepción (canceladas por liberar).
    pendingRelease: searchParams.get('pendingRelease') === '1',
    // ?pendingPayment=1 -- citas ya atendidas por cobrar (lo arma el Dashboard de recepción).
    pendingPayment: searchParams.get('pendingPayment') === '1',
  }
}

export default function ReceptionAppointments() {
  const { notify, confirmDialog } = useNotify()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  // Cita a resaltar cuando se llega aquí desde una notificación (NotificationBell arma el
  // filtro ?from=&to= con la fecha de la cita Y este id, para que además de filtrar al día
  // correcto, salte a la vista el registro exacto -- patrón: mismo location.state que ya usan
  // AdminDoctorForm/etc. para pasar contexto entre pantallas sin URL).
  const highlightAppointmentId = location.state?.highlightAppointmentId
  const { user, can } = useAuth()
  // null = recepcionista general (o admin), sin restricción. Ver ReceptionNewAppointment.jsx.
  const allowedSpecialtyIds = user?.specialties?.length ? new Set(user.specialties.map((s) => s.id)) : null
  const [doctors, setDoctors] = useState([])
  const [branches, setBranches] = useState([])
  const [filters, setFilters] = useState(() => filtersFromSearchParams(searchParams))
  const debouncedPatientQuery = useDebouncedValue(filters.patientQuery, 400)
  const [page, setPage] = useState(0)
  // Persistido (patrón 11): el tamaño de página elegido sobrevive a un refresh.
  const [size, setSize] = usePersistedState('reception-appointments-page-size', 20)
  const [result, setResult] = useState({ content: [], page: 0, totalPages: 0, totalElements: 0 })
  const [loading, setLoading] = useState(true)
  const [rescheduling, setRescheduling] = useState(null)
  // Cita que se está cobrando (se abre sola al marcarla atendida, o con el botón "Cobrar").
  const [charging, setCharging] = useState(null)
  // Registro abierto en el panel de detalle (clic en la fila).
  const [selected, setSelected] = useState(null)
  const goTo = useHospitalNavigate()
  // Evita doble clic en "Cancelar"/"Comprobante" de una fila mientras la petición está en curso.
  const [busyKey, setBusyKey] = useState(null)
  // Colapsado de las secciones de especialidad/doctor en la vista agrupada -- vacío por
  // default (todo expandido); solo se agregan claves cuando el usuario colapsa algo.
  const [collapsedSpecialties, setCollapsedSpecialties] = useState(() => new Set())
  const [collapsedDoctors, setCollapsedDoctors] = useState(() => new Set())

  function toggleSpecialty(name) {
    setCollapsedSpecialties((s) => {
      const next = new Set(s)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }
  function toggleDoctor(key) {
    setCollapsedDoctors((s) => {
      const next = new Set(s)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // Sin un doctor elegido, la tabla se agrupa por especialidad/doctor (ver `groups` más
  // abajo) -- pero esa agrupación solo ve lo que trae la página actual. Con paginación
  // normal (ej. 20 por página) una especialidad entera podía "desaparecer" de la vista si
  // sus citas caían en otra página, aunque sí existieran (confuso: parecía que esa
  // especialidad no tenía citas). Mientras está agrupada, se pide todo de un jalón (tope
  // alto) y se deja de paginar -- paginar no tiene sentido sobre una vista ya categorizada
  // y colapsable. Elegir un doctor específico sí vuelve a la tabla plana paginada normal.
  const isGrouped = !filters.doctorId
  const GROUPED_FETCH_SIZE = 500

  // `silent` distingue la carga inicial/cambio de filtros (sí debe mostrar "Cargando...") del
  // refresco en segundo plano del polling (no debe: si no, la tabla/agrupado entero
  // parpadeaba cada 30s aunque nada hubiera cambiado).
  function load(opts = {}) {
    const { silent = false } = opts
    if (!silent) setLoading(true)
    searchAppointments({
      doctorId: filters.doctorId || undefined,
      branchId: filters.branchId || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      status: filters.status || undefined,
      patientQuery: debouncedPatientQuery || undefined,
      pendingRelease: filters.pendingRelease || undefined,
      pendingPayment: filters.pendingPayment || undefined,
      page: isGrouped ? 0 : page,
      size: isGrouped ? GROUPED_FETCH_SIZE : size,
    }).then((r) => setResult(r.data.data)).finally(() => { if (!silent) setLoading(false) })
  }

  // Selects/fechas se aplican de inmediato; el texto libre (paciente) espera una pausa al
  // escribir (debounce) en vez de exigir un botón "Filtrar".
  useEffect(() => { load() }, [page, size, filters.doctorId, filters.branchId, filters.from, filters.to, filters.status, filters.pendingRelease, filters.pendingPayment, debouncedPatientQuery])
  usePolling(() => load({ silent: true }), 30000)

  // El page reset por texto va aparte: si viviera en el onChange del input dispararía la
  // carga en cada tecla (page cambia de inmediato aunque el debounce del texto no).
  useEffect(() => { setPage(0) }, [debouncedPatientQuery])

  useEffect(() => {
    if (!highlightAppointmentId || result.content.length === 0) return
    document.getElementById(`appointment-row-${highlightAppointmentId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])
  useEffect(() => {
    searchDoctors({ page: 0, size: 100 }).then((r) => {
      const list = r.data.data.content
      setDoctors(allowedSpecialtyIds ? list.filter((d) => allowedSpecialtyIds.has(d.specialty?.id)) : list)
    }).catch(() => {})
    getBranches().then((r) => setBranches(r.data.data)).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateFilter(field, value) {
    setFilters((f) => ({ ...f, [field]: value }))
    // El texto libre resetea la página cuando el debounce asiente (ver efecto de arriba);
    // resetearla aquí también dispararía una carga por cada tecla.
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
      await cancelAppointment(id)
      notify('Cita cancelada', 'success')
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo cancelar', 'error')
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

  async function handleRelease(id) {
    const ok = await confirmDialog('¿Liberar este horario para que otro paciente pueda tomarlo?', { confirmText: 'Liberar horario' })
    if (!ok) return
    const key = `release-${id}`
    setBusyKey(key)
    try {
      await releaseAppointmentSlot(id)
      notify('Horario liberado', 'success')
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo liberar el horario', 'error')
    } finally {
      setBusyKey((k) => (k === key ? null : k))
    }
  }

  async function handleMarkCompleted(a) {
    const id = a.id
    const ok = await confirmDialog(
      a.status === 'NO_SHOW'
        ? 'Esta cita está como "no asistió". ¿Corregirla a atendida?'
        : '¿Marcar esta cita como atendida?',
      { confirmText: a.status === 'NO_SHOW' ? 'Corregir a atendida' : 'Marcar atendida' })
    if (!ok) return
    const key = `complete-${id}`
    setBusyKey(key)
    try {
      const res = await markAppointmentCompleted(id)
      notify('Cita marcada como atendida', 'success')
      load()
      // Al marcar "atendida" se abre el cobro (si la cita no está ya pagada por anticipado).
      if (res.data.data.paymentStatus !== 'PAID') setCharging(res.data.data)
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo marcar', 'error')
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

  // Solo tiene sentido agrupar por especialidad/doctor cuando la vista no está ya acotada a
  // un doctor específico -- si filtras por doctor, un solo grupo con un solo header no aporta.
  const groups = isGrouped ? groupBySpecialtyAndDoctor(result.content) : null

  // Acción desde el panel de detalle: corre y cierra el panel (la lista se recarga sola).
  const fromDrawer = (fn) => async () => {
    const target = selected
    setSelected(null)
    await fn(target)
  }

  return (
    <div>
      <LoadingOverlay show={!!busyKey && busyKey.startsWith('cancel-')} message="Cancelando la cita..." />
      <LoadingOverlay show={!!busyKey && busyKey.startsWith('download-')} message="Generando comprobante..." />
      <div className="mb-6">
        <h1 className="page-title">Citas</h1>
        {allowedSpecialtyIds && (
          <p className="text-sm text-gray-500 mt-1">
            Mostrando solo citas de: {user.specialties.map((s) => s.name).join(', ')}.
          </p>
        )}
      </div>

      <div className="card p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[180px]">
          <label className="text-xs font-medium text-gray-600 block mb-1">Doctor</label>
          <SearchableSelect
            options={doctors.map((d) => ({ value: d.id, label: `Dr(a). ${d.firstName} ${d.lastName}` }))}
            value={filters.doctorId}
            onChange={(v) => updateFilter('doctorId', v)}
          />
        </div>
        <div className="min-w-[160px]">
          <label className="text-xs font-medium text-gray-600 block mb-1">Sede</label>
          <select className="input" value={filters.branchId} onChange={(e) => updateFilter('branchId', e.target.value)}>
            <option value="">Todas</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
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
        <label className="flex items-center gap-2 text-sm text-gray-700 pb-2 cursor-pointer" title="Citas canceladas con 24 h o más de anticipación cuyo horario aún nadie libera">
          <input
            type="checkbox"
            checked={filters.pendingRelease}
            onChange={(e) => updateFilter('pendingRelease', e.target.checked)}
          />
          Por liberar
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 pb-2 cursor-pointer" title="Citas ya atendidas que todavía no se cobran">
          <input
            type="checkbox"
            checked={filters.pendingPayment}
            onChange={(e) => updateFilter('pendingPayment', e.target.checked)}
          />
          Por cobrar
        </label>
        {hasActiveFilters && (
          <button type="button" className="btn-secondary text-sm" onClick={handleClearFilters}>Limpiar</button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <p className="text-gray-500 text-sm p-4">Cargando...</p>
        ) : groups ? (
          <div className="divide-y divide-gray-100">
            {groups.map((g) => {
              const specialtyCollapsed = collapsedSpecialties.has(g.specialty)
              return (
                <div key={g.specialty}>
                  <button
                    type="button"
                    onClick={() => toggleSpecialty(g.specialty)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
                  >
                    <span className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                      <span className={`text-gray-400 transition-transform ${specialtyCollapsed ? '' : 'rotate-90'}`}>›</span>
                      {g.specialty}
                    </span>
                    <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">{g.count}</span>
                  </button>
                  {!specialtyCollapsed && g.doctors.map((d) => {
                    const doctorKey = `${g.specialty}::${d.doctorName}`
                    const doctorCollapsed = collapsedDoctors.has(doctorKey)
                    return (
                      <div key={doctorKey} className="border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => toggleDoctor(doctorKey)}
                          className="w-full flex items-center justify-between pl-9 pr-4 py-2 hover:bg-gray-50 text-left"
                        >
                          <span className="text-sm text-gray-700 flex items-center gap-2">
                            <span className={`text-gray-300 text-xs transition-transform ${doctorCollapsed ? '' : 'rotate-90'}`}>›</span>
                            {d.doctorName}
                          </span>
                          <span className="text-xs text-gray-400">{d.appts.length}</span>
                        </button>
                        {!doctorCollapsed && (
                          <div className="divide-y divide-gray-50">
                            {d.appts.map((a) => (
                              <div
                                key={a.id}
                                id={`appointment-row-${a.id}`}
                                role="button"
                                tabIndex={0}
                                onClick={() => setSelected(a)}
                                onKeyDown={(e) => e.key === 'Enter' && setSelected(a)}
                                className={`group flex cursor-pointer flex-col gap-2 py-3 pl-4 pr-4 text-sm transition hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-3 sm:py-2.5 sm:pl-14 ${
                                  String(a.id) === String(highlightAppointmentId) ? 'bg-primary-50 ring-2 ring-inset ring-primary-300' : ''
                                }`}
                              >
                                {/* En sm+ esta fila es flex, no una tabla real -- por eso cada
                                    "columna" necesita un ancho FIJO (no solo mínimo) con recorte
                                    de texto: con min-w a secas, un nombre/sede largo estira su
                                    caja y corre todo lo que sigue en ESA fila nada más,
                                    desalineándola contra las demás (ver feedback del usuario,
                                    capturas de "Citas"). Debajo de sm se apila en columna, así
                                    que esos anchos fijos no aplican y no hace falta truncar. */}
                                <div className="w-full sm:w-[180px] sm:shrink-0 sm:overflow-hidden">
                                  <p className="font-medium text-gray-900 sm:truncate">{a.patient?.firstName} {a.patient?.lastName}</p>
                                  <p className="text-xs text-gray-500 sm:truncate">{a.patient?.phone}</p>
                                </div>
                                <span className="text-gray-600 capitalize sm:w-[150px] sm:shrink-0 sm:truncate">{formatDateOnly(a.appointmentDate)}, {formatTimeOnly(a.startTime)}</span>
                                <span className="text-gray-500 sm:w-[110px] sm:shrink-0 sm:truncate">{a.branch?.name}</span>
                                <div className="flex flex-1 flex-wrap items-center gap-1.5"><AppointmentBadges appointment={a} />{hasPrice(a.price) && a.status !== 'CANCELLED' && <span className="text-xs text-gray-500">{formatMoney(a.price)}</span>}</div>
                                <ChevronRight className="hidden h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary-600 sm:block" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
            {groups.length === 0 && (
              <p className="px-4 py-8 text-center text-gray-400 text-sm">Sin citas</p>
            )}
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Paciente</th>
                    <th className="px-4 py-3 font-medium">Doctor</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Sede</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {result.content.map((a) => (
                    <tr
                      key={a.id}
                      id={`appointment-row-${a.id}`}
                      onClick={() => setSelected(a)}
                      className={`group cursor-pointer border-t border-gray-100 transition hover:bg-slate-50 ${
                        String(a.id) === String(highlightAppointmentId) ? 'bg-primary-50 ring-2 ring-inset ring-primary-300' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{a.patient?.firstName} {a.patient?.lastName}</p>
                        <p className="text-xs text-gray-500">{a.patient?.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">Dr(a). {a.doctor?.firstName} {a.doctor?.lastName}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{formatDateOnly(a.appointmentDate)}, {formatTimeOnly(a.startTime)}</td>
                      <td className="px-4 py-3 text-gray-600">{a.branch?.name}</td>
                      <td className="px-4 py-3"><div className="flex flex-wrap items-center gap-1.5"><AppointmentBadges appointment={a} />{hasPrice(a.price) && a.status !== 'CANCELLED' && <span className="text-xs text-gray-500">{formatMoney(a.price)}</span>}</div></td>
                      <td className="w-8 px-4 py-3"><ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary-600" /></td>
                    </tr>
                  ))}
                  {result.content.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin citas</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-100">
              {result.content.map((a) => (
                <div
                  key={a.id}
                  id={`appointment-row-${a.id}`}
                  onClick={() => setSelected(a)}
                  className={`cursor-pointer px-4 py-3 active:bg-slate-50 ${
                    String(a.id) === String(highlightAppointmentId) ? 'bg-primary-50 ring-2 ring-inset ring-primary-300' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900">{a.patient?.firstName} {a.patient?.lastName}</p>
                      <p className="text-xs text-gray-500">{a.patient?.phone}</p>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5"><AppointmentBadges appointment={a} />{hasPrice(a.price) && a.status !== 'CANCELLED' && <span className="text-xs text-gray-500">{formatMoney(a.price)}</span>}</div>
                  <p className="text-sm text-gray-600 mt-1">Dr(a). {a.doctor?.firstName} {a.doctor?.lastName}</p>
                  <p className="text-sm text-gray-500 capitalize">{formatDateOnly(a.appointmentDate)}, {formatTimeOnly(a.startTime)} · {a.branch?.name}</p>
                </div>
              ))}
              {result.content.length === 0 && (
                <p className="px-4 py-8 text-center text-gray-400 text-sm">Sin citas</p>
              )}
            </div>
          </>
        )}
        {isGrouped ? (
          <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            {result.totalElements} cita{result.totalElements === 1 ? '' : 's'} en total
            {result.totalElements >= GROUPED_FETCH_SIZE && ' (elige un doctor para acotar la búsqueda)'}
          </div>
        ) : (
          <AdminPagination
            page={result.page} size={size} totalPages={result.totalPages} totalElements={result.totalElements}
            contentLength={result.content.length}
            onPageChange={setPage} onSizeChange={(s) => { setSize(s); setPage(0) }}
          />
        )}
      </div>

      <AppointmentDetailCard
        appointment={selected}
        onClose={() => setSelected(null)}
        busyAction={busyKey ? busyKey.split('-')[0] : null}
        onDownload={() => handleDownloadReceipt(selected.id)}
        onReschedule={can('APPOINTMENTS_RESCHEDULE') ? () => { setRescheduling(selected); setSelected(null) } : undefined}
        onCancel={can('APPOINTMENTS_CANCEL') ? fromDrawer((a) => handleCancel(a.id)) : undefined}
        onRelease={can('APPOINTMENTS_RELEASE') ? fromDrawer((a) => handleRelease(a.id)) : undefined}
        onMarkArrived={can('APPOINTMENTS_STATUS') ? fromDrawer((a) => handleArrived(a.id)) : undefined}
        onMarkCompleted={can('APPOINTMENTS_STATUS') ? fromDrawer((a) => handleMarkCompleted(a)) : undefined}
        onMarkNoShow={can('APPOINTMENTS_STATUS') ? fromDrawer((a) => handleMarkNoShow(a.id)) : undefined}
        onCharge={can('PAYMENTS_CHARGE') ? () => { setCharging(selected); setSelected(null) } : undefined}
        onViewPatient={selected?.patient?.id && can('PATIENTS_MODULE') ? () => goTo(`${staffBasePath(location.pathname)}/pacientes/${selected.patient.id}`) : undefined}
      />

      {charging && (
        <ChargeModal appointment={charging} onClose={() => setCharging(null)} onPaid={() => { setCharging(null); load() }} />
      )}

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
  useEscapeKey(true, onClose)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await rescheduleAppointment(appointment.id, { appointmentDate, startTime, branchId: branchId ? Number(branchId) : undefined })
      notify('Cita reprogramada correctamente', 'success')
      onSaved()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo reprogramar la cita', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[101] p-4">
      <LoadingOverlay show={saving} message="Reprogramando la cita..." />
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Reprogramar cita</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm">
            <span className="block text-gray-700 mb-1 font-medium">Nueva fecha</span>
            <input required type="date" className="input" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="block text-gray-700 mb-1 font-medium">Nueva hora</span>
            <input required type="time" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="block text-gray-700 mb-1 font-medium">Sede</span>
            <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Reprogramar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
