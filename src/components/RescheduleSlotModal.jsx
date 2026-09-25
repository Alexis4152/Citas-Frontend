import { useEffect, useState } from 'react'
import { getDoctorAvailability } from '../api/publicCatalog'
import { formatDateOnly, formatTimeOnly } from '../utils/format'
import AvailabilityCalendar from './AvailabilityCalendar'
import Modal from './Modal'

function todayIso() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Elegir un nuevo horario para una cita del MISMO doctor -- lo usan el paciente con cuenta
 * (Mis citas) y el invitado (página de su enlace de cita). Reutiliza el calendario de
 * disponibilidad público; la regla de "al menos N horas de anticipación" la valida el backend
 * (esta pantalla solo la explica en `hint`).
 */
export default function RescheduleSlotModal({ doctor, hint, saving = false, onClose, onConfirm }) {
  const [fromDate, setFromDate] = useState(todayIso())
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    setLoading(true)
    getDoctorAvailability(doctor.id, fromDate, 7)
      .then((r) => setDays(r.data.data))
      .catch(() => setDays([]))
      .finally(() => setLoading(false))
  }, [doctor.id, fromDate])

  return (
    <Modal title="Reprogramar cita" onClose={onClose} maxWidth="max-w-3xl">
      <p className="text-sm text-gray-600 mb-1">
        Dr(a). {doctor.firstName} {doctor.lastName}
      </p>
      {hint && <p className="text-xs text-gray-400 mb-4">{hint}</p>}
      <div className="flex items-center gap-2 mb-3">
        <label className="text-sm flex items-center gap-2">
          <span className="text-gray-600">Desde</span>
          <input type="date" className="input !w-auto py-1" value={fromDate} min={todayIso()}
            onChange={(e) => e.target.value && setFromDate(e.target.value)} />
        </label>
      </div>
      <AvailabilityCalendar
        days={days}
        mode="selectable"
        loading={loading}
        selected={selected}
        onSelectSlot={(date, slot) => setSelected({ date, startTime: slot.startTime })}
      />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 mt-4 border-t border-gray-100">
        <p className="text-sm text-gray-600">
          {selected ? (
            <>Nuevo horario: <span className="font-medium capitalize">{formatDateOnly(selected.date)}, {formatTimeOnly(selected.startTime)}</span></>
          ) : 'Elige un horario disponible.'}
        </p>
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn-primary" disabled={!selected || saving}
            onClick={() => onConfirm(selected.date, selected.startTime)}>
            {saving ? 'Guardando...' : 'Confirmar cambio'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
