import type { KeyboardEvent } from 'react'
import type { AreaId } from '../lib/game'
import type { TreasureState } from '../lib/game'

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

function SandBase() {
  return (
    <>
      <rect x="0" y="0" width="390" height="470" fill="#CFDDBB" />
      <g fill="#BCCFA5">
        <ellipse cx="50" cy="60" rx="60" ry="34" />
        <ellipse cx="280" cy="50" rx="90" ry="40" />
        <ellipse cx="360" cy="110" rx="40" ry="22" />
        <ellipse cx="60" cy="150" rx="40" ry="16" />
      </g>
      <polygon points="110,182 178,173 168,30 118,20" fill="#EFE8DA" />
      <polygon points="0,180 390,140 390,385 0,205" fill="#EFE8DA" />
      <polygon points="0,205 390,385 390,420 0,240" fill="#E8D2A6" />
      <polygon points="0,240 390,420 390,470 0,470" fill="#8FB0DA" />
      <polygon points="0,310 290,470 0,470" fill="#7FA2D2" />
      <g stroke="#B5A88F" strokeWidth="5" strokeLinecap="round">
        <line x1="30" y1="218" x2="16" y2="262" />
        <line x1="378" y1="392" x2="364" y2="434" />
      </g>
      <g fill="#D9472B">
        {[20, 70, 120, 170, 220, 270, 320].map((x) => (
          <circle key={x} cx={x} cy={262 + x * 0.4615} r="2.5" />
        ))}
      </g>
      <path d="M140 176 C 152 130, 128 92, 142 24" fill="none" stroke="#D3C6AE" strokeWidth="8" strokeLinecap="round" />
      <path d="M140 176 C 152 130, 128 92, 142 24" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
      <path d="M205 168 L218 250 L300 302 L350 292" fill="none" stroke="#D3C6AE" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M205 168 L218 250 L300 302 L350 292" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M0 182 L390 142" stroke="#D9C38A" strokeWidth="15" />
      <path d="M0 182 L390 142" stroke="#F6E7BD" strokeWidth="11" />
      <rect x="160" y="155" width="30" height="18" rx="5" fill="#22406E" />
      <text x="175" y="168" textAnchor="middle" fontSize="11" fontWeight="700" fill="#FFFFFF" fontFamily={FONT}>
        430
      </text>
      <rect x="300" y="162" width="72" height="50" rx="4" fill="#E1E6EC" stroke="#C3CCD7" />
      <text x="336" y="193" textAnchor="middle" fontSize="16" fontWeight="700" fill="#22406E" fontFamily={FONT}>
        P
      </text>
      <rect x="150" y="196" width="40" height="26" rx="3" fill="#FFFFFF" stroke="#B9C7DA" transform="rotate(10 170 209)" />
      <rect x="228" y="198" width="64" height="38" rx="4" fill="#FFFFFF" stroke="#22406E" strokeWidth="1.5" transform="rotate(28 260 217)" />
      <rect x="198" y="248" width="124" height="22" rx="11" fill="#FFFFFF" stroke="#22406E" />
      <text x="260" y="263" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#22406E" fontFamily={FONT}>
        パークセンター（受付）
      </text>
      <g fill="#1F4FB8">
        <rect x="210" y="324" width="13" height="4" rx="2" transform="rotate(25 216 326)" />
        <rect x="228" y="332" width="13" height="4" rx="2" transform="rotate(25 234 334)" />
        <rect x="246" y="340" width="13" height="4" rx="2" transform="rotate(25 252 342)" />
      </g>
    </>
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
  return (
    <svg
      className="area-map"
      viewBox="0 110 390 350"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`${label}のイラストマップ。場所が分かったお宝をピンで表示`}
    >
      {areaId === 'sand' ? <SandBase /> : <SpotBase label={label} />}
      {pins.map((p) => (
        <Pin key={p.id} pin={p} onSelect={onSelect} />
      ))}
    </svg>
  )
}
