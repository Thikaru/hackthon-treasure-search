import type { KeyboardEvent } from 'react'
import type { AreaId } from '../lib/game'
import type { TreasureState } from '../lib/game'
import { mapChestSvg } from '../art/svgArt'
import type { TimeOfDay } from '../lib/unityStage'
import GoogleMap from './GoogleMap'

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
  tod: TimeOfDay
}

const FONT = 'Noto Sans JP, sans-serif'

function Pin({ pin, onSelect }: { pin: MapPin; onSelect: (id: string) => void }) {
  const opened = pin.state === 'acquired'
  const s = pin.selected ? 1.2 : 1
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
      {opened && <circle cy={-6} r={26} fill="#ffd36b" opacity={0.35} />}
      {!opened && <circle cy={-6} r={22} fill="none" stroke="#ff6a3a" strokeWidth={2.5} opacity={0.8} />}
      <g transform="translate(-27 -46)" dangerouslySetInnerHTML={{ __html: mapChestSvg(pin.no, opened) }} />
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

export default function AreaMap({ areaId, areaName, pins, onSelect, tod }: Props) {
  const label = areaName
  if (areaId === 'sand') {
    return <GoogleMap pins={pins} onSelect={onSelect} tod={tod} />
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
