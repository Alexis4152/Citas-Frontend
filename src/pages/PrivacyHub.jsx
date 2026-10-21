import { useState } from 'react'
import { BellRing, ChevronDown, Download, FileText, Lock, ShieldCheck, Trash2, UserCog, Users } from 'lucide-react'
import { Link } from '../router'
import { useAuth } from '../context/AuthContext'
import { useHospitalConfig } from '../context/HospitalConfigContext'

/**
 * Centro de privacidad público (/privacidad), al estilo de "Cómo cuidamos tu privacidad" de
 * Mercado Libre: explica en corto cómo tratamos los datos y lleva a cada acción (gestionar,
 * descargar, eliminar, ejercer derechos con o sin cuenta). El detalle legal vive en el aviso.
 */
export default function PrivacyHub() {
  const { user, role } = useAuth()
  const { config } = useHospitalConfig()
  const name = config?.name || 'el hospital'
  const legal = config?.legalName || name
  const privacyEmail = config?.privacyContactEmail || config?.contactEmail
  const patient = user && role === 'PATIENT'
  // El personal (admin, recepción, doctor) no tiene datos de paciente que gestionar aquí.
  const staff = user && !patient
  // Con cuenta todo se hace desde "Mi privacidad"; sin sesión, el login regresa al paciente ahí.
  const account = patient ? '/mi-privacidad' : staff ? null : '/login'

  const cards = [
    { icon: UserCog, title: 'Gestiona tus datos personales', text: 'Consulta y corrige tus datos de contacto y de tu expediente.', to: account, cta: patient ? 'Ir a mis datos' : 'Inicia sesión' },
    { icon: BellRing, title: 'Configura tus preferencias', text: 'Decide si quieres recordatorios de citas y novedades del hospital.', to: account, cta: patient ? 'Configurar' : 'Inicia sesión' },
    { icon: Download, title: 'Descarga tus datos', text: 'Obtén en PDF toda la información que tenemos sobre ti.', to: account, cta: patient ? 'Descargar' : 'Inicia sesión' },
    { icon: Trash2, title: 'Elimina tu cuenta', text: 'Cierra tu cuenta y pide que borremos tus datos.', to: '/eliminar-cuenta', cta: 'Eliminar mi cuenta' },
    { icon: ShieldCheck, title: 'Ejerce tus derechos', text: 'Pide acceso, corrección, cancelación u oposición al uso de tus datos, aunque no tengas cuenta.', to: '/derechos-arco', cta: 'Hacer una solicitud' },
    { icon: FileText, title: 'Lee el aviso de privacidad', text: 'El documento completo: qué datos usamos, para qué, con quién y por cuánto tiempo.', to: '/aviso-de-privacidad', cta: 'Ver aviso' },
  ]

  const faqs = [
    ['¿Qué datos usan y para qué?', `Tus datos de contacto para agendar y recordarte tus citas, tus datos de salud para que el doctor te atienda e integre tu expediente, y los de pago para cobrar la consulta. No vendemos tus datos ni los usamos para publicidad de terceros.`],
    ['¿Quién procesa mis datos?', `${legal} es el responsable. Los procesan, solo para atenderte, el personal del hospital según su función y los proveedores que operan el servicio por nuestra cuenta (la plataforma de citas, el envío de correos y la pasarela de pagos).`],
    ['¿Cómo elimino mis datos personales?', 'Con cuenta, desde "Eliminar mi cuenta" o tu centro de privacidad. Sin cuenta, con una solicitud de cancelación. Por ley, el expediente clínico y los datos de pagos se conservan bloqueados un tiempo; al terminar se eliminan.'],
    ['Si no tengo una cuenta, ¿cómo puedo ejercer mis derechos?', `Llena el formulario de solicitud con tu nombre y correo, o acude a recepción con tu identificación${privacyEmail ? `, o escribe a ${privacyEmail}` : ''}. Te damos un enlace para ver el avance.`],
    ['¿Cuánto tardan en responder?', 'Te respondemos en máximo 20 días hábiles y, si procede, lo hacemos efectivo en los 15 días hábiles siguientes. Es gratuito.'],
    ['¿Usan cookies?', 'Solo las indispensables para mantener tu sesión y tus preferencias de pantalla. No usamos cookies de publicidad ni de rastreo.'],
  ]

  return (
    <div>
      <section className="aurora-soft border-b border-slate-200/70">
        <div className="container-app py-10 sm:py-14">
          <p className="eyebrow mb-2 flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Centro de privacidad</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Cómo cuidamos tu privacidad</h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Protegemos tus datos y te damos el control. Aquí puedes ver cómo los usamos y decidir qué hacer con ellos.
          </p>
        </div>
      </section>

      <div className="container-app space-y-12 py-10">
        {staff && (
          <div className="flex flex-col gap-3 rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900 ring-1 ring-amber-200 sm:flex-row sm:items-center sm:justify-between">
            <p>Entraste con una cuenta del personal del hospital. Así ven esta página los pacientes; las opciones de su cuenta solo funcionan con una cuenta de paciente.</p>
            {role === 'ADMIN' && <Link to="/admin/solicitudes-arco" className="btn-secondary btn-sm shrink-0">Ver solicitudes recibidas</Link>}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => {
            const body = (
              <>
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-600"><c.icon className="h-5 w-5" /></div>
                <p className="mt-4 font-semibold text-slate-900">{c.title}</p>
                <p className="mt-1 flex-1 text-sm text-slate-600">{c.text}</p>
                {c.to
                  ? <p className="mt-4 text-sm font-semibold text-primary-700 group-hover:underline">{c.cta} →</p>
                  : <p className="mt-4 text-sm text-slate-400">Disponible con una cuenta de paciente</p>}
              </>
            )
            return c.to
              ? <Link key={c.title} to={c.to} className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lg">{body}</Link>
              : <div key={c.title} className="card flex flex-col p-5 opacity-80">{body}</div>
          })}
        </div>

        <section className="card divide-y divide-slate-100">
          <div className="flex items-start gap-4 p-5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-600"><Download className="h-5 w-5" /></div>
            <div>
              {account ? <Link to={account} className="font-semibold text-primary-700 hover:underline">Exportar tus datos</Link> : <p className="font-semibold text-slate-900">Exportar tus datos</p>}
              <p className="mt-1 text-sm text-slate-600">Descarga en PDF tus datos de contacto, tus citas, tus pagos y la constancia de los avisos que aceptaste.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600"><Trash2 className="h-5 w-5" /></div>
            <div>
              <p className="font-semibold text-slate-900">Eliminar tu información</p>
              <p className="mt-1 text-sm text-slate-600">Para eliminar tu información, puedes:</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
                <li>Corregir o borrar tus datos de contacto desde <AccountLink to={account}>tu centro de privacidad</AccountLink>.</li>
                <li>Dejar de recibir recordatorios y novedades en <AccountLink to={account}>tus preferencias</AccountLink>.</li>
                <li>Pedir que dejemos de usar o borremos datos concretos con una <Link to="/derechos-arco?tipo=CANCELLATION" className="font-medium text-primary-700 hover:underline">solicitud de cancelación</Link>, aunque no tengas cuenta.</li>
                <li><Link to="/eliminar-cuenta" className="font-medium text-primary-700 hover:underline">Eliminar tu cuenta por completo</Link>.</li>
              </ul>
              <p className="mt-2 text-xs text-slate-500">El expediente clínico y los pagos se conservan bloqueados el tiempo que marca la ley ({config?.clinicalRetentionYears || 5} y {config?.fiscalRetentionYears || 5} años) y después se eliminan.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div>
            <h2 className="mb-4 font-display text-xl font-semibold text-slate-900">Preguntas frecuentes</h2>
            <div className="card divide-y divide-slate-100">
              {faqs.map(([q, a]) => <Faq key={q} q={q} a={a} />)}
            </div>
          </div>
          <aside className="card h-fit p-5">
            <p className="flex items-center gap-2 font-semibold text-slate-900"><Users className="h-4 w-4 text-primary-600" /> Responsable de tus datos</p>
            <p className="mt-2 text-sm text-slate-700">{legal}{config?.rfc ? ` · RFC ${config.rfc}` : ''}</p>
            {config?.privacyContactName && <p className="mt-2 text-sm text-slate-600">Contacto: {config.privacyContactName}</p>}
            {privacyEmail && <p className="text-sm text-slate-600">{privacyEmail}</p>}
            {config?.contactPhone && <p className="text-sm text-slate-600">{config.contactPhone}</p>}
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <Link to="/aviso-de-privacidad" className="font-medium text-primary-700 hover:underline">Aviso de privacidad integral</Link>
              <Link to="/terminos-y-condiciones" className="font-medium text-primary-700 hover:underline">Términos y condiciones</Link>
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}

function AccountLink({ to, children }) {
  return to ? <Link to={to} className="font-medium text-primary-700 hover:underline">{children}</Link> : <span className="font-medium">{children}</span>
}

function Faq({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium text-slate-900" onClick={() => setOpen(!open)} aria-expanded={open}>
        {q} <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="px-5 pb-4 text-sm text-slate-600">{a}</p>}
    </div>
  )
}
