import { useState } from 'react'
import { Link } from 'react-router-dom'
import AreaMap, { type MapPin } from '../components/AreaMap'
import { StatusChip } from '../components/Common'
import { HelpIcon } from '../components/Icons'
import { acquiredCount, progressOf, useGame, type Treasure } from '../lib/game'
import { GuidepostRow } from './Guideposts'

// 地図に出すのは QR を読んだお宝（宝箱発見・獲得）だけ。場所はヒントの画像・説明で探す
const onMap = (st: string) => st === 'found' || st === 'acquired'

export default function Home() {
  const { me, content } = useGame()
  const { treasures, areas, settings } = content
  const firstFound = treasures.find((t) => progressOf(me, t.id).state === 'found')
  const firstOpen = treasures.find((t) => progressOf(me, t.id).state !== 'acquired')
  const [areaId, setAreaId] = useState<string>(firstFound?.area_id ?? firstOpen?.area_id ?? areas[0]?.id ?? '')
  const [picked, setPicked] = useState<string | null>(null)

  const got = acquiredCount(me)
  const total = treasures.length
  const cleared = got >= settings.clearCount
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
  const waiting = inArea.filter((t) => progressOf(me, t.id).state === 'found').length

  return (
    <div className="screen home">
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

      <section className="sheet" aria-live="polite">
        <span className="sheet-handle" aria-hidden="true" />
        {selected ? (
          <SheetFor t={selected} onClose={() => setPicked(null)} />
        ) : (
          <>
            <div className="between">
              <h2 className="sheet-title">宝の道標（{area?.short_name}）</h2>
              <Link to="/guideposts" className="small bold">
                すべての道標を見る
              </Link>
            </div>
            {waiting > 0 && <p className="sheet-text accent-text">地図の宝箱をタップすると、鍵の謎にどこからでも回答できます。</p>}
            <div className="gp-scroll">
              {inArea.map((t) => (
                <GuidepostRow key={t.id} t={t} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
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
