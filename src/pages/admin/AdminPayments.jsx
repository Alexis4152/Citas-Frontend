import { useEffect, useState } from 'react'
import { adminPaymentsReport, adminRefund, listRefundReview } from '../../api/payments'
import { searchDoctors } from '../../api/publicCatalog'
import { useNotify } from '../../context/NotifyContext'
import { formatDate, formatDateOnly, formatTimeOnly } from '../../utils/format'
import { formatMoney } from '../../utils/money'
import { methodLabel } from '../../components/CashCutSummary'
import Modal from '../../components/Modal'
import PaymentReportView from '../../components/PaymentReportView'
import SearchableSelect from '../../components/SearchableSelect'

/** Cobros (admin): ingresos por periodo y por doctor, y los reembolsos que quedaron "a
 * consideración del administrador" (cancelaciones con menos de 1 hora de anticipación y pagos por
 * SPEI, que no se pueden devolver solos). */
export default function AdminPayments() {
  const { notify } = useNotify()
  const [doctors, setDoctors] = useState([])
  const [doctorId, setDoctorId] = useState('')
  const [review, setReview] = useState([])
  const [refunding, setRefunding] = useState(null)
  const [reason, setReason] = useState('')
  const [manual, setManual] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reportKey, setReportKey] = useState(0)

  function loadReview() {
    listRefundReview().then((r) => setReview(r.data.data)).catch(() => {})
  }

  useEffect(() => {
    loadReview()
    searchDoctors({ page: 0, size: 100 }).then((r) => setDoctors(r.data.data.content)).catch(() => {})
  }, [])

  function openRefund(p) {
    setRefunding(p)
    setReason('')
    // SPEI y pagos que no son de tarjeta OpenPay se devuelven por fuera del sistema.
    setManual(p.method !== 'OPENPAY_CARD')
  }

  async function handleRefund(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await adminRefund(refunding.id, { reason: reason.trim(), manual })
      notify('Reembolso registrado', 'success')
      setRefunding(null)
      loadReview()
      setReportKey((k) => k + 1)
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo reembolsar', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cobros</h1>
        <p className="text-sm text-gray-500 mt-1">Ingresos del hospital y reembolsos por decidir. El corte de cada turno está en "Corte de caja".</p>
      </div>

      {review.length > 0 && (
        <div className="mb-6 border border-red-200 bg-red-50 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-red-200 font-semibold text-red-800 text-sm">
            Reembolsos por decidir ({review.length})
          </div>
          <ul className="divide-y divide-red-100 bg-white">
            {review.map((p) => (
              <li key={p.id} className="px-4 py-3 flex items-start justify-between gap-3 flex-wrap text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{p.patientName} · {formatMoney(p.amount)} <span className="text-gray-400 font-normal">({methodLabel(p.method)})</span></p>
                  <p className="text-xs text-gray-500">
                    {p.doctorName} · cita del <span className="capitalize">{formatDateOnly(p.appointmentDate)}, {formatTimeOnly(p.appointmentTime)}</span> · pagó el {formatDate(p.createdAt)}
                  </p>
                  <p className="text-xs text-red-700 mt-0.5">{p.refundReason}</p>
                </div>
                <button className="btn-primary text-xs shrink-0" onClick={() => openRefund(p)}>Reembolsar</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <PaymentReportView
        key={reportKey}
        fetchReport={adminPaymentsReport}
        extraParams={{ doctorId: doctorId || undefined }}
        extraFilters={(
          <div className="min-w-[220px]">
            <label className="text-xs font-medium text-gray-600 block mb-1">Doctor</label>
            <SearchableSelect
              options={doctors.map((d) => ({ value: d.id, label: `Dr(a). ${d.firstName} ${d.lastName}` }))}
              value={doctorId}
              onChange={setDoctorId}
            />
          </div>
        )}
      />

      {refunding && (
        <Modal title="Reembolsar cobro" onClose={() => setRefunding(null)} maxWidth="max-w-md">
          <form onSubmit={handleRefund} className="space-y-4">
            <p className="text-sm text-gray-700">
              {refunding.patientName} · <span className="font-semibold">{formatMoney(refunding.amount)}</span> ({methodLabel(refunding.method)})
            </p>
            <label className="block text-sm">
              <span className="block text-gray-700 mb-1 font-medium">Motivo del reembolso</span>
              <textarea required rows={3} maxLength={500} className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            {refunding.method === 'OPENPAY_CARD' ? (
              <label className="flex items-start gap-2 text-sm text-gray-600">
                <input type="checkbox" className="mt-0.5" checked={manual} onChange={(e) => setManual(e.target.checked)} />
                <span>Ya lo devolví por fuera del sistema (solo registrarlo). Si no lo marcas, se pide el reembolso a OpenPay.</span>
              </label>
            ) : (
              <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                Este pago no se puede devolver automáticamente (transferencia SPEI): devuélvelo por transferencia y aquí queda registrado.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" className="btn-secondary" onClick={() => setRefunding(null)}>Cancelar</button>
              <button type="submit" className="btn-danger" disabled={busy || !reason.trim()}>{busy ? 'Procesando...' : 'Reembolsar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
