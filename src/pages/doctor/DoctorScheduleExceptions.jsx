import { useEffect, useState } from 'react'
import { CalendarOff, Clock, Trash2 } from 'lucide-react'
import { Badge } from '../../components/ui'
import {
  listOwnScheduleExceptions, createOwnScheduleException, deleteOwnScheduleException,
} from '../../api/doctorPortal'
import { useNotify } from '../../context/NotifyContext'
import { formatDateOnly, formatTimeOnly, localTodayIso } from '../../utils/format'
import Modal from '../../components/Modal'

const EMPTY = { date: '', allDay: true, startTime: '', endTime: '', reason: '' }

/** Alta/baja de excepciones puntuales de agenda (días u horarios bloqueados: vacaciones,
 * permisos, etc.) — se suman al horario recurrente para calcular disponibilidad real. Sin
 * edición (el backend solo expone crear/eliminar): para cambiar una, se elimina y se crea de
 * nuevo. */
export default function DoctorScheduleExceptions() {
  const { notify, confirmDialog } = useNotify()
  const [exceptions, setExceptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  function load() {
    setLoading(true)
    listOwnScheduleExceptions().then((r) => setExceptions(r.data.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function openCreate() {
    setForm(EMPTY)
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await createOwnScheduleException({
        date: form.date,
        allDay: form.allDay,
        startTime: form.allDay ? null : form.startTime || null,
        endTime: form.allDay ? null : form.endTime || null,
        reason: form.reason || undefined,
      })
      const affected = res.data.data?.affectedAppointments || 0
      if (affected > 0) {
        // El bloqueo se guardó, pero esas citas siguen programadas: hay que moverlas.
        notify(`Ausencia registrada, pero ese día tienes ${affected} cita(s) programada(s). Recepción ya fue avisada para reprogramarlas.`, 'error')
      } else {
        notify('Ausencia registrada', 'success')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo registrar la ausencia', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    const ok = await confirmDialog('¿Eliminar esta ausencia? Ese horario volverá a estar disponible para citas.', { confirmText: 'Eliminar' })
    if (!ok) return
    setDeletingId(id)
    try {
      await deleteOwnScheduleException(id)
      notify('Ausencia eliminada', 'success')
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo eliminar', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="page-title">Ausencias</h1>
          <p className="text-sm text-gray-500 mt-1">Días u horas en los que no vas a atender (vacaciones, permisos, congresos, etc.). En esos horarios no se podrán agendar citas contigo.</p>
        </div>
        <button className="btn-primary text-sm" onClick={openCreate}>+ Registrar ausencia</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Ausencias registradas {exceptions.length > 0 && `(${exceptions.length})`}</h2>
        </div>
        {loading ? (
          <p className="text-gray-500 text-sm p-4">Cargando...</p>
        ) : exceptions.length === 0 ? (
          <div className="py-14 text-center text-gray-400">
            <p className="text-3xl mb-2">🗓️</p>
            <p className="text-sm">No tienes ausencias registradas</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {exceptions.map((ex) => (
              <button key={ex.id} onClick={() => handleDelete(ex.id)} disabled={deletingId === ex.id} title="Toca para quitar esta ausencia"
                className="group flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50 disabled:opacity-50">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${ex.allDay ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                  {ex.allDay ? <CalendarOff className="h-[18px] w-[18px]" /> : <Clock className="h-[18px] w-[18px]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold capitalize text-slate-900">{formatDateOnly(ex.date)}</p>
                  <p className="truncate text-sm text-slate-500">{ex.reason || 'Sin motivo especificado'}</p>
                </div>
                <Badge tone={ex.allDay ? 'red' : 'amber'}>{ex.allDay ? 'Todo el día' : `${formatTimeOnly(ex.startTime)} – ${formatTimeOnly(ex.endTime)}`}</Badge>
                <span className="hidden items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-rose-600 sm:flex">
                  <Trash2 className="h-3.5 w-3.5" /> {deletingId === ex.id ? 'Quitando...' : 'Quitar'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title="Registrar ausencia" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Fecha">
                <input required type="date" min={localTodayIso()} className="input" value={form.date} onChange={(e) => update('date', e.target.value)} />
              </Field>

              <Field label="Duración">
                <div className="inline-flex w-full rounded-lg border border-gray-300 bg-gray-50 p-1">
                  <button
                    type="button"
                    onClick={() => update('allDay', true)}
                    className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${
                      form.allDay ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Todo el día
                  </button>
                  <button
                    type="button"
                    onClick={() => update('allDay', false)}
                    className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${
                      !form.allDay ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Horario específico
                  </button>
                </div>
              </Field>

              {!form.allDay && (
                <>
                  <Field label="Desde"><input required type="time" className="input" value={form.startTime} onChange={(e) => update('startTime', e.target.value)} /></Field>
                  <Field label="Hasta"><input required type="time" className="input" value={form.endTime} onChange={(e) => update('endTime', e.target.value)} /></Field>
                </>
              )}

              <Field label="Motivo (opcional)" className="sm:col-span-2">
                <input className="input" placeholder="Ej. Vacaciones, congreso médico..." value={form.reason} onChange={(e) => update('reason', e.target.value)} />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Registrar ausencia'}</button>
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
