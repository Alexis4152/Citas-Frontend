const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

/** "$1,500.00" -- montos siempre en pesos mexicanos. */
export function formatMoney(value) {
  return MXN.format(Number(value ?? 0))
}

/** true si el valor es un monto numérico > 0 (un precio "definido"). */
export function hasPrice(value) {
  return value !== null && value !== undefined && Number(value) > 0
}
