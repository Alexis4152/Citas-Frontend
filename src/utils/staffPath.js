import { stripHospitalPrefix } from '../tenant'

// Las pantallas de Pacientes, Cobrar y Corte de caja se reusan en los paneles de admin, doctor
// y recepción: los enlaces internos deben quedarse dentro del panel desde el que se abrieron.
// (Ruta sin el /c/<slug> del hospital: los Link/navigate de ../router.jsx se lo vuelven a poner.)
export function staffBasePath(pathname) {
  const path = stripHospitalPrefix(pathname)
  if (path.startsWith('/admin')) return '/admin'
  if (path.startsWith('/doctor')) return '/doctor'
  return '/recepcion'
}
