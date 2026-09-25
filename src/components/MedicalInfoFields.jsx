const BLOOD_TYPES = [
  { value: 'A_POSITIVE', label: 'A+' },
  { value: 'A_NEGATIVE', label: 'A-' },
  { value: 'B_POSITIVE', label: 'B+' },
  { value: 'B_NEGATIVE', label: 'B-' },
  { value: 'AB_POSITIVE', label: 'AB+' },
  { value: 'AB_NEGATIVE', label: 'AB-' },
  { value: 'O_POSITIVE', label: 'O+' },
  { value: 'O_NEGATIVE', label: 'O-' },
  { value: 'OTHER', label: 'Otro' },
]

const BLOOD_TYPE_LABELS = Object.fromEntries(BLOOD_TYPES.map((b) => [b.value, b.label]))

export const EMPTY_MEDICAL_INFO = { hasAllergies: '', allergiesDetail: '', bloodType: '', bloodTypeOther: '' }

// Convierte el estado del formulario al payload que espera el backend (MedicalInfoRequest) --
// "Ninguna" cuando respondió que no tiene, para distinguir una respuesta explícita de un
// registro viejo (de antes de este campo) que quedó en null.
export function toMedicalInfoPayload(value) {
  return {
    allergies: value.hasAllergies === 'yes' ? value.allergiesDetail.trim() : 'Ninguna',
    bloodType: value.bloodType || null,
    bloodTypeOther: value.bloodType === 'OTHER' ? value.bloodTypeOther.trim() : null,
  }
}

// Convierte un PatientResponse del backend al estado de este formulario, para prellenar al editar.
export function fromPatientResponse(patient) {
  const hasAllergies = !!patient?.allergies && patient.allergies !== 'Ninguna'
  return {
    hasAllergies: patient?.allergies ? (hasAllergies ? 'yes' : 'no') : '',
    allergiesDetail: hasAllergies ? patient.allergies : '',
    bloodType: patient?.bloodType || '',
    bloodTypeOther: patient?.bloodTypeOther || '',
  }
}

// Texto legible para mostrar en modo lectura (encabezado del paciente, tarjetas, etc.).
export function bloodTypeLabel(patient) {
  if (!patient?.bloodType) return 'No especificado'
  if (patient.bloodType === 'OTHER') return patient.bloodTypeOther ? `Otro (${patient.bloodTypeOther})` : 'Otro'
  return BLOOD_TYPE_LABELS[patient.bloodType] || patient.bloodType
}

export function allergiesLabel(patient) {
  return patient?.allergies?.trim() || 'No especificadas'
}

/**
 * Alergias (Sí/No + detalle, máx 150) y tipo de sangre (catálogo + Otro) -- obligatorios en
 * todo alta/agendado de paciente (invitado, registrado o dado de alta por recepción): el
 * doctor los necesita para poder recetar con seguridad. Un solo componente para no repetir
 * esta UI en cada formulario que crea o edita un paciente.
 */
export default function MedicalInfoFields({ value, onChange, idPrefix = 'medical-info' }) {
  function update(patch) {
    onChange({ ...value, ...patch })
  }

  return (
    <div className="space-y-3">
      <div>
        <span className="block text-gray-700 mb-1 font-medium text-sm">¿Tiene alergias?</span>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input
              type="radio" name={`${idPrefix}-allergies`} required className="accent-primary-600"
              checked={value.hasAllergies === 'no'}
              onChange={() => update({ hasAllergies: 'no', allergiesDetail: '' })}
            />
            No
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio" name={`${idPrefix}-allergies`} required className="accent-primary-600"
              checked={value.hasAllergies === 'yes'}
              onChange={() => update({ hasAllergies: 'yes' })}
            />
            Sí
          </label>
        </div>
        {value.hasAllergies === 'yes' && (
          <div className="mt-2">
            <textarea
              required maxLength={150} rows={2} className="input"
              placeholder="¿Cuáles? (máx. 150 caracteres)"
              value={value.allergiesDetail}
              onChange={(e) => update({ allergiesDetail: e.target.value })}
            />
            <p className="text-xs text-gray-400 text-right mt-0.5">{value.allergiesDetail.length}/150</p>
          </div>
        )}
      </div>

      <div>
        <span className="block text-gray-700 mb-1 font-medium text-sm">Tipo de sangre</span>
        <select
          required className="input" value={value.bloodType}
          onChange={(e) => update({ bloodType: e.target.value, bloodTypeOther: '' })}
        >
          <option value="">Selecciona...</option>
          {BLOOD_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
        </select>
        {value.bloodType === 'OTHER' && (
          <input
            required className="input mt-2" placeholder="Especifica el tipo de sangre"
            value={value.bloodTypeOther}
            onChange={(e) => update({ bloodTypeOther: e.target.value })}
          />
        )}
      </div>
    </div>
  )
}
