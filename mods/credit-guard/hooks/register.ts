import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { GO, STOP, TRUST, action, summary } from './spend'

const trusted = atom({ plugin: 'credit-guard', key: 'trusted' } as const, false)
const approved = atom({ plugin: 'credit-guard', key: 'approved' } as const, 0)
const cancelled = atom({ plugin: 'credit-guard', key: 'cancelled' } as const, 0)

export const register: Register = on => {
  on('tool.call', { tool: /higgsfield/i }, async ($, e, next) => {
    const name = action(e.tool)
    if (name === undefined || (await read($, trusted))) return next(e)

    const { tool, tool_use_id, ...args } = e as typeof e & Record<string, unknown>
    const detail = summary(args)

    let answer: string
    try {
      const where = detail ? `[${detail}] ` : ''
      answer = await $.ui.ask(`${where}Higgsfield 크레딧을 쓰는 ${name}을(를) 실행할까요?`, {
        header: '크레딧',
        options: [GO, STOP, TRUST],
      })
    } catch {
      // 창을 닫았거나 물어볼 사람이 없는 실행(claude -p)이면 쓰지 않는 쪽으로 정한다.
      answer = STOP
    }

    if (answer === GO || answer === TRUST) {
      if (answer === TRUST) await update($, trusted, () => true)
      await update($, approved, n => n + 1)
      return next(e)
    }

    await update($, cancelled, n => n + 1)
    return {
      deny: `사용자가 Higgsfield ${name} 실행을 취소했습니다(크레딧 보호). 다시 시도하지 말고, 바꿀 점이 있는지 사용자에게 물어보세요.${answer !== STOP ? ` 사용자 메모: ${answer}` : ''}`,
    }
  })
}
