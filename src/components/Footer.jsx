import { useHospitalConfig } from '../context/HospitalConfigContext'

export default function Footer() {
  const { config } = useHospitalConfig()
  const year = new Date().getFullYear()

  return (
    <footer className="print:hidden bg-gray-900 text-gray-300 mt-12">
      <div className="container-app py-10 grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm">
        <div>
          <h3 className="text-white font-semibold mb-3">{config?.name || 'Hospital'}</h3>
          <p className="text-gray-400">{config?.description}</p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Contacto</h4>
          <ul className="space-y-1 text-gray-400">
            {config?.contactPhone && <li>{config.contactPhone}</li>}
            {config?.contactEmail && <li>{config.contactEmail}</li>}
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Enlaces</h4>
          <ul className="space-y-1 text-gray-400">
            <li><a href="/doctores" className="hover:text-white">Buscar doctor</a></li>
            <li><a href="/cancelar-cita" className="hover:text-white">Cancelar o reprogramar una cita</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">
        © {year} {config?.name || 'Hospital'}
      </div>
    </footer>
  )
}
