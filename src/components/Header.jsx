import { useState } from 'react'
import { CalendarCheck2, CalendarPlus, ChevronDown, KeyRound, LayoutDashboard, LogOut, Menu, ShieldCheck, Stethoscope, X } from 'lucide-react'
import { Link, NavLink, useNavigate } from '../router'
import { useAuth } from '../context/AuthContext'
import { useHospitalConfig } from '../context/HospitalConfigContext'
import useOutsideClick from '../hooks/useOutsideClick'
import useEscapeKey from '../hooks/useEscapeKey'
import NotificationBell from './NotificationBell'
import { Avatar, HospitalLogo, ThemeToggle } from './ui'

const STAFF_HOME = { ADMIN: '/admin', RECEPTIONIST: '/recepcion', DOCTOR: '/doctor' }
const STAFF_LABEL = { ADMIN: 'Panel administrativo', RECEPTIONIST: 'Panel de recepción', DOCTOR: 'Panel de doctor' }

const navClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`

export default function Header() {
  const { user, role, logout } = useAuth()
  const { config } = useHospitalConfig()
  const navigate = useNavigate()

  const [accountOpen, setAccountOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const accountRef = useOutsideClick(() => setAccountOpen(false))
  useEscapeKey(accountOpen, () => setAccountOpen(false))

  function handleLogout() {
    logout()
    setAccountOpen(false)
    setMobileOpen(false)
    navigate('/')
  }

  const staffHome = STAFF_HOME[role]

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl print:hidden">
      <div className="container-app flex h-16 items-center gap-4">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2.5">
          <HospitalLogo config={config} className="h-9 w-9 text-sm" />
          <span className="hidden truncate font-display text-[17px] font-semibold text-slate-900 sm:block">{config?.name || 'Hospital'}</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          <NavLink to="/doctores" className={navClass}>Doctores</NavLink>
          <NavLink to="/cancelar-cita" className={navClass}>Mi cita</NavLink>
          {role === 'PATIENT' && <NavLink to="/mis-citas" className={navClass}>Mis citas</NavLink>}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Solo el paciente con cuenta ve campanita (cancelación/reprogramación de sus citas). */}
          <ThemeToggle />
          {role === 'PATIENT' && <NotificationBell />}

          {!staffHome && (
            <Link to="/agendar" className="btn-primary hidden sm:inline-flex">
              <CalendarPlus className="h-4 w-4" /> Agendar cita
            </Link>
          )}

          <div className="relative hidden sm:block" ref={accountRef}>
            {user ? (
              <>
                <button className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition hover:bg-slate-100" onClick={() => setAccountOpen((v) => !v)}
                  aria-haspopup="menu" aria-expanded={accountOpen}>
                  <Avatar first={user.firstName} last={user.lastName} size="h-8 w-8 text-[11px]" />
                  <span className="text-sm font-medium text-slate-700">{user.firstName}</span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
                {accountOpen && (
                  <div role="menu" className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-slate-200 animate-scale-in">
                    <div className="px-3 py-2.5">
                      <p className="truncate text-sm font-semibold text-slate-900">{user.firstName} {user.lastName}</p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                    {role === 'PATIENT' && (
                      <>
                        <MenuLink to="/mis-citas" icon={CalendarCheck2} onClick={() => setAccountOpen(false)}>Mis citas</MenuLink>
                        <MenuLink to="/mis-solicitudes-arco" icon={ShieldCheck} onClick={() => setAccountOpen(false)}>Mis datos personales (ARCO)</MenuLink>
                      </>
                    )}
                    {staffHome && (
                      <MenuLink to={staffHome} icon={LayoutDashboard} onClick={() => setAccountOpen(false)} strong>{STAFF_LABEL[role]}</MenuLink>
                    )}
                    <MenuLink to="/cambiar-password" icon={KeyRound} onClick={() => setAccountOpen(false)}>Cambiar contraseña</MenuLink>
                    <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50" onClick={handleLogout}>
                      <LogOut className="h-4 w-4" /> Cerrar sesión
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1">
                <Link to="/login" className="btn-ghost">Iniciar sesión</Link>
                <Link to="/registro" className="btn-secondary">Crear cuenta</Link>
              </div>
            )}
          </div>

          <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
            onClick={() => setMobileOpen((v) => !v)} aria-label="Menú">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-100 bg-white md:hidden animate-fade-up">
          <div className="container-app flex flex-col gap-1 py-3 text-sm">
            <Link to="/agendar" className="btn-primary mb-2" onClick={() => setMobileOpen(false)}><CalendarPlus className="h-4 w-4" /> Agendar cita</Link>
            <MobileLink to="/doctores" icon={Stethoscope} onClick={() => setMobileOpen(false)}>Doctores</MobileLink>
            <MobileLink to="/cancelar-cita" icon={CalendarCheck2} onClick={() => setMobileOpen(false)}>Ver, cancelar o reprogramar mi cita</MobileLink>
            {user ? (
              <>
                {role === 'PATIENT' && <MobileLink to="/mis-citas" icon={CalendarCheck2} onClick={() => setMobileOpen(false)}>Mis citas</MobileLink>}
                {role === 'PATIENT' && <MobileLink to="/mis-solicitudes-arco" icon={ShieldCheck} onClick={() => setMobileOpen(false)}>Mis datos personales (ARCO)</MobileLink>}
                {staffHome && <MobileLink to={staffHome} icon={LayoutDashboard} onClick={() => setMobileOpen(false)}>{STAFF_LABEL[role]}</MobileLink>}
                <button className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-rose-600 hover:bg-rose-50" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" /> Cerrar sesión
                </button>
              </>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link to="/login" className="btn-secondary" onClick={() => setMobileOpen(false)}>Iniciar sesión</Link>
                <Link to="/registro" className="btn-secondary" onClick={() => setMobileOpen(false)}>Crear cuenta</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

function MenuLink({ to, icon: Icon, children, onClick, strong }) {
  return (
    <Link to={to} onClick={onClick}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-slate-100 ${strong ? 'font-semibold text-primary-700' : 'text-slate-700'}`}>
      <Icon className={`h-4 w-4 ${strong ? 'text-primary-500' : 'text-slate-400'}`} /> {children}
    </Link>
  )
}

function MobileLink({ to, icon: Icon, children, onClick }) {
  return (
    <Link to={to} onClick={onClick} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-700 hover:bg-slate-100">
      <Icon className="h-4 w-4 text-slate-400" /> {children}
    </Link>
  )
}
