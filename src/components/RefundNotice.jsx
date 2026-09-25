/** Aviso en rojo de la política de reembolso al cancelar una cita pagada por anticipado:
 * con 1 hora o más de anticipación se reembolsa; con menos, lo decide el administrador. */
export default function RefundNotice({ className = '' }) {
  return (
    <p className={`text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 ${className}`}>
      Esta cita ya está pagada. Si la cancelas con <strong>al menos 1 hora de anticipación</strong>, se te reembolsa el pago.
      Si la cancelas con <strong>menos de 1 hora</strong>, el reembolso queda a consideración del administrador del hospital.
    </p>
  )
}
