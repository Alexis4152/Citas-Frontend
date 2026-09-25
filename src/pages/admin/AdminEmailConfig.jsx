import { useEffect, useState } from 'react'
import { adminGetEmailConfig, adminUpdateEmailConfig } from '../../api/adminEmailConfig'
import { useNotify } from '../../context/NotifyContext'

const EMPTY_FORM = { enabled: false, smtpHost: 'smtp.gmail.com', smtpPort: 587, smtpUsername: '', smtpPassword: '', fromAddress: '' }

/** Configuración SMTP para notificaciones de citas. La contraseña nunca vuelve del
 * Backend (EmailConfigResponse solo trae `passwordConfigured: boolean`) — dejar el campo
 * en blanco al guardar conserva la que ya estaba guardada (mismo convenio write-only que
 * el proyecto de referencia). */
export default function AdminEmailConfig() {
  const { notify } = useNotify()
  const [form, setForm] = useState(EMPTY_FORM)
  const [passwordConfigured, setPasswordConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    adminGetEmailConfig().then((r) => {
      const data = r.data.data
      setForm({ ...data, smtpPassword: '' })
      setPasswordConfigured(data.passwordConfigured)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await adminUpdateEmailConfig(form)
      notify('Configuración de correo actualizada', 'success')
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Configuración de correo</h1>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : (
        <form onSubmit={handleSubmit} className="card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">SMTP (notificaciones de citas)</h2>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.enabled} onChange={(e) => update('enabled', e.target.checked)} />
              Habilitado
            </label>
          </div>
          <p className="text-xs text-gray-500">
            Con Gmail necesitas una contraseña de aplicación: <span className="font-mono">myaccount.google.com/apppasswords</span>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Host SMTP">
              <input required className="input" value={form.smtpHost} onChange={(e) => update('smtpHost', e.target.value)} />
            </Field>
            <Field label="Puerto">
              <input required type="number" className="input" value={form.smtpPort} onChange={(e) => update('smtpPort', Number(e.target.value))} />
            </Field>
            <Field label="Usuario / correo">
              <input className="input" value={form.smtpUsername || ''} onChange={(e) => update('smtpUsername', e.target.value)} />
            </Field>
            <Field label={passwordConfigured ? 'Contraseña (ya configurada)' : 'Contraseña'}>
              <input
                type="password"
                className="input"
                placeholder={passwordConfigured ? 'Dejar en blanco para no cambiarla' : ''}
                value={form.smtpPassword}
                onChange={(e) => update('smtpPassword', e.target.value)}
              />
            </Field>
            <Field label="Correo remitente (opcional)" className="sm:col-span-2">
              <input className="input" value={form.fromAddress || ''} onChange={(e) => update('fromAddress', e.target.value)} placeholder="Si se deja vacío, se usa el usuario SMTP" />
            </Field>
          </div>
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Guardar correo'}</button>
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
