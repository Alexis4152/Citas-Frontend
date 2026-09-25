import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getCurrentCashCut } from '../../api/payments'
import { lookupChargeAppointments } from '../../api/reception'
import { useNotify } from '../../context/NotifyContext'
import { formatDate, formatDateOnly, formatTimeOnly, localTodayIso } from '../../utils/format'
import { formatMoney, hasPrice } from '../../utils/money'
import StatusBadge, { AppointmentFlags, PaymentBadge } from '../../components/StatusBadge'
import ChargeModal from '../../components/ChargeModal'
import QrScannerModal from '../../components/QrScannerModal'
import usePolling from '../../hooks/usePolling'

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
const FOLIO_RE = /^#?\d{1,9}$/

/** Se puede cobrar una cita ya atendida, o una programada de HOY (el paciente paga en el
 * mostrador antes de pasar con el doctor), mientras no esté pagada. */
function chargeability(a) {
  if (a.paymentStatus === 'PAID') return { ok: false, reason: 'Ya pagada' }
  if (a.paymentStatus === 'REFUNDED') return { ok: false, reason: 'Pago reembolsado' }
  if (a.status === 'CANCELLED') return { ok: false, reason: 'Cita cancelada' }
  if (a.status === 'NO_SHOW') return { ok: false, reason: 'Marcada como no asistió (corrígela primero)' }
  if (a.status === 'SCHEDULED' && a.appointmentDate !== localTodayIso()) return { ok: false, reason: 'Es una cita de otro día' }
  return { ok: true }
}

/**
 * Módulo de cobro de recepción: encuentra la cita del paciente que está en el mostrador escaneando el
 * QR de su comprobante (con la cámara o con un lector USB), escribiendo el folio o buscando por
 * nombre/teléfono -- y ahí mismo le cobra. Sin búsqueda muestra la cola de "por cobrar".
 * Complementa (no reemplaza) el cobro que se abre al marcar una cita como atendida.
 */
export default function ReceptionCharge() {
  const { notify } = useNotify()
  const cutPath = useLocation().pathname.startsWith('/admin') ? '/admin/corte' : '/recepcion/corte'
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [cut, setCut] = useState(undefined)
  const [scanning, setScanning] = useState(false)
  const [charging, setCharging] = useState(null)
  const [justPaid, setJustPaid] = useState(null)

  const loadCut = useCallback(() => {
    getCurrentCashCut().then((r) => setCut(r.data.data ?? null)).catch(() => setCut(null))
  }, [])

  const search = useCallback(async (q, { auto = false, silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const res = await lookupChargeAppointments(q)
      const list = res.data.data
      setResults(list)
      setActiveQuery(q)
      // QR o folio: un solo resultado que se puede cobrar se abre directo (la idea es ir rápido).
      if (auto && list.length === 1 && chargeability(list[0]).ok) setCharging(list[0])
      if (auto && list.length === 0) notify('No encontramos ninguna cita con ese dato', 'error')
    } catch (err) {
      if (!silent) notify(err.response?.data?.message || 'No se pudo buscar', 'error')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [notify])

  useEffect(() => { loadCut(); search('') }, [loadCut, search])
  // La cola de "por cobrar" se refresca sola cuando no hay una búsqueda en curso.
  usePolling(() => { if (!activeQuery && !charging) { search('', { silent: true }); loadCut() } }, 30000)

  function handleSubmit(e) {
    e.preventDefault()
    const q = query.trim()
    // Un lector USB "teclea" la URL del QR y pulsa Enter; un folio o un código también entran directo.
    search(q, { auto: !!q && (UUID_RE.test(q) || FOLIO_RE.test(q)) })
  }

  function handleScanned(text) {
    setScanning(false)
    setQuery(text)
    search(text.trim(), { auto: true })
  }

  function handlePaid() {
    const paid = charging
    setCharging(null)
    setJustPaid(paid)
    setQuery('')
    search('')
    loadCut()
    inputRef.current?.focus()
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cobrar</h1>
        <p className="text-sm text-gray-500 mt-1">Escanea el QR del comprobante, escribe el folio o busca al paciente, y cóbrale aquí mismo.</p>
      </div>

      {cut === null && (
        <div className="mb-5 bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-lg px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <span>No tienes un corte de caja abierto: <strong>ábrelo antes de cobrar</strong>, cada cobro entra a tu corte.</span>
          <Link to={cutPath} className="btn-primary text-sm">Abrir corte de caja</Link>
        </div>
      )}
      {cut && (
        <p className="mb-5 text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2 inline-block">
          Corte abierto desde {formatDate(cut.openedAt)} · cobrado: <strong>{formatMoney(cut.totalCollected)}</strong> ·{' '}
          <Link to={cutPath} className="underline">ver corte</Link>
        </p>
      )}

      {justPaid && (
        <div className="mb-5 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg px-4 py-3 flex items-center justify-between gap-3">
          <span>✓ Cobro registrado: <strong>{justPaid.patient?.firstName} {justPaid.patient?.lastName}</strong>. Listo para el siguiente paciente.</span>
          <button className="text-green-700 hover:underline text-xs" onClick={() => setJustPaid(null)}>Cerrar</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-4 mb-5 flex flex-col sm:flex-row gap-3">
        <input
          ref={inputRef}
          autoFocus
          className="input flex-1 text-base"
          placeholder="Escanea el QR, escribe el folio (#123) o busca por nombre o teléfono"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex gap-2">
          <button type="submit" className="btn-primary">Buscar</button>
          <button type="button" className="btn-secondary" onClick={() => setScanning(true)}>📷 Escanear QR</button>
        </div>
      </form>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900 text-sm">{activeQuery ? 'Resultados' : 'Por cobrar ahora'}</h2>
          {activeQuery && <button className="text-xs text-primary-700 hover:underline" onClick={() => { setQuery(''); search('') }}>Ver por cobrar</button>}
        </div>
        {loading ? (
          <p className="text-gray-500 text-sm p-4">Buscando...</p>
        ) : results.length === 0 ? (
          <p className="px-4 py-10 text-center text-gray-400 text-sm">
            {activeQuery ? 'Sin resultados.' : 'No hay citas por cobrar. Cuando alguien llegue, escanea su QR o búscalo arriba.'}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {results.map((a) => {
              const c = chargeability(a)
              return (
                <li key={a.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">
                      {a.patient?.firstName} {a.patient?.lastName}
                      <span className="text-xs text-gray-400 font-normal ml-2">Folio #{a.id} · {a.patient?.phone}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Dr(a). {a.doctor?.firstName} {a.doctor?.lastName} ·{' '}
                      <span className="capitalize">{formatDateOnly(a.appointmentDate)}, {formatTimeOnly(a.startTime)}</span>
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-y-1">
                      <StatusBadge status={a.status} /><AppointmentFlags appointment={a} /><PaymentBadge appointment={a} />
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{hasPrice(a.price) ? formatMoney(a.price) : 'Sin precio'}</p>
                    </div>
                    {c.ok ? (
                      <button className="btn-primary" onClick={() => setCharging(a)}>Cobrar</button>
                    ) : (
                      <span className="text-xs text-gray-400 max-w-[150px] text-right">{c.reason}</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {scanning && <QrScannerModal onResult={handleScanned} onClose={() => setScanning(false)} />}
      {charging && <ChargeModal appointment={charging} onClose={() => setCharging(null)} onPaid={handlePaid} />}
    </div>
  )
}
