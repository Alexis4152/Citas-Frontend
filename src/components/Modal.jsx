import useEscapeKey from '../hooks/useEscapeKey'

/** Modal genérico (overlay + tarjeta) para los formularios de alta/edición de los módulos de
 * administración (Sedes, Especialidades, Recepcionistas, Pacientes) -- antes cada uno tenía
 * su formulario siempre visible arriba de la tabla, lo que dejaba la pantalla saturada; ahora
 * la tabla es la vista principal y un botón "Agregar" abre esto. Mismo overlay/Escape que ya
 * usa RescheduleModal en ReceptionAppointments.jsx, extraído aquí para no repetirlo. */
export default function Modal({ title, onClose, children, maxWidth = 'max-w-lg' }) {
  useEscapeKey(true, onClose)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[101] p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-xl shadow-xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-xl">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Cerrar">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
