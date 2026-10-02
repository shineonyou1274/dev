# Claude Code 세팅 키트

「Claude Code, 제대로 부려 쓰기」(claude.dev 블로그 13편 종합 자습서)에서 바로 적용할 수 있는 내용을 골라 파일로 만든 저장소입니다.

## 들어 있는 것

| 파일 | 자습서 장 | 쓰는 법 |
|---|---|---|
| `audit/skill-audit.md` | 5·6·11장 | 지금 쓰는 스킬 21개를 점검한 결과입니다. 1번 항목(humanizer 머리말 깨짐)부터 고치세요. |
| `claude-md/global-CLAUDE.md` | 4·5·7장 | `~/.claude/CLAUDE.md`에 복사합니다. 멈춤 규칙, 종료 보고 형식, 피할 디자인을 담았습니다. |
| `skills/_template/SKILL.md` | 6장 | 새 스킬을 만들 때 복사합니다. 트리거 중심 설명과 Gotchas 섹션이 들어 있습니다. |
| `hooks/careful.sh`, `hooks/settings.careful.json` | 6장 | `rm -rf`, force-push, `git reset --hard`, `DROP TABLE`, `kubectl delete`, `terraform apply`를 실행 직전에 막는 훅입니다. |

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
