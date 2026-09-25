import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { changePassword } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { useNotify } from '../context/NotifyContext'
import PasswordInput from '../components/PasswordInput'

const HOME_BY_ROLE = { ADMIN: '/admin', RECEPTIONIST: '/recepcion', DOCTOR: '/doctor', PATIENT: '/' }

/** Cambio de contraseña: obligatorio en el primer login con contraseña temporal (patrón 02,
 * ver PrivateRoute.jsx) o voluntario desde el menú de cuenta. */
export default function ChangePassword() {
  const { user, applySession } = useAuth()
  const { notify } = useNotify()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await changePassword({ currentPassword, newPassword })
      const { token, user: userData } = res.data.data
      applySession(token, userData)
      notify('Contraseña actualizada correctamente', 'success')
      navigate(HOME_BY_ROLE[userData.role] || '/', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo actualizar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-app py-12 sm:py-20 flex justify-center">
      <div className="w-full max-w-sm card p-6 sm:p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Cambia tu contraseña</h1>
        <p className="text-sm text-gray-500 mb-6">
          {user?.mustChangePassword
            ? 'Por seguridad, debes cambiar la contraseña temporal antes de continuar.'
            : 'Actualiza tu contraseña de acceso.'}
        </p>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm">
            <span className="block text-gray-700 mb-1 font-medium">Contraseña actual</span>
            <PasswordInput required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="block text-gray-700 mb-1 font-medium">Nueva contraseña</span>
            <PasswordInput required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <span className="text-xs text-gray-400">Mínimo 8 caracteres</span>
          </label>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
