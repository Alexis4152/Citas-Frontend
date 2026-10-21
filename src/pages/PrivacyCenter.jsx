import { useEffect, useState } from 'react'
import { Bell, ChevronRight, Download, FileText, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { Link, useNavigate } from '../router'
import { useNotify } from '../context/NotifyContext'
import { useAuth } from '../context/AuthContext'
import { useHospitalConfig } from '../context/HospitalConfigContext'
import {
  ARCO_STATUS, deleteMyAccount, exportMyData, fmtDate, fmtDateTime, getMyTrackingToken, getPrivacyCenter, saveMyProfile, savePrivacyPreferences,
} from '../api/arco'
import { downloadBlob } from '../utils/media'
import Modal from '../components/Modal'
import PatientProfileFields, { profileFromPatient, profileProblem, toProfilePayload } from '../components/PatientProfileFields'
import { Badge, Skeleton } from '../components/ui'
import { onlyDigits, PHONE_INPUT_PROPS } from '../utils/phone'
import { nameError, phoneError } from '../utils/validators'

const SCOPE = { NOTICE: 'Aviso de privacidad', SENSITIVE: 'Datos de salud', REMINDERS: 'Recordatorios', NEWS: 'Novedades y encuestas' }
const CHANNEL = { WEB_BOOKING: 'al agendar', REGISTER: 'al registrarte', RECEPTION: 'en recepción', PRIVACY_CENTER: 'en tu centro de privacidad', ARCO: 'por solicitud ARCO' }

function Toggle({ checked, onChange, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors disabled:opacity-50 ${checked ? 'bg-primary-600' : 'bg-slate-300'}`}>
      <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  )
}

/**
 * Centro de privacidad del paciente (como el de Mercado Libre): ve y corrige sus datos, decide
 * para qué se usan, descarga el reporte de todo lo que el hospital guarda de él, da seguimiento
 * a sus solicitudes y puede pedir eliminar su cuenta.
 */
export default function PrivacyCenter() {
  const { notify } = useNotify()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { config } = useHospitalConfig()
  const [data, setData] = useState(null)
  const [modal, setModal] = useState(null)
  const [password, setPassword] = useState('')
  const [reason, setReason] = useState('')
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = () => getPrivacyCenter().then((r) => setData(r.data.data)).catch(() => notify('No se pudo cargar tu información', 'error'))
  useEffect(() => { load() }, [])

  const patient = data?.patient

  async function setPref(key, value) {
    try {
      await savePrivacyPreferences({ [key]: value })
      notify('Preferencia guardada', 'success')
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar', 'error')
    }
  }

  async function doExport() {
    setBusy(true)
    try {
      const r = await exportMyData(password)
      downloadBlob(r.data, 'mis-datos-personales.pdf')
      setModal(null)
    } catch (err) {
      const msg = err.response?.data instanceof Blob ? JSON.parse(await err.response.data.text()).message : err.response?.data?.message
      notify(msg || 'No se pudo generar tu reporte', 'error')
    } finally {
      setBusy(false)
      setPassword('')
    }
  }

  async function doDelete() {
    setBusy(true)
    try {
      await deleteMyAccount(password, reason)
      notify('Recibimos tu solicitud. Te avisaremos por correo cuando quede hecha.', 'success')
      setModal(null)
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo enviar tu solicitud', 'error')
    } finally {
      setBusy(false)
      setPassword('')
    }
  }

  async function saveProfile(e) {
    e.preventDefault()
    const problem = (nameError(form.firstName) && `Nombre: ${nameError(form.firstName)}`) || (nameError(form.lastName) && `Apellidos: ${nameError(form.lastName)}`)
      || (phoneError(form.phone) && `Teléfono: ${phoneError(form.phone)}`) || profileProblem(form)
    if (problem) return notify(problem, 'error')
    setBusy(true)
    try {
      await saveMyProfile(toProfilePayload({ ...form, email: patient.email }))
      notify('Tus datos se actualizaron', 'success')
      setModal(null)
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function openTracking(id) {
    try {
      const r = await getMyTrackingToken(id)
      navigate(`/derechos-arco/seguimiento/${r.data.data}`)
    } catch {
      notify('No se pudo abrir el seguimiento', 'error')
    }
  }

  if (!data) return <div className="container-app space-y-4 py-10"><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>
  const pendingDeletion = data.requests.some((r) => r.type === 'CANCELLATION' && r.open)

  return (
    <div className="container-app py-8 sm:py-10">
      <p className="eyebrow mb-2 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Privacidad</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">Tu centro de privacidad</h1>
      <p className="mt-1 max-w-2xl text-slate-500">
        Aquí ves y controlas los datos personales que {config?.name || 'el hospital'} guarda de ti. Lee el{' '}
        <Link to="/aviso-de-privacidad" className="font-medium text-primary-700 hover:underline">aviso de privacidad</Link> (versión {data.noticeVersion}).
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900"><UserRound className="h-4 w-4 text-primary-600" /> Tus datos</h2>
            {patient && <button className="btn-secondary btn-sm" onClick={() => { setForm({ firstName: patient.firstName, lastName: patient.lastName, phone: patient.phone || '', ...profileFromPatient(patient) }); setModal('profile') }}>Corregir</button>}
          </div>
          {patient ? (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <Row label="Nombre">{patient.firstName} {patient.lastName}</Row>
              <Row label="Correo">{user?.email}</Row>
              <Row label="Teléfono">{patient.phone}</Row>
              <Row label="Nacimiento">{patient.birthDate ? fmtDate(patient.birthDate) : '—'}</Row>
              <Row label="Domicilio">{[patient.addressLine, patient.neighborhood, patient.postalCode && `CP ${patient.postalCode}`, patient.city].filter(Boolean).join(', ') || '—'}</Row>
              <Row label="Contacto de emergencia">{patient.emergencyContactName ? `${patient.emergencyContactName} · ${patient.emergencyContactPhone}` : '—'}</Row>
            </dl>
          ) : <p className="text-sm text-slate-500">Tu cuenta todavía no tiene un expediente de paciente.</p>}
          <p className="mt-3 text-xs text-slate-400">Para cambiar tu correo de acceso o corregir algo de tu expediente médico, usa una solicitud de Rectificación.</p>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900"><Bell className="h-4 w-4 text-primary-600" /> Para qué usamos tus datos</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            <li className="flex items-center gap-3 py-3">
              <div className="flex-1"><p className="font-medium text-slate-800">Agendar, atenderte y cobrar</p><p className="text-xs text-slate-500">Necesario para darte el servicio (finalidad principal).</p></div>
              <Badge tone="slate">Siempre</Badge>
            </li>
            <li className="flex items-center gap-3 py-3">
              <div className="flex-1"><p className="font-medium text-slate-800">Recordatorios de tus citas por correo</p><p className="text-xs text-slate-500">Te avisamos 2 horas antes.</p></div>
              <Toggle checked={patient?.notifyReminders !== false} disabled={!patient} onChange={(v) => setPref('reminders', v)} />
            </li>
            <li className="flex items-center gap-3 py-3">
              <div className="flex-1"><p className="font-medium text-slate-800">Novedades y encuestas del hospital</p><p className="text-xs text-slate-500">Finalidad secundaria: solo si la aceptas.</p></div>
              <Toggle checked={!!patient?.notifyNews} disabled={!patient} onChange={(v) => setPref('news', v)} />
            </li>
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-slate-900"><Download className="h-4 w-4 text-primary-600" /> Reporte de tus datos</h2>
          <p className="text-sm text-slate-600">Descarga en PDF todo lo que guardamos de ti: datos, citas, recetas, pagos, consentimientos, para qué los usamos y cuánto tiempo los conservamos.</p>
          <button className="btn-primary mt-3" onClick={() => setModal('export')}><FileText className="h-4 w-4" /> Descargar mi reporte</button>
        </section>

        <section className="card p-5">
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-slate-900"><Trash2 className="h-4 w-4 text-rose-600" /> Eliminar tu cuenta</h2>
          <p className="text-sm text-slate-600">
            Se borra tu cuenta y tus datos de contacto. Tu expediente clínico y tus pagos se conservan bloqueados (nadie los usa) el tiempo que marca
            la ley — {config?.clinicalRetentionYears || 5} años desde tu última consulta — y después se eliminan.
          </p>
          {pendingDeletion
            ? <p className="mt-3 text-sm font-medium text-amber-700">Ya tienes una solicitud de eliminación en curso.</p>
            : <button className="btn-danger-ghost mt-3 ring-1 ring-rose-200" onClick={() => setModal('delete')}>Solicitar eliminar mi cuenta</button>}
        </section>
      </div>

      <section className="card mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
          <h2 className="font-semibold text-slate-900">Tus solicitudes de derechos ARCO</h2>
          <Link to="/derechos-arco" className="btn-secondary btn-sm">Nueva solicitud</Link>
        </div>
        {data.requests.length === 0 ? <p className="px-5 py-6 text-sm text-slate-400">No has hecho solicitudes.</p> : (
          <ul className="divide-y divide-slate-100">
            {data.requests.map((r) => (
              <li key={r.id}>
                <button onClick={() => openTracking(r.id)} className="group flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{r.typeLabel} <span className="ml-1 font-mono text-xs text-slate-400">{r.folio}</span></p>
                    <p className="text-xs text-slate-500">Enviada {fmtDateTime(r.createdAt)}{r.nextDeadline ? ` · ${r.nextDeadlineLabel?.toLowerCase()} ${fmtDate(r.nextDeadline)}` : ''}</p>
                  </div>
                  <Badge tone={ARCO_STATUS[r.status]?.tone} dot>{r.statusLabel}</Badge>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary-600" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card mt-5 p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Tus consentimientos</h2>
        {data.consents.length === 0 ? <p className="text-sm text-slate-400">Sin constancias registradas.</p> : (
          <ul className="space-y-1.5 text-sm text-slate-600">
            {data.consents.map((c, i) => (
              <li key={i}>{fmtDateTime(c.at)} · <strong>{SCOPE[c.scope] || c.scope}</strong>: {c.granted ? 'otorgado' : 'retirado'} {CHANNEL[c.channel] || ''} (aviso v{c.noticeVersion})</li>
            ))}
          </ul>
        )}
      </section>

      {modal === 'export' && (
        <Modal title="Descargar mi reporte" onClose={() => setModal(null)} maxWidth="max-w-sm">
          <p className="mb-3 text-sm text-slate-600">Confirma tu contraseña para proteger tus datos.</p>
          <input type="password" className="input" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn-primary" disabled={!password || busy} onClick={doExport}>{busy ? 'Generando...' : 'Descargar'}</button>
          </div>
        </Modal>
      )}

      {modal === 'delete' && (
        <Modal title="Eliminar mi cuenta" onClose={() => setModal(null)} maxWidth="max-w-md">
          <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Tu cuenta se desactiva y se borran tu nombre, correo y contraseña.</li>
            <li>Tus citas por venir se cancelan.</li>
            <li>Tu expediente clínico y tus pagos se guardan bloqueados el tiempo que marca la ley y después se eliminan.</li>
            <li>Te respondemos en máximo 20 días hábiles y te mandamos la constancia.</li>
          </ul>
          <label className="label">¿Por qué te vas? <span className="font-normal text-slate-400">(opcional)</span></label>
          <textarea rows={2} className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
          <label className="label mt-3">Confirma tu contraseña</label>
          <input type="password" className="input" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setModal(null)}>Conservar mi cuenta</button>
            <button className="btn-danger" disabled={!password || busy} onClick={doDelete}>{busy ? 'Enviando...' : 'Solicitar eliminación'}</button>
          </div>
        </Modal>
      )}

      {modal === 'profile' && form && (
        <Modal title="Corregir mis datos" onClose={() => setModal(null)} maxWidth="max-w-2xl">
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">Nombre(s)</span>
                <input className="input" maxLength={100} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
              <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">Apellidos</span>
                <input className="input" maxLength={100} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label>
              <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">Teléfono</span>
                <input className="input" {...PHONE_INPUT_PROPS} value={form.phone} onChange={(e) => setForm({ ...form, phone: onlyDigits(e.target.value) })} /></label>
            </div>
            <PatientProfileFields value={form} onChange={setForm} />
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-slate-800">{children}</dd>
    </div>
  )
}
