import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BackHeader, StatusChip } from '../components/Common'
import { LockIcon } from '../components/Icons'
import { progressOf, useGame, visibleGuideposts, type Treasure, type TreasureState } from '../lib/game'

function linkFor(t: Treasure, st: TreasureState) {
  if (st === 'acquired') return `/got/${t.id}`
  if (st === 'found') return `/found/${t.id}`
  return `/puzzle/${t.id}`
}

/** 宝の道標の1件（一覧・ホームで共通） */
export function GuidepostRow({ t }: { t: Treasure }) {
  const { me } = useGame()
  const st = progressOf(me, t.id).state
  return (
    <Link to={linkFor(t, st)} className={`gp-row gp-${st}`}>
      <span className="gp-no">{t.no}</span>
      <span className="gp-body">
        <span className="gp-q">{t.locate_question}</span>
        <span className="gp-meta">
          <StatusChip state={st} />
          {st === 'found' && <span className="small gp-next">宝箱の謎が待っています</span>}
          {st === 'located' && <span className="small gp-next">QRを探しに行こう</span>}
        </span>
      </span>
    </Link>
  )
}

/** 1つずつ表示モードで、まだ現れていない道標の数を示す行 */
export function HiddenGuideposts({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <div className="gp-row gp-hidden" aria-label={`まだ現れていない宝の道標 ${count} 問`}>
      <span className="gp-no">
        <LockIcon size={16} />
      </span>
      <span className="gp-body">
        <span className="gp-q">ほかに {count} 問の宝の道標が眠っています</span>
        <span className="small muted">上の道標を解くと、次の道標が現れます</span>
      </span>
    </div>
  )
}

// 宝の道標の一覧。全問表示モードでは全問、1つずつモードでは解いた分＋次の1問を表示
export default function Guideposts() {
  const { me, content } = useGame()
  const [filter, setFilter] = useState<string>('all')
  const areas = content.areas.filter((a) => filter === 'all' || a.id === filter)
  const solved = content.treasures.filter((t) => progressOf(me, t.id).state !== 'locked').length
  const sequential = content.settings.guidepostMode === 'sequential'

  return (
    <div className="screen">
      <BackHeader title="宝の道標" sub={`全${content.treasures.length}問・${solved}問クリア`} to="/home" />
      <div className="page stack-14">
        <p className="small muted lh">
          道標の謎を解くと、お宝の場所のヒントが届きます。
          {sequential ? '道標は1つずつ現れます。解くと次の道標が現れます。' : 'どの道標からでも挑戦できます。'}
        </p>
        <div className="chips" role="group" aria-label="エリアで絞り込み">
          <button type="button" aria-pressed={filter === 'all'} className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>
            すべて
          </button>
          {content.areas.map((a) => (
            <button key={a.id} type="button" aria-pressed={filter === a.id} className={filter === a.id ? 'on' : ''} onClick={() => setFilter(a.id)}>
              {a.short_name}
            </button>
          ))}
        </div>
        {areas.map((a) => (
          <section key={a.id} className="stack-10">
            <h2 className="section-title">
              {a.name}
              {a.needs_car && <span className="tag">車推奨</span>}
            </h2>
            {(() => {
              const g = visibleGuideposts(me, content, a.id)
              return (
                <>
                  {g.visible.map((t) => (
                    <GuidepostRow key={t.id} t={t} />
                  ))}
                  <HiddenGuideposts count={g.hiddenCount} />
                </>
              )
            })()}
          </section>
        ))}
      </div>
    </div>
  )
}
