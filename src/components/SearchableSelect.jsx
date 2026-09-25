import { useEffect, useState } from 'react'
import useOutsideClick from '../hooks/useOutsideClick'
import useEscapeKey from '../hooks/useEscapeKey'

/**
 * Selector con autocompletado: campo de texto que filtra `options` mientras se escribe, en
 * vez de un <select> plano donde hay que desplazarse a mano entre muchas opciones (ej. una
 * lista larga de doctores). `options` es [{ value, label }]; `value` es el value seleccionado
 * (o '' para "todos").
 */
export default function SearchableSelect({ options, value, onChange, placeholder = 'Todos', allLabel = 'Todos' }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useOutsideClick(() => setOpen(false))
  useEscapeKey(open, () => setOpen(false))

  const selected = options.find((o) => String(o.value) === String(value))

  // Si la selección cambia desde fuera (ej. botón "Limpiar" o la cascada especialidad→doctor
  // resetea el doctor elegido), refleja ese cambio en el texto del campo.
  useEffect(() => {
    setQuery(selected ? selected.label : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.value])

  const showingSelection = selected && query === selected.label
  const filtered = query.trim() === '' || showingSelection
    ? options
    : options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))

  function handleSelect(nextValue, label) {
    onChange(nextValue)
    setQuery(label)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <input
        className="input"
        placeholder={placeholder}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={(e) => { e.target.select(); setOpen(true) }}
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleSelect('', '')}
            className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${!value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'}`}
          >
            {allLabel}
          </button>
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">Sin coincidencias</p>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(opt.value, opt.label)}
                className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${String(opt.value) === String(value) ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'}`}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
