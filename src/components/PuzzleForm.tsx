import { useState, type FormEvent } from 'react'
import { useGame, type PuzzleKind } from '../lib/game'
import { errorMessage } from '../lib/supabase'
import { AlertIcon, LockIcon } from './Icons'

interface Props {
  treasureId: string
  kind: PuzzleKind
  hints: string[]
  hintsUsed: number
  submitLabel: string
  onCorrect: () => void
  /** 送信を始めた瞬間（正解で画面が切り替わる前に、演出の準備をしたいとき用） */
  onAttempt?: () => void
  onWrong?: () => void
}

// 解答欄と段階ヒント。ヒントは手帳の付箋として1枚ずつ貼られていく
export default function PuzzleForm({ treasureId, kind, hints, hintsUsed, submitLabel, onCorrect, onAttempt, onWrong }: Props) {
  const { submitAnswer, useHintFor: openHint } = useGame()
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<'idle' | 'checking' | 'wrong' | 'error'>('idle')
  const [err, setErr] = useState('')
  const [hintBusy, setHintBusy] = useState(false)
  const inputId = `ans-${treasureId}-${kind}`

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!value.trim() || status === 'checking') return
    setStatus('checking')
    onAttempt?.()
    try {
      const ok = await submitAnswer(treasureId, kind, value)
      if (ok) onCorrect()
      else {
        setStatus('wrong')
        onWrong?.()
      }
    } catch (ex) {
      setErr(errorMessage(ex))
      setStatus('error')
    }
  }

  const remaining = hints.length - hintsUsed

  return (
    <div className="pz">
      <form className="pz-form" onSubmit={submit}>
        <label htmlFor={inputId} className="pz-label">
          こたえ
        </label>
        <input
          id={inputId}
          className="input pz-input"
          type="text"
          autoComplete="off"
          enterKeyHint="send"
          placeholder="ひらがな・カタカナどちらでもOK"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (status !== 'checking') setStatus('idle')
          }}
        />
        <p className="form-msg" role="status" aria-live="polite">
          {status === 'wrong' && (
            <>
              <AlertIcon size={16} />
              ちがうようです。もう一度考えてみよう
            </>
          )}
          {status === 'error' && err}
        </p>
        <button type="submit" className="btn btn-primary btn-lg" disabled={status === 'checking'}>
          {status === 'checking' ? '確認中…' : submitLabel}
        </button>
      </form>

      {(hintsUsed > 0 || remaining > 0) && (
        <div className="notes-row">
          {hints.slice(0, hintsUsed).map((h, i) => (
            <div key={i} className={'sticky' + (i % 2 ? ' tilt-r' : '')}>
              <b>ヒント {i + 1}</b>
              {h}
            </div>
          ))}
          {remaining > 0 && (
            <button
              type="button"
              className="sticky sticky-locked"
              disabled={hintBusy}
              onClick={async () => {
                setHintBusy(true)
                try {
                  await openHint(treasureId, kind)
                } catch (ex) {
                  setErr(errorMessage(ex))
                  setStatus('error')
                } finally {
                  setHintBusy(false)
                }
              }}
            >
              <LockIcon size={18} />
              <span>ヒント {hintsUsed + 1} を開く</span>
              <small>のこり {remaining} 枚</small>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
