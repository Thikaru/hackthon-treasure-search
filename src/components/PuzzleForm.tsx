import { useState, type FormEvent } from 'react'
import { useGame, type PuzzleKind } from '../lib/game'
import { errorMessage } from '../lib/supabase'
import { AlertIcon, BulbIcon } from './Icons'

interface Props {
  treasureId: string
  kind: PuzzleKind
  hints: string[]
  hintsUsed: number
  submitLabel: string
  onCorrect: () => void
}

export default function PuzzleForm({ treasureId, kind, hints, hintsUsed, submitLabel, onCorrect }: Props) {
  const { submitAnswer, useHintFor } = useGame()
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<'idle' | 'checking' | 'wrong' | 'error'>('idle')
  const [err, setErr] = useState('')
  const [hintBusy, setHintBusy] = useState(false)
  const inputId = `ans-${treasureId}-${kind}`

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!value.trim() || status === 'checking') return
    setStatus('checking')
    try {
      const ok = await submitAnswer(treasureId, kind, value)
      if (ok) onCorrect()
      else setStatus('wrong')
    } catch (ex) {
      setErr(errorMessage(ex))
      setStatus('error')
    }
  }

  const remaining = hints.length - hintsUsed

  return (
    <div className="stack-16">
      <form className="stack-8" onSubmit={submit}>
        <label htmlFor={inputId} className="label">
          答え
        </label>
        <div className="row-8">
          <input
            id={inputId}
            className="input"
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
          <button type="submit" className="btn btn-primary btn-answer" disabled={status === 'checking'}>
            {status === 'checking' ? '確認中' : submitLabel}
          </button>
        </div>
        <p className="form-msg" role="status" aria-live="polite">
          {status === 'wrong' && (
            <>
              <AlertIcon size={16} />
              ちがうようです。もう一度考えてみよう
            </>
          )}
          {status === 'error' && err}
        </p>
      </form>

      {hintsUsed > 0 && (
        <ol className="hint-list">
          {hints.slice(0, hintsUsed).map((h, i) => (
            <li key={i}>
              <span className="hint-no">ヒント{i + 1}</span>
              {h}
            </li>
          ))}
        </ol>
      )}

      {remaining > 0 && (
        <button
          type="button"
          className="btn btn-outline"
          disabled={hintBusy}
          onClick={async () => {
            setHintBusy(true)
            try {
              await useHintFor(treasureId, kind)
            } catch (ex) {
              setErr(errorMessage(ex))
              setStatus('error')
            } finally {
              setHintBusy(false)
            }
          }}
        >
          <BulbIcon size={18} />
          ヒントを見る（残り {remaining} 回）
        </button>
      )}
    </div>
  )
}
