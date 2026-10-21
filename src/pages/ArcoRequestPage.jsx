import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarClock, CheckCircle2, MailCheck, ShieldCheck } from 'lucide-react'
import { Link } from '../router'
import { useAuth } from '../context/AuthContext'
import { useHospitalConfig } from '../context/HospitalConfigContext'
import { useNotify } from '../context/NotifyContext'
import { createOwnArcoRequest, createPublicArcoRequest } from '../api/arco'
import ArcoForm from '../components/ArcoForm'

/**
 * Página pública de derechos ARCO del hospital (/c/<slug>/derechos-arco). Sin sesión se llena
 * con nombre y correo (debe ser el que el hospital tiene registrado); con sesión de paciente se
 * usan los de la cuenta y la solicitud aparece en "Mis solicitudes".
 */
export default function ArcoRequestPage() {
  const { user, role } = useAuth()
  const { config } = useHospitalConfig()
  const { notify } = useNotify()
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(null)
  const isPatient = role === 'PATIENT'
  const [params] = useSearchParams()
  const initialType = params.get('tipo') || ''

  async function handleSubmit(data) {
    setSubmitting(true)
    try {
      const res = isPatient ? await createOwnArcoRequest(data) : await createPublicArcoRequest(data)
      setSent(res.data.data)
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo enviar tu solicitud. Intenta más tarde.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <section className="aurora-soft border-b border-slate-200/70">
        <div className="container-app py-10 sm:py-14">
          <p className="eyebrow mb-2 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Protección de datos personales</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Ejerce tus derechos sobre tus datos</h1>
          <p className="mt-2 max-w-2xl text-slate-500">
            Tienes derecho a <strong>A</strong>cceder, <strong>R</strong>ectificar, <strong>C</strong>ancelar u <strong>O</strong>ponerte al uso de los datos
            personales que {config?.name || 'el hospital'} guarda de ti. Te respondemos en un máximo de 20 días hábiles.
          </p>
        </div>
      </section>

      <div className="container-app grid gap-6 py-8 lg:grid-cols-[1fr_320px]">
        <div className="card p-5 sm:p-7">
          {sent && sent.status === 'PENDING_EMAIL' ? (
            <div className="py-6 text-center animate-fade-up">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary-50 text-primary-600 ring-1 ring-primary-100">
                <MailCheck className="h-7 w-7" />
              </div>
              <h2 className="font-display text-2xl font-semibold text-slate-900">Revisa tu correo</h2>
              <p className="mx-auto mt-4 max-w-md text-sm text-slate-600">
                Si <strong>{sent.requesterEmail}</strong> está registrado en el hospital, te enviamos un enlace con el folio de tu solicitud. Ábrelo para confirmar que eres tú: hasta entonces la
                solicitud no se registra (así nadie puede pedir tus datos con tu correo). Desde ese mismo enlace podrás seguirla.
              </p>
              <p className="mx-auto mt-3 max-w-md text-xs text-slate-400">Si no lo ves, revisa tu carpeta de correo no deseado. Sin confirmar, se borra en 3 días. Si no te llega, quizá diste otro correo: acude a recepción con tu identificación.</p>
            </div>
          ) : sent ? (
            <div className="py-6 text-center animate-fade-up">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="font-display text-2xl font-semibold text-slate-900">Recibimos tu solicitud</h2>
              <p className="mt-2 text-slate-500">Folio <span className="font-mono font-semibold text-slate-800">{sent.folio}</span></p>
              <p className="mx-auto mt-4 max-w-md text-sm text-slate-600">
                Te enviamos el acuse a <strong>{sent.requesterEmail}</strong>. Responderemos a más tardar el{' '}
                <strong>{new Date(sent.dueDate + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {isPatient && <Link to="/mi-privacidad" className="btn-primary">Ir a mi centro de privacidad</Link>}
                <Link to="/" className="btn-secondary">Volver al inicio</Link>
              </div>
            </div>
          ) : (
            <>
              {isPatient && (
                <p className="mb-5 rounded-xl bg-primary-50 px-4 py-3 text-sm text-primary-800 ring-1 ring-inset ring-primary-600/15">
                  Se enviará a nombre de <strong>{user.firstName} {user.lastName}</strong> ({user.email}).
                </p>
              )}
              <ArcoForm account={isPatient ? user : null} onSubmit={handleSubmit} submitting={submitting} initialType={initialType} />
            </>
          )}
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <div className="card p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Cómo funciona</p>
            <ol className="space-y-3 text-sm text-slate-600">
              {['Envías tu solicitud y confirmas tu correo con el enlace que te llega.',
                'Subes tu identificación desde el seguimiento (o la muestras en recepción).',
                'Te respondemos en máximo 20 días hábiles, con constancia en PDF.',
                'Si procede, lo hacemos efectivo en los 15 días hábiles siguientes.'].map((t, i) => (
                <li key={t} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-600 text-xs font-bold text-white">{i + 1}</span>{t}</li>
              ))}
            </ol>
          </div>
          <div className="card flex items-start gap-3 p-5 text-sm text-slate-600">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <p>El expediente clínico tiene plazos legales de conservación: una Cancelación puede proceder solo en parte.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
