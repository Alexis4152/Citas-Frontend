import { detectCardBrand, formatCardNumber, formatExpiry } from '../utils/openpay'

/**
 * Campos de captura de tarjeta (solo presentación). La tokenización la hace quien lo usa con
 * tokenizeFields() de utils/openpay.js justo al confirmar -- los datos no salen del navegador.
 * `value` = { number, holder, expiry, cvv }.
 */
export default function CardFields({ value, onChange, disabled = false }) {
  const set = (field, v) => onChange({ ...value, [field]: v })
  return (
    <div className="space-y-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
      <label className="block text-sm">
        <span className="flex justify-between text-gray-700 mb-1 font-medium">
          <span>Número de tarjeta</span>
          <span className="text-primary-700 text-xs">{detectCardBrand(value.number)}</span>
        </span>
        <input
          className="input font-mono tracking-wider"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="4111 1111 1111 1111"
          maxLength={19}
          disabled={disabled}
          value={value.number}
          onChange={(e) => set('number', formatCardNumber(e.target.value))}
        />
      </label>
      <label className="block text-sm">
        <span className="block text-gray-700 mb-1 font-medium">Nombre del titular</span>
        <input
          className="input uppercase"
          autoComplete="cc-name"
          placeholder="COMO APARECE EN LA TARJETA"
          disabled={disabled}
          value={value.holder}
          onChange={(e) => set('holder', e.target.value)}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="block text-gray-700 mb-1 font-medium">Vencimiento</span>
          <input
            className="input font-mono"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/AA"
            maxLength={5}
            disabled={disabled}
            value={value.expiry}
            onChange={(e) => set('expiry', formatExpiry(e.target.value))}
          />
        </label>
        <label className="block text-sm">
          <span className="block text-gray-700 mb-1 font-medium">CVV</span>
          <input
            className="input font-mono"
            type="password"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="•••"
            maxLength={4}
            disabled={disabled}
            value={value.cvv}
            onChange={(e) => set('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
        </label>
      </div>
      <p className="text-[11px] text-gray-400">
        Pago seguro con OpenPay: los datos de tu tarjeta se envían directamente a la pasarela de pagos y el hospital nunca los guarda.
      </p>
    </div>
  )
}
