// 端末のローカル時刻から「昼／夕方／夜」を判定するフック（タイトル画面の背景演出用）
// デモ・検証用に、URLに ?tod=day / ?tod=dusk / ?tod=night を付けると実時刻を無視してその時間帯に固定できる
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export type TimeOfDay = 'day' | 'dusk' | 'night'

const VALID_TIMES: TimeOfDay[] = ['day', 'dusk', 'night']

// 境界はここで調整可能（24時間表記）
const DUSK_START = 16
const NIGHT_START = 18
const DAY_START = 6

function computeTimeOfDay(date: Date): TimeOfDay {
  const h = date.getHours()
  if (h >= NIGHT_START || h < DAY_START) return 'night'
  if (h >= DUSK_START) return 'dusk'
  return 'day'
}

function readOverride(value: string | null): TimeOfDay | null {
  return VALID_TIMES.includes(value as TimeOfDay) ? (value as TimeOfDay) : null
}

export function useTimeOfDay(): TimeOfDay {
  const [searchParams] = useSearchParams()
  const forced = readOverride(searchParams.get('tod'))

  const [value, setValue] = useState(() => forced ?? computeTimeOfDay(new Date()))

  useEffect(() => {
    if (forced) {
      setValue(forced)
      return
    }
    setValue(computeTimeOfDay(new Date()))
    const id = setInterval(() => setValue(computeTimeOfDay(new Date())), 60_000)
    return () => clearInterval(id)
  }, [forced])

  return value
}
