import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { CalendarClock, CheckCircle2, Download, FileUp, Contact, MessageSquareReply, ShieldCheck } from 'lucide-react'
import { Link } from '../router'
import { useNotify } from '../context/NotifyContext'
import { ARCO_STATUS, answerArcoInfo, confirmArco, downloadArcoTitularDoc, fmtDate, fmtDateTime, trackArco, uploadArcoIdentity } from '../api/arco'
import { downloadBlob } from '../utils/media'
import { Badge, Skeleton } from '../components/ui'

const DOC_LABEL = { DELIVERY: 'Reporte de tus datos personales', CONSTANCIA: 'Constancia de atención', IDENTITY: 'Identificación enviada', INFO: 'Documento que enviaste' }

/**
 * Portal de seguimiento de una solicitud ARCO (el enlace personal que llega por correo, como el
 * de Mercado Libre): confirma el correo, muestra plazos y línea de tiempo, recibe la
 * identificación o lo que el hospital pidió, y entrega el reporte y la constancia.
 */
export default function ArcoTrackingPage() {
  const { token } = useParams()
  const [params, setParams] = useSearchParams()
  const { notify } = useNotify()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)
  const [answer, setAnswer] = useState('')
  const idInput = useRef(null)
  const infoInput = useRef(null)

  const load = (promise) => promise.then((r) => setData(r.data.data)).catch((err) => setError(err.response?.data?.message || 'No pudimos abrir tu solicitud'))
  useEffect(() => {
    if (params.get('confirmar') === '1') {
      load(confirmArco(token)).then(() => setParams({}, { replace: true }))
    } else {
      load(trackArco(token))
    }
  }, [token])

  async function run(kind, fn, ok) {
    setBusy(kind)
    try {
      const r = await fn()
      setData(r.data.data)
      notify(ok, 'success')
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo completar', 'error')
    } finally {
      setBusy(null)
    }
  }

  async function download(doc) {
    setBusy(`doc-${doc.id}`)
    try {
      const r = await downloadArcoTitularDoc(token, doc.id)
      downloadBlob(r.data, doc.filename)
    } catch {
      notify('No se pudo descargar el documento', 'error')
    } finally {
      setBusy(null)
    }
  }

  if (error) {
    return (
      <div className="container-app py-16 text-center">
        <h1 className="font-display text-2xl font-semibold text-slate-900">No encontramos tu solicitud</h1>
        <p className="mt-2 text-slate-500">{error}</p>
        <Link to="/derechos-arco" className="btn-primary mt-6 inline-flex">Hacer una solicitud</Link>
      </div>
    )
  }
  if (!data) return <div className="container-app space-y-4 py-10"><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>

  const r = data.request
  const docs = data.documents.filter((d) => d.downloadable)
  const sentIdentity = data.documents.some((d) => d.kind === 'IDENTITY')

  return (
    <div>
      <section className="aurora-soft border-b border-slate-200/70">
        <div className="container-app py-8 sm:py-10">
          <p className="eyebrow mb-2 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Seguimiento de tu solicitud</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">{r.typeLabel}</h1>
            <Badge tone={ARCO_STATUS[r.status]?.tone} dot>{r.statusLabel}</Badge>
          </div>
          <p className="mt-1 font-mono text-sm text-slate-500">{r.folio}</p>
        </div>
      </section>

      <div className="container-app grid gap-6 py-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {r.status === 'PENDING_EMAIL' && (
            <div className="card p-5">
              <p className="font-semibold text-slate-900">Falta confirmar tu correo</p>
              <p className="mt-1 text-sm text-slate-600">Ábrelo desde el botón del correo que te enviamos para que la solicitud quede registrada.</p>
              <button className="btn-primary mt-3" disabled={busy === 'confirm'} onClick={() => run('confirm', () => confirmArco(token), 'Correo confirmado')}>
                Confirmar ahora
              </button>
            </div>
          )}

          {r.nextDeadline && (
            <div className="card flex items-center gap-4 p-5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600"><CalendarClock className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-slate-500">{r.status === 'INFO_REQUESTED' ? 'Tienes hasta el' : r.status === 'APPROVED' ? 'Lo haremos efectivo a más tardar el' : 'Te responderemos a más tardar el'}</p>
                <p className="font-display text-xl font-semibold text-slate-900">{fmtDate(r.nextDeadline)}</p>
                {r.extended && <p className="text-xs text-slate-500">Plazo ampliado: {r.extensionReason}</p>}
              </div>
            </div>
          )}

          {data.canAnswerInfo && (
            <div className="card p-5 ring-2 ring-blue-200">
              <p className="flex items-center gap-2 font-semibold text-slate-900"><MessageSquareReply className="h-4 w-4 text-blue-600" /> El hospital necesita algo más</p>
              <p className="mt-2 whitespace-pre-wrap rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">{r.infoRequest}</p>
              <textarea rows={3} className="input mt-3" placeholder="Escribe tu respuesta" value={answer} onChange={(e) => setAnswer(e.target.value)} />
              <input ref={infoInput} type="file" accept="image/png,image/jpeg,application/pdf" className="mt-2 block text-sm" />
              <button className="btn-primary mt-3" disabled={busy === 'info'}
                onClick={() => run('info', () => answerArcoInfo(token, answer.trim(), infoInput.current?.files?.[0]), 'Recibimos tu respuesta')}>
                {busy === 'info' ? 'Enviando...' : 'Enviar respuesta'}
              </button>
            </div>
          )}

          {data.canUploadIdentity && r.identityRequired && (
            <div className="card p-5">
              <p className="flex items-center gap-2 font-semibold text-slate-900"><Contact className="h-4 w-4 text-primary-600" /> Verifica tu identidad</p>
              <p className="mt-1 text-sm text-slate-600">
                Para proteger tus datos necesitamos tu identificación oficial vigente (INE, pasaporte o cédula). Puede ser foto (JPG o PNG) o PDF, de hasta 5 MB.
                {r.representative && ' Como representante, sube también el documento que acredita la representación (carta poder, acta de nacimiento o resolución de tutela).'}
                {' '}También puedes presentarla en recepción.
              </p>
              {sentIdentity && <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Ya recibimos un archivo; el hospital lo revisará.</p>}
              <input ref={idInput} type="file" accept="image/png,image/jpeg,application/pdf" className="hidden"
                onChange={(e) => e.target.files?.[0] && run('id', () => uploadArcoIdentity(token, e.target.files[0]), 'Recibimos tu identificación')} />
              <button className="btn-secondary mt-3" disabled={busy === 'id'} onClick={() => idInput.current?.click()}>
                <FileUp className="h-4 w-4" /> {busy === 'id' ? 'Subiendo...' : sentIdentity ? 'Subir otro archivo' : 'Subir identificación'}
              </button>
            </div>
          )}

          {(r.outcome || r.executionSummary) && (
            <div className="card p-5">
              <p className="font-semibold text-slate-900">Respuesta del hospital</p>
              {r.outcome && <p className="mt-2"><Badge tone={r.outcome === 'IMPROCEDENTE' ? 'red' : 'green'}>{r.outcomeLabel}</Badge></p>}
              {r.legalBasis && <p className="mt-2 text-sm text-slate-700"><span className="font-medium">Fundamento:</span> {r.legalBasis}</p>}
              {r.resolutionNotes && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{r.resolutionNotes}</p>}
              {r.executionSummary && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {r.executionSummary.split('\n').map((l) => <li key={l}>{l}</li>)}
                </ul>
              )}
              {r.outcome === 'IMPROCEDENTE' && (
                <p className="mt-3 text-xs text-slate-500">Si no estás de acuerdo, puedes acudir a la Secretaría Anticorrupción y Buen Gobierno.</p>
              )}
            </div>
          )}

          {docs.length > 0 && (
            <div className="card p-5">
              <p className="mb-3 font-semibold text-slate-900">Documentos</p>
              <ul className="space-y-2">
                {docs.map((d) => (
                  <li key={d.id}>
                    <button className="btn-secondary w-full justify-between" disabled={busy === `doc-${d.id}`} onClick={() => download(d)}>
                      <span>{DOC_LABEL[d.kind] || d.filename}</span><Download className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-400">Este enlace es personal: no lo compartas.</p>
            </div>
          )}
        </div>

        <aside className="h-fit lg:sticky lg:top-24">
          <div className="card p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Lo que ha pasado</p>
            <ol className="relative space-y-4 border-l border-slate-200 pl-4">
              {data.events.map((e, i) => (
                <li key={i}>
                  <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-primary-500" />
                  <p className="text-xs text-slate-400">{fmtDateTime(e.at)} · {e.actor}</p>
                  <p className="text-sm text-slate-700">{e.message}</p>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  )
}
