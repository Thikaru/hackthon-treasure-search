# 浜辺の宝さがし（宝探し × 謎解き Webアプリ）

> **unity ブランチ**：画面デザインの刷新と、宝箱・お宝の場面の Unity（3D）化、砂浜の地図の Google マップ化を行っています。内容は [docs/修正仕様.md](docs/修正仕様.md) の「修正4」、Unity のビルドは [unity/README.md](unity/README.md)。公開先：https://aipapagames.com/shibukawa/

スマホのブラウザだけで遊べる宝探しゲームです。謎を解いて場所を突き止め、現地のQRコードを読み、最後の謎を解くとお宝を獲得できます。規定数を集めると、受付で見せる「クリア証明」が表示されます。

- 参加者：`/#/`
- 運営：`/#/admin`（運営PINでログイン）

## 遊び方

1. **場所の謎**を解くと、お宝の場所が地図に表示される
2. 現地でポールの **QRコード** を読み込む（読めないときはQR下の6桁コード）
3. **獲得の謎**（ポールの札の合言葉など）を解くとお宝ゲット
4. 規定数を集めたら、**お宝 › クリア証明** を受付で見せて景品と交換

下部タブは「ホーム（地図）／スキャン／お宝（コレクション・クリア証明）」の3つです。

## 構成

| 層 | 技術 |
| --- | --- |
| フロント | React + TypeScript + Vite（ハッシュルーティング） |
| DB・認証 | Supabase（PostgreSQL、匿名ログイン、RLS、RPC） |
| QR読み取り / 生成 | ブラウザのカメラ + jsQR / qrcode |
| 配信 | GitHub Pages（`main` へのpushで自動デプロイ） |

### データの守り方

- 参加者は Supabase の**匿名ログイン**で識別します（ニックネームのみ登録）。
- **正解・場所ヒント・QRトークン・運営PIN**は `private` スキーマにあり、ブラウザからは直接読めません。
- 解答の照合、QRの照合、クリア証明の発行・受取はすべて**サーバー側の関数（RPC）**で行います。
- クリア証明QRは30秒ごとに作り直され、60秒で失効します（スクリーンショット対策）。受取は1人1回。
- 解答送信は1分15回まで、運営PINは10分20回失敗でロックします。

## セットアップ

1. Supabaseでプロジェクトを作成（リージョンは Tokyo 推奨）
2. **Authentication → Sign In / Providers → Allow anonymous sign-ins** をオン
3. SQL Editor で次の順に実行
   1. `supabase/schema.sql`（テーブル・RLS・関数）
   2. `supabase/seed.sql`（エリア・お宝・問題文・設定）
   3. `supabase/secrets.example.sql` を参考に、**正解・QRトークン・運営PIN**を投入（この値はリポジトリに入れない）
4. `.env.production` に Project URL と publishable key（公開してよい鍵）を記入
5. **Settings → Pages → Source** を「GitHub Actions」にして `main` にpush

### ローカル開発

```bash
cp .env.example .env.local   # URLとキーを記入
npm install
npm run dev
```

## 内容の編集

| 変えたいもの | 場所 |
| --- | --- |
| 問題文・ヒント・お宝名・地図上の位置 | `public.treasures` |
| エリア | `public.areas` |
| クリア数・景品名・受付場所 | `public.settings` |
| 正解・場所ヒント・QR | `private.treasure_secrets`（QRは運営画面から再発行も可） |
| 運営PIN | `private.config`（key = `staff_pin`） |

王子ヶ岳・たまの湯の地図は仮のイラストです。
