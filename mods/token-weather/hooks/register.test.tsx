import { expect, test } from 'claude-code/testing'

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
