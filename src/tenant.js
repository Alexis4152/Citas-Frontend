/**
 * Hospital (tenant) de la pantalla actual. Cada hospital vive en /c/<slug>: HospitalApp fija el
 * slug al entrar y de aquí lo toman axios (header X-Hospital en cada request), los Link/navigate
 * de ./router.jsx (que le anteponen /c/<slug> a las rutas absolutas) y la sesión guardada (una
 * por hospital). Sin slug = raíz del sitio (portada de Nexora y panel del SUPER_ADMIN).
 */
let currentSlug = null

export function getHospitalSlug() {
  return currentSlug
}

export function setHospitalSlug(slug) {
  currentSlug = slug || null
}

// Rutas que viven en la raíz del sitio aunque se esté dentro de un hospital.
const ROOT_PATHS = ['/superadmin']

/** '/login' -> '/c/<slug>/login' dentro de un hospital; en la raíz, igual. */
export function hospitalPath(path) {
  if (!currentSlug || typeof path !== 'string' || !path.startsWith('/') || path.startsWith('/c/')
    || ROOT_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
    return path
  }
  return path === '/' ? `/c/${currentSlug}` : `/c/${currentSlug}${path}`
}

/** '/c/<slug>/admin/citas' -> '/admin/citas' (para comparar rutas sin importar el hospital). */
export function stripHospitalPrefix(pathname) {
  const match = /^\/c\/[^/]+(\/.*)?$/.exec(pathname || '')
  return match ? (match[1] || '/') : pathname
}

/** Llave de la sesión guardada en localStorage: una por hospital (y otra para la raíz). */
export function sessionStorageKey() {
  return `hospital_user:${currentSlug || 'root'}`
}
