import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ChestArt, treasureKind } from '../components/Art'
import { Sparkles, StatusChip } from '../components/Common'
import { CloseIcon, LockIcon } from '../components/Icons'
import PuzzleForm from '../components/PuzzleForm'
import UnityStage from '../components/UnityStage'
import { progressOf, useGame } from '../lib/game'
import { onStageMessage, stageStatus, stageUnlock, stageWrong } from '../lib/unityStage'
import { useTimeOfDay } from '../lib/useTimeOfDay'

// 鍵のかかった宝箱の謎：宝箱（Unity の 3D）をタップすると問題と回答欄が開く。
// 正解すると鍵が外れてフタが開く演出のあと、獲得画面へ移る。QRを読んだ後はどこからでも回答できる
export default function Found() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { me, content } = useGame()
  const tod = useTimeOfDay()
  const [opened, setOpened] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  // 正解すると進捗が先に「獲得」に変わる。演出の途中で獲得画面へ飛ばないよう、送信したことを覚えておく
  const [attempted, setAttempted] = useState(false)
  const t = content.treasures.find((x) => x.id === id)

  useEffect(() => {
    if (!unlocking || !t) return
    const go = () => nav(`/got/${t.id}?new=1`, { replace: true })
    // Unity の演出が終わったら移る（Unity が無いときは SVG の演出の長さだけ待つ）
    const off = onStageMessage((m) => m === 'unlocked' && window.setTimeout(go, 350))
    const timer = window.setTimeout(go, stageStatus() === 'ready' ? 4000 : 1400)
    return () => {
      off()
      window.clearTimeout(timer)
    }
  }, [unlocking, t, nav])

  if (!t) return <Navigate to="/home" replace />
  const p = progressOf(me, t.id)
  if (p.state === 'acquired' && !attempted) return <Navigate to={`/got/${t.id}`} replace />
  if (p.state !== 'found' && p.state !== 'acquired') return <Navigate to={`/puzzle/${t.id}`} replace />
  const area = content.areas.find((a) => a.id === t.area_id)
  const open = () => setOpened(true)

  return (
    <div className={'screen found' + (unlocking ? ' unlocking' : '')}>
      <Sparkles count={16} seed={21} />
      <div className="found-top">
        <Link to="/home" className="round-btn glass" aria-label="閉じる">
          <CloseIcon />
        </Link>
        <StatusChip state="found" />
        <span className="round-spacer" />
      </div>
      <div className="found-title">
        <p>
          {area?.name}・No.{t.no}
        </p>
        <h1>鍵のかかった宝箱</h1>
      </div>

      <UnityStage
        scene="chest"
        tod={tod}
        kind={treasureKind(t.name)}
        sceneKey={`chest:${t.id}:${tod}`}
        label={opened ? '鍵のかかった宝箱（指でなぞると回せます）' : '宝箱をタップして謎を表示'}
        onTap={open}
        fallback={
          <div className={'chest-fallback' + (unlocking ? ' opening' : '')}>
            <span className="rays" aria-hidden="true" />
            <ChestArt size={230} open={unlocking} />
            {!opened && <span className="tap-ring" aria-hidden="true" />}
          </div>
        }
      />

      {opened ? (
        <section className="puzzle-panel paper reveal" id="chest-puzzle">
          <span className="paper-kicker">
            <LockIcon size={16} />
            錠前に刻まれた謎
          </span>
          <p className="paper-q">{t.acquire_question}</p>
          <PuzzleForm
            treasureId={t.id}
            kind="acquire"
            hints={t.acquire_hints}
            hintsUsed={p.acquire_hints}
            submitLabel={unlocking ? '鍵が開いた！' : '鍵を開ける'}
            onAttempt={() => setAttempted(true)}
            onWrong={stageWrong}
            onCorrect={() => {
              setUnlocking(true)
              stageUnlock()
            }}
          />
          <p className="small center paper-note">この宝箱の謎は、地図からいつでも回答できます。</p>
        </section>
      ) : (
        <div className="puzzle-panel glass found-actions">
          <p className="center small">宝箱をタップすると、鍵を開ける謎が現れます（指でなぞると回せます）</p>
          <button type="button" className="btn btn-primary btn-lg" onClick={open}>
            宝箱を調べる
          </button>
          <Link to="/home" className="btn btn-text">
            あとで解く
          </Link>
        </div>
      )}
    </div>
  )
}
