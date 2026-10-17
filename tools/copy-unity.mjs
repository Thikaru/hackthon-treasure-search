// Unity の WebGL ビルド（unity/Build/WebGL/Build）を Web 版の public/unity/Build にコピーする。
//   npm run unity:copy
import { createHash } from 'node:crypto'
import { chmodSync, cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const from = join(root, 'unity/Build/WebGL/Build')
const to = join(root, 'public/unity/Build')
if (!existsSync(from)) {
  console.error('Unity のビルドがありません。先に BuildScript.WebGL を実行してください（unity/README.md）')
  process.exit(1)
}
rmSync(to, { recursive: true, force: true })
cpSync(from, to, { recursive: true })
// Unity は一部のファイルを本人しか読めない権限で書き出すので、配信できるように直す
for (const f of readdirSync(to)) chmodSync(join(to, f), 0o644)
// ブラウザに古いビルドが残らないよう、中身から作った版番号を URL に付ける
const hash = createHash('sha1')
for (const f of readdirSync(to).sort()) hash.update(readFileSync(join(to, f)))
const version = hash.digest('hex').slice(0, 10)
writeFileSync(join(root, 'src/lib/unityVersion.ts'), `// npm run unity:copy が自動で書き換える（Unity ビルドの中身から作った版番号）\nexport const UNITY_BUILD_VERSION = '${version}'\n`)
console.log('copied', from, '->', to, 'version', version)
