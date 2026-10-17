import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
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
    return () => {
      map.off('resize', apply)
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

function TreasureMarker({ pin, onSelect }: { pin: MapPin; onSelect: (id: string) => void }) {
  const pos = pinToLatLng(pin.x, pin.y)
  return (
    <CircleMarker
      center={pos}
      radius={pin.selected ? 14 : 11}
      pathOptions={{
        color: pin.state === 'located' ? '#22406E' : '#FFFFFF',
        weight: pin.state === 'located' ? 2.2 : 2,
        fillColor: PIN_COLOR[pin.state],
        fillOpacity: 1,
      }}
      eventHandlers={{ click: () => onSelect(pin.id) }}
    >
      <Tooltip direction="top" offset={[0, -10]}>
        No.{pin.no}
      </Tooltip>
    </CircleMarker>
  )
}

const dropIcon = L.divIcon({
  className: 'user-pin-icon',
  html: '<div class="user-pin"></div>',
  iconSize: [24, 32],
  iconAnchor: [12, 32],
})

function ClickToDrop({ onDrop }: { onDrop: (pos: LatLngTuple) => void }) {
  useMapEvents({
    click(e) {
      onDrop([e.latlng.lat, e.latlng.lng])
    },
  })
  return null
}

interface Props {
  pins: MapPin[]
  onSelect: (id: string) => void
}

export default function RealMap({ pins, onSelect }: Props) {
  const [userPin, setUserPin] = useState<LatLngTuple | null>(null)

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
      <ClickToDrop onDrop={setUserPin} />
      {pins.map((p) => (
        <TreasureMarker key={p.id} pin={p} onSelect={onSelect} />
      ))}
      {userPin && (
        <Marker position={userPin} icon={dropIcon}>
          <Tooltip direction="top" offset={[0, -28]} permanent>
            ここにピン
          </Tooltip>
        </Marker>
      )}
    </MapContainer>
  )
}
