import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ArrowRight, Mail, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from '../router'
import { useAuth } from '../context/AuthContext'
import PasswordInput from '../components/PasswordInput'
import AuthShell, { FormAlert } from '../layouts/AuthShell'
import { getHospitalSlug } from '../tenant'

const HOME_BY_ROLE = { SUPER_ADMIN: '/superadmin', ADMIN: '/admin', RECEPTIONIST: '/recepcion', DOCTOR: '/doctor', PATIENT: '/' }

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const inHospital = Boolean(getHospitalSlug())
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const userData = await login(email.trim(), password)
      navigate(location.state?.from || HOME_BY_ROLE[userData.role] || '/')
    } catch (err) {
      setError(err.response?.data?.message || 'No pudimos iniciar tu sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow={inHospital ? 'Bienvenido de vuelta' : 'Nexora'}
      title="Inicia sesión"
      subtitle={inHospital
        ? 'Pacientes y personal del hospital entran aquí.'
        : 'Acceso de administración de la plataforma. Si eres paciente o personal, entra desde el enlace de tu hospital.'}
      footer={inHospital ? (
        <div className="space-y-3">
          <p>¿No tienes cuenta? <Link to="/registro" className="font-semibold text-primary-700 hover:underline">Regístrate gratis</Link></p>
          <p className="text-xs">
            <Link to="/derechos-arco" className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600">
              <ShieldCheck className="h-3.5 w-3.5" /> Derechos ARCO sobre tus datos personales
            </Link>
          </p>
        </div>
      ) : null}
    >
      {error && <FormAlert>{error}</FormAlert>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="login-email">Correo electrónico</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input id="login-email" required type="email" autoComplete="email" className="input pl-10" placeholder="tucorreo@ejemplo.com"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="label mb-0" htmlFor="login-password">Contraseña</label>
            <Link to="/recuperar-password" className="text-xs font-medium text-primary-700 hover:underline">¿La olvidaste?</Link>
          </div>
          <PasswordInput id="login-password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
          {loading ? 'Ingresando...' : <>Entrar <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
    </AuthShell>
  )
}
