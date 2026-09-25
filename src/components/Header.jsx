import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHospitalConfig } from '../context/HospitalConfigContext'
import useOutsideClick from '../hooks/useOutsideClick'
import useEscapeKey from '../hooks/useEscapeKey'
import NotificationBell from './NotificationBell'

const STAFF_HOME = { ADMIN: '/admin', RECEPTIONIST: '/recepcion', DOCTOR: '/doctor' }

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
    navigate('/')
  }

  const staffHome = STAFF_HOME[role]

  return (
    <header className="print:hidden sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="container-app flex items-center gap-4 py-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          {config?.logoUrl ? (
            <img src={config.logoUrl} alt={config.name} className="h-9 w-auto object-contain" />
          ) : (
            <span className="text-xl font-bold text-primary-700">🏥 {config?.name || 'Hospital'}</span>
          )}
        </Link>

        <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-gray-700 ml-4">
          <Link to="/doctores" className="hover:text-primary-700">Buscar doctor</Link>
          <Link to="/cancelar-cita" className="hover:text-primary-700">Cancelar o reprogramar una cita</Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menú"
          >
            ☰
          </button>

          {/* Solo el paciente con cuenta ve campanita, y solo para cancelación/reprogramación
              (patrón: el agendado propio ya lo ve de inmediato en pantalla) -- ver
              NotificationServiceImpl.notifyPatientIfRegistered en el Backend. */}
          {role === 'PATIENT' && <NotificationBell />}

          <div className="relative hidden sm:block" ref={accountRef}>
            {user ? (
              <>
                <button
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-primary-700"
                  onClick={() => setAccountOpen((v) => !v)}
                >
                  👤 {user.firstName}
                </button>
                {accountOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-1 text-sm">
                    {role === 'PATIENT' && (
                      <Link to="/mis-citas" className="block px-4 py-2 hover:bg-gray-50" onClick={() => setAccountOpen(false)}>
                        Mis citas
                      </Link>
                    )}
                    {staffHome && (
                      <Link to={staffHome} className="block px-4 py-2 hover:bg-gray-50 text-primary-700 font-medium" onClick={() => setAccountOpen(false)}>
                        Panel {role === 'ADMIN' ? 'administrativo' : role === 'DOCTOR' ? 'de doctor' : 'de recepción'}
                      </Link>
                    )}
                    <Link to="/cambiar-password" className="block px-4 py-2 hover:bg-gray-50" onClick={() => setAccountOpen(false)}>
                      Cambiar contraseña
                    </Link>
                    <button className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600" onClick={handleLogout}>
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-3 text-sm font-medium">
                <Link to="/login" className="text-gray-700 hover:text-primary-700">Iniciar sesión</Link>
                <Link to="/registro" className="btn-primary py-1.5 px-3">Registrarme</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden container-app pb-3 flex flex-col gap-2 text-sm font-medium text-gray-700">
          <Link to="/doctores" onClick={() => setMobileOpen(false)}>Buscar doctor</Link>
          <Link to="/cancelar-cita" onClick={() => setMobileOpen(false)}>Cancelar o reprogramar una cita</Link>
          {user ? (
            <>
              {role === 'PATIENT' && <Link to="/mis-citas" onClick={() => setMobileOpen(false)}>Mis citas</Link>}
              {staffHome && <Link to={staffHome} className="text-primary-700" onClick={() => setMobileOpen(false)}>Panel</Link>}
              <button className="text-left text-red-600" onClick={handleLogout}>Cerrar sesión</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMobileOpen(false)}>Iniciar sesión</Link>
              <Link to="/registro" onClick={() => setMobileOpen(false)}>Registrarme</Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}
