import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHospitalConfig } from '../context/HospitalConfigContext'

export default function Home() {
  const { user } = useAuth()
  const { config } = useHospitalConfig()

  return (
    <div>
      <section className="bg-primary-700 text-white">
        <div className="container-app py-16 sm:py-24 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">{config?.name || 'Hospital'}</h1>
          <p className="text-primary-100 max-w-xl mx-auto mb-8">
            {config?.description || 'Agenda tu cita médica en minutos, sin llamadas ni esperas.'}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/doctores" className="btn-primary bg-white text-primary-700 hover:bg-primary-50">
              Buscar doctor
            </Link>
            {!user && (
              <>
                <Link to="/login" className="btn-secondary bg-transparent border-white text-white hover:bg-white/10">
                  Iniciar sesión
                </Link>
                <Link to="/registro" className="btn-secondary bg-transparent border-white text-white hover:bg-white/10">
                  Registrarme
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="container-app py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="card p-6 text-center">
            <p className="text-3xl mb-3">🔎</p>
            <h3 className="font-semibold text-gray-900 mb-1">Encuentra tu especialista</h3>
            <p className="text-sm text-gray-500">Filtra por especialidad y sede para encontrar al doctor ideal.</p>
          </div>
          <div className="card p-6 text-center">
            <p className="text-3xl mb-3">📅</p>
            <h3 className="font-semibold text-gray-900 mb-1">Agenda en línea</h3>
            <p className="text-sm text-gray-500">Elige el día y la hora que mejor te acomoden, sin llamadas.</p>
          </div>
          <div className="card p-6 text-center">
            <p className="text-3xl mb-3">✅</p>
            <h3 className="font-semibold text-gray-900 mb-1">Confirmación inmediata</h3>
            <p className="text-sm text-gray-500">Recibe tu folio y gestiona o cancela tu cita cuando quieras.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
