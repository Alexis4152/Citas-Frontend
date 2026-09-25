import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/auth'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await forgotPassword({ email })
    } finally {
      // Misma respuesta exista o no la cuenta (patrón 02, anti-enumeración): el mensaje de
      // éxito se muestra siempre, sin importar si la llamada tuvo éxito o falló.
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div className="container-app py-12 sm:py-20 flex justify-center">
      <div className="w-full max-w-sm card p-6 sm:p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Recuperar contraseña</h1>
        <p className="text-sm text-gray-500 mb-6">Te enviaremos un enlace para restablecerla.</p>

        {sent ? (
          <p className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3 py-2">
            Si el correo existe, te enviamos instrucciones para recuperar tu contraseña.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm">
              <span className="block text-gray-700 mb-1 font-medium">Correo electrónico</span>
              <input required type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>
          </form>
        )}

        <p className="text-sm text-gray-500 mt-6 text-center">
          <Link to="/login" className="text-primary-700 font-medium hover:underline">Volver a iniciar sesión</Link>
        </p>
      </div>
    </div>
  )
}
