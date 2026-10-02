import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Weather } from '../types'
import { HISTORY, WARN_AT, delta, forecast, kilo, sparkline } from './weather'

const weather = atom(
  { plugin: 'token-weather', key: 'weather' } as const,
  { history: [], lastDelta: null, warned: false },
)

export const register: Register = on => {
  // 메인 대화의 턴이 끝날 때마다 사용량을 기록한다. 서브에이전트 턴은 건너뛴다.
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId) return result

    const { context } = await $.session.usage()
    const tokens = context.tokens
    if (tokens === undefined) return result

    let crossed = false
    await update($, weather, (w): Weather => {
      const previous = w.history[w.history.length - 1]
      const percent = context.percent ?? 0
      crossed = percent >= WARN_AT && !w.warned
      return {
        history: [...w.history, tokens].slice(-HISTORY),
        lastDelta: previous === undefined ? null : tokens - previous,
        warned: percent >= WARN_AT,
      }
    })
    if (crossed) $.ui.toast('↯ 맥락 창이 90%를 넘었습니다. 쉬기 전에 /compact 를 고려하세요.')

    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const { context } = await $.session.usage()
    if (context.tokens === undefined) return next(e)

    const percent = context.percent ?? Math.round((context.tokens / context.window) * 100)
    const sky = forecast(percent)
    const w: Weather = await read($, weather)
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box key="token-weather">
        <Text color={sky.color} bold>
          {sky.icon} {sky.label}
        </Text>
        <Text dimColor>
          {'  '}
          {percent}% · {kilo(context.tokens)} / {kilo(context.window)}
        </Text>
        {w.history.length > 1 ? (
          <Text color={sky.color}>
            {'  '}
            {sparkline(w.history, context.window)}
          </Text>
        ) : null}
        {w.lastDelta !== null ? (
          <Text dimColor>
            {'  '}
            {delta(w.lastDelta)}
          </Text>
        ) : null}
      </Box>
    )
  })
}
