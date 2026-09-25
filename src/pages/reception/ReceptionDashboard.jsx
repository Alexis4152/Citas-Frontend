import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { searchAppointments } from '../../api/reception'
import { useAuth } from '../../context/AuthContext'
import { formatTimeOnly, localTodayIso } from '../../utils/format'
import { AppointmentFlags } from '../../components/StatusBadge'
import usePolling from '../../hooks/usePolling'

// Hora LOCAL del navegador: toISOString() es UTC y cambiaba de día a las 6 pm en México.
const todayIso = localTodayIso

export default function ReceptionDashboard() {
  const { user } = useAuth()
  const isSpecialtyRestricted = !!user?.specialties?.length
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  // Canceladas con 24 h o más de anticipación cuyo horario nadie ha liberado (capacidad perdida
  // hasta que alguien lo libere) -- ver el filtro "Por liberar" de Citas.
  const [pendingRelease, setPendingRelease] = useState(0)
  // Citas ya atendidas que faltan por cobrar.
  const [pendingPayment, setPendingPayment] = useState(0)

  // `silent` distingue la carga inicial (sí debe mostrar "Cargando...") del refresco en
  // segundo plano del polling (no debe -- mismo criterio que DoctorAgenda/ReceptionAppointments,
  // para que la tabla de "Agenda de hoy" no parpadee cada 30s).
  function load(opts = {}) {
    const { silent = false } = opts
    if (!silent) setLoading(true)
    const today = todayIso()
    searchAppointments({ from: today, to: today, size: 100 })
      .then((r) => setAppointments(r.data.data.content))
      .finally(() => { if (!silent) setLoading(false) })
    searchAppointments({ pendingPayment: true, size: 1 })
      .then((r) => setPendingPayment(r.data.data.totalElements))
      .catch(() => {})
    searchAppointments({ pendingRelease: true, size: 1 })
      .then((r) => setPendingRelease(r.data.data.totalElements))
      .catch(() => {})
  }

  useEffect(() => { load() }, [])
  usePolling(() => load({ silent: true }), 30000)

  const scheduled = appointments.filter((a) => a.status === 'SCHEDULED')
  const cancelled = appointments.filter((a) => a.status === 'CANCELLED')

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recepción — Hoy</h1>
          {isSpecialtyRestricted && (
            <p className="text-sm text-gray-500 mt-1">
              Mostrando solo: {user.specialties.map((s) => s.name).join(', ')}.
            </p>
          )}
        </div>
        <Link to="/recepcion/nueva-cita" className="btn-primary text-sm">+ Nueva cita</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Citas hoy" value={appointments.length} icon="📅" to={`/recepcion/citas?from=${todayIso()}&to=${todayIso()}`} />
        <StatCard label="Programadas" value={scheduled.length} icon="✅" to={`/recepcion/citas?from=${todayIso()}&to=${todayIso()}&status=SCHEDULED`} />
        <StatCard label="Canceladas" value={cancelled.length} icon="🚫" to={`/recepcion/citas?from=${todayIso()}&to=${todayIso()}&status=CANCELLED`} />
        <StatCard label="Por cobrar" value={pendingPayment} icon="💰" to="/recepcion/citas?pendingPayment=1" />
        <StatCard label="Por liberar" value={pendingRelease} icon="🔓" to="/recepcion/citas?pendingRelease=1" />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800">Agenda de hoy</div>
        {loading ? (
          <p className="text-gray-500 text-sm p-4">Cargando...</p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Hora</th>
                    <th className="px-4 py-3 font-medium">Paciente</th>
                    <th className="px-4 py-3 font-medium">Doctor</th>
                    <th className="px-4 py-3 font-medium">Sede</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((a) => (
                      <tr key={a.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 text-gray-600">{formatTimeOnly(a.startTime)}</td>
                        <td className="px-4 py-3 text-gray-900">{a.patient?.firstName} {a.patient?.lastName}</td>
                        <td className="px-4 py-3 text-gray-600">Dr(a). {a.doctor?.firstName} {a.doctor?.lastName}</td>
                        <td className="px-4 py-3 text-gray-600">{a.branch?.name}</td>
                        <td className="px-4 py-3 text-gray-600">{a.status}<AppointmentFlags appointment={a} /></td>
                      </tr>
                    ))}
                  {appointments.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin citas para hoy</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-100">
              {appointments
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((a) => (
                  <div key={a.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-gray-900">{formatTimeOnly(a.startTime)} — {a.patient?.firstName} {a.patient?.lastName}</p>
                      <span className="text-xs text-gray-500 shrink-0">{a.status}<AppointmentFlags appointment={a} /></span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">Dr(a). {a.doctor?.firstName} {a.doctor?.lastName} · {a.branch?.name}</p>
                  </div>
                ))}
              {appointments.length === 0 && (
                <p className="px-4 py-8 text-center text-gray-400 text-sm">Sin citas para hoy</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, to }) {
  const content = (
    <>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </>
  )
  if (to) {
    return <Link to={to} className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow">{content}</Link>
  }
  return <div className="card p-5 flex items-center gap-4">{content}</div>
}
