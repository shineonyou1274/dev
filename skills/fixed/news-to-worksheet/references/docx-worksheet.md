# DOCX 활동지 구현 레퍼런스 (2026-05-14 최종)

## 패키지 설치 확인

```bash
npm install -g docx   # v9.6.1 기준
```

## 필수 import

```javascript
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, TableLayoutType, ShadingType,
  VerticalAlign, LineRuleType, ExternalHyperlink
} = require('docx');
const fs = require('fs');
```

## ⚠️ A4 페이지 설정 — 반드시 size 명시

```javascript
const PAGE_W   = 11906;   // A4 DXA
const PAGE_H   = 16838;
const MARGIN   = 900;
const CONTENT_W = PAGE_W - MARGIN * 2;  // = 10106

sections: [{
  properties: {
    page: {
      size: { width: PAGE_W, height: PAGE_H },          // ← 필수! 없으면 Word가 열 폭 무시
      margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN }
    }
  },
  children: [...]
}]
```

## ⚠️ 테이블 핵심 규칙 — columnWidths 필수

```javascript
// ✅ 모든 테이블에 columnWidths 지정 (없으면 tblGrid=100 → 2페이지부터 열 붕괴)
new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  layout: TableLayoutType.FIXED,      // ← 필수
  borders: noBorder(),                // 테이블 외곽 테두리 (셀 테두리와 별도)
  columnWidths: [CONTENT_W],          // 1열 예시 — 합계 반드시 CONTENT_W
  rows: [...]
})
// WidthType.PCT / WidthType.PERCENTAGE 절대 금지 (v9.x에서 잘못된 XML 생성)
```

## 자주 쓰는 border 헬퍼

```javascript
function nilBorder() {
  const n = { color:'000000', space:0, size:0, style:BorderStyle.NIL };
  return { top:n, bottom:n, left:n, right:n };
}
function noBorder() {
  const n = { color:'FFFFFF', space:0, size:0, style:BorderStyle.NONE };
  return { top:n, bottom:n, left:n, right:n, insideH:n, insideV:n };
}
function boxBorder(color) {
  const s = { color, space:0, size:6, style:BorderStyle.SINGLE };
  return { top:s, bottom:s, left:s, right:s, insideH:s, insideV:s };
}
function lBorder(color) {   // top + left만 (INFO/WARN 박스용)
  const t = { color, space:0, size:12, style:BorderStyle.SINGLE };
  const n = { color:'000000', space:0, size:0, style:BorderStyle.NIL };
  return { top:t, left:t, bottom:n, right:n };
}
```

## 셀 유형별 테두리 & 마진 기준 (5/13 기준 양식)

| 셀 유형 | 테두리 함수 | 마진 (mt/mb/ml/mr) |
|--------|------------|-------------------|
| 헤더 (DEEP_NAVY/DARK 배경) | `nilBorder()` | 100/100/150/150 |
| 정보박스 라벨·값 | `boxBorder(NAVY)` sz=6 | 80/80/120/120 |
| 뉴스요약·활동안내 (INFO) | `lBorder(NAVY)` sz=12 | 100/100/150/150 |
| PMI 4칸 | `boxBorder(NAVY)` sz=6 | 100/100/120/120 |
| 5단계 세특 (WARN) | `lBorder(ORANGE)` sz=12 | 100/100/150/150 |
| 주제선택 셀 | `boxBorder(NAVY)` sz=6 | 80/80/120/120 |

- 배경색: `ShadingType.CLEAR` (SOLID 금지 — 검은 배경 버그)
- `\n` 금지 → 별도 `Paragraph` 요소로 분리

## 단락 간격 기준 (5/13 기준 양식)

| 위치 | before | after |
|------|--------|-------|
| 날짜 라인 | 0 | 80 |
| 주제 대제목 | 200 | 60 |
| 태그 라인 | 0 | 80 |
| 뉴스요약 헤더 (📰) | 0 | 80 |
| 출처 라인 | 0 | 60 |
| 활동안내 헤더 (📌) | 0 | 80 |
| 활동안내 단계 목록 | 40 | 60 |
| 1·2·3·4단계 헤더 | 100 | 80 |
| 단계 질문 / 면접관 | 0 | 40 |
| 💬 가이드 텍스트 | 0 | 40 |

## columnWidths 패턴

```javascript
// 1열 전체
{ cols: [CONTENT_W] }

// 2열 균등
const hw = Math.floor(CONTENT_W / 2);
{ cols: [hw, hw] }

// 2열 라벨/값 (학습자 정보)
const lw = 2200, vw = CONTENT_W - lw;
{ cols: [lw, vw] }
```

## 출력 저장

```javascript
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('출력파일.docx', buf);
  console.log('완료');
});
```

## 자주 발생하는 버그

| 증상 | 원인 | 해결 |
|------|------|------|
| 2페이지부터 열이 좁은 한 칸으로 붕괴 | columnWidths 누락 → tblGrid=100 | 모든 Table에 columnWidths 지정 |
| Word가 열 폭을 무시함 | page size 미선언 | sections.properties.page.size 추가 |
| 배경색이 검게 나옴 | ShadingType.SOLID | ShadingType.CLEAR로 교체 |
| 줄바꿈 안 됨 | TextRun에 \n | 별도 Paragraph로 분리 |
| 퍼센트 폭이 이상하게 나옴 | WidthType.PERCENTAGE | WidthType.DXA로 교체 |
