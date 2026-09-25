// A partir de UN solo color configurado por el admin del hospital, genera una rampa de
// tonos (claro→oscuro) y la aplica como variables CSS — así el resto de la app (que usa
// clases primary-50..900 de Tailwind) cambia de color sin tocar cada componente.

const DEFAULT_BRAND_COLOR = '#155dea'

const RAMP_KEYS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]

// Cuánto se aleja cada tono de la lightness del color base (que se usa como el 600, el
// tono "principal" — botones, links, nav activo). Positivo = más claro, negativo = más oscuro.
const LIGHTNESS_OFFSET = {
  50: 45, 100: 38, 200: 28, 300: 18, 400: 9, 500: 4, 600: 0, 700: -10, 800: -18, 900: -26,
}

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      default: h = (r - g) / d + 4
    }
    h /= 6
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

function hslToHex(h, s, l) {
  s /= 100
  l /= 100
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = (n) => Math.round(f(n) * 255).toString(16).padStart(2, '0')
  return `#${toHex(0)}${toHex(8)}${toHex(4)}`
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

/** Valida que un string sea un color hex de 6 dígitos (ej. '#155dea'). */
export function isValidHex(hex) {
  return typeof hex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(hex)
}

function hexToRgbTriplet(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r} ${g} ${b}`
}

/** Genera una rampa de 10 tonos (50-900) a partir de un solo color base. El tono 600
 * corresponde exactamente al color base. */
export function generateRamp(baseHex) {
  const { h, s, l } = hexToHsl(baseHex)
  const ramp = {}
  for (const key of RAMP_KEYS) {
    const targetL = clamp(l + LIGHTNESS_OFFSET[key], 4, 97)
    const hex = key === 600 ? baseHex : hslToHex(h, s, targetL)
    ramp[key] = hexToRgbTriplet(hex)
  }
  return ramp
}

function applyRampToRoot(ramp, sidebarBg, sidebarBorder) {
  const root = document.documentElement
  for (const key of RAMP_KEYS) {
    root.style.setProperty(`--brand-${key}`, ramp[key])
  }
  root.style.setProperty('--brand-sidebar', sidebarBg)
  root.style.setProperty('--brand-sidebar-border', sidebarBorder)
}

/** Aplica el color de marca por defecto al documento (mientras carga la configuración) —
 * mismo azul y mismo fondo de sidebar fijo que el POS de referencia usa para su pantalla
 * de login/SUPER_ADMIN. */
export function applyDefaultBrand() {
  applyRampToRoot(generateRamp(DEFAULT_BRAND_COLOR), '#050b18', '#0d1b3d')
}

/** Aplica el color primario configurado por el admin del hospital. Si no es un hex válido,
 * cae de vuelta al color por defecto. El fondo del sidebar NO usa el tono 900 de la rampa
 * (con colores de baja saturación, ej. negro puro, ese tono sale gris/negro plano y no se
 * siente parte de la marca) — se deriva aparte con una saturación fija del 45% y luminosidad
 * 6%/14% (bg/borde), tomando solo el matiz del color base. Mismo criterio que
 * DemoPV-Frontend/src/utils/theme.js#applyTiendaBrand. */
export function applyStoreBrand(primaryColor) {
  const base = isValidHex(primaryColor) ? primaryColor : DEFAULT_BRAND_COLOR
  const { h } = hexToHsl(base)
  const sidebarBg = hslToHex(h, 45, 6)
  const sidebarBorder = hslToHex(h, 45, 14)
  applyRampToRoot(generateRamp(base), sidebarBg, sidebarBorder)
}

export { DEFAULT_BRAND_COLOR }
