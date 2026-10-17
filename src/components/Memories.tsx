import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Treasure } from '../lib/game'
import { savePhoto, timeLabel, type Photo } from '../lib/photos'
import { CloseIcon, PinIcon } from './Icons'

export function CameraIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h3l2-3h6l2 3h3v11H4Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

/**
 * 写真を撮る流れ：カメラ（スマホ標準）で撮る → ポラロイドで確認 → 「思い出に残す」で保存。
 * open が true になるとすぐカメラを開く。やめたら onClose。
 */
export function PhotoCapture({ treasure, open, onClose }: { treasure: Treasure; open: boolean; onClose: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && !file) input.current?.click()
  }, [open, file])

  useEffect(() => {
    if (!file) return
    const u = URL.createObjectURL(file)
    setPreview(u)
    return () => URL.revokeObjectURL(u)
  }, [file])

  const close = () => {
    setFile(null)
    setPreview(null)
    onClose()
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) setFile(f)
          else if (!file) close()
        }}
      />
      {open && preview && (
        <div className="memo-overlay" role="dialog" aria-label="思い出の写真">
          <div className="memo-top">
            <span className="chip">思い出の写真</span>
            <button type="button" className="lb-x" aria-label="やめる" onClick={close}>
              <CloseIcon />
            </button>
          </div>
          <div className="polbig">
            <span className="tape" />
            <img className="ph" src={preview} alt="" />
            <div className="cap">
              {treasure.name}
              <small>
                No.{treasure.no}・{timeLabel(Date.now())}
              </small>
            </div>
          </div>
          <div className="memo-panel glass glass-strong">
            <p className="small center">地図の「{treasure.name}」の場所に貼られます（写真はこの端末の中だけに保存されます）</p>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={async () => {
                setSaving(true)
                await savePhoto(treasure.id, file!)
                setSaving(false)
                close()
              }}
            >
              <PinIcon size={18} />
              {saving ? '保存中…' : '思い出に残す'}
            </button>
            <button type="button" className="btn btn-glass" onClick={() => input.current?.click()}>
              撮り直す
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/** 地図の写真をタップしたときに大きく見せる。左右でほかの写真へ */
export function PhotoLightbox({
  list,
  index,
  onIndex,
  onClose,
  onRetake,
}: {
  list: { t: Treasure; photo: Photo }[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
  onRetake: (t: Treasure) => void
}) {
  const cur = list[index]
  const start = useRef<number | null>(null)
  if (!cur) return null
  const go = (d: number) => onIndex((index + d + list.length) % list.length)
  return (
    <div
      className="memo-overlay"
      role="dialog"
      aria-label={`${cur.t.name}の思い出`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onPointerDown={(e) => (start.current = e.clientX)}
      onPointerUp={(e) => {
        if (start.current === null) return
        const dx = e.clientX - start.current
        start.current = null
        if (Math.abs(dx) > 50 && list.length > 1) go(dx < 0 ? 1 : -1)
      }}
    >
      <div className="memo-top">
        <span className="chip">
          {cur.t.no}　{cur.t.name}
        </span>
        <button type="button" className="lb-x" aria-label="閉じる" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <div className="polbig">
        <span className="tape" />
        <img className="ph" src={cur.photo.url} alt={`${cur.t.name}で撮った写真`} />
        <div className="cap">
          {cur.t.name}
          <small>
            No.{cur.t.no}・{timeLabel(cur.photo.takenAt)}
          </small>
        </div>
      </div>
      {list.length > 1 && (
        <div className="lb-nav">
          <button type="button" className="lb-arrow" aria-label="前の写真" onClick={() => go(-1)}>
            ‹
          </button>
          <span className="lb-dots">
            {list.map((_, k) => (
              <i key={k} className={k === index ? 'on' : ''} />
            ))}
          </span>
          <button type="button" className="lb-arrow" aria-label="次の写真" onClick={() => go(1)}>
            ›
          </button>
        </div>
      )}
      <div className="lb-btns">
        <button type="button" className="btn btn-glass" onClick={() => onRetake(cur.t)}>
          <CameraIcon />
          撮り直す
        </button>
        <Link to={`/got/${cur.t.id}`} className="btn btn-primary">
          お宝を見る
        </Link>
      </div>
    </div>
  )
}
