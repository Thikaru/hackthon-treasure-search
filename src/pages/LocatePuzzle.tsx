import { Link, Navigate, useParams } from 'react-router-dom'
import { BackHeader, StatusChip } from '../components/Common'
import { CheckIcon, LockIcon, PinIcon } from '../components/Icons'
import PuzzleForm from '../components/PuzzleForm'
import { progressOf, useGame } from '../lib/game'

export default function LocatePuzzle() {
  const { id = '' } = useParams()
  const { me, content } = useGame()
  const t = content.treasures.find((x) => x.id === id)
  if (!t) return <Navigate to="/home" replace />
  const p = progressOf(me, t.id)
  const solved = p.state !== 'locked'
  const area = content.areas.find((a) => a.id === t.area_id)

  return (
    <div className="screen">
      <BackHeader title="場所の謎" sub={`${area?.name ?? ''}・No.${t.no}`} right={<StatusChip state={p.state} />} />
      <div className="page stack-16">
        <section className="card stack-12">
          <span className="eyebrow">場所の謎</span>
          <p className="puzzle-text">{t.locate_question}</p>
        </section>

        {solved ? (
          <p className="ok-msg">
            <CheckIcon size={18} />
            正解！お宝の場所が分かりました
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
            <h2 className="card-title row-8">
              <PinIcon size={20} />
              場所のヒント
            </h2>
            <p className="body">{me.placeHints[t.id]}</p>
            {p.state === 'located' && (
              <div className="row-8">
                <Link to="/scan" className="btn btn-primary grow">
                  QRを読み込む
                </Link>
                <Link to="/home" className="btn btn-outline">
                  地図で見る
                </Link>
              </div>
            )}
            {p.state === 'found' && (
              <Link to={`/found/${t.id}`} className="btn btn-primary">
                獲得の謎へ
              </Link>
            )}
          </section>
        ) : (
          <section className="locked-box">
            <span className="locked-icon">
              <LockIcon size={22} />
            </span>
            <div>
              <h2>場所のヒント</h2>
              <p>正解すると、お宝のある場所が表示されます</p>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
