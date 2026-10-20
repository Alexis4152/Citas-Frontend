import { Outlet } from 'react-router-dom'

/** Marco de la raíz del sitio (sin hospital): solo el login del SUPER_ADMIN y sus pantallas de
 * acceso, que ya traen su propio diseño de pantalla completa (ver AuthShell). */
export default function PlatformLayout() {
  return <Outlet />
}
