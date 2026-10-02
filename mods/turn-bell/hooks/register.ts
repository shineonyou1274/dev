import type { Register } from 'claude-code'

import { LONG_MS, message } from './bell'

export const register: Register = on => {
  let tools = 0

  // 새 요청을 보내면 지난 알림을 지우고 도구 호출 수를 다시 센다.
  on('prompt.submit', ($, e, next) => {
    tools = 0
    $.ui.status(undefined)
    return next(e)
  })

  on('tool.call', ($, e, next) => {
    if (!e.agentId) tools += 1
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId || e.durationMs < LONG_MS) return result

    const text = message(e.reason, e.durationMs, tools)
    $.ui.toast(text, { timeoutMs: 15_000 })
    // 알림은 사라지므로, 자리를 비웠다 돌아와도 보이도록 다음 요청 전까지 상태줄에 남긴다.
    $.ui.status(text)
    return result
  })
}
