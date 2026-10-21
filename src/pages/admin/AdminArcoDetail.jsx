import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, CalendarClock, CheckCircle2, Download, FileText, Contact, MessageSquareReply, PlayCircle, Scale, ShieldCheck, XCircle,
} from 'lucide-react'
import { Link } from '../../router'
import { useNotify } from '../../context/NotifyContext'
import {
  ARCO_STATUS, IDENTITY_METHODS, downloadArcoAdminDoc, downloadArcoConstancia, executeArco, extendArco, fmtDate, fmtDateTime, getArcoDetail,
  requestArcoInfo, respondArco, verifyArcoIdentity,
} from '../../api/arco'
import { getPatient } from '../../api/reception'
import { downloadBlob } from '../../utils/media'
import PatientProfileFields, { profileFromPatient, profileProblem, toProfilePayload } from '../../components/PatientProfileFields'
import { Badge, Skeleton } from '../../components/ui'
import { onlyDigits, PHONE_INPUT_PROPS } from '../../utils/phone'

const DOC_LABEL = { IDENTITY: 'Identificación del titular', INFO: 'Documento del requerimiento', DELIVERY: 'Reporte de datos entregado', CONSTANCIA: 'Constancia' }

/**
 * Atención de una solicitud ARCO, paso por paso: verificar identidad → (pedir información o
 * ampliar plazo) → responder con fundamento → ejecutar el derecho. Cada paso queda en la línea
 * de tiempo y en la constancia que recibe el titular.
 */
export default function AdminArcoDetail() {
  const { id } = useParams()
  const { notify, confirmDialog } = useNotify()
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(null)

  const load = () => getArcoDetail(id).then((r) => setData(r.data.data)).catch(() => notify('No se pudo cargar la solicitud', 'error'))
  useEffect(() => { load() }, [id])

  async function run(key, fn, ok) {
    setBusy(key)
    try {
      await fn()
      notify(ok, 'success')
      await load()
      return true
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo completar', 'error')
      return false
    } finally {
      setBusy(null)
    }
  }

  async function download(fn, name) {
    try {
      const r = await fn()
      downloadBlob(r.data, name)
    } catch {
      notify('No se pudo descargar', 'error')
    }
  }

  if (!data) return <div className="space-y-4"><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div>
  const r = data.request

  return (
    <div>
      <Link to="/admin/solicitudes-arco" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-700"><ArrowLeft className="h-4 w-4" /> Solicitudes ARCO</Link>

      <div className="mt-3 mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">{r.typeLabel}</h1>
            <Badge tone={ARCO_STATUS[r.status]?.tone} dot>{r.statusLabel}</Badge>
            {r.overdue && <Badge tone="red"><AlertTriangle className="h-3 w-3" /> Vencida</Badge>}
          </div>
          <p className="mt-1 font-mono text-sm text-slate-500">{r.folio}</p>
        </div>
        <button className="btn-secondary" onClick={() => download(() => downloadArcoConstancia(r.id), `constancia-${r.folio}.pdf`)}>
          <FileText className="h-4 w-4" /> Constancia PDF
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section className="card p-5">
            <div className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Info label="Titular">{r.requesterName}{r.representative && <span className="block text-xs text-slate-500">Representante: {r.representativeName}</span>}</Info>
              <Info label="Contacto">{r.requesterEmail || 'Sin correo (entregar en mostrador)'}{r.requesterPhone ? ` · ${r.requesterPhone}` : ''}</Info>
              <Info label="Expediente ligado">{r.patientId
                ? <Link to={`/admin/pacientes/${r.patientId}`} className="font-medium text-primary-700 hover:underline">{r.patientName}</Link>
                : r.hasAccount ? 'Solo cuenta (sin expediente)' : '—'}</Info>
              <Info label="Medio">{r.channel === 'IN_PERSON' ? 'Mostrador' : r.channel === 'ACCOUNT' ? 'Cuenta del paciente' : 'Formulario en línea'} · recibida {fmtDateTime(r.receivedAt)}</Info>
            </div>
            {r.details && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-inset ring-slate-200">{r.details}</p>}
          </section>

          <Deadlines r={r} />

          <IdentityPanel r={r} docs={data.documents} busy={busy} onDownload={(d) => download(() => downloadArcoAdminDoc(r.id, d.id), d.filename)}
            onVerify={(body) => run('verify', () => verifyArcoIdentity(r.id, body), 'Identidad verificada')} />

          {r.status === 'PENDING' && (
            <PendingActions r={r} busy={busy}
              onInfo={(message) => run('info', () => requestArcoInfo(r.id, { message }), 'Se le pidió la información al titular')}
              onExtend={(reason) => run('extend', () => extendArco(r.id, { reason }), 'Plazo ampliado')}
              onRespond={(body) => run('respond', () => respondArco(r.id, body), 'Respuesta enviada al titular')} />
          )}

          {r.status === 'INFO_REQUESTED' && (
            <section className="card p-5">
              <p className="flex items-center gap-2 font-semibold text-slate-900"><MessageSquareReply className="h-4 w-4 text-blue-600" /> Esperando al titular</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{r.infoRequest}</p>
              <p className="mt-2 text-xs text-slate-500">Tiene hasta el {fmtDate(r.infoDue)}. Si no responde, la solicitud se tiene por no presentada.</p>
            </section>
          )}

          {r.infoResponse && r.status !== 'INFO_REQUESTED' && (
            <section className="card p-5 text-sm">
              <p className="font-semibold text-slate-900">Respuesta del titular al requerimiento</p>
              <p className="mt-1 text-slate-500">{r.infoRequest}</p>
              <p className="mt-2 whitespace-pre-wrap rounded-xl bg-blue-50 px-4 py-3 text-blue-900">{r.infoResponse}</p>
            </section>
          )}

          {r.status === 'APPROVED' && (
            <ExecutePanel r={r} plan={data.cancellationPlan} patientInfo={data.patient} busy={busy}
              onExecute={async (body, danger) => {
                if (danger && !(await confirmDialog('Esto elimina la cuenta y bloquea el expediente. No se puede deshacer. ¿Ejecutar?', { confirmText: 'Ejecutar' }))) return
                run('execute', () => executeArco(r.id, body), 'Derecho hecho efectivo; se le avisó al titular')
              }} />
          )}

          {(r.outcome || r.executionSummary) && (
            <section className="card p-5 text-sm">
              <p className="font-semibold text-slate-900">Resultado</p>
              {r.outcome && <p className="mt-2"><Badge tone={r.outcome === 'IMPROCEDENTE' ? 'red' : 'green'}>{r.outcomeLabel}</Badge> <span className="ml-1 text-slate-500">por {r.resolvedByName}</span></p>}
              {r.legalBasis && <p className="mt-2 text-slate-700"><span className="font-medium">Fundamento:</span> {r.legalBasis}</p>}
              {r.resolutionNotes && <p className="mt-1 text-slate-700">{r.resolutionNotes}</p>}
              {r.executionSummary && (
                <>
                  <p className="mt-3 font-medium text-slate-800">Lo que se hizo ({fmtDateTime(r.executedAt)}, {r.executedByName})</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">{r.executionSummary.split('\n').map((l) => <li key={l}>{l}</li>)}</ul>
                </>
              )}
            </section>
          )}
        </div>

        <aside className="h-fit space-y-5 lg:sticky lg:top-6">
          <section className="card p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Línea de tiempo</p>
            <ol className="space-y-3 border-l border-slate-200 pl-4">
              {data.events.map((e, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary-500" />
                  <p className="text-xs text-slate-400">{fmtDateTime(e.at)} · {e.actor}</p>
                  <p className="text-sm text-slate-700">{e.message}</p>
                </li>
              ))}
            </ol>
          </section>
          {data.documents.length > 0 && (
            <section className="card p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Documentos</p>
              <ul className="space-y-2">
                {data.documents.map((d) => (
                  <li key={d.id}>
                    <button className="btn-secondary btn-sm w-full justify-between" onClick={() => download(() => downloadArcoAdminDoc(r.id, d.id), d.filename)}>
                      <span className="truncate">{DOC_LABEL[d.kind] || d.filename}</span><Download className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-slate-400">Las identificaciones se borran solas 30 días después de cerrar la solicitud. Cada descarga queda en la bitácora.</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}

function Info({ label, children }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <div className="text-slate-800">{children}</div>
    </div>
  )
}

function Deadlines({ r }) {
  const items = [
    { label: 'Responder antes del', date: r.dueDate, done: !!r.outcome, note: r.extended ? 'Con prórroga' : '20 días hábiles' },
    { label: 'Hacer efectivo antes del', date: r.executionDue, done: !!r.executedAt, note: '15 días hábiles después de responder' },
  ].filter((i) => i.date)
  if (!items.length) return null
  return (
    <section className="grid gap-3 sm:grid-cols-2">
      {items.map((i) => (
        <div key={i.label} className="card flex items-center gap-3 p-4">
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${i.done ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            {i.done ? <CheckCircle2 className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-xs text-slate-500">{i.label}</p>
            <p className="font-semibold text-slate-900">{fmtDate(i.date)}</p>
            <p className="text-[11px] text-slate-400">{i.done ? 'Cumplido' : i.note}</p>
          </div>
        </div>
      ))}
    </section>
  )
}

function IdentityPanel({ r, docs, busy, onVerify, onDownload }) {
  const [method, setMethod] = useState(r.channel === 'IN_PERSON' ? 'ID_IN_PERSON' : 'ID_ONLINE')
  const [notes, setNotes] = useState('')
  const idDocs = docs.filter((d) => d.kind === 'IDENTITY')
  return (
    <section className="card p-5">
      <p className="flex items-center gap-2 font-semibold text-slate-900"><Contact className="h-4 w-4 text-primary-600" /> Identidad del titular</p>
      {r.identityVerifiedAt ? (
        <p className="mt-2 flex items-start gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{r.identityMethodLabel} · {fmtDateTime(r.identityVerifiedAt)}{r.identityVerifiedByName ? ` · ${r.identityVerifiedByName}` : ''}
            {r.identityNotes && <span className="block text-slate-600">{r.identityNotes}</span>}</span>
        </p>
      ) : r.open ? (
        <>
          <p className="mt-1 text-sm text-slate-600">
            {r.identityRequired ? 'Este derecho expone o borra datos: verifica la identidad antes de darlo por procedente.' : 'Opcional para este derecho, pero recomendado.'}
            {r.representative && ' Revisa también el documento que acredita la representación.'}
          </p>
          {idDocs.length > 0
            ? <div className="mt-2 flex flex-wrap gap-2">{idDocs.map((d) => <button key={d.id} className="btn-secondary btn-sm" onClick={() => onDownload(d)}><Download className="h-3.5 w-3.5" /> Ver identificación enviada</button>)}</div>
            : <p className="mt-2 text-xs text-amber-700">El titular todavía no sube su identificación: puede hacerlo desde su enlace o mostrarla en recepción.</p>}
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              {IDENTITY_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <input className="input" placeholder="Qué revisaste (ej. INE vigente, coincide)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <button className="btn-primary" disabled={busy === 'verify'} onClick={() => onVerify({ method, notes })}>Verificar</button>
          </div>
        </>
      ) : <p className="mt-1 text-sm text-slate-500">No se verificó.</p>}
    </section>
  )
}

function PendingActions({ r, busy, onInfo, onExtend, onRespond }) {
  const [mode, setMode] = useState('respond')
  const [text, setText] = useState('')
  const [outcome, setOutcome] = useState('PROCEDENTE')
  const [legalBasis, setLegalBasis] = useState('')
  const [notes, setNotes] = useState('')
  const tabs = [['respond', 'Responder', Scale], ['info', 'Pedir información', MessageSquareReply], ...(r.extended ? [] : [['extend', 'Ampliar plazo', CalendarClock]])]
  return (
    <section className="card overflow-hidden">
      <div className="flex border-b border-slate-100">
        {tabs.map(([k, l, Icon]) => (
          <button key={k} onClick={() => setMode(k)}
            className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-sm font-semibold transition ${mode === k ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Icon className="h-4 w-4" /> {l}
          </button>
        ))}
      </div>
      <div className="p-5">
        {mode === 'respond' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[['PROCEDENTE', 'Procede', CheckCircle2, 'bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500'],
                ['PARCIAL', 'En parte', Scale, 'bg-amber-50 text-amber-800 ring-2 ring-amber-500'],
                ['IMPROCEDENTE', 'No procede', XCircle, 'bg-rose-50 text-rose-800 ring-2 ring-rose-500']].map(([v, l, Icon, activeCls]) => (
                <button key={v} type="button" onClick={() => setOutcome(v)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl p-3 text-sm font-semibold transition ${outcome === v ? activeCls : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>
                  <Icon className="h-4 w-4" /> {l}
                </button>
              ))}
            </div>
            <div>
              <label className="label">Fundamento y motivo {outcome === 'PROCEDENTE' && <span className="font-normal text-slate-400">(opcional)</span>}</label>
              <textarea rows={3} className="input" value={legalBasis} onChange={(e) => setLegalBasis(e.target.value)}
                placeholder={outcome === 'IMPROCEDENTE' ? 'Ej. No se acreditó la identidad del titular / el expediente clínico debe conservarse 5 años (NOM-004-SSA3-2012).' : 'Ej. Procede la cancelación de la cuenta; el expediente clínico se bloquea por obligación de conservación.'} />
            </div>
            <div>
              <label className="label">Mensaje para el titular <span className="font-normal text-slate-400">(opcional)</span></label>
              <textarea rows={2} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {outcome !== 'IMPROCEDENTE' && r.identityRequired && <p className="text-xs text-amber-700">Primero verifica la identidad (arriba).</p>}
            <button className="btn-primary" disabled={busy === 'respond'} onClick={() => onRespond({ outcome, legalBasis, notes })}>
              {busy === 'respond' ? 'Enviando...' : 'Enviar respuesta y constancia'}
            </button>
          </div>
        )}
        {mode !== 'respond' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">{mode === 'info'
              ? 'El titular tendrá 10 días hábiles para contestar desde su enlace. El plazo de respuesta vuelve a correr cuando conteste.'
              : 'Solo se puede ampliar una vez, otros 20 días hábiles, y hay que justificarlo. Se le avisa al titular.'}</p>
            <textarea rows={3} className="input" value={text} onChange={(e) => setText(e.target.value)}
              placeholder={mode === 'info' ? 'Ej. Adjunta tu acta de nacimiento para corregir el apellido.' : 'Ej. Hay que revisar expedientes de varias sedes.'} />
            <button className="btn-primary" disabled={busy === mode} onClick={async () => { if (await (mode === 'info' ? onInfo : onExtend)(text)) setText('') }}>
              {mode === 'info' ? 'Enviar requerimiento' : 'Ampliar plazo'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function ExecutePanel({ r, plan, patientInfo, busy, onExecute }) {
  const [profile, setProfile] = useState(null)
  const [clarification, setClarification] = useState('')
  const [prefs, setPrefs] = useState({ reminders: patientInfo?.notifyReminders !== false, news: !!patientInfo?.notifyNews })
  const [scope, setScope] = useState('SECONDARY')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (r.type === 'RECTIFICATION' && r.patientId) {
      getPatient(r.patientId).then((res) => {
        const p = res.data.data
        setProfile({ firstName: p.firstName, lastName: p.lastName, phone: p.phone || '', email: p.email || '', ...profileFromPatient(p) })
      }).catch(() => {})
    }
  }, [r.type, r.patientId])

  const execute = (body, danger) => onExecute({ notes: notes.trim() || undefined, ...body }, danger)

  return (
    <section className="card p-5">
      <p className="flex items-center gap-2 font-semibold text-slate-900"><PlayCircle className="h-4 w-4 text-primary-600" /> Hacer efectivo el derecho</p>
      <p className="mb-4 text-xs text-slate-500">Antes del {fmtDate(r.executionDue)}. Al terminar se le manda la constancia al titular.</p>

      {r.type === 'ACCESS' && (
        <>
          <p className="text-sm text-slate-600">Se genera el reporte PDF con todos sus datos (identificación, médicos, citas, recetas, pagos, consentimientos, finalidades y plazos de conservación) y queda disponible en su enlace de seguimiento.</p>
          <button className="btn-primary mt-3" disabled={busy === 'execute'} onClick={() => execute({})}>Generar y entregar reporte</button>
        </>
      )}

      {r.type === 'RECTIFICATION' && (
        <div className="space-y-4">
          {profile ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {[['firstName', 'Nombre(s)'], ['lastName', 'Apellidos'], ['email', 'Correo']].map(([k, l]) => (
                  <label key={k} className="block text-sm"><span className="mb-1 block font-medium text-slate-700">{l}</span>
                    <input className="input" value={profile[k]} onChange={(e) => setProfile({ ...profile, [k]: e.target.value })} /></label>
                ))}
                <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">Teléfono</span>
                  <input className="input" {...PHONE_INPUT_PROPS} value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: onlyDigits(e.target.value) })} /></label>
              </div>
              <PatientProfileFields value={profile} onChange={setProfile} />
            </>
          ) : <p className="text-sm text-slate-500">Esta solicitud no tiene expediente ligado: solo se puede dejar una nota.</p>}
          <div>
            <label className="label">Nota aclaratoria al expediente <span className="font-normal text-slate-400">(para corregir algo clínico, que no se altera)</span></label>
            <textarea rows={2} className="input" value={clarification} onChange={(e) => setClarification(e.target.value)} />
          </div>
          <button className="btn-primary" disabled={busy === 'execute'} onClick={() => {
            const problem = profile && profileProblem(profile)
            if (problem) return
            execute({ profile: profile ? toProfilePayload(profile) : undefined, clarification: clarification.trim() || undefined })
          }}>Guardar corrección</button>
        </div>
      )}

      {(r.type === 'CANCELLATION' || (r.type === 'REVOCATION' && scope === 'ALL')) && plan && (
        <div className="mt-1">
          <p className="mb-2 text-sm font-medium text-slate-800">Esto es lo que va a pasar</p>
          <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
            {plan.items.map((i) => (
              <li key={i.category} className="px-4 py-2.5 text-sm">
                <p className="flex flex-wrap items-center gap-2"><span className="font-medium text-slate-900">{i.category}</span>
                  <Badge tone={i.action.startsWith('Se elimina') || i.action.startsWith('Se cancelan') || i.action.startsWith('Se apagan') ? 'red' : i.action.startsWith('Se bloquea') || i.action.startsWith('Se separa') ? 'amber' : 'slate'}>{i.action}</Badge></p>
                <p className="text-xs text-slate-500">{i.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {r.type === 'CANCELLATION' && (
        <button className="btn-danger mt-4" disabled={busy === 'execute'} onClick={() => execute({}, true)}>Ejecutar cancelación</button>
      )}

      {(r.type === 'OPPOSITION' || r.type === 'LIMITATION') && (
        <div className="space-y-3">
          {[['reminders', 'Recordatorios de citas por correo'], ['news', 'Novedades y encuestas']].map(([k, l]) => (
            <label key={k} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 text-sm ring-1 ring-slate-200">
              {l}
              <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={prefs[k]} onChange={(e) => setPrefs({ ...prefs, [k]: e.target.checked })} />
            </label>
          ))}
          <button className="btn-primary" disabled={busy === 'execute'} onClick={() => execute(prefs)}>Aplicar</button>
        </div>
      )}

      {r.type === 'REVOCATION' && (
        <div className="space-y-3">
          {[['SECONDARY', 'Solo finalidades secundarias', 'Deja de recibir recordatorios, novedades y encuestas; sigue siendo paciente.'],
            ['ALL', 'Todo el consentimiento', 'Equivale a cancelar: se elimina la cuenta y se bloquea el expediente.']].map(([v, l, h]) => (
            <label key={v} className={`flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 ${scope === v ? 'bg-primary-50 ring-primary-500' : 'ring-slate-200'}`}>
              <input type="radio" className="mt-1" checked={scope === v} onChange={() => setScope(v)} />
              <span><span className="block text-sm font-medium text-slate-900">{l}</span><span className="text-xs text-slate-500">{h}</span></span>
            </label>
          ))}
          <button className={scope === 'ALL' ? 'btn-danger' : 'btn-primary'} disabled={busy === 'execute'} onClick={() => execute({ revocationScope: scope }, scope === 'ALL')}>Aplicar revocación</button>
        </div>
      )}

      <div className="mt-4 border-t border-slate-100 pt-3">
        <label className="label">Nota para la constancia <span className="font-normal text-slate-400">(opcional)</span></label>
        <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400"><ShieldCheck className="h-3.5 w-3.5" /> Lo que se haga queda en la línea de tiempo, la bitácora y la constancia.</p>
    </section>
  )
}
