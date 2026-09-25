import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { adminListDoctors } from '../../api/adminDoctors'
import { getSpecialties, getBranches } from '../../api/publicCatalog'
import AdminPagination from '../../components/AdminPagination'

const EMPTY_FILTERS = { specialtyId: '', branchId: '' }

export default function AdminDoctors() {
  const navigate = useNavigate()
  const [specialties, setSpecialties] = useState([])
  const [branches, setBranches] = useState([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [result, setResult] = useState({ content: [], page: 0, totalPages: 0, totalElements: 0 })
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    adminListDoctors({
      specialtyId: filters.specialtyId || undefined,
      branchId: filters.branchId || undefined,
      page, size,
    }).then((r) => setResult(r.data.data)).finally(() => setLoading(false))
  }

  // Selects: se aplican de inmediato al elegir una opción, sin botón "Filtrar".
  useEffect(() => { load() }, [page, size, filters])
  useEffect(() => {
    getSpecialties().then((r) => setSpecialties(r.data.data)).catch(() => {})
    getBranches().then((r) => setBranches(r.data.data)).catch(() => {})
  }, [])

  function updateFilter(field, value) {
    setPage(0)
    setFilters((f) => ({ ...f, [field]: value }))
  }

  function handleClearFilters() {
    setFilters(EMPTY_FILTERS)
    setPage(0)
  }

  const hasActiveFilters = !!(filters.specialtyId || filters.branchId)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Doctores</h1>
        <Link to="/admin/doctores/nuevo" className="btn-primary text-sm">+ Nuevo doctor</Link>
      </div>

      <div className="card p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[180px]">
          <label className="text-xs font-medium text-gray-600 block mb-1">Especialidad</label>
          <select className="input" value={filters.specialtyId} onChange={(e) => updateFilter('specialtyId', e.target.value)}>
            <option value="">Todas</option>
            {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="min-w-[180px]">
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

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <p className="text-gray-500 text-sm p-4">Cargando...</p>
        ) : (
          <>
            {/* Escritorio/tablet: tabla real (≥md). En móvil se oculta a favor de las tarjetas de abajo. */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Especialidad</th>
                    <th className="px-4 py-3 font-medium">Sedes</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {result.content.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => navigate(`/admin/doctores/${d.id}`)}
                      className="border-t border-gray-100 cursor-pointer hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-primary-700">Dr(a). {d.firstName} {d.lastName}</td>
                      <td className="px-4 py-3 text-gray-600">{d.specialty?.name}</td>
                      <td className="px-4 py-3 text-gray-600">{d.branches?.map((b) => b.name).join(' · ')}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Link to={`/admin/doctores/${d.id}`} className="text-primary-700 hover:underline text-sm">Ver historial</Link>
                      </td>
                    </tr>
                  ))}
                  {result.content.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Sin doctores</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Móvil (<md): tarjetas apiladas en vez de tabla con scroll horizontal. */}
            <div className="md:hidden divide-y divide-gray-100">
              {result.content.map((d) => (
                <button
                  key={d.id}
                  onClick={() => navigate(`/admin/doctores/${d.id}`)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50"
                >
                  <p className="font-medium text-primary-700">Dr(a). {d.firstName} {d.lastName}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{d.specialty?.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{d.branches?.map((b) => b.name).join(' · ')}</p>
                </button>
              ))}
              {result.content.length === 0 && (
                <p className="px-4 py-8 text-center text-gray-400 text-sm">Sin doctores</p>
              )}
            </div>
          </>
        )}
        <AdminPagination
          page={result.page} size={size} totalPages={result.totalPages} totalElements={result.totalElements}
          contentLength={result.content.length}
          onPageChange={setPage} onSizeChange={(s) => { setSize(s); setPage(0) }}
        />
      </div>
    </div>
  )
}
