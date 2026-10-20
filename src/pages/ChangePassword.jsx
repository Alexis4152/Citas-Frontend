import { useState } from 'react'
import { useNavigate } from '../router'
import { changePassword } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { useNotify } from '../context/NotifyContext'
import PasswordInput from '../components/PasswordInput'
import AuthShell, { FormAlert } from '../layouts/AuthShell'
import { passwordProblem } from '../utils/validators'

const HOME_BY_ROLE = { SUPER_ADMIN: '/superadmin', ADMIN: '/admin', RECEPTIONIST: '/recepcion', DOCTOR: '/doctor', PATIENT: '/' }

/** Cambio de contraseña: obligatorio en el primer login con contraseña temporal (ver
 * PrivateRoute.jsx) o voluntario desde el menú de cuenta. */
export default function ChangePassword() {
  const { user, applySession } = useAuth()
  const { notify } = useNotify()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const problem = passwordProblem(newPassword)
    if (problem) return setError(problem)
    if (newPassword === currentPassword) return setError('La nueva contraseña debe ser distinta de la actual')
    if (newPassword !== confirm) return setError('Las contraseñas nuevas no coinciden')
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
    <AuthShell eyebrow="Seguridad" title="Cambia tu contraseña"
      subtitle={user?.mustChangePassword
        ? 'Por seguridad, cambia la contraseña temporal antes de continuar.'
        : 'Actualiza tu contraseña de acceso.'}
      footer={!user?.mustChangePassword && (
        <button type="button" onClick={() => navigate(-1)} className="font-semibold text-primary-700 hover:underline">Volver</button>
      )}>
      {error && <FormAlert>{error}</FormAlert>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Contraseña actual</label>
          <PasswordInput required autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </div>
        <div>
          <label className="label">Nueva contraseña</label>
          <PasswordInput required autoComplete="new-password" showStrength value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        <div>
          <label className="label">Confirma la nueva contraseña</label>
          <PasswordInput required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
          {loading ? 'Guardando...' : 'Cambiar contraseña'}
        </button>
      </form>
    </AuthShell>
  )
}
