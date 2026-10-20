import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Link } from '../../router'
import { getCurrentCashCut } from '../../api/payments'
import { lookupChargeAppointments, getChargeToConfirm } from '../../api/reception'
import { useNotify } from '../../context/NotifyContext'
import { formatDate, formatDateOnly, formatTimeOnly, localTodayIso } from '../../utils/format'
import { formatMoney, hasPrice } from '../../utils/money'
import { AppointmentBadges } from '../../components/StatusBadge'
import AppointmentDetailCard, { isOverdueWithoutArrival } from '../../components/AppointmentDetailCard'
import * as receptionApi from '../../api/reception'
import * as doctorApi from '../../api/doctorPortal'
import { useAuth } from '../../context/AuthContext'
import { AlertTriangle, ChevronRight, QrCode, Search, UserCheck, UserX } from 'lucide-react'
import { PageHeader } from '../../components/ui'
import ChargeModal from '../../components/ChargeModal'
import QrScannerModal from '../../components/QrScannerModal'
import usePolling from '../../hooks/usePolling'
import { staffBasePath } from '../../utils/staffPath'

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
  const { isDoctor } = useAuth()
  // El doctor marca llegada / no asistió con sus propios endpoints (solo sus citas).
  const statusApi = isDoctor ? doctorApi : receptionApi
  const [selected, setSelected] = useState(null)
  const [busyAction, setBusyAction] = useState(null)
  const cutPath = `${staffBasePath(useLocation().pathname)}/corte`
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [cut, setCut] = useState(undefined)
  const [scanning, setScanning] = useState(false)
  const [charging, setCharging] = useState(null)
  const [justPaid, setJustPaid] = useState(null)
  // "Confirma si llegó": citas cuya hora ya pasó y nadie registró la llegada.
  const [toConfirm, setToConfirm] = useState([])
  const [confirmingId, setConfirmingId] = useState(null)
  const { confirmDialog } = useNotify()

  const loadToConfirm = useCallback(() => {
    getChargeToConfirm().then((r) => setToConfirm(r.data.data)).catch(() => setToConfirm([]))
  }, [])

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

  useEffect(() => { loadCut(); search(''); loadToConfirm() }, [loadCut, search, loadToConfirm])
  // La cola de "por cobrar" se refresca sola cuando no hay una búsqueda en curso.
  usePolling(() => { if (!activeQuery && !charging) { search('', { silent: true }); loadCut(); loadToConfirm() } }, 30000)

  /** "Llegó": si la cita es de hoy se registra la llegada; si es de un día anterior se marca
   * atendida (la llegada solo se registra el mismo día). Después se abre el cobro si debe algo. */
  async function confirmArrived(a) {
    setConfirmingId(a.id)
    try {
      const today = a.appointmentDate === localTodayIso()
      const res = today ? await statusApi.markAppointmentArrived(a.id) : await statusApi.markAppointmentCompleted(a.id)
      const updated = res.data?.data || { ...a, ...(today ? { arrivedAt: new Date().toISOString() } : { status: 'COMPLETED' }) }
      loadToConfirm()
      search('', { silent: true })
      if (chargeability(updated).ok && hasPrice(updated.price)) {
        setCharging(updated)
      } else {
        notify(today ? 'Llegada registrada' : 'Marcada como atendida', 'success')
      }
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo actualizar la cita', 'error')
    } finally {
      setConfirmingId(null)
    }
  }

  async function confirmNoShow(a) {
    if (!(await confirmDialog(`¿${a.patient?.firstName} ${a.patient?.lastName} no vino a su cita?`, { confirmText: 'No asistió' }))) return
    setConfirmingId(a.id)
    try {
      await statusApi.markAppointmentNoShow(a.id)
      notify('Marcada como no asistió', 'success')
      loadToConfirm()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo actualizar la cita', 'error')
    } finally {
      setConfirmingId(null)
    }
  }

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

  async function runStatus(kind, fn, okMsg) {
    setBusyAction(kind)
    try {
      await fn(selected.id)
      notify(okMsg, 'success')
      setSelected(null)
      search(activeQuery, { silent: true })
      loadToConfirm()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo actualizar la cita', 'error')
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div>
      <PageHeader icon={QrCode} eyebrow="Caja" title="Cobrar"
        description="Escanea el QR del comprobante, escribe el folio o busca al paciente. Toca una cita para cobrarla." />

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
          <button type="submit" className="btn-primary"><Search className="h-4 w-4" /> Buscar</button>
          <button type="button" className="btn-secondary" onClick={() => setScanning(true)}><QrCode className="h-4 w-4" /> Escanear QR</button>
        </div>
      </form>

      {!activeQuery && toConfirm.length > 0 && (
        <div className="card mb-5 overflow-hidden ring-1 ring-amber-200">
          <div className="flex items-center gap-3 border-b border-amber-100 bg-amber-50 px-5 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-amber-900">Confirma si llegó ({toConfirm.length})</h2>
              <p className="text-xs text-amber-800">Ya pasó su hora y nadie registró la llegada. Confírmalo para cobrar o cerrar la cita.</p>
            </div>
          </div>
          <ul className="divide-y divide-slate-100">
            {toConfirm.map((a) => {
              const busy = confirmingId === a.id
              return (
                <li key={a.id} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center">
                  <button onClick={() => setSelected(a)} className="min-w-0 flex-1 text-left">
                    <p className="font-medium text-slate-900">
                      {a.patient?.firstName} {a.patient?.lastName}
                      <span className="ml-2 text-xs font-normal text-slate-400">Folio #{a.id} · {a.patient?.phone}</span>
                    </p>
                    <p className="text-sm text-slate-600">
                      <span className="capitalize">{formatDateOnly(a.appointmentDate)}, {formatTimeOnly(a.startTime)}</span>
                      {' · '}Dr(a). {a.doctor?.firstName} {a.doctor?.lastName}
                      {hasPrice(a.price) && <> · {formatMoney(a.price)}</>}
                    </p>
                  </button>
                  <div className="flex shrink-0 gap-2">
                    <button className="btn-primary btn-sm" disabled={busy} onClick={() => confirmArrived(a)}>
                      <UserCheck className="h-3.5 w-3.5" /> {busy ? 'Guardando...' : hasPrice(a.price) && a.paymentStatus !== 'PAID' ? 'Llegó → Cobrar' : 'Llegó'}
                    </button>
                    <button className="btn-secondary btn-sm" disabled={busy} onClick={() => confirmNoShow(a)}>
                      <UserX className="h-3.5 w-3.5" /> No asistió
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900 text-sm">{activeQuery ? 'Resultados' : 'Por cobrar ahora'}</h2>
          {activeQuery && <button className="text-xs text-primary-700 hover:underline" onClick={() => { setQuery(''); search('') }}>Ver por cobrar</button>}
        </div>
        {loading ? (
          <p className="text-gray-500 text-sm p-4">Buscando...</p>
        ) : results.length === 0 ? (
          <p className="px-4 py-10 text-center text-gray-400 text-sm">
            {activeQuery ? 'Sin resultados.' : 'No hay citas por cobrar. Cuando alguien llegue, registra su llegada, escanea su QR o búscalo arriba.'}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {results.map((a) => {
              const c = chargeability(a)
              return (
                <li key={a.id}>
                  <button onClick={() => setSelected(a)} className="group flex w-full flex-col gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">
                        {a.patient?.firstName} {a.patient?.lastName}
                        <span className="ml-2 text-xs font-normal text-slate-400">Folio #{a.id} · {a.patient?.phone}</span>
                      </p>
                      <p className="text-sm text-slate-600">
                        Dr(a). {a.doctor?.firstName} {a.doctor?.lastName} ·{' '}
                        <span className="capitalize">{formatDateOnly(a.appointmentDate)}, {formatTimeOnly(a.startTime)}</span>
                      </p>
                      <div className="mt-1.5"><AppointmentBadges appointment={a} /></div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 sm:text-right">
                      <div>
                        <p className="font-display text-lg font-semibold tabular-nums text-slate-900">{hasPrice(a.price) ? formatMoney(a.price) : 'Sin precio'}</p>
                        <p className={`text-xs ${c.ok ? 'font-medium text-primary-700' : 'text-slate-400'}`}>
                          {c.ok ? 'Toca para cobrar' : isOverdueWithoutArrival(a) ? 'Confirma si llegó' : c.reason}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:text-primary-600" />
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {selected && (
        <AppointmentDetailCard appointment={selected} onClose={() => setSelected(null)} busyAction={busyAction}
          onCharge={chargeability(selected).ok ? () => { setCharging(selected); setSelected(null) } : undefined}
          onMarkArrived={() => runStatus('arrived', statusApi.markAppointmentArrived, 'Llegada registrada: ya se puede cobrar')}
          onMarkNoShow={() => runStatus('no-show', statusApi.markAppointmentNoShow, 'Marcada como no asistió')} />
      )}
      {scanning && <QrScannerModal onResult={handleScanned} onClose={() => setScanning(false)} />}
      {charging && <ChargeModal appointment={charging} onClose={() => setCharging(null)} onPaid={handlePaid} />}
    </div>
  )
}
