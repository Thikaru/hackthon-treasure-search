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

const MAX_ZOOM = 19
// 埋め込み地図を読み込む細かさの上限。これより寄るときは、この細かさの地図を拡大して見せる
// （19 で範囲全体を読み込むと地図が大きくなりすぎ、スマホのメモリが足りなくなるため）
const MAX_TILE_ZOOM = 18
const MARGIN = 48

interface Pt {
  x: number
  y: number
}

// 動ける範囲とズームの上限・下限は、もとの Web 版（Leaflet）と同じにする：
// ・表示は渋川の範囲（BOUNDS）の中だけ。範囲の外は見せない
// ・いちばん引いたときに、渋川の範囲がちょうど画面いっぱいになる（minZoom）。いちばん寄ると 19
const B0 = (() => {
  const nw = project({ lat: BOUNDS.north, lng: BOUNDS.west }, 0)
  const se = project({ lat: BOUNDS.south, lng: BOUNDS.east }, 0)
  return { x0: nw.x, y0: nw.y, x1: se.x, y1: se.y }
})()

function minZoomFor(w: number, h: number) {
  for (let z = 12; z < MAX_ZOOM; z++) {
    const k = 2 ** z
    if ((B0.x1 - B0.x0) * k >= w && (B0.y1 - B0.y0) * k >= h) return z
  }
  return MAX_ZOOM
}

/** 画面の中心（ズーム0の座標）を、ズーム zf の画面が渋川の範囲からはみ出さない位置に収める */
function clampCenter0(c: Pt, zf: number, w: number, h: number): Pt {
  const k = 2 ** zf
  const hw = w / 2 / k
  const hh = h / 2 / k
  const x = B0.x1 - B0.x0 <= 2 * hw ? (B0.x0 + B0.x1) / 2 : Math.min(B0.x1 - hw, Math.max(B0.x0 + hw, c.x))
  const y = B0.y1 - B0.y0 <= 2 * hh ? (B0.y0 + B0.y1) / 2 : Math.min(B0.y1 - hh, Math.max(B0.y0 + hh, c.y))
  return { x, y }
}

/** ズーム z で、渋川の範囲全体（＋少し余白）を1枚に収めた埋め込み地図 */
function sheetFor(z: number) {
  const k = 2 ** z
  const w = Math.ceil((B0.x1 - B0.x0) * k) + MARGIN * 2
  const h = Math.ceil((B0.y1 - B0.y0) * k) + MARGIN * 2
  const mid = { x: (B0.x0 + B0.x1) / 2, y: (B0.y0 + B0.y1) / 2 }
  const c = unproject(mid.x * k, mid.y * k, z)
  return {
    z,
    w,
    h,
    // 埋め込み地図は ll を地図の真ん中に描くので、左上はそこから半分ずつ戻した位置
    left0: mid.x - w / 2 / k,
    top0: mid.y - h / 2 / k,
    src: `https://maps.google.com/maps?ll=${c.lat.toFixed(6)},${c.lng.toFixed(6)}&z=${z}&t=m&hl=ja&output=embed`,
  }
}

/**
 * 鍵のいらない埋め込み地図は外から動かせないので、指・マウスの操作はこちらで受ける。
 * 渋川の範囲全体を1枚の地図として最初に読み込み、移動・ズームはその地図をずらす・拡大するだけにする
 * （動かすたびに地図を読み直さない）。読み込む細かさが変わるとき（ズームの段が変わるとき）だけ、
 * 新しい地図を裏で読み込んでから入れ替える。
 * マウスホイール・トラックパッドのピンチ・2本指でズームし、ブラウザ自体の拡大にはさせない。
 */
function EmbedMap({ pins, onSelect, tod }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  // 表示：画面の中心（ズーム0の座標）と、ズーム（操作中は小数）
  const [view, setView] = useState(() => ({ c: project(BEACH, 0), zf: 17 }))
  const [smooth, setSmooth] = useState(false)
  const [tileZ, setTileZ] = useState(17)
  const [pendingZ, setPendingZ] = useState<number | null>(null)
  const pointers = useRef(new Map<number, Pt>())
  const gesture = useRef<{ anchor: Pt; dist: number; z0: number; start: Pt; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const wheelTimer = useRef(0)
  const me = useMyLocation()
  const minZoom = size.w > 0 ? minZoomFor(size.w, size.h) : 14

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const clampView = (v: { c: Pt; zf: number }) => {
    if (size.w === 0) return v
    const zf = Math.min(MAX_ZOOM, Math.max(minZoom, v.zf))
    return { c: clampCenter0(v.c, zf, size.w, size.h), zf }
  }

  // 画面の大きさが分かったら、最初の表示を範囲に収める
  const sized = size.w > 0
  useEffect(() => {
    if (!sized) return
    setView((v) => clampView({ c: v.c, zf: Math.max(minZoom, Math.round(v.zf)) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sized, minZoom])

  /** 操作を終えたら、ズームを整数にそろえる（なめらかに）。読み込む細かさが変わるときだけ地図を読み直す */
  const settle = (v: { c: Pt; zf: number }) => {
    const z = Math.min(MAX_ZOOM, Math.max(minZoom, Math.round(v.zf)))
    const next = clampView({ c: v.c, zf: z })
    setSmooth(true)
    setView(next)
    window.setTimeout(() => setSmooth(false), 260)
    const want = Math.min(MAX_TILE_ZOOM, z)
    if (want !== tileZ) setPendingZ(want)
    else setPendingZ(null)
  }

  const goTo = (center: LatLng, z: number) => settle({ c: project(center, 0), zf: z })

  useEffect(() => {
    // 現在地ボタンを押した直後の1回だけ寄せる
    if (me.state === 'on' && me.pos && inBounds(me.pos)) goTo(me.pos, Math.max(Math.round(view.zf), 17))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.state])

  const k = 2 ** view.zf
  /** ズーム0の座標 → 画面上の位置 */
  const toScreen = (p: Pt) => ({ left: size.w / 2 + (p.x - view.c.x) * k, top: size.h / 2 + (p.y - view.c.y) * k })
  const toWorld = (sx: number, sy: number) => ({ x: view.c.x + (sx - size.w / 2) / k, y: view.c.y + (sy - size.h / 2) / k })
  const place = (p: LatLng) => toScreen(project(p, 0))

  const local = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  // マウスホイール・トラックパッドのピンチ（Chrome では ctrl 付きの wheel）で地図をズームし、ページは拡大させない
  const latest = useRef({ view, toWorld, clampView, settle, size })
  latest.current = { view, toWorld, clampView, settle, size }
  useEffect(() => {
    const el = box.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const L = latest.current
      const r = el.getBoundingClientRect()
      const sx = e.clientX - r.left
      const sy = e.clientY - r.top
      const anchor = L.toWorld(sx, sy)
      const zf = L.view.zf - e.deltaY * (e.ctrlKey ? 0.012 : 0.003)
      const kk = 2 ** Math.min(MAX_ZOOM, Math.max(0, zf))
      // カーソルの下の地点が動かないようにズームする
      const next = L.clampView({ c: { x: anchor.x - (sx - L.size.w / 2) / kk, y: anchor.y - (sy - L.size.h / 2) / kk }, zf })
      latest.current.view = next
      setView(next)
      window.clearTimeout(wheelTimer.current)
      wheelTimer.current = window.setTimeout(() => latest.current.settle(latest.current.view), 220)
    }
    const stop = (e: Event) => e.preventDefault()
    el.addEventListener('wheel', onWheel, { passive: false })
    // スマホでは上下になぞると、地図より先にブラウザ（ページのスクロール・引っぱって更新・アドレスバーの出し入れ）が
    // 指の動きを取ってしまう。iPhone のブラウザは CSS の touch-action を十分に守らないので、
    // 地図の上で指を動かしたときはブラウザの動作を止め、地図だけが動くようにする
    // （touchstart は止めないので、宝箱ピンのタップはそのまま効く）
    el.addEventListener('touchmove', stop, { passive: false })
    // iPhone の Safari の2本指ジェスチャー（ページの拡大）も止める
    el.addEventListener('gesturestart', stop)
    el.addEventListener('gesturechange', stop)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchmove', stop)
      el.removeEventListener('gesturestart', stop)
      el.removeEventListener('gesturechange', stop)
    }
  }, [])

  // 地図の外で指を離しても記録を消す（ページ全体で「離した」合図を受ける）
  const upRef = useRef<(e: PointerEvent) => void>(() => undefined)
  useEffect(() => {
    const f = (e: PointerEvent) => upRef.current(e)
    window.addEventListener('pointerup', f)
    window.addEventListener('pointercancel', f)
    return () => {
      window.removeEventListener('pointerup', f)
      window.removeEventListener('pointercancel', f)
    }
  }, [])

  const mid = () => {
    const ps = [...pointers.current.values()]
    return { x: ps.reduce((t, p) => t + p.x, 0) / ps.length, y: ps.reduce((t, p) => t + p.y, 0) / ps.length }
  }
  const spread = () => {
    const [a, b] = [...pointers.current.values()]
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
  }
  /** 指が増えた・減ったときに、いまの指の位置を基準に取り直す */
  const restart = (moved: boolean) => {
    const m = mid()
    gesture.current = { anchor: toWorld(m.x, m.y), dist: spread(), z0: view.zf, start: m, moved }
  }

  const onDown = (e: ReactPointerEvent) => {
    // スマホでは、地図の外で指を離したときなどに「離した」合図が届かず、離れたはずの指が残ることがある。
    // 残ったままだと次の1本指の移動が「2本指で広げた」と判定されてズームになってしまうので、
    // 新しく触れた最初の指（isPrimary）では、前の指の記録を捨ててから始める
    if (e.isPrimary) {
      pointers.current.clear()
      gesture.current = null
    }
    pointers.current.set(e.pointerId, local(e))
    restart(gesture.current?.moved ?? false)
  }
  const onMove = (e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return
    pointers.current.set(e.pointerId, local(e))
    const g = gesture.current
    const m = mid()
    if (!g.moved && Math.hypot(m.x - g.start.x, m.y - g.start.y) < 6 && pointers.current.size < 2) return
    if (!g.moved) {
      g.moved = true
      box.current?.setPointerCapture(e.pointerId)
    }
    const zf = pointers.current.size >= 2 && g.dist > 0 ? g.z0 + Math.log2(spread() / g.dist) : view.zf
    const kk = 2 ** Math.min(MAX_ZOOM, Math.max(minZoom, zf))
    // 指の下の地点が指についてくるように動かす
    setView(clampView({ c: { x: g.anchor.x - (m.x - size.w / 2) / kk, y: g.anchor.y - (m.y - size.h / 2) / kk }, zf }))
  }
  const onUp = (e: { pointerId: number }) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.delete(e.pointerId)
    const g = gesture.current
    if (pointers.current.size > 0) {
      restart(g?.moved ?? false)
      return
    }
    gesture.current = null
    if (!g?.moved) return
    suppressClick.current = true
    window.setTimeout(() => (suppressClick.current = false), 0)
    settle(view)
  }
  upRef.current = onUp

  const layer = (z: number) => {
    const sh = sheetFor(z)
    const p = toScreen({ x: sh.left0, y: sh.top0 })
    const scale = 2 ** (view.zf - z)
    return { sh, style: { width: sh.w, height: sh.h, transform: `translate(${p.left}px, ${p.top}px) scale(${scale})` } as CSSProperties }
  }
  const cur = layer(tileZ)
  const next = pendingZ !== null ? layer(pendingZ) : null
  const zInt = Math.round(view.zf)

  return (
    <div
      className={'gmap gmap-pan' + (smooth ? ' smooth' : '')}
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
      <div className={'gmap-sheet' + (smooth ? ' smooth' : '')} style={cur.style}>
        <iframe key={cur.sh.src} src={cur.sh.src} title="渋川海岸の Google マップ" referrerPolicy="no-referrer-when-downgrade" tabIndex={-1} />
      </div>
      {next && (
        <div className={'gmap-sheet gmap-pending' + (smooth ? ' smooth' : '')} style={next.style}>
          <iframe
            key={next.sh.src}
            src={next.sh.src}
            title="渋川海岸の Google マップ（読み込み中）"
            referrerPolicy="no-referrer-when-downgrade"
            tabIndex={-1}
            onLoad={() => {
              // 新しい細かさの地図が描かれるまで少し待ってから入れ替える
              window.setTimeout(() => {
                setTileZ(next.sh.z)
                setPendingZ(null)
              }, 300)
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
      <span className="gmap-credit" aria-hidden="true">
        地図 © Google
      </span>
      <div className="gmap-tools" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" className="map-fab" aria-label="ズームイン" disabled={zInt >= MAX_ZOOM} onClick={() => settle({ c: view.c, zf: zInt + 1 })}>
          ＋
        </button>
        <button type="button" className="map-fab" aria-label="ズームアウト" disabled={zInt <= minZoom} onClick={() => settle({ c: view.c, zf: zInt - 1 })}>
          －
        </button>
        <button
          type="button"
          className={'map-fab' + (me.state === 'on' ? ' on' : me.state === 'waiting' ? ' waiting' : '')}
          aria-label="現在地を表示"
          onClick={() => {
            if (me.state === 'on' && me.pos && inBounds(me.pos)) goTo(me.pos, Math.max(zInt, 17))
            else if (me.state === 'on') goTo(BEACH, minZoom)
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
      maxZoom: 19,
      disableDefaultUI: true,
      clickableIcons: false,
      gestureHandling: 'greedy',
      // もとの Web 版と同じく、渋川の範囲の外へは動かせず、範囲が画面いっぱいになるところまでしか引けない
      restriction: { latLngBounds: BOUNDS, strictBounds: true },
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
