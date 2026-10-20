import { useEffect, useState } from 'react'
import { Building2, ChevronRight, MapPin, Plus, Search } from 'lucide-react'
import { adminListBranches, adminCreateBranch, adminUpdateBranch, adminDeactivateBranch } from '../../api/adminBranches'
import { useNotify } from '../../context/NotifyContext'
import Modal from '../../components/Modal'
import AdminPagination from '../../components/AdminPagination'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { onlyDigits, PHONE_INPUT_PROPS } from '../../utils/phone'
import { Badge, EmptyState, PageHeader, Skeleton } from '../../components/ui'

const EMPTY = { name: '', address: '', neighborhood: '', city: '', state: '', postalCode: '', phone: '', openTime: '08:00', closeTime: '18:00' }

const fullAddress = (b) => [b.address, b.neighborhood, [b.postalCode && `CP ${b.postalCode}`, b.city].filter(Boolean).join(' '), b.state]
  .filter(Boolean).join(', ')

export default function AdminBranches() {
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
    adminListBranches({ q: debouncedQuery || undefined, page, size })
      .then((r) => setResult(r.data.data))
      .finally(() => setLoading(false))
  }

  // Busca solo al hacer una pausa al escribir (debounce), sin botón "Buscar".
  useEffect(() => { load() }, [page, size, debouncedQuery])
  useEffect(() => { setPage(0) }, [debouncedQuery])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setModalOpen(true)
  }

  function openEdit(b) {
    setEditing(b)
    setForm({
      name: b.name, address: b.address || '', neighborhood: b.neighborhood || '', city: b.city || '', state: b.state || '',
      postalCode: b.postalCode || '', phone: b.phone || '',
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
    if (form.postalCode && form.postalCode.length !== 5) {
      notify('El código postal debe tener 5 dígitos', 'error')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await adminUpdateBranch(editing.id, form)
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

  async function handleDeactivate() {
    const ok = await confirmDialog(`¿Desactivar "${editing.name}"? Ya no se podrán agendar citas en esta sede.`, { confirmText: 'Desactivar' })
    if (!ok) return
    setDeactivating(true)
    try {
      await adminDeactivateBranch(editing.id)
      notify('Sede desactivada', 'success')
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
      <PageHeader icon={Building2} eyebrow="Catálogo" title="Sedes" description="Dónde atiende el hospital. Toca una sede para ver o editar sus datos."
        actions={<button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Agregar sede</button>} />

      <div className="card mb-4 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-10" placeholder="Buscar por nombre o ciudad" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : result.content.length === 0 ? (
          <EmptyState icon={Building2} title="Sin sedes" description="Agrega la primera sede del hospital." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {result.content.map((b) => (
              <li key={b.id}>
                <button onClick={() => openEdit(b)} className="group flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-slate-50">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600"><MapPin className="h-[18px] w-[18px]" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{b.name}</p>
                    <p className="truncate text-xs text-slate-500">{fullAddress(b) || 'Sin dirección'}</p>
                  </div>
                  <span className="hidden text-sm tabular-nums text-slate-500 sm:block">{b.openTime?.slice(0, 5)} – {b.closeTime?.slice(0, 5)}</span>
                  <Badge tone={b.isActive ? 'green' : 'slate'} dot>{b.isActive ? 'Activa' : 'Inactiva'}</Badge>
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
        <Modal title={editing ? editing.name : 'Nueva sede'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nombre"><input required maxLength={150} className="input" value={form.name} onChange={(e) => update('name', e.target.value)} /></Field>
              <Field label="Teléfono"><input className="input" {...PHONE_INPUT_PROPS} value={form.phone} onChange={(e) => update('phone', onlyDigits(e.target.value))} /></Field>
              <Field label="Calle y número" className="sm:col-span-2"><input maxLength={255} className="input" placeholder="Av. Insurgentes Sur 1234, piso 3" value={form.address} onChange={(e) => update('address', e.target.value)} /></Field>
              <Field label="Colonia"><input maxLength={120} className="input" value={form.neighborhood} onChange={(e) => update('neighborhood', e.target.value)} /></Field>
              <Field label="Código postal"><input className="input" inputMode="numeric" maxLength={5} placeholder="06700" value={form.postalCode} onChange={(e) => update('postalCode', onlyDigits(e.target.value).slice(0, 5))} /></Field>
              <Field label="Ciudad o municipio"><input maxLength={100} className="input" value={form.city} onChange={(e) => update('city', e.target.value)} /></Field>
              <Field label="Estado"><input maxLength={100} className="input" value={form.state} onChange={(e) => update('state', e.target.value)} /></Field>
              <Field label="Hora apertura"><input type="time" className="input" value={form.openTime} onChange={(e) => update('openTime', e.target.value)} /></Field>
              <Field label="Hora cierre"><input type="time" className="input" value={form.closeTime} onChange={(e) => update('closeTime', e.target.value)} /></Field>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              {editing?.isActive && (
                <button type="button" className="btn-danger-ghost mr-auto" disabled={deactivating} onClick={handleDeactivate}>
                  {deactivating ? 'Desactivando...' : 'Desactivar sede'}
                </button>
              )}
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear sede'}</button>
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
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}
