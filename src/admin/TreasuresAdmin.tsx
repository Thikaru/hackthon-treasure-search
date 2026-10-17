import { useGame } from '../lib/game'

export default function TreasuresAdmin() {
  const { content } = useGame()
  const { settings } = content
  return (
    <div className="stack-24">
      <h1 className="h1">お宝・謎</h1>
      <p className="muted lh">
        クリア条件：{settings.clearCount} / {content.treasures.length} 個　景品：{settings.prizeName || '（未設定）'}
        <br />
        内容の編集は Supabase の Table Editor で行います。問題文・ヒント・地図の位置は <code>public.treasures</code>、
        正解・場所ヒント・QRトークンは <code>private.treasure_secrets</code>、クリア条件や景品名は <code>public.settings</code> です。
      </p>
      <section className="admin-card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>No</th>
                <th>お宝</th>
                <th>エリア</th>
                <th>場所の謎</th>
                <th>獲得の謎</th>
                <th>ヒント数</th>
              </tr>
            </thead>
            <tbody>
              {content.treasures.map((t) => (
                <tr key={t.id}>
                  <td>{t.no}</td>
                  <td className="bold">{t.name}</td>
                  <td>{content.areas.find((a) => a.id === t.area_id)?.short_name}</td>
                  <td className="wrap-cell">{t.locate_question}</td>
                  <td className="wrap-cell">{t.acquire_question}</td>
                  <td>
                    {t.locate_hints.length} / {t.acquire_hints.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
