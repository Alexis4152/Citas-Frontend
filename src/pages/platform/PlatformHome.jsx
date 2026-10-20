import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * Raíz del sitio. Los pacientes y el personal entran desde el enlace de su hospital (/c/<slug>),
 * así que aquí no hay portada: el SUPER_ADMIN con sesión va a su panel y cualquier otro al login.
 */
export default function PlatformHome() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user?.role === 'SUPER_ADMIN') return <Navigate to="/superadmin" replace />
  return <Navigate to="/login" replace />
}
