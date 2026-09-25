import { useEffect, useState } from 'react'
import { formatDate, localTodayIso } from '../utils/format'
import { formatMoney } from '../utils/money'
import { methodLabel } from './CashCutSummary'

/**
 * Reporte de ingresos por cobros en un rango de fechas (pago anticipado en línea + cobros de
 * recepción): total, desglose por método, citas por doctor y lista de cobros. Lo usan el doctor
 * (solo lo suyo) y el admin (todos, con selector de doctor opcional vía `extraFilters`).
 */
export default function PaymentReportView({ fetchReport, extraParams = {}, extraFilters = null, showDoctorTable = true }) {
  const [from, setFrom] = useState(localTodayIso())
  const [to, setTo] = useState(localTodayIso())
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const extraKey = JSON.stringify(extraParams)

  useEffect(() => {
    setLoading(true)
    fetchReport({ from, to, ...extraParams })
      .then((r) => setReport(r.data.data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, extraKey])

  function setRange(days) {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days)
    const pad = (n) => String(n).padStart(2, '0')
    const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    setFrom(iso(start))
    setTo(iso(end))
  }

  return (
    <div className="space-y-5">
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Desde</label>
          <input type="date" className="input" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Hasta</label>
          <input type="date" className="input" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} />
        </div>
        <div className="flex gap-2 pb-0.5">
          <button type="button" className="btn-secondary text-xs" onClick={() => setRange(0)}>Hoy</button>
          <button type="button" className="btn-secondary text-xs" onClick={() => setRange(6)}>7 días</button>
          <button type="button" className="btn-secondary text-xs" onClick={() => setRange(29)}>30 días</button>
        </div>
        {extraFilters}
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Cargando...</p>
      ) : !report ? (
        <p className="text-gray-500 text-sm">No se pudo cargar el reporte.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Stat label="Total cobrado" value={formatMoney(report.total)} tone="text-primary-700" hint={`${report.appointments} cita(s)`} />
            <Stat label="Efectivo" value={formatMoney(report.totalCash)} />
            <Stat label="Tarjeta (terminal)" value={formatMoney(report.totalCardTerminal)} />
            <Stat label="OpenPay tarjeta" value={formatMoney(report.totalOpenpayCard)} />
            <Stat label="OpenPay SPEI" value={formatMoney(report.totalOpenpaySpei)} />
            <Stat label="Reembolsado" value={formatMoney(report.totalRefunded)} tone="text-red-600" hint="No incluido en el total" />
          </div>

          {showDoctorTable && report.byDoctor?.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-900 text-sm">Por doctor</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Doctor</th>
                      <th className="px-4 py-2 font-medium text-right">Citas</th>
                      <th className="px-4 py-2 font-medium text-right">Efectivo</th>
                      <th className="px-4 py-2 font-medium text-right">Terminal</th>
                      <th className="px-4 py-2 font-medium text-right">OpenPay</th>
                      <th className="px-4 py-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byDoctor.map((d) => (
                      <tr key={d.doctorId} className="border-t border-gray-100">
                        <td className="px-4 py-2"><p className="font-medium text-gray-900">{d.doctorName}</p><p className="text-xs text-gray-400">{d.specialtyName}</p></td>
                        <td className="px-4 py-2 text-right">{d.appointments}</td>
                        <td className="px-4 py-2 text-right">{formatMoney(d.cash)}</td>
                        <td className="px-4 py-2 text-right">{formatMoney(d.cardTerminal)}</td>
                        <td className="px-4 py-2 text-right">{formatMoney(d.openpay)}</td>
                        <td className="px-4 py-2 text-right font-semibold">{formatMoney(d.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-900 text-sm">Cobros del periodo</div>
            {report.payments?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Fecha</th>
                      <th className="px-4 py-2 font-medium">Paciente</th>
                      <th className="px-4 py-2 font-medium">Doctor</th>
                      <th className="px-4 py-2 font-medium">Método</th>
                      <th className="px-4 py-2 font-medium text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.payments.map((p) => (
                      <tr key={p.id} className="border-t border-gray-100">
                        <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{formatDate(p.createdAt)}</td>
                        <td className="px-4 py-2 text-gray-900">{p.patientName}</td>
                        <td className="px-4 py-2 text-gray-600">{p.doctorName}</td>
                        <td className="px-4 py-2 text-gray-600">
                          {methodLabel(p.method)}
                          <span className="ml-1 text-xs text-gray-400">{p.channel === 'ONLINE' ? '(anticipado)' : '(recepción)'}</span>
                          {p.status === 'REFUNDED' && <span className="ml-1 text-xs text-red-600">reembolsado</span>}
                        </td>
                        <td className={`px-4 py-2 text-right font-medium ${p.status === 'REFUNDED' ? 'line-through text-gray-400' : ''}`}>{formatMoney(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-4 py-8 text-center text-gray-400 text-sm">Sin cobros en este periodo</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, tone = 'text-gray-900', hint }) {
  return (
    <div className="card p-4">
      <p className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold ${tone}`}>{value}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}
