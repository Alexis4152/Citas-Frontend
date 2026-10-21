import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronRight, Contact, Plus, ShieldCheck } from 'lucide-react'
import { useNavigate } from '../../router'
import { ARCO_STATUS, ARCO_TYPES, createInPersonArco, fmtDate, fmtDateTime, getArcoRequests } from '../../api/arco'
import { searchPatients } from '../../api/reception'
import { useNotify } from '../../context/NotifyContext'
import Modal from '../../components/Modal'
import { Badge, EmptyState, PageHeader, Skeleton } from '../../components/ui'

const TABS = [
  { value: '', label: 'Abiertas' },
  { value: 'PENDING', label: 'Por responder' },
  { value: 'INFO_REQUESTED', label: 'Esperando al titular' },
  { value: 'APPROVED', label: 'Por ejecutar' },
  { value: 'COMPLETED', label: 'Atendidas' },
  { value: 'REJECTED', label: 'No procedieron' },
  { value: 'NOT_FILED', label: 'No presentadas' },
]

/** Bandeja de solicitudes ARCO del hospital: abiertas primero, con su siguiente fecha límite. */
export default function AdminArcoRequests() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [requests, setRequests] = useState(null)
  const [inPerson, setInPerson] = useState(false)

  const load = () => {
    setRequests(null)
    getArcoRequests(status).then((r) => setRequests(status ? r.data.data : r.data.data.filter((x) => x.open))).catch(() => setRequests([]))
  }
  useEffect(load, [status])

  return (
    <div>
      <PageHeader icon={ShieldCheck} eyebrow="Datos personales" title="Solicitudes ARCO"
        description="20 días hábiles para responder, 15 para hacerlo efectivo. Toca una solicitud para atenderla."
        actions={<button className="btn-primary" onClick={() => setInPerson(true)}><Plus className="h-4 w-4" /> Registrar en mostrador</button>} />

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
          <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : requests.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Sin solicitudes" description="Llegan del formulario de derechos ARCO, del centro de privacidad de los pacientes o se registran en mostrador." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {requests.map((r) => (
              <li key={r.id}>
                <button onClick={() => navigate(`/admin/solicitudes-arco/${r.id}`)} className="group flex w-full flex-col gap-2 p-5 text-left transition hover:bg-slate-50 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={ARCO_STATUS[r.status]?.tone} dot>{r.statusLabel}</Badge>
                      <Badge tone="brand">{r.typeLabel}</Badge>
                      {r.overdue && <Badge tone="red"><AlertTriangle className="h-3 w-3" /> Vencida</Badge>}
                      {r.identityRequired && r.open && <Badge tone="amber"><Contact className="h-3 w-3" /> Falta identidad</Badge>}
                      <span className="font-mono text-xs text-slate-400">{r.folio}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{r.requesterName}
                      <span className="ml-2 font-normal text-slate-500">{r.requesterEmail}</span>
                      {r.representative && <span className="ml-2 text-xs font-normal text-slate-500">(por {r.representativeName})</span>}
                    </p>
                    <p className="text-xs text-slate-500">Recibida {fmtDateTime(r.receivedAt || r.createdAt)} · {r.channel === 'IN_PERSON' ? 'Mostrador' : r.channel === 'ACCOUNT' ? 'Cuenta del paciente' : 'Formulario en línea'}</p>
                  </div>
                  {r.nextDeadline && (
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-slate-400">{r.nextDeadlineLabel}</p>
                      <p className={`text-sm font-semibold ${r.overdue ? 'text-rose-600' : 'text-slate-800'}`}>{fmtDate(r.nextDeadline)}</p>
                    </div>
                  )}
                  <ChevronRight className="hidden h-4 w-4 text-slate-300 group-hover:text-primary-600 sm:block" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {inPerson && <InPersonModal onClose={() => setInPerson(false)} onCreated={(r) => navigate(`/admin/solicitudes-arco/${r.id}`)} />}
    </div>
  )
}

/** Solicitud presencial: titulares sin correo, menores (por su representante) o quien prefiera ir. */
function InPersonModal({ onClose, onCreated }) {
  const { notify } = useNotify()
  const [q, setQ] = useState('')
  const [patients, setPatients] = useState([])
  const [patient, setPatient] = useState(null)
  const [form, setForm] = useState({ type: '', details: '', contactEmail: '', representative: false, representativeName: '', identityNotes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (q.trim().length < 2) { setPatients([]); return undefined }
    const t = setTimeout(() => searchPatients({ q: q.trim(), size: 8 }).then((r) => setPatients(r.data.data.content)).catch(() => {}), 300)
    return () => clearTimeout(t)
  }, [q])

  async function save() {
    if (!patient) return notify('Elige al paciente titular', 'error')
    if (!form.type) return notify('Elige el derecho', 'error')
    if (form.representative && form.representativeName.trim().length < 5) return notify('Escribe el nombre del representante', 'error')
    setSaving(true)
    try {
      const r = await createInPersonArco({ ...form, patientId: patient.id })
      notify('Solicitud registrada', 'success')
      onCreated(r.data.data)
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo registrar', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Registrar solicitud en mostrador" description="La identidad se da por verificada en persona: anota qué identificación revisaste." onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-4">
        <div>
          <label className="label">Paciente titular</label>
          {patient ? (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 ring-1 ring-slate-200">
              <span className="text-sm font-medium text-slate-900">{patient.firstName} {patient.lastName} <span className="font-normal text-slate-500">· {patient.phone}</span></span>
              <button className="btn-ghost btn-sm" onClick={() => setPatient(null)}>Cambiar</button>
            </div>
          ) : (
            <>
              <input className="input" placeholder="Busca por nombre, teléfono o correo" value={q} onChange={(e) => setQ(e.target.value)} />
              {patients.length > 0 && (
                <ul className="mt-1 max-h-48 overflow-y-auto rounded-xl ring-1 ring-slate-200">
                  {patients.map((p) => (
                    <li key={p.id}><button className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50" onClick={() => setPatient(p)}>{p.firstName} {p.lastName} · {p.phone}{p.email ? ` · ${p.email}` : ''}</button></li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
        <div>
          <label className="label">Derecho</label>
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="">Elige...</option>
            {ARCO_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Lo que pide</label>
          <textarea rows={3} className="input" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Correo para responderle <span className="font-normal text-slate-400">(opcional)</span></label>
            <input type="email" className="input" placeholder={patient?.email || 'Si no tiene, se le entrega en mostrador'} value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
          </div>
          <div>
            <label className="label">Identificación revisada</label>
            <input className="input" placeholder="Ej. INE vigente, coincide con el expediente" value={form.identityNotes} onChange={(e) => setForm({ ...form, identityNotes: e.target.value })} />
          </div>
        </div>
        <label className="flex items-start gap-2.5 text-sm text-slate-700">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary-600" checked={form.representative} onChange={(e) => setForm({ ...form, representative: e.target.checked })} />
          La presenta un representante (padre, madre, tutor o apoderado) con documento que lo acredita.
        </label>
        {form.representative && (
          <input className="input" placeholder="Nombre completo del representante" value={form.representativeName} onChange={(e) => setForm({ ...form, representativeName: e.target.value })} />
        )}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={saving} onClick={save}>{saving ? 'Registrando...' : 'Registrar solicitud'}</button>
        </div>
      </div>
    </Modal>
  )
}
