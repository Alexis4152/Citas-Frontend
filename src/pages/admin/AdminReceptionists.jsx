import { useEffect, useState } from 'react'
import {
  adminListReceptionists, adminCreateReceptionist, adminUpdateReceptionist, adminDeactivateReceptionist,
} from '../../api/adminReceptionists'
import { getSpecialties } from '../../api/publicCatalog'
import { useNotify } from '../../context/NotifyContext'
import Modal from '../../components/Modal'
import AdminPagination from '../../components/AdminPagination'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { onlyDigits, PHONE_INPUT_PROPS } from '../../utils/phone'

const EMPTY = { email: '', firstName: '', lastName: '', phone: '', specialtyIds: [] }

/** La contraseña la genera el servidor y fuerza su cambio en el primer login (patrón 02) --
 * se muestra una sola vez justo después de crear. Editar/desactivar (sin email ni password,
 * ver ReceptionistUpdateRequest en el backend) siguen el mismo patrón de modal que
 * AdminBranches.jsx. */
export default function AdminReceptionists() {
  const { notify, confirmDialog } = useNotify()
  const [specialties, setSpecialties] = useState([])
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
  const [createdInfo, setCreatedInfo] = useState(null)
  const [deactivatingId, setDeactivatingId] = useState(null)

  function load() {
    setLoading(true)
    adminListReceptionists({ q: debouncedQuery || undefined, page, size })
      .then((r) => setResult(r.data.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page, size, debouncedQuery])
  useEffect(() => { setPage(0) }, [debouncedQuery])
  useEffect(() => { getSpecialties().then((r) => setSpecialties(r.data.data)).catch(() => {}) }, [])

  function handleClearSearch() {
    setQuery('')
    setPage(0)
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY)
    setModalOpen(true)
  }

  function openEdit(u) {
    setEditingId(u.id)
    setForm({
      email: u.email, firstName: u.firstName, lastName: u.lastName, phone: u.phone || '',
      specialtyIds: u.specialties?.map((s) => s.id) || [],
    })
    setModalOpen(true)
  }

  function toggleSpecialty(id) {
    setForm((f) => ({
      ...f,
      specialtyIds: f.specialtyIds.includes(id) ? f.specialtyIds.filter((x) => x !== id) : [...f.specialtyIds, id],
    }))
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
        await adminUpdateReceptionist(editingId, {
          firstName: form.firstName, lastName: form.lastName, phone: form.phone, specialtyIds: form.specialtyIds,
        })
        notify('Recepcionista actualizado', 'success')
        setModalOpen(false)
        load()
      } else {
        const res = await adminCreateReceptionist(form)
        setModalOpen(false)
        setCreatedInfo(res.data.data)
        notify('Recepcionista creado correctamente', 'success')
        load()
      }
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar el recepcionista', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(id, name) {
    const ok = await confirmDialog(`¿Desactivar a "${name}"? Ya no podrá iniciar sesión.`, { confirmText: 'Desactivar' })
    if (!ok) return
    setDeactivatingId(id)
    try {
      await adminDeactivateReceptionist(id)
      notify('Recepcionista desactivado', 'success')
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
        <h1 className="text-2xl font-bold text-gray-900">Recepcionistas</h1>
        <button className="btn-primary text-sm" onClick={openCreate}>+ Agregar recepcionista</button>
      </div>

      <div className="card p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs font-medium text-gray-600 block mb-1">Nombre o correo</label>
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
                    <th className="px-4 py-3 font-medium">Correo</th>
                    <th className="px-4 py-3 font-medium">Teléfono</th>
                    <th className="px-4 py-3 font-medium">Especialidad</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {result.content.map((u) => (
                    <tr key={u.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-900">{u.firstName} {u.lastName}</td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3 text-gray-600">{u.phone || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {u.specialties?.length ? u.specialties.map((s) => s.name).join(' · ') : (
                          <span className="text-gray-400">General</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => openEdit(u)} className="text-primary-700 hover:underline mr-3">Editar</button>
                        <button
                          onClick={() => handleDeactivate(u.id, `${u.firstName} ${u.lastName}`)}
                          disabled={deactivatingId === u.id}
                          className="text-red-600 hover:underline disabled:opacity-50 disabled:no-underline"
                        >
                          {deactivatingId === u.id ? 'Desactivando...' : 'Desactivar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {result.content.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin recepcionistas</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-100">
              {result.content.map((u) => (
                <div key={u.id} className="px-4 py-3">
                  <p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{u.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{u.phone || '—'} · {u.specialties?.length ? u.specialties.map((s) => s.name).join(' · ') : 'General'}</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <button onClick={() => openEdit(u)} className="text-primary-700 hover:underline">Editar</button>
                    <button
                      onClick={() => handleDeactivate(u.id, `${u.firstName} ${u.lastName}`)}
                      disabled={deactivatingId === u.id}
                      className="text-red-600 hover:underline disabled:opacity-50 disabled:no-underline"
                    >
                      {deactivatingId === u.id ? 'Desactivando...' : 'Desactivar'}
                    </button>
                  </div>
                </div>
              ))}
              {result.content.length === 0 && (
                <p className="px-4 py-8 text-center text-gray-400 text-sm">Sin recepcionistas</p>
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
        <Modal title={editingId ? 'Editar recepcionista' : 'Nuevo recepcionista'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombre"><input required className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
              <Field label="Apellido"><input required className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
              <Field label="Correo" className="sm:col-span-2">
                <input
                  required type="email" className="input disabled:bg-gray-100 disabled:text-gray-500"
                  value={form.email} disabled={!!editingId}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                {editingId && <p className="text-xs text-gray-400 mt-1">El correo no se puede cambiar aquí.</p>}
              </Field>
              <Field label="Teléfono" className="sm:col-span-2"><input className="input" {...PHONE_INPUT_PROPS} value={form.phone} onChange={(e) => setForm({ ...form, phone: onlyDigits(e.target.value) })} /></Field>
              <Field label="Especialidad" className="sm:col-span-2">
                <div className="border border-gray-200 rounded-lg p-3 space-y-1.5 max-h-40 overflow-y-auto">
                  {specialties.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox" className="accent-primary-600"
                        checked={form.specialtyIds.includes(s.id)}
                        onChange={() => toggleSpecialty(s.id)}
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Sin marcar ninguna: recepcionista general, ve y agenda citas de todos los doctores. Marcando una o
                  más, solo verá/agendará citas de doctores de esas especialidades.
                </p>
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Guardando...' : editingId ? 'Actualizar recepcionista' : 'Crear recepcionista'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {createdInfo && (
        <Modal title="Recepcionista creado" onClose={() => setCreatedInfo(null)} maxWidth="max-w-sm">
          <p className="text-sm text-gray-700 mb-4">
            Comunícale estos datos de acceso. Se le pedirá cambiar la contraseña la primera vez que inicie sesión.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm space-y-1">
            <p><span className="font-medium">Correo:</span> {createdInfo.email}</p>
            {createdInfo.temporaryPassword && (
              <p><span className="font-medium">Contraseña temporal:</span> <code>{createdInfo.temporaryPassword}</code></p>
            )}
          </div>
          <button className="btn-primary w-full mt-4" onClick={() => setCreatedInfo(null)}>Entendido</button>
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
