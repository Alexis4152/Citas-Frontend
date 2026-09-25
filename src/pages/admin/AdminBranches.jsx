import { useEffect, useState } from 'react'
import { adminListBranches, adminCreateBranch, adminUpdateBranch, adminDeactivateBranch } from '../../api/adminBranches'
import { useNotify } from '../../context/NotifyContext'
import Modal from '../../components/Modal'
import AdminPagination from '../../components/AdminPagination'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { onlyDigits, PHONE_INPUT_PROPS } from '../../utils/phone'

const EMPTY = { name: '', address: '', city: '', phone: '', openTime: '08:00', closeTime: '18:00' }

export default function AdminBranches() {
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
    adminListBranches({ q: debouncedQuery || undefined, page, size })
      .then((r) => setResult(r.data.data))
      .finally(() => setLoading(false))
  }

  // Busca solo al hacer una pausa al escribir (debounce), sin botón "Buscar".
  useEffect(() => { load() }, [page, size, debouncedQuery])
  useEffect(() => { setPage(0) }, [debouncedQuery])

  function handleClearSearch() {
    setQuery('')
    setPage(0)
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY)
    setModalOpen(true)
  }

  function openEdit(b) {
    setEditingId(b.id)
    setForm({
      name: b.name, address: b.address || '', city: b.city || '', phone: b.phone || '',
      openTime: (b.openTime || '08:00:00').slice(0, 5), closeTime: (b.closeTime || '18:00:00').slice(0, 5),
    })
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.phone && form.phone.length !== 10) {
      notify('El teléfono debe tener exactamente 10 dígitos', 'error')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await adminUpdateBranch(editingId, form)
        notify('Sede actualizada', 'success')
      } else {
        await adminCreateBranch(form)
        notify('Sede creada', 'success')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar la sede', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(id, name) {
    const ok = await confirmDialog(`¿Desactivar "${name}"?`, { confirmText: 'Desactivar' })
    if (!ok) return
    setDeactivatingId(id)
    try {
      await adminDeactivateBranch(id)
      notify('Sede desactivada', 'success')
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
        <h1 className="text-2xl font-bold text-gray-900">Sedes</h1>
        <button className="btn-primary text-sm" onClick={openCreate}>+ Agregar sede</button>
      </div>

      <div className="card p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs font-medium text-gray-600 block mb-1">Nombre o ciudad</label>
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
                    <th className="px-4 py-3 font-medium">Ciudad</th>
                    <th className="px-4 py-3 font-medium">Horario</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {result.content.map((b) => (
                    <tr key={b.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-900">{b.name}</td>
                      <td className="px-4 py-3 text-gray-600">{b.city}</td>
                      <td className="px-4 py-3 text-gray-600">{b.openTime?.slice(0, 5)} – {b.closeTime?.slice(0, 5)}</td>
                      <td className="px-4 py-3">
                        <span className={b.isActive ? 'text-green-600' : 'text-gray-400'}>{b.isActive ? 'Activa' : 'Inactiva'}</span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => openEdit(b)} className="text-primary-700 hover:underline mr-3">Editar</button>
                        {b.isActive && (
                          <button
                            onClick={() => handleDeactivate(b.id, b.name)}
                            disabled={deactivatingId === b.id}
                            className="text-red-600 hover:underline disabled:opacity-50 disabled:no-underline"
                          >
                            {deactivatingId === b.id ? 'Desactivando...' : 'Desactivar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {result.content.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin sedes</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-100">
              {result.content.map((b) => (
                <div key={b.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-900">{b.name}</p>
                    <span className={`text-xs ${b.isActive ? 'text-green-600' : 'text-gray-400'}`}>{b.isActive ? 'Activa' : 'Inactiva'}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{b.city}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{b.openTime?.slice(0, 5)} – {b.closeTime?.slice(0, 5)}</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <button onClick={() => openEdit(b)} className="text-primary-700 hover:underline">Editar</button>
                    {b.isActive && (
                      <button
                        onClick={() => handleDeactivate(b.id, b.name)}
                        disabled={deactivatingId === b.id}
                        className="text-red-600 hover:underline disabled:opacity-50 disabled:no-underline"
                      >
                        {deactivatingId === b.id ? 'Desactivando...' : 'Desactivar'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {result.content.length === 0 && (
                <p className="px-4 py-8 text-center text-gray-400 text-sm">Sin sedes</p>
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
        <Modal title={editingId ? 'Editar sede' : 'Nueva sede'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombre"><input required className="input" value={form.name} onChange={(e) => update('name', e.target.value)} /></Field>
              <Field label="Teléfono"><input className="input" {...PHONE_INPUT_PROPS} value={form.phone} onChange={(e) => update('phone', onlyDigits(e.target.value))} /></Field>
              <Field label="Dirección" className="sm:col-span-2"><input className="input" value={form.address} onChange={(e) => update('address', e.target.value)} /></Field>
              <Field label="Ciudad"><input className="input" value={form.city} onChange={(e) => update('city', e.target.value)} /></Field>
              <Field label="Hora apertura"><input type="time" className="input" value={form.openTime} onChange={(e) => update('openTime', e.target.value)} /></Field>
              <Field label="Hora cierre"><input type="time" className="input" value={form.closeTime} onChange={(e) => update('closeTime', e.target.value)} /></Field>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : editingId ? 'Actualizar sede' : 'Crear sede'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="block text-gray-700 mb-1 font-medium">{label}</span>
      {children}
    </label>
  )
}
