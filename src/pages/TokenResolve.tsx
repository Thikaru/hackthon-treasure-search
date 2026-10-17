import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { setPendingToken, useGame } from '../lib/game'
import { errorMessage } from '../lib/supabase'

// QRのURL（#/t/<token>）を開いたときの入口。
// 未登録なら登録へ、登録済みならサーバーで照合して「発見」にし、獲得の謎へ進む。
export default function TokenResolve() {
  const { token = '' } = useParams()
  const nav = useNavigate()
  const { me, scan } = useGame()
  const [msg, setMsg] = useState('')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    if (!me.player) {
      setPendingToken(token)
      nav('/register', { replace: true })
      return
    }
    scan(token)
      .then((r) => {
        if (!r.ok || !r.treasure_id) setMsg('このQRは無効です。新しいQRに貼り替えられた可能性があります')
        else nav(r.state === 'acquired' ? `/got/${r.treasure_id}` : `/found/${r.treasure_id}`, { replace: true })
      })
      .catch((e) => setMsg(errorMessage(e)))
  }, [me.player, token, nav, scan])

  return (
    <div className="screen center-screen" role="status">
      {msg ? (
        <>
          <p className="body">{msg}</p>
          <Link to="/home" className="btn btn-primary">
            ホームへ
          </Link>
        </>
      ) : (
        <>
          <span className="spinner" aria-hidden="true" />
          <p className="muted">お宝を確認しています…</p>
        </>
      )}
    </div>
  )
}
