import { expect, mock, test } from 'claude-code/testing'

const BAND = { component: 'AbovePrompt', props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 1, contentRows: 1 },
    view: {},
  },
} as const

test('프롬프트 위에 날씨, 사용량, 막대, 증감을 그린다', async ($, on) => {
  let tokens = 40_000
  on('session.usage', () => ({
    value: {
    startedAt: 0,
    context: { tokens, window: 200_000, percent: Math.round((tokens / 200_000) * 100) },
    rateLimits: [],
    },
  }))
  on('turn.complete', () => ({ text: '' }))

  const turn = { reason: 'answer', answer: '', durationMs: 1, isAborted: false } as const
  await $.turn.complete({ ...turn, turnId: 't1' })
  tokens = 134_400
  await $.turn.complete({ ...turn, turnId: 't2' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'token-weather', surface, ...BAND })
    const line = (await ui.find({ key: 'token-weather' }))?.text
    expect(line).toContain('☂ Showers')
    expect(line).toContain('67% · 134.4k / 200k')
    expect(line).toContain('▂▆')
    expect(line).toContain('▲ +94.4k last turn')
    await ui.unmount()
  }
})

test('서브에이전트 턴은 기록하지 않는다', async ($, on) => {
  on('session.usage', () => ({
    value: {
    startedAt: 0,
    context: { tokens: 50_000, window: 200_000, percent: 25 },
    rateLimits: [],
    },
  }))
  on('turn.complete', () => ({ text: '' }))
  const turn = { reason: 'answer', answer: '', durationMs: 1, isAborted: false } as const
  await $.turn.complete({ ...turn, turnId: 's1', agentId: 'sub' })

  const ui = await $.ui.mount({ plugin: 'token-weather', surface: 'terminal', ...BAND })
  const line = (await ui.find({ key: 'token-weather' }))?.text
  expect(line).toContain('☁ Cloudy')
  expect(line).not.toContain('last turn')
  await ui.unmount()
})

test('비용과 5시간 한도를 줄 끝에 붙이고, 80%를 넘으면 한 번 알린다', async ($, on) => {
  mock.clock(on, { now: Date.parse('2026-10-02T10:00:00Z') })
  let percentUsed = 42
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { tokens: 30_000, window: 200_000, percent: 15 },
      rateLimits: [{ kind: 'five_hour', percentUsed, resetsAt: '2026-10-02T11:20:00Z' }],
      cost: { usd: 1.234 },
    },
  }))
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('turn.complete', () => ({ text: '' }))
  const turn = { reason: 'answer', answer: '', durationMs: 1, isAborted: false } as const

  const ui = await $.ui.mount({ plugin: 'token-weather', surface: 'terminal', ...BAND })
  const line = (await ui.find({ key: 'token-weather' }))?.text
  expect(line).toContain('≈$1.23')
  expect(line).toContain('5h 42% (1h 20m 후 리셋)')
  await ui.unmount()

  percentUsed = 85
  await $.turn.complete({ ...turn, turnId: 'a' })
  await $.turn.complete({ ...turn, turnId: 'b' })
  expect(toasts.filter(t => t.includes('5시간 한도')).length).toBe(1)
})
