/** Pantalla de carga completa para operaciones que tardan (agendar, cancelar, reprogramar):
 * además de avisar, bloquea el doble clic (el overlay cubre toda la pantalla). */
export default function LoadingOverlay({ show, message = 'Procesando...' }) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-ink-950/50 backdrop-blur-sm">
      <div className="mx-4 flex max-w-xs flex-col items-center gap-4 rounded-3xl bg-white px-8 py-7 text-center shadow-2xl animate-scale-in">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-primary-100" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary-600" />
        </div>
        <p className="font-medium text-slate-800">{message}</p>
      </div>
    </div>
  )
}
