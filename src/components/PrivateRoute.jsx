import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Guard de rutas autenticadas. `roles` restringe además a usuarios cuyo rol esté en la
 * lista (paneles de doctor/recepción/admin) — la protección real sigue estando en el
 * Backend (`SecurityConfig` + `@PreAuthorize`/`hasRole`), esto solo evita el parpadeo de UI.
 *
 * Si la cuenta tiene una contraseña temporal pendiente de cambiar (alta hecha por ADMIN o
 * reset reciente), se fuerza el paso por /cambiar-password antes de cualquier otra pantalla
 * autenticada (patrón 02).
 */
export default function PrivateRoute({ children, roles }) {
  const { user, loading, role } = useAuth()
  const location = useLocation()
  if (loading) {
    return <div className="flex items-center justify-center h-screen text-gray-500">Cargando...</div>
  }
  if (!user) return <Navigate to="/login" replace />
  if (user.mustChangePassword && location.pathname !== '/cambiar-password') {
    return <Navigate to="/cambiar-password" replace />
  }
  if (roles && !roles.includes(role)) return <Navigate to="/" replace />
  return children
}
