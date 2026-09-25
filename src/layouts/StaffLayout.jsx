import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHospitalConfig } from '../context/HospitalConfigContext'
import NotificationBell from '../components/NotificationBell'

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
    isActive ? 'bg-primary-600/20 text-primary-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'
  }`

/**
 * Shell compartido de los tres paneles (doctor/recepción/admin): sidebar oscuro,
 * responsive (drawer off-canvas en móvil, fijo en desktop) — mismos mecanismos que
 * AdminLayout.jsx del proyecto de referencia, generalizado para recibir `links` y
 * `panelLabel` como props y así reutilizarse en los tres roles.
 */
export default function StaffLayout({ links, panelLabel, showNotifications = false }) {
  const { user, logout } = useAuth()
  const { config } = useHospitalConfig()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const sidebarContent = (
    <>
      <div className="p-6 border-b border-[var(--brand-sidebar-border)]">
        <div className="flex items-center gap-3">
          {config?.logoUrl ? (
            <img src={config.logoUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center font-bold text-white">
              {(config?.name || 'H')[0]}
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-white leading-tight">{config?.name || 'Hospital'}</p>
            <p className="text-xs text-slate-400">{panelLabel}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={navLinkClass} onClick={() => setDrawerOpen(false)}>
            <span>{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-[var(--brand-sidebar-border)]">
        <NavLink to="/" className="block text-xs text-slate-400 hover:text-white mb-2">← Volver al sitio público</NavLink>
        <p className="text-xs text-slate-500 mb-2">{user?.firstName} {user?.lastName}</p>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
        >
          🚪 Cerrar sesión
        </button>
      </div>
    </>
  )

  return (
    // bg-primary-50/40: mismo tinte de marca (--brand-50, ver utils/theme.js) que usa
    // DemoPV-Frontend/src/components/Layout.jsx -- antes era gris liso (bg-gray-50) sin
    // relación con el color que el admin elige en "Configuración del hospital".
    <div className="flex h-screen bg-primary-50/40">
      <aside className="hidden lg:flex w-64 bg-[var(--brand-sidebar)] flex-col shrink-0">{sidebarContent}</aside>

      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-64 bg-[var(--brand-sidebar)] flex flex-col h-full">{sidebarContent}</aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-3 bg-primary-50/40 border-b border-primary-100 px-4 py-3">
          <button onClick={() => setDrawerOpen(true)} className="lg:hidden p-2 text-gray-600" aria-label="Abrir menú">☰</button>
          <span className="font-semibold text-gray-800 lg:hidden">{panelLabel}</span>
          {showNotifications && (
            <div className="ml-auto">
              <NotificationBell />
            </div>
          )}
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
