import { FileText } from 'lucide-react'
import { Link } from '../router'
import { useHospitalConfig } from '../context/HospitalConfigContext'

// Al cambiar el texto, sube la versión y la fecha para que se vea cuál es la vigente.
const TERMS_VERSION = 1
const TERMS_DATE = '20 de octubre de 2026'

/**
 * Términos y condiciones de uso del sitio de citas del hospital, armados con los datos de su
 * configuración (razón social, RFC, domicilio). Reflejan las reglas reales del sistema
 * (cancelación, reprogramación y reembolsos); cada hospital debe revisarlos con su asesor legal.
 */
export default function TermsPage() {
  const { config } = useHospitalConfig()
  const c = config || {}
  const name = c.name || 'el hospital'
  const legal = c.legalName || name
  const address = [c.addressLine, c.neighborhood, c.postalCode && `CP ${c.postalCode}`, c.city, c.state].filter(Boolean).join(', ')
  const city = [c.city, c.state].filter(Boolean).join(', ')

  return (
    <div className="container-app max-w-3xl py-10">
      <p className="eyebrow mb-2 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Legal</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">Términos y condiciones</h1>
      <p className="mt-1 text-sm text-slate-500">{name} · Versión vigente {TERMS_VERSION} · {TERMS_DATE}</p>

      <div className="mt-8 space-y-7 text-[15px] leading-relaxed text-slate-700">
        <S title="1. Quiénes somos">
          Este sitio lo opera <strong>{legal}</strong>{c.rfc ? ` (RFC ${c.rfc})` : ''}{address ? `, con domicilio en ${address}` : ''} ("el hospital").
          Al usarlo para consultar doctores, agendar, pagar o administrar tus citas aceptas estos términos. Si no estás de acuerdo, no uses el sitio.
        </S>

        <S title="2. Para qué sirve el sitio">
          Sirve para agendar, reprogramar y cancelar citas médicas, pagarlas cuando el hospital lo permita y consultar tu información. No sustituye una
          consulta médica ni sirve para urgencias: <strong>si tienes una emergencia llama al 911</strong> o acude al servicio de urgencias más cercano.
        </S>

        <S title="3. Quién puede usarlo">
          Debes ser mayor de edad y tener capacidad legal. Las citas de menores o de personas que no pueden decidir por sí mismas las agenda su padre,
          madre, tutor o representante, quien responde por la información que proporciona.
        </S>

        <S title="4. Tu cuenta">
          Puedes agendar sin cuenta o crear una con tu correo. Solo puede haber una cuenta por correo en este hospital. Eres responsable de mantener tu
          contraseña en secreto y de lo que se haga con tu cuenta; avísanos si crees que alguien más la usa. Los datos que nos des deben ser verdaderos y
          estar actualizados.
        </S>

        <S title="5. Citas">
          <ul className="list-disc space-y-1 pl-5">
            <li>Los horarios que ves son los disponibles en ese momento; la cita queda confirmada cuando recibes el comprobante.</li>
            <li>Llega con anticipación. Si no te presentas, la cita puede marcarse como inasistencia.</li>
            <li>Puedes <strong>reprogramar</strong> tu cita por tu cuenta con al menos <strong>24 horas</strong> de anticipación, y <strong>cancelarla</strong> en
              cualquier momento antes de que empiece. Después, comunícate con el hospital.</li>
            <li>El hospital puede reprogramar o cancelar una cita por causas de fuerza mayor o ausencia del doctor; en ese caso te avisaremos y te ofreceremos otra fecha.</li>
          </ul>
        </S>

        <S title="6. Precios, pagos y reembolsos">
          <ul className="list-disc space-y-1 pl-5">
            <li>Los precios se muestran en pesos mexicanos e incluyen los impuestos que correspondan.</li>
            <li>Los pagos con tarjeta los procesa una pasarela de pagos certificada; el hospital no guarda los datos de tu tarjeta.</li>
            <li>Si pagaste en línea con tarjeta y cancelas con al menos <strong>1 hora</strong> de anticipación, el reembolso es automático a la misma tarjeta
              (el banco puede tardar algunos días en reflejarlo).</li>
            <li>Los pagos por transferencia, los hechos en recepción y las cancelaciones con menos anticipación se revisan con el hospital, que te dirá cómo y cuándo se devuelve.</li>
          </ul>
        </S>

        <S title="7. Comunicaciones">
          Te enviaremos por correo los comprobantes de tus citas y, si así lo eliges, recordatorios. Puedes desactivar los recordatorios y las novedades desde tu
          {' '}<Link to="/privacidad" className="font-medium text-primary-700 hover:underline">centro de privacidad</Link>.
        </S>

        <S title="8. Tus datos personales">
          Tratamos tus datos conforme a nuestro <Link to="/aviso-de-privacidad" className="font-medium text-primary-700 hover:underline">aviso de privacidad</Link>.
          Ahí se explica qué datos usamos, para qué y cómo ejercer tus derechos sobre ellos.
        </S>

        <S title="9. Uso correcto">
          No está permitido apartar citas falsas o en nombre de otra persona sin su autorización, intentar acceder a información ajena, interferir con el
          funcionamiento del sitio ni usarlo para fines ilícitos. Podemos suspender cuentas o cancelar citas que incumplan estas reglas.
        </S>

        <S title="10. Propiedad intelectual">
          Los textos, imágenes, logotipos y marcas del sitio pertenecen al hospital o a sus licenciantes. No puedes copiarlos ni usarlos sin autorización.
        </S>

        <S title="11. Disponibilidad y responsabilidad">
          Procuramos que el sitio funcione siempre, pero puede haber interrupciones por mantenimiento o fallas ajenas. La atención médica es responsabilidad de
          los profesionales que te atienden; el sitio solo facilita la gestión de tus citas.
        </S>

        <S title="12. Cambios a estos términos">
          Podemos actualizar estos términos. Publicaremos la nueva versión en esta página con su número y fecha; las citas ya agendadas se rigen por la versión vigente al agendarlas.
        </S>

        <S title="13. Ley aplicable y contacto">
          Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Para cualquier controversia las partes se someten a los tribunales
          competentes{city ? ` de ${city}` : ''}, sin perjuicio de tus derechos ante la Procuraduría Federal del Consumidor (Profeco).
          {c.contactEmail || c.contactPhone ? <> Dudas o aclaraciones: {[c.contactEmail, c.contactPhone].filter(Boolean).join(' · ')}.</> : ''}
        </S>
      </div>
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
