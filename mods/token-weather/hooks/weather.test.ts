import { describe, expect, test } from 'claude-code/testing'

import { delta, forecast, kilo, limitColor, limitText, money, sparkline, until } from './weather'

describe('weather', () => {
  test('사용률 구간마다 날씨가 바뀐다', async () => {
    expect(forecast(10).label).toBe('Clear')
    expect(forecast(25).label).toBe('Cloudy')
    expect(forecast(60).label).toBe('Showers')
    expect(forecast(80).label).toBe('Storm')
    expect(forecast(95).label).toBe('Compact soon')
  })

  test('토큰 수와 증감을 짧게 쓴다', async () => {
    expect(kilo(134_400)).toBe('134.4k')
    expect(kilo(200_000)).toBe('200k')
    expect(delta(98_300)).toBe('▲ +98.3k last turn')
    expect(delta(-12_000)).toBe('▼ -12k last turn')
  })

  test('막대 높이는 창 대비 사용률을 따른다', async () => {
    expect(sparkline([0, 100_000, 200_000], 200_000)).toBe('▁▅█')
  })

  test('비용과 5시간 한도를 짧게 쓴다', async () => {
    expect(money(1.234)).toBe('≈$1.23')
    expect(money(12.34)).toBe('≈$12.3')
    expect(until(42 * 60_000)).toBe('42m')
    expect(until(80 * 60_000)).toBe('1h 20m')
    const now = Date.parse('2026-10-02T10:00:00Z')
    expect(limitText(42, '2026-10-02T11:20:00Z', now)).toBe('5h 42% (1h 20m 후 리셋)')
    expect(limitText(42.4, undefined, now)).toBe('5h 42%')
    expect(limitColor(30)).toBe('gray')
    expect(limitColor(85)).toBe('magenta')
    expect(limitColor(95)).toBe('red')
  })
})
