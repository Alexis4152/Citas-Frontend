import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSpecialties, getBranches, searchDoctors } from '../api/publicCatalog'
import { resolveMediaUrl } from '../utils/media'
import AdminPagination from '../components/AdminPagination'

const EMPTY_FILTERS = { specialtyId: '', branchId: '' }

export default function Doctors() {
  const [specialties, setSpecialties] = useState([])
  const [branches, setBranches] = useState([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(12)
  const [result, setResult] = useState({ content: [], page: 0, totalPages: 0, totalElements: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSpecialties().then((r) => setSpecialties(r.data.data)).catch(() => {})
    getBranches().then((r) => setBranches(r.data.data)).catch(() => {})
  }, [])

  // Los filtros son selects (especialidad/sede): se aplican de inmediato al elegir una
  // opción, sin botón "Filtrar" -- no hay texto libre aquí que justifique un paso extra.
  useEffect(() => {
    setLoading(true)
    searchDoctors({
      specialtyId: filters.specialtyId || undefined,
      branchId: filters.branchId || undefined,
      page, size,
    })
      .then((r) => setResult(r.data.data))
      .finally(() => setLoading(false))
  }, [filters, page, size])

  function updateFilter(field, value) {
    setPage(0)
    setFilters((f) => ({ ...f, [field]: value }))
  }

  function handleClearFilters() {
    setPage(0)
    setFilters(EMPTY_FILTERS)
  }

  const hasActiveFilters = !!(filters.specialtyId || filters.branchId)

  return (
    <div className="container-app py-8 sm:py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Buscar doctor</h1>

      <div className="card p-4 mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px]">
          <label className="text-xs font-medium text-gray-600 block mb-1">Especialidad</label>
          <select className="input" value={filters.specialtyId} onChange={(e) => updateFilter('specialtyId', e.target.value)}>
            <option value="">Todas</option>
            {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="min-w-[200px]">
          <label className="text-xs font-medium text-gray-600 block mb-1">Sede</label>
          <select className="input" value={filters.branchId} onChange={(e) => updateFilter('branchId', e.target.value)}>
            <option value="">Todas</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        {hasActiveFilters && (
          <button type="button" className="btn-secondary text-sm" onClick={handleClearFilters}>Limpiar</button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Cargando...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {result.content.map((d) => (
              <Link key={d.id} to={`/doctores/${d.id}`} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  {d.photoUrl ? (
                    <img src={resolveMediaUrl(d.photoUrl)} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                      {d.firstName?.[0]}{d.lastName?.[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">Dr(a). {d.firstName} {d.lastName}</p>
                    <p className="text-sm text-primary-700">{d.specialty?.name}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {d.branches?.map((b) => b.name).join(' · ') || 'Sin sede asignada'}
                </p>
              </Link>
            ))}
            {result.content.length === 0 && (
              <p className="text-gray-400 text-sm col-span-full text-center py-10">No se encontraron doctores con esos filtros.</p>
            )}
          </div>

          {result.content.length > 0 && (
            <div className="card p-0 mt-6">
              <AdminPagination
                page={result.page} size={size} totalPages={result.totalPages} totalElements={result.totalElements}
                contentLength={result.content.length}
                onPageChange={setPage} onSizeChange={(s) => { setSize(s); setPage(0) }}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
