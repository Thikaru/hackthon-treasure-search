import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Circle, CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L, { type LatLngBoundsExpression, type LatLngTuple } from 'leaflet'
import type { MapPin } from './AreaMap'

// 渋川海岸（岡山県玉野市渋川、渋川海水浴場）周辺のみを表示・移動できるように範囲を固定
export const SHIBUKAWA_CENTER: LatLngTuple = [34.4548, 133.9036]
export const SHIBUKAWA_BOUNDS: LatLngBoundsExpression = [
  [34.448, 133.895], // 南西
  [34.462, 133.912], // 北東
]
export const MAX_ZOOM = 19

// 画面サイズに応じて「渋川の範囲がちょうど画面いっぱいに収まる」ズームを最小値にする
// （これより引くと渋川の外側の空白が見えてしまうため）
export function FitShibukawaBounds() {
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
export function pinToLatLng(x: number, y: number): LatLngTuple {
  const [[sLat, wLng], [nLat, eLng]] = SHIBUKAWA_BOUNDS as [LatLngTuple, LatLngTuple]
  const lng = wLng + (x / 390) * (eLng - wLng)
  const lat = nLat - (y - 110) / 350 * (nLat - sLat)
  return [lat, lng]
}

/** pinToLatLng の逆。緯度・経度から、イラスト地図の座標（範囲内に収める）を割り出す */
export function latLngToPin(lat: number, lng: number): { x: number; y: number } {
  const [[sLat, wLng], [nLat, eLng]] = SHIBUKAWA_BOUNDS as [LatLngTuple, LatLngTuple]
  const x = Math.round(((lng - wLng) / (eLng - wLng)) * 390)
  const y = Math.round(110 + ((nLat - lat) / (nLat - sLat)) * 350)
  return { x: Math.min(390, Math.max(0, x)), y: Math.min(460, Math.max(110, y)) }
}

/** ピンの位置。緯度・経度が登録されていればそれを使う */
export function pinPosition(pin: Pick<MapPin, 'x' | 'y' | 'lat' | 'lng'>): LatLngTuple {
  return pin.lat != null && pin.lng != null ? [pin.lat, pin.lng] : pinToLatLng(pin.x, pin.y)
}

const PIN_COLOR: Record<MapPin['state'], string> = {
  locked: '#cdbb9c',
  located: '#DCE8F7',
  found: '#D9472B',
  acquired: '#1F4FB8',
}

// 元のイラストマップと同じ涙型ピンの見た目を、地図上でも目立つように divIcon で再現
export function treasureIcon(pin: MapPin) {
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
  const pos = pinPosition(pin)
  const icon = useMemo(() => treasureIcon(pin), [pin])
  return (
    <Marker position={pos} icon={icon} eventHandlers={{ click: () => onSelect(pin.id) }} zIndexOffset={pin.selected ? 1000 : 0}>
      <Tooltip direction="top" offset={[0, -34]}>
        No.{pin.no}
      </Tooltip>
    </Marker>
  )
}

// 自分の現在地（GPS）。許可済みなら地図を開いた時点で表示し、まだ許可も拒否もしていなければ、
// 地図を開くたびに位置情報の利用を求める。以後は動きに合わせて青い点を更新する
type LocateStatus = 'off' | 'waiting' | 'on' | 'denied' | 'error'

function MyLocation() {
  const map = useMap()
  const [pos, setPos] = useState<{ lat: number; lng: number; acc: number } | null>(null)
  const [status, setStatus] = useState<LocateStatus>('off')
  const [note, setNote] = useState<string | null>(null)
  const watchId = useRef<number | null>(null)
  const centerNext = useRef(false)
  // 地図を開いたときの自動取得では、断られてもメッセージを出さない
  const quiet = useRef(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  const showOnMap = useCallback(
    (lat: number, lng: number) => {
      if (L.latLngBounds(SHIBUKAWA_BOUNDS as LatLngTuple[]).contains([lat, lng])) {
        setNote(null)
        map.flyTo([lat, lng], Math.max(map.getZoom(), 17), { duration: 0.6 })
      } else {
        setNote('現在地は渋川の地図の範囲外です')
      }
    },
    [map],
  )

  const start = useCallback(
    (center: boolean, silent = false) => {
      quiet.current = silent
      if (!('geolocation' in navigator)) {
        setStatus('error')
        if (!silent) setNote('この端末では現在地を使えません')
        return
      }
      centerNext.current = center
      if (watchId.current !== null) return
      setStatus('waiting')
      watchId.current = navigator.geolocation.watchPosition(
        (p) => {
          const { latitude: lat, longitude: lng, accuracy: acc } = p.coords
          setPos({ lat, lng, acc })
          setStatus('on')
          if (centerNext.current) {
            centerNext.current = false
            showOnMap(lat, lng)
          }
        },
        (e) => {
          if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
          watchId.current = null
          const denied = e.code === e.PERMISSION_DENIED
          setStatus(denied ? 'denied' : 'error')
          if (!quiet.current) {
            setNote(denied ? '位置情報の利用が許可されていません（端末の設定から許可できます）' : '現在地を取得できませんでした')
          }
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
      )
    },
    [showOnMap],
  )

  useEffect(() => {
    // 許可済み・未回答なら取得を始める（未回答ならブラウザが許可を求める）。拒否済みなら何もしない
    const startQuietly = () => start(false, true)
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((r) => {
          if (r.state !== 'denied') startQuietly()
        })
        .catch(startQuietly)
    } else {
      startQuietly()
    }
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
  }, [start])

  useEffect(() => {
    // ボタン操作で地図がドラッグ・ズームされないようにする
    if (btnRef.current) L.DomEvent.disableClickPropagation(btnRef.current)
  }, [])

  const onClick = () => {
    if (pos && status === 'on') showOnMap(pos.lat, pos.lng)
    else start(true)
  }

  return (
    <>
      {pos && (
        <>
          <Circle center={[pos.lat, pos.lng]} radius={pos.acc} pathOptions={{ color: '#2F6FE4', weight: 1, fillOpacity: 0.12 }} interactive={false} />
          <CircleMarker
            center={[pos.lat, pos.lng]}
            radius={8}
            pathOptions={{ color: '#FFFFFF', weight: 3, fillColor: '#2F6FE4', fillOpacity: 1 }}
            interactive={false}
          />
        </>
      )}
      <button
        ref={btnRef}
        type="button"
        className={'locate-btn' + (status === 'on' ? ' on' : '') + (status === 'waiting' ? ' waiting' : '')}
        aria-label="現在地を表示"
        aria-pressed={status === 'on'}
        onClick={onClick}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" fill={status === 'on' ? 'currentColor' : 'none'} />
          <circle cx="12" cy="12" r="8" />
          <path d="M12 1v3M12 20v3M1 12h3M20 12h3" />
        </svg>
      </button>
      {note && (
        <p className="locate-note" role="status">
          {note}
        </p>
      )}
    </>
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
      <MyLocation />
      {pins.map((p) => (
        <TreasureMarker key={p.id} pin={p} onSelect={onSelect} />
      ))}
    </MapContainer>
  )
}
