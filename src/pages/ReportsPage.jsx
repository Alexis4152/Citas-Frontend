import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, Banknote, CalendarClock, ChevronRight, ClipboardList, Stethoscope, UserRound } from 'lucide-react'
import ReportTableView from '../components/ReportTableView'
import { downloadBlob } from '../utils/media'
import { BarChart3, CalendarCheck2, CalendarX2, Download, Globe, TrendingUp, UserPlus, Users, Wallet } from 'lucide-react'
import api from '../api/axios'
import { getBranches, getSpecialties, searchDoctors } from '../api/publicCatalog'
import { useAuth } from '../context/AuthContext'
import { useNotify } from '../context/NotifyContext'
import { methodLabel } from '../components/CashCutSummary'
import { EmptyState, PageHeader, Skeleton, StatCard } from '../components/ui'

const money = (v) => `$${Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const iso = (d) => d.toLocaleDateString('en-CA')
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const PRESETS = [
  ['7 días', 6], ['30 días', 29], ['90 días', 89],
]

/** Redondea el máximo del eje a un número "limpio" cuya mitad también sea entera (2, 4, 10 × 10ⁿ). */
function niceMax(v) {
  if (v <= 2) return 2
  const p = 10 ** Math.floor(Math.log10(v))
  return [2, 4, 10, 20].map((m) => m * p).find((x) => x >= v)
}

/**
 * Columnas de una sola serie: barras delgadas con punta redondeada, rejilla tenue, eje con
 * números limpios y tooltip por barra. Sin leyenda: el título ya dice qué se grafica.
 */
function ColumnChart({ data, format = (v) => v, height = 180, tickEvery = 1 }) {
  const [hover, setHover] = useState(null)
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)))
  const ticks = [max, max / 2, 0]
  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="flex w-10 shrink-0 flex-col justify-between text-right text-[11px] tabular-nums text-slate-400" style={{ height }}>
          {ticks.map((t) => <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">{format(t)}</span>)}
        </div>
        <div className="relative flex-1" style={{ height }}>
          {ticks.map((t, i) => (
            <div key={t} className="absolute inset-x-0 border-t border-slate-100" style={{ top: `${(i / (ticks.length - 1)) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((d, i) => (
              <div key={d.key} className="relative flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <div className={`w-full max-w-[24px] rounded-t-[4px] transition-colors ${hover === i ? 'bg-primary-700' : 'bg-primary-500'}`}
                  style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 2 : 0 }} />
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
                    style={{ bottom: `${(d.value / max) * 100}%` }}>
                    <p className="font-semibold tabular-nums">{format(d.value)}</p>
                    <p className="text-slate-300">{d.tooltip || d.label}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-12 mt-1.5 flex gap-[2px]">
        {data.map((d, i) => (
          <span key={d.key} className="flex-1 truncate text-center text-[10px] text-slate-400">{i % tickEvery === 0 ? d.label : ''}</span>
        ))}
      </div>
    </div>
  )
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="card p-5">
      <p className="font-semibold text-slate-900">{title}</p>
      {subtitle && <p className="mb-4 text-xs text-slate-500">{subtitle}</p>}
      {children}
    </div>
  )
}

/** Tabla de desglose con una barra de proporción (un solo tono) junto a cada fila. */
function Breakdown({ title, rows, financial }) {
  const max = Math.max(1, ...rows.map((r) => r.appointments))
  return (
    <div className="card overflow-hidden">
      <p className="border-b border-slate-100 px-5 py-3.5 font-semibold text-slate-900">{title}</p>
      {rows.length === 0 ? <p className="px-5 py-6 text-sm text-slate-400">Sin datos en este periodo.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2 font-semibold">Nombre</th>
                <th className="px-3 py-2 text-right font-semibold">Citas</th>
                <th className="px-3 py-2 text-right font-semibold">Atendidas</th>
                <th className="px-3 py-2 text-right font-semibold">No asistió</th>
                {financial && <th className="px-5 py-2 text-right font-semibold">Ingresos</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id ?? r.name}>
                  <td className="px-5 py-2.5">
                    <p className="font-medium text-slate-800">{r.name}</p>
                    <div className="mt-1 h-1.5 w-full max-w-[200px] rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-primary-500" style={{ width: `${(r.appointments / max) * 100}%` }} />
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">{r.appointments}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{r.completed}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{r.noShow}{r.noShowRate > 0 && <span className="ml-1 text-xs text-slate-400">({r.noShowRate}%)</span>}</td>
                  {financial && <td className="px-5 py-2.5 text-right tabular-nums font-medium text-slate-800">{money(r.revenue)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/**
 * Reportes (como en nexora-hotel): KPIs del periodo, citas y cobros por día, desglose por doctor,
 * especialidad y sede, horas y días con más demanda. El doctor solo ve lo suyo; los montos solo
 * aparecen con el permiso de reportes financieros. Se exporta a Excel con el permiso de exportar.
 */
export default function ReportsPage() {
  const { isDoctor, can } = useAuth()
  const { notify } = useNotify()
  const today = new Date()
  const [filters, setFilters] = useState({
    from: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)), to: iso(today),
    doctorId: '', branchId: '', specialtyId: '',
  })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [catalog, setCatalog] = useState({ doctors: [], branches: [], specialties: [] })
  // Pestaña y reporte abierto viven en la URL (?vista=reportes&reporte=payments) para poder compartir el enlace.
  const [search, setSearch] = useSearchParams()
  const tab = search.get('vista') === 'reportes' ? 'reports' : 'summary'
  const reportKey = search.get('reporte')
  const go = (next) => setSearch((p) => {
    const q = new URLSearchParams(p)
    Object.entries(next).forEach(([k, v]) => (v ? q.set(k, v) : q.delete(k)))
    return q
  }, { replace: true })

  useEffect(() => {
    Promise.all([
      isDoctor ? Promise.resolve(null) : searchDoctors({ page: 0, size: 100 }),
      getBranches(), getSpecialties(),
    ]).then(([d, b, s]) => setCatalog({ doctors: d?.data.data.content || [], branches: b.data.data || [], specialties: s.data.data || [] }))
      .catch(() => {})
  }, [isDoctor])

  const params = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), [filters])

  useEffect(() => {
    if (filters.from > filters.to || tab !== 'summary') return
    setLoading(true)
    api.get('/reports/overview', { params })
      .then((r) => setData(r.data.data))
      .catch((err) => notify(err.response?.data?.message || 'No se pudo cargar el reporte', 'error'))
      .finally(() => setLoading(false))
  }, [params, tab])

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }))
  const preset = (days) => setFilters((f) => ({ ...f, from: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - days)), to: iso(today) }))

  async function exportExcel() {
    setExporting(true)
    try {
      const r = await api.get('/reports/export.xlsx', { params, responseType: 'blob' })
      const url = URL.createObjectURL(r.data)
      const a = Object.assign(document.createElement('a'), { href: url, download: `reporte-${filters.from}_${filters.to}.xlsx` })
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      notify('No se pudo exportar el reporte', 'error')
    } finally {
      setExporting(false)
    }
  }

  const k = data?.kpis || {}
  const fin = !!data?.financial
  const daily = (data?.daily || []).map((d) => {
    const date = new Date(`${d.date}T12:00:00`)
    const label = date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
    return { key: d.date, label, tooltip: date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }),
      appts: d.completed + d.scheduled + d.noShow, revenue: Number(d.revenue || 0) }
  })
  const tickEvery = Math.max(1, Math.ceil(daily.length / 10))
  const hours = data?.byHour || []
  const empty = data && k.appointments === 0

  return (
    <div>
      <PageHeader icon={BarChart3} eyebrow="Análisis" title="Reportes"
        description={isDoctor ? 'Tus citas, pacientes y cobros del periodo.' : 'Cómo va el hospital: citas, pacientes, asistencia e ingresos.'}
        actions={tab === 'summary' && can('REPORTS_EXPORT') && (
          <button className="btn-secondary" onClick={exportExcel} disabled={exporting || loading}>
            <Download className="h-4 w-4" /> {exporting ? 'Exportando...' : 'Resumen en Excel'}
          </button>
        )} />

      <div className="mb-5 inline-flex rounded-2xl bg-slate-100 p-1">
        {[['summary', 'Resumen'], ['reports', 'Reportes']].map(([v, l]) => (
          <button key={v} onClick={() => go({ vista: v === 'reports' ? 'reportes' : null, reporte: null })}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{l}</button>
        ))}
      </div>

      <div className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {PRESETS.map(([l, d]) => (
            <button key={l} onClick={() => preset(d)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900">{l}</button>
          ))}
        </div>
        <label className="text-xs font-medium text-slate-500">Desde<input type="date" className="input mt-1" value={filters.from} max={filters.to} onChange={set('from')} /></label>
        <label className="text-xs font-medium text-slate-500">Hasta<input type="date" className="input mt-1" value={filters.to} min={filters.from} onChange={set('to')} /></label>
        {!isDoctor && (
          <label className="text-xs font-medium text-slate-500">Doctor
            <select className="input mt-1" value={filters.doctorId} onChange={set('doctorId')}>
              <option value="">Todos</option>
              {catalog.doctors.map((d) => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
            </select>
          </label>
        )}
        <label className="text-xs font-medium text-slate-500">Sede
          <select className="input mt-1" value={filters.branchId} onChange={set('branchId')}>
            <option value="">Todas</option>
            {catalog.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-500">Especialidad
          <select className="input mt-1" value={filters.specialtyId} onChange={set('specialtyId')}>
            <option value="">Todas</option>
            {catalog.specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      </div>

      {tab === 'reports' ? (
        <ReportsCatalog params={params} reportKey={reportKey} onOpen={(k) => go({ vista: 'reportes', reporte: k })}
          onBack={() => go({ vista: 'reportes', reporte: null })} canExport={can('REPORTS_EXPORT')} invalid={filters.from > filters.to} />
      ) : (<>
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={CalendarCheck2} label="Citas del periodo" value={k.appointments ?? 0} hint={`${k.completed ?? 0} atendidas · ${k.scheduled ?? 0} por venir`} loading={loading} />
        <StatCard icon={TrendingUp} tone="green" label="Asistencia" value={`${k.completionRate ?? 0}%`} hint={`${k.noShow ?? 0} no asistieron`} loading={loading} />
        <StatCard icon={CalendarX2} tone="red" label="Cancelación" value={`${k.cancellationRate ?? 0}%`} hint={`${k.cancelled ?? 0} canceladas`} loading={loading} />
        <StatCard icon={Users} tone="blue" label="Pacientes" value={k.patients ?? 0} hint={`${k.newPatients ?? 0} nuevos`} loading={loading} />
        {fin && <>
          <StatCard icon={Wallet} tone="green" label="Ingresos" value={money(k.revenue)} hint={`${k.payments ?? 0} cobros`} loading={loading} />
          <StatCard icon={Wallet} label="Ticket promedio" value={money(k.averageTicket)} loading={loading} />
          <StatCard icon={Wallet} tone="amber" label="Por cobrar" value={money(k.pendingToCollect)} hint={`Devuelto: ${money(k.refunded)}`} loading={loading} />
        </>}
        <StatCard icon={Globe} tone="blue" label="Agendadas en línea" value={`${k.onlineShare ?? 0}%`} hint="El resto, por recepción" loading={loading} />
        {!fin && <StatCard icon={UserPlus} label="Pacientes nuevos" value={k.newPatients ?? 0} loading={loading} />}
      </div>

      {loading && !data ? (
        <div className="grid gap-4 lg:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
      ) : empty ? (
        <div className="card"><EmptyState icon={BarChart3} title="Sin citas en este periodo" description="Prueba con otras fechas o quita filtros." /></div>
      ) : data && (
        <div className="space-y-4">
          <div className={`grid gap-4 ${fin ? 'lg:grid-cols-2' : ''}`}>
            <ChartCard title="Citas por día" subtitle="Atendidas, por venir y no asistió (sin canceladas)">
              <ColumnChart data={daily.map((d) => ({ ...d, value: d.appts }))} format={(v) => Math.round(v)} tickEvery={tickEvery} />
            </ChartCard>
            {fin && (
              <ChartCard title="Ingresos por día" subtitle="Cobros completados, en pesos">
                {daily.some((d) => d.revenue > 0)
                  ? <ColumnChart data={daily.map((d) => ({ ...d, value: d.revenue }))} format={money} tickEvery={tickEvery} />
                  : <p className="grid h-[180px] place-items-center text-sm text-slate-400">Sin cobros en este periodo.</p>}
              </ChartCard>
            )}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Horas con más citas" subtitle="Hora de inicio de la cita">
              {hours.length === 0 ? <p className="text-sm text-slate-400">Sin datos.</p> : (
                <ColumnChart height={150} format={(v) => Math.round(v)}
                  data={hours.map((h) => ({ key: h.hour, label: `${h.hour}h`, tooltip: `${h.hour}:00 – ${h.hour}:59`, value: h.count }))} />
              )}
            </ChartCard>
            <ChartCard title="Días de la semana" subtitle="Qué días se llena más la agenda">
              <ColumnChart height={150} format={(v) => Math.round(v)}
                data={(data.byWeekday || []).map((w) => ({ key: w.weekday, label: WEEKDAYS[w.weekday - 1], value: w.count }))} />
            </ChartCard>
          </div>
          {!isDoctor && <Breakdown title="Por doctor" rows={data.byDoctor || []} financial={fin} />}
          <div className="grid gap-4 lg:grid-cols-2">
            <Breakdown title="Por especialidad" rows={data.bySpecialty || []} financial={fin} />
            <Breakdown title="Por sede" rows={data.byBranch || []} financial={fin} />
          </div>
          {fin && (data.byMethod || []).length > 0 && (
            <div className="card overflow-hidden">
              <p className="border-b border-slate-100 px-5 py-3.5 font-semibold text-slate-900">Por forma de pago</p>
              <ul className="divide-y divide-slate-100">
                {data.byMethod.map((m) => (
                  <li key={m.method} className="flex items-center gap-4 px-5 py-3 text-sm">
                    <span className="w-36 font-medium text-slate-800">{methodLabel(m.method)}</span>
                    <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-primary-500" style={{ width: `${(Number(m.amount) / Number(k.revenue || 1)) * 100}%` }} />
                    </div>
                    <span className="w-16 text-right tabular-nums text-slate-500">{m.count} cobros</span>
                    <span className="w-24 text-right font-semibold tabular-nums text-slate-900">{money(m.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      </>)}
    </div>
  )
}

const CATEGORY_ICON = { Citas: CalendarClock, Desempeño: Stethoscope, Pacientes: UserRound, Caja: Banknote }

/** Catálogo de reportes: cada uno se abre con los filtros de arriba y se baja en CSV, Excel o PDF. */
function ReportsCatalog({ params, reportKey, onOpen, onBack, canExport, invalid }) {
  const { notify } = useNotify()
  const [defs, setDefs] = useState(null)
  const [table, setTable] = useState(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(null)

  useEffect(() => { api.get('/reports/catalog').then((r) => setDefs(r.data.data)).catch(() => setDefs([])) }, [])

  useEffect(() => {
    if (!reportKey || invalid) { setTable(null); return }
    setLoading(true)
    api.get(`/reports/table/${reportKey}`, { params })
      .then((r) => setTable(r.data.data))
      .catch((err) => { notify(err.response?.data?.message || 'No se pudo cargar el reporte', 'error'); setTable(null) })
      .finally(() => setLoading(false))
  }, [reportKey, params, invalid])

  async function download(format) {
    setDownloading(format)
    try {
      const r = await api.get(`/reports/table/${reportKey}/export`, { params: { ...params, format }, responseType: 'blob' })
      const name = /filename="([^"]+)"/.exec(r.headers['content-disposition'] || '')?.[1] || `reporte.${format}`
      downloadBlob(r.data, name)
    } catch {
      notify('No se pudo descargar el reporte', 'error')
    } finally {
      setDownloading(null)
    }
  }

  if (!defs) return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>

  const current = defs.find((d) => d.key === reportKey)
  if (current) {
    return (
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button className="btn-ghost btn-sm" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Todos los reportes</button>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold text-slate-900">{current.title}</h2>
            <p className="text-sm text-slate-500">{table?.subtitle || current.description}</p>
          </div>
        </div>
        <ReportTableView table={table} loading={loading} onDownload={download} downloading={downloading} canDownload={canExport} />
        {!canExport && <p className="mt-3 text-xs text-slate-400">Para descargar reportes pide al administrador el permiso "Exportar reportes".</p>}
      </div>
    )
  }

  const groups = [...new Set(defs.map((d) => d.category))]
  return (
    <div className="space-y-6">
      {groups.map((g) => {
        const Icon = CATEGORY_ICON[g] || ClipboardList
        return (
          <section key={g}>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400"><Icon className="h-4 w-4" /> {g}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {defs.filter((d) => d.category === g).map((d) => (
                <button key={d.key} onClick={() => onOpen(d.key)}
                  className="card card-hover group flex items-start gap-3 p-4 text-left">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600"><Icon className="h-[18px] w-[18px]" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{d.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{d.description}</p>
                    <p className="mt-2 text-[11px] font-medium text-slate-400">CSV · Excel · PDF</p>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 text-slate-300 transition group-hover:text-primary-600" />
                </button>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
