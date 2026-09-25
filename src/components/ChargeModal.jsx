import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { chargeAppointment, getCurrentCashCut, listAppointmentPayments, refreshPayment } from '../api/payments'
import { useNotify } from '../context/NotifyContext'
import { EMPTY_CARD, tokenizeFields } from '../utils/openpay'
import { formatMoney, hasPrice } from '../utils/money'
import { formatDateOnly, formatTimeOnly } from '../utils/format'
import CardFields from './CardFields'
import Modal from './Modal'

const METHODS = [
  { value: 'CASH', label: 'Efectivo', icon: '💵' },
  { value: 'CARD_TERMINAL', label: 'Tarjeta (terminal)', icon: '💳' },
  { value: 'OPENPAY_CARD', label: 'OpenPay', icon: '🌐' },
]

/**
 * Cobro de una cita ya atendida, en recepción: efectivo (calcula el cambio), tarjeta en la
 * terminal física (solo se registra) u OpenPay (la tarjeta se cobra en línea). Exige un corte
 * de caja abierto: cada cobro entra al corte de quien lo registra.
 */
export default function ChargeModal({ appointment, onClose, onPaid }) {
  const { notify } = useNotify()
  const location = useLocation()
  const cutPath = location.pathname.startsWith('/admin') ? '/admin/corte' : '/recepcion/corte'

  const [cut, setCut] = useState(undefined) // undefined = cargando, null = sin corte abierto
  const [pending, setPending] = useState(null) // transferencia SPEI pendiente de esta cita
  const [method, setMethod] = useState('CASH')
  const [amountInput, setAmountInput] = useState('')
  const [cashReceived, setCashReceived] = useState('')
  const [reference, setReference] = useState('')
  const [card, setCard] = useState(EMPTY_CARD)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const priced = hasPrice(appointment.price)
  const amount = priced ? Number(appointment.price) : Number(amountInput)
  const change = Number(cashReceived) - amount

  useEffect(() => {
    getCurrentCashCut().then((r) => setCut(r.data.data ?? null)).catch(() => setCut(null))
    listAppointmentPayments(appointment.id)
      .then((r) => setPending(r.data.data.find((p) => p.status === 'PENDING') || null))
      .catch(() => {})
  }, [appointment.id])

  async function handleVerifyPending() {
    try {
      const res = await refreshPayment(pending.id)
      if (res.data.data.status === 'COMPLETED') {
        notify('La transferencia SPEI ya se acreditó: la cita quedó pagada', 'success')
        onPaid(res.data.data)
      } else {
        notify('Todavía no se acredita la transferencia', 'error')
      }
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo verificar el pago', 'error')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!(amount > 0)) {
      setError('Captura el monto a cobrar.')
      return
    }
    if (method === 'CASH' && !(Number(cashReceived) >= amount)) {
      setError('El efectivo recibido no alcanza para cubrir el total.')
      return
    }
    setBusy(true)
    try {
      const payload = { method, amount: priced ? undefined : amount }
      if (method === 'CASH') payload.cashReceived = Number(cashReceived)
      if (method === 'CARD_TERMINAL') payload.reference = reference.trim() || undefined
      if (method === 'OPENPAY_CARD') Object.assign(payload, await tokenizeFields(card))
      const res = await chargeAppointment(appointment.id, payload)
      notify('Cobro registrado', 'success')
      onPaid(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'No se pudo registrar el cobro')
    } finally {
      setBusy(false)
    }
  }

  const patientName = `${appointment.patient?.firstName || ''} ${appointment.patient?.lastName || ''}`.trim()

  return (
    <Modal title="Cobrar consulta" onClose={busy ? () => {} : onClose} maxWidth="max-w-md">
      <div className="text-sm text-gray-600 mb-4">
        <p className="font-medium text-gray-900">{patientName}</p>
        <p>
          Dr(a). {appointment.doctor?.firstName} {appointment.doctor?.lastName} ·{' '}
          <span className="capitalize">{formatDateOnly(appointment.appointmentDate)}, {formatTimeOnly(appointment.startTime)}</span>
        </p>
      </div>

      {appointment.status === 'SCHEDULED' && (
        <p className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-4">
          El paciente aún no pasa con el doctor: al cobrar se registra su llegada y la consulta queda pagada por adelantado.
        </p>
      )}

      {cut === undefined ? (
        <p className="text-sm text-gray-500">Cargando...</p>
      ) : cut === null ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-lg p-4 space-y-3">
          <p>Para cobrar necesitas tener un <strong>corte de caja abierto</strong>: cada cobro entra a tu corte.</p>
          <Link to={cutPath} className="btn-primary inline-flex" onClick={onClose}>Abrir mi corte de caja</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {pending && (
            <div className="bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
              <span>Esta cita tiene una transferencia SPEI pendiente. Si el paciente ya transfirió, verifícalo; si paga aquí, ese intento se descarta.</span>
              <button type="button" className="btn-secondary text-xs py-1" onClick={handleVerifyPending}>Verificar pago</button>
            </div>
          )}

          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 text-center">
            <p className="text-xs text-primary-700 uppercase tracking-wide">Total a cobrar</p>
            {priced ? (
              <p className="text-3xl font-black text-primary-800">{formatMoney(amount)}</p>
            ) : (
              <>
                <p className="text-xs text-amber-700 mb-1">Este doctor no tiene precio definido: captura el monto.</p>
                <input
                  className="input text-center text-xl font-bold max-w-[180px] mx-auto"
                  type="number" min="0.01" step="0.01" placeholder="0.00"
                  value={amountInput} onChange={(e) => setAmountInput(e.target.value)}
                />
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => (
              <button
                type="button" key={m.value} onClick={() => setMethod(m.value)} disabled={busy}
                className={`rounded-lg border px-2 py-3 text-xs font-medium flex flex-col items-center gap-1 transition-colors ${
                  method === m.value ? 'border-primary-500 bg-primary-50 text-primary-800 ring-1 ring-primary-300' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="text-xl">{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>

          {method === 'CASH' && (
            <div className="space-y-2">
              <label className="block text-sm">
                <span className="block text-gray-700 mb-1 font-medium">Efectivo recibido</span>
                <input className="input" type="number" min="0" step="0.01" autoFocus placeholder="0.00"
                  value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} />
              </label>
              {amount > 0 && cashReceived !== '' && (
                <p className={`text-sm font-semibold ${change >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {change >= 0 ? `Cambio a entregar: ${formatMoney(change)}` : `Faltan ${formatMoney(-change)}`}
                </p>
              )}
            </div>
          )}

          {method === 'CARD_TERMINAL' && (
            <label className="block text-sm">
              <span className="block text-gray-700 mb-1 font-medium">Folio o autorización del voucher (opcional)</span>
              <input className="input" maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} />
              <span className="block text-xs text-gray-400 mt-1">Cobra primero en la terminal física; aquí solo se registra el pago.</span>
            </label>
          )}

          {method === 'OPENPAY_CARD' && <CardFields value={card} onChange={setCard} disabled={busy} />}

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cobrar después</button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Procesando...' : `Cobrar ${amount > 0 ? formatMoney(amount) : ''}`}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
