import { useEffect, useMemo, useState } from 'react'
import { CalendarX2, Check, ChevronLeft, ChevronRight, Lock, Moon, Sun, Sunrise } from 'lucide-react'
import { formatTimeOnly } from '../utils/format'

/**
 * Selector de horarios: tira de días (cuántos horarios libres tiene cada uno) y, debajo, los
 * horarios del día elegido agrupados en mañana / tarde / noche. Cada horario se ve según su
 * estado real, que viene del backend y se refresca solo:
 * - libre: se puede elegir;
 * - tuyo: el que eligió esta persona (apartado mientras termina de agendar);
 * - apartando: alguien más lo está apartando en este momento (se libera si no confirma);
 * - ocupado: ya tiene cita, ya pasó o el doctor no atiende.
 * Recepción (`allowOverbook`) puede además elegir uno ocupado o apartado como sobrecupo.
 */
export default function SlotPicker({
  days = [], selected, onSelect, loading, allowOverbook = false,
  onPrevWeek, onNextWeek, canGoBack = true, live = false, busyTime,
}) {
  const daysWithInfo = useMemo(() => days.map((d) => ({
    ...d,
    free: d.slots.filter((s) => s.available).length,
    total: d.slots.length,
  })), [days])

  const firstWithFree = daysWithInfo.findIndex((d) => d.free > 0)
  const selectedIndex = selected ? daysWithInfo.findIndex((d) => d.date === selected.date) : -1
  const [dayIndex, setDayIndex] = useState(0)

  // Al cambiar de semana: el día con el horario elegido, o el primero con lugares.
  useEffect(() => {
    if (selectedIndex >= 0) setDayIndex(selectedIndex)
    else setDayIndex(firstWithFree >= 0 ? firstWithFree : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days[0]?.date])

  if (loading && days.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 overflow-hidden">{Array.from({ length: 7 }, (_, i) => <div key={i} className="skeleton h-[84px] w-[76px] shrink-0 rounded-2xl" />)}</div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{Array.from({ length: 10 }, (_, i) => <div key={i} className="skeleton h-11 rounded-xl" />)}</div>
      </div>
    )
  }
  if (days.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-500">No hay información de disponibilidad.</p>
  }

  const today = new Date().toISOString().slice(0, 10)
  const day = daysWithInfo[Math.min(dayIndex, daysWithInfo.length - 1)]
  const groups = [
    { key: 'm', label: 'Mañana', icon: Sunrise, test: (h) => h < 12 },
    { key: 't', label: 'Tarde', icon: Sun, test: (h) => h >= 12 && h < 18 },
    { key: 'n', label: 'Noche', icon: Moon, test: (h) => h >= 18 },
  ].map((g) => ({ ...g, slots: day.slots.filter((s) => g.test(Number(s.startTime.slice(0, 2)))) })).filter((g) => g.slots.length)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {live && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              En vivo
            </span>
          )}
          <span className="hidden sm:inline">Los horarios se actualizan solos.</span>
        </div>
        {(onPrevWeek || onNextWeek) && (
          <div className="flex gap-1">
            <button type="button" className="btn-secondary btn-sm h-8 w-8 !p-0" onClick={onPrevWeek} disabled={!canGoBack} aria-label="Semana anterior">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" className="btn-secondary btn-sm h-8 w-8 !p-0" onClick={onNextWeek} aria-label="Semana siguiente">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Tira de días */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-3">
        {daysWithInfo.map((d, i) => {
          const [y, m, dd] = d.date.split('-').map(Number)
          const date = new Date(y, m - 1, dd)
          const active = i === dayIndex
          const full = d.free === 0
          return (
            <button key={d.date} type="button" onClick={() => setDayIndex(i)}
              className={`relative flex w-[76px] shrink-0 flex-col items-center rounded-2xl px-2 py-2.5 text-center transition ${
                active ? 'bg-primary-600 text-white shadow-glow'
                  : full ? 'bg-slate-50 text-slate-400 ring-1 ring-slate-200 hover:bg-slate-100'
                    : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-primary-300'}`}>
              <span className={`text-[11px] font-semibold uppercase tracking-wide ${active ? 'text-white/80' : ''}`}>
                {d.date === today ? 'Hoy' : date.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')}
              </span>
              <span className="font-display text-2xl font-semibold leading-tight">{dd}</span>
              <span className={`text-[10px] font-medium ${active ? 'text-white/85' : full ? '' : 'text-emerald-600'}`}>
                {full ? (d.total ? 'Lleno' : 'Sin horario') : `${d.free} libre${d.free === 1 ? '' : 's'}`}
              </span>
              {selected?.date === d.date && !active && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary-600" />}
            </button>
          )
        })}
      </div>

      <p className="mb-4 text-sm font-medium text-slate-700">
        {(() => {
          const [y, m, dd] = day.date.split('-').map(Number)
          const label = new Date(y, m - 1, dd).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
          return label.charAt(0).toUpperCase() + label.slice(1)
        })()}
      </p>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl bg-slate-50 py-10 text-center ring-1 ring-inset ring-slate-200">
          <CalendarX2 className="mb-2 h-6 w-6 text-slate-400" />
          <p className="text-sm font-medium text-slate-600">El doctor no atiende este día</p>
          <p className="text-xs text-slate-400">Elige otro día de la semana.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.key}>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <g.icon className="h-3.5 w-3.5" /> {g.label}
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {g.slots.map((slot) => (
                  <SlotChip key={slot.startTime} slot={slot} allowOverbook={allowOverbook}
                    selected={selected?.date === day.date && selected?.startTime === slot.startTime}
                    busy={busyTime && busyTime === `${day.date}|${slot.startTime}`}
                    onClick={() => onSelect?.(day.date, slot)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-[11px] text-slate-500">
        <Legend className="bg-white ring-1 ring-slate-300">Libre</Legend>
        <Legend className="bg-primary-600">Tu horario</Legend>
        <Legend className="stripes-amber ring-1 ring-amber-300">Alguien lo está apartando</Legend>
        <Legend className="bg-slate-200">Ocupado</Legend>
        {allowOverbook && <Legend className="bg-violet-100 ring-1 ring-violet-300">Sobrecupo posible</Legend>}
      </div>
    </div>
  )
}

function SlotChip({ slot, selected, onClick, allowOverbook, busy }) {
  const time = formatTimeOnly(slot.startTime)
  const base = 'relative flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition'

  if (selected) {
    return (
      <button type="button" onClick={onClick} className={`${base} bg-primary-600 text-white shadow-glow`} aria-pressed="true">
        <Check className="h-4 w-4" /> {time}
      </button>
    )
  }
  if (slot.available) {
    return (
      <button type="button" onClick={onClick} disabled={busy}
        className={`${base} bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:-translate-y-0.5 hover:text-primary-700 hover:ring-2 hover:ring-primary-400 disabled:opacity-60`}>
        {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" /> : time}
      </button>
    )
  }
  if (slot.held) {
    const title = 'Alguien lo está apartando ahora mismo. Si no confirma en unos minutos, vuelve a estar libre.'
    if (allowOverbook && slot.overbookable) {
      return (
        <button type="button" onClick={onClick} title={`${title} Puedes agendarlo como sobrecupo.`}
          className={`${base} stripes-amber flex-col gap-0 text-amber-800 ring-1 ring-inset ring-amber-300 hover:ring-2 hover:ring-amber-500`}>
          <span className="flex items-center gap-1"><Lock className="h-3 w-3" />{time}</span>
          <span className="text-[9px] font-medium leading-none">en línea · sobrecupo</span>
        </button>
      )
    }
    return (
      <span title={title} className={`${base} stripes-amber cursor-not-allowed flex-col gap-0 text-amber-700 ring-1 ring-inset ring-amber-300`}>
        <span className="flex items-center gap-1"><Lock className="h-3 w-3" />{time}</span>
        <span className="text-[9px] font-medium leading-none">apartando…</span>
      </span>
    )
  }
  if (allowOverbook && slot.overbookable) {
    return (
      <button type="button" onClick={onClick} title="Horario ocupado: se agendará como sobrecupo"
        className={`${base} flex-col gap-0 border border-dashed border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100`}>
        {time}<span className="text-[9px] font-medium leading-none">sobrecupo</span>
      </button>
    )
  }
  return (
    <span className={`${base} cursor-not-allowed bg-slate-100 text-slate-400 line-through decoration-slate-300`} aria-disabled="true">{time}</span>
  )
}

function Legend({ className, children }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded ${className}`} />
      {children}
    </span>
  )
}
