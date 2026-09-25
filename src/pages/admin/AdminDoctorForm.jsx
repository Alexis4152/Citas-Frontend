import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminCreateDoctor, adminUpdateDoctor, adminGetDoctor, adminUploadDoctorPhoto } from '../../api/adminDoctors'
import { getSpecialties, getBranches } from '../../api/publicCatalog'
import { resolveMediaUrl } from '../../utils/media'
import { onlyDigits, PHONE_INPUT_PROPS } from '../../utils/phone'
import { useNotify } from '../../context/NotifyContext'

const DAYS = [
  { value: 'MONDAY', label: 'Lunes' },
  { value: 'TUESDAY', label: 'Martes' },
  { value: 'WEDNESDAY', label: 'Miércoles' },
  { value: 'THURSDAY', label: 'Jueves' },
  { value: 'FRIDAY', label: 'Viernes' },
  { value: 'SATURDAY', label: 'Sábado' },
  { value: 'SUNDAY', label: 'Domingo' },
]

const MAX_PHOTO_BYTES = 2 * 1024 * 1024

const EMPTY = {
  email: '', firstName: '', lastName: '', phone: '',
  specialtyId: '', licenseNumber: '', bio: '', defaultSlotMinutes: 30, consultationPrice: '',
  branchIds: [],
}

const EMPTY_SCHEDULE_ROW = { branchId: '', dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '14:00' }

/**
 * Alta/edición de doctor. En alta crea de un solo golpe el User (rol DOCTOR), el perfil
 * Doctor, su especialidad, sus sedes y (opcionalmente) su horario semanal inicial -- la
 * contraseña la genera el servidor y fuerza su cambio en el primer login (patrón 02), se
 * muestra una sola vez al terminar. En edición (ruta con :id) solo se tocan los datos de
 * perfil + sedes (ver DoctorUpdateRequest en el backend): sin email (cambio de correo es
 * operación de cuenta aparte), sin password, y sin la sección de horario semanal inicial
 * (el horario recurrente se administra desde "Mi horario" del propio doctor).
 */
export default function AdminDoctorForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const { notify } = useNotify()

  const [specialties, setSpecialties] = useState([])
  const [branches, setBranches] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [schedules, setSchedules] = useState([])
  const [scheduleRow, setScheduleRow] = useState(EMPTY_SCHEDULE_ROW)
  const scheduleBranch = branches.find((x) => String(x.id) === String(scheduleRow.branchId))
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [createdInfo, setCreatedInfo] = useState(null)

  useEffect(() => {
    getSpecialties().then((r) => setSpecialties(r.data.data)).catch(() => {})
    getBranches().then((r) => setBranches(r.data.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    adminGetDoctor(id).then((r) => {
      const d = r.data.data
      setForm({
        email: d.email, firstName: d.firstName, lastName: d.lastName, phone: d.phone || '',
        specialtyId: String(d.specialty?.id || ''), licenseNumber: d.licenseNumber || '', bio: d.bio || '',
        defaultSlotMinutes: d.defaultSlotMinutes ?? 30,
        consultationPrice: d.consultationPrice != null ? String(d.consultationPrice) : '',
        branchIds: (d.branches || []).map((b) => b.id),
      })
      if (d.photoUrl) setPhotoPreview(resolveMediaUrl(d.photoUrl))
    }).finally(() => setLoading(false))
  }, [id, isEdit])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function toggleBranch(id) {
    setForm((f) => ({
      ...f,
      branchIds: f.branchIds.includes(id) ? f.branchIds.filter((x) => x !== id) : [...f.branchIds, id],
    }))
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_PHOTO_BYTES) {
      notify('La foto no debe superar 2MB', 'error')
      e.target.value = ''
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function addScheduleRow() {
    if (!scheduleRow.branchId) return
    const open = scheduleBranch?.openTime?.slice(0, 5)
    const close = scheduleBranch?.closeTime?.slice(0, 5)
    if (open && close && (scheduleRow.startTime < open || scheduleRow.endTime > close)) {
      notify(`${scheduleBranch.name} atiende de ${open} a ${close}: el horario debe quedar dentro de ese rango`, 'error')
      return
    }
    if (scheduleRow.startTime >= scheduleRow.endTime) {
      notify('La hora de inicio debe ser anterior a la hora de fin', 'error')
      return
    }
    setSchedules((s) => [...s, scheduleRow])
    setScheduleRow(EMPTY_SCHEDULE_ROW)
  }

  function removeScheduleRow(index) {
    setSchedules((s) => s.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.phone && form.phone.length !== 10) {
      notify('El teléfono debe tener exactamente 10 dígitos', 'error')
      return
    }
    if (form.branchIds.length === 0) {
      notify('Debe asignarse al menos una sede', 'error')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        const payload = {
          firstName: form.firstName, lastName: form.lastName, phone: form.phone,
          specialtyId: Number(form.specialtyId),
          licenseNumber: form.licenseNumber, bio: form.bio,
          defaultSlotMinutes: form.defaultSlotMinutes === '' ? null : Number(form.defaultSlotMinutes),
          consultationPrice: form.consultationPrice === '' ? null : Number(form.consultationPrice),
          branchIds: form.branchIds.map(Number),
        }
        await adminUpdateDoctor(id, payload)

        if (photoFile) {
          try {
            await adminUploadDoctorPhoto(id, photoFile)
          } catch {
            notify('El doctor se actualizó, pero no se pudo subir la foto. Puedes intentarlo después.', 'error')
          }
        }

        notify('Doctor actualizado correctamente', 'success')
        navigate(`/admin/doctores/${id}`)
        return
      }

      const payload = {
        ...form,
        specialtyId: Number(form.specialtyId),
        defaultSlotMinutes: form.defaultSlotMinutes === '' ? null : Number(form.defaultSlotMinutes),
        consultationPrice: form.consultationPrice === '' ? null : Number(form.consultationPrice),
        branchIds: form.branchIds.map(Number),
        schedules: schedules.map((s) => ({ ...s, branchId: Number(s.branchId) })),
      }
      const res = await adminCreateDoctor(payload)
      const created = res.data.data

      if (photoFile) {
        try {
          await adminUploadDoctorPhoto(created.id, photoFile)
        } catch {
          notify('El doctor se creó, pero no se pudo subir la foto. Puedes intentarlo después.', 'error')
        }
      }

      notify('Doctor creado correctamente', 'success')
      setCreatedInfo({ email: created.email, temporaryPassword: created.temporaryPassword })
    } catch (err) {
      notify(err.response?.data?.message || `No se pudo ${isEdit ? 'actualizar' : 'crear'} el doctor`, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (createdInfo) {
    return (
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Doctor creado</h1>
        <div className="card p-6 space-y-4">
          <p className="text-sm text-gray-700">
            Comunícale estos datos de acceso al doctor. Se le pedirá cambiar la contraseña la
            primera vez que inicie sesión.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm space-y-1">
            <p><span className="font-medium">Correo:</span> {createdInfo.email}</p>
            {createdInfo.temporaryPassword && (
              <p><span className="font-medium">Contraseña temporal:</span> <code>{createdInfo.temporaryPassword}</code></p>
            )}
          </div>
          <button className="btn-primary" onClick={() => navigate('/admin/doctores', { replace: true })}>
            Ir al listado de doctores
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return <p className="text-gray-500 text-sm">Cargando...</p>
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{isEdit ? 'Editar doctor' : 'Nuevo doctor'}</h1>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre"><input required className="input" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} /></Field>
          <Field label="Apellido"><input required className="input" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} /></Field>
          <Field label="Correo">
            <input
              required type="email" className="input disabled:bg-gray-100 disabled:text-gray-500"
              value={form.email} disabled={isEdit}
              onChange={(e) => update('email', e.target.value)}
            />
            {isEdit && <p className="text-xs text-gray-400 mt-1">El correo no se puede cambiar aquí.</p>}
          </Field>
          <Field label="Teléfono"><input className="input" {...PHONE_INPUT_PROPS} value={form.phone} onChange={(e) => update('phone', onlyDigits(e.target.value))} /></Field>
          <Field label="Especialidad">
            <select required className="input" value={form.specialtyId} onChange={(e) => update('specialtyId', e.target.value)}>
              <option value="">Selecciona...</option>
              {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Cédula profesional"><input className="input" value={form.licenseNumber} onChange={(e) => update('licenseNumber', e.target.value)} /></Field>
          <Field label="Minutos por cita (predeterminado)">
            <input type="number" min="5" max="240" step="5" className="input" value={form.defaultSlotMinutes} onChange={(e) => update('defaultSlotMinutes', e.target.value)} />
          </Field>
          <Field label="Precio de la consulta (MXN, opcional)">
            <input type="number" min="0" step="0.01" className="input" placeholder="Lo define el doctor" value={form.consultationPrice} onChange={(e) => update('consultationPrice', e.target.value)} />
          </Field>
          <Field label="Foto (opcional, máx. 2MB)" className="sm:col-span-2">
            <div className="flex items-center gap-4">
              {photoPreview && <img src={photoPreview} alt="" className="w-16 h-16 rounded-full object-cover" />}
              <label className="btn-secondary cursor-pointer text-sm">
                Elegir archivo
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handlePhotoChange} />
              </label>
            </div>
          </Field>
          <Field label="Biografía" className="sm:col-span-2">
            <textarea className="input" rows={3} value={form.bio} onChange={(e) => update('bio', e.target.value)} />
          </Field>

          <div className="sm:col-span-2">
            <span className="block text-sm text-gray-700 mb-1 font-medium">Sedes</span>
            <div className="flex flex-wrap gap-2">
              {branches.map((b) => (
                <button
                  type="button"
                  key={b.id}
                  onClick={() => toggleBranch(b.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border ${
                    form.branchIds.includes(b.id) ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-600'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!isEdit && (
        <div className="border-t border-gray-100 pt-5">
          <h2 className="font-semibold text-gray-900 mb-1">Horario semanal inicial (opcional)</h2>
          <p className="text-xs text-gray-500 mb-3">Puedes agregar horarios ahora o configurarlos después desde el panel del doctor.</p>

          <div className="flex flex-wrap items-end gap-3 mb-3">
            <div className="min-w-[140px]">
              <label className="text-xs font-medium text-gray-600 block mb-1">Sede</label>
              <select className="input" value={scheduleRow.branchId} onChange={(e) => setScheduleRow({ ...scheduleRow, branchId: e.target.value })}>
                <option value="">Selecciona...</option>
                {form.branchIds.map((bId) => {
                  const b = branches.find((x) => x.id === bId)
                  return b ? <option key={b.id} value={b.id}>{b.name}</option> : null
                })}
              </select>
            </div>
            <div className="min-w-[130px]">
              <label className="text-xs font-medium text-gray-600 block mb-1">Día</label>
              <select className="input" value={scheduleRow.dayOfWeek} onChange={(e) => setScheduleRow({ ...scheduleRow, dayOfWeek: e.target.value })}>
                {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Inicio</label>
              <input type="time" className="input" min={scheduleBranch?.openTime?.slice(0, 5)} max={scheduleBranch?.closeTime?.slice(0, 5)} value={scheduleRow.startTime} onChange={(e) => setScheduleRow({ ...scheduleRow, startTime: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Fin</label>
              <input type="time" className="input" min={scheduleBranch?.openTime?.slice(0, 5)} max={scheduleBranch?.closeTime?.slice(0, 5)} value={scheduleRow.endTime} onChange={(e) => setScheduleRow({ ...scheduleRow, endTime: e.target.value })} />
            </div>
            {scheduleBranch?.openTime && scheduleBranch?.closeTime && (
              <p className="w-full text-xs text-gray-500">
                {scheduleBranch.name} atiende de {scheduleBranch.openTime.slice(0, 5)} a {scheduleBranch.closeTime.slice(0, 5)}: el horario debe quedar dentro de ese rango.
              </p>
            )}
            <button type="button" className="btn-secondary text-sm" onClick={addScheduleRow} disabled={form.branchIds.length === 0}>+ Agregar</button>
          </div>

          {schedules.length > 0 && (
            <ul className="space-y-1 text-sm">
              {schedules.map((s, i) => (
                <li key={i} className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
                  <span>
                    {DAYS.find((d) => d.value === s.dayOfWeek)?.label} · {branches.find((b) => String(b.id) === String(s.branchId))?.name} · {s.startTime}–{s.endTime}
                  </span>
                  <button type="button" className="text-red-600 hover:underline text-xs" onClick={() => removeScheduleRow(i)}>Quitar</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button type="button" className="btn-secondary" onClick={() => navigate(isEdit ? `/admin/doctores/${id}` : '/admin/doctores')}>Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Guardando...' : isEdit ? 'Actualizar doctor' : 'Crear doctor'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="block text-gray-700 mb-1 font-medium">{label}</span>
      {children}
    </label>
  )
}
