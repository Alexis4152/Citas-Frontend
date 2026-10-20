import { useEffect, useState } from 'react'
import { getOwnProfile, updateOwnProfile, searchOwnPrescriptions, downloadPrescriptionPdf } from '../../api/doctorPortal'
import { useNotify } from '../../context/NotifyContext'
import { formatDate, formatDateOnly } from '../../utils/format'
import { downloadBlob } from '../../utils/media'
import AdminPagination from '../../components/AdminPagination'
import PrescriptionViewModal from '../../components/PrescriptionViewModal'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { ChevronRight, FileText } from 'lucide-react'
import { Badge, EmptyState, Skeleton } from '../../components/ui'

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
  const [viewing, setViewing] = useState(null)

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
      <h1 className="page-title mb-6">Recetas</h1>

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
          <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : result.content.length === 0 ? (
          <EmptyState icon={FileText} title="Sin recetas" description="Las recetas que generes en tus consultas aparecen aquí." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {result.content.map((p) => (
              <li key={p.id}>
                <button onClick={() => setViewing(p)} className="group flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-slate-50">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600"><FileText className="h-[18px] w-[18px]" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{p.patientName}</p>
                    <p className="truncate text-xs text-slate-500">
                      <span className="capitalize">Cita del {formatDateOnly(p.appointmentDate)}</span> · {p.diagnosis || p.content}
                    </p>
                  </div>
                  {p.voided && <Badge tone="red">Anulada</Badge>}
                  <span className="hidden text-xs text-slate-400 md:block">{formatDate(p.createdAt)}</span>
                  <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:text-primary-600" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <AdminPagination
          page={result.page} size={size} totalPages={result.totalPages} totalElements={result.totalElements}
          contentLength={result.content.length}
          onPageChange={setPage} onSizeChange={(s) => { setSize(s); setPage(0) }}
        />
      </div>

      {viewing && (
        <PrescriptionViewModal prescription={viewing} onClose={() => setViewing(null)} onDownload={handleDownload} />
      )}
    </div>
  )
}
