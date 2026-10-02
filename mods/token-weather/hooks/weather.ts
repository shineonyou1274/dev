// 맥락 사용률을 날씨로 바꾸는 순수 함수들. register.tsx와 테스트가 함께 쓴다.

export type Forecast = { icon: string; label: string; color: string }

export function forecast(percent: number): Forecast {
  if (percent < 25) return { icon: '☀', label: 'Clear', color: 'yellow' }
  if (percent < 50) return { icon: '☁', label: 'Cloudy', color: 'cyan' }
  if (percent < 75) return { icon: '☂', label: 'Showers', color: 'blue' }
  if (percent < 90) return { icon: '☇', label: 'Storm', color: 'magenta' }
  return { icon: '↯', label: 'Compact soon', color: 'red' }
}

export function kilo(tokens: number): string {
  return `${(tokens / 1000).toFixed(1).replace(/\.0$/, '')}k`
}

const BARS = '▁▂▃▄▅▆▇█'

// 최근 값들을 맥락 창 크기 기준의 막대로 그린다. 창 대비라서 막대 높이가 사용률과 같다.
export function sparkline(values: readonly number[], window: number): string {
  return values
    .map(v => BARS[Math.min(BARS.length - 1, Math.max(0, Math.floor((v / window) * BARS.length)))])
    .join('')
}

export function delta(change: number): string {
  const sign = change >= 0 ? '▲ +' : '▼ -'
  return `${sign}${kilo(Math.abs(change))} last turn`
}

export const HISTORY = 12
// Storm에 들어서는 시점. 이때 쉬기 전 /compact 를 해 두면 캐시가 식은 뒤 다시 읽는 비용을 피한다.
export const WARN_AT = 75

// 세션 비용. 구독 사용자에게는 청구액이 아니라 작업량 지표이므로 '≈'를 붙인다.
export function money(usd: number): string {
  return `≈$${usd < 10 ? usd.toFixed(2) : usd.toFixed(1)}`
}

// '42m', '1h 20m'처럼 남은 시간을 짧게 쓴다. 시간대와 상관없이 맞도록 남은 시간으로 보여 준다.
export function until(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000))
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function limitColor(percent: number): string {
  if (percent >= 90) return 'red'
  if (percent >= LIMIT_WARN_AT) return 'magenta'
  return 'gray'
}

export function limitText(percent: number, resetsAt: string | undefined, now: number): string {
  const reset = resetsAt ? Date.parse(resetsAt) : NaN
  const left = Number.isFinite(reset) ? ` (${until(reset - now)} 후 리셋)` : ''
  return `5h ${Math.round(percent)}%${left}`
}

export const LIMIT_WARN_AT = 80
