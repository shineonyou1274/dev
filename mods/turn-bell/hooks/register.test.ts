import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const TURN = { reason: 'answer', answer: '', isAborted: false, turnId: 't' } as const

function capture(on: On) {
  const toasts: string[] = []
  const status: (string | undefined)[] = []
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('ui.status', (_$, e) => {
    status.push(e.text)
    return { value: undefined }
  })
  on('turn.complete', () => ({ text: '' }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('tool.call', () => ({ result: { content: [] } }))
  return { toasts, status }
}

test('2분 넘게 걸린 턴이 끝나면 알리고 상태줄에 남긴다', async ($, on) => {
  const { toasts, status } = capture(on)
  await $.prompt.submit({ text: '영상 렌더해 줘' } as never)
  await $.tool.call({ tool: 'Bash', command: 'ls' } as never)
  await $.tool.call({ tool: 'Bash', command: 'ls', agentId: 'sub' } as never)
  await $.turn.complete({ ...TURN, durationMs: 192_000 })
  expect(toasts).toEqual(['✓ 작업이 끝났습니다 · 3분 12초 · 도구 1회'])
  expect(status.at(-1)).toBe('✓ 작업이 끝났습니다 · 3분 12초 · 도구 1회')

  await $.prompt.submit({ text: '다음' } as never)
  expect(status.at(-1)).toBeUndefined()
})

test('짧은 턴과 서브에이전트 턴은 알리지 않는다', async ($, on) => {
  const { toasts } = capture(on)
  await $.turn.complete({ ...TURN, durationMs: 30_000 })
  await $.turn.complete({ ...TURN, durationMs: 300_000, agentId: 'sub' })
  expect(toasts).toEqual([])
})
