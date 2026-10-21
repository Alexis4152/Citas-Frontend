import { useState } from 'react'
import { Link, useNavigate } from '../router'
import { useAuth } from '../context/AuthContext'
import PasswordInput from '../components/PasswordInput'
import AuthShell, { FormAlert } from '../layouts/AuthShell'
import { onlyDigits, PHONE_INPUT_PROPS } from '../utils/phone'
import { emailError, nameError, passwordProblem, phoneError } from '../utils/validators'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' })
  const [touched, setTouched] = useState({})
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(null)
  const [loading, setLoading] = useState(false)

  const errors = {
    firstName: nameError(form.firstName),
    lastName: nameError(form.lastName),
    email: emailError(form.email),
    phone: phoneError(form.phone, false),
    password: passwordProblem(form.password),
  }
  const show = (field) => (touched[field] ? errors[field] : null)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setTouched({ firstName: true, lastName: true, email: true, phone: true, password: true })
    if (Object.values(errors).some(Boolean)) return
    if (!accepted) {
      setError('Acepta el aviso de privacidad para crear tu cuenta')
      return
    }
    setError('')
    setLoading(true)
    try {
      const result = await register({ ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(),
        acceptPrivacyNotice: true })
      if (result?.pendingActivation) {
        setPending(result.message)
        return
      }
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'No pudimos crear tu cuenta')
    } finally {
      setLoading(false)
    }
  }

  const field = (name) => ({
    className: `input ${show(name) ? 'input-error' : ''}`,
    onBlur: () => setTouched((t) => ({ ...t, [name]: true })),
  })

  return (
    <AuthShell eyebrow="Pacientes" title="Crea tu cuenta" subtitle="Agenda más rápido, consulta tu historial y recibe avisos de tus citas." wide
      footer={<p>¿Ya tienes cuenta? <Link to="/login" className="font-semibold text-primary-700 hover:underline">Inicia sesión</Link></p>}>
      {error && <FormAlert>{error}</FormAlert>}
      {pending && (
        <div className="mb-4 rounded-2xl bg-primary-50 p-4 text-sm text-primary-900 ring-1 ring-inset ring-primary-600/20">
          <p className="font-semibold">Revisa tu correo</p>
          <p className="mt-1">{pending}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className={`space-y-4 ${pending ? 'hidden' : ''}`} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="reg-first">Nombre</label>
            <input id="reg-first" autoComplete="given-name" {...field('firstName')} value={form.firstName} onChange={(e) => update('firstName', e.target.value)} />
            {show('firstName') && <p className="field-error">{show('firstName')}</p>}
          </div>
          <div>
            <label className="label" htmlFor="reg-last">Apellido</label>
            <input id="reg-last" autoComplete="family-name" {...field('lastName')} value={form.lastName} onChange={(e) => update('lastName', e.target.value)} />
            {show('lastName') && <p className="field-error">{show('lastName')}</p>}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="reg-email">Correo electrónico</label>
          <input id="reg-email" type="email" autoComplete="email" {...field('email')} value={form.email} onChange={(e) => update('email', e.target.value)} />
          {show('email') && <p className="field-error">{show('email')}</p>}
        </div>
        <div>
          <label className="label" htmlFor="reg-phone">Teléfono <span className="font-normal text-slate-400">(opcional)</span></label>
          <input id="reg-phone" {...PHONE_INPUT_PROPS} {...field('phone')} value={form.phone} onChange={(e) => update('phone', onlyDigits(e.target.value))} />
          {show('phone') && <p className="field-error">{show('phone')}</p>}
        </div>
        <div>
          <label className="label" htmlFor="reg-pass">Contraseña</label>
          <PasswordInput id="reg-pass" autoComplete="new-password" showStrength className={`input ${show('password') ? 'input-error' : ''}`}
            value={form.password} onChange={(e) => update('password', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, password: true }))} />
          {show('password') && <p className="field-error">{show('password')}</p>}
        </div>
        <label className="flex items-start gap-2.5 text-sm text-slate-600">
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded accent-primary-600" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
          <span>Leí y acepto el <Link to="/aviso-de-privacidad" className="font-medium text-primary-700 hover:underline" target="_blank">aviso de privacidad</Link> y
            doy mi consentimiento expreso para el tratamiento de mis datos de salud.</span>
        </label>
        <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>
    </AuthShell>
  )
}
