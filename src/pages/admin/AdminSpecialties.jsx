import { useEffect, useState } from 'react'
import { adminListSpecialties, adminCreateSpecialty, adminUpdateSpecialty, adminDeactivateSpecialty } from '../../api/adminSpecialties'
import { useNotify } from '../../context/NotifyContext'
import Modal from '../../components/Modal'
import AdminPagination from '../../components/AdminPagination'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { ChevronRight, Plus, Search, Stethoscope } from 'lucide-react'
import { Badge, EmptyState, PageHeader, Skeleton } from '../../components/ui'

const EMPTY = { name: '', description: '', recommendations: '' }

export default function AdminSpecialties() {
  const { notify, confirmDialog } = useNotify()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 400)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [result, setResult] = useState({ content: [], page: 0, totalPages: 0, totalElements: 0 })
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  function load() {
    setLoading(true)
    adminListSpecialties({ q: debouncedQuery || undefined, page, size })
      .then((r) => setResult(r.data.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page, size, debouncedQuery])
  useEffect(() => { setPage(0) }, [debouncedQuery])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setModalOpen(true)
  }

  function openEdit(s) {
    setEditing(s)
    setForm({ name: s.name, description: s.description || '', recommendations: s.recommendations || '' })
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await adminUpdateSpecialty(editing.id, form)
        notify('Especialidad actualizada', 'success')
      } else {
        await adminCreateSpecialty(form)
        notify('Especialidad creada', 'success')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate() {
    const ok = await confirmDialog(`¿Desactivar "${editing.name}"? Ya no aparecerá al agendar citas.`, { confirmText: 'Desactivar' })
    if (!ok) return
    setDeactivating(true)
    try {
      await adminDeactivateSpecialty(editing.id)
      notify('Especialidad desactivada', 'success')
      setModalOpen(false)
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo desactivar', 'error')
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <div>
      <PageHeader icon={Stethoscope} eyebrow="Catálogo" title="Especialidades" description="Toca una especialidad para editarla o ver sus recomendaciones."
        actions={<button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Agregar especialidad</button>} />

      <div className="card mb-4 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-10" placeholder="Buscar por nombre o descripción" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : result.content.length === 0 ? (
          <EmptyState icon={Stethoscope} title="Sin especialidades" description="Agrega la primera especialidad." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {result.content.map((s) => (
              <li key={s.id}>
                <button onClick={() => openEdit(s)} className="group flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-slate-50">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600"><Stethoscope className="h-[18px] w-[18px]" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{s.name}</p>
                    <p className="truncate text-xs text-slate-500">{s.description || 'Sin descripción'}</p>
                  </div>
                  {s.recommendations && <Badge tone="brand" className="hidden sm:inline-flex">Con recomendaciones</Badge>}
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

      {modalOpen && (
        <Modal title={editing ? editing.name : 'Nueva especialidad'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm">
              <span className="block text-gray-700 mb-1 font-medium">Nombre</span>
              <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block text-sm">
              <span className="block text-gray-700 mb-1 font-medium">Descripción</span>
              <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label className="block text-sm">
              <span className="block text-gray-700 mb-1 font-medium">Recomendaciones para el paciente</span>
              <textarea
                className="input" rows={5} placeholder={'Una por línea, por ejemplo:\nAcude con la vejiga llena\nTrae tus estudios previos'}
                value={form.recommendations} onChange={(e) => setForm({ ...form, recommendations: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">
                Escribe una recomendación por línea: se muestran como viñetas en la confirmación, el correo y el comprobante PDF. Si lo dejas en blanco se usa el texto genérico.
              </p>
            </label>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              {editing && (
                <button type="button" className="btn-danger-ghost mr-auto" disabled={deactivating} onClick={handleDeactivate}>
                  {deactivating ? 'Desactivando...' : 'Desactivar'}
                </button>
              )}
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear especialidad'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
