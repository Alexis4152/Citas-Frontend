import { useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, FileText, FileType2, Search } from 'lucide-react'
import { EmptyState, Skeleton } from './ui'

const MX = 'es-MX'
const pad = (n) => String(n).padStart(2, '0')

/** Mismo formato que el backend (ReportFileWriter.format) para que pantalla, CSV, Excel y PDF coincidan. */
export function formatCell(value, type) {
  if (value === null || value === undefined || value === '') return ''
  switch (type) {
    case 'MONEY': return Number(value).toLocaleString(MX, { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })
    case 'PERCENT': return `${Number(value).toLocaleString(MX, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
    case 'INT': return Number(value).toLocaleString(MX)
    case 'DATE': {
      const [y, m, d] = String(value).split('-')
      return d ? `${d}/${m}/${y}` : String(value)
    }
    case 'TIME': return String(value).slice(0, 5)
    case 'DATETIME': {
      const dt = new Date(value)
      return Number.isNaN(dt.getTime()) ? String(value)
        : `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`
    }
    default: return String(value)
  }
}

const numeric = (type) => type === 'MONEY' || type === 'INT' || type === 'PERCENT'
const PAGE = 50

/** Botones de descarga: cada formato por separado. */
export function DownloadButtons({ onDownload, busy, disabled }) {
  const items = [['csv', 'CSV', FileText], ['xlsx', 'Excel', FileSpreadsheet], ['pdf', 'PDF', FileType2]]
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(([format, label, Icon]) => (
        <button key={format} type="button" className="btn-secondary btn-sm" disabled={disabled || !!busy} onClick={() => onDownload(format)}>
          <Icon className="h-3.5 w-3.5" /> {busy === format ? 'Generando...' : label}
        </button>
      ))}
    </div>
  )
}

/**
 * Muestra un reporte del backend (ReportTable): indicadores, tabla con búsqueda y páginas, y
 * totales. Lo que se ve aquí es exactamente lo que trae el CSV/Excel/PDF.
 */
export default function ReportTableView({ table, loading, onDownload, downloading, canDownload = true, emptyText }) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  useEffect(() => { setQuery(''); setPage(0) }, [table?.key, table?.subtitle])

  const rows = useMemo(() => {
    if (!table) return []
    const q = query.trim().toLowerCase()
    if (!q) return table.rows
    return table.rows.filter((r) => r.some((v, i) => formatCell(v, table.columns[i]?.type).toLowerCase().includes(q)))
  }, [table, query])

  if (loading && !table) return <div className="space-y-3"><Skeleton className="h-20 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div>
  if (!table) return null

  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  const visible = rows.slice(page * PAGE, page * PAGE + PAGE)

  return (
    <div className={`space-y-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
      {table.summary?.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {table.summary.map((s) => (
            <div key={s.label} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-400">{s.label}</p>
              <p className="mt-1 truncate font-display text-xl font-semibold tabular-nums text-slate-900" title={s.value}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input h-9 pl-9 text-sm" placeholder="Buscar en el reporte" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0) }} />
          </div>
          <span className="text-xs text-slate-500">{rows.length.toLocaleString(MX)} renglón{rows.length === 1 ? '' : 'es'}</span>
          {canDownload && onDownload && <DownloadButtons onDownload={onDownload} busy={downloading} />}
        </div>

        {table.rows.length === 0 ? (
          <EmptyState title={emptyText || 'Sin información'} description="Prueba con otras fechas o quita filtros." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  {table.columns.map((c) => (
                    <th key={c.key} className={`whitespace-nowrap px-3 py-2.5 font-semibold ${numeric(c.type) ? 'text-right' : ''}`}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    {table.columns.map((c, j) => (
                      <td key={c.key} className={`px-3 py-2 ${numeric(c.type) ? 'whitespace-nowrap text-right tabular-nums' : ''} ${j === 0 ? 'font-medium text-slate-900' : 'text-slate-700'} ${c.type === 'TEXT' && (r[j]?.length || 0) > 40 ? 'min-w-[240px]' : 'whitespace-nowrap'}`}>
                        {formatCell(r[j], c.type)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {table.totals && page === pages - 1 && !query && (
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-primary-50/60 font-semibold text-slate-900">
                    {table.columns.map((c, j) => (
                      <td key={c.key} className={`whitespace-nowrap px-3 py-2.5 ${numeric(c.type) ? 'text-right tabular-nums' : ''}`}>{formatCell(table.totals[j], c.type)}</td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
            <button className="btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>‹ Anterior</button>
            <span>Página {page + 1} de {pages}</span>
            <button className="btn-ghost btn-sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Siguiente ›</button>
          </div>
        )}
      </div>
      {table.note && <p className="text-xs text-slate-500">{table.note}</p>}
    </div>
  )
}
