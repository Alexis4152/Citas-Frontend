import { Loader2, Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

/**
 * Piezas visuales compartidas (lenguaje de nexora-hotel): marca del hospital, encabezado de
 * página, insignias, estado vacío, tarjetas de indicador. Todo usa las clases primary-* que
 * toman el color que el admin eligió para su hospital.
 */

/** Iniciales del hospital sobre un degradado del color de marca, cuando no hay logo. */
export function HospitalMonogram({ name = '', className = 'h-10 w-10 text-sm' }) {
  const letters = name.split(/\s+/).filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join('') || name[0] || 'H'
  return (
    <div className={`grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-700 font-display font-semibold text-white shadow-inner ${className}`}>
      {letters.toUpperCase()}
    </div>
  )
}

export function HospitalLogo({ config, className = 'h-10 w-10 text-sm' }) {
  if (config?.logoUrl) {
    return <img src={config.logoUrl} alt={config.name || ''} className={`shrink-0 rounded-xl bg-white object-contain p-1 ring-1 ring-black/5 ${className}`} />
  }
  return <HospitalMonogram name={config?.name || ''} className={className} />
}

/** Marca de Nexora (raíz de la plataforma). */
export function NexoraMark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="nx-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgb(var(--brand-400))" />
          <stop offset="1" stopColor="rgb(var(--brand-700))" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#0a0f1c" />
      <path d="M18 46V18h6l16 18V18h6v28h-6L24 28v18z" fill="url(#nx-g)" />
      <circle cx="47" cy="17" r="3.5" fill="#38bdf8" />
    </svg>
  )
}

/** Encabezado de cada pantalla de los paneles: título grande, descripción y acciones. */
export function PageHeader({ eyebrow, title, description, actions, icon: Icon }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-up">
      <div className="flex items-start gap-3.5">
        {Icon && (
          <div className="hidden h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary-600 ring-1 ring-primary-100 sm:grid">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          <h1 className="page-title">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

const TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  purple: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  brand: 'bg-primary-50 text-primary-700 ring-primary-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/15',
}

export function Badge({ tone = 'slate', children, dot, className = '' }) {
  return (
    <span className={`chip whitespace-nowrap ${TONES[tone] || TONES.slate} ${className}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

function hueFor(text = '') {
  let h = 0
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) % 360
  return h
}

export function Avatar({ first = '', last = '', src, size = 'h-9 w-9 text-xs' }) {
  if (src) return <img src={src} alt="" className={`shrink-0 rounded-full object-cover ring-2 ring-white ${size}`} />
  const hue = hueFor(`${first}${last}`)
  return (
    <div className={`grid shrink-0 place-items-center rounded-full font-semibold text-white ${size}`}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 65% 52%), hsl(${(hue + 40) % 360} 60% 38%))` }}>
      {`${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase() || '·'}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icon && (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary-50 text-primary-600 ring-1 ring-primary-100">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="font-display text-lg font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin ${className}`} />
}

/** Indicador de los tableros: número grande, etiqueta y un ícono con fondo suave. */
export function StatCard({ icon: Icon, label, value, hint, tone = 'brand', loading }) {
  const toneBox = {
    brand: 'bg-primary-50 text-primary-600 ring-primary-100',
    green: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
    red: 'bg-rose-50 text-rose-600 ring-rose-100',
    blue: 'bg-sky-50 text-sky-600 ring-sky-100',
  }[tone]
  return (
    <div className="card card-hover p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        {Icon && (
          <div className={`grid h-9 w-9 place-items-center rounded-xl ring-1 ${toneBox}`}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
        )}
      </div>
      {loading ? <Skeleton className="mt-3 h-8 w-20" /> : (
        <p className="mt-2 font-display text-[32px] font-semibold leading-none tracking-tight text-slate-900">{value}</p>
      )}
      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

/** Alterna tema claro / oscuro. */
export function ThemeToggle({ className = '' }) {
  const { dark, toggle } = useTheme()
  return (
    <button type="button" onClick={toggle} title={dark ? 'Tema claro' : 'Tema oscuro'} aria-label={dark ? 'Usar tema claro' : 'Usar tema oscuro'}
      className={`grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 ${className}`}>
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  )
}
