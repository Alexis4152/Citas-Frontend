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
import { ChevronRight, Plus, Search, UserCog } from 'lucide-react'
import { Avatar, Badge, EmptyState, PageHeader, Skeleton } from '../../components/ui'

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
  const [deactivating, setDeactivating] = useState(false)

  function load() {
    setLoading(true)
    adminListReceptionists({ q: debouncedQuery || undefined, page, size })
      .then((r) => setResult(r.data.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page, size, debouncedQuery])
  useEffect(() => { setPage(0) }, [debouncedQuery])
  useEffect(() => { getSpecialties().then((r) => setSpecialties(r.data.data)).catch(() => {}) }, [])

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

  async function handleDeactivate() {
    const ok = await confirmDialog(`¿Desactivar a "${form.firstName} ${form.lastName}"? Ya no podrá iniciar sesión.`, { confirmText: 'Desactivar' })
    if (!ok) return
    setDeactivating(true)
    try {
      await adminDeactivateReceptionist(editingId)
      notify('Recepcionista desactivado', 'success')
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
      <PageHeader icon={UserCog} eyebrow="Personal" title="Recepcionistas" description="Toca a una persona para editar sus datos o desactivarla."
        actions={<button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Agregar recepcionista</button>} />

      <div className="card mb-4 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-10" placeholder="Buscar por nombre o correo" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : result.content.length === 0 ? (
          <EmptyState icon={UserCog} title="Sin recepcionistas" description="Agrega a la primera persona de recepción." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {result.content.map((u) => (
              <li key={u.id}>
                <button onClick={() => openEdit(u)} className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50">
                  <Avatar first={u.firstName} last={u.lastName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{u.firstName} {u.lastName}</p>
                    <p className="truncate text-xs text-slate-500">{u.email}{u.phone && ` · ${u.phone}`}</p>
                  </div>
                  <span className="hidden max-w-[40%] flex-wrap justify-end gap-1 sm:flex">
                    {u.specialties?.length ? u.specialties.map((s) => <Badge key={s.id} tone="brand">{s.name}</Badge>) : <Badge>General</Badge>}
                  </span>
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
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              {editingId && (
                <button type="button" className="btn-danger-ghost mr-auto" disabled={deactivating} onClick={handleDeactivate}>
                  {deactivating ? 'Desactivando...' : 'Desactivar acceso'}
                </button>
              )}
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
