import { onlyDigits, PHONE_INPUT_PROPS } from '../utils/phone'

export const EMPTY_PROFILE = {
  birthDate: '', sex: '', curp: '', addressLine: '', neighborhood: '', city: '', state: '', postalCode: '',
  emergencyContactName: '', emergencyContactPhone: '',
}

const CURP_RE = /^[A-Z][AEIOUX][A-Z]{2}\d{6}[HMX][A-Z]{5}[A-Z\d]\d$/

export const SEX_LABELS = { F: 'Femenino', M: 'Masculino', X: 'Otro / prefiere no decir' }

export const profileFromPatient = (p) => Object.fromEntries(Object.keys(EMPTY_PROFILE).map((k) => [k, p?.[k] || '']))

/** Vacíos → null para que el backend no los guarde como "" (y no choque con sus validaciones). */
export const toProfilePayload = (form) => Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === 'string' && v.trim() === '' ? null : v]))

/** Mismas reglas que el backend (PatientProfileRequest); devuelve el primer problema o null. */
export function profileProblem(f) {
  if (f.birthDate) {
    const d = new Date(`${f.birthDate}T12:00:00`)
    if (d > new Date()) return 'La fecha de nacimiento no puede ser futura'
    if (new Date().getFullYear() - d.getFullYear() > 120) return 'La fecha de nacimiento no es realista'
  }
  if (f.curp && !CURP_RE.test(f.curp)) return 'La CURP no tiene un formato válido (18 caracteres)'
  if (f.postalCode && f.postalCode.length !== 5) return 'El código postal debe tener 5 dígitos'
  if (!!f.emergencyContactName?.trim() !== !!f.emergencyContactPhone) return 'Si capturas contacto de emergencia, indica su nombre y su teléfono'
  if (f.emergencyContactPhone && f.emergencyContactPhone.length !== 10) return 'El teléfono de emergencia debe tener 10 dígitos'
  return null
}

/** Datos personales opcionales del paciente: nacimiento, sexo, CURP, domicilio y contacto de emergencia. */
export default function PatientProfileFields({ value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v })
  const today = new Date().toLocaleDateString('en-CA')
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <F label="Fecha de nacimiento"><input type="date" className="input" max={today} value={value.birthDate} onChange={(e) => set('birthDate', e.target.value)} /></F>
      <F label="Sexo">
        <select className="input" value={value.sex} onChange={(e) => set('sex', e.target.value)}>
          <option value="">Sin especificar</option>
          {Object.entries(SEX_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </F>
      <F label="CURP" className="sm:col-span-2">
        <input className="input uppercase" maxLength={18} placeholder="18 caracteres" value={value.curp}
          onChange={(e) => set('curp', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
      </F>
      <F label="Calle y número" className="sm:col-span-2"><input className="input" maxLength={255} value={value.addressLine} onChange={(e) => set('addressLine', e.target.value)} /></F>
      <F label="Colonia"><input className="input" maxLength={120} value={value.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} /></F>
      <F label="Código postal"><input className="input" inputMode="numeric" maxLength={5} value={value.postalCode} onChange={(e) => set('postalCode', onlyDigits(e.target.value).slice(0, 5))} /></F>
      <F label="Ciudad o municipio"><input className="input" maxLength={100} value={value.city} onChange={(e) => set('city', e.target.value)} /></F>
      <F label="Estado"><input className="input" maxLength={100} value={value.state} onChange={(e) => set('state', e.target.value)} /></F>
      <p className="border-t border-slate-100 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:col-span-2">Contacto de emergencia</p>
      <F label="Nombre"><input className="input" maxLength={150} value={value.emergencyContactName} onChange={(e) => set('emergencyContactName', e.target.value)} /></F>
      <F label="Teléfono"><input className="input" {...PHONE_INPUT_PROPS} value={value.emergencyContactPhone} onChange={(e) => set('emergencyContactPhone', onlyDigits(e.target.value))} /></F>
    </div>
  )
}

function F({ label, children, className = '' }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}
