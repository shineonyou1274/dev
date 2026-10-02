/**
 * 신호등 독해법 워크북 생성 스크립트
 * 사용법: 아래 PROBLEMS 배열에 데이터를 채우고 node docx-template.js 실행
 *
 * 입력: Claude가 지문 분석 후 채운 problem 객체 배열
 * 출력: /mnt/user-data/outputs/[output_filename].docx
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign
} = require('docx');
const fs = require('fs');

// ══════════════════════════════════════════════════
// ① 여기에 문제 데이터를 채워넣으세요
// ══════════════════════════════════════════════════

const OUTPUT_FILENAME = '신호등_워크북.docx'; // 출력 파일명

// guided: Steps 1~3 분석표 생성 (처음 배울 때)
// solo:   6칸 그리드만 생성 (독립 실전)
const PROBLEMS = [
  {
    mode: 'guided',           // 'guided' | 'solo'
    num: 'E01',
    title: '요지 찾기',
    src: '출처를 여기에',
    lines: [
      // 지문을 줄 단위로 분리 (한 줄 ≈ 60-70자 권장)
      '지문 첫 번째 줄',
      '지문 두 번째 줄',
      // ... 계속
    ],
    // ── Claude 분석 결과 ──
    subjectA: '주인공(A): 첫 문장의 핵심 소재 (영어)',
    attributeB: '속성(B): 필자가 A에 대해 말하는 것 (영어 또는 한글)',
    chainSeed: 'A의 원형 단어',     // 첫 문장에 나온 핵심어
    chainLabel: 'Chaining 추적 컬럼 헤더 텍스트',
    signal: 'However',              // 핵심 신호등 표현
    signalType: '전환 신호 (방향 바뀜!)',
    choices: [
      '①번 선지 텍스트',
      '②번 선지 텍스트',
      '③번 선지 텍스트',
      '④번 선지 텍스트',
      '⑤번 선지 텍스트',
    ],
  },
  // 추가 문제는 같은 구조로 아래에 추가
];

// ══════════════════════════════════════════════════
// ② 아래는 수정하지 않아도 됩니다
// ══════════════════════════════════════════════════

const CWIDTH = 9638; // A4 콘텐츠 폭 (2cm 여백)

const C = {
  ink:   '1A1A2E', white: 'FFFFFF', gray:  'F2F2F2',
  red:   'C62828', redBg:  'FFEBEE',
  ydk:   '5D4037', ylwBg:  'FFF8E1',
  grn:   '1B5E20', grnBg:  'E8F5E9',
  blu:   '1A237E', bluBg:  'E8EAF6',
  brn:   '4E342E', brnBg:  'EFEBE9',
  muted: '777799',
};

const bS  = (c='CCCCCC',sz=4) => ({style:BorderStyle.SINGLE,size:sz,color:c});
const bN  = ()                 => ({style:BorderStyle.NONE,size:0,color:'FFFFFF'});
const bAll= (c='CCCCCC')      => ({top:bS(c),bottom:bS(c),left:bS(c),right:bS(c)});
const bBot= (c='333333')      => ({top:bN(),left:bN(),right:bN(),bottom:bS(c,8)});
const bNon= ()                => ({top:bN(),bottom:bN(),left:bN(),right:bN()});

const R = (text,o={}) => new TextRun({
  text, font:'Malgun Gothic', size:o.sz||20,
  bold:o.b||false, color:o.c||C.ink, italics:o.i||false,
});
const P = (content,o={}) => {
  const ch = typeof content==='string'?[R(content,o)]:Array.isArray(content)?content:[content];
  return new Paragraph({children:ch,spacing:{before:o.before||0,after:o.after||80},
    alignment:o.align||AlignmentType.LEFT});
};
const SP = (n=1) => new Paragraph({children:[R('')],spacing:{after:80*n}});
const TC = (ch,o={}) => {
  const children = typeof ch==='string'?[P(ch,{sz:o.sz,b:o.b,c:o.tc,before:40,after:40})]
                 : Array.isArray(ch)?ch:[ch];
  return new TableCell({
    borders:o.borders||bAll(), width:{size:o.w||CWIDTH,type:WidthType.DXA},
    shading:{fill:o.bg||C.white,type:ShadingType.CLEAR},
    margins:{top:80,bottom:80,left:120,right:120},
    verticalAlign:o.va||VerticalAlign.TOP, children, columnSpan:o.span,
  });
};
const TR  = cells => new TableRow({children:cells});
const TBL = (rows,widths) => new Table({
  width:{size:widths.reduce((a,b)=>a+b,0),type:WidthType.DXA},
  columnWidths:widths, rows,
});

// ── 공통 빌더 ──
const H2  = Math.round(CWIDTH/2);
const H4a = Math.round(CWIDTH*0.25), H4b = H4a, H4c = H4a, H4d = CWIDTH-H4a*3;
const ch1 = Math.round(CWIDTH*0.16), ch2 = CWIDTH-ch1;
const W3  = Math.round(CWIDTH*0.32), CL  = CWIDTH-W3;

function colorHdr(num,title,src,color) {
  return TBL([TR([TC([P([
    R(num+'  ',{b:true,sz:26,c:C.white}),
    R(title,{b:true,sz:22,c:C.white}),
    R('  '+src,{sz:17,c:C.white,i:true}),
  ],{before:40,after:40})],{bg:color,w:CWIDTH,borders:bAll(color)})])],[CWIDTH]);
}
function blank(w) { return TC([P('')],{w,borders:bBot(),bg:C.white}); }
function passBox(lines) {
  return TBL([TR([TC(lines.map(l=>P(l,{sz:19,after:44})),{bg:C.gray,w:CWIDTH})])],[CWIDTH]);
}
function choiceList(choices) {
  const nums = ['①','②','③','④','⑤'];
  return choices.map((t,i)=>P([R(nums[i]+' '+t,{sz:19})],{after:36}));
}

// ── Guided 문제 빌더 ──
function buildGuided(d) {
  return [
    colorHdr(d.num, d.title, d.src, C.blu),
    passBox(d.lines),
    SP(0.5),

    // Step 1
    P([R('[STEP 1]  첫 문장 주인공(A)과 속성(B) 잡기',{b:true,sz:20,c:C.red})],{before:120,after:60}),
    TBL([
      TR([TC([P([R('① 주인공(A):',{b:true})])],{w:H2,bg:C.redBg}), blank(H2)]),
      TR([TC([P([R('② 속성(B) / 필자 입장:',{b:true})])],{w:H2,bg:C.redBg}), blank(H2)]),
      TR([TC([P([R('③ A→B 핵심 논리 (우리말):',{b:true})])],{w:H2,bg:C.redBg}), blank(H2)]),
    ],[H2,H2]),
    SP(0.5),

    // Step 2
    P([R('[STEP 2]  소재 연결(Chaining) 추적하기',{b:true,sz:20,c:C.ydk})],{before:80,after:60}),
    TBL([
      TR([
        TC([P([R('위치',{b:true,sz:18,c:C.white})])],{w:ch1,bg:C.ydk,borders:bAll(C.ydk)}),
        TC([P([R(d.chainLabel||"핵심 소재 변신어 추적",{b:true,sz:18,c:C.white})])],{w:ch2,bg:C.ydk,borders:bAll(C.ydk)}),
      ]),
      TR([
        TC([P('첫 문장',{sz:19})],{w:ch1,bg:C.ylwBg}),
        TC([P([R(d.chainSeed||'',{b:true,c:C.blu})])],{w:ch2}),
      ]),
      TR([TC([P('변신어 1',{sz:19})],{w:ch1,bg:C.ylwBg}), blank(ch2)]),
      TR([TC([P('변신어 2',{sz:19})],{w:ch1,bg:C.ylwBg}), blank(ch2)]),
      TR([
        TC([P([R('연결 결론',{b:true,sz:18})])],{w:ch1,bg:C.ylwBg}),
        TC([P([
          R('"',{sz:20}), R(d.chainSeed||'',{b:true,c:C.blu}),
          R('  --[의/은]-->  ',{sz:20,c:C.muted}),
          R('_______________________',{sz:20}),
          R('  로 이어진다"',{sz:20}),
        ])],{w:ch2}),
      ]),
    ],[ch1,ch2]),
    SP(0.5),

    // Step 3
    P([R('[STEP 3]  신호등(연결사)으로 흐름 방향 읽기',{b:true,sz:20,c:C.grn})],{before:80,after:60}),
    TBL([
      TR([
        TC([P([R('신호등 표현',{b:true,sz:18,c:C.white})])],{w:H4a,bg:C.grn,borders:bAll(C.grn)}),
        TC([P([R('신호 종류',{b:true,sz:18,c:C.white})])],{w:H4b,bg:C.grn,borders:bAll(C.grn)}),
        TC([P([R('신호등 앞 내용',{b:true,sz:18,c:C.white})])],{w:H4c,bg:C.grn,borders:bAll(C.grn)}),
        TC([P([R('신호등 뒤 내용 (핵심!)',{b:true,sz:18,c:C.white})])],{w:H4d,bg:C.grn,borders:bAll(C.grn)}),
      ]),
      TR([
        TC([P([R(d.signal||'',{b:true,sz:20,c:C.red})])],{w:H4a,bg:C.grnBg}),
        TC([P([R(d.signalType||'',{sz:18,c:C.grn})])],{w:H4b,bg:C.grnBg}),
        blank(H4c),
        blank(H4d),
      ]),
    ],[H4a,H4b,H4c,H4d]),

    // 요지 + 정답
    SP(0.5),
    P([R('[ 선지 ]',{b:true,sz:19,c:C.blu})],{before:60,after:36}),
    ...choiceList(d.choices||[]),
    SP(0.5),
    TBL([
      TR([TC([P([R('★ 요지 한 문장으로 쓰기:',{b:true})])],{w:W3,bg:C.bluBg}), blank(CL)]),
      TR([TC([P([R('정답 & 근거 문장:',{b:true})])],{w:W3,bg:C.bluBg}),
          TC([P([R('(    )번    근거: ',{sz:20})])],{w:CL,borders:bBot()})]),
    ],[W3,CL]),
    SP(2),
  ];
}

// ── Solo 문제 빌더 ──
function buildSolo(d) {
  return [
    colorHdr(d.num, d.title, d.src, C.brn),
    passBox(d.lines),
    SP(0.5),
    TBL([
      TR([
        TC([P([R('[Step 1]  주인공(A)',{b:true,sz:18,c:C.red})],{after:60}),P(''),P('')],{w:H2,bg:C.redBg}),
        TC([P([R('[Step 1]  속성(B) / 필자 입장',{b:true,sz:18,c:C.red})],{after:60}),P(''),P('')],{w:H2,bg:C.redBg}),
      ]),
      TR([
        TC([P([R('[Step 2]  핵심 소재 Chaining (변신어)',{b:true,sz:18,c:C.ydk})],{after:60}),P(''),P('')],{w:H2,bg:C.ylwBg}),
        TC([P([R('[Step 2]  가치판단 형용사 (PART 2 단어)',{b:true,sz:18,c:C.ydk})],{after:60}),P(''),P('')],{w:H2,bg:C.ylwBg}),
      ]),
      TR([
        TC([P([R('[Step 3]  신호등 표현 & 종류',{b:true,sz:18,c:C.grn})],{after:60}),P(''),P('')],{w:H2,bg:C.grnBg}),
        TC([P([R('[Step 3]  신호등 뒤 = 필자 핵심 주장',{b:true,sz:18,c:C.grn})],{after:60}),P(''),P('')],{w:H2,bg:C.grnBg}),
      ]),
    ],[H2,H2]),
    SP(0.5),
    P([R('[ 선지 ]',{b:true,sz:19,c:C.brn})],{before:60,after:36}),
    ...choiceList(d.choices||[]),
    SP(0.5),
    TBL([
      TR([TC([P([R('★ 요지 한 문장으로 쓰기:',{b:true})])],{w:W3,bg:C.brnBg}), blank(CL)]),
      TR([TC([P([R('정답 & 근거 문장:',{b:true})])],{w:W3,bg:C.brnBg}),
          TC([P([R('(    )번    근거: ',{sz:20})])],{w:CL,borders:bBot()})]),
    ],[W3,CL]),
    SP(2),
  ];
}

// ── 문서 조립 ──
const NC  = Math.round(CWIDTH/3), NC3 = CWIDTH-NC*2;

const header = [
  P([R('수능 영어 신호등 독해법',{b:true,sz:32,c:C.blu})],{align:AlignmentType.CENTER,after:80}),
  P([R('소재 연결(Chaining) + 신호등 분석 실전 워크북',{b:true,sz:21})],{align:AlignmentType.CENTER,after:80}),
  new Paragraph({border:{bottom:{style:BorderStyle.SINGLE,size:12,color:C.blu}},
    spacing:{before:0,after:160},children:[]}),
  TBL([TR([
    TC([P([R('학번: ',{sz:20}),R('                       ')])],{w:NC,borders:bNon()}),
    TC([P([R('이름: ',{sz:20}),R('                  ')])],{w:NC,borders:bNon()}),
    TC([P([R('점수: ',{sz:20})])],{w:NC3,borders:bNon()}),
  ])],[NC,NC,NC3]),
  SP(1),
];

const children = [
  ...header,
  ...PROBLEMS.flatMap(d => d.mode === 'solo' ? buildSolo(d) : buildGuided(d)),
];

const doc = new Document({
  styles:{default:{document:{run:{font:'Malgun Gothic',size:20}}}},
  sections:[{
    properties:{page:{
      size:{width:11906,height:16838},
      margin:{top:1134,right:1134,bottom:1134,left:1134},
    }},
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  const outPath = '/mnt/user-data/outputs/' + OUTPUT_FILENAME;
  fs.writeFileSync(outPath, buf);
  console.log('Done:', outPath);
}).catch(e => { console.error(e); process.exit(1); });
