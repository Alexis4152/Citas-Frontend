import { useEffect, useState } from 'react'
import { ArrowUpRight, Building2, CalendarDays, CalendarRange, CalendarX2, LayoutDashboard, Stethoscope, UserCog } from 'lucide-react'
import { Link } from '../../router'
import { getAdminDashboard } from '../../api/adminDashboard'
import { PageHeader, StatCard } from '../../components/ui'
import PendingArrivalAlert from '../../components/PendingArrivalAlert'
import { localTodayIso } from '../../utils/format'

// Lunes a domingo de la semana en curso (mismo rango que lee ReceptionAppointments.jsx).
function currentWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() + (day === 0 ? -6 : 1 - day))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { from: fmt(monday), to: fmt(sunday) }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminDashboard().then((r) => setStats(r.data.data)).finally(() => setLoading(false))
  }, [])

  const today = localTodayIso()
  const { from: weekStart, to: weekEnd } = currentWeekRange()

  const cards = [
    { key: 'appointmentsToday', label: 'Citas hoy', icon: CalendarDays, tone: 'brand', to: `/admin/citas?from=${today}&to=${today}` },
    { key: 'appointmentsThisWeek', label: 'Citas esta semana', icon: CalendarRange, tone: 'blue', to: `/admin/citas?from=${weekStart}&to=${weekEnd}` },
    { key: 'cancelledThisWeek', label: 'Canceladas esta semana', icon: CalendarX2, tone: 'red', to: `/admin/citas?from=${weekStart}&to=${weekEnd}&status=CANCELLED` },
    { key: 'activeDoctors', label: 'Doctores activos', icon: Stethoscope, tone: 'green', to: '/admin/doctores' },
    { key: 'activeBranches', label: 'Sedes activas', icon: Building2, tone: 'amber', to: '/admin/sedes' },
    { key: 'activeReceptionists', label: 'Recepcionistas activos', icon: UserCog, tone: 'blue', to: '/admin/recepcionistas' },
  ]

  return (
    <div>
      <PageHeader icon={LayoutDashboard} eyebrow="Resumen" title="Tablero"
        description="Lo más importante del hospital de un vistazo. Toca una tarjeta para ver el detalle." />
      <PendingArrivalAlert />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.key} to={c.to} className="group relative block">
            <StatCard icon={c.icon} tone={c.tone} label={c.label} value={stats?.[c.key] ?? 0} loading={loading} />
            <ArrowUpRight className="absolute bottom-5 right-5 h-4 w-4 text-slate-300 transition group-hover:text-primary-600" />
          </Link>
        ))}
      </div>
    </div>
  )
}
