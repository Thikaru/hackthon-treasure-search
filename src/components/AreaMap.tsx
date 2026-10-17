import type { KeyboardEvent } from 'react'
import type { AreaId } from '../lib/game'
import type { TreasureState } from '../lib/game'
import RealMap from './RealMap'

export interface MapPin {
  id: string
  no: string
  x: number
  y: number
  state: TreasureState
  selected: boolean
}

interface Props {
  areaId: AreaId
  areaName: string
  pins: MapPin[]
  onSelect: (id: string) => void
}

const FONT = 'Noto Sans JP, sans-serif'

function Pin({ pin, onSelect }: { pin: MapPin; onSelect: (id: string) => void }) {
  const big = pin.selected
  const fill = pin.state === 'acquired' ? '#1F4FB8' : pin.state === 'found' ? '#D9472B' : '#DCE8F7'
  const stroke = pin.state === 'located' ? '#22406E' : '#FFFFFF'
  const text = pin.state === 'located' ? '#22406E' : '#FFFFFF'
  const s = big ? 1.25 : 1
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(pin.id)
    }
  }
  return (
    <g
      transform={`translate(${pin.x} ${pin.y}) scale(${s})`}
      role="button"
      tabIndex={0}
      aria-label={`No.${pin.no}`}
      aria-pressed={pin.selected}
      onClick={() => onSelect(pin.id)}
      onKeyDown={onKey}
      className="map-pin"
    >
      {big && <circle cy={-22} r={22} fill="#1F4FB8" opacity={0.18} />}
      <circle cy={-22} r={20} fill="transparent" />
      <path
        d="M0 0 C -4 -8, -12 -14, -12 -22 A12 12 0 1 1 12 -22 C 12 -14, 4 -8, 0 0 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={pin.state === 'located' ? 2.2 : 2}
      />
      <text y={-18.5} textAnchor="middle" fontSize={10} fontWeight={700} fill={text} fontFamily={FONT}>
        {pin.no}
      </text>
    </g>
  )
}

// 観光名所は実際の地形がまだ無いため、差し替え前提の簡易マップ
function SpotBase({ label }: { label: string }) {
  return (
    <>
      <rect x="0" y="0" width="390" height="470" fill="#CFDDBB" />
      <g fill="#BCCFA5">
        <ellipse cx="90" cy="180" rx="110" ry="60" />
        <ellipse cx="310" cy="220" rx="100" ry="70" />
        <ellipse cx="200" cy="380" rx="160" ry="50" />
      </g>
      <path d="M-10 420 C 80 360, 120 300, 190 270 S 320 220, 400 150" fill="none" stroke="#D3C6AE" strokeWidth="9" strokeLinecap="round" />
      <path d="M-10 420 C 80 360, 120 300, 190 270 S 320 220, 400 150" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
      <rect x="120" y="140" width="150" height="26" rx="13" fill="#FFFFFF" stroke="#B9C7DA" />
      <text x="195" y="158" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#22406E" fontFamily={FONT}>
        {label}（地図は差し替え予定）
      </text>
    </>
  )
}

export default function AreaMap({ areaId, areaName, pins, onSelect }: Props) {
  const label = areaName
  if (areaId === 'sand') {
    return <RealMap pins={pins} onSelect={onSelect} />
  }
  return (
    <svg
      className="area-map"
      viewBox="0 110 390 350"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`${label}のイラストマップ。場所が分かったお宝をピンで表示`}
    >
      <SpotBase label={label} />
      {pins.map((p) => (
        <Pin key={p.id} pin={p} onSelect={onSelect} />
      ))}
    </svg>
  )
}
