import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listNotifications, getUnreadNotificationCount, markNotificationAsRead, markAllNotificationsAsRead,
} from '../api/notifications'
import { useAuth } from '../context/AuthContext'
import useOutsideClick from '../hooks/useOutsideClick'
import useEscapeKey from '../hooks/useEscapeKey'
import usePolling from '../hooks/usePolling'

const TYPE_ICON = { NEW_APPOINTMENT: '📅', APPOINTMENT_CANCELLED: '🚫', APPOINTMENT_RESCHEDULED: '🔄' }

function relativeTime(isoDate) {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'justo ahora'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} d`
}

/** A dónde manda cada rol al hacer clic en una notificación: siempre al módulo de Citas que
 * le corresponde, con el filtro puesto en la fecha de esa cita (patrón: mismo mecanismo
 * ?from=&to= que ya arman las tarjetas del Dashboard) y el registro resaltado -- el paciente
 * solo ve las suyas (Mis citas ya está scopeado a su propia cuenta), doctor/recepción/admin
 * ven el listado completo filtrado a ese día. */
function destinationFor(role, notification) {
  const { appointmentId, appointmentDate } = notification
  if (!appointmentId) return null
  const state = { highlightAppointmentId: appointmentId }

  if (role === 'DOCTOR') {
    return { pathname: '/doctor', state: { ...state, jumpToDate: appointmentDate } }
  }
  if (role === 'RECEPTIONIST') {
    return appointmentDate
      ? { pathname: '/recepcion/citas', search: `?from=${appointmentDate}&to=${appointmentDate}`, state }
      : { pathname: '/recepcion/citas', state }
  }
  if (role === 'ADMIN') {
    return appointmentDate
      ? { pathname: '/admin/citas', search: `?from=${appointmentDate}&to=${appointmentDate}`, state }
      : { pathname: '/admin/citas', state }
  }
  if (role === 'PATIENT') {
    return { pathname: '/mis-citas', state }
  }
  return null
}

/**
 * Campanita de notificaciones: cuando se agenda, cancela o reprograma una cita, los
 * involucrados reciben una fila aquí (además del correo) -- ver NotificationServiceImpl para
 * el alcance exacto por rol. Se refresca sola por polling (patrón 14, cada 20s + al
 * recuperar el foco de la pestaña) para que no haga falta refrescar la página -- no hay
 * websockets en este proyecto, igual que el resto de los "en vivo" del sistema (dashboard de
 * recepción, agenda del doctor).
 */
export default function NotificationBell() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const ref = useOutsideClick(() => setOpen(false))
  useEscapeKey(open, () => setOpen(false))

  function loadUnreadCount() {
    getUnreadNotificationCount().then((r) => setUnreadCount(r.data.data ?? 0)).catch(() => {})
  }

  useEffect(() => { loadUnreadCount() }, [])
  usePolling(loadUnreadCount, 20000)

  function loadNotifications() {
    setLoading(true)
    listNotifications().then((r) => setNotifications(r.data.data)).finally(() => setLoading(false))
  }

  function toggleOpen() {
    setOpen((v) => {
      if (!v) loadNotifications()
      return !v
    })
  }

  async function markRead(notification) {
    if (notification.read) return
    try {
      await markNotificationAsRead(notification.id)
      setNotifications((list) => list.map((n) => (n.id === notification.id ? { ...n, read: true } : n)))
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      // Silencioso: no es una acción crítica, un intento fallido no debe interrumpir al usuario.
    }
  }

  function handleNotificationClick(notification) {
    markRead(notification)
    setOpen(false)
    const destination = destinationFor(role, notification)
    if (destination) navigate(destination)
  }

  async function handleMarkAllAsRead(e) {
    e.stopPropagation()
    try {
      await markAllNotificationsAsRead()
      setNotifications((list) => list.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {
      // Silencioso, igual que markRead.
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggleOpen}
        className="relative p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
        aria-label="Notificaciones"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] leading-none rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-lg shadow-lg border border-gray-100 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-900 text-sm">Notificaciones</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} className="text-xs text-primary-700 hover:underline">
                Marcar todas como leídas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-gray-400 p-4">Cargando...</p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-gray-400 p-4">Sin notificaciones.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 flex gap-3 hover:bg-gray-50 ${
                    n.read ? '' : 'bg-primary-50/40'
                  }`}
                >
                  <span className="text-lg shrink-0">{TYPE_ICON[n.type] || '🔔'}</span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-sm ${n.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                      {n.message}
                    </span>
                    <span className="block text-xs text-gray-400 mt-0.5">{relativeTime(n.createdAt)}</span>
                  </span>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-primary-600 shrink-0 mt-1.5" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
