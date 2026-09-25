import { useEffect, useState } from 'react'
import { adminGetHospitalConfig, adminUpdateHospitalConfig, adminUploadHospitalLogo } from '../../api/adminHospitalConfig'
import { useNotify } from '../../context/NotifyContext'
import { useHospitalConfig } from '../../context/HospitalConfigContext'
import { isValidHex } from '../../utils/theme'
import { resolveMediaUrl } from '../../utils/media'
import { onlyDigits, PHONE_INPUT_PROPS } from '../../utils/phone'

const MAX_LOGO_BYTES = 2 * 1024 * 1024

/**
 * Configuración de marca del hospital (nombre, logo, color, descripción, contacto) — mismo
 * patrón de color-picker + campos que AdminStoreConfig.jsx del proyecto de referencia. A
 * diferencia de ese proyecto, el color aquí NO se recarga dinámicamente en el resto del
 * sitio (ver HospitalConfigContext.jsx: no existe un GET público de hospital-config en el
 * Backend, solo el admin puede leer/editar esta configuración), así que no hay un botón de
 * "reload" del contexto global — el formulario solo lee/escribe la config real vía API admin.
 */
export default function AdminHospitalConfig() {
  const { notify } = useNotify()
  const { refresh: refreshBrand } = useHospitalConfig()
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  function load() {
    setLoading(true)
    adminGetHospitalConfig().then((r) => setForm(r.data.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_LOGO_BYTES) {
      notify('El logo no debe superar 2MB', 'error')
      e.target.value = ''
      return
    }
    setUploadingLogo(true)
    try {
      const res = await adminUploadHospitalLogo(file)
      setForm(res.data.data)
      refreshBrand()
      notify('Logo actualizado correctamente', 'success')
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo subir el logo', 'error')
    } finally {
      setUploadingLogo(false)
      e.target.value = ''
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.contactPhone && form.contactPhone.length !== 10) {
      notify('El teléfono de contacto debe tener exactamente 10 dígitos', 'error')
      return
    }
    setSaving(true)
    try {
      await adminUpdateHospitalConfig(form)
      refreshBrand()
      notify('Configuración del hospital actualizada', 'success')
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Configuración del hospital</h1>

      {loading || !form ? (
        <p className="text-gray-500">Cargando...</p>
      ) : (
        <form onSubmit={handleSubmit} className="card p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre"><input required className="input" value={form.name} onChange={(e) => update('name', e.target.value)} /></Field>
            <Field label="Logo (opcional, máx. 2MB)">
              <div className="flex items-center gap-3">
                {form.logoUrl && <img src={resolveMediaUrl(form.logoUrl)} alt="" className="h-10 w-auto object-contain" />}
                <label className="btn-secondary cursor-pointer text-sm">
                  {uploadingLogo ? 'Subiendo...' : 'Cambiar logo'}
                  <input type="file" accept="image/png,image/jpeg" className="hidden" disabled={uploadingLogo} onChange={handleLogoChange} />
                </label>
              </div>
            </Field>
            <Field label="Teléfono de contacto"><input className="input" {...PHONE_INPUT_PROPS} value={form.contactPhone || ''} onChange={(e) => update('contactPhone', onlyDigits(e.target.value))} /></Field>
            <Field label="Correo de contacto"><input type="email" className="input" value={form.contactEmail || ''} onChange={(e) => update('contactEmail', e.target.value)} /></Field>

            <Field label="Color primario">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={isValidHex(form.primaryColor) ? form.primaryColor : '#155dea'}
                  onChange={(e) => update('primaryColor', e.target.value)}
                  className="h-10 w-14 rounded border border-gray-300"
                />
                <input className="input" value={form.primaryColor || ''} onChange={(e) => update('primaryColor', e.target.value)} placeholder="#155dea" />
              </div>
            </Field>

            {isValidHex(form.primaryColor) && (
              <div className="sm:col-span-2 flex items-center gap-3 text-sm">
                <span className="text-gray-500">Vista previa:</span>
                <button type="button" className="px-4 py-2 rounded-lg text-white font-medium" style={{ backgroundColor: form.primaryColor }}>
                  Botón de ejemplo
                </button>
              </div>
            )}

            <Field label="Descripción" className="sm:col-span-2">
              <textarea className="input" rows={2} value={form.description || ''} onChange={(e) => update('description', e.target.value)} />
            </Field>
          </div>

          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Guardar cambios'}</button>
          </div>
        </form>
      )}
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
