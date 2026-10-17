import { useId } from 'react'
import { chestSvg, sealSvg, signboardSvg, treasureKind, treasureSvg, waxSvg } from '../art/svgArt'

// デザイン案（design/mockups）の絵を React で使うための入れ物。
// 中身はリポジトリ内の固定の SVG 文字列だけなので、innerHTML で差し込んでよい。

function Svg({ html, className }: { html: string; className?: string }) {
  return <span className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
}

/** SVG の id がページ内でぶつからないよう、部品ごとに接頭辞を作る */
const usePrefix = () => useId().replace(/[^a-zA-Z0-9]/g, '') + '-'

export function Seal({ className = 'art-seal' }: { className?: string }) {
  return <Svg className={className} html={sealSvg(usePrefix())} />
}

export function ChestArt({ size = 220, open = false, className = 'art-chest' }: { size?: number; open?: boolean; className?: string }) {
  return <Svg className={className} html={chestSvg(usePrefix(), { size, open })} />
}

export function TreasureArt({ name, size = 64, className = 'art-treasure' }: { name: string; size?: number; className?: string }) {
  return <Svg className={className} html={treasureSvg(usePrefix(), treasureKind(name), size)} />
}

export function WaxSeal({ letter, className = 'art-wax' }: { letter?: string; className?: string }) {
  return <Svg className={className} html={waxSvg(usePrefix(), letter)} />
}

export function Signboard({ className = 'art-sign' }: { className?: string }) {
  return <Svg className={className} html={signboardSvg(usePrefix())} />
}

export { treasureKind }
