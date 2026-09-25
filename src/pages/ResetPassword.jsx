import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { resetPassword } from '../api/auth'
import PasswordInput from '../components/PasswordInput'

export default function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
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
    <div className="container-app py-12 sm:py-20 flex justify-center">
      <div className="w-full max-w-sm card p-6 sm:p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Restablecer contraseña</h1>

        {done ? (
          <>
            <p className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3 py-2 mt-4">
              Tu contraseña fue actualizada correctamente.
            </p>
            <button className="btn-primary w-full mt-6" onClick={() => navigate('/login')}>Iniciar sesión</button>
          </>
        ) : (
          <>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 my-4">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              <label className="block text-sm">
                <span className="block text-gray-700 mb-1 font-medium">Nueva contraseña</span>
                <PasswordInput required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <span className="text-xs text-gray-400">Mínimo 8 caracteres</span>
              </label>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Guardando...' : 'Restablecer contraseña'}
              </button>
            </form>
            <p className="text-sm text-gray-500 mt-6 text-center">
              <Link to="/login" className="text-primary-700 font-medium hover:underline">Volver a iniciar sesión</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
