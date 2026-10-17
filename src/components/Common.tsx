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
  located: '場所判明',
  found: '発見',
  acquired: '獲得',
}

export function StatusChip({ state }: { state: TreasureState }) {
  return <span className={`chip chip-${state}`}>{LABEL[state]}</span>
}

export const stateLabel = (s: TreasureState) => LABEL[s]
