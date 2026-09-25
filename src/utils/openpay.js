/**
 * Adaptador del SDK de OpenPay en el navegador (PCI-DSS SAQ A): la tarjeta se tokeniza
 * directo contra OpenPay y a NUESTRO backend solo llega el token (sourceId) -- los datos de la
 * tarjeta nunca pasan por el servidor del hospital. Las llaves públicas y el modo sandbox salen
 * del backend (/public/payments/config), no de variables del frontend.
 *
 * El SDK se carga con <script> en index.html (openpay.v1.min.js y openpay-data.v1.min.js).
 */
import { getPaymentConfig } from '../api/payments'

let config = null
let initialized = false

/** Inicializa el SDK una sola vez. Lanza un error legible si el navegador lo bloqueó. */
export async function initOpenpay() {
  if (typeof window === 'undefined' || !window.OpenPay) {
    throw new Error('No se pudo cargar el módulo de pagos. Desactiva el bloqueador de anuncios e intenta de nuevo.')
  }
  if (!config) {
    config = (await getPaymentConfig()).data.data
  }
  if (!initialized) {
    window.OpenPay.setId(config.merchantId)
    window.OpenPay.setApiKey(config.publicKey)
    window.OpenPay.setSandboxMode(!!config.sandbox)
    initialized = true
  }
}

/** Identificador antifraude del dispositivo (deviceSessionId). */
export function getDeviceSessionId() {
  if (window.OpenPay && window.OpenPay.deviceData) {
    try {
      return window.OpenPay.deviceData.setup()
    } catch (err) {
      console.warn('[OpenPay] No se pudo generar el deviceSessionId:', err)
    }
  }
  // Respaldo si un bloqueador impide el script antifraude: no congela el flujo en desarrollo.
  return 'device-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

const ERROR_DESCRIPTIONS = {
  1000: 'Servicio no disponible temporalmente. Intenta más tarde.',
  1001: 'El número de tarjeta es inválido.',
  1002: 'El código de seguridad (CVV) es inválido.',
  1003: 'La fecha de vencimiento es inválida o la tarjeta ya venció.',
  1004: 'El nombre del titular es obligatorio.',
  1005: 'El formato de la fecha de vencimiento es incorrecto.',
  2004: 'El número de dígitos de la tarjeta no es válido.',
  3001: 'La tarjeta fue declinada por el banco emisor.',
  3002: 'La tarjeta ha expirado.',
  3003: 'Fondos insuficientes en la tarjeta.',
  3004: 'Tarjeta rechazada por reporte de extravío o robo.',
  3005: 'Transacción rechazada por el sistema antifraude.',
}

function tokenizeCard({ cardNumber, holderName, expMonth, expYear, cvv2 }) {
  return new Promise((resolve, reject) => {
    window.OpenPay.token.create(
      {
        card_number: (cardNumber || '').replace(/\s+/g, ''),
        holder_name: (holderName || '').trim(),
        expiration_year: (expYear || '').trim().slice(-2),
        expiration_month: (expMonth || '').trim().padStart(2, '0'),
        cvv2: (cvv2 || '').trim(),
      },
      (response) => (response?.data?.id ? resolve(response.data.id) : reject(new Error('Respuesta inesperada al procesar la tarjeta.'))),
      (errorResponse) => {
        const code = errorResponse?.data?.error_code
        reject(new Error(ERROR_DESCRIPTIONS[code] || errorResponse?.data?.description || 'No se pudo procesar la tarjeta.'))
      },
    )
  })
}

/** Formatea el número en bloques de 4. */
export function formatCardNumber(value = '') {
  const digits = value.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

/** Formatea el vencimiento como MM/AA. */
export function formatExpiry(value = '') {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

export function detectCardBrand(cardNumber = '') {
  const digits = cardNumber.replace(/\D/g, '')
  if (/^4/.test(digits)) return 'Visa'
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard'
  if (/^3[47]/.test(digits)) return 'American Express'
  return 'Tarjeta'
}

/** Algoritmo de Luhn (módulo 10). */
export function isValidLuhn(number = '') {
  const digits = number.replace(/\D/g, '')
  if (digits.length < 13 || digits.length > 19) return false
  let sum = 0
  let alternate = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits.charAt(i), 10)
    if (alternate) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alternate = !alternate
  }
  return sum % 10 === 0
}

export const EMPTY_CARD = { number: '', holder: '', expiry: '', cvv: '' }

/** Mensaje de error de captura de la tarjeta, o null si los datos se ven bien. */
export function validateCard(card) {
  const digits = card.number.replace(/\s+/g, '')
  if (digits.length < 15 || digits.length > 16) return 'El número de tarjeta debe tener 15 o 16 dígitos.'
  if (!isValidLuhn(digits)) return 'El número de tarjeta no es válido.'
  if (!card.holder.trim()) return 'Escribe el nombre del titular, como aparece en la tarjeta.'
  const parts = card.expiry.split('/')
  if (parts.length !== 2 || parts[0].length !== 2 || parts[1].length !== 2) return 'El vencimiento debe tener formato MM/AA (ej. 12/28).'
  const month = parseInt(parts[0], 10)
  if (month < 1 || month > 12) return 'El mes de vencimiento debe estar entre 01 y 12.'
  if (card.cvv.length < 3 || card.cvv.length > 4) return 'El código de seguridad (CVV) debe tener 3 o 4 dígitos.'
  return null
}

/** Valida y tokeniza la tarjeta. Devuelve {sourceId, deviceSessionId} para mandarlos al backend. */
export async function tokenizeFields(card) {
  const problem = validateCard(card)
  if (problem) throw new Error(problem)
  await initOpenpay()
  const deviceSessionId = getDeviceSessionId()
  const sourceId = await tokenizeCard({
    cardNumber: card.number,
    holderName: card.holder,
    expMonth: card.expiry.split('/')[0],
    expYear: card.expiry.split('/')[1],
    cvv2: card.cvv,
  })
  return { sourceId, deviceSessionId }
}
