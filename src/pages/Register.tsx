import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackHeader } from '../components/Common'
import { takePendingToken, useGame } from '../lib/game'
import { errorMessage } from '../lib/supabase'

const RULES = [
  '立入禁止区域・私有地には入らない',
  '満潮の時間帯は波打ち際に近づかない',
  'こまめに水分をとり、暑い日は無理をしない',
  'お宝のポールは抜いたり動かしたりしない',
]

export default function Register() {
  const nav = useNavigate()
  const { register } = useGame()
  const [nick, setNick] = useState('')
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const ok = nick.trim().length > 0 && agree && !busy

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!ok) return
    setBusy(true)
    setErr('')
    try {
      await register(nick)
      const pending = takePendingToken()
      nav(pending ? `/t/${pending}` : '/home', { replace: true })
    } catch (ex) {
      setErr(errorMessage(ex))
      setBusy(false)
    }
  }

  return (
    <div className="screen">
      <BackHeader title="参加登録" to="/" />
      <form className="page stack-20" onSubmit={submit}>
        <p className="muted">ニックネームだけで参加できます。メールアドレスなどの登録は不要です。</p>
        <div className="stack-8">
          <label htmlFor="nick" className="label">
            ニックネーム
          </label>
          <input
            id="nick"
            className="input"
            type="text"
            maxLength={12}
            placeholder="例：うみねこ"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            autoComplete="nickname"
          />
          <span className="small muted">12文字まで。クリア証明画面に表示されます</span>
        </div>
        <section className="card stack-12">
          <h2 className="card-title">安全のための注意事項</h2>
          <ol className="rule-list">
            {RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </section>
        <label className="check">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          注意事項を読み、同意しました
        </label>
        <div className="stack-12 push-bottom">
          <p className="form-msg" role="status" aria-live="polite">
            {err}
          </p>
          <button type="submit" className="btn btn-primary btn-lg" disabled={!ok}>
            {busy ? '登録中…' : '登録してはじめる'}
          </button>
          <p className="small muted center">
            進み具合はサーバーに保存されます。機種変更するときは「遊び方」画面の引き継ぎコードを使ってください。
          </p>
        </div>
      </form>
    </div>
  )
}
