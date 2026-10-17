import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import AreaMap, { type MapPin } from '../components/AreaMap'
import { StatusChip } from '../components/Common'
import { ChestIcon, HelpIcon } from '../components/Icons'
import { currentGuidepost, progressOf, useGame, type Treasure } from '../lib/game'
import { GuidepostRow } from './Guideposts'

// 地図に出すのは QR を読んだお宝（宝箱発見・獲得）だけ。場所はヒントの画像・説明で探す
const onMap = (st: string) => st === 'found' || st === 'acquired'

export default function Home() {
  const { me, content } = useGame()
  const { treasures, areas } = content
  const firstFound = treasures.find((t) => progressOf(me, t.id).state === 'found')
  const firstOpen = treasures.find((t) => progressOf(me, t.id).state !== 'acquired')
  const [areaId, setAreaId] = useState<string>(firstFound?.area_id ?? firstOpen?.area_id ?? areas[0]?.id ?? '')
  const [picked, setPicked] = useState<string | null>(null)

  const area = areas.find((a) => a.id === areaId)

  const inArea = treasures.filter((t) => t.area_id === areaId)
  const pins: MapPin[] = inArea
    .filter((t) => onMap(progressOf(me, t.id).state))
    .map((t) => ({
      id: t.id,
      no: t.no,
      x: t.pin_x,
      y: t.pin_y,
      state: progressOf(me, t.id).state,
      selected: t.id === picked,
    }))
  const selected = picked ? inArea.find((t) => t.id === picked && onMap(progressOf(me, t.id).state)) : undefined
  const current = currentGuidepost(me, content, areaId)

  // シート：ハンドルで上げ下げでき、表示内容が変わるときは前の内容が下がってから次の内容が下から出てくる
  const [open, setOpen] = useState(true)
  const sheetKey = selected ? `pin:${selected.id}` : `gp:${current?.id ?? 'done'}`
  const [shownKey, setShownKey] = useState(sheetKey)
  const [entering, setEntering] = useState(false)
  const animate = open && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const leaving = sheetKey !== shownKey && animate
  useEffect(() => {
    if (sheetKey === shownKey) return
    // 前の内容が下がり切ってから差し替える（シートが下がっているときはすぐ差し替える）
    const timer = window.setTimeout(
      () => {
        setShownKey(sheetKey)
        setEntering(true)
      },
      animate ? 200 : 0,
    )
    return () => window.clearTimeout(timer)
  }, [sheetKey, shownKey, animate])

  const shownPin = shownKey.startsWith('pin:') ? treasures.find((t) => `pin:${t.id}` === shownKey) : undefined
  const shownGuidepost = shownKey.startsWith('gp:') ? treasures.find((t) => `gp:${t.id}` === shownKey) : undefined

  const dragStart = useRef<number | null>(null)
  const onGripDown = (e: PointerEvent<HTMLButtonElement>) => {
    dragStart.current = e.clientY
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onGripUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (dragStart.current === null) return
    const dy = e.clientY - dragStart.current
    dragStart.current = null
    if (dy > 24) setOpen(false)
    else if (dy < -24) setOpen(true)
    else setOpen((o) => !o)
  }

  return (
    <div className="screen home">
      <header className="home-header">
        <h1>{me.player?.nickname} さん</h1>
        <Link to="/help" className="icon-btn" aria-label="遊び方・ヘルプ">
          <HelpIcon size={22} />
        </Link>
      </header>

      <div className="segmented" role="group" aria-label="表示するエリア">
        {areas.map((a) => (
          <button
            key={a.id}
            type="button"
            aria-pressed={a.id === areaId}
            className={a.id === areaId ? 'on' : ''}
            onClick={() => {
              setAreaId(a.id)
              setPicked(null)
            }}
          >
            {a.short_name}
          </button>
        ))}
      </div>

      <div className="map-wrap">
        <AreaMap
          areaId={areaId}
          areaName={area?.name ?? ''}
          pins={pins}
          onSelect={(id) => {
            setPicked(id)
            setOpen(true)
          }}
        />
        <div className="map-legend">
          <span>
            <i className="dot dot-found" />
            宝箱発見（鍵の謎あり）
          </span>
          <span>
            <i className="dot dot-acquired" />
            獲得
          </span>
        </div>
        {area?.needs_car && <span className="map-badge">車での移動がおすすめ</span>}
      </div>

      <section className={'sheet' + (open ? '' : ' collapsed')} aria-live="polite">
        <button
          type="button"
          className="sheet-grip"
          aria-expanded={open}
          aria-label={open ? 'パネルを下げる' : 'パネルを上げる'}
          onPointerDown={onGripDown}
          onPointerUp={onGripUp}
          onPointerCancel={() => (dragStart.current = null)}
          onClick={(e) => {
            // キーボード操作（ポインター以外）のときだけここで開閉する
            if (e.detail === 0) setOpen((o) => !o)
          }}
        >
          <span className="sheet-handle" />
        </button>
        <div className="sheet-fold" inert={!open}>
          <div className="sheet-fold-inner">
            <div className="home-actions">
              <Link to="/scan" className="btn btn-primary grow">
                <QrIcon />
                QRを読み込む
              </Link>
              <Link to="/treasures" className="btn btn-outline">
                <ChestIcon size={20} />
                お宝
              </Link>
            </div>
            <div className="sheet-clip">
              <div
                key={shownKey}
                className={'sheet-panel' + (leaving ? ' leaving' : entering ? ' entering' : '')}
                onAnimationEnd={() => setEntering(false)}
              >
                {shownPin ? (
                  <SheetFor t={shownPin} onClose={() => setPicked(null)} />
                ) : shownGuidepost ? (
                  <GuidepostRow t={shownGuidepost} />
                ) : (
                  <p className="sheet-text">このエリアの道標はすべてクリアしました！</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function QrIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16" />
    </svg>
  )
}

function SheetFor({ t, onClose }: { t: Treasure; onClose: () => void }) {
  const { me, content } = useGame()
  const st = progressOf(me, t.id).state
  const area = content.areas.find((a) => a.id === t.area_id)
  return (
    <>
      <div className="sheet-head">
        <StatusChip state={st} />
        <h2>
          {area?.name}・No.{t.no}
          {st === 'acquired' && ` ${t.name}`}
        </h2>
      </div>
      {st === 'found' && (
        <>
          <p className="sheet-text">鍵のかかった宝箱を見つけました。鍵を開ける謎は、ここからいつでも回答できます。</p>
          <Link to={`/found/${t.id}`} className="btn btn-primary">
            鍵のかかった宝箱の謎を解く
          </Link>
        </>
      )}
      {st === 'acquired' && (
        <>
          <p className="sheet-text">{t.description}</p>
          <Link to={`/got/${t.id}`} className="btn btn-outline">
            お宝を見る
          </Link>
        </>
      )}
      <button type="button" className="btn btn-text" onClick={onClose}>
        宝の道標の一覧に戻る
      </button>
    </>
  )
}
