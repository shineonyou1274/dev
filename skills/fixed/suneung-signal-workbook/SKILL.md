---
name: suneung-signal-workbook
description: "수능 영어 지문(요지·주제·제목 유형)에 신호등 독해법을 적용해 단계별 학습 워크북(.docx)을 만들 때 사용. 소재 연결(Chaining), 신호등(연결사), 통합 적용 순서로 구성하며, 지문이 달라도 같은 구조를 쓴다. 트리거 예: \"신호등 독해법으로 이 지문 워크북\", \"수능 영어 요지 문제 활동지\", \"이 기출 지문 학생 활동지로\". 뉴스가 재료인 활동지는 news-to-worksheet를 쓴다."
---

# 수능 영어 신호등 독해법 워크북 생성 스킬

## 핵심 원칙

이 스킬은 **방법론(Method)**을 저장한다. 특정 지문 데이터가 아니다.  
어떤 지문이 와도 신호등 독해법 3단계를 적용하여 워크북을 생성한다.

---

## 워크북 구조 (항상 이 구조)

```
STEP 1  첫 문장 주인공(A) + 속성(B) 잡기      [guided - 힌트 제공]
STEP 2  소재 연결(Chaining) 추적               [guided - 씨앗 단어 제공]
STEP 3  신호등(연결사) 분석                    [guided - 신호등 종류 제공]
STEP 4  통합 적용 (지문 전체, 힌트 없음)        [semi-solo]
STEP 5  전이 연습 (다른 지문, 백지 상태)        [fully solo]
```

여러 지문을 연속으로 만들 때:
- 처음 1~4문제: Steps 1~3 guided + 요지/정답란
- 나머지 문제: 6칸 분석 그리드만 (완전 독립)

---

## Step 1: 지문 분석 (Claude가 먼저 수행)

워크북 생성 전에 Claude가 직접 분석한다.

### 1-1. 주인공(A)과 속성(B) 찾기

첫 문장 구조: **[주인공 A]** + **[속성/동사구 B]**

- A = 추상명사 또는 핵심 개념어 (주로 명사구)
- B = A에 대한 필자의 주장 (동사구 또는 형용사)
- 힌트로 줄 하이라이트 구간 결정

### 1-2. Chaining 소재 추적

지문 전체에서 A(주인공)가 어떤 단어로 변신하는지 추적:

```
원형(A) → 동의어/상위어/대명사 → 또 다른 변신어 → ... → 마지막 문장
```

**찾는 방법:**
1. 지문에서 A와 의미상 같은 단어·구 목록 작성
2. 문장 번호와 함께 기록
3. 워크북에서 "첫 문장 → 변신어1 → 변신어2" 체인으로 배치

### 1-3. 신호등 위치와 종류 파악

| 신호등 | 색 | 의미 |
|--------|-----|------|
| However / But / Yet | 🔴 빨간불 | 방향 전환 → 뒤가 핵심 |
| Moreover / Furthermore / Also | 🟡 노란불 | 확장 → 방향 유지 |
| Indeed / In fact / Therefore / This means | 🟢 초록불 | 재진술 → 요지 직전 |
| Although / While / Even though (양보절) | 🟡 주절이 핵심 | 주절 = 정답 근거 |

분석 결과:
- 신호등 표현이 무엇인가?
- 신호등 종류(빨간/노란/초록)?
- 신호등 앞 내용 한 줄 요약
- 신호등 뒤 내용 한 줄 요약 (= 요지 핵심)

### 1-4. 요지 도출

신호등 뒤 내용 + 마지막 1~2문장을 합쳐 요지 한 문장 작성.

---

## Step 2: 워크북 생성 (docx)

분석 결과를 바탕으로 `references/docx-template.js`의 헬퍼 함수로 생성.

### 데이터 구조

```js
// 단일 지문 워크북
const problem = {
  num: 'E01',          // 문제 번호 (자유롭게 지정)
  title: '요지 찾기',
  src: '출처 (예: 2026 대비 수능 22번)',
  lines: [             // 지문을 줄바꿈 단위로 분리 (한 줄 ≈ 60-70자)
    '지문 1행',
    '지문 2행',
    ...
  ],
  // Claude 분석 결과
  subjectA: '주인공(A) - 첫 문장의 핵심 소재',
  attributeB: '속성(B) - 필자가 A에 대해 말하는 것',
  chainSeed: '첫 문장의 A 원형 단어 (영어)',
  chainWords: ['변신어1', '변신어2'],  // 지문에서 찾은 Chaining 단어들
  signal: 'However',                   // 핵심 신호등 표현
  signalType: '🔴 빨간불 (전환 신호)', // 신호등 종류
  signalBefore: '신호등 앞 내용 요약', // 한 줄
  signalAfter:  '신호등 뒤 핵심 내용', // 한 줄 = 요지 핵심
  gist: '요지 한 문장 (한글)',
  choices: ['①번 선지', '②번 선지', '③번 선지', '④번 선지', '⑤번 선지'],
  answer: 3,  // 정답 번호 (1~5)
};
```

### 생성 명령

```bash
node scripts/build-workbook.js
# 출력: /mnt/user-data/outputs/신호등_워크북_[문제번호].docx
```

---

## Step 3: 검증

```bash
python3 /mnt/skills/public/docx/scripts/office/validate.py output.docx
```

---

## 함정 (Node.js 22 파싱 버그)

`const 배열 = [...]` 내부에서 TBL 함수 호출 시 bracket 위치 주의:

```js
// ❌ 잘못 — TC의 opts가 TR에 전달됨 (bracket 위치 오류)
TBL([TR([TC([P([...])])], {bg, w:CW})], [CW])
//                       ↑ TR 2번째 인자로 잘못 들어감

// ✅ 올바름 — TC의 opts 위치 정확
TBL([TR([TC([P([...])], {bg, w:CW})])], [CW])
//               ↑ TC 2번째 인자 (정확)
```

상세 구현 코드 → `references/docx-template.js`
