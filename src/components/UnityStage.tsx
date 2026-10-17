import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  loadStage,
  onStageStatus,
  showScene,
  sleepStage,
  stageDrag,
  stageRelease,
  stageStatus,
  stageTap,
  wakeStage,
  type StageScene,
  type TimeOfDay,
} from '../lib/unityStage'

interface Props {
  scene: StageScene
  tod: TimeOfDay
  kind: string
  /** 同じ値なら場面を出し直さない（例：`chest:t01`） */
  sceneKey: string
  fresh?: boolean
  /** Unity が使えないとき・読み込み中に出す絵 */
  fallback: ReactNode
  onTap?: () => void
  label: string
}

/**
 * Unity の舞台を置く場所。指でなぞると宝箱が回り、タップで onTap。
 * 読み込み中・読み込めない端末では fallback（SVG の絵）を出す。
 */
export default function UnityStage({ scene, tod, kind, sceneKey, fresh, fallback, onTap, label }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState(stageStatus())
  const drag = useRef<{ x: number; moved: number } | null>(null)

  useEffect(() => {
    const off = onStageStatus(setStatus)
    loadStage()
    return off
  }, [])

  const ready = status === 'ready'
  useEffect(() => {
    if (!ready || !host.current) return
    wakeStage(host.current)
    return () => sleepStage()
  }, [ready])

  useEffect(() => {
    if (ready) showScene(scene, { tod, kind, fresh, key: sceneKey })
  }, [ready, scene, tod, kind, fresh, sceneKey])

  return (
    <div className={'stage' + (ready ? ' stage-ready' : '')}>
      <div
        ref={host}
        className="stage-host"
        role={onTap ? 'button' : 'img'}
        tabIndex={onTap ? 0 : -1}
        aria-label={label}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, moved: 0 }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!drag.current) return
          const dx = e.clientX - drag.current.x
          drag.current.x = e.clientX
          drag.current.moved += Math.abs(dx)
          if (ready) stageDrag(dx)
        }}
        onPointerUp={() => {
          const d = drag.current
          drag.current = null
          if (ready) stageRelease()
          if (d && d.moved < 8) {
            if (ready) stageTap()
            onTap?.()
          }
        }}
        onPointerCancel={() => {
          drag.current = null
          if (ready) stageRelease()
        }}
        onKeyDown={(e) => {
          if (onTap && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            if (ready) stageTap()
            onTap()
          }
        }}
      />
      {!ready && <div className="stage-fallback">{fallback}</div>}
    </div>
  )
}
