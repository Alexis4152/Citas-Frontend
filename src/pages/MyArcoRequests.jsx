import { useEffect, useState } from 'react'
import { Plus, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNotify } from '../context/NotifyContext'
import { ARCO_STATUS, createOwnArcoRequest, getMyArcoRequests } from '../api/arco'
import ArcoForm from '../components/ArcoForm'
import Modal from '../components/Modal'
import { Badge, EmptyState, Skeleton } from '../components/ui'
import { formatDate } from '../utils/format'

/** "Mis solicitudes ARCO" del paciente con cuenta: historial y nueva solicitud. */
export default function MyArcoRequests() {
  const { user } = useAuth()
  const { notify } = useNotify()
  const [requests, setRequests] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const load = () => getMyArcoRequests().then((r) => setRequests(r.data.data)).catch(() => setRequests([]))
  useEffect(() => { load() }, [])

  async function handleSubmit(data) {
    setSubmitting(true)
    try {
      const res = await createOwnArcoRequest(data)
      notify(`Solicitud ${res.data.data.folio} enviada`, 'success')
      setShowForm(false)
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo enviar la solicitud', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container-app max-w-4xl py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Tus datos personales</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">Mis solicitudes ARCO</h1>
          <p className="mt-1 text-slate-500">Acceso, Rectificación, Cancelación u Oposición sobre tus datos.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Nueva solicitud</button>
      </div>

      <div className="card overflow-hidden">
        {!requests ? (
          <div className="space-y-3 p-5">{[0, 1].map((i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : requests.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Aún no tienes solicitudes" description="Cuando ejerzas un derecho ARCO, aquí verás su avance y la respuesta del hospital." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {requests.map((r) => (
              <li key={r.id} className="space-y-2 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={ARCO_STATUS[r.status]?.tone} dot>{r.statusLabel}</Badge>
                  <span className="text-sm font-semibold text-slate-900">{r.typeLabel}</span>
                  <span className="font-mono text-xs text-slate-400">{r.folio}</span>
                  <span className="ml-auto text-xs text-slate-400">{formatDate(r.createdAt)}</span>
                </div>
                {r.details && <p className="whitespace-pre-wrap text-sm text-slate-600">{r.details}</p>}
                {r.status === 'PENDING' ? (
                  <p className="text-xs text-slate-500">Respuesta a más tardar el {new Date(r.dueDate + 'T00:00:00').toLocaleDateString('es-MX', { dateStyle: 'long' })}.</p>
                ) : (
                  <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-200">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Respuesta del hospital · {formatDate(r.resolvedAt)}</p>
                    <p className="whitespace-pre-wrap text-sm text-slate-700">{r.resolutionNotes}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {showForm && (
        <Modal title="Nueva solicitud ARCO" description={`A nombre de ${user?.firstName} ${user?.lastName} (${user?.email})`}
          icon={ShieldCheck} maxWidth="max-w-2xl" onClose={() => !submitting && setShowForm(false)}>
          <ArcoForm account={user} onSubmit={handleSubmit} submitting={submitting} />
        </Modal>
      )}
    </div>
  )
}
