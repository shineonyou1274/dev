# 내 스킬 점검 결과 (2026-10-02)

자습서 5장(맥락 정리)과 6장(스킬 작성 요령)의 기준으로, 직접 만들거나 추가한 스킬 21개를 점검했습니다. Anthropic 기본 스킬(docx, pdf, pptx, xlsx 등)은 제외했습니다. 급한 순서대로 적었습니다.

## 1. 바로 고칠 것

### humanizer의 머리말(frontmatter)이 깨져 있습니다
파일 맨 위에 머리말이 두 번 들어가 있습니다. 첫 번째 머리말의 설명은 `"자연스러운 한국어"` 한 줄뿐이고, 원래의 긴 설명은 두 번째 블록에 있어 본문으로 읽힙니다. Claude는 첫 번째 머리말만 보고 스킬을 고르기 때문에 이 스킬은 거의 불리지 않습니다.

더 큰 문제는 plain-korean과 겹친다는 점입니다. plain-korean 설명에도 "자연스럽게", "AI 티 난다", "윤문"이 트리거로 들어 있어, 두 스킬이 같은 요청의 후보가 됩니다. 다음 둘 중 하나를 고르세요.

- **권장: humanizer를 끈다.** plain-korean이 선생님의 기준(교과서체)을 담고 있고, humanizer는 외부 저자(DaleSeo)의 범용 스킬입니다. 필요한 패턴(쉼표 과다, 대명사 과다 등)은 plain-korean의 `references/word-list.md`로 옮기면 됩니다.
- **남긴다면** 머리말을 아래처럼 하나로 고치고, 역할을 나눕니다.

```yaml
---
name: humanizer
description: "이미 쓴 한국어 글에서 AI 문체 패턴(쉼표 과다, 띄어쓰기 경직, 대명사·복수형 과다 등 40가지)을 심각도별로 진단해 보고할 때 사용. 트리거 예: \"AI 티 나는지 진단해 줘\", \"AI 패턴 분석\". 새로 쓰는 글이나 윤문은 plain-korean을 쓴다."
---
```

### guide-panel-layout 설명의 오타
"결과가 즐시 만들어지는"의 "즐시"를 "즉시"로 고칩니다. 설명은 Claude가 읽는 문장이라 오타도 판단에 영향을 줍니다.

## 2. 트리거가 겹치는 묶음

| 묶음 | 상태 | 할 일 |
|---|---|---|
| master-sheet v1·v2, storyboard v1·v2, seedance, ad-motion-prompt·make, videointro·videointro2 | 설명마다 "~은 이 스킬이 아니라 ~을 쓴다"가 있어 잘 나뉘어 있습니다. | 그대로 둡니다. 다른 스킬도 이 방식을 따르면 됩니다. |
| single-html-app, guide-panel-layout, pd-runsheet | 셋 다 "단일 HTML"을 만듭니다. 서로를 언급하지 않아, 연수 자료 요청에서 어느 스킬이 불릴지 모호합니다. | single-html-app을 공통 규칙으로 두고, 나머지 두 스킬 설명에 "제작 규칙은 single-html-app을 함께 따른다"를 넣습니다. guide-panel-layout은 "안내서·매뉴얼", pd-runsheet는 "연수 당일 진행보드"로 범위를 분명히 적습니다. |
| expert-panel, first-principles | 겹치지 않습니다. | 그대로 둡니다. |

## 3. 함정(Gotchas) 섹션이 없는 스킬이 많습니다
ad-motion-make, ad-motion-prompt, videointro, videointro2에는 "## 함정" 섹션이 있습니다. videointro의 "함정 (이번 제작에서 실제로 겪은 것)"이 자습서가 말하는 모양 그대로입니다. sheet-game-builder의 "자주 나는 오류" 표와 suneung-signal-workbook의 "주의사항 (Node.js 22 파싱 버그)"도 같은 역할을 합니다. 나머지 스킬에는 이런 섹션이 없고, 일부 스킬에 "⚠️ 반드시 준수" 같은 문장이 흩어져 있을 뿐입니다. 아래 네 개부터 섹션을 만드세요. 붙여 넣을 초안은 `audit/skill-frontmatter-drafts.md`에 있습니다.

- **single-html-app**: 본문 2~3절의 다크 모드 토큰, 아티팩트 제약, localStorage 예외 처리를 함정 섹션으로 모음
- **guide-panel-layout**: 본문의 "반드시 지킬 것"과 "자주 틀리는 것"을 함정 섹션으로 옮김
- **pd-runsheet**: 공유보드 주소, 권한 승인에서 막히는 시간, 상상으로 그린 수업 장면을 함정 섹션으로 모음
- **news-to-worksheet**: 본문의 "DOCX 테이블 레이아웃, 어기면 뒷 페이지 열 찌그러짐"을 함정 섹션으로 옮김

## 4. 너무 긴 SKILL.md (200줄 넘음)

| 스킬 | 줄 수 | 할 일 |
|---|---|---|
| seedance-continuity-builder | 573 | 샷 형식·금지 목록·예시를 `references/`로 나누고, SKILL.md에는 순서와 언제 무엇을 읽을지만 남깁니다. |
| hwpx | 400 | 이미 `references/`가 있습니다. 본문의 XML 세부 규칙을 그쪽으로 옮깁니다. |
| humanizer | 326 | 끌 경우 해당 없음 |
| master-sheet-v2 | 212 | 출력 텍스트 블록 양식을 `assets/`로 옮깁니다. |

## 5. 강한 명령어 줄이기
"반드시", "절대", "MUST"가 많은 스킬이 있습니다(seedance, hwpx, first-principles 등). 최신 모델은 금지 규칙이 많을수록 오히려 헷갈립니다. 다음 순서로 바꿉니다.

1. "절대 ~하지 마"를 이유가 붙은 문장으로 바꿉니다. sheet-game-builder의 "문항은 코드에 넣지 않는다. 코드에 넣는 순간 만든 사람만 쓸 수 있는 자료가 된다"가 좋은 본보기입니다.
2. 설명(description)의 "다음 상황에서 반드시 이 스킬을 사용한다"는 "~할 때 사용"으로 줄입니다(expert-panel, first-principles, gpt-api, news-to-worksheet, suneung-signal-workbook).
3. hwpx의 "mimetype 절대 수정 금지"처럼 어기면 파일이 실제로 깨지는 규칙은 그대로 둡니다.

## 6. 다음 단계: 힐클라이밍 후보
"가끔 안 불린다" 싶은 스킬이 있으면 11장의 `/claude-api build-eval`로 "이 스킬이 불려야 하는 요청"과 "불리면 안 되는 요청"을 모은 세트를 만들고, 설명만 바꿔 가며 호출률을 올립니다. 첫 후보는 humanizer와 plain-korean의 경계, 그리고 HTML 스킬 세 개의 경계입니다.
