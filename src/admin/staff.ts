import { supabase } from '../lib/supabase'

const KEY = 'takara-nazo:staff-pin'

export function getPin(): string | null {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}
export function setPin(pin: string | null) {
  try {
    if (pin) sessionStorage.setItem(KEY, pin)
    else sessionStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}

/** 運営用RPCを呼ぶ（PINを自動で付ける） */
export async function staff<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, { p_pin: getPin(), ...args })
  if (error) throw error
  return data as T
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
