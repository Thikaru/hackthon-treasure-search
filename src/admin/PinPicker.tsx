import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L, { type LatLngTuple } from 'leaflet'
import { Pin, SpotBase, type MapPin } from '../components/AreaMap'
import { googleMapsUrl, parseGoogleMapsLocation } from '../lib/geo'
import { FitShibukawaBounds, latLngToPin, MAX_ZOOM, pinPosition, SHIBUKAWA_BOUNDS, treasureIcon } from '../components/RealMap'

/** 地図上の位置。実地図のエリアは lat/lng、イラスト地図のエリアは x/y を使う */
export interface PinValue {
  x: number
  y: number
  lat: number | null
  lng: number | null
}

interface Props {
  areaId: string
  areaName: string
  no: string
  value: PinValue
  /** 位置をまだ置いていない（新規で未選択） */
  unset: boolean
  /** 同じエリアのほかのお宝（重ならないように薄く表示） */
  others: MapPin[]
  onChange: (v: PinValue) => void
}

const inBounds = (lat: number, lng: number) => L.latLngBounds(SHIBUKAWA_BOUNDS as LatLngTuple[]).contains([lat, lng])

export default function PinPicker(props: Props) {
  return props.areaId === 'sand' ? <RealPicker {...props} /> : <SpotPicker {...props} />
}

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// 座標を貼って置いたときなどに、その場所まで地図を動かす
function FlyTo({ target }: { target: { lat: number; lng: number; n: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 18), { duration: 0.6 })
  }, [map, target])
  return null
}

// 実地図（砂浜）：タップした場所に置く。ピンはドラッグで微調整できる
function RealPicker({ no, value, unset, others, onChange }: Props) {
  const [note, setNote] = useState('')
  const [locating, setLocating] = useState(false)
  const [coord, setCoord] = useState('')
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; n: number } | null>(null)
  const exact = value.lat != null && value.lng != null
  const pos = pinPosition(value)
  const center = useRef<LatLngTuple>(unset ? [34.4548, 133.9036] : pos).current

  const place = (lat: number, lng: number, fly = false) => {
    if (!inBounds(lat, lng)) {
      setNote('地図の範囲外です。範囲内に置いてください')
      return false
    }
    setNote('')
    onChange({ ...latLngToPin(lat, lng), lat, lng })
    if (fly) setFlyTarget({ lat, lng, n: Date.now() })
    return true
  }

  // Googleマップからコピーした座標・URLで置く
  const placeFromGoogle = () => {
    const r = parseGoogleMapsLocation(coord)
    if (!r.ok) {
      setNote(
        r.reason === 'short_url'
          ? '短縮URL（maps.app.goo.gl）は読み取れません。座標をコピーするか、ブラウザで開いた後のURLを貼ってください'
          : r.reason === 'empty'
            ? 'Googleマップの座標かURLを貼ってください'
            : '座標を読み取れませんでした。「34.454927, 133.903128」のような形で貼ってください',
      )
      return
    }
    if (!inBounds(r.lat, r.lng)) {
      setNote(`その場所（${r.lat.toFixed(6)}, ${r.lng.toFixed(6)}）は渋川の地図の範囲外です`)
      return
    }
    place(r.lat, r.lng, true)
    setNote('Googleマップの座標に置きました')
    setCoord('')
  }

  const useHere = () => {
    if (!('geolocation' in navigator)) {
      setNote('この端末では現在地を使えません')
      return
    }
    setLocating(true)
    setNote('')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false)
        if (!inBounds(p.coords.latitude, p.coords.longitude)) setNote('現在地は地図の範囲外です')
        else {
          place(p.coords.latitude, p.coords.longitude, true)
          setNote(`現在地に置きました（誤差 約${Math.round(p.coords.accuracy)}m）`)
        }
      },
      (e) => {
        setLocating(false)
        setNote(e.code === e.PERMISSION_DENIED ? '位置情報の利用が許可されていません' : '現在地を取得できませんでした')
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    )
  }

  return (
    <div className="stack-8">
      <div className="picker-map">
        <MapContainer center={center} zoom={17} maxZoom={MAX_ZOOM} maxBounds={SHIBUKAWA_BOUNDS} maxBoundsViscosity={1} className="area-map real-map">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            bounds={SHIBUKAWA_BOUNDS}
          />
          <FitShibukawaBounds />
          <ClickToPlace onPick={(lat, lng) => place(lat, lng)} />
          <FlyTo target={flyTarget} />
          {others.map((o) => (
            <Marker key={o.id} position={pinPosition(o)} icon={treasureIcon({ ...o, state: 'locked', selected: false })} interactive={false} opacity={0.85}>
              <Tooltip direction="top" offset={[0, -34]}>
                No.{o.no}
              </Tooltip>
            </Marker>
          ))}
          {!unset && (
            <Marker
              position={pos}
              draggable
              zIndexOffset={1000}
              icon={treasureIcon({ id: 'edit', no: no || '新', x: 0, y: 0, state: 'found', selected: true })}
              eventHandlers={{
                dragend: (e) => {
                  const ll = (e.target as L.Marker).getLatLng()
                  place(ll.lat, ll.lng)
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <div className="stack-4">
        <label htmlFor="gmap-coord" className="label">
          Googleマップの座標・URLで置く
        </label>
        <div className="row-8 gmap-row">
          <input
            id="gmap-coord"
            className="input"
            value={coord}
            placeholder="例：34.454927, 133.903128"
            onChange={(e) => setCoord(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                placeFromGoogle()
              }
            }}
          />
          <button type="button" className="btn btn-deep small-btn" onClick={placeFromGoogle} disabled={!coord.trim()}>
            この場所に置く
          </button>
        </div>
        <span className="small muted">Googleマップで場所を右クリック（スマホは長押し）すると出る座標をコピーして貼ります。共有リンクを開いた後のURLも使えます。</span>
      </div>
      <div className="row-8 wrap picker-foot">
        <button type="button" className="btn btn-outline small-btn" onClick={useHere} disabled={locating}>
          {locating ? '現在地を取得中…' : '今いる場所に置く'}
        </button>
        <span className="small muted">
          {unset
            ? '地図をタップして、お宝の場所に置いてください'
            : exact
              ? `緯度 ${value.lat!.toFixed(6)}・経度 ${value.lng!.toFixed(6)}（ピンはドラッグで微調整できます）`
              : 'いまのピンはおおよその位置です。地図をタップして正しい場所に置き直してください'}
        </span>
        {exact && (
          <a className="small" href={googleMapsUrl(value.lat!, value.lng!)} target="_blank" rel="noreferrer">
            Googleマップで確認
          </a>
        )}
      </div>
      <p className="small muted" role="status" aria-live="polite">
        {note}
      </p>
    </div>
  )
}

// イラスト地図（観光名所など）：タップ・ドラッグした場所に置く。矢印キーでも動かせる
function SpotPicker({ areaName, no, value, unset, others, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)

  const toSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return null
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
    return { x: Math.round(Math.min(390, Math.max(0, p.x))), y: Math.round(Math.min(460, Math.max(110, p.y))) }
  }
  const set = (x: number, y: number) => onChange({ x, y, lat: null, lng: null })

  const down = (e: PointerEvent<SVGSVGElement>) => {
    const p = toSvg(e.clientX, e.clientY)
    if (!p) return
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    set(p.x, p.y)
  }
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return
    const p = toSvg(e.clientX, e.clientY)
    if (p) set(p.x, p.y)
  }
  const up = () => {
    dragging.current = false
  }
  const key = (e: KeyboardEvent<SVGSVGElement>) => {
    const step = e.shiftKey ? 20 : 5
    const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    const v = d[e.key]
    if (!v) return
    e.preventDefault()
    set(Math.min(390, Math.max(0, value.x + v[0])), Math.min(460, Math.max(110, value.y + v[1])))
  }

  return (
    <div className="stack-8">
      <div className="picker-map picker-svg">
        <svg
          ref={svgRef}
          viewBox="0 110 390 350"
          preserveAspectRatio="xMidYMid meet"
          role="application"
          tabIndex={0}
          aria-label={`${areaName}の地図。タップした場所にお宝を置きます。矢印キーでも動かせます`}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onKeyDown={key}
        >
          <SpotBase label={areaName} />
          {others.map((o) => (
            <g key={o.id} opacity={0.6} pointerEvents="none">
              <Pin pin={{ ...o, state: 'located', selected: false }} onSelect={() => undefined} />
            </g>
          ))}
          {!unset && (
            <g pointerEvents="none">
              <Pin pin={{ id: 'edit', no: no || '新', x: value.x, y: value.y, state: 'found', selected: true }} onSelect={() => undefined} />
            </g>
          )}
        </svg>
      </div>
      <span className="small muted">
        {unset ? '地図をタップして、お宝の場所に置いてください' : `横 ${value.x}・縦 ${value.y}（ドラッグや矢印キーで微調整できます）`}
      </span>
    </div>
  )
}
