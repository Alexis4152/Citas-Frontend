// Origen del backend: mismo criterio que axios.js (proxy de Vite en dev, VITE_API_URL en
// producción), pero sin el sufijo /api porque /uploads/** se sirve en la raíz del backend.
const BACKEND_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '')

/** Antepone el origen del backend a una ruta relativa de /uploads/** solo cuando hace falta
 * (patrón 10 frontend): en dev el proxy de Vite ya reenvía /uploads a :8082, así que una
 * ruta relativa funciona tal cual; en producción, si el frontend no comparte origen con el
 * backend, hay que resolverla a absoluta. Una URL ya absoluta (http/https) se deja intacta. */
export function resolveMediaUrl(path) {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  const uploadsPath = normalized.startsWith('/uploads') ? normalized : `/uploads/${normalized.replace(/^\//, '')}`
  return BACKEND_ORIGIN ? `${BACKEND_ORIGIN}${uploadsPath}` : uploadsPath
}

/** Dispara la descarga de un blob de respuesta de axios (comprobantes PDF, Excel). */
export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
