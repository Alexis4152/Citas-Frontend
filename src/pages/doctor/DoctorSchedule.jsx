import { useEffect, useState } from 'react'
import {
  getOwnProfile, listOwnSchedule, createOwnSchedule, updateOwnSchedule, deleteOwnSchedule,
} from '../../api/doctorPortal'
import { useNotify } from '../../context/NotifyContext'
import { formatTimeOnly } from '../../utils/format'
import Modal from '../../components/Modal'

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
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo eliminar', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mi horario semanal</h1>
        <button className="btn-primary text-sm" onClick={openCreate}>+ Agregar horario</button>
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
                    <th className="px-4 py-3 font-medium">Día</th>
                    <th className="px-4 py-3 font-medium">Sede</th>
                    <th className="px-4 py-3 font-medium">Horario</th>
                    <th className="px-4 py-3 font-medium">Min./cita</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr key={s.id} className="border-t border-gray-100">
                      <td className="px-4 py-3">{DAYS.find((d) => d.value === s.dayOfWeek)?.label || s.dayOfWeek}</td>
                      <td className="px-4 py-3">{s.branchName}</td>
                      <td className="px-4 py-3">{formatTimeOnly(s.startTime)} – {formatTimeOnly(s.endTime)}</td>
                      <td className="px-4 py-3">{s.slotMinutes ?? '—'}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => openEdit(s)} disabled={deletingId === s.id} className="text-primary-700 hover:underline mr-3 disabled:opacity-50">Editar</button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={deletingId === s.id}
                          className="text-red-600 hover:underline disabled:opacity-50 disabled:no-underline"
                        >
                          {deletingId === s.id ? 'Eliminando...' : 'Eliminar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {schedules.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin horarios configurados</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-100">
              {schedules.map((s) => (
                <div key={s.id} className="px-4 py-3">
                  <p className="font-medium text-gray-900">{DAYS.find((d) => d.value === s.dayOfWeek)?.label || s.dayOfWeek} — {s.branchName}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{formatTimeOnly(s.startTime)} – {formatTimeOnly(s.endTime)} · {s.slotMinutes ?? '—'} min/cita</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <button onClick={() => openEdit(s)} disabled={deletingId === s.id} className="text-primary-700 hover:underline disabled:opacity-50">Editar</button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={deletingId === s.id}
                      className="text-red-600 hover:underline disabled:opacity-50 disabled:no-underline"
                    >
                      {deletingId === s.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              ))}
              {schedules.length === 0 && (
                <p className="px-4 py-8 text-center text-gray-400 text-sm">Sin horarios configurados</p>
              )}
            </div>
          </>
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
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
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
