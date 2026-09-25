const PAGE_SIZES = [10, 20, 50, 100]

/**
 * Pie de tabla paginada: selector de tamaño de página, contador "X–Y de Z" y navegación
 * Anterior/Siguiente — mismo patrón que libreria-frontend, reutilizado aquí en todos los
 * listados paginados (recepción y admin).
 */
export default function AdminPagination({ page, size, totalPages, totalElements, contentLength, onPageChange, onSizeChange }) {
  const from = totalElements === 0 ? 0 : page * size + 1
  const to = Math.min(totalElements, page * size + contentLength)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 text-sm">
      <div className="flex items-center gap-2 text-gray-500">
        <span>Mostrar</span>
        <select
          className="input !w-auto py-1"
          value={size}
          onChange={(e) => onSizeChange(Number(e.target.value))}
        >
          {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span>por página · {totalElements === 0 ? 'sin resultados' : `${from}–${to} de ${totalElements}`}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="btn-secondary py-1 px-3 text-xs disabled:opacity-40"
          disabled={page === 0}
          onClick={() => onPageChange(Math.max(0, page - 1))}
        >
          ‹ Anterior
        </button>
        <span className="text-gray-500 text-xs">Página {totalPages === 0 ? 0 : page + 1} de {totalPages}</span>
        <button
          className="btn-secondary py-1 px-3 text-xs disabled:opacity-40"
          disabled={page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente ›
        </button>
      </div>
    </div>
  )
}
