import { expect, test } from 'claude-code/testing'

import { action, summary } from './spend'

test('생성 작업만 크레딧 사용으로 본다', async () => {
  expect(action('mcp__Higgsfield__generate_video')).toBe('generate_video')
  expect(action('mcp__claude_ai_Higgsfield__upscale_image')).toBe('upscale_image')
  expect(action('mcp__Higgsfield__generate_image_batch')).toBe('generate_image_batch')
  expect(action('mcp__Higgsfield__balance')).toBeUndefined()
  expect(action('mcp__Higgsfield__ads_studio_quote')).toBeUndefined()
  expect(action('mcp__Higgsfield__show_generations')).toBeUndefined()
  expect(action('mcp__Canva__generate-design')).toBeUndefined()
})

test('확인 창 설명 줄에 모델과 프롬프트 앞부분을 넣는다', async () => {
  expect(summary({ model: 'seedance-2', prompt: '교실 칠판 앞에서 웃는 학생' })).toBe(
    '모델 seedance-2 · "교실 칠판 앞에서 웃는 학생"',
  )
  expect(summary({ jobs: [{}, {}, {}] })).toBe('3건 묶음')
  expect(summary({})).toBe('')
})
