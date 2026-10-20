import { ShieldCheck } from 'lucide-react'
import { Link } from '../router'
import { useHospitalConfig } from '../context/HospitalConfigContext'

/**
 * Aviso de privacidad del hospital. Es una plantilla general con los datos del hospital: cada
 * hospital debe revisarla con su asesor legal y ajustarla a su caso antes de operar.
 */
export default function PrivacyNotice() {
  const { config } = useHospitalConfig()
  const name = config?.name || 'el hospital'
  return (
    <div className="container-app max-w-3xl py-10 sm:py-14">
      <p className="eyebrow mb-2 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Datos personales</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Aviso de privacidad</h1>
      <p className="mt-2 text-sm text-slate-500">Versión simplificada · {name}</p>

      <div className="card mt-8 space-y-6 p-6 text-[15px] leading-relaxed text-slate-700 sm:p-8">
        <Section title="¿Quién es responsable de tus datos?">
          {name} es responsable del tratamiento de los datos personales que nos proporcionas al agendar una cita o crear una cuenta
          {config?.contactEmail ? <> (contacto: <strong>{config.contactEmail}</strong>)</> : null}.
        </Section>
        <Section title="¿Qué datos recabamos?">
          Nombre, teléfono, correo electrónico y, como datos sensibles, tus alergias, tipo de sangre, motivo de consulta y las recetas
          que emita tu doctor. Los datos de tarjeta los procesa directamente la pasarela de pagos; nosotros no los guardamos.
        </Section>
        <Section title="¿Para qué los usamos?">
          Para agendar, confirmar, recordarte y dar seguimiento a tus citas; para que tu doctor te atienda con seguridad; para cobrar
          la consulta y emitir comprobantes. No los usamos para publicidad ni los vendemos.
        </Section>
        <Section title="¿Con quién los compartimos?">
          Solo con el personal que te atiende (doctor, recepción y administración del hospital) y con proveedores necesarios para operar
          el servicio (correo y pagos), bajo obligaciones de confidencialidad.
        </Section>
        <Section title="Tus derechos ARCO">
          Puedes acceder, rectificar, cancelar u oponerte al uso de tus datos, y revocar tu consentimiento, desde nuestra
          página de <Link to="/derechos-arco" className="font-semibold text-primary-700 hover:underline">derechos ARCO</Link>. Te respondemos en un máximo de 20 días hábiles.
        </Section>
        <Section title="Cambios a este aviso">
          Cualquier cambio se publicará en esta misma página.
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="mb-1.5 font-display text-lg font-semibold text-slate-900">{title}</h2>
      <p>{children}</p>
    </section>
  )
}
