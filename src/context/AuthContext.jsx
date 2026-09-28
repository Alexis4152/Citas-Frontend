import { getHospitalSlug, sessionStorageKey } from '../tenant'
import { createContext, useContext, useState, useEffect } from 'react'
import { login as apiLogin, register as apiRegister, logout as apiLogout } from '../api/auth'
import { setAccessToken, refreshSession } from '../api/axios'

const AuthContext = createContext(null)

/**
 * Fuente central de verdad de la sesión: mantiene `user` en memoria sincronizado con
 * localStorage (solo el perfil, nunca el token) y expone login/register/logout y flags de
 * rol (role, isAdmin, isDoctor, isReceptionist, isPatient).
 *
 * Al montar, restaura el perfil guardado de inmediato (evita parpadeos de UI) y en paralelo
 * llama a `/auth/refresh` -- usa la cookie httpOnly del refresh token para obtener un access
 * token fresco sin pedir credenciales de nuevo (patrón 01). Si falla (cookie ausente/expirada),
 * la sesión se limpia.
 *
 * Usa `refreshSession()` (no una llamada directa a la API) porque comparte el mecanismo de
 * "una sola llamada en vuelo" de axios.js: con React.StrictMode este efecto se dispara dos
 * veces en dev, y como el refresh token se rota/revoca de un solo uso, dos llamadas
 * concurrentes con la cookie vieja tumbarían la sesión en la UI aunque la primera sí la haya
 * renovado bien en el backend (ver comentario en axios.js).
 *
 * Multi-hospital: la sesión es del hospital del link /c/<slug> (o de la raíz, solo para el
 * SUPER_ADMIN). La cookie del refresh token es una sola para todo el sitio, así que si trae la
 * cuenta de OTRO hospital, aquí se trata como "sin sesión" (sin cerrarla allá).
 */
function belongsHere(user) {
  if (!user) return false
  const slug = getHospitalSlug()
  return slug ? user.hospitalSlug === slug : user.role === 'SUPER_ADMIN'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(sessionStorageKey())
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (belongsHere(parsed)) setUser(parsed)
      } catch {
        localStorage.removeItem(sessionStorageKey())
      }
    }

    refreshSession()
      .then(({ user: fresh }) => {
        if (!belongsHere(fresh)) {
          setAccessToken(null)
          localStorage.removeItem(sessionStorageKey())
          setUser(null)
          return
        }
        localStorage.setItem(sessionStorageKey(), JSON.stringify(fresh))
        setUser(fresh)
      })
      .catch(() => {
        setAccessToken(null)
        localStorage.removeItem(sessionStorageKey())
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const res = await apiLogin({ email, password })
    const { token, user: userData } = res.data.data
    setAccessToken(token)
    localStorage.setItem(sessionStorageKey(), JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  async function register(payload) {
    const res = await apiRegister(payload)
    const { token, user: userData } = res.data.data
    setAccessToken(token)
    localStorage.setItem(sessionStorageKey(), JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  function logout() {
    apiLogout().catch(() => {})
    setAccessToken(null)
    localStorage.removeItem(sessionStorageKey())
    setUser(null)
  }

  function updateUserInMemory(partial) {
    setUser((prev) => {
      const merged = { ...prev, ...partial }
      localStorage.setItem(sessionStorageKey(), JSON.stringify(merged))
      return merged
    })
  }

  /** Usado tras /auth/change-password: el backend ya revocó/reemitió la sesión, aquí solo se
   * sincroniza el estado en memoria con el nuevo token + perfil. */
  function applySession(token, userData) {
    setAccessToken(token)
    localStorage.setItem(sessionStorageKey(), JSON.stringify(userData))
    setUser(userData)
  }

  const role = user?.role
  const isAdmin = role === 'ADMIN'
  const isDoctor = role === 'DOCTOR'
  const isReceptionist = role === 'RECEPTIONIST'
  const isPatient = role === 'PATIENT'
  const isSuperAdmin = role === 'SUPER_ADMIN'

  return (
    <AuthContext.Provider
      value={{
        user, login, register, logout, role, isAdmin, isDoctor, isReceptionist, isPatient, isSuperAdmin,
        loading, updateUserInMemory, applySession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
