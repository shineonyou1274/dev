import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const VIDEO = { tool: 'mcp__Higgsfield__generate_video', model: 'seedance-2', prompt: '봄 교정' } as const

// 사용자가 확인 창에서 고를 답을 정해 두고, 몇 번 물었는지 센다.
function answering(on: On, answer: string) {
  const asked: string[] = []
  on('tool.call', { tool: 'AskUserQuestion' }, (_$, e) => {
    const question = e.questions[0]?.question ?? ''
    asked.push(question)
    return { result: { questions: e.questions, answers: { [question]: answer } } }
  })
  return asked
}

// 실제 Higgsfield 대신 호출 횟수만 센다.
function higgsfield(on: On) {
  const ran: string[] = []
  on('tool.call', { tool: /higgsfield/i }, (_$, e) => {
    ran.push(e.tool)
    return { result: { content: [{ type: 'text', text: 'ok' }] } }
  })
  return ran
}

test('진행을 고르면 실행된다', async ($, on) => {
  const asked = answering(on, '진행')
  const ran = higgsfield(on)
  const out = await $.tool.call(VIDEO as never)
  expect(out.deny).toBeUndefined()
  expect(ran).toEqual(['mcp__Higgsfield__generate_video'])
  expect(asked[0]).toContain('generate_video')
})

test('취소를 고르면 막고, 모델에게 다시 시도하지 말라고 알린다', async ($, on) => {
  answering(on, '취소')
  const ran = higgsfield(on)
  const out = await $.tool.call(VIDEO as never)
  expect(ran).toEqual([])
  expect(out.deny ?? out.text).toContain('다시 시도하지 말고')
})

test('이번 세션은 묻지 않기를 고르면 다음부터 묻지 않는다', async ($, on) => {
  const asked = answering(on, '이번 세션은 묻지 않기')
  const ran = higgsfield(on)
  await $.tool.call(VIDEO as never)
  await $.tool.call(VIDEO as never)
  expect(asked.length).toBe(1)
  expect(ran.length).toBe(2)
})

test('조회 도구는 묻지 않는다', async ($, on) => {
  const asked = answering(on, '취소')
  const ran = higgsfield(on)
  await $.tool.call({ tool: 'mcp__Higgsfield__balance' } as never)
  expect(asked).toEqual([])
  expect(ran).toEqual(['mcp__Higgsfield__balance'])
})
