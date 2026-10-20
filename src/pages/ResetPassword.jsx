import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Link, useNavigate } from '../router'
import { resetPassword } from '../api/auth'
import PasswordInput from '../components/PasswordInput'
import AuthShell, { FormAlert } from '../layouts/AuthShell'
import { passwordProblem } from '../utils/validators'

export default function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const problem = passwordProblem(newPassword)
    if (problem) return setError(problem)
    if (newPassword !== confirm) return setError('Las contraseñas no coinciden')
    setError('')
    setLoading(true)
    try {
      await resetPassword({ token, newPassword })
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo restablecer la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell eyebrow="Recuperación" title="Crea una nueva contraseña"
      footer={!done && <Link to="/login" className="font-semibold text-primary-700 hover:underline">Volver a iniciar sesión</Link>}>
      {done ? (
        <div className="space-y-6 text-center">
          <div className="rounded-2xl bg-emerald-50 p-5 ring-1 ring-inset ring-emerald-600/20">
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-600" />
            <p className="text-sm text-emerald-800">Tu contraseña quedó actualizada.</p>
          </div>
          <button className="btn-primary btn-lg w-full" onClick={() => navigate('/login')}>Iniciar sesión</button>
        </div>
      ) : (
        <>
          {error && <FormAlert>{error}</FormAlert>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nueva contraseña</label>
              <PasswordInput required autoComplete="new-password" showStrength value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div>
              <label className="label">Confírmala</label>
              <PasswordInput required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
              {loading ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  )
}
