# TreasureStage（Unity）

Web 版の「鍵のかかった宝箱」「お宝獲得」の場面を 3D で描く Unity プロジェクトです。
Web 版（React）の中にキャンバスとして埋め込み、背景は透明にして Web 側の写真背景の上に重ねます。

- Unity 6.3 LTS（6000.3.24f1）・Built-in レンダーパイプライン
- 宝箱・光の筋・きらめきはすべてコードで生成（モデルファイル・手編集のシーンなし）
- お宝の絵は `src/art/svgArt.js` の SVG を `tools/render-art.mjs` で PNG にしたもの（`Assets/Resources/Treasures`）
- WebGL ビルドは約 3.3MB（Brotli）

## ビルドして Web 版に入れる

```bash
UNITY="/Applications/Unity/Hub/Editor/6000.3.24f1/Unity.app/Contents/MacOS/Unity"
"$UNITY" -batchmode -quit -nographics -projectPath unity -executeMethod TreasureStage.EditorTools.BuildScript.WebGL
npm run unity:copy   # unity/Build/WebGL/Build → public/unity/Build（版番号も更新）
```

テスト（EditMode）:

```bash
"$UNITY" -batchmode -nographics -projectPath unity -runTests -testPlatform EditMode -testResults results.xml
```

お宝の絵を描き直したとき:

```bash
node --experimental-websocket tools/render-art.mjs
```

## 単体での動作確認

`unity/Build/WebGL/index.html` を HTTP で開き、URL に次を付ける。

- `?demo=chest&tod=day` … 閉じた宝箱（tod は day / dusk / night）
- `?demo=unlock&tod=dusk` … 鍵が外れてフタが開く
- `?demo=reveal&tod=night&kind=compass` … お宝がせり上がる（kind は compass, key, stone, bottle, scale, map, marble, bell, gem）
- `&bg=1` … 写真背景を Unity 側で描く

## Web 版とのやり取り

| 向き | 内容 |
| --- | --- |
| Web → Unity | `SendMessage('Bridge', 'Command', json)`。`{cmd, scene, tod, kind, fresh, dx}`。cmd は空（場面切り替え）/ tap / wrong / unlock / drag / release / sleep / wake |
| Unity → Web | `window.TreasureStageNotify(message)`。`ready` / `unlocked` / `revealed` |

Web 側の窓口は `src/lib/unityStage.ts` と `src/components/UnityStage.tsx`。
WebGL2 が使えない端末や読み込みに失敗した場合は、SVG の宝箱で同じ流れを遊べます。
