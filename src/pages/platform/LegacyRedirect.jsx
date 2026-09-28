import { useEffect, useState } from 'react'
import { Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { getAppointmentHospital } from '../../api/publicCatalog'

// Hospital al que se manda cualquier ruta vieja sin /c/<slug> (ej. la dirección de siempre del
// primer consultorio, mientras sus pacientes se acostumbran al enlace nuevo). Opcional.
const DEFAULT_HOSPITAL = import.meta.env.VITE_DEFAULT_HOSPITAL

/**
 * Rutas de la raíz que eran del sitio de UN hospital antes del multi-hospital. Los enlaces de
 * cita que ya se mandaron por correo traen el token de la cita, y con él se averigua su
 * hospital; el resto va al hospital por defecto si está configurado.
 */
export default function LegacyRedirect() {
  const { token: pathToken } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const token = pathToken || searchParams.get('token')
  const [target, setTarget] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!token) return
    getAppointmentHospital(token)
      .then((r) => setTarget(`/c/${r.data.data.slug}${location.pathname}${location.search}`))
      .catch(() => setFailed(true))
  }, [token, location.pathname, location.search])

  if (target) return <Navigate to={target} replace />
  if (!token && DEFAULT_HOSPITAL) {
    return <Navigate to={`/c/${DEFAULT_HOSPITAL}${location.pathname === '/' ? '' : location.pathname}${location.search}`} replace />
  }
  if (token && !failed) {
    return <p className="text-center text-gray-500 py-20">Buscando tu cita...</p>
  }
  return (
    <div className="container-app py-20 text-center">
      <p className="text-4xl mb-3">🔎</p>
      <h1 className="text-xl font-bold text-gray-900 mb-2">No encontramos esta página</h1>
      <p className="text-gray-600 text-sm">Entra desde el enlace que te compartió tu hospital o consultorio.</p>
    </div>
  )
}
