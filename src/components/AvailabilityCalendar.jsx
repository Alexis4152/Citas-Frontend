import { useEffect, useState } from 'react'
import { formatDateOnly, formatTimeOnly } from '../utils/format'

/**
 * Grid reutilizable de horarios: columnas = días, filas = horas. Sin librería de
 * calendario externa (mismo criterio "sin dependencias pesadas" del proyecto de
 * referencia, que tampoco usa una librería de fechas).
 *
 * Dos modos:
 * - "selectable" (agendar cita, pública o de recepción): recibe `days` en el formato crudo
 *   del backend (`[{date, slots:[{startTime,endTime,available}]}]`, ver
 *   AvailabilityService/DayAvailabilityResponse) y permite click en celdas disponibles.
 * - "agenda" (vista propia del doctor y de recepción): recibe `days` ya construido por el
 *   caller a partir de su propia lista de citas, con la forma
 *   `[{date, slots:[{startTime,endTime,appointment}]}]` donde `appointment` es `null` (slot
 *   libre, no clickable) o un AppointmentResponse (ocupado/cancelado, clickable para ver
 *   detalle o liberar el horario). Puede haber más de una cita en el mismo (día, hora) --
 *   la cancelada original y una nueva agendada tras liberar ese horario -- por eso cada
 *   celda admite varias tarjetas apiladas.
 */
export default function AvailabilityCalendar({
  days = [],
  mode = 'selectable',
  selected = null,
  onSelectSlot,
  onSlotClick,
  loading = false,
  // Solo recepción/admin: los espacios ocupados que aún se pueden empalmar (slot.overbookable)
  // se muestran seleccionables, marcados como sobrecupo.
  allowOverbook = false,
}) {
  // Vista móvil (<md): un día a la vez con selector de fechas en tiras, en vez de la grilla
  // completa de 7 columnas (que en un teléfono solo se podía ver haciendo scroll horizontal,
  // columna por columna -- no es "responsivo", solo scrolleable). El índice se recalcula si
  // cambia la lista de días (ej. al pasar de semana) para no apuntar a un día que ya no existe.
  const [mobileDayIndex, setMobileDayIndex] = useState(0)
  useEffect(() => { setMobileDayIndex(0) }, [days[0]?.date])

  if (loading) {
    return <p className="text-sm text-gray-500 py-8 text-center">Cargando disponibilidad...</p>
  }
  if (days.length === 0) {
    return <p className="text-sm text-gray-500 py-8 text-center">No hay información de disponibilidad.</p>
  }

  // Filas = unión ordenada de todos los horarios de inicio que aparecen en cualquier día.
  const timeSet = new Set()
  days.forEach((d) => d.slots.forEach((s) => timeSet.add(s.startTime)))
  const times = Array.from(timeSet).sort()

  if (times.length === 0) {
    return <p className="text-sm text-gray-500 py-8 text-center">Sin horarios configurados para estas fechas.</p>
  }

  const today = new Date().toISOString().slice(0, 10)

  function slotsAt(day, time) {
    return day.slots.filter((s) => s.startTime === time)
  }

  function cellForSelectable(day, slot) {
    if (!slot) return <span className="block w-full h-full" />
    const isSelected = selected && selected.date === day.date && selected.startTime === slot.startTime
    if (!slot.available && allowOverbook && slot.overbookable) {
      return (
        <button
          type="button"
          onClick={() => onSelectSlot?.(day.date, slot)}
          title="Horario ocupado: se agendará como sobrecupo"
          className={`block w-full py-2 rounded-md text-xs font-medium transition-colors border ${
            isSelected
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-300 border-dashed'
          }`}
        >
          {formatTimeOnly(slot.startTime)}<span className="block text-[9px] leading-none">sobrecupo</span>
        </button>
      )
    }
    if (!slot.available) {
      return (
        <span className="block w-full py-2 rounded-md text-xs text-gray-300 bg-gray-50 cursor-not-allowed select-none">
          —
        </span>
      )
    }
    return (
      <button
        type="button"
        onClick={() => onSelectSlot?.(day.date, slot)}
        className={`block w-full py-2 rounded-md text-xs font-medium transition-colors ${
          isSelected
            ? 'bg-primary-600 text-white'
            : 'bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200'
        }`}
      >
        {formatTimeOnly(slot.startTime)}
      </button>
    )
  }

  function cellForAgenda(day, slot) {
    const appt = slot.appointment
    if (!appt) {
      return (
        <span className="block w-full py-2.5 rounded-lg text-[11px] text-gray-300 border border-dashed border-gray-200 text-center select-none">
          libre
        </span>
      )
    }
    const meta = statusMeta(appt)
    const patientName = appt.patient ? `${appt.patient.firstName} ${appt.patient.lastName}`.trim() : null
    return (
      <button
        type="button"
        onClick={() => onSlotClick?.(day.date, slot)}
        className={`block w-full text-left rounded-lg border-l-[3px] border px-2 py-1.5 transition-colors ${meta.card}`}
        title={patientName || ''}
      >
        <p className="text-xs font-semibold truncate">{patientName || 'Sin paciente'}</p>
        <p className="text-[10px] font-medium flex items-center gap-1 mt-0.5">
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${meta.dot}`} />
          <span className="truncate">{meta.label}</span>
        </p>
      </button>
    )
  }

  const safeMobileDayIndex = Math.min(mobileDayIndex, days.length - 1)
  const activeDay = days[safeMobileDayIndex]
  const activeDayTimes = times.filter((time) => slotsAt(activeDay, time).length > 0)

  return (
    <div>
      {mode === 'agenda' && <Legend />}

      {/* Escritorio/tablet (≥md): grilla completa, 7 días en columnas. */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-center border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="text-xs text-gray-400 font-normal w-16"></th>
              {days.map((d) => (
                <th
                  key={d.date}
                  className={`text-xs font-semibold pb-2 capitalize ${d.date === today ? 'text-primary-700' : 'text-gray-700'}`}
                >
                  {d.date === today ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary-600" />
                      {formatDateOnly(d.date)}
                    </span>
                  ) : (
                    formatDateOnly(d.date)
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map((time) => (
              <tr key={time}>
                <td className="text-xs text-gray-400 pr-2 whitespace-nowrap">{formatTimeOnly(time)}</td>
                {days.map((d) => {
                  const slots = slotsAt(d, time)
                  return (
                    <td key={d.date} className={`align-top rounded-lg ${d.date === today ? 'bg-primary-50/30' : ''}`}>
                      {mode === 'agenda' ? (
                        slots.length === 0 ? (
                          <span className="block w-full h-full" />
                        ) : (
                          <div className="flex flex-col gap-1">
                            {slots.map((slot, i) => <div key={i}>{cellForAgenda(d, slot)}</div>)}
                          </div>
                        )
                      ) : (
                        cellForSelectable(d, slots[0])
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil (<md): un día a la vez -- una grilla de 7 columnas nunca cabe en un teléfono
          sin scroll horizontal continuo, así que aquí se cambia de paradigma: tira de fechas
          seleccionable + lista vertical de horarios de ESE día nada más. */}
      <div className="md:hidden">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {days.map((d, i) => (
            <button
              key={d.date}
              type="button"
              onClick={() => setMobileDayIndex(i)}
              className={`shrink-0 rounded-lg px-3 py-2 text-center border ${
                i === safeMobileDayIndex
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : d.date === today
                  ? 'border-primary-300 text-primary-700 bg-primary-50'
                  : 'border-gray-200 text-gray-600 bg-white'
              }`}
            >
              <span className="block text-[11px] capitalize whitespace-nowrap">{formatDateOnly(d.date)}</span>
            </button>
          ))}
        </div>

        {activeDayTimes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            {mode === 'agenda' ? 'Sin citas este día.' : 'Sin horarios disponibles este día.'}
          </p>
        ) : (
          <div className="flex flex-col gap-2 mt-2">
            {activeDayTimes.map((time) => {
              const slots = slotsAt(activeDay, time)
              return (
                <div key={time} className="flex items-start gap-3">
                  <span className="text-xs text-gray-400 pt-2 w-12 shrink-0">{formatTimeOnly(time)}</span>
                  <div className="flex-1 flex flex-col gap-1">
                    {mode === 'agenda'
                      ? slots.map((slot, i) => <div key={i}>{cellForAgenda(activeDay, slot)}</div>)
                      : cellForSelectable(activeDay, slots[0])}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/** Color + etiqueta por estado -- una cancelada se distingue además por si su horario ya
 * se puede/pudo liberar, que es la parte que antes quedaba oculta en un texto truncado.
 * Todos los colores son fijos (nunca `primary-*`/`bg-brand-*`): el código de colores de
 * estado de una cita debe verse igual sin importar el color de marca que el admin haya
 * elegido para el portal -- "Programada" siempre azul, igual que StatusBadge.jsx. */
function statusMeta(appt) {
  if (appt.status === 'CANCELLED') {
    if (appt.slotReleased) {
      return { label: 'Cancelada · liberada', card: 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100', dot: 'bg-gray-300' }
    }
    if (appt.canRelease) {
      return { label: 'Cancelada · liberable', card: 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100', dot: 'bg-amber-500' }
    }
    return { label: 'Cancelada · no liberable', card: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100', dot: 'bg-red-400' }
  }
  if (appt.status === 'COMPLETED') {
    return { label: 'Atendida', card: 'bg-green-50 border-green-300 text-green-800 hover:bg-green-100', dot: 'bg-green-600' }
  }
  if (appt.status === 'NO_SHOW') {
    return { label: 'No asistió', card: 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200', dot: 'bg-gray-400' }
  }
  return { label: 'Programada', card: 'bg-blue-50 border-blue-300 text-blue-900 hover:bg-blue-100', dot: 'bg-blue-600' }
}

function Legend() {
  const items = [
    { dot: 'bg-blue-600', label: 'Programada' },
    { dot: 'bg-amber-500', label: 'Cancelada · liberable' },
    { dot: 'bg-red-400', label: 'Cancelada · no liberable' },
    { dot: 'bg-gray-300', label: 'Cancelada · liberada' },
    { dot: 'bg-green-600', label: 'Atendida' },
    { dot: 'bg-gray-400', label: 'No asistió' },
  ]
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4 text-xs text-gray-500">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full shrink-0 ${item.dot}`} />
          {item.label}
        </span>
      ))}
    </div>
  )
}
