import { useEffect, useState } from 'react'
import { adminListSpecialties, adminCreateSpecialty, adminUpdateSpecialty, adminDeactivateSpecialty } from '../../api/adminSpecialties'
import { useNotify } from '../../context/NotifyContext'
import Modal from '../../components/Modal'
import AdminPagination from '../../components/AdminPagination'
import useDebouncedValue from '../../hooks/useDebouncedValue'

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
  const [editingId, setEditingId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deactivatingId, setDeactivatingId] = useState(null)

  function load() {
    setLoading(true)
    adminListSpecialties({ q: debouncedQuery || undefined, page, size })
      .then((r) => setResult(r.data.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page, size, debouncedQuery])
  useEffect(() => { setPage(0) }, [debouncedQuery])

  function handleClearSearch() {
    setQuery('')
    setPage(0)
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY)
    setModalOpen(true)
  }

  function openEdit(s) {
    setEditingId(s.id)
    setForm({ name: s.name, description: s.description || '', recommendations: s.recommendations || '' })
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingId) {
        await adminUpdateSpecialty(editingId, form)
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

  async function handleDeactivate(id, name) {
    const ok = await confirmDialog(`¿Desactivar "${name}"?`, { confirmText: 'Desactivar' })
    if (!ok) return
    setDeactivatingId(id)
    try {
      await adminDeactivateSpecialty(id)
      notify('Especialidad desactivada', 'success')
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo desactivar', 'error')
    } finally {
      setDeactivatingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Especialidades</h1>
        <button className="btn-primary text-sm" onClick={openCreate}>+ Agregar especialidad</button>
      </div>

      <div className="card p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs font-medium text-gray-600 block mb-1">Nombre o descripción</label>
          <input className="input" placeholder="Buscar..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {query && (
          <button type="button" className="btn-secondary text-sm" onClick={handleClearSearch}>
            Limpiar
          </button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <p className="text-gray-500 text-sm p-4">Cargando...</p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Descripción</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {result.content.map((s) => (
                    <tr key={s.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                      <td className="px-4 py-3 text-gray-600">{s.description}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => openEdit(s)} className="text-primary-700 hover:underline mr-3">Editar</button>
                        <button
                          onClick={() => handleDeactivate(s.id, s.name)}
                          disabled={deactivatingId === s.id}
                          className="text-red-600 hover:underline disabled:opacity-50 disabled:no-underline"
                        >
                          {deactivatingId === s.id ? 'Desactivando...' : 'Desactivar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {result.content.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">Sin especialidades</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-100">
              {result.content.map((s) => (
                <div key={s.id} className="px-4 py-3">
                  <p className="font-medium text-gray-900">{s.name}</p>
                  {s.description && <p className="text-sm text-gray-600 mt-0.5">{s.description}</p>}
                  <div className="flex gap-4 mt-2 text-sm">
                    <button onClick={() => openEdit(s)} className="text-primary-700 hover:underline">Editar</button>
                    <button
                      onClick={() => handleDeactivate(s.id, s.name)}
                      disabled={deactivatingId === s.id}
                      className="text-red-600 hover:underline disabled:opacity-50 disabled:no-underline"
                    >
                      {deactivatingId === s.id ? 'Desactivando...' : 'Desactivar'}
                    </button>
                  </div>
                </div>
              ))}
              {result.content.length === 0 && (
                <p className="px-4 py-8 text-center text-gray-400 text-sm">Sin especialidades</p>
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

      {modalOpen && (
        <Modal title={editingId ? 'Editar especialidad' : 'Nueva especialidad'} onClose={() => setModalOpen(false)}>
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
                className="input" rows={3} placeholder="Ej. Acude con la vejiga llena. Si dejas en blanco, se usa el texto genérico."
                value={form.recommendations} onChange={(e) => setForm({ ...form, recommendations: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">
                Aparece en la confirmación de la cita, el correo y el comprobante en PDF, en vez del texto genérico.
              </p>
            </label>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear especialidad'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
