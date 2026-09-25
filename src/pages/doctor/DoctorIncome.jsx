import { useEffect, useState } from 'react'
import { doctorPaymentsReport, updateOwnPrice } from '../../api/payments'
import { getOwnProfile } from '../../api/doctorPortal'
import { useNotify } from '../../context/NotifyContext'
import { formatMoney, hasPrice } from '../../utils/money'
import PaymentReportView from '../../components/PaymentReportView'

/** "Cobros" del doctor: define el precio de sus consultas y ve sus ingresos (pago anticipado en
 * línea + lo cobrado en recepción) por periodo y por método. */
export default function DoctorIncome() {
  const { notify } = useNotify()
  const [current, setCurrent] = useState(null) // precio vigente
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getOwnProfile().then((r) => {
      setCurrent(r.data.data.consultationPrice ?? null)
      setPrice(r.data.data.consultationPrice != null ? String(r.data.data.consultationPrice) : '')
    }).catch(() => {})
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await updateOwnPrice(price === '' ? null : Number(price))
      const saved = res.data.data.consultationPrice ?? null
      setCurrent(saved)
      setPrice(saved != null ? String(saved) : '')
      notify(saved ? 'Precio actualizado' : 'Precio quitado: recepción capturará el monto al cobrar', 'success')
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar el precio', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cobros</h1>
        <p className="text-sm text-gray-500 mt-1">Define el precio de tus consultas y consulta lo que has cobrado.</p>
      </div>

      <form onSubmit={handleSave} className="card p-5 sm:p-6 mb-6 max-w-xl space-y-3">
        <h2 className="font-semibold text-gray-900">Precio de mi consulta</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="block text-gray-700 mb-1 font-medium">Precio (MXN)</span>
            <input className="input w-40" type="number" min="0" step="0.01" placeholder="Sin precio"
              value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar precio'}</button>
        </div>
        <p className="text-xs text-gray-500">
          {hasPrice(current)
            ? <>Precio vigente: <span className="font-semibold text-gray-700">{formatMoney(current)}</span>. </>
            : 'Todavía no defines un precio: los pacientes no verán monto ni podrán pagar por anticipado. '}
          El cambio aplica a las citas que se agenden desde ahora; las ya agendadas conservan el precio que se les dijo.
        </p>
      </form>

      <PaymentReportView fetchReport={doctorPaymentsReport} showDoctorTable={false} />
    </div>
  )
}
