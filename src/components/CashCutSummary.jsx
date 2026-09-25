import { formatDate, formatDateOnly, formatTimeOnly } from '../utils/format'
import { formatMoney } from '../utils/money'

const METHOD_LABELS = {
  CASH: 'Efectivo',
  CARD_TERMINAL: 'Tarjeta (terminal)',
  OPENPAY_CARD: 'OpenPay tarjeta',
  OPENPAY_SPEI: 'OpenPay SPEI',
}
export const methodLabel = (m) => METHOD_LABELS[m] || m

function Stat({ label, value, tone = 'text-gray-900', hint }) {
  return (
    <div className="border border-gray-200 rounded-xl p-3 bg-white">
      <p className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold ${tone}`}>{value}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}

/** Detalle de un corte de caja (abierto en vivo o cerrado): totales por método, lo que debe haber
 * físicamente en la caja, citas por doctor y la lista de cobros. Se usa en la pantalla del corte,
 * en el historial y (impreso) como comprobante del cierre. */
export default function CashCutSummary({ cut }) {
  const closed = cut.status === 'CLOSED'
  const diff = Number(cut.difference ?? 0)
  return (
    <div className="space-y-5">
      <div className="text-sm text-gray-600 flex flex-wrap gap-x-6 gap-y-1">
        <span>Responsable: <span className="font-medium text-gray-900">{cut.userName}</span></span>
        <span>Apertura: <span className="font-medium text-gray-900">{formatDate(cut.openedAt)}</span></span>
        {closed && <span>Cierre: <span className="font-medium text-gray-900">{formatDate(cut.closedAt)}</span>{cut.closedByName && ` (${cut.closedByName})`}</span>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Fondo inicial" value={formatMoney(cut.openingAmount)} />
        <Stat label="Efectivo cobrado" value={formatMoney(cut.totalCash)} />
        <Stat label="Tarjeta (terminal)" value={formatMoney(cut.totalCardTerminal)} />
        <Stat label="OpenPay" value={formatMoney(cut.totalOpenpay)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Total cobrado" value={formatMoney(cut.totalCollected)} tone="text-primary-700" hint={`${cut.appointmentsCount ?? 0} cita(s)`} />
        <Stat label="Debe haber en caja (efectivo)" value={formatMoney(cut.expectedCash)} tone="text-primary-700" hint="Fondo inicial + efectivo cobrado" />
        {closed ? (
          <Stat
            label={diff === 0 ? 'Caja cuadrada' : diff < 0 ? 'Faltante' : 'Sobrante'}
            value={diff === 0 ? formatMoney(0) : formatMoney(Math.abs(diff))}
            tone={diff === 0 ? 'text-green-700' : diff < 0 ? 'text-red-600' : 'text-amber-600'}
            hint={`Contado: ${formatMoney(cut.countedCash)}`}
          />
        ) : (
          <Stat label="Estado" value="Abierto" tone="text-green-700" hint="Se cierra contando el efectivo" />
        )}
      </div>

      {(cut.openingNotes || cut.closingNotes) && (
        <div className="text-xs text-gray-500 space-y-0.5">
          {cut.openingNotes && <p><span className="font-medium">Notas de apertura:</span> {cut.openingNotes}</p>}
          {cut.closingNotes && <p><span className="font-medium">Notas de cierre:</span> {cut.closingNotes}</p>}
        </div>
      )}

      <div>
        <h3 className="font-semibold text-gray-900 text-sm mb-2">Citas cobradas por doctor</h3>
        {cut.byDoctor?.length ? (
          <div className="border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Doctor</th>
                  <th className="px-3 py-2 font-medium text-right">Citas</th>
                  <th className="px-3 py-2 font-medium text-right">Efectivo</th>
                  <th className="px-3 py-2 font-medium text-right">Terminal</th>
                  <th className="px-3 py-2 font-medium text-right">OpenPay</th>
                  <th className="px-3 py-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {cut.byDoctor.map((d) => (
                  <tr key={d.doctorId} className="border-t border-gray-100">
                    <td className="px-3 py-2"><p className="font-medium text-gray-900">{d.doctorName}</p><p className="text-xs text-gray-400">{d.specialtyName}</p></td>
                    <td className="px-3 py-2 text-right">{d.appointments}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(d.cash)}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(d.cardTerminal)}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(d.openpay)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatMoney(d.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Todavía no hay cobros en este corte.</p>
        )}
      </div>

      {cut.payments?.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 text-sm mb-2">Cobros</h3>
          <div className="border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Hora</th>
                  <th className="px-3 py-2 font-medium">Paciente</th>
                  <th className="px-3 py-2 font-medium">Doctor</th>
                  <th className="px-3 py-2 font-medium">Método</th>
                  <th className="px-3 py-2 font-medium text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {cut.payments.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatTimeOnly(p.createdAt?.slice(11, 16))}</td>
                    <td className="px-3 py-2">
                      <p className="text-gray-900">{p.patientName}</p>
                      <p className="text-xs text-gray-400 capitalize">{formatDateOnly(p.appointmentDate)}</p>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{p.doctorName}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {methodLabel(p.method)}
                      {p.status === 'REFUNDED' && <span className="ml-1 text-xs text-red-600">(reembolsado)</span>}
                      {p.reference && <p className="text-xs text-gray-400">Ref: {p.reference}</p>}
                    </td>
                    <td className={`px-3 py-2 text-right font-medium ${p.status === 'REFUNDED' ? 'line-through text-gray-400' : ''}`}>{formatMoney(p.amount)}</td>
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
