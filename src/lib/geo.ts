/**
 * Googleマップからコピーした座標・URLを、緯度・経度に変換する。
 * 対応する形：
 *  - 「34.454927, 133.903128」（地図を右クリック → 座標をクリックでコピーされる形）
 *  - 「34°27'17.7"N 133°54'11.3"E」（場所の詳細に出る度分秒の形）
 *  - URL：…/place/…/@34.45,133.90,17z/data=…!3d34.45!4d133.90…、?q=34.45,133.90、?ll=…、?query=…
 * 短縮URL（maps.app.goo.gl など）は中身を読めないので short_url を返す。
 */
export type ParsedLatLng = { ok: true; lat: number; lng: number } | { ok: false; reason: 'empty' | 'short_url' | 'unknown' }

const NUM = String.raw`[-+]?\d{1,3}(?:\.\d+)?`

const valid = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180

export function parseGoogleMapsLocation(raw: string): ParsedLatLng {
  // 全角の数字・記号を半角にそろえる
  const s = raw
    .trim()
    .normalize('NFKC')
    .replace(/[″“”]/g, '"')
    .replace(/[′‘’]/g, "'")
  if (!s) return { ok: false, reason: 'empty' }
  if (/^(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps)\//i.test(s)) return { ok: false, reason: 'short_url' }

  const tryPair = (a: string | undefined, b: string | undefined): ParsedLatLng | null => {
    if (a == null || b == null) return null
    const lat = Number(a)
    const lng = Number(b)
    return valid(lat, lng) ? { ok: true, lat, lng } : null
  }

  // URL：場所そのものの座標（!3d…!4d…）を最優先。次に q= / ll= / query= / @…
  const patterns = [
    new RegExp(String.raw`!3d(${NUM})!4d(${NUM})`),
    new RegExp(String.raw`[?&](?:q|ll|query|destination|center)=(${NUM}),\s*(${NUM})`),
    new RegExp(String.raw`/place/(${NUM}),\s*(${NUM})`),
    new RegExp(String.raw`@(${NUM}),(${NUM})`),
  ]
  const decoded = (() => {
    try {
      return decodeURIComponent(s)
    } catch {
      return s
    }
  })()
  for (const re of patterns) {
    const m = decoded.match(re)
    const r = m && tryPair(m[1], m[2])
    if (r) return r
  }

  // 度分秒：34°27'17.7"N 133°54'11.3"E
  const dms = decoded.match(
    /(\d{1,3})°\s*(\d{1,2})'\s*(\d{1,2}(?:\.\d+)?)"?\s*([NS])[\s,]+(\d{1,3})°\s*(\d{1,2})'\s*(\d{1,2}(?:\.\d+)?)"?\s*([EW])/i,
  )
  if (dms) {
    const deg = (d: string, m: string, sec: string, h: string) => (Number(d) + Number(m) / 60 + Number(sec) / 3600) * (/[SW]/i.test(h) ? -1 : 1)
    const lat = deg(dms[1], dms[2], dms[3], dms[4])
    const lng = deg(dms[5], dms[6], dms[7], dms[8])
    if (valid(lat, lng)) return { ok: true, lat, lng }
  }

  // 「34.454927, 133.903128」
  const pair = decoded.match(new RegExp(String.raw`^\(?\s*(${NUM})\s*[,\s]\s*(${NUM})\s*\)?$`))
  const r = pair && tryPair(pair[1], pair[2])
  if (r) return r

  return { ok: false, reason: 'unknown' }
}

/** Googleマップでその地点を開くURL */
export const googleMapsUrl = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`
