import { useEffect, useState } from 'react'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { ARCO_STATUS, getPlatformArcoRequests } from '../../api/arco'
import { Badge, EmptyState, PageHeader, Skeleton } from '../../components/ui'
import { formatDate } from '../../utils/format'

/** Supervisión de la plataforma: solicitudes ARCO de todos los hospitales (las atiende el
 * admin de cada hospital; aquí solo se vigila que ninguna se quede sin respuesta). */
export default function SuperAdminArco() {
  const [status, setStatus] = useState('PENDING')
  const [rows, setRows] = useState(null)

  useEffect(() => {
    setRows(null)
    getPlatformArcoRequests(status).then((r) => setRows(r.data.data)).catch(() => setRows([]))
  }, [status])

  const overdue = rows?.filter((r) => r.overdue).length || 0

  return (
    <div>
      <PageHeader icon={ShieldCheck} eyebrow="Plataforma" title="Solicitudes ARCO"
        description="Todas las solicitudes de los hospitales. Cada hospital atiende las suyas desde su panel." />
      {overdue > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-inset ring-rose-600/20">
          <AlertTriangle className="h-4 w-4" /> {overdue} solicitud{overdue === 1 ? '' : 'es'} ya pasaron su fecha límite.
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        {[['PENDING', 'Pendientes'], ['', 'Todas'], ['COMPLETED', 'Completadas'], ['REJECTED', 'Rechazadas']].map(([v, l]) => (
          <button key={l} onClick={() => setStatus(v)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${status === v ? 'bg-ink-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{l}</button>
        ))}
      </div>
      <div className="card overflow-x-auto">
        {!rows ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Sin solicitudes" />
        ) : (
          <table className="w-full min-w-[720px]">
            <thead className="table-head bg-slate-50/60"><tr><th>Folio</th><th>Hospital</th><th>Tipo</th><th>Solicitante</th><th>Estado</th><th>Vence</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="table-row">
                  <td className="font-mono text-xs">{r.folio}</td>
                  <td className="font-medium text-slate-900">{r.hospitalName}</td>
                  <td>{r.typeLabel}</td>
                  <td><p className="text-slate-900">{r.requesterName}</p><p className="text-xs text-slate-500">{r.requesterEmail}</p></td>
                  <td><Badge tone={ARCO_STATUS[r.status]?.tone} dot>{r.statusLabel}</Badge> {r.overdue && <Badge tone="red">Vencida</Badge>}</td>
                  <td className="text-xs text-slate-500">{r.status === 'PENDING' ? r.dueDate : formatDate(r.resolvedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
