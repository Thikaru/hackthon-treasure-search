import { Link, Navigate, useParams } from 'react-router-dom'
import { Signboard } from '../components/Art'
import { BackHeader, Sparkles, StatusChip } from '../components/Common'
import { CheckIcon, LockIcon } from '../components/Icons'
import PuzzleForm from '../components/PuzzleForm'
import { PlaceHintCard } from '../components/TreasureArt'
import { isGuidepostVisible, progressOf, useGame } from '../lib/game'

// 宝の道標：問題は木の立て札に書かれている。解くと、お宝の場所のヒント（画像・説明）が見られる
export default function LocatePuzzle() {
  const { id = '' } = useParams()
  const { me, content } = useGame()
  const t = content.treasures.find((x) => x.id === id)
  if (!t) return <Navigate to="/guideposts" replace />
  const p = progressOf(me, t.id)
  const solved = p.state !== 'locked'
  const area = content.areas.find((a) => a.id === t.area_id)

  // 1つずつ表示モードで、まだ現れていない道標
  if (!solved && !isGuidepostVisible(me, content, t)) {
    return (
      <div className="screen">
        <BackHeader title="宝の道標" sub={`${area?.name ?? ''}・No.${t.no}`} to="/guideposts" />
        <div className="page stack-16">
          <section className="locked-box glass">
            <span className="locked-icon">
              <LockIcon size={22} />
            </span>
            <div>
              <h2>この宝の道標はまだ眠っています</h2>
              <p>前の道標のお宝を獲得すると現れます</p>
            </div>
          </section>
          <Link to="/guideposts" className="btn btn-primary">
            宝の道標の一覧へ
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <Sparkles count={8} seed={11} />
      <BackHeader title="宝の道標" sub={`${area?.name ?? ''}・No.${t.no}`} right={<StatusChip state={p.state} />} />
      <section className={'signpost' + (solved ? ' solved' : '')} aria-label={`宝の道標 No.${t.no}`}>
        <Signboard />
        <div className="signpost-text">
          <span className="signpost-no">宝の道標 No.{t.no}</span>
          <p>{t.locate_question}</p>
        </div>
      </section>

      <div className="page stack-16 page-under-sign">
        {solved ? (
          <>
            <p className="ok-msg glass">
              <CheckIcon size={18} />
              正解！お宝の場所のヒントが届きました
            </p>
            <section className="paper paper-card stack-12">
              <PlaceHintCard hint={me.placeHints[t.id]} />
              {p.state === 'located' && (
                <>
                  <p className="small">現地でお宝のQRコードを見つけて読み込もう。</p>
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
                <Link to={`/got/${t.id}`} className="btn btn-paper">
                  獲得したお宝を見る
                </Link>
              )}
            </section>
          </>
        ) : (
          <section className="glass panel">
            <PuzzleForm
              treasureId={t.id}
              kind="locate"
              hints={t.locate_hints}
              hintsUsed={p.locate_hints}
              submitLabel="立て札を調べる"
              onCorrect={() => undefined}
            />
            <p className="small panel-note">
              <LockIcon size={14} />
              正解すると、お宝の場所の画像や説明が届きます
            </p>
          </section>
        )}

        <Link to="/guideposts" className="btn btn-text">
          ほかの宝の道標を見る
        </Link>
      </div>
    </div>
  )
}
