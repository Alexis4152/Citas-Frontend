// Las pantallas de Pacientes, Cobrar y Corte de caja se reusan en los paneles de admin, doctor
// y recepción: los enlaces internos deben quedarse dentro del panel desde el que se abrieron.
export function staffBasePath(pathname) {
  if (pathname.startsWith('/admin')) return '/admin'
  if (pathname.startsWith('/doctor')) return '/doctor'
  return '/recepcion'
}
