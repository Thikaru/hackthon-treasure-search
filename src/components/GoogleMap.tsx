import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { mapChestSvg } from '../art/svgArt'
import type { TimeOfDay } from '../lib/unityStage'
import type { MapPin } from './AreaMap'

// 砂浜エリアの地図（Google マップ）。
// ・VITE_GOOGLE_MAPS_API_KEY があれば Maps JavaScript API（動かせる地図・時間帯ごとの配色）
// ・なければ鍵のいらない埋め込み地図を使い、宝箱ピンや現在地は地図の座標から計算して上に重ねる
//   （埋め込み地図は外から操作できないので、なぞる・2本指・ボタンの操作はこちらで受けて地図を出し直す）

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

// project の逆（ピクセル → 緯度経度）
function unproject(x: number, y: number, z: number): LatLng {
  const scale = 256 * 2 ** z
  const lng = (x / scale) * 360 - 180
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / scale))) * 180) / Math.PI
  return { lat, lng }
}

const PAN_LIMIT = { south: BOUNDS.south - 0.012, west: BOUNDS.west - 0.015, north: BOUNDS.north + 0.012, east: BOUNDS.east + 0.015 }
const clampCenter = (p: LatLng): LatLng => ({
  lat: Math.min(PAN_LIMIT.north, Math.max(PAN_LIMIT.south, p.lat)),
  lng: Math.min(PAN_LIMIT.east, Math.max(PAN_LIMIT.west, p.lng)),
})
const embedSrc = (c: LatLng, z: number) => `https://maps.google.com/maps?ll=${c.lat.toFixed(5)},${c.lng.toFixed(5)}&z=${z}&t=m&hl=ja&output=embed`

interface View {
  center: LatLng
  zoom: number
}

/**
 * 鍵のいらない埋め込み地図は外から動かせないので、指の操作はこちらで受ける。
 * ・地図は画面の2倍の大きさで読み込み、なぞっている間は地図ごと（ピンも一緒に）ずらして見せる
 * ・指を離したら、その位置を中心に地図を読み直す（読み終わるまで前の地図を出しておき、ちらつかせない）
 * ・2本指で広げる／縮めるとズーム
 */
function EmbedMap({ pins, onSelect, tod }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [shown, setShown] = useState<View>({ center: BEACH, zoom: 16 })
  const [pending, setPending] = useState<View | null>(null)
  const [off, setOff] = useState({ x: 0, y: 0, s: 1 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ x: number; y: number; dist: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const me = useMyLocation()

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const target = pending ?? shown
  const goTo = (v: View) => {
    const next = { center: clampCenter(v.center), zoom: Math.min(19, Math.max(14, v.zoom)) }
    if (embedSrc(next.center, next.zoom) === embedSrc(shown.center, shown.zoom)) {
      setPending(null)
      setOff({ x: 0, y: 0, s: 1 })
    } else setPending(next)
  }

  useEffect(() => {
    // 現在地ボタンを押した直後の1回だけ寄せる
    if (me.state === 'on' && me.pos && inBounds(me.pos)) goTo({ center: me.pos, zoom: Math.max(target.zoom, 17) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.state])

  const c = project(shown.center, shown.zoom)
  const place = (p: LatLng) => {
    const q = project(p, shown.zoom)
    return { left: size.w / 2 + (q.x - c.x) * off.s + off.x, top: size.h / 2 + (q.y - c.y) * off.s + off.y }
  }

  const twoFingerDist = () => {
    const [a, b] = [...pointers.current.values()]
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
  }
  const mid = () => {
    const ps = [...pointers.current.values()]
    return { x: ps.reduce((t, p) => t + p.x, 0) / ps.length, y: ps.reduce((t, p) => t + p.y, 0) / ps.length }
  }

  const onDown = (e: ReactPointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const m = mid()
    gesture.current = { x: m.x - off.x, y: m.y - off.y, dist: twoFingerDist() / off.s || 0, moved: gesture.current?.moved ?? false }
  }
  const onMove = (e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const m = mid()
    const g = gesture.current
    let x = m.x - g.x
    let y = m.y - g.y
    if (!g.moved && Math.hypot(x - off.x, y - off.y) < 6 && pointers.current.size < 2) return
    if (!g.moved) {
      g.moved = true
      box.current?.setPointerCapture(e.pointerId)
    }
    let s = off.s
    if (pointers.current.size >= 2 && g.dist > 0) s = Math.min(4, Math.max(0.25, twoFingerDist() / g.dist))
    // 読み込んである地図（画面の2倍）の外が見えないところまで
    x = Math.max(-size.w / 2, Math.min(size.w / 2, x))
    y = Math.max(-size.h / 2, Math.min(size.h / 2, y))
    setOff({ x, y, s })
  }
  const onUp = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId)
    const g = gesture.current
    if (pointers.current.size > 0) {
      // 2本指のうち1本が離れた：残った指で続ける
      const m = mid()
      gesture.current = g && { ...g, x: m.x - off.x, y: m.y - off.y, dist: twoFingerDist() / off.s || 0 }
      return
    }
    gesture.current = null
    if (!g?.moved) return
    suppressClick.current = true
    window.setTimeout(() => (suppressClick.current = false), 0)
    const dz = Math.round(Math.log2(off.s))
    const centerPx = { x: c.x - off.x / off.s, y: c.y - off.y / off.s }
    goTo({ center: unproject(centerPx.x, centerPx.y, shown.zoom), zoom: shown.zoom + dz })
  }

  const shownSrc = embedSrc(shown.center, shown.zoom)
  const pendingSrc = pending && embedSrc(pending.center, pending.zoom)

  return (
    <div
      className="gmap gmap-pan"
      ref={box}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          e.stopPropagation()
          e.preventDefault()
        }
      }}
    >
      <div className="gmap-layer" style={{ transform: `translate(${off.x}px, ${off.y}px) scale(${off.s})` }}>
        <iframe key={shownSrc} src={shownSrc} title="渋川海岸の Google マップ" referrerPolicy="no-referrer-when-downgrade" tabIndex={-1} />
      </div>
      {pendingSrc && (
        <div className="gmap-layer gmap-pending">
          <iframe
            key={pendingSrc}
            src={pendingSrc}
            title="渋川海岸の Google マップ（読み込み中）"
            referrerPolicy="no-referrer-when-downgrade"
            tabIndex={-1}
            onLoad={() => {
              // 新しい地図が描かれるまで少し待ってから入れ替える
              window.setTimeout(() => {
                setShown(pending)
                setPending(null)
                setOff({ x: 0, y: 0, s: 1 })
              }, 250)
            }}
          />
        </div>
      )}
      <div className={`gmap-light gmap-${tod}`} aria-hidden="true" />
      {size.w > 0 &&
        pins.map((pin) => {
          const p = place(pinToLatLng(pin.x, pin.y))
          if (p.left < -30 || p.top < -30 || p.left > size.w + 30 || p.top > size.h + 30) return null
          return <PinButton key={pin.id} pin={pin} onSelect={onSelect} style={{ left: p.left, top: p.top }} />
        })}
      {me.pos && size.w > 0 && <span className="me-dot" style={place(me.pos)} aria-label="現在地" role="img" />}
      <div className="gmap-tools" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" className="map-fab" aria-label="ズームイン" onClick={() => goTo({ center: target.center, zoom: target.zoom + 1 })}>
          ＋
        </button>
        <button type="button" className="map-fab" aria-label="ズームアウト" onClick={() => goTo({ center: target.center, zoom: target.zoom - 1 })}>
          －
        </button>
        <button
          type="button"
          className={'map-fab' + (me.state === 'on' ? ' on' : me.state === 'waiting' ? ' waiting' : '')}
          aria-label="現在地を表示"
          onClick={() => {
            if (me.state === 'on' && me.pos && inBounds(me.pos)) goTo({ center: me.pos, zoom: Math.max(target.zoom, 17) })
            else if (me.state === 'on') goTo({ center: BEACH, zoom: 16 })
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
