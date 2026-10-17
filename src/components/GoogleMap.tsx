import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { mapChestSvg } from '../art/svgArt'
import type { TimeOfDay } from '../lib/unityStage'
import type { MapPin } from './AreaMap'

// 砂浜エリアの地図（Google マップ）。
// ・VITE_GOOGLE_MAPS_API_KEY があれば Maps JavaScript API（動かせる地図・時間帯ごとの配色）
// ・なければ鍵のいらない埋め込み地図を使い、宝箱ピンや現在地は地図の座標から計算して上に重ねる
//   （埋め込み地図は外から操作できないので、ズーム・現在地はこちらのボタンで地図を出し直す）

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

// 渋川海岸（岡山県玉野市）。ピンの座標は従来の地図と同じ割り当て方にそろえる
const BOUNDS = { south: 34.448, west: 133.895, north: 34.462, east: 133.912 }
const BEACH: LatLng = { lat: 34.4537, lng: 133.9018 }

interface LatLng {
  lat: number
  lng: number
}

/** イラスト地図用の座標(0-390 / 110-460)を、渋川の緯度経度へ単純に対応付ける（RealMap と同じ） */
export function pinToLatLng(x: number, y: number): LatLng {
  return {
    lng: BOUNDS.west + (x / 390) * (BOUNDS.east - BOUNDS.west),
    lat: BOUNDS.north - ((y - 110) / 350) * (BOUNDS.north - BOUNDS.south),
  }
}

// Web メルカトル（Google マップの投影）。zoom z で世界全体が 256·2^z ピクセル
function project(p: LatLng, z: number) {
  const scale = 256 * 2 ** z
  const s = Math.sin((p.lat * Math.PI) / 180)
  return { x: ((p.lng + 180) / 360) * scale, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale }
}

interface Props {
  pins: MapPin[]
  onSelect: (id: string) => void
  tod: TimeOfDay
}

export default function GoogleMap(props: Props) {
  return API_KEY ? <JsApiMap {...props} apiKey={API_KEY} /> : <EmbedMap {...props} />
}

// ---------------------------------------------------------------- 現在地

function useMyLocation() {
  const [pos, setPos] = useState<LatLng | null>(null)
  const [state, setState] = useState<'off' | 'waiting' | 'on' | 'denied'>('off')
  const watch = useRef<number | null>(null)
  const start = () => {
    if (!navigator.geolocation || watch.current !== null) return
    setState('waiting')
    watch.current = navigator.geolocation.watchPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude })
        setState('on')
      },
      () => setState('denied'),
      { enableHighAccuracy: true, maximumAge: 10000 },
    )
  }
  useEffect(() => () => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current)
  }, [])
  return { pos, state, start }
}

const inBounds = (p: LatLng) => p.lat > BOUNDS.south - 0.01 && p.lat < BOUNDS.north + 0.01 && p.lng > BOUNDS.west - 0.01 && p.lng < BOUNDS.east + 0.01

function LocateIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  )
}

function PinButton({ pin, onSelect, style }: { pin: MapPin; onSelect: (id: string) => void; style: CSSProperties }) {
  const opened = pin.state === 'acquired'
  return (
    <button
      type="button"
      className={'gpin' + (opened ? ' gpin-open' : ' gpin-found') + (pin.selected ? ' on' : '')}
      style={style}
      aria-label={`No.${pin.no}${opened ? '（獲得）' : '（宝箱発見）'}`}
      aria-pressed={pin.selected}
      onClick={() => onSelect(pin.id)}
    >
      {opened ? <span className="gpin-halo" /> : <span className="gpin-ring" />}
      <span dangerouslySetInnerHTML={{ __html: mapChestSvg(pin.no, opened) }} />
    </button>
  )
}

// ---------------------------------------------------------------- 鍵なし：埋め込み地図

function EmbedMap({ pins, onSelect, tod }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(16)
  const [center, setCenter] = useState<LatLng>(BEACH)
  const me = useMyLocation()

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (me.state === 'on' && me.pos && inBounds(me.pos)) setCenter(me.pos)
    // 現在地ボタンを押した直後の1回だけ寄せる
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.state])

  const c = project(center, zoom)
  const place = (p: LatLng) => {
    const q = project(p, zoom)
    return { left: size.w / 2 + (q.x - c.x), top: size.h / 2 + (q.y - c.y) }
  }
  const src = `https://maps.google.com/maps?ll=${center.lat.toFixed(5)},${center.lng.toFixed(5)}&z=${zoom}&t=m&hl=ja&output=embed`

  return (
    <div className="gmap" ref={box}>
      <iframe key={src} src={src} title="渋川海岸の Google マップ" referrerPolicy="no-referrer-when-downgrade" tabIndex={-1} />
      <div className={`gmap-light gmap-${tod}`} aria-hidden="true" />
      {size.w > 0 &&
        pins.map((pin) => {
          const p = place(pinToLatLng(pin.x, pin.y))
          if (p.left < -30 || p.top < -30 || p.left > size.w + 30 || p.top > size.h + 30) return null
          return <PinButton key={pin.id} pin={pin} onSelect={onSelect} style={{ left: p.left, top: p.top }} />
        })}
      {me.pos && size.w > 0 && <span className="me-dot" style={place(me.pos)} aria-label="現在地" role="img" />}
      <div className="gmap-tools">
        <button type="button" className="map-fab" aria-label="ズームイン" onClick={() => setZoom((z) => Math.min(19, z + 1))}>
          ＋
        </button>
        <button type="button" className="map-fab" aria-label="ズームアウト" onClick={() => setZoom((z) => Math.max(14, z - 1))}>
          －
        </button>
        <button
          type="button"
          className={'map-fab' + (me.state === 'on' ? ' on' : me.state === 'waiting' ? ' waiting' : '')}
          aria-label="現在地を表示"
          onClick={() => {
            if (me.state === 'on' && me.pos && inBounds(me.pos)) setCenter(me.pos)
            else if (me.state === 'on') setCenter(BEACH)
            else me.start()
          }}
        >
          <LocateIcon />
        </button>
      </div>
      {me.state === 'denied' && <p className="locate-note">位置情報が使えません。端末の設定を確認してください</p>}
      {me.state === 'on' && me.pos && !inBounds(me.pos) && <p className="locate-note">いまは渋川海岸の外にいるようです</p>}
    </div>
  )
}

// ---------------------------------------------------------------- 鍵あり：Maps JavaScript API

type GMaps = typeof google.maps
declare const google: { maps: any } // eslint-disable-line @typescript-eslint/no-explicit-any

let apiLoading: Promise<GMaps> | null = null
function loadApi(key: string): Promise<GMaps> {
  if (apiLoading) return apiLoading
  apiLoading = new Promise((resolve, reject) => {
    const cb = '__gmapsReady'
    ;(window as unknown as Record<string, () => void>)[cb] = () => resolve(google.maps)
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&language=ja&region=JP&callback=${cb}`
    s.async = true
    s.onerror = () => reject(new Error('google maps failed'))
    document.head.appendChild(s)
  })
  return apiLoading
}

// 時間帯ごとの地図の配色（昼はそのまま、夕方は暖色、夜は紺）
const STYLES: Record<TimeOfDay, object[]> = {
  day: [{ featureType: 'poi.business', stylers: [{ visibility: 'off' }] }],
  dusk: [
    { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
    { elementType: 'geometry', stylers: [{ color: '#f1d2b0' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c98a6a' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#fbe3c8' }] },
    { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#e3b98e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#6a3a22' }] },
  ],
  night: [
    { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
    { elementType: 'geometry', stylers: [{ color: '#1c2a4a' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b1630' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c3d66' }] },
    { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#24365c' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#c9d6f2' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0b1630' }] },
  ],
}

function JsApiMap({ pins, onSelect, tod, apiKey }: Props & { apiKey: string }) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  const overlays = useRef<any[]>([]) // eslint-disable-line @typescript-eslint/no-explicit-any
  const meMarker = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  const [api, setApi] = useState<GMaps | null>(null)
  const [failed, setFailed] = useState(false)
  const me = useMyLocation()
  const pinKey = useMemo(() => JSON.stringify(pins.map((p) => [p.id, p.state, p.selected])), [pins])

  useEffect(() => {
    loadApi(apiKey).then(setApi, () => setFailed(true))
  }, [apiKey])

  useEffect(() => {
    if (!api || !el.current || map.current) return
    map.current = new api.Map(el.current, {
      center: BEACH,
      zoom: 16,
      minZoom: 14,
      disableDefaultUI: true,
      clickableIcons: false,
      gestureHandling: 'greedy',
      restriction: { latLngBounds: { south: BOUNDS.south - 0.01, west: BOUNDS.west - 0.01, north: BOUNDS.north + 0.01, east: BOUNDS.east + 0.01 } },
    })
  }, [api])

  useEffect(() => {
    map.current?.setOptions({ styles: STYLES[tod] })
  }, [api, tod])

  // 宝箱ピン（HTML を地図に重ねる OverlayView）
  useEffect(() => {
    if (!api || !map.current) return
    overlays.current.forEach((o) => o.setMap(null))
    overlays.current = pins.map((pin) => {
      const pos = pinToLatLng(pin.x, pin.y)
      const ov = new api.OverlayView()
      const div = document.createElement('button')
      div.type = 'button'
      const opened = pin.state === 'acquired'
      div.className = 'gpin' + (opened ? ' gpin-open' : ' gpin-found') + (pin.selected ? ' on' : '')
      div.setAttribute('aria-label', `No.${pin.no}`)
      div.innerHTML = (opened ? '<span class="gpin-halo"></span>' : '<span class="gpin-ring"></span>') + `<span>${mapChestSvg(pin.no, opened)}</span>`
      div.addEventListener('click', (e) => {
        e.stopPropagation()
        onSelect(pin.id)
      })
      ov.onAdd = () => ov.getPanes().overlayMouseTarget.appendChild(div)
      ov.draw = () => {
        const p = ov.getProjection().fromLatLngToDivPixel(new api.LatLng(pos.lat, pos.lng))
        div.style.left = `${p.x}px`
        div.style.top = `${p.y}px`
      }
      ov.onRemove = () => div.remove()
      ov.setMap(map.current)
      return ov
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, pinKey])

  useEffect(() => {
    if (!api || !map.current || !me.pos) return
    if (!meMarker.current) {
      meMarker.current = new api.Marker({
        map: map.current,
        icon: { path: api.SymbolPath.CIRCLE, scale: 8, fillColor: '#3f7fd9', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
        clickable: false,
      })
    }
    meMarker.current.setPosition(me.pos)
  }, [api, me.pos])

  if (failed) return <EmbedMap pins={pins} onSelect={onSelect} tod={tod} />
  return (
    <div className="gmap">
      <div ref={el} className="gmap-js" />
      <div className="gmap-tools">
        <button
          type="button"
          className={'map-fab' + (me.state === 'on' ? ' on' : me.state === 'waiting' ? ' waiting' : '')}
          aria-label="現在地を表示"
          onClick={() => {
            if (me.state !== 'on') me.start()
            else if (me.pos && inBounds(me.pos)) map.current?.panTo(me.pos)
          }}
        >
          <LocateIcon />
        </button>
      </div>
      {me.state === 'denied' && <p className="locate-note">位置情報が使えません。端末の設定を確認してください</p>}
    </div>
  )
}
