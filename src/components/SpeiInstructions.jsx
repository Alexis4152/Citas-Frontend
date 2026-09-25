import { useState } from 'react'
import { formatMoney } from '../utils/money'

/** Datos para que el paciente haga su transferencia SPEI (CLABE, banco, monto exacto). */
export default function SpeiInstructions({ payment, amount }) {
  const [copied, setCopied] = useState('')
  if (!payment) return null

  async function copy(text, key) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied((c) => (c === key ? '' : c)), 2500)
    } catch {
      /* el usuario puede seleccionar el texto manualmente */
    }
  }

  return (
    <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 text-sm space-y-3">
      <p className="font-semibold text-blue-900">Transferencia SPEI pendiente</p>
      <div>
        <p className="text-xs text-blue-700 uppercase tracking-wide">Monto exacto a transferir</p>
        <p className="text-2xl font-black text-blue-900">
          {formatMoney(amount ?? payment.amount)}
          <button type="button" onClick={() => copy(Number(amount ?? payment.amount).toFixed(2), 'amount')}
            className="ml-2 text-xs font-medium text-blue-700 underline align-middle">
            {copied === 'amount' ? '¡Copiado!' : 'Copiar'}
          </button>
        </p>
      </div>
      <div>
        <p className="text-xs text-blue-700 uppercase tracking-wide">CLABE (18 dígitos)</p>
        <p className="font-mono text-lg font-bold text-blue-900 select-all break-all">
          {payment.speiClabe}
          <button type="button" onClick={() => copy(payment.speiClabe, 'clabe')}
            className="ml-2 text-xs font-medium text-blue-700 underline align-middle font-sans">
            {copied === 'clabe' ? '¡Copiado!' : 'Copiar'}
          </button>
        </p>
      </div>
      <p className="text-blue-900"><span className="font-medium">Banco:</span> {payment.speiBank || '—'}</p>
      <p className="text-xs text-blue-800">
        Desde la app de tu banco entra a Transferencias / SPEI, registra esa CLABE y transfiere el monto exacto.
        En cuanto se acredite, tu cita queda pagada automáticamente. Si prefieres, también puedes pagar en recepción.
      </p>
    </div>
  )
}
