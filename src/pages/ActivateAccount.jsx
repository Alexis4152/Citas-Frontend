import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Link, useNavigate } from '../router'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { Spinner } from '../components/ui'

/** Activa una cuenta nueva cuyo correo ya tenía expediente, y la liga a ese expediente. */
export default function ActivateAccount() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { applySession } = useAuth()
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    api.post(`/auth/activate/${token}`)
      .then((r) => {
        setState({ status: 'ok' })
        applySession(r.data.data.token, r.data.data.user)
        setTimeout(() => navigate('/mis-citas'), 1800)
      })
      .catch((err) => setState({ status: 'error', message: err.response?.data?.message || 'No pudimos activar tu cuenta' }))
  }, [token])

  return (
    <div className="container-app max-w-md py-16 text-center">
      {state.status === 'loading' && <><Spinner className="mx-auto h-8 w-8" /><p className="mt-3 text-slate-500">Activando tu cuenta...</p></>}
      {state.status === 'ok' && (
        <>
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="mt-3 font-display text-2xl font-semibold text-slate-900">Cuenta activada</h1>
          <p className="mt-2 text-slate-500">Tu cuenta quedó ligada a tu expediente. Te llevamos a tus citas...</p>
        </>
      )}
      {state.status === 'error' && (
        <>
          <XCircle className="mx-auto h-12 w-12 text-rose-600" />
          <h1 className="mt-3 font-display text-2xl font-semibold text-slate-900">No se pudo activar</h1>
          <p className="mt-2 text-slate-500">{state.message}</p>
          <Link to="/login" className="btn-primary mt-6 inline-flex">Iniciar sesión</Link>
        </>
      )}
    </div>
  )
}
