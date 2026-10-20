import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, ShieldCheck, XCircle } from 'lucide-react'
import { ARCO_STATUS, exportArcoData, getArcoRequests, resolveArcoRequest } from '../../api/arco'
import { useNotify } from '../../context/NotifyContext'
import Modal from '../../components/Modal'
import Drawer, { DetailRow } from '../../components/Drawer'
import { Badge, EmptyState, PageHeader, Skeleton } from '../../components/ui'
import { formatDate } from '../../utils/format'

const TABS = [
  { value: 'PENDING', label: 'Pendientes' },
  { value: '', label: 'Todas' },
  { value: 'COMPLETED', label: 'Completadas' },
  { value: 'REJECTED', label: 'Rechazadas' },
]

/** Bandeja de solicitudes ARCO del hospital: pendientes primero (las que vencen antes arriba),
 * con descarga de datos para Acceso y resolución con nota que le llega por correo a quien la pidió. */
export default function AdminArcoRequests() {
  const { notify } = useNotify()
  const [status, setStatus] = useState('PENDING')
  const [requests, setRequests] = useState(null)
  const [resolving, setResolving] = useState(null)
  const [selected, setSelected] = useState(null)

  const load = () => {
    setRequests(null)
    getArcoRequests(status).then((r) => setRequests(r.data.data)).catch(() => setRequests([]))
  }
  useEffect(load, [status])

  async function download(r) {
    try {
      const res = await exportArcoData(r.id)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `datos-personales-${r.folio}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      notify('No se pudieron descargar los datos', 'error')
    }
  }

  return (
    <div>
      <PageHeader icon={ShieldCheck} eyebrow="Datos personales" title="Solicitudes ARCO"
        description="Acceso, Rectificación, Cancelación u Oposición. La ley da 20 días hábiles para responder." />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.label} onClick={() => setStatus(t.value)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${status === t.value ? 'bg-ink-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {!requests ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : requests.length === 0 ? (
          <EmptyState icon={ShieldCheck} title={status === 'PENDING' ? 'Sin solicitudes pendientes' : 'Sin solicitudes'}
            description="Las solicitudes llegan del formulario de derechos ARCO del sitio del hospital." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {requests.map((r) => (
              <li key={r.id}>
                <button onClick={() => setSelected(r)} className="group flex w-full flex-col gap-4 p-5 text-left transition hover:bg-slate-50 lg:flex-row lg:items-start">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={ARCO_STATUS[r.status]?.tone} dot>{r.statusLabel}</Badge>
                      <Badge tone="brand">{r.typeLabel}</Badge>
                      {r.overdue && <Badge tone="red"><AlertTriangle className="h-3 w-3" /> Vencida</Badge>}
                      <span className="font-mono text-xs text-slate-400">{r.folio}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{r.requesterName}
                      <span className="ml-2 font-normal text-slate-500">{r.requesterEmail}{r.requesterPhone ? ` · ${r.requesterPhone}` : ''}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Recibida {formatDate(r.createdAt)} · {r.status === 'PENDING' ? <>vence el <strong className={r.overdue ? 'text-rose-600' : 'text-slate-700'}>{new Date(r.dueDate + 'T00:00:00').toLocaleDateString('es-MX', { dateStyle: 'medium' })}</strong></> : <>resuelta {formatDate(r.resolvedAt)} por {r.resolvedByName}</>}
                      {' · '}{r.hasAccount ? 'Con cuenta' : 'Sin cuenta'}{r.hasPatientRecord ? ' · Es paciente' : ''}
                    </p>
                    {r.details && <p className="line-clamp-2 text-sm text-slate-600">{r.details}</p>}
                  </div>
                  <span className="shrink-0 self-center text-xs font-medium text-slate-400 group-hover:text-primary-700">
                    {r.status === 'PENDING' ? 'Revisar y resolver ›' : 'Ver detalle ›'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <Drawer open onClose={() => setSelected(null)} title={selected.requesterName} subtitle={`${selected.folio} · ${selected.typeLabel}`}
          badges={<><Badge tone={ARCO_STATUS[selected.status]?.tone} dot>{selected.statusLabel}</Badge>{selected.overdue && <Badge tone="red">Vencida</Badge>}</>}
          footer={<div className="flex flex-wrap justify-end gap-2">
            <button className="btn-secondary" onClick={() => download(selected)} title="Descargar los datos personales de esta persona (derecho de Acceso)">
              <Download className="h-4 w-4" /> Sus datos
            </button>
            {selected.status === 'PENDING' && <button className="btn-primary" onClick={() => { setResolving(selected); setSelected(null) }}>Resolver</button>}
          </div>}>
          <div className="space-y-4 text-sm">
            <DetailRow label="Contacto">{selected.requesterEmail}{selected.requesterPhone ? ` · ${selected.requesterPhone}` : ''}</DetailRow>
            <DetailRow label="Recibida">{formatDate(selected.createdAt)}</DetailRow>
            {selected.status === 'PENDING'
              ? <DetailRow label="Vence">{new Date(selected.dueDate + 'T00:00:00').toLocaleDateString('es-MX', { dateStyle: 'long' })}</DetailRow>
              : <DetailRow label="Resuelta">{formatDate(selected.resolvedAt)} por {selected.resolvedByName}</DetailRow>}
            <DetailRow label="En el sistema">{selected.hasAccount ? 'Con cuenta' : 'Sin cuenta'}{selected.hasPatientRecord ? ' · Es paciente' : ''}</DetailRow>
            {selected.details && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-400">Lo que pide</p>
                <p className="whitespace-pre-wrap rounded-xl bg-slate-50 px-4 py-3 text-slate-700 ring-1 ring-inset ring-slate-200">{selected.details}</p>
              </div>
            )}
            {selected.resolutionNotes && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-400">Respuesta enviada</p>
                <p className="whitespace-pre-wrap text-slate-700">{selected.resolutionNotes}</p>
              </div>
            )}
          </div>
        </Drawer>
      )}

      {resolving && (
        <ResolveModal request={resolving} onClose={() => setResolving(null)}
          onDone={() => { setResolving(null); notify('Solicitud resuelta; se le avisó por correo', 'success'); load() }} />
      )}
    </div>
  )
}

function ResolveModal({ request, onClose, onDone }) {
  const { notify } = useNotify()
  const [status, setStatus] = useState('COMPLETED')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (notes.trim().length < 10) return notify('Explica qué se hizo (mínimo 10 caracteres)', 'error')
    setSaving(true)
    try {
      await resolveArcoRequest(request.id, { status, notes: notes.trim() })
      onDone()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo resolver', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Resolver ${request.folio}`} description={`${request.typeLabel} · ${request.requesterName}`} icon={ShieldCheck} onClose={() => !saving && onClose()}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {[['COMPLETED', 'Completada', CheckCircle2, 'emerald'], ['REJECTED', 'Rechazada', XCircle, 'rose']].map(([value, label, Icon, color]) => (
            <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-xl p-3 text-sm font-semibold transition ${status === value
              ? (color === 'emerald' ? 'bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500' : 'bg-rose-50 text-rose-800 ring-2 ring-rose-500')
              : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>
              <input type="radio" className="sr-only" checked={status === value} onChange={() => setStatus(value)} />
              <Icon className="h-4 w-4" /> {label}
            </label>
          ))}
        </div>
        <div>
          <label className="label">Nota para quien la pidió</label>
          <textarea rows={5} maxLength={2000} className="input" value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder={status === 'COMPLETED' ? 'Ej. Corregimos tu apellido en tu expediente.' : 'Ej. No pudimos verificar tu identidad; acude a recepción con una identificación.'} />
          <p className="field-hint">Se le envía por correo y queda como constancia.</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar y avisar'}</button>
        </div>
      </form>
    </Modal>
  )
}
