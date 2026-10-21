import { CalendarCheck2, ShieldCheck, Sparkles, Stethoscope } from 'lucide-react'
import { Link } from '../router'
import { useHospitalConfig } from '../context/HospitalConfigContext'
import { getHospitalSlug } from '../tenant'
import { HospitalLogo, NexoraMark, ThemeToggle } from '../components/ui'

/**
 * Pantalla dividida para acceso (login, registro, recuperación y cambio de contraseña), patrón
 * de nexora-hotel: a la izquierda la marca del hospital sobre fondo "aurora" con su color, a la
 * derecha el formulario. En móvil solo el formulario con un encabezado compacto.
 */
export default function AuthShell({ eyebrow, title, subtitle, children, footer, wide = false }) {
  const { config } = useHospitalConfig()
  const inHospital = Boolean(getHospitalSlug())
  const name = inHospital ? config?.name || 'Hospital' : 'Nexora Citas'

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="aurora grain relative hidden w-[46%] max-w-[720px] overflow-hidden text-white lg:flex lg:flex-col">
        <div className="grid-lines absolute inset-0" />
        <Link to="/" className="relative z-10 flex items-center gap-3 p-10">
          {inHospital ? <HospitalLogo config={config} className="h-11 w-11 text-sm" /> : <NexoraMark className="h-11 w-11" />}
          <div>
            <p className="font-display text-lg font-semibold leading-tight">{name}</p>
            <p className="text-xs text-white/60">{inHospital ? 'Citas en línea' : 'Plataforma de citas médicas'}</p>
          </div>
        </Link>

        <div className="relative z-10 mt-auto p-10 pb-14">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-sky-200 ring-1 ring-white/15">
            <Sparkles className="h-3.5 w-3.5" /> {inHospital ? 'Tu salud, a tiempo' : 'Todos tus hospitales, un solo lugar'}
          </p>
          <h2 className="font-display text-5xl font-medium leading-[1.05] tracking-tight xl:text-6xl">
            {inHospital ? (
              <>Tu cita,<br /><span className="italic text-primary-200">sin filas ni llamadas.</span></>
            ) : (
              <>Cada hospital,<br /><span className="italic text-primary-200">su propia agenda.</span></>
            )}
          </h2>
          <div className="mt-10 grid max-w-md grid-cols-2 gap-3">
            {(inHospital
              ? [[CalendarCheck2, 'Horarios en vivo', 'Ves lo disponible al momento'], [ShieldCheck, 'Tus datos protegidos', 'Tú decides sobre tus datos']]
              : [[Stethoscope, 'Datos aislados', 'Cada hospital ve solo lo suyo'], [ShieldCheck, 'Acceso seguro', 'Sesiones cortas y cifradas']]
            ).map(([Icon, t, d]) => (
              <div key={t} className="glass rounded-2xl p-4">
                <Icon className="mb-2 h-5 w-5 text-primary-300" />
                <p className="text-sm font-semibold">{t}</p>
                <p className="text-xs text-white/60">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="relative flex flex-1 flex-col">
        <div className="flex items-center justify-between p-5 sm:p-8">
          <Link to="/" className="flex items-center gap-2.5 lg:invisible">
            {inHospital ? <HospitalLogo config={config} className="h-9 w-9 text-sm" /> : <NexoraMark className="h-9 w-9" />}
            <span className="font-display font-semibold text-slate-900">{name}</span>
          </Link>
          <div className="flex items-center gap-2">
            {inHospital && <Link to="/" className="text-sm font-medium text-slate-500 hover:text-slate-900">Volver al sitio</Link>}
            <ThemeToggle />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-16 sm:px-8">
          <div className={`w-full animate-fade-up ${wide ? 'max-w-[480px]' : 'max-w-[400px]'}`}>
            {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
            <h1 className="font-display text-[34px] font-semibold leading-tight tracking-tight text-slate-900">{title}</h1>
            {subtitle && <p className="mt-2 text-[15px] text-slate-500">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 text-center text-sm text-slate-500">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  )
}

/** Caja de error/aviso dentro de los formularios de acceso. */
export function FormAlert({ tone = 'error', children }) {
  const cls = tone === 'success'
    ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/20'
    : 'bg-rose-50 text-rose-700 ring-rose-600/20'
  return <div className={`mb-5 rounded-xl px-4 py-3 text-sm ring-1 ring-inset ${cls}`} role="alert">{children}</div>
}
