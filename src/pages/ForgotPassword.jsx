import { useState } from 'react'
import { MailCheck } from 'lucide-react'
import { Link } from '../router'
import { forgotPassword } from '../api/auth'
import AuthShell from '../layouts/AuthShell'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await forgotPassword({ email: email.trim() })
    } finally {
      // Misma respuesta exista o no la cuenta (anti-enumeración).
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <AuthShell eyebrow="Recuperación" title="¿Olvidaste tu contraseña?" subtitle="Te mandamos un enlace para crear una nueva."
      footer={<Link to="/login" className="font-semibold text-primary-700 hover:underline">Volver a iniciar sesión</Link>}>
      {sent ? (
        <div className="rounded-2xl bg-emerald-50 p-5 text-center ring-1 ring-inset ring-emerald-600/20">
          <MailCheck className="mx-auto mb-3 h-8 w-8 text-emerald-600" />
          <p className="text-sm text-emerald-800">Si el correo está registrado, te enviamos las instrucciones. Revisa también tu carpeta de spam.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="forgot-email">Correo electrónico</label>
            <input id="forgot-email" required type="email" autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
