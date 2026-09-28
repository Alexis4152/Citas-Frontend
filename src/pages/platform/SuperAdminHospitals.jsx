import { useEffect, useState } from 'react'
import { addHospitalAdmin, createHospital, listHospitals, updateHospital } from '../../api/superadmin'
import { useNotify } from '../../context/NotifyContext'
import { formatDate } from '../../utils/format'
import Modal from '../../components/Modal'

/** 'Clínica San José' -> 'clinica-san-jose' (identificador del enlace /c/<slug>). */
function slugify(text) {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

const EMPTY_CREATE = { name: '', slug: '', adminFirstName: '', adminLastName: '', adminEmail: '' }
const EMPTY_ADMIN = { firstName: '', lastName: '', email: '' }

/**
 * Panel del SUPER_ADMIN (Nexora): hospitales/consultorios clientes. Cada uno tiene su enlace
 * público /c/<slug>, sus administradores y, opcionalmente, su cuenta de OpenPay (sin ella sus
 * pacientes solo pagan en recepción).
 */
export default function SuperAdminHospitals() {
  const { notify } = useNotify()
  const [hospitals, setHospitals] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(null)
  const [editing, setEditing] = useState(null)
  const [addingAdminTo, setAddingAdminTo] = useState(null)
  const [credentials, setCredentials] = useState(null)
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    listHospitals()
      .then((r) => setHospitals(r.data.data))
      .catch((err) => notify(err.response?.data?.message || 'No se pudieron cargar los hospitales', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text)
      notify('Copiado', 'success')
    } catch {
      notify('No se pudo copiar', 'error')
    }
  }

  async function submitCreate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await createHospital(creating)
      const h = res.data.data
      setCreating(null)
      setCredentials({ title: `Hospital "${h.name}" creado`, url: h.publicUrl, email: creating.adminEmail, password: h.temporaryPassword })
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo crear el hospital', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function submitEdit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateHospital(editing.id, editing.form)
      notify('Hospital actualizado', 'success')
      setEditing(null)
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function submitAdmin(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await addHospitalAdmin(addingAdminTo.hospital.id, addingAdminTo.form)
      const h = res.data.data
      setCredentials({ title: `Administrador creado en "${h.name}"`, url: h.publicUrl, email: addingAdminTo.form.email, password: h.temporaryPassword })
      setAddingAdminTo(null)
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo crear el administrador', 'error')
    } finally {
      setSaving(false)
    }
  }

  function openEdit(h) {
    setEditing({
      id: h.id,
      name: h.name,
      privateKeyConfigured: h.openpayPrivateKeyConfigured,
      form: {
        name: h.name,
        slug: h.slug,
        isActive: h.isActive,
        openpayMerchantId: h.openpayMerchantId || '',
        openpayPublicKey: h.openpayPublicKey || '',
        openpayPrivateKey: '',
        openpayProduction: Boolean(h.openpayProduction),
        clearOpenpay: false,
      },
    })
  }

  const updateEdit = (field, value) => setEditing((prev) => ({ ...prev, form: { ...prev.form, [field]: value } }))

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hospitales y consultorios</h1>
          <p className="text-sm text-gray-500 mt-1">Cada uno ve solo sus propios doctores, pacientes, citas y cobros.</p>
        </div>
        <button className="btn-primary text-sm" onClick={() => setCreating(EMPTY_CREATE)}>+ Nuevo hospital</button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Cargando...</p>
      ) : hospitals.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">Todavía no hay hospitales</div>
      ) : (
        <div className="space-y-4">
          {hospitals.map((h) => (
            <div key={h.id} className="card p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-gray-900 text-lg">{h.name}</h2>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      h.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                    }`}>
                      {h.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      h.openpayConfigured ? 'bg-primary-50 text-primary-700 border-primary-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {h.openpayConfigured ? `OpenPay ${h.openpayProduction ? 'producción' : 'sandbox'}` : 'Sin pagos en línea'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <a href={h.publicUrl} target="_blank" rel="noreferrer" className="text-primary-700 hover:underline break-all">{h.publicUrl}</a>
                    <button type="button" className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 rounded px-2 py-0.5" onClick={() => copy(h.publicUrl)}>
                      Copiar
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {h.doctors} doctores · {h.patients} pacientes · {h.appointments} citas · alta {formatDate(h.createdAt)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Administradores: {h.admins.length === 0 ? 'ninguno' : h.admins.map((a) => `${a.firstName} ${a.lastName} (${a.email})`).join(', ')}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="btn-secondary text-sm" onClick={() => setAddingAdminTo({ hospital: h, form: EMPTY_ADMIN })}>+ Administrador</button>
                  <button className="btn-secondary text-sm" onClick={() => openEdit(h)}>Editar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <Modal title="Nuevo hospital o consultorio" onClose={() => setCreating(null)}>
          <form onSubmit={submitCreate} className="space-y-4">
            <Field label="Nombre">
              <input required className="input" value={creating.name}
                onChange={(e) => setCreating((p) => ({ ...p, name: e.target.value, slug: p.slugTouched ? p.slug : slugify(e.target.value) }))} />
            </Field>
            <Field label="Enlace" hint={`${window.location.origin}/c/${creating.slug || '...'}`}>
              <input required className="input font-mono" value={creating.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*"
                onChange={(e) => setCreating((p) => ({ ...p, slug: slugify(e.target.value), slugTouched: true }))} />
            </Field>
            <p className="text-sm font-semibold text-gray-700 pt-2 border-t border-gray-100">Primer administrador</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombre"><input required className="input" value={creating.adminFirstName} onChange={(e) => setCreating((p) => ({ ...p, adminFirstName: e.target.value }))} /></Field>
              <Field label="Apellido"><input required className="input" value={creating.adminLastName} onChange={(e) => setCreating((p) => ({ ...p, adminLastName: e.target.value }))} /></Field>
            </div>
            <Field label="Correo" hint="Con este correo y una contraseña temporal entrará desde el enlace del hospital.">
              <input required type="email" className="input" value={creating.adminEmail} onChange={(e) => setCreating((p) => ({ ...p, adminEmail: e.target.value }))} />
            </Field>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" className="btn-secondary" onClick={() => setCreating(null)}>Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creando...' : 'Crear hospital'}</button>
            </div>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title={`Editar ${editing.name}`} onClose={() => setEditing(null)} maxWidth="max-w-xl">
          <form onSubmit={submitEdit} className="space-y-4">
            <Field label="Nombre">
              <input required className="input" value={editing.form.name} onChange={(e) => updateEdit('name', e.target.value)} />
            </Field>
            <Field label="Enlace" hint="Si lo cambias, el enlace anterior deja de funcionar para sus pacientes.">
              <input required className="input font-mono" value={editing.form.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*"
                onChange={(e) => updateEdit('slug', slugify(e.target.value))} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-primary-600" checked={editing.form.isActive} onChange={(e) => updateEdit('isActive', e.target.checked)} />
              Activo <span className="text-gray-400">(inactivo: su enlace y todas sus sesiones dejan de funcionar)</span>
            </label>

            <p className="text-sm font-semibold text-gray-700 pt-2 border-t border-gray-100">Pagos en línea (su cuenta de OpenPay)</p>
            <Field label="Merchant ID">
              <input className="input font-mono" value={editing.form.openpayMerchantId} disabled={editing.form.clearOpenpay}
                onChange={(e) => updateEdit('openpayMerchantId', e.target.value)} />
            </Field>
            <Field label="Llave pública (pk_...)">
              <input className="input font-mono" value={editing.form.openpayPublicKey} disabled={editing.form.clearOpenpay}
                onChange={(e) => updateEdit('openpayPublicKey', e.target.value)} />
            </Field>
            <Field label="Llave privada (sk_...)" hint={editing.privateKeyConfigured ? 'Ya hay una guardada: déjalo vacío para conservarla.' : 'Nunca se vuelve a mostrar después de guardarla.'}>
              <input type="password" autoComplete="new-password" className="input font-mono" value={editing.form.openpayPrivateKey}
                disabled={editing.form.clearOpenpay} placeholder={editing.privateKeyConfigured ? '••••••••' : ''}
                onChange={(e) => updateEdit('openpayPrivateKey', e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-primary-600" checked={editing.form.openpayProduction} disabled={editing.form.clearOpenpay}
                onChange={(e) => updateEdit('openpayProduction', e.target.checked)} />
              Producción <span className="text-gray-400">(sin marcar: sandbox, cobros de prueba)</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-red-700">
              <input type="checkbox" className="accent-red-600" checked={editing.form.clearOpenpay} onChange={(e) => updateEdit('clearOpenpay', e.target.checked)} />
              Quitar las llaves de OpenPay (sus pacientes solo podrán pagar en recepción)
            </label>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}

      {addingAdminTo && (
        <Modal title={`Nuevo administrador de ${addingAdminTo.hospital.name}`} onClose={() => setAddingAdminTo(null)}>
          <form onSubmit={submitAdmin} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombre"><input required className="input" value={addingAdminTo.form.firstName} onChange={(e) => setAddingAdminTo((p) => ({ ...p, form: { ...p.form, firstName: e.target.value } }))} /></Field>
              <Field label="Apellido"><input required className="input" value={addingAdminTo.form.lastName} onChange={(e) => setAddingAdminTo((p) => ({ ...p, form: { ...p.form, lastName: e.target.value } }))} /></Field>
            </div>
            <Field label="Correo">
              <input required type="email" className="input" value={addingAdminTo.form.email} onChange={(e) => setAddingAdminTo((p) => ({ ...p, form: { ...p.form, email: e.target.value } }))} />
            </Field>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" className="btn-secondary" onClick={() => setAddingAdminTo(null)}>Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creando...' : 'Crear administrador'}</button>
            </div>
          </form>
        </Modal>
      )}

      {credentials && (
        <Modal title={credentials.title} onClose={() => setCredentials(null)}>
          <div className="space-y-4 text-sm">
            <p className="text-gray-600">
              Compártele estos datos al administrador. La contraseña es temporal: se le pedirá cambiarla al
              entrar, y <strong>no se vuelve a mostrar</strong>.
            </p>
            <CopyRow label="Enlace del hospital" value={credentials.url} onCopy={copy} />
            <CopyRow label="Correo" value={credentials.email} onCopy={copy} />
            <CopyRow label="Contraseña temporal" value={credentials.password} onCopy={copy} />
            <div className="flex justify-end pt-2">
              <button type="button" className="btn-primary" onClick={() => setCredentials(null)}>Listo</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="block text-sm">
      <span className="block text-gray-700 mb-1 font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-gray-500 mt-1 break-all">{hint}</span>}
    </label>
  )
}

function CopyRow({ label, value, onCopy }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 break-all">{value}</code>
        <button type="button" className="btn-secondary text-sm shrink-0" onClick={() => onCopy(value)}>Copiar</button>
      </div>
    </div>
  )
}
