import { useState } from 'react'
import { Eye, FilePen, ShieldOff, Trash2 } from 'lucide-react'
import { Link } from '../router'
import { ARCO_TYPES } from '../api/arco'
import { onlyDigits, PHONE_INPUT_PROPS } from '../utils/phone'
import { emailError, nameError, phoneError } from '../utils/validators'

const ICONS = { ACCESS: Eye, RECTIFICATION: FilePen, CANCELLATION: Trash2, OPPOSITION: ShieldOff }

/**
 * Formulario de solicitud ARCO, compartido por la página pública y "Mis solicitudes". Con
 * `account` (sesión iniciada) no pide nombre ni correo: se usan los de la cuenta. Valida lo
 * mismo que el backend: nombre real, correo con dominio, teléfono de 10 dígitos, detalle
 * obligatorio para Rectificación/Oposición y aceptación del aviso de privacidad.
 */
export default function ArcoForm({ account, onSubmit, submitting }) {
  const [form, setForm] = useState({ requesterName: '', requesterEmail: '', requesterPhone: '', type: '', details: '' })
  const [accepted, setAccepted] = useState(false)
  const [touched, setTouched] = useState({})
  const needsDetail = form.type === 'RECTIFICATION' || form.type === 'OPPOSITION'

  const errors = {
    requesterName: account ? null : nameError(form.requesterName),
    requesterEmail: account ? null : emailError(form.requesterEmail),
    requesterPhone: phoneError(form.requesterPhone, false),
    type: form.type ? null : 'Elige qué quieres hacer',
    details: needsDetail && form.details.trim().length < 10 ? 'Cuéntanos qué dato o qué uso (mínimo 10 caracteres)' : null,
    accepted: accepted ? null : 'Acepta el aviso de privacidad',
  }
  const show = (f) => (touched[f] ? errors[f] : null)
  const set = (f, v) => setForm((s) => ({ ...s, [f]: v }))

  function handleSubmit(e) {
    e.preventDefault()
    setTouched({ requesterName: true, requesterEmail: true, requesterPhone: true, type: true, details: true, accepted: true })
    if (Object.values(errors).some(Boolean)) return
    onSubmit({
      requesterName: account ? undefined : form.requesterName.trim(),
      requesterEmail: account ? undefined : form.requesterEmail.trim(),
      requesterPhone: form.requesterPhone || undefined,
      type: form.type,
      details: form.details.trim() || undefined,
      acceptPrivacyNotice: accepted,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <p className="label">¿Qué derecho quieres ejercer?</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {ARCO_TYPES.map((t) => {
            const Icon = ICONS[t.value]
            const active = form.type === t.value
            return (
              <label key={t.value} className={`flex cursor-pointer items-start gap-3 rounded-2xl p-4 transition ${active ? 'bg-primary-50 ring-2 ring-primary-500' : 'bg-white ring-1 ring-slate-200 hover:ring-primary-300'}`}>
                <input type="radio" name="arco-type" className="sr-only" checked={active} onChange={() => set('type', t.value)} />
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500'}`}><Icon className="h-5 w-5" /></span>
                <span>
                  <span className="block font-semibold text-slate-900">{t.label}</span>
                  <span className="text-xs text-slate-500">{t.hint}</span>
                </span>
              </label>
            )
          })}
        </div>
        {show('type') && <p className="field-error">{show('type')}</p>}
      </div>

      {!account && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Nombre completo</label>
            <input className={`input ${show('requesterName') ? 'input-error' : ''}`} value={form.requesterName} autoComplete="name"
              onChange={(e) => set('requesterName', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, requesterName: true }))} />
            {show('requesterName') && <p className="field-error">{show('requesterName')}</p>}
          </div>
          <div>
            <label className="label">Correo electrónico</label>
            <input type="email" className={`input ${show('requesterEmail') ? 'input-error' : ''}`} value={form.requesterEmail} autoComplete="email"
              onChange={(e) => set('requesterEmail', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, requesterEmail: true }))} />
            {show('requesterEmail') ? <p className="field-error">{show('requesterEmail')}</p>
              : <p className="field-hint">El que diste al registrarte o al agendar: así sabemos que eres tú.</p>}
          </div>
        </div>
      )}

      <div>
        <label className="label">Teléfono <span className="font-normal text-slate-400">(opcional)</span></label>
        <input {...PHONE_INPUT_PROPS} className={`input sm:max-w-xs ${show('requesterPhone') ? 'input-error' : ''}`} value={form.requesterPhone}
          onChange={(e) => set('requesterPhone', onlyDigits(e.target.value))} onBlur={() => setTouched((t) => ({ ...t, requesterPhone: true }))} />
        {show('requesterPhone') && <p className="field-error">{show('requesterPhone')}</p>}
      </div>

      <div>
        <label className="label">Cuéntanos más {!needsDetail && <span className="font-normal text-slate-400">(opcional)</span>}</label>
        <textarea rows={4} maxLength={2000} className={`input ${show('details') ? 'input-error' : ''}`} value={form.details}
          placeholder={needsDetail ? 'Ej. mi apellido está mal escrito: es "Núñez", no "Nunez".' : 'Ej. en qué sede te atendiste o qué dato te interesa.'}
          onChange={(e) => set('details', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, details: true }))} />
        <div className="flex justify-between">
          {show('details') ? <p className="field-error">{show('details')}</p> : <span />}
          <p className="field-hint">{form.details.length}/2000</p>
        </div>
      </div>

      <div>
        <label className="flex items-start gap-2.5 text-sm text-slate-600">
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded accent-primary-600" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
          <span>Leí el <Link to="/aviso-de-privacidad" target="_blank" className="font-medium text-primary-700 hover:underline">aviso de privacidad</Link> y
            entiendo que el hospital puede pedirme identificarme antes de resolver mi solicitud.</span>
        </label>
        {show('accepted') && <p className="field-error">{show('accepted')}</p>}
      </div>

      <button type="submit" className="btn-primary btn-lg w-full sm:w-auto" disabled={submitting}>
        {submitting ? 'Enviando...' : 'Enviar solicitud'}
      </button>
    </form>
  )
}
