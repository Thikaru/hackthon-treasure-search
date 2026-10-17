import type { PlaceHint } from '../lib/game'
import { PinIcon } from './Icons'

/** 鍵のかかった宝箱のイラスト（open=true で鍵が外れたフタ付き） */
export function LockedChest({ size = 180, open = false }: { size?: number; open?: boolean }) {
  return (
    <svg width={size} height={size * 0.82} viewBox="0 0 220 180" aria-hidden="true">
      <ellipse cx="110" cy="168" rx="92" ry="9" fill="#172E52" opacity="0.18" />
      {/* 箱 */}
      <rect x="24" y="78" width="172" height="86" rx="10" fill="#B8803F" stroke="#7A4E22" strokeWidth="4" />
      <rect x="24" y="104" width="172" height="10" fill="#7A4E22" opacity="0.35" />
      <rect x="40" y="78" width="14" height="86" fill="#D9B98A" stroke="#7A4E22" strokeWidth="3" />
      <rect x="166" y="78" width="14" height="86" fill="#D9B98A" stroke="#7A4E22" strokeWidth="3" />
      {/* フタ */}
      <g transform={open ? 'rotate(-18 24 78)' : undefined}>
        <path d="M24 80 V60 a40 34 0 0 1 40 -34 h92 a40 34 0 0 1 40 34 V80 Z" fill="#C98E4B" stroke="#7A4E22" strokeWidth="4" />
        <rect x="40" y="26" width="14" height="54" fill="#D9B98A" stroke="#7A4E22" strokeWidth="3" />
        <rect x="166" y="26" width="14" height="54" fill="#D9B98A" stroke="#7A4E22" strokeWidth="3" />
      </g>
      {/* 錠前 */}
      {!open && (
        <g>
          <path d="M96 84 V72 a14 14 0 0 1 28 0 V84" fill="none" stroke="#5B6670" strokeWidth="7" strokeLinecap="round" />
          <rect x="86" y="82" width="48" height="40" rx="8" fill="#F1DDB8" stroke="#7A4E22" strokeWidth="4" />
          <circle cx="110" cy="98" r="6" fill="#22406E" />
          <rect x="107" y="100" width="6" height="12" rx="2" fill="#22406E" />
        </g>
      )}
      {open && (
        <g fill="#F1DDB8">
          <circle cx="90" cy="70" r="5" />
          <circle cx="118" cy="62" r="6" />
          <circle cx="142" cy="72" r="4" />
        </g>
      )}
    </svg>
  )
}

/** 宝の道標に正解した後の場所ヒント（画像・説明はどちらも任意） */
export function PlaceHintCard({ hint }: { hint?: PlaceHint }) {
  const text = hint?.text
  const image = hint?.image_url
  return (
    <div className="stack-12">
      <h2 className="card-title row-8">
        <PinIcon size={20} />
        お宝の場所のヒント
      </h2>
      {image && <img className="hint-image" src={image} alt="お宝の場所のヒント画像" loading="lazy" />}
      {text && <p className="body">{text}</p>}
      {!image && !text && <p className="muted small">この道標には場所のヒントがありません。謎の答えを手がかりに探してみよう。</p>}
    </div>
  )
}
