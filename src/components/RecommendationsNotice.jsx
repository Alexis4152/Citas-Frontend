const DEFAULT_TEXT = 'Llega 15 minutos antes de tu cita y trae una identificación oficial. Si no vas a poder '
  + 'asistir, cancela con al menos 24 horas de anticipación para liberar el espacio.'

// El ADMIN captura las recomendaciones de una especialidad como texto libre con viñetas "•"
// (ver AdminSpecialties.jsx) -- esto las separa en puntos reales en vez de mostrarlas como un
// párrafo corrido, para que cada indicación se lea de un vistazo. Sin "•" en el texto, se
// muestra tal cual como un solo párrafo (no tiene sentido un único punto con viñeta).
function splitPoints(text) {
  return text.split('•').map((s) => s.trim()).filter(Boolean)
}

export default function RecommendationsNotice({ text, className = '' }) {
  const points = splitPoints((text || '').trim() || DEFAULT_TEXT)
  return (
    <div className={className}>
      {points.length > 1 ? (
        <ul className="list-disc list-outside pl-4 space-y-1">
          {points.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
      ) : (
        <p>{points[0]}</p>
      )}
    </div>
  )
}
