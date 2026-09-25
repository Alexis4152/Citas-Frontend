import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminDashboard } from '../../api/adminDashboard'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

// Lunes a domingo de la semana en curso, para las tarjetas "Citas esta semana" y
// "Canceladas esta semana" -- el mismo rango que arma ReceptionAppointments.jsx al leer
// ?from=&to= de la URL.
function currentWeekRange() {
  const now = new Date()
  const day = now.getDay() // 0=domingo..6=sabado
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d) => d.toISOString().slice(0, 10)
  return { from: fmt(monday), to: fmt(sunday) }
}

/**
 * Tarjeta de indicador del dashboard. Si recibe `to`, la tarjeta completa es un link (con
 * hover) hacia ese módulo/filtro -- mismo patrón que el Dashboard del proyecto de
 * referencia (StatCard con `to` opcional en DemoPV-Frontend/src/pages/Dashboard.jsx).
 */
function StatCard({ icon, value, label, to }) {
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
    return (
      <Link to={to} className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
        {content}
      </Link>
    )
  }
  return <div className="card p-5 flex items-center gap-4">{content}</div>
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminDashboard().then((r) => setStats(r.data.data)).finally(() => setLoading(false))
  }, [])

  const today = todayIso()
  const { from: weekStart, to: weekEnd } = currentWeekRange()

  const cards = [
    { key: 'appointmentsToday', label: 'Citas hoy', icon: '📅', to: `/admin/citas?from=${today}&to=${today}` },
    { key: 'appointmentsThisWeek', label: 'Citas esta semana', icon: '🗓️', to: `/admin/citas?from=${weekStart}&to=${weekEnd}` },
    { key: 'activeDoctors', label: 'Doctores activos', icon: '🩺', to: '/admin/doctores' },
    { key: 'activeBranches', label: 'Sedes activas', icon: '🏥', to: '/admin/sedes' },
    { key: 'activeReceptionists', label: 'Recepcionistas activos', icon: '🧑‍💼', to: '/admin/recepcionistas' },
    { key: 'cancelledThisWeek', label: 'Canceladas esta semana', icon: '🚫', to: `/admin/citas?from=${weekStart}&to=${weekEnd}&status=CANCELLED` },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      {loading ? (
        <p className="text-gray-500 text-sm">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => (
            <StatCard key={c.key} icon={c.icon} value={stats?.[c.key] ?? 0} label={c.label} to={c.to} />
          ))}
        </div>
      )}
    </div>
  )
}
