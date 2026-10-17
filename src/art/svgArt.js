// 画面の絵（SVG 文字列）。design/mockups のデザイン案から移したもの。
// Web 版の画面と、Unity に渡すお宝の絵（tools/render-art.mjs で PNG 化）の両方がここを使う。
// p は SVG 内の id がぶつからないための接頭辞。

export function sealSvg(p) {
  return `<svg viewBox="0 0 100 100">
    <defs>
      <radialGradient id="${p}wax" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="#ff7a5a"/><stop offset=".55" stop-color="#c8341e"/><stop offset="1" stop-color="#7a1608"/></radialGradient>
      <linearGradient id="${p}gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2c4"/><stop offset=".5" stop-color="#f2c45a"/><stop offset="1" stop-color="#b8821e"/></linearGradient>
    </defs>
    <path d="M50 4c7 0 9 6 15 7s12-3 16 2-1 11 2 16 9 7 8 14-8 7-9 13 4 11-1 16-11 1-16 4-5 10-13 10-9-7-15-8-12 3-16-2 1-11-2-16-9-7-8-14 8-7 9-13-4-11 1-16 11-1 16-4 6-9 13-9Z" fill="url(#${p}wax)"/>
    <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(255,220,200,.35)" stroke-width="2"/>
    <g transform="translate(50 52)">
      <path d="M-18 -2h36v16a3 3 0 0 1-3 3h-30a3 3 0 0 1-3-3Z" fill="url(#${p}gold)"/>
      <path d="M-18 -2v-4a10 9 0 0 1 10-9h16a10 9 0 0 1 10 9v4Z" fill="url(#${p}gold)"/>
      <rect x="-18" y="-3" width="36" height="3.5" fill="#8a5a10" opacity=".55"/>
      <rect x="-4.5" y="-6" width="9" height="10" rx="2" fill="#7a1608"/>
      <circle cx="0" cy="-1.5" r="1.8" fill="url(#${p}gold)"/>
    </g>
    <ellipse cx="36" cy="26" rx="12" ry="5" fill="rgba(255,255,255,.28)" transform="rotate(-25 36 26)"/>
  </svg>`
}

export function chestSvg(p, { size = 230, open = false } = {}) {
  const h = size * 0.86
  return `<svg width="${size}" height="${h}" viewBox="0 0 260 224">
  <defs>
    <linearGradient id="${p}wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8743a"/><stop offset=".55" stop-color="#8e5226"/><stop offset="1" stop-color="#5e3216"/></linearGradient>
    <linearGradient id="${p}woodlid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d08a48"/><stop offset="1" stop-color="#8a4e24"/></linearGradient>
    <linearGradient id="${p}metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".35" stop-color="#f0c058"/><stop offset=".7" stop-color="#c08a26"/><stop offset="1" stop-color="#7a5210"/></linearGradient>
    <linearGradient id="${p}metalv" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a5c14"/><stop offset=".3" stop-color="#f6cc66"/><stop offset=".55" stop-color="#fff3c4"/><stop offset=".8" stop-color="#d8a236"/><stop offset="1" stop-color="#8a5c14"/></linearGradient>
    <radialGradient id="${p}inner" cx="50%" cy="100%" r="80%"><stop offset="0" stop-color="#fff6c8"/><stop offset=".4" stop-color="#ffd25a"/><stop offset="1" stop-color="#b86a10"/></radialGradient>
    <radialGradient id="${p}shell" cx="50%" cy="80%" r="80%"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#f6dcd0"/><stop offset="1" stop-color="#d9a08c"/></radialGradient>
    <pattern id="${p}grain" width="40" height="8" patternUnits="userSpaceOnUse"><path d="M0 4 Q10 1 20 4 T40 4" stroke="rgba(60,25,5,.25)" fill="none" stroke-width="1.2"/></pattern>
  </defs>
  <ellipse cx="130" cy="212" rx="112" ry="11" fill="rgba(0,0,0,.35)"/>
  <!-- 箱 -->
  <path d="M26 104h208v94a12 12 0 0 1-12 12H38a12 12 0 0 1-12-12Z" fill="url(#${p}wood)"/>
  <path d="M26 104h208v94a12 12 0 0 1-12 12H38a12 12 0 0 1-12-12Z" fill="url(#${p}grain)"/>
  <path d="M26 104h208v10H26Z" fill="rgba(0,0,0,.25)"/>
  <rect x="26" y="150" width="208" height="3" fill="rgba(0,0,0,.18)"/>
  <rect x="44" y="104" width="20" height="106" fill="url(#${p}metalv)"/>
  <rect x="196" y="104" width="20" height="106" fill="url(#${p}metalv)"/>
  <g fill="#7a5210">${[118, 138, 158, 178, 196].map((y) => `<circle cx="54" cy="${y}" r="2.6"/><circle cx="206" cy="${y}" r="2.6"/>`).join('')}</g>
  <path d="M26 196h208v2a12 12 0 0 1-12 12H38a12 12 0 0 1-12-12Z" fill="url(#${p}metal)"/>
  ${open ? `
  <!-- 開いたフタ -->
  <path d="M30 104 Q130 70 230 104 L224 112 Q130 84 36 112Z" fill="url(#${p}inner)"/>
  <g transform="translate(0 -6)">
    <path d="M36 98 L50 22 Q130 -4 210 22 L224 98 Q130 74 36 98Z" fill="url(#${p}woodlid)"/>
    <path d="M36 98 L50 22 Q130 -4 210 22 L224 98 Q130 74 36 98Z" fill="url(#${p}grain)"/>
    <path d="M56 92 L66 18 L84 14 L76 89Z" fill="url(#${p}metalv)"/>
    <path d="M204 92 L194 18 L176 14 L184 89Z" fill="url(#${p}metalv)"/>
    <path d="M36 98 Q130 74 224 98 L222 104 Q130 82 38 104Z" fill="url(#${p}metal)"/>
  </g>
  <ellipse cx="130" cy="106" rx="92" ry="16" fill="url(#${p}inner)"/>
  <g fill="#fff3b0">${[[96, 100, 6], [118, 96, 7], [142, 99, 6], [162, 104, 5], [108, 106, 5], [130, 104, 6]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" stroke="#d8981e" stroke-width="1.5"/>`).join('')}</g>
  ` : `
  <!-- 閉じたフタ -->
  <path d="M26 106V78a52 44 0 0 1 52-44h104a52 44 0 0 1 52 44v28Z" fill="url(#${p}woodlid)"/>
  <path d="M26 106V78a52 44 0 0 1 52-44h104a52 44 0 0 1 52 44v28Z" fill="url(#${p}grain)"/>
  <path d="M40 60 Q130 30 220 60" stroke="rgba(255,230,190,.35)" stroke-width="3" fill="none"/>
  <path d="M44 106V66a30 30 0 0 1 20-28v68Z" fill="url(#${p}metalv)"/>
  <path d="M216 106V66a30 30 0 0 0-20-28v68Z" fill="url(#${p}metalv)"/>
  <rect x="24" y="100" width="212" height="10" rx="3" fill="url(#${p}metal)"/>
  <!-- 貝殻の錠前 -->
  <g transform="translate(130 120)">
    <path d="M-15 -16v-12a15 15 0 0 1 30 0v12" fill="none" stroke="url(#${p}metalv)" stroke-width="8" stroke-linecap="round"/>
    <path d="M-30 -14 Q-32 18 0 30 Q32 18 30 -14 Q0 -24 -30 -14Z" fill="url(#${p}metal)" stroke="#7a5210" stroke-width="2.5"/>
    <g stroke="#9a6a18" stroke-width="2" fill="none" opacity=".75"><path d="M0 26 L0 -18"/><path d="M0 26 L-14 -16"/><path d="M0 26 L14 -16"/><path d="M0 26 L-24 -10"/><path d="M0 26 L24 -10"/></g>
    <circle cx="0" cy="2" r="9" fill="url(#${p}shell)" stroke="#7a5210" stroke-width="2"/>
    <path d="M0 -1v8" stroke="#3a2408" stroke-width="3" stroke-linecap="round"/>
    <circle cx="0" cy="-2" r="2.6" fill="#3a2408"/>
    <path d="M-22 -12 Q-10 -18 6 -16" stroke="rgba(255,255,255,.75)" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>`}
  <path d="M34 112h6M220 112h6" stroke="rgba(255,255,255,.4)" stroke-width="2"/>
</svg>`
}

export function treasureSvg(p, kind, s = 64) {
  const d = `<defs>
    <linearGradient id="${p}${kind}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2c4"/><stop offset=".5" stop-color="#f0c058"/><stop offset="1" stop-color="#a87418"/></linearGradient>
    <radialGradient id="${p}${kind}r" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="rgba(255,255,255,0)"/></radialGradient></defs>`
  const art = {
    compass: `<path d="M32 6 Q52 10 56 34 Q52 56 32 58 Q12 56 8 34 Q12 10 32 6Z" fill="#f7e2d6" stroke="#c98a72" stroke-width="2.5"/>
      <g stroke="#d9a490" stroke-width="1.8" fill="none"><path d="M32 56V10M32 56 18 14M32 56 46 14M32 56 11 26M32 56 53 26"/></g>
      <circle cx="32" cy="34" r="13" fill="url(#${p}${kind}g)" stroke="#7a5210" stroke-width="2"/><circle cx="32" cy="34" r="9.5" fill="#fbf5e6"/>
      <path d="M32 25 L35 34 L32 43 L29 34Z" fill="#d9472b"/><path d="M32 34 L35 34 L32 43 L29 34Z" fill="#22406e"/><circle cx="32" cy="34" r="1.6" fill="#3a2408"/>`,
    key: `<g transform="rotate(-35 32 32)"><rect x="8" y="27" width="40" height="10" rx="5" fill="#a77446" stroke="#5e3a1a" stroke-width="2"/>
      <path d="M12 30q8 -2 16 0t16 0" stroke="#6e4422" stroke-width="1.5" fill="none"/>
      <circle cx="50" cy="32" r="10" fill="none" stroke="#a77446" stroke-width="7"/><circle cx="50" cy="32" r="10" fill="none" stroke="#5e3a1a" stroke-width="1.5"/>
      <path d="M10 37v9h6v-5h5v6h6v-10" fill="#a77446" stroke="#5e3a1a" stroke-width="2" stroke-linejoin="round"/>
      <path d="M14 30 L44 30" stroke="#ffe7a0" stroke-width="1.5" opacity=".9"/></g>`,
    stone: `<path d="M14 58V22a18 16 0 0 1 36 0v36Z" fill="#9aa6b2" stroke="#4e5a68" stroke-width="2.5"/><path d="M14 58V22a18 16 0 0 1 36 0v36Z" fill="url(#${p}${kind}r)" opacity=".35"/>
      <g stroke="#3f86cf" stroke-width="2.5" fill="none" stroke-linecap="round"><path d="M20 30q4 -4 8 0t8 0t8 0"/><path d="M20 38q4 -4 8 0t8 0t8 0"/><path d="M20 46q4 -4 8 0t8 0t8 0"/></g><rect x="8" y="56" width="48" height="6" rx="2" fill="#6e7a88"/>`,
    bottle: `<rect x="25" y="4" width="14" height="9" rx="2" fill="#b07a44" stroke="#6e4422" stroke-width="2"/>
      <path d="M27 13h10v6c9 3 14 11 14 20v12a8 8 0 0 1-8 8H21a8 8 0 0 1-8-8V39c0-9 5-17 14-20Z" fill="rgba(190,225,255,.55)" stroke="#5a86b8" stroke-width="2.5"/>
      <path d="M15 42h34v9a6 6 0 0 1-6 6H21a6 6 0 0 1-6-6Z" fill="#f6d98a"/>
      <g fill="#fff6c8">${[[22, 47], [30, 51], [38, 46], [44, 52], [27, 54]].map(([x, y]) => `<path d="M${x} ${y - 3}l1 2 2 1-2 1-1 2-1-2-2-1 2-1Z"/>`).join('')}</g><path d="M19 24q-3 8 -2 18" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/>`,
    scale: `<defs><linearGradient id="${p}irid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7ef0e0"/><stop offset=".35" stop-color="#7aa8ff"/><stop offset=".65" stop-color="#d48aff"/><stop offset="1" stop-color="#ffb3c8"/></linearGradient></defs>
      <path d="M32 6 Q56 18 50 44 Q44 60 32 60 Q20 60 14 44 Q8 18 32 6Z" fill="url(#${p}irid)" stroke="#5a5aa8" stroke-width="2"/>
      <g stroke="rgba(255,255,255,.7)" stroke-width="1.6" fill="none"><path d="M18 36q14 -10 28 0"/><path d="M20 46q12 -8 24 0"/><path d="M22 26q10 -8 20 0"/></g><path d="M24 14q-6 8 -6 18" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    map: `<path d="M8 12l14 -4 20 6 14 -4v44l-14 4-20 -6-14 4Z" fill="#f2deb0" stroke="#9a6a2a" stroke-width="2.2"/><path d="M22 8v44M42 14v44" stroke="#c9a868" stroke-width="1.5"/>
      <path d="M14 40q6 -10 14 -4t14 -10" stroke="#b8402a" stroke-width="2" stroke-dasharray="3 3" fill="none"/><path d="M44 22l4 4m0 -4l-4 4" stroke="#b8402a" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M54 46l-6 2 -4 -4 6 -2Z" fill="#f2deb0" stroke="#9a6a2a" stroke-width="1.5"/>`,
    marble: `<circle cx="32" cy="32" r="24" fill="#5aa8ee" stroke="#2a5e9e" stroke-width="2"/><path d="M14 38q10 -6 20 0t18 -2" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9"/><path d="M18 26q8 -4 14 0" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".7"/><circle cx="32" cy="32" r="24" fill="url(#${p}${kind}r)" opacity=".7"/>`,
    gem: `<defs><linearGradient id="${p}gemfill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bff3ff"/><stop offset=".5" stop-color="#4fb8e8"/><stop offset="1" stop-color="#1f4fb8"/></linearGradient></defs>
      <path d="M16 14h32l10 14-26 30L6 28Z" fill="url(#${p}gemfill)" stroke="#1a3a7a" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M6 28h52M16 14l8 14 8-14 8 14 8-14M24 28l8 30 8-30" stroke="#1a3a7a" stroke-width="1.6" fill="none" stroke-linejoin="round" opacity=".7"/>
      <path d="M18 18l4 8" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/>`,
    bell: `<path d="M32 6v6" stroke="#7a5210" stroke-width="3"/><path d="M14 46c4-4 4-10 4-18a14 14 0 0 1 28 0c0 8 0 14 4 18Z" fill="url(#${p}${kind}g)" stroke="#7a5210" stroke-width="2.5"/><rect x="10" y="44" width="44" height="6" rx="3" fill="#c08a26" stroke="#7a5210" stroke-width="2"/><circle cx="32" cy="54" r="5" fill="#c08a26" stroke="#7a5210" stroke-width="2"/><path d="M22 22q2 -6 8 -8" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>`,
  }[kind] ?? ''
  return `<svg width="${s}" height="${s}" viewBox="0 0 64 64">${d}${art}</svg>`
}

export function waxSvg(p, letter = '済') {
  return `<svg viewBox="0 0 100 100"><defs><radialGradient id="${p}cw" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="#ff7a5a"/><stop offset=".55" stop-color="#c8341e"/><stop offset="1" stop-color="#7a1608"/></radialGradient></defs><path d="M50 4c7 0 9 6 15 7s12-3 16 2-1 11 2 16 9 7 8 14-8 7-9 13 4 11-1 16-11 1-16 4-5 10-13 10-9-7-15-8-12 3-16-2 1-11-2-16-9-7-8-14 8-7 9-13-4-11 1-16 11-1 16-4 6-9 13-9Z" fill="url(#${p}cw)"/><circle cx="50" cy="50" r="28" fill="none" stroke="rgba(255,220,200,.45)" stroke-width="2" stroke-dasharray="3 4"/><text x="50" y="58" text-anchor="middle" font-family="Shippori Mincho, serif" font-weight="800" font-size="24" fill="#ffd9c8">${letter}</text></svg>`
}

/** 宝の道標の立て札（文字は HTML で重ねる） */
export function signboardSvg(p) {
  return `<svg viewBox="0 0 330 250" preserveAspectRatio="xMidYMid meet">
  <defs>
    <linearGradient id="${p}board" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6c08a"/><stop offset="1" stop-color="#b98a52"/></linearGradient>
    <linearGradient id="${p}post" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6e4422"/><stop offset=".5" stop-color="#a77446"/><stop offset="1" stop-color="#5e3a1a"/></linearGradient>
    <pattern id="${p}sg" width="60" height="10" patternUnits="userSpaceOnUse"><path d="M0 5 Q15 2 30 5 T60 5" stroke="rgba(90,50,20,.2)" fill="none" stroke-width="1.2"/></pattern>
  </defs>
  <ellipse cx="165" cy="244" rx="70" ry="6" fill="rgba(0,0,0,.3)"/>
  <rect x="152" y="150" width="26" height="96" rx="4" fill="url(#${p}post)"/>
  <path d="M20 22h276l18 70-18 70H20a8 8 0 0 1-8-8V30a8 8 0 0 1 8-8Z" fill="url(#${p}board)" stroke="#6e4422" stroke-width="4"/>
  <path d="M20 22h276l18 70-18 70H20a8 8 0 0 1-8-8V30a8 8 0 0 1 8-8Z" fill="url(#${p}sg)"/>
  <circle cx="30" cy="40" r="4" fill="#6e4422"/><circle cx="30" cy="144" r="4" fill="#6e4422"/>
  <path d="M24 30 H290" stroke="rgba(255,240,210,.6)" stroke-width="2"/>
  <path d="M286 140 q8 -2 14 6" stroke="#6e4422" stroke-width="2" fill="none"/>
</svg>`
}

/** 地図に置く小さな宝箱ピン（獲得＝開いて光る／発見＝閉じて鍵つき） */
export function mapChestSvg(no, opened) {
  return `<svg width="54" height="60" viewBox="-27 -40 54 60">
    <ellipse cx="0" cy="15" rx="17" ry="4.5" fill="rgba(0,0,0,.3)"/>
    <path d="M-15 0h30v12a3 3 0 0 1-3 3h-24a3 3 0 0 1-3-3Z" fill="#9a5a2a" stroke="#4a2a10" stroke-width="1.5"/>
    ${opened ? '<path d="M-15 0 L-12 -14 Q0 -19 12 -14 L15 0Z" fill="#c8823e" stroke="#4a2a10" stroke-width="1.5" transform="rotate(-12 -15 0)"/><ellipse cx="0" cy="0" rx="13" ry="3" fill="#ffe08a"/>'
      : '<path d="M-15 1v-5a8 8 0 0 1 8-8h14a8 8 0 0 1 8 8v5Z" fill="#c8823e" stroke="#4a2a10" stroke-width="1.5"/><rect x="-15" y="-1" width="30" height="3" fill="#f0c058"/><rect x="-4" y="0" width="8" height="8" rx="1.5" fill="#f0c058" stroke="#7a5210"/>'}
    <g transform="translate(13 -27)"><rect x="-13" y="-10" width="26" height="18" rx="9" fill="${opened ? '#1f4fb8' : '#d9472b'}" stroke="#fff" stroke-width="2"/><text x="0" y="3.5" font-size="10" font-weight="700" fill="#fff" text-anchor="middle" font-family="Noto Sans JP, sans-serif">${no}</text></g>
  </svg>`
}

/** お宝の名前から絵の種類を決める（名前を運営画面で変えても、合う絵がなければ宝石になる） */
export function treasureKind(name = '') {
  const rules = [
    [/羅針盤|コンパス/, 'compass'], [/鍵/, 'key'], [/石碑|石/, 'stone'], [/瓶|びん/, 'bottle'],
    [/うろこ|鱗/, 'scale'], [/地図/, 'map'], [/ビー玉|玉/, 'marble'], [/鈴|すず/, 'bell'],
  ]
  for (const [re, k] of rules) if (re.test(name)) return k
  return 'gem'
}

export const TREASURE_KINDS = ['compass', 'key', 'stone', 'bottle', 'scale', 'map', 'marble', 'bell', 'gem']
