import { useMemo, useState } from 'react'
import { Banknote, Clock, CreditCard, Landmark, Receipt, Search, Wallet } from 'lucide-react'
import { formatDate, formatDateOnly, formatTimeOnly } from '../utils/format'
import { formatMoney } from '../utils/money'
import { downloadBlob } from '../utils/media'
import api from '../api/axios'
import { useNotify } from '../context/NotifyContext'
import { DownloadButtons } from './ReportTableView'
import { Badge } from './ui'

const METHOD_LABELS = {
  CASH: 'Efectivo',
  CARD_TERMINAL: 'Tarjeta (terminal)',
  OPENPAY_CARD: 'OpenPay tarjeta',
  OPENPAY_SPEI: 'OpenPay SPEI',
}
export const methodLabel = (m) => METHOD_LABELS[m] || m
const METHOD_ICON = { CASH: Banknote, CARD_TERMINAL: CreditCard, OPENPAY_CARD: CreditCard, OPENPAY_SPEI: Landmark }

const timeOf = (iso) => (iso ? iso.slice(11, 16) : '')

function Stat({ label, value, hint, tone = 'text-slate-900', icon: Icon }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-300" />}
      </div>
      <p className={`mt-1 font-display text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

/**
 * Detalle de un corte de caja (abierto en vivo o cerrado): totales por método, lo que debe haber
 * en la caja, cada cobro con su cita y paciente, y el desglose por doctor. Se baja en CSV,
 * Excel o PDF con el mismo contenido. Se usa en la pantalla del corte y en el historial.
 */
export default function CashCutSummary({ cut }) {
  const { notify } = useNotify()
  const [query, setQuery] = useState('')
  const [downloading, setDownloading] = useState(null)
  const closed = cut.status === 'CLOSED'
  const diff = Number(cut.difference ?? 0)
  const payments = cut.payments || []
  const valid = payments.filter((p) => p.status !== 'REFUNDED')
  const count = valid.length
  const avg = count ? Number(cut.totalCollected || 0) / count : 0
  const sortedTimes = valid.map((p) => p.createdAt).filter(Boolean).sort()

  const byMethod = useMemo(() => {
    const map = new Map()
    for (const p of valid) {
      const m = map.get(p.method) || { method: p.method, count: 0, amount: 0 }
      m.count += 1
      m.amount += Number(p.amount || 0)
      map.set(p.method, m)
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount)
  }, [payments])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = [...payments].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
    if (!q) return list
    return list.filter((p) => [p.patientName, p.doctorName, methodLabel(p.method), p.receivedByName, p.reference, `#${p.appointmentId}`]
      .some((v) => v && String(v).toLowerCase().includes(q)))
  }, [payments, query])

  async function download(format) {
    setDownloading(format)
    try {
      const r = await api.get(`/reception/cash-cut/${cut.id}/export`, { params: { format }, responseType: 'blob' })
      downloadBlob(r.data, `corte-de-caja-${cut.id}.${format}`)
    } catch {
      notify('No se pudo descargar el corte', 'error')
    } finally {
      setDownloading(null)
    }
  }

  const total = Number(cut.totalCollected || 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 text-sm text-slate-600">
          <p className="flex flex-wrap items-center gap-2">
            <Badge tone={closed ? 'slate' : 'green'} dot>{closed ? 'Cerrado' : 'Abierto'}</Badge>
            <span>Responsable: <span className="font-medium text-slate-900">{cut.userName}</span></span>
          </p>
          <p>
            Apertura: <span className="font-medium text-slate-900">{formatDate(cut.openedAt)}</span>
            {closed && <> · Cierre: <span className="font-medium text-slate-900">{formatDate(cut.closedAt)}</span>{cut.closedByName && ` (${cut.closedByName})`}</>}
          </p>
          {sortedTimes.length > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" /> Primer cobro {timeOf(sortedTimes[0])} · último {timeOf(sortedTimes[sortedTimes.length - 1])}
            </p>
          )}
        </div>
        <DownloadButtons onDownload={download} busy={downloading} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total cobrado" value={formatMoney(total)} tone="text-primary-700" icon={Wallet}
          hint={`${count} cobro${count === 1 ? '' : 's'} · ${cut.appointmentsCount ?? 0} cita${cut.appointmentsCount === 1 ? '' : 's'}`} />
        <Stat label="Efectivo" value={formatMoney(cut.totalCash)} icon={Banknote} />
        <Stat label="Tarjeta (terminal)" value={formatMoney(cut.totalCardTerminal)} icon={CreditCard} />
        <Stat label="OpenPay" value={formatMoney(cut.totalOpenpay)} icon={Landmark} />
        <Stat label="Fondo inicial" value={formatMoney(cut.openingAmount)} />
        <Stat label="Debe haber en caja" value={formatMoney(cut.expectedCash)} hint="Fondo + efectivo cobrado" tone="text-primary-700" />
        <Stat label="Ticket promedio" value={count ? formatMoney(avg) : '—'} icon={Receipt} />
        {closed ? (
          <Stat label={diff === 0 ? 'Caja cuadrada' : diff < 0 ? 'Faltante' : 'Sobrante'} value={formatMoney(Math.abs(diff))}
            tone={diff === 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-amber-600'} hint={`Contado: ${formatMoney(cut.countedCash)}`} />
        ) : (
          <Stat label="Estado" value="Abierto" tone="text-emerald-600" hint="Se cierra contando el efectivo" />
        )}
      </div>

      {(cut.openingNotes || cut.closingNotes) && (
        <div className="space-y-0.5 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
          {cut.openingNotes && <p><span className="font-semibold">Notas de apertura:</span> {cut.openingNotes}</p>}
          {cut.closingNotes && <p><span className="font-semibold">Notas de cierre:</span> {cut.closingNotes}</p>}
        </div>
      )}

      {byMethod.length > 0 && (
        <div className="rounded-2xl ring-1 ring-slate-200">
          <p className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900">Por forma de pago</p>
          <ul className="divide-y divide-slate-100">
            {byMethod.map((m) => {
              const Icon = METHOD_ICON[m.method] || Wallet
              return (
                <li key={m.method} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="w-36 font-medium text-slate-800">{methodLabel(m.method)}</span>
                  <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-primary-500" style={{ width: `${total ? (m.amount / total) * 100 : 0}%` }} />
                  </div>
                  <span className="w-20 text-right text-xs tabular-nums text-slate-500">{m.count} cobro{m.count === 1 ? '' : 's'}</span>
                  <span className="w-24 text-right font-semibold tabular-nums text-slate-900">{formatMoney(m.amount)}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="rounded-2xl ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-2.5">
          <p className="mr-auto text-sm font-semibold text-slate-900">Cobros del corte <span className="font-normal text-slate-400">({payments.length})</span></p>
          {payments.length > 5 && (
            <div className="relative w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input className="input h-8 pl-8 text-xs" placeholder="Paciente, doctor, folio..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          )}
        </div>
        {payments.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Todavía no hay cobros en este corte. Cada cobro que se registre con este corte abierto aparece aquí.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-semibold">Hora</th>
                  <th className="px-3 py-2 font-semibold">Paciente</th>
                  <th className="px-3 py-2 font-semibold">Cita</th>
                  <th className="px-3 py-2 font-semibold">Doctor</th>
                  <th className="px-3 py-2 font-semibold">Método</th>
                  <th className="px-3 py-2 font-semibold">Cobró</th>
                  <th className="px-3 py-2 text-right font-semibold">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const refunded = p.status === 'REFUNDED'
                  return (
                    <tr key={p.id} className="align-top">
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-500">{timeOf(p.createdAt)}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-900">{p.patientName}</p>
                        <p className="text-xs text-slate-400">Folio #{String(p.appointmentId).padStart(6, '0')}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                        <span className="capitalize">{formatDateOnly(p.appointmentDate)}</span>
                        {p.appointmentTime && <p className="text-xs text-slate-400">{formatTimeOnly(p.appointmentTime)}</p>}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {p.doctorName}
                        {p.specialtyName && <p className="text-xs text-slate-400">{p.specialtyName}</p>}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {methodLabel(p.method)}
                        {refunded && <Badge tone="red" className="ml-1">Reembolsado</Badge>}
                        {p.method === 'CASH' && p.cashReceived != null && (
                          <p className="text-xs text-slate-400">Recibió {formatMoney(p.cashReceived)} · cambio {formatMoney(p.changeGiven || 0)}</p>
                        )}
                        {(p.reference || p.authorizationCode) && <p className="text-xs text-slate-400">Ref: {p.reference || p.authorizationCode}</p>}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{p.receivedByName || '—'}</td>
                      <td className={`whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums ${refunded ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{formatMoney(p.amount)}</td>
                    </tr>
                  )
                })}
              </tbody>
              {!query && (
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-primary-50/60 font-semibold text-slate-900">
                    <td className="px-3 py-2" colSpan={6}>Total · {count} cobro{count === 1 ? '' : 's'}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatMoney(total)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {cut.byDoctor?.length > 0 && (
        <div className="rounded-2xl ring-1 ring-slate-200">
          <p className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900">Por doctor</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-semibold">Doctor</th>
                  <th className="px-3 py-2 text-right font-semibold">Citas</th>
                  <th className="px-3 py-2 text-right font-semibold">Efectivo</th>
                  <th className="px-3 py-2 text-right font-semibold">Terminal</th>
                  <th className="px-3 py-2 text-right font-semibold">OpenPay</th>
                  <th className="px-3 py-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cut.byDoctor.map((d) => (
                  <tr key={d.doctorId}>
                    <td className="px-3 py-2"><p className="font-medium text-slate-900">{d.doctorName}</p><p className="text-xs text-slate-400">{d.specialtyName}</p></td>
                    <td className="px-3 py-2 text-right tabular-nums">{d.appointments}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(d.cash)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(d.cardTerminal)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(d.openpay)}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatMoney(d.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
