import { Check } from 'lucide-react'

/** Indicador de pasos de los asistentes de agendado (público y de recepción): barra de
 * progreso + pasos con check. En móvil solo se ve "Paso X de N" con el nombre del paso. */
export default function WizardSteps({ steps, currentStep }) {
  const progress = steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 100
  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-500 sm:hidden">
        <span>Paso {currentStep + 1} de {steps.length}</span>
        <span className="font-semibold text-slate-900">{steps[currentStep]}</span>
      </div>
      <div className="relative hidden sm:block">
        <div className="absolute left-4 right-4 top-4 h-0.5 rounded-full bg-slate-200" />
        <div className="absolute left-4 top-4 h-0.5 rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-500"
          style={{ width: `calc((100% - 2rem) * ${progress / 100})` }} />
        <ol className="relative flex justify-between">
          {steps.map((label, i) => {
            const done = i < currentStep
            const current = i === currentStep
            return (
              <li key={label} className="flex flex-col items-center gap-2">
                <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold transition-all ${
                  done ? 'bg-primary-600 text-white'
                    : current ? 'bg-white text-primary-700 ring-2 ring-primary-600 shadow-glow'
                      : 'bg-white text-slate-400 ring-1 ring-slate-200'}`}>
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className={`text-xs font-medium ${current ? 'text-slate-900' : done ? 'text-slate-600' : 'text-slate-400'}`}>{label}</span>
              </li>
            )
          })}
        </ol>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 sm:hidden">
        <div className="h-full rounded-full bg-primary-600 transition-all duration-500" style={{ width: `${Math.max(progress, 8)}%` }} />
      </div>
    </div>
  )
}
