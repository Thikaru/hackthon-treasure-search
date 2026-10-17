import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { ChestArt, TreasureArt, treasureKind } from '../components/Art'
import { Sparkles } from '../components/Common'
import UnityStage from '../components/UnityStage'
import { acquiredCount, areaCounts, progressOf, useGame } from '../lib/game'
import { useTimeOfDay } from '../lib/useTimeOfDay'

// お宝獲得：開いた宝箱から、光とともにお宝がせり上がる（Unity。使えない端末では SVG）
export default function Acquired() {
  const { id = '' } = useParams()
  const [q] = useSearchParams()
  const { me, content } = useGame()
  const tod = useTimeOfDay()
  const t = content.treasures.find((x) => x.id === id)
  if (!t) return <Navigate to="/home" replace />
  if (progressOf(me, t.id).state !== 'acquired') return <Navigate to={`/puzzle/${t.id}`} replace />

  const fresh = q.get('new') === '1'
  const area = content.areas.find((a) => a.id === t.area_id)
  const ac = areaCounts(me, content, t.area_id)
  const got = acquiredCount(me)
  const clearCount = content.settings.clearCount
  const cleared = got >= clearCount

  return (
    <div className={'screen got' + (fresh ? ' fresh' : '')}>
      <div className="got-burst" aria-hidden="true" />
      <Sparkles count={26} seed={33} />
      <p className="got-banner">{fresh ? 'お宝を手に入れた！' : `No.${t.no} のお宝`}</p>

      <UnityStage
        scene="reveal"
        tod={tod}
        kind={treasureKind(t.name)}
        fresh={fresh}
        sceneKey={`reveal:${t.id}:${tod}:${fresh ? 'new' : 'see'}`}
        label={`${t.name}（指でなぞると宝箱が回ります）`}
        fallback={
          <div className="got-fallback">
            <span className="beams" aria-hidden="true" />
            <TreasureArt name={t.name} size={132} className="art-treasure float" />
            <ChestArt size={210} open />
          </div>
        }
      />

      <section className="got-card paper">
        <span className="chip chip-acquired">獲得・No.{t.no}</span>
        <h1>{t.name}</h1>
        <p className="desc">{t.description}</p>
        <div className="counter">
          <div>
            <small>{area?.name}</small>
            <b>
              {ac.got}
              <span> / {ac.total}</span>
            </b>
          </div>
          <div>
            <small>{cleared ? 'クリア条件' : 'クリアまで'}</small>
            <b>{cleared ? '達成！' : <>あと{clearCount - got}<span> 個</span></>}</b>
          </div>
        </div>
        <div className="got-actions">
          {cleared ? (
            <Link to="/certificate" className="btn btn-primary btn-lg">
              クリア証明を見る
            </Link>
          ) : (
            <Link to="/home" className="btn btn-primary btn-lg">
              次の謎へ
            </Link>
          )}
          <Link to="/treasures" className="btn btn-paper">
            お宝の飾り棚を見る
          </Link>
        </div>
      </section>
    </div>
  )
}
