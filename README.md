# Claude Code 세팅 키트

「Claude Code, 제대로 부려 쓰기」(claude.dev 블로그 13편 종합 자습서)에서 바로 적용할 수 있는 내용을 골라 파일로 만든 저장소입니다.

## 들어 있는 것

| 파일 | 자습서 장 | 쓰는 법 |
|---|---|---|
| `audit/skill-audit.md` | 5·6·11장 | 지금 쓰는 스킬 21개를 점검한 결과입니다. 1번 항목(humanizer 머리말 깨짐)부터 고치세요. |
| `claude-md/global-CLAUDE.md` | 4·5·7장 | `~/.claude/CLAUDE.md`에 복사합니다. 멈춤 규칙, 종료 보고 형식, 피할 디자인을 담았습니다. |
| `skills/_template/SKILL.md` | 6장 | 새 스킬을 만들 때 복사합니다. 트리거 중심 설명과 Gotchas 섹션이 들어 있습니다. |
| `hooks/careful.sh`, `hooks/settings.careful.json` | 6장 | `rm -rf`, force-push, `git reset --hard`, `DROP TABLE`, `kubectl delete`, `terraform apply`를 실행 직전에 막는 훅입니다. |
| `mods/credit-guard/` | 9장 | Higgsfield 생성 도구가 실행되기 직전에 진행할지 묻는 모드입니다. |
| `mods/turn-bell/` | 9장 | 2분 넘게 걸린 작업이 끝나면 알려 주는 모드입니다. |
| `mods/token-weather/` | 9장 | 프롬프트 위에 맥락 창 사용량을 날씨처럼 보여 주는 모드입니다. 설치 방법은 아래에 있습니다. |

## 설치

```bash
# 1. 전역 CLAUDE.md (이미 있으면 내용을 합칩니다)
cp claude-md/global-CLAUDE.md ~/.claude/CLAUDE.md

# 2. 위험 명령 차단 훅
mkdir -p ~/.claude/hooks
cp hooks/careful.sh ~/.claude/hooks/
# settings.careful.json의 "hooks" 부분을 ~/.claude/settings.json에 합칩니다.
```

훅은 항상 켜 두면 정상 작업도 막을 수 있습니다. 불편하면 프로젝트의 `.claude/settings.json`에만 넣어 해당 저장소에서만 켜세요.

## 토큰 웨더 모드

프롬프트 바로 위에 다음과 같은 한 줄이 나옵니다. 매 턴이 끝날 때마다 새로 계산합니다.

```
☂ Showers  67% · 134.4k / 200k  ▂▆  ▲ +94.4k last turn  · ≈$1.23  · 5h 42% (1h 20m 후 리셋)
```

줄 끝의 두 값은 세션 비용과 5시간 한도 사용률입니다. 구독 플랜에서 비용은 실제 청구액이 아니라 작업량을 가늠하는 값이라 앞에 '≈'를 붙였습니다. 5시간 한도는 80%부터 자홍색, 90%부터 빨간색으로 바뀌고, 80%를 처음 넘을 때 알림이 한 번 뜹니다. API 키로 쓰면 한도 정보가 없으므로 비용만 나옵니다.

| 사용률 | 표시 | 색 |
|---|---|---|
| 25% 미만 | ☀ Clear | 노랑 |
| 25~49% | ☁ Cloudy | 청록 |
| 50~74% | ☂ Showers | 파랑 |
| 75~89% | ☇ Storm | 자홍 |
| 90% 이상 | ↯ Compact soon | 빨강 |

75%(Storm)를 처음 넘을 때 `/compact`를 권하는 알림이 한 번 뜹니다. 막대는 최근 12턴의 사용량이고, 서브에이전트의 턴은 세지 않습니다. Claude Code v2.1.287 이상에서 동작합니다.

설치는 둘 중 하나를 고릅니다.

```bash
# 1. 이 저장소를 마켓플레이스로 등록해 설치 (계속 쓸 때)
/plugin marketplace add shineonyou1274/dev
/plugin install token-weather@shiny-mods
/plugin install credit-guard@shiny-mods
/plugin install turn-bell@shiny-mods
/reload-plugins

# 2. 한 번 시험해 볼 때
git clone https://github.com/shineonyou1274/dev && claude --plugin-dir ./dev/mods/token-weather
```

구간 경계(예: Storm을 70%부터)는 `mods/token-weather/hooks/weather.ts`의 `forecast` 함수에서 바꿉니다. 바꾼 뒤에는 `claude plugin test mods/token-weather`로 확인합니다.

## 크레딧 확인 모드 (credit-guard)

Claude가 Higgsfield에서 크레딧을 쓰는 도구(영상·이미지·음성 생성, 업스케일, 배경 제거, 프리셋 실행 등)를 부르기 직전에 확인 창을 띄웁니다. 창에는 모델 이름과 프롬프트 앞부분이 함께 나옵니다.

- **진행:** 그대로 실행합니다.
- **취소:** 실행을 막고, Claude에게 다시 시도하지 말고 무엇을 바꿀지 물어보라고 알립니다.
- **이번 세션은 묻지 않기:** 같은 세션에서는 더 묻지 않습니다. 새 세션을 시작하면 다시 묻습니다.

잔액 조회, 생성 기록 보기, 광고 견적처럼 크레딧을 쓰지 않는 도구는 묻지 않습니다. 창을 닫거나 물어볼 사람이 없는 실행(`claude -p`)에서는 취소로 처리합니다. 막을 도구 목록은 `mods/credit-guard/hooks/spend.ts`의 `SPENDING`에서 고칩니다.

## 긴 작업 완료 알림 (turn-bell)

Claude의 작업 한 번(턴)이 2분 넘게 걸리면, 끝났을 때 다음과 같은 알림이 15초 동안 뜹니다.

```
✓ 작업이 끝났습니다 · 3분 12초 · 도구 41회
```

중단했거나 오류로 멈춘 경우에는 첫머리가 "■ 작업을 중단했습니다", "✕ 오류로 멈췄습니다"로 바뀝니다. 알림이 사라진 뒤에도 같은 문구가 상태줄에 남아 있다가, 다음 요청을 보내면 지워집니다. 서브에이전트의 작업은 따로 알리지 않습니다. 기준 시간은 `mods/turn-bell/hooks/bell.ts`의 `LONG_MS`에서 바꿉니다.

## 자습서에서 바로 쓸 습관 (선생님 작업 기준)

1. **effort**: 활동지 문구 수정, 파일 이름 바꾸기는 `/effort low`, 새 앱 만들기는 기본값(medium), 오래된 앱의 버그 찾기는 `high`로 둡니다. `xhigh`와 `max`는 효과를 확인한 작업에만 씁니다.
2. **캐시**: 모델 바꾸기, MCP 연결, `/fast` 켜기는 세션을 시작할 때 정합니다. 30분 넘게 쉬기 전에는 `/compact`를 하고, 관련 없는 작업으로 넘어갈 때는 `/clear`를 씁니다.
3. **맡기는 문장**: 큰 작업은 "완료 기준"과 "멈추고 물어볼 조건"을 한 메시지에 담습니다. "깊이 생각해", "step by step" 같은 문구는 지웁니다.
   > 연수 진행보드를 만들어 줘. 완료 기준: 블록 6개가 모두 화면에 나오고, 타이머가 실제로 동작하고, 휴대전화 화면에서도 깨지지 않는다. 학생 개인정보가 들어가야 할 것 같으면 멈추고 물어봐.
4. **산출물**: 수업 설계안, 앱 검토 결과처럼 긴 문서는 "HTML 한 장으로 만들어 줘"라고 요청합니다.
5. **확인**: 작업이 끝나면 `/usage`로 캐시 비중을 봅니다. 긴 세션인데 캐시 비중이 낮으면 도중의 모델 변경이나 긴 휴식을 의심합니다.

## 4주 실습 순서 (자습서 14장)

- [ ] 1주: 작업 종류별 기본 effort 표 만들기 (`/usage`로 medium과 high 비교)
- [ ] 2주: 전역 CLAUDE.md 적용, `/doctor`와 `/claude-api prompt-audit` 실행
- [ ] 3주: `audit/skill-audit.md`의 1~3번 처리 (humanizer 정리, HTML 스킬 경계, 함정 섹션 추가)
- [ ] 4주: 스킬 하나에 `/claude-api build-eval` 다음 `hillclimb` 적용, 비용 미터 같은 모드 하나 만들어 보기

자습서의 수치는 원문 예시이거나 한 벤치마크의 결과입니다. 내 작업에서 `/usage`와 eval로 얻은 숫자를 가장 믿으세요.
