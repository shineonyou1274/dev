// 어떤 Higgsfield 도구가 크레딧을 쓰는지 판단하고, 확인 창 문구를 만든다.

// 생성·변환 작업만 막는다. 조회(list_, get_, show_, balance 등)와 미리 보기 견적은 그대로 통과한다.
const SPENDING = [
  /^generate_/,
  /^upscale_/,
  /^execute_preset$/,
  /^remove_background$/,
  /^outpaint_image$/,
  /^reframe$/,
  /^motion_control$/,
  /^dubbing$/,
  /^voice_change$/,
  /^create_voice/,
  /^ads_studio_generate$/,
  /^shorts_studio_create$/,
  /^animation_actions$/,
  /^video_analysis_create$/,
  /^virality_predictor$/,
  /^separate_image_layers$/,
]

// 'mcp__claude_ai_Higgsfield__generate_video' 처럼 서버 이름이 달라도 마지막 부분이 작업 이름이다.
export function action(tool: string): string | undefined {
  if (!/higgsfield/i.test(tool)) return undefined
  const name = tool.split('__').pop() ?? ''
  return SPENDING.some(p => p.test(name)) ? name : undefined
}

function clip(value: unknown, length: number): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined
  const one = value.replace(/\s+/g, ' ').trim()
  return one.length > length ? `${one.slice(0, length)}…` : one
}

// 확인 창 아래 한 줄에 모델, 개수, 프롬프트 앞부분을 보여 준다.
export function summary(args: Record<string, unknown>): string {
  const parts: string[] = []
  const model = clip(args.model ?? args.model_id, 40)
  if (model) parts.push(`모델 ${model}`)
  const batch = [args.jobs, args.items, args.requests].find(Array.isArray)
  if (batch) parts.push(`${batch.length}건 묶음`)
  const count = args.num_images ?? args.count ?? args.n
  if (typeof count === 'number' && count > 1) parts.push(`${count}장`)
  const prompt = clip(args.prompt ?? args.text, 60)
  if (prompt) parts.push(`"${prompt}"`)
  return parts.join(' · ')
}

export const GO = '진행'
export const STOP = '취소'
export const TRUST = '이번 세션은 묻지 않기'
