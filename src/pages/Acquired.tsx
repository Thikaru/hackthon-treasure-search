import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { CompassIcon } from '../components/Icons'
import { acquiredCount, areaCounts, progressOf, useGame } from '../lib/game'

export default function Acquired() {
  const { id = '' } = useParams()
  const [q] = useSearchParams()
  const { me, content } = useGame()
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
    <div className="screen got-screen">
      {fresh && (
        <svg className="confetti" viewBox="0 0 390 300" aria-hidden="true">
          <rect x="48" y="60" width="10" height="5" rx="2" fill="#D9472B" transform="rotate(30 53 62)" />
          <rect x="320" y="84" width="10" height="5" rx="2" fill="#1F4FB8" transform="rotate(-25 325 86)" />
          <rect x="86" y="190" width="8" height="4" rx="2" fill="#8EB2E2" transform="rotate(60 90 192)" />
          <rect x="300" y="210" width="9" height="4" rx="2" fill="#D9472B" transform="rotate(15 304 212)" />
          <circle cx="70" cy="128" r="4" fill="#D9B98A" />
          <circle cx="330" cy="150" r="5" fill="#D9B98A" />
          <circle cx="260" cy="40" r="3" fill="#1F4FB8" />
        </svg>
      )}
      <p className="got-kicker">{fresh ? 'GET!' : `No.${t.no}`}</p>
      <div className="got-badge">
        <CompassIcon size={84} stroke="#FFFFFF" strokeWidth={1.6} />
      </div>
      <h1 className="got-name">{t.name}</h1>
      <p className="got-desc">{t.description}</p>
      <section className="card stack-12 full">
        <div className="between">
          <b>{area?.name}</b>
          <span className="muted">
            <strong className="num-cobalt">{ac.got}</strong> / {ac.total}
          </span>
        </div>
        <div className="bar">
          <span className="bar-fill" style={{ width: `${ac.total ? (ac.got / ac.total) * 100 : 0}%` }} />
        </div>
        <div className="between divider-top">
          <b className="nowrap">ぜんぶで</b>
          <span className="muted nowrap">
            <strong className="num-deep">{got}</strong> / {content.treasures.length} 個
          </span>
        </div>
        <p className="progress-note">{cleared ? 'クリア条件を達成しました！' : `クリアまであと ${clearCount - got} 個`}</p>
      </section>
      <div className="stack-12 full push-bottom">
        {cleared ? (
          <Link to="/certificate" className="btn btn-primary btn-lg">
            クリア証明を見る
          </Link>
        ) : (
          <Link to="/home" className="btn btn-primary btn-lg">
            次の謎へ
          </Link>
        )}
        <Link to="/treasures" className="btn btn-outline">
          コレクションを見る
        </Link>
      </div>
    </div>
  )
}
