import { Link, Navigate, useParams } from 'react-router-dom'
import { BackHeader, StatusChip } from '../components/Common'
import { CheckIcon, LockIcon } from '../components/Icons'
import PuzzleForm from '../components/PuzzleForm'
import { PlaceHintCard } from '../components/TreasureArt'
import { isGuidepostOpen, progressOf, useGame } from '../lib/game'

// 宝の道標：解くと、お宝の場所のヒント（画像・説明）が見られる
export default function LocatePuzzle() {
  const { id = '' } = useParams()
  const { me, content } = useGame()
  const t = content.treasures.find((x) => x.id === id)
  if (!t || !isGuidepostOpen(me, content, t)) return <Navigate to="/guideposts" replace />
  const p = progressOf(me, t.id)
  const solved = p.state !== 'locked'
  const area = content.areas.find((a) => a.id === t.area_id)

  return (
    <div className="screen">
      <BackHeader title="宝の道標" sub={`${area?.name ?? ''}・No.${t.no}`} right={<StatusChip state={p.state} />} />
      <div className="page stack-16">
        <section className="card stack-12">
          <span className="eyebrow">宝の道標 No.{t.no}</span>
          <p className="puzzle-text">{t.locate_question}</p>
        </section>

        {solved ? (
          <p className="ok-msg">
            <CheckIcon size={18} />
            正解！お宝の場所のヒントが届きました
          </p>
        ) : (
          <PuzzleForm
            treasureId={t.id}
            kind="locate"
            hints={t.locate_hints}
            hintsUsed={p.locate_hints}
            submitLabel="答える"
            onCorrect={() => undefined}
          />
        )}

        {solved ? (
          <section className="card card-accent stack-12">
            <PlaceHintCard hint={me.placeHints[t.id]} />
            {p.state === 'located' && (
              <>
                <p className="small muted">現地でお宝のQRコードを見つけて読み込もう。</p>
                <Link to="/scan" className="btn btn-primary">
                  QRを読み込む
                </Link>
              </>
            )}
            {p.state === 'found' && (
              <Link to={`/found/${t.id}`} className="btn btn-primary">
                鍵のかかった宝箱の謎へ
              </Link>
            )}
            {p.state === 'acquired' && (
              <Link to={`/got/${t.id}`} className="btn btn-outline">
                獲得したお宝を見る
              </Link>
            )}
          </section>
        ) : (
          <section className="locked-box">
            <span className="locked-icon">
              <LockIcon size={22} />
            </span>
            <div>
              <h2>お宝の場所のヒント</h2>
              <p>正解すると、場所の画像や説明が表示されます</p>
            </div>
          </section>
        )}

        <Link to="/guideposts" className="btn btn-text">
          ほかの宝の道標を見る
        </Link>
      </div>
    </div>
  )
}
