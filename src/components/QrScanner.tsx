import jsQR from 'jsqr'
import { useEffect, useRef, useState } from 'react'

interface Props {
  onResult: (text: string) => void
  /** 同じ内容を続けて読んだときに無視する時間 */
  cooldownMs?: number
}

type CamState = 'starting' | 'running' | 'denied' | 'unsupported'

// ブラウザのカメラ映像からQRを読み取る（iPhoneのSafariでも動く方式）
export default function QrScanner({ onResult, cooldownMs = 2500 }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cam, setCam] = useState<CamState>('starting')
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  useEffect(() => {
    let stream: MediaStream | null = null
    let raf = 0
    let stopped = false
    let last = { text: '', at: 0 }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCam('unsupported')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
      } catch {
        setCam('denied')
        return
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      const video = videoRef.current!
      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      await video.play().catch(() => undefined)
      setCam('running')
      tick()
    }

    function tick() {
      if (stopped) return
      const video = videoRef.current
      const canvas = canvasRef.current
      if (video && canvas && video.readyState >= 2 && video.videoWidth) {
        const scale = Math.min(1, 640 / video.videoWidth)
        const w = Math.round(video.videoWidth * scale)
        const h = Math.round(video.videoHeight * scale)
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h)
          const img = ctx.getImageData(0, 0, w, h)
          const code = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })
          if (code?.data) {
            const now = Date.now()
            if (code.data !== last.text || now - last.at > cooldownMs) {
              last = { text: code.data, at: now }
              onResultRef.current(code.data)
            }
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }

    start()
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [cooldownMs])

  return (
    <div className="scanner">
      <video ref={videoRef} className="scanner-video" muted playsInline />
      <canvas ref={canvasRef} hidden />
      <div className="scanner-frame" aria-hidden="true">
        <span className="c tl" />
        <span className="c tr" />
        <span className="c bl" />
        <span className="c br" />
        {cam === 'running' && <span className="scanner-line" />}
      </div>
      {cam !== 'running' && (
        <p className="scanner-msg" role="status">
          {cam === 'starting' && 'カメラを起動しています…'}
          {cam === 'denied' && 'カメラが使えません。ブラウザの設定でカメラを許可するか、下の6桁コードを使ってください。'}
          {cam === 'unsupported' && 'このブラウザではカメラが使えません。下の6桁コードを使ってください。'}
        </p>
      )}
    </div>
  )
}
