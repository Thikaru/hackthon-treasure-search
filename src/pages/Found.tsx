import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { StatusChip } from '../components/Common'
import { CloseIcon } from '../components/Icons'
import PuzzleForm from '../components/PuzzleForm'
import { LockedChest } from '../components/TreasureArt'
import { progressOf, useGame } from '../lib/game'

// 鍵のかかった宝箱の謎：宝箱をタップすると問題と回答欄が開く。QRを読んだ後はどこからでも回答できる
export default function Found() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { me, content } = useGame()
  const [opened, setOpened] = useState(false)
  const t = content.treasures.find((x) => x.id === id)
  if (!t) return <Navigate to="/home" replace />
  const p = progressOf(me, t.id)
  // 正解直後は進捗の更新が先に届くため、ここから獲得演出つきの画面へ移る
  if (p.state === 'acquired') return <Navigate to={`/got/${t.id}?new=1`} replace />
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
        <span className="found-kicker">
          {area?.name}・No.{t.no}
        </span>
        <h1>鍵のかかった宝箱の謎</h1>
        <button
          type="button"
          className={'chest-btn' + (opened ? ' opened' : '')}
          onClick={() => setOpened(true)}
          aria-expanded={opened}
          aria-controls="chest-puzzle"
          aria-label={opened ? '宝箱の謎を表示中' : '宝箱をタップして謎を表示'}
        >
          <LockedChest size={190} />
        </button>
        <p>{opened ? '鍵を開ける謎を解いて、お宝を手に入れよう' : '宝箱をタップすると、鍵を開ける謎が現れます'}</p>
      </section>

      {opened ? (
        <div className="page stack-16" id="chest-puzzle">
          <section className="card stack-12 reveal">
            <span className="eyebrow">宝箱の鍵の謎</span>
            <p className="puzzle-text">{t.acquire_question}</p>
          </section>
          <PuzzleForm
            treasureId={t.id}
            kind="acquire"
            hints={t.acquire_hints}
            hintsUsed={p.acquire_hints}
            submitLabel="鍵を開ける"
            onCorrect={() => nav(`/got/${t.id}?new=1`, { replace: true })}
          />
          <p className="small muted center">この宝箱の謎は、地図からいつでも回答できます。</p>
        </div>
      ) : (
        <div className="page stack-12">
          <button type="button" className="btn btn-primary btn-lg" onClick={() => setOpened(true)}>
            宝箱を調べる
          </button>
          <Link to="/home" className="btn btn-text">
            あとで解く（地図の宝箱からいつでも回答できます）
          </Link>
        </div>
      )}
    </div>
  )
}
