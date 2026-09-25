import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PasswordInput from '../components/PasswordInput'
import { onlyDigits, PHONE_INPUT_PROPS } from '../utils/phone'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.phone && form.phone.length !== 10) {
      setError('El teléfono debe tener exactamente 10 dígitos')
      return
    }
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'No pudimos crear tu cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-app py-12 sm:py-20 flex justify-center">
      <div className="w-full max-w-md card p-6 sm:p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Crear cuenta</h1>
        <p className="text-sm text-gray-500 mb-6">Regístrate como paciente para agendar y consultar tus citas.</p>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="block text-gray-700 mb-1 font-medium">Nombre</span>
              <input required className="input" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="block text-gray-700 mb-1 font-medium">Apellido</span>
              <input required className="input" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} />
            </label>
          </div>
          <label className="block text-sm">
            <span className="block text-gray-700 mb-1 font-medium">Correo electrónico</span>
            <input required type="email" className="input" value={form.email} onChange={(e) => update('email', e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="block text-gray-700 mb-1 font-medium">Teléfono</span>
            <input className="input" {...PHONE_INPUT_PROPS} value={form.phone} onChange={(e) => update('phone', onlyDigits(e.target.value))} />
          </label>
          <label className="block text-sm">
            <span className="block text-gray-700 mb-1 font-medium">Contraseña</span>
            <PasswordInput required minLength={8} value={form.password} onChange={(e) => update('password', e.target.value)} />
            <span className="text-xs text-gray-400">Mínimo 8 caracteres, con al menos una mayúscula y un número</span>
          </label>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-6 text-center">
          ¿Ya tienes cuenta? <Link to="/login" className="text-primary-700 font-medium hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}
