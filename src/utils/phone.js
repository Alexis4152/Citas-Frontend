// El backend exige teléfono a 10 dígitos numéricos exactos (ver ValidationPatterns.java). Este
// filtro se aplica en cada onChange de un campo de teléfono para que sea imposible teclear
// letras/símbolos o pasar de 10 dígitos, en vez de depender solo de la validación del navegador.
export function onlyDigits(value, maxLength = 10) {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

// Props comunes para un <input> de teléfono -- teclado numérico en móvil, tope visual de
// caracteres y una pista de formato para el usuario.
export const PHONE_INPUT_PROPS = {
  type: 'tel',
  inputMode: 'numeric',
  maxLength: 10,
  placeholder: '10 dígitos',
}
