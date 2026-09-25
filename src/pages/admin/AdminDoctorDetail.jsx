import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { adminGetDoctor, adminGetDoctorSchedule, adminGetDoctorScheduleExceptions, adminDeactivateDoctor } from '../../api/adminDoctors'
import { searchAppointments } from '../../api/reception'
import { resolveMediaUrl } from '../../utils/media'
import { formatDate, formatDateOnly, formatTimeOnly, hoursOfNotice, formatHoursNotice } from '../../utils/format'
import { useNotify } from '../../context/NotifyContext'
import AdminPagination from '../../components/AdminPagination'

const DAYS = [
  { value: 'MONDAY', label: 'Lunes' },
  { value: 'TUESDAY', label: 'Martes' },
  { value: 'WEDNESDAY', label: 'Miércoles' },
  { value: 'THURSDAY', label: 'Jueves' },
  { value: 'FRIDAY', label: 'Viernes' },
  { value: 'SATURDAY', label: 'Sábado' },
  { value: 'SUNDAY', label: 'Domingo' },
]

const STATUS_TABS = [
  { value: '', label: 'Todas' },
  { value: 'SCHEDULED', label: 'Programadas' },
  { value: 'COMPLETED', label: 'Atendidas' },
  { value: 'CANCELLED', label: 'Canceladas' },
  { value: 'NO_SHOW', label: 'No asistió' },
]

const CANCELLED_BY_LABEL = {
  PATIENT: 'el paciente',
  DOCTOR: 'el doctor',
  RECEPTIONIST: 'recepción',
  ADMIN: 'administración',
  GUEST: 'el paciente (invitado, sin cuenta)',
}

/**
 * Vista de un doctor para el director del hospital: perfil, horario semanal + excepciones
 * de agenda, y sus citas (programadas/atendidas/canceladas -- incluyendo quién canceló cada
 * una, sea el propio doctor, el paciente o recepción). Reusa los mismos endpoints que ya
 * consumen DoctorSchedule.jsx (vía el equivalente de solo-lectura en /admin/doctors/{id})
 * y la pantalla de Citas (/api/reception/appointments, ya autorizado para ADMIN).
 */
export default function AdminDoctorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { notify, confirmDialog } = useNotify()
  const [doctor, setDoctor] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [exceptions, setExceptions] = useState([])
  const [counts, setCounts] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [deactivating, setDeactivating] = useState(false)

  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [result, setResult] = useState({ content: [], page: 0, totalPages: 0, totalElements: 0 })
  const [loadingAppointments, setLoadingAppointments] = useState(true)

  useEffect(() => {
    setLoadingProfile(true)
    Promise.all([
      adminGetDoctor(id),
      adminGetDoctorSchedule(id),
      adminGetDoctorScheduleExceptions(id),
    ]).then(([d, s, e]) => {
      setDoctor(d.data.data)
      setSchedule(s.data.data)
      setExceptions(e.data.data)
    }).finally(() => setLoadingProfile(false))

    // Conteos por estado (patrón: varias llamadas livianas con size=1 solo para leer
    // totalElements, en vez de traer todas las citas para contarlas en el cliente).
    Promise.all(
      ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((s) =>
        searchAppointments({ doctorId: id, status: s, size: 1 }).then((r) => r.data.data.totalElements))
    ).then(([scheduled, completed, cancelled, noShow]) => {
      setCounts({ scheduled, completed, cancelled, noShow, total: scheduled + completed + cancelled + noShow })
    }).catch(() => {})
  }, [id])

  useEffect(() => {
    setLoadingAppointments(true)
    searchAppointments({ doctorId: id, status: status || undefined, page, size })
      .then((r) => setResult(r.data.data))
      .finally(() => setLoadingAppointments(false))
  }, [id, status, page, size])

  async function handleDeactivate() {
    const ok = await confirmDialog(
      `¿Desactivar a Dr(a). ${doctor.firstName} ${doctor.lastName}? Ya no podrá iniciar sesión ni recibir nuevas citas.`,
      { confirmText: 'Desactivar' },
    )
    if (!ok) return
    setDeactivating(true)
    try {
      await adminDeactivateDoctor(id)
      notify('Doctor desactivado', 'success')
      navigate('/admin/doctores')
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo desactivar', 'error')
    } finally {
      setDeactivating(false)
    }
  }

  if (loadingProfile || !doctor) {
    return <p className="text-gray-500 text-sm">Cargando...</p>
  }

  return (
    <div>
      <Link to="/admin/doctores" className="text-sm text-primary-700 hover:underline">‹ Volver a Doctores</Link>

      <div className="card p-6 mt-3 mb-6 flex flex-col sm:flex-row gap-6">
        {doctor.photoUrl ? (
          <img src={resolveMediaUrl(doctor.photoUrl)} alt="" className="w-24 h-24 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-2xl font-bold shrink-0">
            {doctor.firstName?.[0]}{doctor.lastName?.[0]}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">Dr(a). {doctor.firstName} {doctor.lastName}</h1>
            <div className="flex items-center gap-2">
              <Link to={`/admin/agenda-doctores?doctorId=${id}`} className="btn-secondary text-sm">Ver agenda</Link>
              <Link to={`/admin/doctores/${id}/editar`} className="btn-secondary text-sm">Editar</Link>
              <button onClick={handleDeactivate} disabled={deactivating} className="btn-secondary text-sm text-red-600 disabled:opacity-50">
                {deactivating ? 'Desactivando...' : 'Desactivar'}
              </button>
            </div>
          </div>
          <p className="text-gray-600">{doctor.specialty?.name}</p>
          <p className="text-sm text-gray-500 mt-1">{doctor.email} {doctor.phone && `· ${doctor.phone}`}</p>
          <p className="text-sm text-gray-500">Sedes: {doctor.branches?.map((b) => b.name).join(' · ') || '—'}</p>
          {doctor.licenseNumber && <p className="text-sm text-gray-500">Cédula: {doctor.licenseNumber}</p>}
          {doctor.bio && <p className="text-sm text-gray-600 mt-2">{doctor.bio}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total" value={counts?.total} />
        <StatCard label="Programadas" value={counts?.scheduled} color="text-primary-700" />
        <StatCard label="Atendidas" value={counts?.completed} color="text-green-700" />
        <StatCard label="Canceladas" value={counts?.cancelled} color="text-red-600" />
        <StatCard label="No asistió" value={counts?.noShow} color="text-gray-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Horario semanal</h2>
          {schedule.length === 0 ? (
            <p className="text-sm text-gray-400">Sin horario configurado.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {schedule.map((s) => (
                <li key={s.id} className="grid grid-cols-[90px_1fr_auto] items-center gap-2 border-b border-gray-100 pb-1.5 last:border-0">
                  <span className="font-medium text-gray-800">{DAYS.find((d) => d.value === s.dayOfWeek)?.label ?? s.dayOfWeek}</span>
                  <span className="text-gray-600 text-center">{formatTimeOnly(s.startTime)}–{formatTimeOnly(s.endTime)}</span>
                  <span className="text-gray-500 text-right">{s.branchName}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Excepciones de agenda</h2>
          {exceptions.length === 0 ? (
            <p className="text-sm text-gray-400">Sin excepciones registradas.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {exceptions.map((e) => (
                <li key={e.id} className="border-b border-gray-100 pb-1.5 last:border-0">
                  <span className="font-medium text-gray-800 capitalize">{formatDateOnly(e.date)}</span>{' '}
                  <span className="text-gray-600">
                    {e.allDay ? '· Todo el día' : `· ${formatTimeOnly(e.startTime)}–${formatTimeOnly(e.endTime)}`}
                  </span>
                  {e.reason && <span className="text-gray-400"> — {e.reason}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-2">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => { setStatus(t.value); setPage(0) }}
              className={`text-xs font-medium px-3 py-1.5 rounded-full ${
                status === t.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loadingAppointments ? (
          <p className="text-gray-500 text-sm p-4">Cargando...</p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Paciente</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Sede</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Detalle</th>
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
                      <td className="px-4 py-3 text-gray-600">{a.status}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {a.status === 'CANCELLED' && (
                          <>
                            Cancelada por {CANCELLED_BY_LABEL[a.cancelledByRole] || a.cancelledByName}
                            {a.cancelReason && <> — {a.cancelReason}</>}
                            {a.cancelledAt && <><br />{formatDate(a.cancelledAt)}</>}
                            {a.slotReleased && a.releasedByName && (
                              <><br />Espacio liberado por {a.releasedByName} ({a.releasedByRole})</>
                            )}
                            {!a.slotReleased && !a.releaseEligible && (
                              <><br />No liberable: canceló con {formatHoursNotice(hoursOfNotice(a))} de anticipación</>
                            )}
                          </>
                        )}
                        {a.status === 'SCHEDULED' && a.reasonForVisit}
                      </td>
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
                    <p className="font-medium text-gray-900">{a.patient?.firstName} {a.patient?.lastName}</p>
                    <span className="text-xs text-gray-500 shrink-0">{a.status}</span>
                  </div>
                  <p className="text-xs text-gray-500">{a.patient?.phone}</p>
                  <p className="text-sm text-gray-600 mt-1 capitalize">{formatDateOnly(a.appointmentDate)}, {formatTimeOnly(a.startTime)} · {a.branch?.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {a.status === 'CANCELLED' && (
                      <>
                        Cancelada por {CANCELLED_BY_LABEL[a.cancelledByRole] || a.cancelledByName}
                        {a.cancelReason && <> — {a.cancelReason}</>}
                        {a.cancelledAt && <><br />{formatDate(a.cancelledAt)}</>}
                        {a.slotReleased && a.releasedByName && (
                          <><br />Espacio liberado por {a.releasedByName} ({a.releasedByRole})</>
                        )}
                        {!a.slotReleased && !a.releaseEligible && (
                          <><br />No liberable: canceló con {formatHoursNotice(hoursOfNotice(a))} de anticipación</>
                        )}
                      </>
                    )}
                    {a.status === 'SCHEDULED' && a.reasonForVisit}
                  </p>
                </div>
              ))}
              {result.content.length === 0 && (
                <p className="px-4 py-8 text-center text-gray-400 text-sm">Sin citas</p>
              )}
            </div>
          </>
        )}
        <AdminPagination
          page={result.page} size={size} totalPages={result.totalPages} totalElements={result.totalElements}
          contentLength={result.content.length}
          onPageChange={setPage} onSizeChange={(s) => { setSize(s); setPage(0) }}
        />
      </div>
    </div>
  )
}

function StatCard({ label, value, color = 'text-gray-900' }) {
  return (
    <div className="card p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}
