import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import { X } from 'lucide-react'
import useEscapeKey from '../hooks/useEscapeKey'

/**
 * Panel lateral de detalle (se desliza desde la derecha; en celular ocupa toda la pantalla).
 * Es la forma estándar de abrir "el detalle de un registro" en todo el portal: la lista queda
 * visible detrás y es imposible no notar que se abrió (a diferencia de una tarjeta que aparece
 * abajo de la página). Las acciones del registro van en `footer`.
 */
export default function Drawer({ open, onClose, title, subtitle, badges, children, footer, width = 'max-w-xl' }) {
  useEscapeKey(open, onClose)
  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [open])
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px] animate-[fade-up_.2s_ease-out]" onClick={onClose} />
      <aside className={`absolute inset-y-0 right-0 flex w-full ${width} flex-col bg-white shadow-2xl animate-slide-in-right`}>
        <header className="flex items-start gap-3 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
            {badges && <div className="mt-2.5 flex flex-wrap items-center gap-1.5">{badges}</div>}
          </div>
          <button onClick={onClose} className="-mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="border-t border-slate-100 bg-slate-50/70 px-6 py-4">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  )
}

/** Fila etiqueta / valor dentro de un panel de detalle. */
export function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <div className="text-sm text-slate-800">{children}</div>
      </div>
    </div>
  )
}

/** Botón de acción del panel: ancho completo en celular, con ícono. */
export function DrawerAction({ icon: Icon, children, tone = 'secondary', ...props }) {
  const cls = { primary: 'btn-primary', secondary: 'btn-secondary', danger: 'btn-danger', ghost: 'btn-ghost' }[tone]
  return (
    <button type="button" className={`${cls} justify-start sm:justify-center`} {...props}>
      {Icon && <Icon className="h-4 w-4" />} {children}
    </button>
  )
}
