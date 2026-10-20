import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ChevronDown, ExternalLink, KeyRound, LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { NavLink, Link, useNavigate } from '../router'
import { useAuth } from '../context/AuthContext'
import { useHospitalConfig } from '../context/HospitalConfigContext'
import NotificationBell from '../components/NotificationBell'
import { Avatar, HospitalLogo, NexoraMark, ThemeToggle } from '../components/ui'
import { stripHospitalPrefix } from '../tenant'
import api from '../api/axios'

const ROLE_LABEL = { ADMIN: 'Administrador', RECEPTIONIST: 'Recepción', DOCTOR: 'Doctor', SUPER_ADMIN: 'Nexora' }

/**
 * Shell de los paneles (doctor, recepción, admin y super admin), con el lenguaje visual de
 * nexora-hotel: menú lateral oscuro con el tono del hospital, agrupado por secciones,
 * colapsable en escritorio y cajón en móvil; barra superior con el título de la pantalla,
 * campana y menú de la cuenta.
 *
 * `links`: [{ to, label, icon (componente lucide), section, end, badge }]. `badge: 'arco'`
 * muestra cuántas solicitudes ARCO siguen pendientes.
 */
export default function StaffLayout({ links, panelLabel, showNotifications = false, showPublicSiteLink = true }) {
  const { user, logout, can } = useAuth()
  const { config } = useHospitalConfig()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawer, setDrawer] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('citas-sidebar') === 'collapsed' } catch { return false }
  })
  const [badges, setBadges] = useState({})

  useEffect(() => setDrawer(false), [location.pathname])

  // Pendientes que se muestran como contador en el menú (solo si el panel tiene esa entrada).
  useEffect(() => {
    if (!links.some((l) => l.badge === 'arco')) return undefined
    let alive = true
    const load = () => api.get('/admin/arco-requests/pending-count')
      .then((r) => alive && setBadges((b) => ({ ...b, arco: r.data.data || 0 }))).catch(() => {})
    load()
    const id = setInterval(load, 60000)
    return () => { alive = false; clearInterval(id) }
  }, [links])

  const toggleCollapsed = () => setCollapsed((c) => {
    try { localStorage.setItem('citas-sidebar', c ? 'open' : 'collapsed') } catch { /* solo esta visita */ }
    return !c
  })

  function handleLogout() {
    logout()
    navigate('/login')
  }

  // Cada entrada puede pedir un permiso (`perm`): si la persona no lo tiene, no se muestra.
  const visible = links.filter((l) => !l.perm || can(l.perm))
  const sections = []
  for (const link of visible) {
    const name = link.section || ''
    let section = sections.find((s) => s.name === name)
    if (!section) sections.push((section = { name, items: [] }))
    section.items.push(link)
  }

  const path = stripHospitalPrefix(location.pathname)
  const current = [...visible].sort((a, b) => b.to.length - a.to.length)
    .find((l) => (l.end ? path === l.to : path === l.to || path.startsWith(l.to + '/')))
  const isPlatform = user?.role === 'SUPER_ADMIN'

  const sidebar = (mini) => (
    <div className="flex h-full flex-col">
      <div className={`flex items-center gap-3 px-4 pb-4 pt-5 ${mini ? 'justify-center px-2' : ''}`}>
        {isPlatform ? <NexoraMark className="h-10 w-10 shrink-0" /> : <HospitalLogo config={config} className="h-10 w-10 text-sm" />}
        {!mini && (
          <div className="min-w-0">
            <p className="truncate font-display text-[15px] font-semibold text-white">{isPlatform ? 'Nexora Citas' : config?.name || 'Hospital'}</p>
            <p className="text-[11px] text-slate-400">{panelLabel}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-3">
        {sections.map((section) => (
          <div key={section.name || 'main'}>
            {!mini && section.name && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">{section.name}</p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const count = item.badge ? badges[item.badge] : 0
                return (
                  <li key={item.to}>
                    <NavLink to={item.to} end={item.end} title={mini ? item.label : undefined}
                      className={({ isActive }) => `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition ${mini ? 'justify-center px-0' : ''} ${
                        isActive ? 'bg-white/[.08] text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/.06)]' : 'text-slate-400 hover:bg-white/[.04] hover:text-slate-100'}`}>
                      {({ isActive }) => (
                        <>
                          {isActive && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary-300 to-primary-500" />}
                          {Icon && <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-primary-300' : ''}`} />}
                          {!mini && <span className="flex-1 truncate">{item.label}</span>}
                          {count > 0 && (
                            <span className={`grid min-w-[20px] place-items-center rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-ink-950 ${mini ? 'absolute -right-0.5 -top-0.5' : ''}`}>
                              {count > 99 ? '99+' : count}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {showPublicSiteLink && (
        <div className="border-t border-white/[.06] p-3">
          <Link to="/" title={mini ? 'Sitio público' : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-slate-400 transition hover:bg-white/[.04] hover:text-white ${mini ? 'justify-center px-0' : ''}`}>
            <ExternalLink className="h-4 w-4 shrink-0" />
            {!mini && 'Ver sitio público'}
          </Link>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className={`fixed inset-y-0 left-0 z-30 hidden bg-[var(--brand-sidebar)] transition-[width] duration-300 lg:block ${collapsed ? 'w-[76px]' : 'w-[264px]'}`}>
        {sidebar(collapsed)}
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] bg-[var(--brand-sidebar)] shadow-2xl animate-slide-in-right">
            <button onClick={() => setDrawer(false)} className="absolute right-3 top-5 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/5" aria-label="Cerrar menú">
              <X className="h-4 w-4" />
            </button>
            {sidebar(false)}
          </aside>
        </div>
      )}

      <div className={`flex min-w-0 flex-1 flex-col transition-[padding] duration-300 ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]'}`}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-xl print:hidden sm:px-6">
          <button onClick={() => setDrawer(true)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </button>
          <button onClick={toggleCollapsed} className="hidden h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 lg:grid" aria-label="Contraer menú">
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{current?.label || panelLabel}</p>
            <p className="hidden truncate text-[11px] text-slate-500 sm:block">{panelLabel}</p>
          </div>
          <ThemeToggle />
          {showNotifications && <NotificationBell />}
          <UserMenu user={user} onLogout={handleLogout} />
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 transition hover:bg-slate-100" aria-haspopup="menu" aria-expanded={open}>
        <Avatar first={user?.firstName} last={user?.lastName} size="h-8 w-8 text-[11px]" />
        <div className="hidden text-left sm:block">
          <p className="text-[13px] font-semibold leading-tight text-slate-900">{user?.firstName} {user?.lastName}</p>
          <p className="text-[11px] text-slate-500">{ROLE_LABEL[user?.role] || 'Personal'}</p>
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-slate-200 animate-scale-in">
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-slate-900">{user?.email}</p>
          </div>
          <Link to="/cambiar-password" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
            <KeyRound className="h-4 w-4 text-slate-400" /> Cambiar contraseña
          </Link>
          <button onClick={onLogout} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50">
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
