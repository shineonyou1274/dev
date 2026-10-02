// 긴 작업이 끝났을 때 보여 줄 문구를 만든다.

export const LONG_MS = 2 * 60_000

export function duration(ms: number): string {
  const seconds = Math.round(ms / 1000)
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}분 ${s}초` : `${s}초`
}

export function message(reason: string, ms: number, tools: number): string {
  const head =
    reason === 'aborted' ? '■ 작업을 중단했습니다'
    : reason === 'error' ? '✕ 오류로 멈췄습니다'
    : reason === 'refusal' ? '✕ 모델이 요청을 거절했습니다'
    : '✓ 작업이 끝났습니다'
  return `${head} · ${duration(ms)} · 도구 ${tools}회`
}
