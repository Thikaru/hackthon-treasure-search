import { createClient } from '@supabase/supabase-js'

// 公開用のURLとキー（ブラウザに出してよい値）。データの保護はRLSとRPCで行っています。
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'takara-nazo-auth' },
})

/** RPCのエラーから、SQL側で raise したコード（too_many など）を取り出す */
export function errorCode(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e)
  const known = ['invalid_input', 'guidepost_hidden', 'bad_setting', 'too_many', 'not_registered', 'not_signed_in', 'not_found_yet', 'not_cleared', 'bad_pin', 'staff_locked', 'unknown_treasure']
  return known.find((k) => msg.includes(k)) ?? 'unknown'
}

export function errorMessage(e: unknown): string {
  switch (errorCode(e)) {
    case 'invalid_input':
      return '入力内容に不足があります。名前・エリア・問題文・正解（各1つ以上）を確認してください'
    case 'guidepost_hidden':
      return 'この宝の道標はまだ現れていません。前の道標を先に解いてください'
    case 'too_many':
      return '送信が多すぎます。1分ほど待ってからもう一度試してください'
    case 'not_registered':
    case 'not_signed_in':
      return '参加登録が必要です'
    case 'not_found_yet':
      return '先に現地でQRを読み込んでください'
    case 'not_cleared':
      return 'まだクリア条件を満たしていません'
    case 'bad_pin':
      return 'PINが違います'
    case 'staff_locked':
      return '失敗が続いたため、しばらくログインできません'
    default:
      return '通信に失敗しました。電波の良い場所でもう一度試してください'
  }
}
