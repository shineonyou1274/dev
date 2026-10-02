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
export const WARN_AT = 90
