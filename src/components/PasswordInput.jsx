import { useState } from 'react'
import { Check, Eye, EyeOff } from 'lucide-react'

/** Input de contraseña con botón para mostrar/ocultar (fuera del orden de tabulación) y,
 * opcionalmente, medidor de fortaleza con las reglas que exige el backend. */
export default function PasswordInput({ value, onChange, className = 'input', showStrength = false, ...rest }) {
  const [visible, setVisible] = useState(false)
  const checks = {
    length: (value || '').length >= 8,
    upper: /[A-Z]/.test(value || ''),
    digit: /\d/.test(value || ''),
  }
  const score = Object.values(checks).filter(Boolean).length
  const bars = ['bg-rose-500', 'bg-amber-400', 'bg-emerald-500']

  return (
    <div>
      <div className="relative">
        <input {...rest} type={visible ? 'text' : 'password'} value={value} onChange={onChange} className={`${className} pr-11`} />
        <button type="button" tabIndex={-1} onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {showStrength && value ? (
        <div className="mt-2.5 space-y-2">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < score ? bars[score - 1] : 'bg-slate-200'}`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
            {[['length', '8+ caracteres'], ['upper', 'Una mayúscula'], ['digit', 'Un número']].map(([k, label]) => (
              <span key={k} className={`inline-flex items-center gap-1 ${checks[k] ? 'text-emerald-600' : 'text-slate-400'}`}>
                <Check className="h-3 w-3" /> {label}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
