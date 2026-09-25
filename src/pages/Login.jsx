import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PasswordInput from '../components/PasswordInput'

const HOME_BY_ROLE = { ADMIN: '/admin', RECEPTIONIST: '/recepcion', DOCTOR: '/doctor', PATIENT: '/' }

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
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
      const userData = await login(email, password)
      navigate(location.state?.from || HOME_BY_ROLE[userData.role] || '/')
    } catch (err) {
      setError(err.response?.data?.message || 'No pudimos iniciar tu sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-app py-12 sm:py-20 flex justify-center">
      <div className="w-full max-w-sm card p-6 sm:p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Iniciar sesión</h1>
        <p className="text-sm text-gray-500 mb-6">Ingresa a tu cuenta para agendar y ver tus citas.</p>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm">
            <span className="block text-gray-700 mb-1 font-medium">Correo electrónico</span>
            <input required type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="block text-gray-700 mb-1 font-medium">Contraseña</span>
            <PasswordInput required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <div className="text-right -mt-2">
            <Link to="/recuperar-password" className="text-xs text-primary-700 hover:underline">¿Olvidaste tu contraseña?</Link>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-6 text-center">
          ¿No tienes cuenta? <Link to="/registro" className="text-primary-700 font-medium hover:underline">Regístrate</Link>
        </p>
      </div>
    </div>
  )
}
