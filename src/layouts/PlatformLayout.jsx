import { Outlet } from 'react-router-dom'
import { Link } from '../router'
import { useAuth } from '../context/AuthContext'

/** Marco de la raíz del sitio (sin hospital): portada de Nexora y login del SUPER_ADMIN. */
export default function PlatformLayout() {
  const { user, logout } = useAuth()
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container-app h-16 flex items-center justify-between">
          <Link to="/" className="font-bold text-gray-900 text-lg">Nexora <span className="text-primary-700">Citas</span></Link>
          {user ? (
            <div className="flex items-center gap-4 text-sm">
              <button type="button" onClick={logout} className="text-gray-500 hover:text-gray-900">Cerrar sesión</button>
            </div>
          ) : (
            <Link to="/login" className="text-sm text-gray-500 hover:text-gray-900">Acceso administración</Link>
          )}
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="py-6 text-center text-xs text-gray-400">© {new Date().getFullYear()} Nexora Systems</footer>
    </div>
  )
}
