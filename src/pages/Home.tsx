import { useState } from 'react'
import { Link } from 'react-router-dom'
import AreaMap, { type MapPin } from '../components/AreaMap'
import { StatusChip } from '../components/Common'
import { HelpIcon } from '../components/Icons'
import TabBar from '../components/TabBar'
import { acquiredCount, progressOf, useGame, type Treasure } from '../lib/game'

export default function Home() {
  const { me, content } = useGame()
  const { treasures, areas, settings } = content
  const by = (st: string) => treasures.find((t) => progressOf(me, t.id).state === st)
  const next = by('found') ?? by('located') ?? by('locked')
  const [areaId, setAreaId] = useState<string>(next?.area_id ?? areas[0]?.id ?? '')
  const [picked, setPicked] = useState<string | null>(null)

  const got = acquiredCount(me)
  const total = treasures.length
  const cleared = got >= settings.clearCount
  const area = areas.find((a) => a.id === areaId)

  const inArea = treasures.filter((t) => t.area_id === areaId)
  const visible = inArea.filter((t) => progressOf(me, t.id).state !== 'locked')
  const defaultPick =
    next && next.area_id === areaId && progressOf(me, next.id).state !== 'locked'
      ? next.id
      : (visible.find((t) => progressOf(me, t.id).state !== 'acquired')?.id ?? null)
  const selectedId = picked && inArea.some((t) => t.id === picked) ? picked : defaultPick
  const pins: MapPin[] = visible.map((t) => ({
    id: t.id,
    no: t.no,
    x: t.pin_x,
    y: t.pin_y,
    state: progressOf(me, t.id).state,
    selected: t.id === selectedId,
  }))
  const selected = selectedId ? treasures.find((t) => t.id === selectedId) : undefined
  const lockedInArea = inArea.filter((t) => progressOf(me, t.id).state === 'locked')

  return (
    <div className="screen with-tabbar home">
      <header className="home-header">
        <h1>{me.player?.nickname} さん</h1>
        <Link to="/help" className="icon-btn" aria-label="遊び方・ヘルプ">
          <HelpIcon size={22} />
        </Link>
      </header>

      <Link to={cleared ? '/certificate' : '/treasures'} className={'progress-strip' + (cleared ? ' cleared' : '')}>
        <span className="progress-count">
          <b>{got}</b>/ {total} 個
        </span>
        <span className="progress-body">
          <span className="bar" role="img" aria-label={`${total}個中${got}個獲得、クリアは${settings.clearCount}個`}>
            <span className="bar-fill" style={{ width: `${total ? (got / total) * 100 : 0}%` }} />
            <span className="bar-goal" style={{ left: `${total ? (settings.clearCount / total) * 100 : 0}%` }} />
          </span>
          <span className="progress-note">
            {cleared ? 'クリア！受付で証明を見せよう' : `クリアまであと ${Math.max(0, settings.clearCount - got)} 個`}
          </span>
        </span>
      </Link>

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
        <AreaMap areaId={areaId} areaName={area?.name ?? ''} pins={pins} onSelect={setPicked} />
        <div className="map-legend">
          <span>
            <i className="dot dot-located" />
            場所判明
          </span>
          <span>
            <i className="dot dot-found" />
            発見
          </span>
          <span>
            <i className="dot dot-acquired" />
            獲得
          </span>
        </div>
        {area?.needs_car && <span className="map-badge">車での移動がおすすめ</span>}
      </div>

      <section className="sheet" aria-live="polite">
        <span className="sheet-handle" aria-hidden="true" />
        {selected ? (
          <SheetFor t={selected} />
        ) : lockedInArea.length > 0 ? (
          <>
            <div className="sheet-head">
              <StatusChip state="locked" />
              <h2>まだ場所が分からないお宝 {lockedInArea.length} 個</h2>
            </div>
            <p className="sheet-text">謎を解くと、お宝の場所が地図に表示されます。</p>
            <Link to={`/puzzle/${lockedInArea[0].id}`} className="btn btn-primary">
              No.{lockedInArea[0].no} の謎に挑戦
            </Link>
          </>
        ) : (
          <>
            <div className="sheet-head">
              <StatusChip state="acquired" />
              <h2>このエリアのお宝はすべて獲得！</h2>
            </div>
            <Link to="/treasures" className="btn btn-outline">
              コレクションを見る
            </Link>
          </>
        )}
      </section>
      <TabBar />
    </div>
  )
}

function SheetFor({ t }: { t: Treasure }) {
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
      {st === 'located' && (
        <>
          <p className="sheet-text">{me.placeHints[t.id]}</p>
          <div className="row-8">
            <Link to="/scan" className="btn btn-primary grow">
              QRを読み込む
            </Link>
            <Link to={`/puzzle/${t.id}`} className="btn btn-outline">
              謎を見返す
            </Link>
          </div>
        </>
      )}
      {st === 'found' && (
        <>
          <p className="sheet-text">お宝は見つけました。最後の「獲得の謎」を解こう。</p>
          <Link to={`/found/${t.id}`} className="btn btn-primary">
            獲得の謎へ
          </Link>
        </>
      )}
      {st === 'acquired' && (
        <>
          <p className="sheet-text">{t.description}</p>
          <Link to="/treasures" className="btn btn-outline">
            コレクションを見る
          </Link>
        </>
      )}
    </>
  )
}
