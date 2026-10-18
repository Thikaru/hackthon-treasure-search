import { Link } from 'react-router-dom'
import { BackHeader } from '../components/Common'

// デバッグ用：全画面へのリンク（#/debug）。デモデータで開くので Supabase には触れない
const D = 'demo'
export const DEBUG_PAGES: { group: string; items: [string, string][] }[] = [
  { group: '入口', items: [['トップ（未登録）', '/'], ['トップ（参加中）', `/?${D}=1`], ['参加登録', '/register'], ['遊び方・ヘルプ', `/help?${D}=1`]] },
  {
    group: 'ホーム',
    items: [
      ['ホーム（遊んでいる途中）', `/home?${D}=1`],
      ['ホーム（道標を1つずつ表示）', `/home?${D}=seq`],
      ['ホーム（宝を全部地図に出す）', `/home?${D}=pins`],
    ],
  },
  {
    group: '宝の道標・QR',
    items: [
      ['道標の一覧（全問）', `/guideposts?${D}=1`],
      ['道標の一覧（1つずつ）', `/guideposts?${D}=seq`],
      ['道標の謎（未解決）', `/puzzle/t03?${D}=1`],
      ['道標の謎（正解後・場所ヒント）', `/puzzle/t04?${D}=1`],
      ['まだ眠っている道標', `/puzzle/t03?${D}=seq`],
      ['QR読み取り', `/scan?${D}=1`],
    ],
  },
  {
    group: '宝箱・お宝（Unity）',
    items: [
      ['鍵のかかった宝箱の謎', `/found/t02?${D}=1`],
      ['お宝獲得（演出＋写真を撮るか聞く）', `/got/t01?new=1&${D}=1`],
      ['獲得したお宝を見る', `/got/t05?${D}=1`],
    ],
  },
  {
    group: '飾り棚・クリア',
    items: [
      ['お宝の飾り棚', `/treasures?${D}=1`],
      ['クリア証明（まだクリアしていない）', `/certificate?${D}=1`],
      ['全部見つけた（受取用QR）', `/certificate?${D}=clear`],
      ['達成状（受付で読み取られた後）', `/certificate?${D}=redeemed`],
    ],
  },
]

export default function DebugIndex() {
  return (
    <div className="screen">
      <BackHeader title="デバッグ：全画面" to="/" />
      <div className="page stack-14">
        <p className="small muted lh">
          デモデータで開きます（本番のデータには触れません）。URL の最後に <code>&amp;tod=day</code> / <code>dusk</code> / <code>night</code> を付けると時間帯を固定できます。
        </p>
        {DEBUG_PAGES.map((g) => (
          <section key={g.group} className="card stack-8">
            <h2 className="card-title">{g.group}</h2>
            {g.items.map(([label, to]) => (
              <a key={to} className="debug-link" href={`#${to}`} onClick={() => setTimeout(() => location.reload(), 0)}>
                <span>{label}</span>
                <code>#{to}</code>
              </a>
            ))}
          </section>
        ))}
        <Link to="/" className="btn btn-text">
          トップへ
        </Link>
      </div>
    </div>
  )
}
