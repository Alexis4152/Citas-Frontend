/** Indicador de pasos para los asistentes de agendado (público y de recepción): paso
 * actual resaltado con anillo, pasos completados en color sólido con check, línea de
 * conexión que se va "llenando" con el avance -- mismo lenguaje visual en ambos wizards. */
export default function WizardSteps({ steps, currentStep }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 mb-8 text-sm flex-wrap">
      {steps.map((label, i) => {
        const isDone = i < currentStep
        const isCurrent = i === currentStep
        return (
          <div key={label} className="flex items-center gap-2 sm:gap-3">
            <span
              className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center font-semibold text-xs transition-colors ${
                isDone
                  ? 'bg-primary-600 text-white'
                  : isCurrent
                  ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {isDone ? '✓' : i + 1}
            </span>
            <span className={`font-medium whitespace-nowrap ${isCurrent ? 'text-gray-900' : isDone ? 'text-gray-600' : 'text-gray-400'}`}>
              {label}
            </span>
            {i < steps.length - 1 && (
              <span className={`w-6 sm:w-10 h-0.5 rounded transition-colors ${isDone ? 'bg-primary-600' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
