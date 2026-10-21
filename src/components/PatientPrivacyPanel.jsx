import { useEffect, useState } from 'react'
import { Lock, MailWarning, NotebookPen, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNotify } from '../context/NotifyContext'
import { addPatientClarification, fmtDate, fmtDateTime, getPatientClarifications, getPatientPrivacy, openPatientVault } from '../api/arco'
import Modal from './Modal'

const SCOPE = { NOTICE: 'Aviso de privacidad', SENSITIVE: 'Datos de salud', REMINDERS: 'Recordatorios', NEWS: 'Novedades y encuestas' }
const VAULT_LABELS = {
  firstName: 'Nombre', lastName: 'Apellidos', phone: 'Teléfono', email: 'Correo', birthDate: 'Nacimiento', sex: 'Sexo', curp: 'CURP',
  addressLine: 'Calle y número', neighborhood: 'Colonia', city: 'Ciudad', state: 'Estado', postalCode: 'CP',
  emergencyContactName: 'Contacto de emergencia', emergencyContactPhone: 'Teléfono de emergencia', allergies: 'Alergias', bloodType: 'Tipo de sangre',
}

/**
 * Privacidad dentro del expediente: aviso si el paciente está bloqueado (Cancelación ARCO) con
 * acceso al resguardo solo con motivo, correo duplicado por revisar, consentimientos y notas
 * aclaratorias. El personal que no es admin solo ve las notas aclaratorias.
 */
export default function PatientPrivacyPanel({ patient }) {
  const { isAdmin } = useAuth()
  const { notify } = useNotify()
  const [info, setInfo] = useState(null)
  const [notes, setNotes] = useState([])
  const [vault, setVault] = useState(null)
  const [askVault, setAskVault] = useState(false)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (isAdmin) getPatientPrivacy(patient.id).then((r) => { setInfo(r.data.data); setNotes(r.data.data.clarifications) }).catch(() => {})
    else getPatientClarifications(patient.id).then((r) => setNotes(r.data.data)).catch(() => {})
  }, [patient.id, isAdmin])

  async function open() {
    try {
      const r = await openPatientVault(patient.id, reason)
      setVault(r.data.data)
      setAskVault(false)
      setReason('')
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo abrir el resguardo', 'error')
    }
  }

  async function addNote() {
    try {
      const r = await addPatientClarification(patient.id, note)
      setNotes(r.data.data)
      setNote('')
      setAdding(false)
      notify('Nota aclaratoria agregada', 'success')
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo agregar', 'error')
    }
  }

  const status = patient.privacyStatus || info?.privacyStatus
  return (
    <div className="mb-5 space-y-4">
      {status === 'BLOCKED' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-semibold"><Lock className="h-4 w-4" /> Datos bloqueados por una solicitud de cancelación</p>
          <p className="mt-1">El expediente se conserva sin identidad hasta el <strong>{fmtDate(patient.retainUntil || info?.retainUntil)}</strong> (obligación legal) y después se elimina.
            No lo uses para nada más.</p>
          {isAdmin && !vault && <button className="btn-secondary btn-sm mt-3" onClick={() => setAskVault(true)}>Ver datos resguardados (con motivo)</button>}
          {vault && (
            <dl className="mt-3 grid gap-x-6 gap-y-1 rounded-xl bg-white p-3 text-xs text-slate-700 sm:grid-cols-2">
              {Object.entries(VAULT_LABELS).filter(([k]) => vault[k]).map(([k, l]) => <div key={k}><dt className="text-slate-400">{l}</dt><dd>{vault[k]}</dd></div>)}
            </dl>
          )}
        </div>
      )}
      {status === 'ANONYMIZED' && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="flex items-center gap-2 font-semibold"><Lock className="h-4 w-4" /> Expediente anónimo</p>
          <p className="mt-1">Venció el plazo de conservación (o no había obligación): ya no hay forma de identificar a esta persona.</p>
        </div>
      )}
      {(patient.emailMoved || info?.emailMoved) && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="flex items-center gap-2 font-semibold"><MailWarning className="h-4 w-4" /> Correo repetido por revisar</p>
          <p className="mt-1">Tenía el correo <strong>{patient.emailMoved || info?.emailMoved}</strong>, que ya pertenece a otro paciente (un correo = un paciente por hospital).
            Si es la misma persona, fusiónalos; si no, captura su propio correo en "Editar datos".</p>
        </div>
      )}

      {(isAdmin || notes.length > 0) && (
        <div className="card p-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-semibold text-slate-900"><NotebookPen className="h-4 w-4 text-primary-600" /> Notas aclaratorias del expediente</p>
            {isAdmin && status === 'ACTIVE' && !adding && <button className="btn-ghost btn-sm" onClick={() => setAdding(true)}>Agregar</button>}
          </div>
          {notes.length === 0 ? <p className="text-sm text-slate-400">Sin notas. Se usan para corregir algo clínico sin alterar el expediente (NOM-004).</p> : (
            <ul className="space-y-2 text-sm">
              {notes.map((n) => <li key={n.id} className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-slate-800">{n.note}</p><p className="text-xs text-slate-400">{fmtDateTime(n.createdAt)} · {n.createdBy}</p></li>)}
            </ul>
          )}
          {adding && (
            <div className="mt-3 space-y-2">
              <textarea rows={2} className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. El paciente aclara que la alergia es a la amoxicilina, no a la penicilina." />
              <div className="flex gap-2"><button className="btn-primary btn-sm" onClick={addNote}>Guardar nota</button><button className="btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancelar</button></div>
            </div>
          )}
        </div>
      )}

      {isAdmin && info && info.consents.length > 0 && (
        <details className="card p-5">
          <summary className="flex cursor-pointer items-center gap-2 font-semibold text-slate-900"><ShieldCheck className="h-4 w-4 text-primary-600" /> Consentimientos y preferencias</summary>
          <p className="mt-2 text-sm text-slate-600">Recordatorios: <strong>{info.notifyReminders ? 'sí' : 'no'}</strong> · Novedades: <strong>{info.notifyNews ? 'sí' : 'no'}</strong></p>
          <ul className="mt-2 space-y-1 text-xs text-slate-500">
            {info.consents.map((c, i) => <li key={i}>{fmtDateTime(c.at)} · {SCOPE[c.scope] || c.scope}: {c.granted ? 'otorgado' : 'retirado'} ({c.channel}, aviso v{c.noticeVersion})</li>)}
          </ul>
        </details>
      )}

      {askVault && (
        <Modal title="Abrir datos resguardados" description="Solo con un motivo legítimo. Queda registrado en la bitácora." onClose={() => setAskVault(false)} maxWidth="max-w-md">
          <textarea rows={3} className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej. Requerimiento de la autoridad sanitaria, oficio 123/2026" />
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setAskVault(false)}>Cancelar</button>
            <button className="btn-primary" onClick={open} disabled={reason.trim().length < 10}>Abrir</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
