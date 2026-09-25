import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import Modal from './Modal'

/**
 * Escáner de QR con la cámara (para el QR del comprobante de la cita). Decodifica en el
 * navegador con jsQR: la imagen de la cámara nunca sale del equipo. Un lector de código de barras
 * USB no necesita esto: "teclea" el contenido en el campo de búsqueda como cualquier teclado.
 * La cámara del navegador solo funciona en HTTPS (o en localhost).
 */
export default function QrScannerModal({ onResult, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let stream = null
    let timer = null
    let done = false

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Este navegador no permite usar la cámara aquí (solo funciona en una página segura, HTTPS).')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      } catch (e) {
        setError(e?.name === 'NotAllowedError'
          ? 'Permite el acceso a la cámara en tu navegador para escanear el QR.'
          : 'No se pudo abrir la cámara. Verifica que esté conectada y que ninguna otra aplicación la use.')
        return
      }
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play().catch(() => {})

      timer = setInterval(() => {
        if (done || video.readyState < 2 || !video.videoWidth) return
        const canvas = canvasRef.current
        const scale = Math.min(1, 640 / video.videoWidth)
        canvas.width = Math.floor(video.videoWidth * scale)
        canvas.height = Math.floor(video.videoHeight * scale)
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })
        if (code?.data) {
          done = true
          onResult(code.data)
        }
      }, 250)
    }
    start()

    return () => {
      done = true
      if (timer) clearInterval(timer)
      if (stream) stream.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Modal title="Escanear QR de la cita" onClose={onClose} maxWidth="max-w-md">
      {error ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-3">{error}</p>
      ) : (
        <div className="space-y-3">
          <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-8 border-2 border-white/70 rounded-xl pointer-events-none" />
          </div>
          <p className="text-xs text-gray-500 text-center">Acerca el QR del comprobante a la cámara; se lee solo.</p>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
      <div className="flex justify-end pt-4 mt-4 border-t border-gray-100">
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
      </div>
    </Modal>
  )
}
