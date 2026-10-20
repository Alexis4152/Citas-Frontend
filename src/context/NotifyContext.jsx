import { createContext, useCallback, useContext, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import useEscapeKey from '../hooks/useEscapeKey'

const NotifyContext = createContext(null)

let idCounter = 0

const TOAST_STYLES = {
  error: { bar: 'bg-rose-500', icon: AlertTriangle, iconClass: 'text-rose-500' },
  success: { bar: 'bg-emerald-500', icon: CheckCircle2, iconClass: 'text-emerald-500' },
  info: { bar: 'bg-primary-500', icon: Info, iconClass: 'text-primary-500' },
  warning: { bar: 'bg-amber-500', icon: AlertTriangle, iconClass: 'text-amber-500' },
}

/** Reemplaza alert()/confirm() nativos por avisos flotantes y un modal de confirmación con
 * el estilo de la app. */
export function NotifyProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState(null)

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const notify = useCallback((message, type = 'error') => {
    const id = ++idCounter
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => dismiss(id), 5000)
  }, [dismiss])

  const confirmDialog = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      setConfirmState({ message, opts, resolve })
    })
  }, [])

  function handleConfirm(result) {
    confirmState?.resolve(result)
    setConfirmState(null)
  }

  useEscapeKey(!!confirmState, () => handleConfirm(false))

  return (
    <NotifyContext.Provider value={{ notify, confirmDialog }}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[400] flex w-full max-w-sm flex-col gap-2" aria-live="polite">
        {toasts.map((t) => {
          const style = TOAST_STYLES[t.type] ?? TOAST_STYLES.error
          const Icon = style.icon
          return (
            <div key={t.id}
              className="pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-2xl bg-white px-4 py-3.5 text-sm text-slate-700 shadow-lift ring-1 ring-slate-200 animate-slide-in-right">
              <span className={`absolute inset-y-0 left-0 w-1 ${style.bar}`} />
              <Icon className={`mt-0.5 h-[18px] w-[18px] shrink-0 ${style.iconClass}`} />
              <p className="flex-1 leading-snug">{t.message}</p>
              <button className="text-slate-400 hover:text-slate-700" onClick={() => dismiss(t.id)} aria-label="Cerrar aviso">
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>

      {confirmState && (
        <div className="fixed inset-0 z-[401] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => handleConfirm(false)} />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-scale-in">
            <div className={`mb-4 grid h-11 w-11 place-items-center rounded-2xl ${confirmState.opts.danger === false ? 'bg-primary-50 text-primary-600' : 'bg-rose-50 text-rose-600'}`}>
              {confirmState.opts.danger === false ? <Info className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </div>
            {confirmState.opts.title && <h3 className="mb-1.5 font-display text-lg font-semibold text-slate-900">{confirmState.opts.title}</h3>}
            <p className="mb-6 text-sm text-slate-600">{confirmState.message}</p>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => handleConfirm(false)}>
                {confirmState.opts.cancelText ?? 'Cancelar'}
              </button>
              <button className={confirmState.opts.danger === false ? 'btn-primary' : 'btn-danger'} onClick={() => handleConfirm(true)}>
                {confirmState.opts.confirmText ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotifyContext.Provider>
  )
}

export const useNotify = () => useContext(NotifyContext)
