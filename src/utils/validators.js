// Mismas reglas que el backend (com.hospital.citas.util.ValidationPatterns): validar aquí da
// el aviso al momento, pero la regla que manda es la del servidor.

/** Nombre o apellido real: letras (con acentos, ñ, ü), espacios, apóstrofo, guion o punto. */
export const NAME_RE = /^\s*[\p{L}\p{M}]+(?:[ '’.-]{1,2}[\p{L}\p{M}]+)*\.?\s*$/u
export const NAME_MESSAGE = 'Solo letras, espacios, apóstrofos, guiones y puntos'

/** Correo con dominio real (ana@correo.com, no ana@localhost). */
export const EMAIL_RE = /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[A-Za-z]{2,}$/

export const PHONE_RE = /^\d{10}$/

/** Al menos 8 caracteres (máximo 72, límite de BCrypt), una mayúscula y un número. */
export function passwordProblem(value) {
  if (!value || value.length < 8) return 'Mínimo 8 caracteres'
  if (value.length > 72) return 'Máximo 72 caracteres'
  if (!/[A-Z]/.test(value)) return 'Incluye al menos una mayúscula'
  if (!/\d/.test(value)) return 'Incluye al menos un número'
  return null
}

export const nameError = (value, required = true) =>
  !value?.trim() ? (required ? 'Obligatorio' : null) : NAME_RE.test(value) ? null : NAME_MESSAGE

export const emailError = (value, required = true) =>
  !value?.trim() ? (required ? 'Obligatorio' : null) : EMAIL_RE.test(value.trim()) ? null : 'Correo no válido'

export const phoneError = (value, required = true) =>
  !value ? (required ? 'Obligatorio' : null) : PHONE_RE.test(value) ? null : 'Deben ser 10 dígitos'
