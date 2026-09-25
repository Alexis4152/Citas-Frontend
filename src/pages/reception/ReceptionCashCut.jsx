import { useEffect, useState } from 'react'
import { closeCashCut, getCashCut, getCurrentCashCut, listCashCuts, openCashCut } from '../../api/payments'
import { useAuth } from '../../context/AuthContext'
import { useNotify } from '../../context/NotifyContext'
import { formatDate } from '../../utils/format'
import { formatMoney } from '../../utils/money'
import AdminPagination from '../../components/AdminPagination'
import CashCutSummary from '../../components/CashCutSummary'
import LoadingOverlay from '../../components/LoadingOverlay'
import Modal from '../../components/Modal'
import usePolling from '../../hooks/usePolling'

/**
 * Corte de caja del turno (recepción y admin): se abre con el fondo inicial, cada cobro entra a
 * este corte, y al cerrar se cuenta el efectivo y el sistema dice si cuadra. Muestra las citas
 * cobradas por doctor y cuánto por método (efectivo / tarjeta / OpenPay). El admin además ve los
 * cortes de todas las personas en el historial.
 */
export default function ReceptionCashCut() {
  const { notify } = useNotify()
  const { isAdmin } = useAuth()
  const [cut, setCut] = useState(undefined) // undefined = cargando, null = sin corte abierto
  const [openingAmount, setOpeningAmount] = useState('')
  const [openingNotes, setOpeningNotes] = useState('')
  const [closing, setClosing] = useState(false)
  const [countedCash, setCountedCash] = useState('')
  const [closingNotes, setClosingNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const [history, setHistory] = useState({ content: [], page: 0, totalPages: 0, totalElements: 0 })
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [viewing, setViewing] = useState(null)

  function loadCurrent() {
    getCurrentCashCut().then((r) => setCut(r.data.data ?? null)).catch(() => setCut(null))
  }
  function loadHistory() {
    listCashCuts({ page, size }).then((r) => setHistory(r.data.data)).catch(() => {})
  }

  useEffect(() => { loadCurrent() }, [])
  useEffect(() => { loadHistory() }, [page, size])
  // Los totales del corte abierto se refrescan solos (otros cobros, pagos que se acreditan).
  usePolling(loadCurrent, 30000)

  async function handleOpen(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await openCashCut({ openingAmount: Number(openingAmount || 0), notes: openingNotes.trim() || undefined })
      setCut(res.data.data)
      setOpeningAmount('')
      setOpeningNotes('')
      notify('Corte de caja abierto', 'success')
      loadHistory()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo abrir el corte', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleClose(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await closeCashCut(cut.id, { countedCash: Number(countedCash || 0), notes: closingNotes.trim() || undefined })
      setClosing(false)
      setCountedCash('')
      setClosingNotes('')
      setCut(null)
      setViewing(res.data.data)
      notify('Corte de caja cerrado', 'success')
      loadHistory()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo cerrar el corte', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleView(id) {
    try {
      const res = await getCashCut(id)
      setViewing(res.data.data)
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo abrir el corte', 'error')
    }
  }

  const difference = cut && countedCash !== '' ? Number(countedCash) - Number(cut.expectedCash) : null

  return (
    <div>
      <LoadingOverlay show={busy} message="Guardando..." />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Corte de caja</h1>
        <p className="text-sm text-gray-500 mt-1">Cada cobro que registras entra a tu corte. Al terminar tu turno, cuenta el efectivo y ciérralo.</p>
      </div>

      {cut === undefined ? (
        <p className="text-gray-500 text-sm">Cargando...</p>
      ) : cut === null ? (
        <form onSubmit={handleOpen} className="card p-5 sm:p-6 max-w-lg space-y-4 mb-8">
          <h2 className="font-semibold text-gray-900">Abrir corte de caja</h2>
          <p className="text-sm text-gray-500">No tienes un corte abierto. Ábrelo con el efectivo con el que inicias tu turno para poder cobrar.</p>
          <label className="block text-sm">
            <span className="block text-gray-700 mb-1 font-medium">Fondo inicial (efectivo en caja)</span>
            <input required className="input" type="number" min="0" step="0.01" placeholder="0.00" autoFocus
              value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="block text-gray-700 mb-1 font-medium">Notas (opcional)</span>
            <input className="input" maxLength={500} value={openingNotes} onChange={(e) => setOpeningNotes(e.target.value)} />
          </label>
          <button type="submit" className="btn-primary" disabled={busy}>Abrir corte</button>
        </form>
      ) : (
        <div className="card p-5 sm:p-6 mb-8">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <h2 className="font-semibold text-gray-900">Mi corte abierto</h2>
            <button className="btn-primary" onClick={() => setClosing(true)}>Cerrar corte</button>
          </div>
          <CashCutSummary cut={cut} />
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{isAdmin ? 'Historial de cortes (todos)' : 'Mis cortes anteriores'}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Responsable</th>
                <th className="px-4 py-3 font-medium">Apertura</th>
                <th className="px-4 py-3 font-medium">Cierre</th>
                <th className="px-4 py-3 font-medium text-right">Cobrado</th>
                <th className="px-4 py-3 font-medium text-right">Diferencia</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {history.content.map((c) => {
                const diff = Number(c.difference ?? 0)
                return (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-900">{c.userName}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(c.openedAt)}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.status === 'OPEN' ? <span className="text-green-700 font-medium">Abierto</span> : formatDate(c.closedAt)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatMoney(c.totalCollected)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${c.status === 'OPEN' ? 'text-gray-300' : diff === 0 ? 'text-green-700' : diff < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                      {c.status === 'OPEN' ? '—' : diff === 0 ? 'Cuadra' : `${diff < 0 ? '-' : '+'}${formatMoney(Math.abs(diff))}`}
                    </td>
                    <td className="px-4 py-3 text-right"><button className="text-primary-700 hover:underline" onClick={() => handleView(c.id)}>Ver</button></td>
                  </tr>
                )
              })}
              {history.content.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin cortes todavía</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination
          page={history.page} size={size} totalPages={history.totalPages} totalElements={history.totalElements}
          contentLength={history.content.length}
          onPageChange={setPage} onSizeChange={(s) => { setSize(s); setPage(0) }}
        />
      </div>

      {closing && cut && (
        <Modal title="Cerrar corte de caja" onClose={() => setClosing(false)} maxWidth="max-w-md">
          <form onSubmit={handleClose} className="space-y-4">
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 text-center">
              <p className="text-xs text-primary-700 uppercase tracking-wide">Debe haber en caja (efectivo)</p>
              <p className="text-3xl font-black text-primary-800">{formatMoney(cut.expectedCash)}</p>
              <p className="text-xs text-primary-700 mt-1">Fondo {formatMoney(cut.openingAmount)} + efectivo cobrado {formatMoney(cut.totalCash)}</p>
            </div>
            <label className="block text-sm">
              <span className="block text-gray-700 mb-1 font-medium">Efectivo contado en caja</span>
              <input required autoFocus className="input" type="number" min="0" step="0.01" placeholder="0.00"
                value={countedCash} onChange={(e) => setCountedCash(e.target.value)} />
            </label>
            {difference !== null && (
              <p className={`text-sm font-semibold ${difference === 0 ? 'text-green-700' : difference < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                {difference === 0 ? 'La caja cuadra ✓' : difference < 0 ? `Faltan ${formatMoney(-difference)}` : `Sobran ${formatMoney(difference)}`}
              </p>
            )}
            <label className="block text-sm">
              <span className="block text-gray-700 mb-1 font-medium">Notas del cierre (opcional)</span>
              <input className="input" maxLength={500} value={closingNotes} onChange={(e) => setClosingNotes(e.target.value)} />
            </label>
            <p className="text-xs text-gray-400">Al cerrar ya no podrás registrar cobros en este corte; para cobrar de nuevo abrirás uno nuevo.</p>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" className="btn-secondary" onClick={() => setClosing(false)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={busy}>Cerrar corte</button>
            </div>
          </form>
        </Modal>
      )}

      {viewing && (
        <Modal title={`Corte de caja #${viewing.id}`} onClose={() => setViewing(null)} maxWidth="max-w-4xl">
          <CashCutSummary cut={viewing} />
          <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-100">
            <button className="btn-secondary" onClick={() => window.print()}>Imprimir</button>
            <button className="btn-primary" onClick={() => setViewing(null)}>Cerrar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
