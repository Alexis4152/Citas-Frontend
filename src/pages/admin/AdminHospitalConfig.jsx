import { useEffect, useState } from 'react'
import { adminGetHospitalConfig, adminUpdateHospitalConfig, adminUploadHospitalLogo } from '../../api/adminHospitalConfig'
import { useNotify } from '../../context/NotifyContext'
import { useHospitalConfig } from '../../context/HospitalConfigContext'
import { isValidHex } from '../../utils/theme'
import { resolveMediaUrl } from '../../utils/media'
import { onlyDigits, PHONE_INPUT_PROPS } from '../../utils/phone'
import { Settings } from 'lucide-react'
import { PageHeader, Skeleton } from '../../components/ui'

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
    if (form.autoNoShowEnabled && !(form.noShowGraceMinutes >= 5 && form.noShowGraceMinutes <= 240)) {
      notify('La espera antes de marcar "no asistió" debe ser de 5 a 240 minutos', 'error')
      return
    }
    if (form.postalCode && form.postalCode.length !== 5) {
      notify('El código postal debe tener 5 dígitos', 'error')
      return
    }
    if (form.whatsapp && form.whatsapp.length !== 10) {
      notify('El WhatsApp debe tener 10 dígitos', 'error')
      return
    }
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
      <PageHeader icon={Settings} eyebrow="Hospital" title="Configuración del hospital"
        description="Marca, datos fiscales y dirección. Aparecen en la página pública, los correos y los PDF." />

      {loading || !form ? (
        <Skeleton className="h-96 rounded-2xl" />
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

            <SectionTitle>Datos fiscales y dirección</SectionTitle>
            <Field label="Razón social"><input maxLength={200} className="input" placeholder="Hospital Central S.A. de C.V." value={form.legalName || ''} onChange={(e) => update('legalName', e.target.value)} /></Field>
            <Field label="RFC"><input maxLength={13} className="input uppercase" placeholder="HCE010101AB1" value={form.rfc || ''} onChange={(e) => update('rfc', e.target.value.toUpperCase().replace(/\s/g, ''))} /></Field>
            <Field label="Calle y número" className="sm:col-span-2"><input maxLength={255} className="input" value={form.addressLine || ''} onChange={(e) => update('addressLine', e.target.value)} /></Field>
            <Field label="Colonia"><input maxLength={120} className="input" value={form.neighborhood || ''} onChange={(e) => update('neighborhood', e.target.value)} /></Field>
            <Field label="Código postal"><input inputMode="numeric" maxLength={5} className="input" placeholder="06700" value={form.postalCode || ''} onChange={(e) => update('postalCode', onlyDigits(e.target.value).slice(0, 5))} /></Field>
            <Field label="Ciudad o municipio"><input maxLength={100} className="input" value={form.city || ''} onChange={(e) => update('city', e.target.value)} /></Field>
            <Field label="Estado"><input maxLength={100} className="input" value={form.state || ''} onChange={(e) => update('state', e.target.value)} /></Field>
            <SectionTitle>Contacto en línea</SectionTitle>
            <Field label="Sitio web"><input type="url" maxLength={200} className="input" placeholder="https://mihospital.com" value={form.website || ''} onChange={(e) => update('website', e.target.value.trim())} /></Field>
            <Field label="WhatsApp"><input className="input" {...PHONE_INPUT_PROPS} value={form.whatsapp || ''} onChange={(e) => update('whatsapp', onlyDigits(e.target.value))} /></Field>
            <Field label="Horario de atención" className="sm:col-span-2"><input maxLength={200} className="input" placeholder="Lunes a viernes 8:00–20:00 · Sábado 9:00–14:00" value={form.openingHours || ''} onChange={(e) => update('openingHours', e.target.value)} /></Field>

            <SectionTitle>Privacidad y datos personales</SectionTitle>
            <Field label="Responsable de datos personales"><input maxLength={150} className="input" placeholder="Departamento de Datos Personales"
              value={form.privacyContactName || ''} onChange={(e) => update('privacyContactName', e.target.value)} /></Field>
            <Field label="Correo para datos personales"><input type="email" maxLength={150} className="input" placeholder="privacidad@mihospital.com"
              value={form.privacyContactEmail || ''} onChange={(e) => update('privacyContactEmail', e.target.value.trim())} /></Field>
            <Field label="Años que se conserva el expediente clínico"><input type="number" min={5} max={30} className="input"
              value={form.clinicalRetentionYears ?? 5} onChange={(e) => update('clinicalRetentionYears', Number(e.target.value))} />
              <span className="mt-1 block text-xs text-slate-400">La NOM-004 pide mínimo 5 años desde la última atención.</span></Field>
            <Field label="Años que se conservan los pagos"><input type="number" min={5} max={30} className="input"
              value={form.fiscalRetentionYears ?? 5} onChange={(e) => update('fiscalRetentionYears', Number(e.target.value))} />
              <span className="mt-1 block text-xs text-slate-400">Obligaciones fiscales; confírmalo con tu contador.</span></Field>
            <label className="sm:col-span-2 flex items-start gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-primary-600" checked={!!form.publishPrivacyNotice}
                onChange={(e) => update('publishPrivacyNotice', e.target.checked)} />
              <span>
                <span className="block font-medium text-slate-800">Publicar una nueva versión del aviso de privacidad</span>
                <span className="block text-xs text-slate-500">Versión actual: {form.privacyNoticeVersion || 1}. Márcalo cuando cambien los datos del responsable, las
                  finalidades o los plazos: la versión anterior queda consultable y las nuevas aceptaciones se registran con la nueva versión.</span>
              </span>
            </label>

            <SectionTitle>Citas sin confirmar</SectionTitle>
            <div className="sm:col-span-2 rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-primary-600" checked={!!form.autoNoShowEnabled}
                  onChange={(e) => update('autoNoShowEnabled', e.target.checked)} />
                <span>
                  <span className="block font-medium text-slate-800">Marcar "no asistió" automáticamente</span>
                  <span className="block text-xs text-slate-500">
                    Apagado (recomendado): cuando pasa la hora de una cita y nadie registró la llegada, aparece en Cobrar → "Confirma si llegó"
                    y en el tablero, para que recepción confirme. Prendido: el sistema la marca sola como "no asistió" pasado el tiempo de espera.
                  </span>
                </span>
              </label>
              {form.autoNoShowEnabled && (
                <label className="mt-3 flex flex-wrap items-center gap-2 pl-7 text-sm text-slate-700">
                  Esperar
                  <input type="number" min={5} max={240} step={5} className="input w-24" value={form.noShowGraceMinutes ?? 30}
                    onChange={(e) => update('noShowGraceMinutes', e.target.value === '' ? '' : Number(e.target.value))} />
                  minutos después de que termina la cita
                </label>
              )}
            </div>

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

function SectionTitle({ children }) {
  return <p className="sm:col-span-2 mt-2 border-t border-slate-100 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">{children}</p>
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="block text-gray-700 mb-1 font-medium">{label}</span>
      {children}
    </label>
  )
}
