import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TreasureState } from '../lib/game'
import { BackIcon } from './Icons'

export function BackHeader({ title, sub, to, right }: { title: string; sub?: string; to?: string; right?: ReactNode }) {
  const nav = useNavigate()
  return (
    <header className="back-header">
      <button
        type="button"
        className="icon-btn"
        aria-label="戻る"
        onClick={() => (to ? nav(to) : window.history.length > 1 ? nav(-1) : nav('/home'))}
      >
        <BackIcon />
      </button>
      <div className="back-header-text">
        {sub && <span className="back-header-sub">{sub}</span>}
        <h1>{title}</h1>
      </div>
      {right && <div className="back-header-right">{right}</div>}
    </header>
  )
}

const LABEL: Record<TreasureState, string> = {
  locked: '未解決',
  located: '道標クリア',
  found: '宝箱発見',
  acquired: '獲得',
}

export function StatusChip({ state }: { state: TreasureState }) {
  return <span className={`chip chip-${state}`}>{LABEL[state]}</span>
}

export const stateLabel = (s: TreasureState) => LABEL[s]

/** 固定の種から作る擬似乱数の列（毎回同じ配置にするため） */
function seeded(seed: number, n: number) {
  const out: number[] = []
  let s = seed
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280
    out.push(s / 233280)
  }
  return out
}

/** 画面に散らばる小さな光（位置は固定の擬似乱数で毎回同じ） */
export function Sparkles({ count = 14, seed = 3 }: { count?: number; seed?: number }) {
  const r = seeded(seed, count * 4)
  return (
    <div className="sparkles" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(r[i * 4] * 100).toFixed(1)}%`,
            top: `${(r[i * 4 + 1] * 100).toFixed(1)}%`,
            animationDelay: `${(r[i * 4 + 2] * 3).toFixed(2)}s`,
            transform: `scale(${(0.5 + r[i * 4 + 3]).toFixed(2)})`,
          }}
        />
      ))}
    </div>
  )
}

/** 昼・夕方・夜のアイコン */
export function TodIcon({ tod }: { tod: 'day' | 'dusk' | 'night' }) {
  if (tod === 'day')
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4.5" fill="#ffcf4a" stroke="#e8a21a" />
        <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="#e8a21a" />
      </svg>
    )
  if (tod === 'dusk')
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeWidth="2" aria-hidden="true">
        <path d="M5 16a7 7 0 0 1 14 0" fill="#ff9a3d" stroke="#e8661a" />
        <path d="M2 19h20M5 22h14M12 3v3M4.5 8.5l1.8 1.5M19.5 8.5l-1.8 1.5" stroke="#e8661a" />
      </svg>
    )
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" fill="#ffd36b" stroke="#d9a520" strokeWidth="1.6" />
    </svg>
  )
}
