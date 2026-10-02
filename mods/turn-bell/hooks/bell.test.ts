import { expect, test } from 'claude-code/testing'

import { duration, message } from './bell'

test('걸린 시간을 분과 초로 쓴다', async () => {
  expect(duration(45_000)).toBe('45초')
  expect(duration(192_000)).toBe('3분 12초')
})

test('끝난 이유에 따라 첫머리가 달라진다', async () => {
  expect(message('answer', 192_000, 41)).toBe('✓ 작업이 끝났습니다 · 3분 12초 · 도구 41회')
  expect(message('aborted', 130_000, 3)).toContain('■ 작업을 중단했습니다')
  expect(message('error', 130_000, 3)).toContain('✕ 오류로 멈췄습니다')
})
