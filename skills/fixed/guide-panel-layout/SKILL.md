---
name: guide-panel-layout
description: "연수 실습 가이드, 안내서, 매뉴얼처럼 덩어리가 네 개 이상인 자료를 왼쪽 목차와 오른쪽 한 화면 전환 구조의 단일 HTML로 만들 때 사용. 고르면 결과가 즉시 만들어지는 도구 패널을 넣는다. 트리거 예: \"연수용으로 정리해 줘\", \"실습 가이드\", \"사용법 매뉴얼\". 연수 당일 강사가 띄우는 진행보드는 이 스킬이 아니라 pd-runsheet를 쓴다. 제작 공통 규칙은 single-html-app을 함께 따른다."
---

# 좌측 메뉴 · 우측 한 화면 구조

연수 자료나 안내서를 만들 때는 긴 문서를 스크롤하게 하지 말고, **좌측 목차에서 고르면 우측에 그 항목만 보이는** 단일 HTML로 만든다.

## 이 스킬을 쓰는 때

- "연수용으로 정리해줘", "안내 자료", "실습 가이드", "매뉴얼", "사용법 문서"
- 항목이 여럿이고 실습 중에 "O번 보세요"라고 짚어 가며 쓰게 되는 자료
- 장비·절차·체크리스트처럼 독립된 덩어리로 나뉘는 내용

짧은 보고서나 한 덩어리로 읽힐 글에는 쓰지 않는다. 덩어리가 네 개 이상일 때만 이 구조가 값어치를 한다.

## 골격

```
.shell  grid — 좌측 246px 고정 + 우측 minmax(0,1fr)
  aside.rail   데스크톱: position:sticky; top:0; height:100vh; overflow-y:auto
               모바일: 위쪽 가로 스크롤 띠로 접힘
  main         section 여럿을 담고, 한 번에 하나만 hidden 해제
```

**반드시 지킬 것**
- `grid-template-columns:minmax(0,1fr)` 와 `.rail,main{min-width:0}` — `1fr`로만 두면 메뉴의 min-content 때문에 모바일에서 본문 전체가 가로로 넘친다
- 표·코드는 자기 `overflow-x:auto` 컨테이너 안에
- 머리글(제목 + 한 줄 요약)은 항상 보이게 두고, 긴 안내는 첫 절로 내린다

## 절 전환

스크롤 감지(IntersectionObserver)가 아니라 **보이기/숨기기**다.

```js
function show(id, push){
  var i = SECTIONS.map(s=>s.id).indexOf(id); if (i<0) i=0;
  SECTIONS.forEach((s,k)=> s.hidden = (k!==i));
  LINKS.forEach((a,k)=> a.classList.toggle("on", k===i));
  // 앞뒤 이동 단추 라벨 갱신, 끝에서는 hidden
  if (push) history.replaceState(null,"","#"+SECTIONS[i].id);
  window.scrollTo({top:0});
}
```

- `section[hidden]{display:none}` 를 CSS에 명시한다. 클래스 `display`가 `[hidden]`을 이긴다
- 메뉴 클릭은 `preventDefault()` 후 `show()`
- `hashchange`를 듣고, 시작 시 `location.hash`로 복원 — 특정 절을 링크로 바로 열 수 있게
- 절 마다 끝에 **이전·다음 단추**를 단다. 연수는 순서대로 진행되므로 선형 이동이 실제로 가장 많이 쓰인다
- 라벨은 `a.lastChild.textContent`로 끊는다. `textContent` 전체를 쓰면 번호와 제목이 붙어 "02프롬프트 만들기"처럼 된다

## 가독성 기준

연수 자료는 빔프로젝터로 띄우거나 어깨너머로 본다. 본문보다 크게 잡는다.

| 요소 | 값 |
|---|---|
| 본문 | 16.5px / 행간 1.85 / 한 줄 66ch 이하 |
| 코드 블록 | 13.5px / 행간 2 / `white-space:pre-wrap` |
| 표 | 14.5px / 셀 패딩 14px 이상 |
| 절 제목 | 24px, 앞에 모노스페이스 번호 |

자주 틀리는 것: 한글에 넓은 자간(letter-spacing)을 주거나 한글을 mono 폰트로 두면 글자가 흐트러져 읽히지 않는다. 숫자·영문 라벨에만 mono와 자간을 쓴다.

## 선택하면 만들어지는 도구 패널

안내서에 복붙용 템플릿이 들어간다면, 고정된 글덩어리 대신 **고르면 즉시 만들어지는 도구**로 넣는다.

- 입력은 select·number·checkbox 위주로, 칸마다 한 줄짜리 이유("왜 이걸 고르는가")를 붙인다
- 모든 입력에 `change`와 `input`을 묶어 `render()` 하나를 다시 돌린다. 부분 갱신을 하지 않는다
- 결과는 탭으로 나누고 각각 **복사 단추**를 달며, `navigator.clipboard` 실패 시 범위 선택으로 폴백하고 "선택했습니다 · Ctrl+C"를 보인다
- 사전(교과·유형별 설정)을 배열 하나로 빼 두고 문서의 표도 그 배열로 그린다. 사전만 고치면 도구와 표가 함께 바뀐다
- "직접 정하기" 항목을 마지막에 두고, 그걸 고를 때만 자유 입력칸을 `hidden` 해제한다

## 재료로 반드시 넣는 것

- **막히는 곳** 절: 증상 / 원인 / 해결 세 칸 표. 실습에서 실제로 밟은 오류만 적는다
- 절차는 번호 매긴 단계로. 단, **새로 매긴 번호가 실제 순서를 뜻할 때만** 쓴다. 순서가 없는 목록에 번호를 달지 않는다
- 강조 상자는 두 종류만: 기본(왜 이렇게 설계했는가)와 주의(사고가 나는 지점)

## 테마

`:root` 에 밝은 팔레트 전체를 두고, `@media (prefers-color-scheme:dark){:root:not([data-theme="light"])}` 와 `:root[data-theme="dark"]` 에서 **토큰만** 다시 정의한다. 색을 미디어 블록 안에서만 정의하면 기본 상태에서 글자가 안 보인다. `body`에 배경을 명시적으로 칠한다.

## 마무리 검증

퍼블리시하기 전에 헤드리스 브라우저로 확인한다.

1. 메뉴를 하나씩 눌러 그 절만 보이는지, 활성 표시가 따라오는지
2. 첫 절에서 이전 단추, 끝 절에서 다음 단추가 숨는지
3. 390px 폭에서 `document.documentElement.scrollWidth > innerWidth` 가 false 인지
4. 도구가 있다면 선택을 바꿔 결과 문자열이 실제로 바뀌는지, 따옴표 균형이 맞는지
5. 콘솔 오류가 없는지

## 함정

- `grid-template-columns`를 `1fr`로만 두면 메뉴의 최소 폭 때문에 모바일에서 본문 전체가 가로로 넘친다. `minmax(0,1fr)`과 `.rail,main{min-width:0}`을 쓴다.
- CSS에 `section[hidden]{display:none}`을 빼면, 클래스에 준 `display`가 `[hidden]`을 이겨 숨긴 절이 보인다.
- 메뉴 라벨을 `textContent` 전체로 읽으면 번호와 제목이 붙어 "02프롬프트 만들기"가 된다. `a.lastChild.textContent`를 쓴다.
- 한글에 넓은 자간을 주거나 mono 글꼴을 쓰면 글자가 흐트러진다. mono와 자간은 숫자·영문 라벨에만 쓴다.
- 색을 미디어 블록 안에서만 정의하면 기본 상태에서 글자가 보이지 않는다.
