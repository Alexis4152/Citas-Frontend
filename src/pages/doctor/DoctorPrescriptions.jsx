import { useEffect, useState } from 'react'
import { getOwnProfile, updateOwnProfile, searchOwnPrescriptions, downloadPrescriptionPdf } from '../../api/doctorPortal'
import { useNotify } from '../../context/NotifyContext'
import { formatDate, formatDateOnly } from '../../utils/format'
import { downloadBlob } from '../../utils/media'
import AdminPagination from '../../components/AdminPagination'
import useDebouncedValue from '../../hooks/useDebouncedValue'

/**
 * Módulo "Recetas" del doctor: arriba, la plantilla base que se precarga al generar una
 * receta nueva desde "Mi agenda" (ver DoctorAgenda.jsx); abajo, el historial de todas las
 * recetas que ha emitido, buscable por paciente -- así queda un rastro consultable de lo
 * recetado, en vez de que cada PDF se pierda apenas se descarga.
 */
export default function DoctorPrescriptions() {
  const { notify } = useNotify()
  const [profile, setProfile] = useState(null)
  const [template, setTemplate] = useState('')
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [savingTemplate, setSavingTemplate] = useState(false)

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [result, setResult] = useState({ content: [], page: 0, totalPages: 0, totalElements: 0 })
  const [loadingList, setLoadingList] = useState(true)

  useEffect(() => {
    getOwnProfile().then((r) => {
      setProfile(r.data.data)
      setTemplate(r.data.data.prescriptionTemplate || '')
    }).finally(() => setLoadingProfile(false))
  }, [])

  useEffect(() => { setPage(0) }, [debouncedQuery])

  useEffect(() => {
    setLoadingList(true)
    searchOwnPrescriptions({ patientQuery: debouncedQuery || undefined, page, size })
      .then((r) => setResult(r.data.data))
      .finally(() => setLoadingList(false))
  }, [debouncedQuery, page, size])

  async function handleSaveTemplate(e) {
    e.preventDefault()
    setSavingTemplate(true)
    try {
      // Se manda el perfil completo (no solo la plantilla): el endpoint reemplaza bio/foto
      // tal como vengan en el body, así que hay que reenviar lo que ya tenía para no borrarlo.
      const res = await updateOwnProfile({ bio: profile.bio, photoUrl: profile.photoUrl, prescriptionTemplate: template })
      setProfile(res.data.data)
      notify('Plantilla de receta guardada', 'success')
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar la plantilla', 'error')
    } finally {
      setSavingTemplate(false)
    }
  }

  async function handleDownload(id) {
    try {
      const res = await downloadPrescriptionPdf(id)
      downloadBlob(res.data, `receta-${id}.pdf`)
    } catch {
      notify('No se pudo descargar la receta', 'error')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Recetas</h1>

      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-1">Mi plantilla de receta</h2>
        <p className="text-sm text-gray-500 mb-3">
          Este texto se precarga cada vez que generas una receta nueva desde "Mi agenda" -- lo
          ajustas libremente para cada paciente antes de generar el PDF.
        </p>
        {loadingProfile ? (
          <p className="text-gray-500 text-sm">Cargando...</p>
        ) : (
          <form onSubmit={handleSaveTemplate} className="space-y-3">
            <textarea
              rows={6} className="input"
              placeholder="Ej. Indicaciones generales, dosis habituales, recomendaciones..."
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
            />
            <div className="flex justify-end">
              <button type="submit" disabled={savingTemplate} className="btn-primary">
                {savingTemplate ? 'Guardando...' : 'Guardar plantilla'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <input
            className="input max-w-xs" placeholder="Buscar por paciente..."
            value={query} onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loadingList ? (
          <p className="text-gray-500 text-sm p-4">Cargando...</p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Paciente</th>
                    <th className="px-4 py-3 font-medium">Cita</th>
                    <th className="px-4 py-3 font-medium">Emitida</th>
                    <th className="px-4 py-3 font-medium">Indicaciones</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {result.content.map((p) => (
                    <tr key={p.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.patientName}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{formatDateOnly(p.appointmentDate)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(p.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{p.content}</td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-primary-700 text-xs font-medium hover:underline" onClick={() => handleDownload(p.id)}>
                          Descargar PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                  {result.content.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin recetas</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-100">
              {result.content.map((p) => (
                <div key={p.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-900">{p.patientName}</p>
                    <button className="text-primary-700 text-xs font-medium hover:underline shrink-0" onClick={() => handleDownload(p.id)}>
                      Descargar PDF
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 capitalize">Cita: {formatDateOnly(p.appointmentDate)} · Emitida: {formatDate(p.createdAt)}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.content}</p>
                </div>
              ))}
              {result.content.length === 0 && (
                <p className="px-4 py-8 text-center text-gray-400 text-sm">Sin recetas</p>
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
