import { useEffect, useState } from 'react'
import { Link } from '../../router'
import { searchAppointments } from '../../api/reception'
import { useAuth } from '../../context/AuthContext'
import { formatTimeOnly, localTodayIso } from '../../utils/format'
import usePolling from '../../hooks/usePolling'
import { AppointmentBadges } from '../../components/StatusBadge'
import { PageHeader, StatCard as Kpi } from '../../components/ui'
import PendingArrivalAlert from '../../components/PendingArrivalAlert'
import { Banknote, CalendarCheck2, CalendarDays, CalendarPlus, CalendarX2, LayoutDashboard, Unlock } from 'lucide-react'

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
      <PageHeader icon={LayoutDashboard} eyebrow="Recepción" title="Hoy"
        description={isSpecialtyRestricted ? `Mostrando solo: ${user.specialties.map((s) => s.name).join(', ')}.` : 'Citas del día, cobros pendientes y lo que hay que atender.'}
        actions={<Link to="/recepcion/nueva-cita" className="btn-primary"><CalendarPlus className="h-4 w-4" /> Nueva cita</Link>} />
      <PendingArrivalAlert />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Citas hoy" value={appointments.length} icon={CalendarDays} to={`/recepcion/citas?from=${todayIso()}&to=${todayIso()}`} />
        <StatCard label="Programadas" value={scheduled.length} icon={CalendarCheck2} tone="blue" to={`/recepcion/citas?from=${todayIso()}&to=${todayIso()}&status=SCHEDULED`} />
        <StatCard label="Canceladas" value={cancelled.length} icon={CalendarX2} tone="red" to={`/recepcion/citas?from=${todayIso()}&to=${todayIso()}&status=CANCELLED`} />
        <StatCard label="Por cobrar" value={pendingPayment} icon={Banknote} tone="amber" to="/recepcion/citas?pendingPayment=1" />
        <StatCard label="Por liberar" value={pendingRelease} icon={Unlock} tone="green" to="/recepcion/citas?pendingRelease=1" />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><p className="font-display text-lg font-semibold text-slate-900">Agenda de hoy</p><span className="text-xs text-slate-500">Se actualiza cada 30 s</span></div>
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
                        <td className="px-4 py-3"><AppointmentBadges appointment={a} /></td>
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
                      <span className="shrink-0"><AppointmentBadges appointment={a} /></span>
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

function StatCard({ label, value, icon, tone, to }) {
  return <Link to={to} className="block"><Kpi label={label} value={value} icon={icon} tone={tone} /></Link>
}
