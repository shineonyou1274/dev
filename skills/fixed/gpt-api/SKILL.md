---
name: gpt-api
description: "OpenAI(GPT) API를 쓰는 아티팩트를 만들 때 사용. 결과물은 사용자가 자기 API 키를 입력하는 칸이 있는 HTML 또는 React 아티팩트이다. 트리거 예: \"GPT로 이미지 만들어 줘\", \"달리로 그려 줘\", \"DALL-E\", \"gpt-image\", \"GPT API 써서\", \"OpenAI 연결해서\", \"내 키 써서 만들어 줘\", GPT와 Claude를 함께 쓰는 앱. Higgsfield로 이미지나 영상을 만드는 요청은 이 스킬이 아니다."
---

# GPT API Artifact 스킬

Peace(손평화 선생님)가 OpenAI API를 Claude Artifact 안에서 바로 쓸 수 있도록
즉시 실행 가능한 앱을 만드는 스킬.

---

## 핵심 원칙

1. **API 키는 항상 사용자 입력** — 코드에 하드코딩 절대 금지
2. **즉시 실행 가능** — 열자마자 쓸 수 있는 완성형 Artifact
3. **한국어 UI** — 모든 인터페이스는 한국어
4. **로딩/에러 처리 필수** — 생성 중 스피너, 실패 시 명확한 메시지

---

## 용도별 템플릿 선택

### A. 이미지 생성 앱
- 트리거: "이미지 만들어줘", "그림 생성", "DALL-E", "gpt-image"
- 모델: `gpt-image-1` (기본) 또는 `dall-e-3`
- 출력: 생성된 이미지 + 다운로드 버튼

### B. 텍스트/콘텐츠 생성 앱
- 트리거: "슬라이드 내용", "활동지 생성", "스크립트", "텍스트 생성"
- 모델: `gpt-4o`
- 출력: 생성된 텍스트, 복사 버튼, 구조화된 표시

### C. 복합 앱 (텍스트 + 이미지)
- 트리거: "내용도 짜고 이미지도", "슬라이드 + 삽화"
- 두 API 동시 활용

### D. Claude + GPT 하이브리드
- 트리거: "클로드랑 GPT 같이", "두 모델 비교"
- Anthropic API + OpenAI API 동시 호출

---

## 구현 패턴

### API 키 입력 UI (모든 앱 필수)
```html
<div class="api-key-section">
  <input type="password" id="apiKey" placeholder="OpenAI API 키를 입력하세요 (sk-...)" />
  <button onclick="saveKey()">저장</button>
  <span id="keyStatus">🔴 키 없음</span>
</div>
```

### 이미지 생성 API 호출
```javascript
async function generateImage(prompt, apiKey) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: prompt,
      n: 1,
      size: "1024x1024"  // "1024x1024" | "1024x1792" | "1792x1024"
    })
  });
  const data = await response.json();
  // gpt-image-1은 b64_json 반환
  return `data:image/png;base64,${data.data[0].b64_json}`;
}
```

### 텍스트 생성 API 호출
```javascript
async function generateText(systemPrompt, userPrompt, apiKey) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 2000
    })
  });
  const data = await response.json();
  return data.choices[0].message.content;
}
```

---

## 교육 현장 특화 프롬프트 패턴

### 슬라이드 내용 생성
```
system: "당신은 한국 고등학교 교사를 위한 수업 콘텐츠 전문가입니다. 
         교육부 교육과정에 맞는 명확하고 학생 친화적인 내용을 작성하세요."
user: "[주제]에 대한 5슬라이드 분량의 수업 내용을 JSON 형식으로 작성해주세요.
       각 슬라이드: title, bullets(3개), teacherNote"
```

### 활동지 생성
```
system: "한국 고등학교 학생용 SEL 활동지 전문가입니다."
user: "[활동 주제]에 대한 활동지를 작성해주세요. 
       포함 요소: 도입질문, 활동내용, 성찰질문, 학생작성란"
```

### 수업 이미지 생성
```
prompt 패턴: "[교육 개념]을 시각적으로 표현한 깔끔한 교육용 일러스트레이션. 
             밝은 색상, 심플한 스타일, 텍스트 없음, 고등학생 대상"
```

---

## 에러 처리 필수 항목

```javascript
// API 키 유효성 확인
if (!apiKey || !apiKey.startsWith('sk-')) {
  showError('유효한 OpenAI API 키를 입력해주세요.');
  return;
}

// API 에러 처리
if (!response.ok) {
  const error = await response.json();
  if (error.error?.code === 'insufficient_quota') {
    showError('API 크레딧이 부족합니다. OpenAI 계정을 확인해주세요.');
  } else if (error.error?.code === 'invalid_api_key') {
    showError('API 키가 올바르지 않습니다.');
  } else {
    showError(`오류: ${error.error?.message}`);
  }
  return;
}
```

---

## 출력 품질 기준

- [ ] API 키 입력란 + 저장/상태 표시
- [ ] 생성 중 로딩 스피너 (한국어 메시지)
- [ ] 결과물 표시 영역
- [ ] 복사/다운로드 버튼
- [ ] 에러 메시지 한국어 표시
- [ ] 재생성 버튼
- [ ] 모바일 반응형 (선택)

---

## 주의사항

- `gpt-image-1` 응답은 `b64_json` 형식 (URL 아님)
- `dall-e-3`는 URL 형식 반환 (`data[0].url`)
- 이미지 1장당 약 $0.04~0.08 과금
- API 키는 절대 로그나 외부로 유출되지 않도록 메모리 내에서만 사용
- CORS 이슈 없음 (OpenAI API는 브라우저 fetch 허용)
