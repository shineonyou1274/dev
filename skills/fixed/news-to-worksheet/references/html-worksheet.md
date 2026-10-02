# HTML 활동지 구현 레퍼런스

## 디자인 토큰 (CSS 변수)

```css
:root {
  --navy: #0f1e3c;
  --navy-mid: #1a3160;
  --gold: #c8922a;
  --gold-light: #f0c96e;
  --cream: #fdf8f0;
  --ink: #1c1c2e;
  --muted: #6b7280;
  --border: #d4c5a9;
  --green: #1e6b4a;
  --red-soft: #8b1a1a;
}
```

## 주제 탭 전환 패턴

```html
<button class="topic-btn active" onclick="selectTopic(this,'bio')">...</button>
<div class="topic-content active" id="content-bio">...</div>
```

```javascript
function selectTopic(btn, id) {
    document.querySelectorAll('.topic-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.topic-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('content-' + id).classList.add('active');
}
```

## 작성 영역 (contenteditable)

```html
<div class="write-box tall" contenteditable="true"
     data-placeholder="내 말로 설명해보기…"></div>
```

```css
.write-box { border: 1.5px solid var(--border); min-height: 80px; padding: 12px 16px; }
.write-box.tall { min-height: 120px; }
.write-box.short { min-height: 56px; }
.write-box:empty::before { content: attr(data-placeholder); color: #bbb; }
.write-box:focus { border-color: var(--gold); }
```

## PMI 2×2 그리드

```html
<div class="think-grid">
  <div class="think-cell">
    <div class="think-cell-header agree">👍 Plus</div>
    <div class="write-box" contenteditable="true"></div>
  </div>
  <div class="think-cell">
    <div class="think-cell-header disagree">👎 Minus</div>
    <div class="write-box" contenteditable="true"></div>
  </div>
  <div class="think-cell">
    <div class="think-cell-header question">❓ Interesting</div>
    <div class="write-box" contenteditable="true"></div>
  </div>
  <div class="think-cell">
    <div class="think-cell-header apply">💡 나라면</div>
    <div class="write-box" contenteditable="true"></div>
  </div>
</div>
```

## 면접 Q/A 카드

```html
<div class="interview-pair">
  <div class="speaker-tag q">면접관</div>
  <div style="padding:10px 14px; background:#f5f5f5; border:1px solid var(--border);">
    {질문 텍스트}
  </div>
</div>
<div class="interview-pair">
  <div class="speaker-tag a">나의 답변</div>
  <div class="write-box tall" contenteditable="true" data-placeholder="답변 설계…"></div>
</div>
```

## 세특 빈칸 채우기

```html
<div class="setech-template">
  '______' 을 탐구함. 특히
  <span class="setech-fill" contenteditable="true">핵심 원리</span>
  를 이해하고, 이를
  <span class="setech-fill" contenteditable="true">실생활 사례</span>
  와 연결함.
</div>
```

## 자기평가 체크리스트

```html
<div class="check-item" onclick="toggleCheck(this)">
  <div class="check-box"><span class="check-tick">✓</span></div>
  <div class="check-text">평가 항목</div>
  <div class="check-level">기초</div>
</div>
```

```javascript
function toggleCheck(el) { el.classList.toggle('checked'); }
```

## 인쇄 최적화

```css
@media print {
  .topic-selector, .action-bar { display: none !important; }
  .section { break-inside: avoid; margin-top: 12px; }
  .topic-content.active { display: block !important; }
  .write-box { min-height: 70px !important; }
}
```

## 섹션 번호 헤더 패턴

```html
<div class="section">
  <div class="section-header">
    <div class="section-num">1</div>
    <div class="section-title">섹션 제목</div>
    <div class="section-desc">5분</div>
  </div>
  <div class="section-body">
    <!-- 콘텐츠 -->
  </div>
</div>
```
