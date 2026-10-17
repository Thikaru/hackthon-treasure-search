import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { StatusChip } from '../components/Common'
import { CloseIcon, LockIcon } from '../components/Icons'
import PuzzleForm from '../components/PuzzleForm'
import { progressOf, useGame } from '../lib/game'

export default function Found() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { me, content } = useGame()
  const t = content.treasures.find((x) => x.id === id)
  if (!t) return <Navigate to="/home" replace />
  const p = progressOf(me, t.id)
  if (p.state === 'acquired') return <Navigate to={`/got/${t.id}`} replace />
  if (p.state !== 'found') return <Navigate to={`/puzzle/${t.id}`} replace />
  const area = content.areas.find((a) => a.id === t.area_id)

  return (
    <div className="screen">
      <section className="found-hero">
        <div className="found-top">
          <Link to="/home" className="icon-btn on-dark" aria-label="閉じる">
            <CloseIcon />
          </Link>
          <StatusChip state="found" />
        </div>
        <svg width="120" height="104" viewBox="0 0 120 104" aria-hidden="true">
          <ellipse cx="60" cy="96" rx="48" ry="7" fill="#172E52" />
          <rect x="14" y="44" width="92" height="50" rx="8" fill="#172E52" stroke="#F1DDB8" strokeWidth="2" strokeDasharray="5 5" />
          <path d="M20 44 V34 a14 14 0 0 1 14 -14 h52 a14 14 0 0 1 14 14 V44 Z" fill="#172E52" stroke="#F1DDB8" strokeWidth="2" strokeDasharray="5 5" />
          <text x="60" y="80" textAnchor="middle" fontSize="28" fontWeight="900" fill="#F1DDB8" fontFamily="Zen Maru Gothic, sans-serif">
            ?
          </text>
        </svg>
        <h1>お宝を発見！</h1>
        <p>
          {area?.name}・No.{t.no}　最後の謎を解いて手に入れよう
        </p>
      </section>
      <div className="page stack-16">
        <section className="card stack-12">
          <h2 className="card-title row-8">
            <LockIcon size={20} />
            獲得の謎
          </h2>
          <p className="puzzle-text">{t.acquire_question}</p>
          <p className="tip">まわりの看板や景色、ポールの札をよく見てみよう。答えはこの場所にあります</p>
        </section>
        <PuzzleForm
          treasureId={t.id}
          kind="acquire"
          hints={t.acquire_hints}
          hintsUsed={p.acquire_hints}
          submitLabel="獲得"
          onCorrect={() => nav(`/got/${t.id}?new=1`, { replace: true })}
        />
      </div>
    </div>
  )
}
