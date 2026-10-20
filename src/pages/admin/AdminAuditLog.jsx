import { useEffect, useState } from 'react'
import { History, Search } from 'lucide-react'
import api from '../../api/axios'
import AdminPagination from '../../components/AdminPagination'
import { Avatar, Badge, EmptyState, PageHeader, Skeleton } from '../../components/ui'
import { formatDate, localTodayIso } from '../../utils/format'
import useDebouncedValue from '../../hooks/useDebouncedValue'

const ROLE_LABEL = { ADMIN: 'Admin', RECEPTIONIST: 'Recepción', DOCTOR: 'Doctor', PATIENT: 'Paciente' }
const ENTITY_LABEL = { PATIENT: 'Paciente', PRESCRIPTION: 'Receta', APPOINTMENT: 'Cita', PAYMENT: 'Cobro', ARCO: 'Solicitud ARCO' }
const TONE = {
  VIEW_PATIENT: 'blue', VIEW_PRESCRIPTIONS: 'blue', DOWNLOAD_PRESCRIPTION: 'purple', DOWNLOAD_RECEIPT: 'purple',
  UPDATE_MEDICAL_INFO: 'amber', MERGE_PATIENTS: 'amber', VOID_PRESCRIPTION: 'red', REFUND_PAYMENT: 'red',
  EXPORT_PATIENTS: 'red', IMPORT_PATIENTS: 'amber', ARCO_EXPORT: 'red', ARCO_RESOLVE: 'green', CREATE_PRESCRIPTION: 'green',
}

function daysAgoIso(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Bitácora: quién vio, descargó o cambió expedientes, recetas, cobros y solicitudes ARCO. */
export default function AdminAuditLog() {
  const [actions, setActions] = useState({})
  const [filters, setFilters] = useState({ action: '', user: '', from: daysAgoIso(7), to: localTodayIso() })
  const user = useDebouncedValue(filters.user, 350)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(25)
  const [result, setResult] = useState(null)

  useEffect(() => { api.get('/admin/audit-logs/actions').then((r) => setActions(r.data.data)).catch(() => {}) }, [])

  useEffect(() => {
    setResult(null)
    api.get('/admin/audit-logs', { params: { action: filters.action || undefined, user: user || undefined, from: filters.from, to: filters.to, page, size } })
      .then((r) => setResult(r.data.data)).catch(() => setResult({ content: [], totalPages: 0, totalElements: 0, page: 0 }))
  }, [filters.action, user, filters.from, filters.to, page, size])

  const set = (k, v) => { setPage(0); setFilters((f) => ({ ...f, [k]: v })) }

  return (
    <div>
      <PageHeader icon={History} eyebrow="Seguridad" title="Bitácora de accesos"
        description="Quién consultó, descargó o cambió expedientes, recetas, cobros y solicitudes ARCO. No se puede editar ni borrar." />

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-10" placeholder="Buscar por usuario" value={filters.user} onChange={(e) => set('user', e.target.value)} />
        </div>
        <select className="input" value={filters.action} onChange={(e) => set('action', e.target.value)}>
          <option value="">Todas las acciones</option>
          {Object.entries(actions).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <input type="date" className="input" value={filters.from} max={filters.to} onChange={(e) => set('from', e.target.value)} />
        <input type="date" className="input" value={filters.to} min={filters.from} onChange={(e) => set('to', e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        {!result ? (
          <div className="space-y-3 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : result.content.length === 0 ? (
          <EmptyState icon={History} title="Sin movimientos" description="No hay registros con esos filtros en ese periodo." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="table-head bg-slate-50/60"><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Registro</th><th>IP</th></tr></thead>
                <tbody>
                  {result.content.map((l) => {
                    const [first, ...rest] = (l.userName || '').split(' ')
                    return (
                      <tr key={l.id} className="table-row">
                        <td className="whitespace-nowrap text-slate-600">{formatDate(l.createdAt)}</td>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <Avatar first={first} last={rest.join(' ')} size="h-8 w-8 text-[11px]" />
                            <div>
                              <p className="font-medium text-slate-900">{l.userName}</p>
                              <p className="text-xs text-slate-500">{ROLE_LABEL[l.userRole] || l.userRole}</p>
                            </div>
                          </div>
                        </td>
                        <td><Badge tone={TONE[l.action] || 'slate'} dot>{l.actionLabel}</Badge></td>
                        <td className="text-slate-600">{l.entityType ? `${ENTITY_LABEL[l.entityType] || l.entityType} #${l.entityId ?? '—'}` : '—'}</td>
                        <td className="font-mono text-xs text-slate-400">{l.clientIp}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <AdminPagination page={result.page} size={size} totalPages={result.totalPages} totalElements={result.totalElements}
              contentLength={result.content.length} onPageChange={setPage} onSizeChange={(s) => { setSize(s); setPage(0) }} />
          </>
        )}
      </div>
    </div>
  )
}
