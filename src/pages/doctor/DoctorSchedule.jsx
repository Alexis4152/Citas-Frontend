import { useEffect, useState } from 'react'
import {
  getOwnProfile, listOwnSchedule, createOwnSchedule, updateOwnSchedule, deleteOwnSchedule,
} from '../../api/doctorPortal'
import { useNotify } from '../../context/NotifyContext'
import { formatTimeOnly } from '../../utils/format'
import Modal from '../../components/Modal'
import { CalendarClock, ChevronRight, Plus } from 'lucide-react'
import { Badge, EmptyState, PageHeader, Skeleton } from '../../components/ui'

const DAYS = [
  { value: 'MONDAY', label: 'Lunes' },
  { value: 'TUESDAY', label: 'Martes' },
  { value: 'WEDNESDAY', label: 'Miércoles' },
  { value: 'THURSDAY', label: 'Jueves' },
  { value: 'FRIDAY', label: 'Viernes' },
  { value: 'SATURDAY', label: 'Sábado' },
  { value: 'SUNDAY', label: 'Domingo' },
]

const EMPTY = { branchId: '', dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '14:00', slotMinutes: '' }

/** CRUD del horario semanal recurrente del doctor (día + rango horario + duración de slot,
 * por sede). Usado por AvailabilityService en el Backend para generar los slots que ve el
 * paciente al reservar. */
export default function DoctorSchedule() {
  const { notify, confirmDialog } = useNotify()
  const [branches, setBranches] = useState([])
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  // Sede elegida en el formulario: su horario de apertura acota las horas del doctor.
  const formBranch = branches.find((b) => String(b.id) === String(form.branchId))
  const [editingId, setEditingId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  function load() {
    setLoading(true)
    Promise.all([getOwnProfile(), listOwnSchedule()])
      .then(([profileRes, scheduleRes]) => {
        setBranches(profileRes.data.data.branches || [])
        setSchedules(scheduleRes.data.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY)
    setModalOpen(true)
  }

  function openEdit(s) {
    setEditingId(s.id)
    setForm({
      branchId: String(s.branchId),
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime.slice(0, 5),
      endTime: s.endTime.slice(0, 5),
      slotMinutes: s.slotMinutes ?? '',
    })
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      branchId: Number(form.branchId),
      dayOfWeek: form.dayOfWeek,
      startTime: form.startTime,
      endTime: form.endTime,
      slotMinutes: form.slotMinutes === '' ? null : Number(form.slotMinutes),
    }
    try {
      if (editingId) {
        await updateOwnSchedule(editingId, payload)
        notify('Horario actualizado', 'success')
      } else {
        await createOwnSchedule(payload)
        notify('Horario creado', 'success')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar el horario', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    const ok = await confirmDialog('¿Eliminar este horario?', { confirmText: 'Eliminar' })
    if (!ok) return
    setDeletingId(id)
    try {
      await deleteOwnSchedule(id)
      notify('Horario eliminado', 'success')
      setModalOpen(false)
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo eliminar', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <PageHeader icon={CalendarClock} eyebrow="Agenda" title="Mi horario semanal" description="Toca un horario para cambiarlo o eliminarlo."
        actions={<button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Agregar horario</button>} />

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : schedules.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Sin horarios configurados" description="Agrega los días y horas en que atiendes." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {schedules.map((s) => (
              <li key={s.id}>
                <button onClick={() => openEdit(s)} className="group flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-slate-50">
                  <span className="w-24 shrink-0 font-medium text-slate-900">{DAYS.find((d) => d.value === s.dayOfWeek)?.label || s.dayOfWeek}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm tabular-nums text-slate-800">{formatTimeOnly(s.startTime)} – {formatTimeOnly(s.endTime)}</p>
                    <p className="truncate text-xs text-slate-500">{s.branchName}</p>
                  </div>
                  <Badge>{s.slotMinutes ? `${s.slotMinutes} min/cita` : 'Duración predeterminada'}</Badge>
                  <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:text-primary-600" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalOpen && (
        <Modal title={editingId ? 'Editar horario' : 'Nuevo horario'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Sede">
                <select required className="input" value={form.branchId} onChange={(e) => update('branchId', e.target.value)}>
                  <option value="">Selecciona...</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </Field>
              <Field label="Día">
                <select required className="input" value={form.dayOfWeek} onChange={(e) => update('dayOfWeek', e.target.value)}>
                  {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </Field>
              <Field label="Hora inicio"><input required type="time" className="input" min={formBranch?.openTime?.slice(0, 5)} max={formBranch?.closeTime?.slice(0, 5)} value={form.startTime} onChange={(e) => update('startTime', e.target.value)} /></Field>
              <Field label="Hora fin"><input required type="time" className="input" min={formBranch?.openTime?.slice(0, 5)} max={formBranch?.closeTime?.slice(0, 5)} value={form.endTime} onChange={(e) => update('endTime', e.target.value)} /></Field>
              {formBranch?.openTime && formBranch?.closeTime && (
                <p className="sm:col-span-2 text-xs text-gray-500 -mt-2">
                  {formBranch.name} atiende de {formBranch.openTime.slice(0, 5)} a {formBranch.closeTime.slice(0, 5)}: el horario del doctor debe quedar dentro de ese rango.
                </p>
              )}
              <Field label="Min. por cita (opcional)" className="sm:col-span-2">
                <input type="number" min="5" max="240" step="5" className="input" placeholder="Predeterminado" value={form.slotMinutes} onChange={(e) => update('slotMinutes', e.target.value)} />
              </Field>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              {editingId && (
                <button type="button" className="btn-danger-ghost mr-auto" disabled={deletingId === editingId} onClick={() => handleDelete(editingId)}>
                  {deletingId === editingId ? 'Eliminando...' : 'Eliminar horario'}
                </button>
              )}
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : editingId ? 'Actualizar horario' : 'Crear horario'}</button>
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
