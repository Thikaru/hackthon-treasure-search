import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L, { type LatLngBoundsExpression, type LatLngTuple } from 'leaflet'
import type { MapPin } from './AreaMap'

// 渋川海岸（岡山県玉野市渋川、渋川海水浴場）周辺のみを表示・移動できるように範囲を固定
const SHIBUKAWA_CENTER: LatLngTuple = [34.4548, 133.9036]
const SHIBUKAWA_BOUNDS: LatLngBoundsExpression = [
  [34.448, 133.895], // 南西
  [34.462, 133.912], // 北東
]
const MAX_ZOOM = 19

// 画面サイズに応じて「渋川の範囲がちょうど画面いっぱいに収まる」ズームを最小値にする
// （これより引くと渋川の外側の空白が見えてしまうため）
function FitShibukawaBounds() {
  const map = useMap()
  useEffect(() => {
    const apply = () => {
      const fitZoom = map.getBoundsZoom(SHIBUKAWA_BOUNDS, true)
      map.setMinZoom(fitZoom)
      if (map.getZoom() < fitZoom) map.setZoom(fitZoom)
    }
    apply()
    map.on('resize', apply)
    // 下のシートを上げ下げすると地図の高さが変わるので、そのたびにサイズを取り直す
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(map.getContainer())
    return () => {
      map.off('resize', apply)
      ro.disconnect()
    }
  }, [map])
  return null
}

// 既存のイラスト地図上の座標(0-390 / 110-460)を、渋川の緯度経度へ単純に対応付ける
function pinToLatLng(x: number, y: number): LatLngTuple {
  const [[sLat, wLng], [nLat, eLng]] = SHIBUKAWA_BOUNDS as [LatLngTuple, LatLngTuple]
  const lng = wLng + (x / 390) * (eLng - wLng)
  const lat = nLat - (y - 110) / 350 * (nLat - sLat)
  return [lat, lng]
}

const PIN_COLOR: Record<MapPin['state'], string> = {
  locked: '#cdbb9c',
  located: '#DCE8F7',
  found: '#D9472B',
  acquired: '#1F4FB8',
}

// 元のイラストマップと同じ涙型ピンの見た目を、地図上でも目立つように divIcon で再現
function treasureIcon(pin: MapPin) {
  const big = pin.selected
  const fill = PIN_COLOR[pin.state]
  const stroke = pin.state === 'located' ? '#22406E' : '#FFFFFF'
  const text = pin.state === 'located' ? '#22406E' : '#FFFFFF'
  const s = big ? 1.2 : 1
  const w = 32 * s
  const h = 38 * s
  const html = `
    <svg width="${w}" height="${h}" viewBox="0 0 32 38" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 1px 2px rgba(34,64,110,.45))">
      <path d="M16 37 C 12 27, 2 20, 2 13 A14 14 0 1 1 30 13 C 30 20, 20 27, 16 37 Z" fill="${fill}" stroke="${stroke}" stroke-width="2.5" />
      <text x="16" y="17.5" text-anchor="middle" font-size="11.5" font-weight="700" fill="${text}" font-family="Noto Sans JP, sans-serif">${pin.no}</text>
    </svg>`
  return L.divIcon({
    className: 'treasure-pin-icon',
    html,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
  })
}

function TreasureMarker({ pin, onSelect }: { pin: MapPin; onSelect: (id: string) => void }) {
  const pos = pinToLatLng(pin.x, pin.y)
  const icon = useMemo(() => treasureIcon(pin), [pin])
  return (
    <Marker position={pos} icon={icon} eventHandlers={{ click: () => onSelect(pin.id) }} zIndexOffset={pin.selected ? 1000 : 0}>
      <Tooltip direction="top" offset={[0, -34]}>
        No.{pin.no}
      </Tooltip>
    </Marker>
  )
}

interface Props {
  pins: MapPin[]
  onSelect: (id: string) => void
}

export default function RealMap({ pins, onSelect }: Props) {
  return (
    <MapContainer
      center={SHIBUKAWA_CENTER}
      zoom={16}
      maxZoom={MAX_ZOOM}
      maxBounds={SHIBUKAWA_BOUNDS}
      maxBoundsViscosity={1.0}
      className="area-map real-map"
      attributionControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        bounds={SHIBUKAWA_BOUNDS}
      />
      <FitShibukawaBounds />
      {pins.map((p) => (
        <TreasureMarker key={p.id} pin={p} onSelect={onSelect} />
      ))}
    </MapContainer>
  )
}
