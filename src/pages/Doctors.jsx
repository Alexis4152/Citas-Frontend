import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ArrowRight, Building2, Search, Stethoscope, X } from 'lucide-react'
import { Link } from '../router'
import { getSpecialties, getBranches, searchDoctors } from '../api/publicCatalog'
import { resolveMediaUrl } from '../utils/media'
import { formatMoney, hasPrice } from '../utils/money'
import AdminPagination from '../components/AdminPagination'
import { Avatar, EmptyState } from '../components/ui'

export default function Doctors() {
  const location = useLocation()
  const [specialties, setSpecialties] = useState([])
  const [branches, setBranches] = useState([])
  const [filters, setFilters] = useState({ specialtyId: location.state?.specialtyId ? String(location.state.specialtyId) : '', branchId: '' })
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(12)
  const [result, setResult] = useState({ content: [], page: 0, totalPages: 0, totalElements: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSpecialties().then((r) => setSpecialties(r.data.data)).catch(() => {})
    getBranches().then((r) => setBranches(r.data.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    searchDoctors({ specialtyId: filters.specialtyId || undefined, branchId: filters.branchId || undefined, page, size })
      .then((r) => setResult(r.data.data))
      .finally(() => setLoading(false))
  }, [filters, page, size])

  function updateFilter(field, value) {
    setPage(0)
    setFilters((f) => ({ ...f, [field]: value }))
  }

  const hasActiveFilters = !!(filters.specialtyId || filters.branchId)

  return (
    <div>
      <section className="aurora-soft border-b border-slate-200/70">
        <div className="container-app py-10 sm:py-14">
          <p className="eyebrow mb-2">Directorio</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Encuentra a tu doctor</h1>
          <p className="mt-2 max-w-xl text-slate-500">Elige especialidad y sede; en el perfil de cada doctor ves sus horarios libres al momento.</p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Chip active={!filters.specialtyId} onClick={() => updateFilter('specialtyId', '')}>Todas</Chip>
            {specialties.map((s) => (
              <Chip key={s.id} active={filters.specialtyId === String(s.id)} onClick={() => updateFilter('specialtyId', String(s.id))}>{s.name}</Chip>
            ))}
          </div>
          {branches.length > 1 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400"><Building2 className="h-3.5 w-3.5" /> Sede</span>
              <select className="input !w-auto !py-1.5 text-sm" value={filters.branchId} onChange={(e) => updateFilter('branchId', e.target.value)}>
                <option value="">Todas las sedes</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              {hasActiveFilters && (
                <button type="button" className="btn-ghost btn-sm" onClick={() => { setPage(0); setFilters({ specialtyId: '', branchId: '' }) }}>
                  <X className="h-3.5 w-3.5" /> Limpiar
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="container-app py-8 sm:py-10">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-44 rounded-2xl" />)}</div>
        ) : result.content.length === 0 ? (
          <div className="card"><EmptyState icon={Search} title="Sin resultados" description="No hay doctores con esos filtros. Prueba con otra especialidad o sede." /></div>
        ) : (
          <>
            <p className="mb-4 text-sm text-slate-500">{result.totalElements} doctor{result.totalElements === 1 ? '' : 'es'}</p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {result.content.map((d) => (
                <Link key={d.id} to={`/doctores/${d.id}`} className="card card-hover group flex flex-col p-5">
                  <div className="flex items-center gap-4">
                    <Avatar first={d.firstName} last={d.lastName} src={d.photoUrl ? resolveMediaUrl(d.photoUrl) : null} size="h-14 w-14 text-base" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">Dr(a). {d.firstName} {d.lastName}</p>
                      <p className="flex items-center gap-1 truncate text-sm font-medium text-primary-700"><Stethoscope className="h-3.5 w-3.5" /> {d.specialty?.name}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {d.branches?.length ? d.branches.map((b) => (
                      <span key={b.id} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">{b.name}</span>
                    )) : <span className="text-xs text-slate-400">Sin sede asignada</span>}
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 mt-5">
                    <span className="text-sm">
                      {hasPrice(d.consultationPrice)
                        ? <span className="font-semibold text-slate-900">{formatMoney(d.consultationPrice)}</span>
                        : <span className="text-slate-500">Precio en recepción</span>}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-semibold text-primary-700">
                      Ver horarios <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="card mt-6 p-0">
              <AdminPagination page={result.page} size={size} totalPages={result.totalPages} totalElements={result.totalElements}
                contentLength={result.content.length} onPageChange={setPage} onSizeChange={(s) => { setSize(s); setPage(0) }} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${active ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-primary-300'}`}>
      {children}
    </button>
  )
}
