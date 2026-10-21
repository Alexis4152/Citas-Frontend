import { useEffect, useState } from 'react'
import { History, ShieldCheck } from 'lucide-react'
import { Link } from '../router'
import { useHospitalConfig } from '../context/HospitalConfigContext'
import { fmtDate, getNoticeVersion, getNoticeVersions } from '../api/arco'

/**
 * Aviso de privacidad integral del hospital (LFPDPPP), generado con los datos que el hospital
 * captura en su configuración. Lleva versión y fecha; las versiones anteriores se pueden
 * consultar. Es una base sólida, pero cada hospital debe revisarla con su asesor legal.
 */
export default function PrivacyNotice() {
  const { config } = useHospitalConfig()
  const [versions, setVersions] = useState([])
  const [old, setOld] = useState(null)

  useEffect(() => { getNoticeVersions().then((r) => setVersions(r.data.data)).catch(() => {}) }, [])

  const c = old || config || {}
  const name = c.name || 'el hospital'
  const legal = c.legalName || name
  const address = [c.addressLine, c.neighborhood, c.postalCode && `CP ${c.postalCode}`, c.city, c.state].filter(Boolean).join(', ')
  const privacyEmail = c.privacyContactEmail || c.contactEmail
  const version = old ? old.version : config?.privacyNoticeVersion || 1
  const updated = old ? old.publishedAt : config?.privacyNoticeUpdatedAt

  return (
    <div className="container-app max-w-3xl py-10">
      <p className="eyebrow mb-2 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Datos personales</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">Aviso de privacidad integral</h1>
      <p className="mt-1 text-sm text-slate-500">{name} · Versión {version}{updated ? ` · actualizada el ${fmtDate(updated)}` : ''}</p>
      {old && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Estás viendo una versión anterior. <button className="font-semibold underline" onClick={() => setOld(null)}>Ver la vigente</button>
        </div>
      )}

      <div className="mt-8 space-y-7 text-[15px] leading-relaxed text-slate-700">
        <S title="1. Responsable de tus datos">
          <strong>{legal}</strong>{c.rfc ? ` (RFC ${c.rfc})` : ''}{address ? `, con domicilio en ${address}` : ''}, es responsable del tratamiento de los datos
          personales que nos proporcionas. Para cualquier asunto de datos personales contacta a{' '}
          {c.privacyContactName || 'nuestro Departamento de Datos Personales'}{privacyEmail ? <> en <strong>{privacyEmail}</strong></> : ''}{c.contactPhone ? `, teléfono ${c.contactPhone}` : ''}.
        </S>

        <S title="2. Qué datos recabamos">
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Identificación y contacto:</strong> nombre, teléfono, correo, fecha de nacimiento, sexo, CURP, domicilio y contacto de emergencia.</li>
            <li><strong>Datos de salud (datos sensibles):</strong> alergias, tipo de sangre, motivo de consulta, diagnósticos, recetas y notas de tus atenciones.</li>
            <li><strong>Pagos:</strong> monto, fecha, forma de pago y referencia. Los datos de tarjeta los procesa directamente la pasarela de pagos; nosotros no los guardamos.</li>
            <li><strong>Cuenta y uso:</strong> correo y contraseña cifrada, y la dirección IP con que aceptaste este aviso o hiciste una solicitud (como constancia).</li>
          </ul>
        </S>

        <S title="3. Para qué los usamos">
          <p className="font-medium text-slate-800">Finalidades principales (necesarias para atenderte):</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Agendar, confirmar, reprogramar y cancelar tus citas, y enviarte sus comprobantes.</li>
            <li>Que tu doctor te atienda con seguridad e integrar tu expediente clínico.</li>
            <li>Cobrar la consulta y emitir comprobantes.</li>
            <li>Recordarte tus citas (puedes desactivarlo en tu centro de privacidad).</li>
            <li>Cumplir obligaciones legales (expediente clínico, obligaciones fiscales) y atender requerimientos de autoridades.</li>
          </ul>
          <p className="mt-3 font-medium text-slate-800">Finalidades secundarias (solo si las aceptas):</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Enviarte novedades del hospital y encuestas de satisfacción.</li>
          </ul>
          <p className="mt-2">Puedes negarte a las secundarias en cualquier momento desde tu <Link to="/mi-privacidad" className="font-medium text-primary-700 hover:underline">centro de privacidad</Link> o con una
            solicitud de oposición; eso no afecta tu atención. No vendemos tus datos ni los usamos para publicidad de terceros.</p>
        </S>

        <S title="4. Datos de salud: consentimiento expreso">
          Tus datos de salud son sensibles. Los tratamos solo con tu consentimiento expreso, que nos das al marcar la casilla al agendar, al crear tu cuenta
          o en recepción. Guardamos la constancia con la fecha, el medio y la versión de este aviso que aceptaste.
        </S>

        <S title="5. Con quién los compartimos">
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Personal del hospital</strong> que te atiende (doctor, recepción y administración), cada quien solo con lo que necesita según su rol.</li>
            <li><strong>Encargados que operan el servicio por nuestra cuenta</strong>, con obligación de confidencialidad: la plataforma de citas (Nexora Systems),
              el proveedor de envío de correo y la pasarela de pagos (OpenPay).</li>
            <li><strong>Autoridades</strong>, solo cuando la ley lo exige.</li>
          </ul>
          No hacemos transferencias que requieran tu consentimiento.
        </S>

        <S title="6. Tus derechos ARCO, revocación y limitación">
          <p>Puedes <strong>Acceder</strong> a tus datos, <strong>Rectificarlos</strong>, <strong>Cancelarlos</strong> u <strong>Oponerte</strong> a su uso, así como
            <strong> revocar tu consentimiento</strong> o <strong>limitar</strong> su uso o divulgación.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Cómo:</strong> con el <Link to="/derechos-arco" className="font-medium text-primary-700 hover:underline">formulario de solicitud</Link> (con o sin cuenta), desde
              tu <Link to="/mi-privacidad" className="font-medium text-primary-700 hover:underline">centro de privacidad</Link>, en recepción
              {privacyEmail ? <> o escribiendo a <strong>{privacyEmail}</strong></> : ''}. Para eliminar tu cuenta: <Link to="/eliminar-cuenta" className="font-medium text-primary-700 hover:underline">eliminar cuenta</Link>.</li>
            <li><strong>Qué debe incluir:</strong> tu nombre y medio para responderte, una identificación oficial (o la de tu representante y el documento que lo acredite),
              el derecho que quieres ejercer y lo que nos ayude a localizar tus datos.</li>
            <li><strong>Plazos:</strong> te respondemos en máximo <strong>20 días hábiles</strong> (ampliables una vez por causa justificada) y, si procede, lo hacemos
              efectivo en los <strong>15 días hábiles</strong> siguientes. Si falta información te la pedimos y tienes 10 días hábiles para enviarla.</li>
            <li><strong>Costo:</strong> es gratuito. Te entregamos la información en PDF por medio electrónico.</li>
          </ul>
        </S>

        <S title="7. Cuánto tiempo los guardamos">
          Guardamos tus datos solo el tiempo necesario. El expediente clínico se conserva al menos <strong>{c.clinicalRetentionYears || 5} años</strong> desde tu última
          atención (NOM-004-SSA3-2012) y los datos de pagos <strong>{c.fiscalRetentionYears || 5} años</strong> por obligaciones fiscales, aunque pidas su cancelación:
          durante ese tiempo quedan <strong>bloqueados</strong> (separados de tu nombre, nadie los usa) y al terminar se eliminan o anonimizan. Lo demás —tu cuenta,
          tus datos de contacto y preferencias— se elimina en cuanto procede tu solicitud.
        </S>

        <S title="8. Cómo los protegemos">
          Usamos conexión cifrada (HTTPS), contraseñas cifradas, cifrado de documentos y credenciales, permisos por rol, separación de la información de cada hospital
          y una bitácora de quién consulta los expedientes. Si ocurriera una vulneración que te afecte, te lo informaremos.
        </S>

        <S title="9. Cookies y almacenamiento en tu navegador">
          Solo usamos lo indispensable para que el sitio funcione (mantener tu sesión y tus preferencias de pantalla). No usamos cookies de publicidad ni de rastreo de terceros.
        </S>

        <S title="10. Menores de edad y personas representadas">
          Los datos de menores o de personas que no pueden decidir por sí mismas los proporciona y administra su padre, madre, tutor o representante legal,
          quien también puede ejercer sus derechos acreditando la representación.
        </S>

        <S title="11. Cambios a este aviso">
          Cuando cambie, publicaremos la nueva versión en esta página con su número y fecha, y te lo informaremos por correo si tienes cuenta. Puedes consultar las versiones anteriores abajo.
        </S>

        <S title="12. Autoridad">
          Si consideras que tu derecho a la protección de datos fue vulnerado, puedes acudir a la Secretaría Anticorrupción y Buen Gobierno, autoridad en materia de
          protección de datos personales en posesión de los particulares.
        </S>
      </div>

      {versions.length > 1 && (
        <div className="card mt-10 p-5">
          <p className="mb-2 flex items-center gap-2 font-semibold text-slate-900"><History className="h-4 w-4" /> Versiones</p>
          <ul className="space-y-1 text-sm">
            {versions.map((v) => (
              <li key={v.version}>
                {v.current
                  ? <span>Versión {v.version} · {fmtDate(v.publishedAt)} <span className="text-emerald-700">(vigente)</span></span>
                  : <button className="text-primary-700 hover:underline" onClick={() => getNoticeVersion(v.version).then((r) => { setOld(r.data.data); window.scrollTo(0, 0) })}>
                    Versión {v.version} · {fmtDate(v.publishedAt)}</button>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function S({ title, children }) {
  return (
    <section>
      <h2 className="mb-2 font-display text-lg font-semibold text-slate-900">{title}</h2>
      <div>{children}</div>
    </section>
  )
}
