import { Clock, Globe, Mail, MapPin, MessageCircle, Phone, ShieldCheck } from 'lucide-react'
import { Link } from '../router'
import { useHospitalConfig } from '../context/HospitalConfigContext'
import { HospitalLogo } from './ui'

export default function Footer() {
  const { config } = useHospitalConfig()
  const year = new Date().getFullYear()
  const address = [config?.addressLine, config?.neighborhood,
    [config?.postalCode && `CP ${config.postalCode}`, config?.city].filter(Boolean).join(' '), config?.state].filter(Boolean).join(', ')

  return (
    <footer className="aurora grain relative mt-16 overflow-hidden text-slate-300 print:hidden">
      <div className="grid-lines absolute inset-0" />
      <div className="container-app relative grid grid-cols-1 gap-10 py-14 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3">
            <HospitalLogo config={config} className="h-10 w-10 text-sm" />
            <p className="font-display text-lg font-semibold text-white">{config?.name || 'Hospital'}</p>
          </div>
          {config?.description && <p className="mt-4 max-w-md text-slate-400">{config.description}</p>}
        </div>
        <div>
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-[.16em] text-slate-500">Contacto</h4>
          <ul className="space-y-2.5 text-slate-300">
            {address && (
              <li>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer"
                  className="flex items-start gap-2 hover:text-white">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-300" /> <span>{address}</span>
                </a>
              </li>
            )}
            {config?.contactPhone && (
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary-300" /> <a href={`tel:${config.contactPhone}`} className="hover:text-white">{config.contactPhone}</a></li>
            )}
            {config?.whatsapp && (
              <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary-300" />
                <a href={`https://wa.me/52${config.whatsapp}`} target="_blank" rel="noreferrer" className="hover:text-white">WhatsApp {config.whatsapp}</a></li>
            )}
            {config?.contactEmail && (
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary-300" /> <a href={`mailto:${config.contactEmail}`} className="hover:text-white">{config.contactEmail}</a></li>
            )}
            {config?.website && (
              <li className="flex items-center gap-2"><Globe className="h-4 w-4 text-primary-300" />
                <a href={config.website} target="_blank" rel="noreferrer" className="truncate hover:text-white">{config.website.replace(/^https?:\/\//, '')}</a></li>
            )}
            {config?.openingHours && (
              <li className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary-300" /> <span>{config.openingHours}</span></li>
            )}
            {!config?.contactPhone && !config?.contactEmail && !address && (
              <li className="flex items-center gap-2 text-slate-500"><MapPin className="h-4 w-4" /> Pregunta en recepción</li>
            )}
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-[.16em] text-slate-500">Pacientes</h4>
          <ul className="space-y-2.5">
            <li><Link to="/agendar" className="hover:text-white">Agendar cita</Link></li>
            <li><Link to="/doctores" className="hover:text-white">Doctores</Link></li>
            <li><Link to="/cancelar-cita" className="hover:text-white">Cancelar o reprogramar</Link></li>
            <li><Link to="/aviso-de-privacidad" className="hover:text-white">Aviso de privacidad</Link></li>
            <li>
              <Link to="/derechos-arco" className="inline-flex items-center gap-1.5 hover:text-white">
                <ShieldCheck className="h-4 w-4 text-primary-300" /> Derechos ARCO
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="relative border-t border-white/[.06] py-5 text-center text-xs text-slate-500">
        © {year} {config?.legalName || config?.name || 'Hospital'}{config?.rfc && ` · RFC ${config.rfc}`} · Hecho con Nexora Systems
      </div>
    </footer>
  )
}
