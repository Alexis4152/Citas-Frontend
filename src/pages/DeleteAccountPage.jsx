import { useState } from 'react'
import { CheckCircle2, MailCheck, Trash2 } from 'lucide-react'
import { Link } from '../router'
import { useAuth } from '../context/AuthContext'
import { useHospitalConfig } from '../context/HospitalConfigContext'
import { useNotify } from '../context/NotifyContext'
import { createPublicArcoRequest } from '../api/arco'
import { emailError, nameError } from '../utils/validators'

/**
 * Página pública para pedir que se elimine la cuenta y los datos (la URL que exigen las tiendas
 * de aplicaciones, p. ej. Google Play: funciona aunque la persona ya no tenga la app ni sesión).
 * Por dentro es una solicitud ARCO de Cancelación: confirma el correo y sigue los plazos de ley.
 */
export default function DeleteAccountPage() {
  const { role } = useAuth()
  const { config } = useHospitalConfig()
  const { notify } = useNotify()
  const [form, setForm] = useState({ requesterName: '', requesterEmail: '', details: '' })
  const [accepted, setAccepted] = useState(false)
  const [sent, setSent] = useState(null)
  const [busy, setBusy] = useState(false)
  const years = config?.clinicalRetentionYears || 5

  async function submit(e) {
    e.preventDefault()
    const problem = (nameError(form.requesterName) && `Nombre: ${nameError(form.requesterName)}`) || (emailError(form.requesterEmail) && `Correo: ${emailError(form.requesterEmail)}`)
      || (!accepted && 'Acepta el aviso de privacidad')
    if (problem) return notify(problem, 'error')
    setBusy(true)
    try {
      const r = await createPublicArcoRequest({ ...form, requesterName: form.requesterName.trim(), requesterEmail: form.requesterEmail.trim(),
        type: 'CANCELLATION', details: form.details.trim() || 'Eliminar mi cuenta y mis datos.', acceptPrivacyNotice: true })
      setSent(r.data.data)
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo enviar tu solicitud', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container-app max-w-3xl py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600"><Trash2 className="h-6 w-6" /></div>
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">Eliminar mi cuenta y mis datos</h1>
          <p className="text-slate-500">{config?.name || 'Hospital'}</p>
        </div>
      </div>

      <div className="card mb-5 p-5 text-sm text-slate-600">
        <p className="mb-2 font-semibold text-slate-900">Qué pasa cuando lo pides</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Se elimina ahora:</strong> tu cuenta de acceso (nombre, correo, contraseña), tus preferencias y tus datos de contacto.</li>
          <li><strong>Se cancelan:</strong> tus citas por venir.</li>
          <li><strong>Se bloquea y después se elimina:</strong> tu expediente clínico (la NOM-004 obliga a guardarlo {years} años desde tu última consulta) y tus pagos
            (obligaciones fiscales). Mientras tanto queda separado de tu nombre y nadie lo usa; al vencer el plazo se borra para siempre.</li>
          <li><strong>Plazos:</strong> te respondemos en máximo 20 días hábiles y, si procede, lo hacemos en los 15 siguientes. Recibirás una constancia en PDF.</li>
        </ul>
      </div>

      {role === 'PATIENT' ? (
        <div className="card p-5">
          <p className="text-sm text-slate-600">Ya iniciaste sesión: puedes pedirlo desde tu centro de privacidad confirmando tu contraseña.</p>
          <Link to="/mi-privacidad" className="btn-primary mt-3 inline-flex">Ir a mi centro de privacidad</Link>
        </div>
      ) : role ? (
        <div className="card p-5">
          <p className="font-semibold text-slate-900">Tu cuenta es del personal del hospital</p>
          <p className="mt-1 text-sm text-slate-600">Esta página es para pacientes. La baja de una cuenta del personal la hace el administrador del hospital,
            y lo que se conserva por obligación laboral y fiscal lo maneja Recursos Humanos.</p>
        </div>
      ) : sent ? (
        <div className="card p-6 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-primary-600" />
          <h2 className="mt-3 font-display text-xl font-semibold text-slate-900">Revisa tu correo</h2>
          <p className="mt-2 text-sm text-slate-600">Si <strong>{sent.requesterEmail}</strong> está registrado en el hospital, te enviamos un enlace con el folio de tu solicitud.
            Ábrelo para confirmar que eres tú; desde ahí seguirás tu solicitud. Si no te llega, acude a recepción con tu identificación.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="card space-y-4 p-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm"><span className="label">Nombre completo</span>
              <input className="input" autoComplete="name" value={form.requesterName} onChange={(e) => setForm({ ...form, requesterName: e.target.value })} /></label>
            <label className="block text-sm"><span className="label">Correo con el que te registraste</span>
              <input type="email" className="input" autoComplete="email" value={form.requesterEmail} onChange={(e) => setForm({ ...form, requesterEmail: e.target.value })} /></label>
          </div>
          <label className="block text-sm"><span className="label">Comentarios <span className="font-normal text-slate-400">(opcional)</span></span>
            <textarea rows={2} className="input" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} /></label>
          <label className="flex items-start gap-2.5 text-sm text-slate-600">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary-600" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            <span>Leí el <Link to="/aviso-de-privacidad" target="_blank" className="font-medium text-primary-700 hover:underline">aviso de privacidad</Link> y entiendo que me pedirán identificarme.</span>
          </label>
          <button type="submit" className="btn-danger" disabled={busy}>{busy ? 'Enviando...' : 'Solicitar eliminación'}</button>
          <p className="flex items-center gap-1.5 text-xs text-slate-400"><CheckCircle2 className="h-3.5 w-3.5" /> Si no diste correo, acude a recepción con tu identificación.</p>
        </form>
      )}
    </div>
  )
}
