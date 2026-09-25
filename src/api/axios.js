import axios from 'axios'

/** Instancia central de axios. En dev usa `/api` (proxy de Vite hacia el backend en
 * localhost:8082); en producción usa VITE_API_URL (inyectada en build time).
 * `withCredentials` es necesario para que la cookie httpOnly del refresh token viaje con
 * cada request (patrón 01). */
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', withCredentials: true })

// El access token vive SOLO en memoria (nunca en localStorage): reduce la ventana de robo
// por XSS, a costa de tener que recuperarlo con /auth/refresh (vía la cookie httpOnly) cada
// vez que se recarga la página. Ver AuthContext.jsx.
let accessToken = null
export function setAccessToken(token) {
  accessToken = token
}
export function getAccessToken() {
  return accessToken
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

// Refresh en un solo vuelo: si varios requests reciben 401 al mismo tiempo (token recién
// expirado), o si React.StrictMode dispara el efecto de montaje de AuthContext dos veces
// (dev only), todos comparten la MISMA llamada a /auth/refresh en vez de disparar una por
// cada uno. Esto es crítico y no solo una optimización: el refresh token es de un solo uso
// (se rota y revoca al usarse), así que dos llamadas concurrentes con la cookie vieja
// causarían que la segunda falle por "token ya revocado" y tumbe la sesión en la UI aunque
// la primera sí la haya renovado correctamente en el backend.
let refreshPromise = null

function requestRefresh() {
  if (!refreshPromise) {
    refreshPromise = api.post('/auth/refresh')
      .then((res) => {
        setAccessToken(res.data.data.token)
        return res.data.data
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

/** Expuesto para AuthContext (restaurar sesión al montar) -- comparte el mismo "vuelo único"
 * que usa el interceptor de 401 de abajo. */
export function refreshSession() {
  return requestRefresh()
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login')
      || originalRequest?.url?.includes('/auth/refresh')
      || originalRequest?.url?.includes('/auth/register')

    if (err.response?.status === 401 && !isAuthEndpoint && !originalRequest._retried) {
      originalRequest._retried = true
      try {
        const { token } = await requestRefresh()
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      } catch (refreshError) {
        setAccessToken(null)
        localStorage.removeItem('hospital_user')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(err)
  }
)

export default api
