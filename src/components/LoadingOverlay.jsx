/** Pantalla de carga a pantalla completa para operaciones que tardan un poco (agendar,
 * cancelar, reprogramar) -- más visible que solo deshabilitar el botón y cambiar su texto,
 * y sirve además como bloqueo físico contra doble clic (el overlay cubre toda la pantalla). */
export default function LoadingOverlay({ show, message = 'Procesando...' }) {
  if (!show) return null
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300]">
      <div className="bg-white rounded-xl shadow-xl px-8 py-7 flex flex-col items-center gap-4 max-w-xs mx-4 text-center">
        <div className="h-12 w-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-gray-800 font-medium">{message}</p>
      </div>
    </div>
  )
}
