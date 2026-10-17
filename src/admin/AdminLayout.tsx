import { useState, type FormEvent } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useGame } from '../lib/game'
import { errorMessage, supabase } from '../lib/supabase'
import { getPin, setPin } from './staff'

export default function AdminLayout() {
  const { content } = useGame()
  const [authed, setAuthed] = useState(!!getPin())
  const [pin, setPinInput] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function login(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    const { error } = await supabase.rpc('staff_login', { p_pin: pin })
    setBusy(false)
    if (error) setErr(errorMessage(error))
    else {
      setPin(pin)
      setAuthed(true)
    }
  }

  if (!authed) {
    return (
      <div className="admin-login">
        <form className="admin-card stack-16" onSubmit={login}>
          <div className="stack-4">
            <span className="small bold num-cobalt">{content.settings.title}</span>
            <h1 className="h1">運営スタッフ ログイン</h1>
          </div>
          <div className="stack-8">
            <label htmlFor="pin" className="label">
              運営PIN
            </label>
            <input
              id="pin"
              className="input"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(e) => {
                setPinInput(e.target.value)
                setErr('')
              }}
            />
          </div>
          <button type="submit" className="btn btn-deep" disabled={busy || !pin}>
            ログイン
          </button>
          <p className="form-msg" role="status">
            {err}
          </p>
          <p className="small muted">PINはSupabaseの private.config（key = staff_pin）で管理しています。</p>
        </form>
      </div>
    )
  }

  return (
    <div className="admin">
      <nav className="admin-nav" aria-label="管理メニュー">
        <span className="admin-brand">{content.settings.title} 運営</span>
        <NavLink to="/admin/dashboard">ダッシュボード</NavLink>
        <NavLink to="/admin/redeem">景品受取</NavLink>
        <NavLink to="/admin/history">受取履歴</NavLink>
        <NavLink to="/admin/players">参加者</NavLink>
        <NavLink to="/admin/treasures">お宝・謎</NavLink>
        <NavLink to="/admin/qr">QR印刷</NavLink>
        <button
          type="button"
          className="admin-exit"
          onClick={() => {
            setPin(null)
            setAuthed(false)
          }}
        >
          ログアウト
        </button>
      </nav>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
