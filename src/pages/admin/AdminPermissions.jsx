import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CalendarCheck2, CalendarRange, ChevronRight, KeyRound, Pill, RotateCcw, Search, Users, Wallet } from 'lucide-react'
import api from '../../api/axios'
import { useNotify } from '../../context/NotifyContext'
import Drawer from '../../components/Drawer'
import { Avatar, Badge, EmptyState, PageHeader, Skeleton } from '../../components/ui'

const MODULE_ICON = { Citas: CalendarCheck2, Agenda: CalendarRange, Pacientes: Users, Recetas: Pill, Caja: Wallet, Reportes: BarChart3 }
const ROLES = [['RECEPTIONIST', 'Recepción'], ['DOCTOR', 'Doctor']]

function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${checked ? 'bg-primary-600' : 'bg-slate-300'}`}>
      <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  )
}

/**
 * Roles y permisos (patrón de nexora-hotel): qué puede hacer Recepción y qué puede hacer un
 * Doctor en ESTE hospital, y excepciones para una persona en particular. El administrador
 * siempre puede todo. El backend aplica estos permisos en cada petición.
 */
export default function AdminPermissions() {
  const { notify, confirmDialog } = useNotify()
  const [tab, setTab] = useState('roles')
  const [catalog, setCatalog] = useState(null)
  const [roles, setRoles] = useState({})
  const [draft, setDraft] = useState({})
  const [saving, setSaving] = useState(null)

  const load = () => api.get('/admin/permissions').then((r) => {
    setCatalog(r.data.data.catalog)
    const sets = Object.fromEntries(Object.entries(r.data.data.roles).map(([k, v]) => [k, new Set(v)]))
    setRoles(sets)
    setDraft(Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, new Set(v)])))
  })
  useEffect(() => { load().catch(() => notify('No se pudieron cargar los permisos', 'error')) }, [])

  const modules = useMemo(() => {
    const map = new Map()
    for (const p of catalog || []) {
      if (!map.has(p.module)) map.set(p.module, [])
      map.get(p.module).push(p)
    }
    return [...map.entries()]
  }, [catalog])

  const dirty = (role) => {
    const a = roles[role], b = draft[role]
    if (!a || !b || a.size !== b.size) return true
    return [...a].some((x) => !b.has(x))
  }

  function toggle(role, code, on) {
    setDraft((d) => {
      const next = new Set(d[role])
      if (on) next.add(code)
      else next.delete(code)
      return { ...d, [role]: next }
    })
  }

  async function save(role) {
    setSaving(role)
    try {
      await api.put(`/admin/permissions/roles/${role}`, { permissions: [...draft[role]] })
      notify('Permisos guardados. Aplican desde la siguiente acción de cada persona.', 'success')
      await load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudieron guardar', 'error')
    } finally {
      setSaving(null)
    }
  }

  async function reset(role, label) {
    if (!(await confirmDialog(`¿Regresar ${label} a sus permisos de fábrica?`, { confirmText: 'Restablecer' }))) return
    await api.post(`/admin/permissions/roles/${role}/reset`)
    notify('Permisos de fábrica restablecidos', 'success')
    load()
  }

  return (
    <div>
      <PageHeader icon={KeyRound} eyebrow="Seguridad" title="Roles y permisos"
        description="Decide qué puede hacer Recepción y qué puede hacer cada Doctor. El administrador siempre puede todo." />

      <div className="mb-5 inline-flex rounded-2xl bg-slate-100 p-1">
        {[['roles', 'Por rol'], ['people', 'Por persona']].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{l}</button>
        ))}
      </div>

      {tab === 'roles' && (!catalog ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
      ) : (
        <>
          <div className="space-y-4">
            {modules.map(([module, perms]) => {
              const Icon = MODULE_ICON[module] || KeyRound
              return (
                <div key={module} className="card overflow-hidden">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-50 text-primary-600"><Icon className="h-4 w-4" /></div>
                    <p className="flex-1 font-semibold text-slate-900">{module}</p>
                    {ROLES.map(([, label]) => <span key={label} className="hidden w-24 text-center text-xs font-semibold uppercase tracking-wide text-slate-400 sm:block">{label}</span>)}
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {perms.map((p) => (
                      <li key={p.code} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center">
                        <p className="flex-1 text-sm text-slate-700">{p.label}</p>
                        <div className="flex gap-6 sm:gap-0">
                          {ROLES.map(([role, label]) => {
                            const on = draft[role]?.has(p.code)
                            const factory = role === 'RECEPTIONIST' ? p.defaultReceptionist : p.defaultDoctor
                            return (
                              <div key={role} className="flex items-center gap-2 sm:w-24 sm:justify-center">
                                <span className="text-xs text-slate-500 sm:hidden">{label}</span>
                                <Toggle checked={!!on} onChange={(v) => toggle(role, p.code, v)} label={`${label}: ${p.label}`} />
                                {on !== factory && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Distinto a los permisos de fábrica" />}
                              </div>
                            )
                          })}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
          <div className="sticky bottom-4 mt-5 flex flex-wrap items-center justify-end gap-2 rounded-2xl bg-white/90 p-3 shadow-lift ring-1 ring-slate-200 backdrop-blur">
            <p className="mr-auto flex items-center gap-1.5 px-2 text-xs text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Distinto a los de fábrica</p>
            {ROLES.map(([role, label]) => (
              <span key={role} className="flex gap-2">
                <button className="btn-ghost btn-sm" onClick={() => reset(role, label)}><RotateCcw className="h-3.5 w-3.5" /> {label}</button>
                <button className="btn-primary btn-sm" disabled={!dirty(role) || saving === role} onClick={() => save(role)}>
                  {saving === role ? 'Guardando...' : `Guardar ${label}`}
                </button>
              </span>
            ))}
          </div>
        </>
      ))}

      {tab === 'people' && <PeopleTab catalog={catalog || []} />}
    </div>
  )
}

function PeopleTab({ catalog }) {
  const [staff, setStaff] = useState(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(null)
  const load = () => api.get('/admin/permissions/staff').then((r) => setStaff(r.data.data)).catch(() => setStaff([]))
  useEffect(() => { load() }, [])
  const q = query.trim().toLowerCase()
  const rows = (staff || []).filter((s) => !q || `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(q))

  return (
    <>
      <div className="card mb-4 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-10" placeholder="Buscar por nombre o correo" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>
      <div className="card overflow-hidden">
        {!staff ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Users} title="Sin personal" description="Aquí aparecen recepción y doctores activos." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((s) => (
              <li key={s.id}>
                <button onClick={() => setOpen(s)} className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50">
                  <Avatar first={s.firstName} last={s.lastName} size="h-9 w-9 text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{s.firstName} {s.lastName}</p>
                    <p className="truncate text-xs text-slate-500">{s.email}</p>
                  </div>
                  <Badge tone={s.role === 'DOCTOR' ? 'blue' : 'purple'}>{s.role === 'DOCTOR' ? 'Doctor' : 'Recepción'}</Badge>
                  {s.exceptions > 0 && <Badge tone="amber">{s.exceptions} excepción{s.exceptions === 1 ? '' : 'es'}</Badge>}
                  <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:text-primary-600" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {open && <PersonDrawer person={open} catalog={catalog} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); load() }} />}
    </>
  )
}

function PersonDrawer({ person, catalog, onClose, onSaved }) {
  const { notify } = useNotify()
  const [data, setData] = useState(null)
  const [overrides, setOverrides] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get(`/admin/permissions/users/${person.id}`).then((r) => {
      setData(r.data.data)
      setOverrides(r.data.data.overrides || {})
    })
  }, [person.id])

  const roleSet = new Set(data?.rolePermissions || [])
  const effective = (code) => (code in overrides ? overrides[code] : roleSet.has(code))

  async function save() {
    setSaving(true)
    try {
      await api.put(`/admin/permissions/users/${person.id}`, { overrides })
      notify('Permisos de la persona guardados', 'success')
      onSaved()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudieron guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer open onClose={onClose} title={`${person.firstName} ${person.lastName}`}
      subtitle={`${person.role === 'DOCTOR' ? 'Doctor' : 'Recepción'} · ${person.email}`}
      footer={<div className="flex justify-end gap-2"><button className="btn-secondary" onClick={onClose}>Cerrar</button>
        <button className="btn-primary" disabled={saving || !data} onClick={save}>{saving ? 'Guardando...' : 'Guardar permisos'}</button></div>}>
      <p className="mb-4 text-sm text-slate-500">Por defecto tiene los permisos de su rol. Aquí puedes darle o quitarle algo solo a esta persona.</p>
      {!data ? <Skeleton className="h-64" /> : (
        <ul className="divide-y divide-slate-100">
          {catalog.map((p) => {
            const mode = p.code in overrides ? (overrides[p.code] ? 'grant' : 'deny') : 'role'
            const set = (m) => setOverrides((o) => {
              const next = { ...o }
              if (m === 'role') delete next[p.code]
              else next[p.code] = m === 'grant'
              return next
            })
            return (
              <li key={p.code} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{p.label}</p>
                    <p className="text-xs text-slate-400">{p.module} · su rol: {roleSet.has(p.code) ? 'sí' : 'no'}</p>
                  </div>
                  <Badge tone={effective(p.code) ? 'green' : 'slate'}>{effective(p.code) ? 'Puede' : 'No puede'}</Badge>
                </div>
                <div className="mt-2 inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
                  {[['role', 'Como su rol'], ['grant', 'Dar'], ['deny', 'Quitar']].map(([m, l]) => (
                    <button key={m} onClick={() => set(m)}
                      className={`rounded-lg px-3 py-1.5 transition ${mode === m ? (m === 'deny' ? 'bg-rose-600 text-white' : m === 'grant' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-500'}`}>{l}</button>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Drawer>
  )
}
