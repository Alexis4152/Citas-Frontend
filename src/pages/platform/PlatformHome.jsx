import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const DEFAULT_HOSPITAL = import.meta.env.VITE_DEFAULT_HOSPITAL

/**
 * Portada de la raíz del sitio. Los pacientes y el personal entran siempre desde el enlace de
 * su hospital (/c/<slug>), así que aquí no se lista ningún hospital (sería exponer la lista de
 * clientes): solo se explica cómo entrar.
 */
export default function PlatformHome() {
  // Transición: la dirección de siempre sigue abriendo el primer consultorio (ver LegacyRedirect).
  const { user, loading } = useAuth()
  // El SUPER_ADMIN solo administra hospitales: con sesión va directo a su panel.
  if (loading) return null
  if (user?.role === 'SUPER_ADMIN') return <Navigate to="/superadmin" replace />
  if (DEFAULT_HOSPITAL) return <Navigate to={`/c/${DEFAULT_HOSPITAL}`} replace />
  return (
    <div className="container-app py-16 sm:py-24 flex justify-center">
      <div className="max-w-lg text-center">
        <p className="text-5xl mb-4">🏥</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Agenda tu cita en línea</h1>
        <p className="text-gray-600">
          Para agendar, consultar o cancelar una cita, entra desde el enlace que te compartió tu
          hospital o consultorio. Se ve así:
        </p>
        <p className="mt-4 inline-block bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-mono text-gray-700">
          {window.location.origin}/c/<span className="text-primary-700">nombre-de-tu-hospital</span>
        </p>
        <p className="text-sm text-gray-500 mt-6">
          ¿Trabajas en un hospital? Inicia sesión desde ese mismo enlace.
        </p>
      </div>
    </div>
  )
}
