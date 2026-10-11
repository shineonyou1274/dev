---
name: videointro2
description: "도형 하나가 이야기를 끌고 가는 그래픽 모션 영상(홍보 영상, 공모전 영상, 오프닝, 캠페인 영상 20초~3분)을 콘셉트 설계부터 소리 설계, 테스트 영상, 전체 렌더까지 코드로 만드는 스킬. 바탕색 하나와 포인트 색 하나로 만든 세계, 넓은 자간과 늘어난 글자 띠, 손글씨 한 줄, 알림 카드 콜라주, 데이터 그래프, 점으로 빨려 들었다가 터지는 결말을 쓴다. 사용자(Shiny Peace Studio)의 취향 기록을 먼저 읽고, 20초 테스트 영상으로 방향을 확인한 뒤 전체를 만든다. 트리거 예: \"videointro2\", \"/videointro2\", \"홍보 영상 만들어줘\", \"공모전 영상\", \"캠페인 영상\", \"모션그래픽 광고\", \"스포티파이 같은 느낌\", \"포카리 같은 느낌\", \"흑백에 형광 포인트\", \"그래픽 위주로\", \"감각적인 모션그래픽\", \"스토리 있는 모션그래픽\", \"아트 브랜드\", \"쌩초 같은 느낌\", \"브랜드 필름\"."
---

# videointro2: 그래픽 콘셉트 중심의 모션 영상

기존 `videointro` 스킬은 박자마다 컷을 바꾸고 빌드업, 무음, 드롭을 반복하는 인트로에 맞춘 스킬이다. 이 방식을 30초가 넘는 영상에 그대로 쓰면 같은 동작이 되풀이되어 지루해진다. `videointro2`는 영상마다 그래픽 아이디어를 하나 정하고, 그 아이디어로 장면을 이어 가는 방식을 쓴다.

결과물은 `1920×1080 30fps MP4`(음악 포함)와 소스 파일(장면 HTML, 소리 스크립트, 글꼴)이다.

## 0. 먼저 읽을 것

- `references/taste.md`: 사용자가 좋아한 것과 싫어한 것. 매번 먼저 읽는다.
- `references/techniques.md`: 기법 모음과 만드는 방법.
- `references/refs.md`: 사용자가 보낸 레퍼런스 영상 분석.
- `references/motion-dictionary.md`: 외부 모션 기법 사전(awesome-ai-motion)을 장면 표에 연결하는 방법.
- `references/review-loop.md`: 렌더 후 자기 검사. 장면 경계마다 프레임 시트를 뽑아 점검 목록대로 보고, 고치고, 다시 렌더한다.
- 완성 예시(저장소의 `intro/` 폴더): `tok/`(라임 탄산 광고, 거품이 글자를 터뜨림), `hush/`(이어폰 광고, 기법 사전 카드 kinetic-type-sweep·particle-assemble·light-sweep 사용, 소음이 한순간에 꺼지는 소리 설계).
- `templates/one-dot/`: 실제로 만든 20초 예시(기후위기 오프닝). 새 영상은 이 파일을 복사해서 시작한다. 알림 카드의 작은 사진은 `clips/cN/f_0060.jpg`를 읽으므로, 사진을 쓰지 않으면 해당 `<img>`를 지우거나 경로를 바꾼다.

## 1. 콘셉트를 한 줄로 정한다

영상을 만들기 전에 사용자에게 다음 네 가지를 한 줄씩 제안한다.

| 항목 | 예시(기후위기 오프닝) |
|---|---|
| 이야기를 끌고 갈 도형 하나 | 형광 점 하나가 지구의 체온이다. 점이 심장처럼 뛰고, 궤도가 되고, 그래프가 되고, 이야기의 무대가 되고, 마지막에 터진다. |
| 색 | 검정, 흰색, 형광 연두(#d7ff00) 한 색 |
| 글자 | 넓은 자간의 Anton, 늘어난 글자 띠, 손글씨 한 줄 |
| 강약 | 빽빽한 구간(그래프, 글자 띠, 알림 카드) 뒤에 조용한 구간(흰 원과 손글씨), 마지막에 터짐 |
| 화면 틀(선택) | 아트 브랜드처럼 보이게 할 때: 네 귀퉁이 라벨, 장 번호, 얇은 구분선, 크롬 질감의 상징물(`references/techniques.md` 7장) |

표를 채운 뒤 화면에 나오는 모든 도형, 선, 색을 한 줄씩 적고 "이것은 이야기에서 무엇인가"를 옆에 쓴다. 답이 없는 요소는 빼거나 의미 있는 것으로 바꾼다. 예시(기후위기 오프닝): 형광 점은 지구의 체온, 궤도는 지구의 공전, 선 그래프는 실제 기온 기록, 알림 카드는 재난 소식, 흰 원은 "괜찮다"는 믿음이다. 형광색은 뜨거워지는 지구를 나타내는 경고색으로 정한다.

레퍼런스가 있으면 구조와 기법만 가져온다. 브랜드 로고, 캐릭터, 음악은 복제하지 않는다.

## 2. 장면 표를 쓴다

초 단위로 장면 표를 만든다. 칸마다 "화면에 무엇이 보이고, 도형이 어떻게 바뀌고, 어떤 소리가 나는지"를 문장으로 쓴다. 다음 기준을 지킨다.

- 같은 기법을 두 장면 연속으로 쓰지 않는다.
- 빽빽한 구간 다음에는 조용한 구간을 둔다.
- 가장 큰 터짐은 한 번만, 마지막에 쓴다.
- 실사 영상은 배경으로 깔지 않는다. 알림 카드, 도형 안, 글자 안에 재료로 넣는다.
- 장면마다 움직임을 고를 때 `references/motion-dictionary.md`의 순서대로 기법 사전에서 후보를 고르고, 카드의 기본 파라미터로 시작한다. 쓴 카드 이름을 장면 표에 적는다. 영상 하나에 2~4개만 쓴다.

장면 표를 다 쓰면 장면이 시작하는 시각과 이름을 작업 폴더의 `cues.json`으로 옮긴다. 일부러 조용하게 만든 구간은 `quiet`에 적는다. 시트와 소리 검사가 이 파일을 읽는다(형식은 `references/review-loop.md` 1장, 예시는 `templates/one-dot/cues.json`).

## 3. 소리를 새로 짠다

`templates/one-dot/open_audio.py`를 복사해서 영상마다 새로 쓴다. 악기는 `scripts/compose.py`의 `Kit`(킥(베이스 드럼), 스네어, 808, 패드, 건반, 종, 임팩트, 라이저 등)을 가져다 쓴다. `compose.py`의 정해진 구조(빌드업 뒤 1박 무음과 드롭)는 그대로 쓰지 않는다.

- 소리는 화면의 사건에 맞춘다. 점이 나타나면 짧은 소리, 그래프가 오르면 음높이가 오르는 소리, 카드가 들어오면 알림음이 난다.
- 조용한 구간은 실제로 조용하게 만든다.
- 통합 음량은 -14 LUFS로 맞춘다(스크립트가 자동으로 맞춘다).

## 4. 20초 테스트 영상을 먼저 보여 준다

전체를 만들기 전에 20초 안팎의 테스트 영상을 렌더해서 보낸다. 사용자가 방향을 확인한 뒤에 전체를 만든다.

```bash
SK=.claude/skills/videointro2
eval "$(bash $SK/scripts/setup.sh)"                      # FFMPEG, PW_ROOT 설정
cp -r $SK/templates/one-dot 작업폴더 && cp $SK/templates/kinetic.js 작업폴더/
cd 작업폴더
VI2_SCRIPTS=$SK/scripts python3 open_audio.py build/music.wav   # 소리
python3 $SK/scripts/fonts.py open.html fonts/                  # 글꼴(글자를 바꿀 때마다 다시 실행)
python3 $SK/scripts/sheet.py --html open.html            # 장면 경계마다 한 장씩 → build/sheets/cues-*.png
python3 $SK/scripts/sheet.py --html open.html --seams    # 경계 0.1초 앞·경계·0.1초 뒤 → build/sheets/seams-*.png
```

출력된 시트를 모두 Read로 열고 `references/review-loop.md` 3장의 점검 목록대로 확인한다. 글자 겹침, 잘림, 앞 장면의 요소가 다음 장면에 남는 문제, 빈 화면으로 뚝 끊기는 전환을 여기서 고친다. 의심스러운 전환은 `--from 7 --to 9 --every 0.1`로 훑는다.

렌더는 구간을 나누어 병렬로 돌린 뒤 이어 붙이고 음악을 입힌다.

```bash
for i in 0 1; do node $SK/scripts/render_dom.mjs --html open.html --out build/s$i.mp4 --from $((i*10)) --to $((i*10+10)) --fps 30 --sub 4 & done; wait
printf "file 's0.mp4'\nfile 's1.mp4'\n" > build/s.txt
$FFMPEG -f concat -safe 0 -i build/s.txt -i build/music.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest build/out.mp4
```

`--sub 4`는 한 프레임을 네 번 찍어 섞는다. 빠르게 움직이는 도형과 글자에 모션 블러(움직임 잔상)가 생긴다.

## 5. 전체 영상을 만든다

- 긴 영상(1~3분)은 장(챕터)으로 나눈다. 장마다 도형이 하는 일을 바꾸고, 소리도 장마다 다르게 짠다.
- 3분 영상은 60초씩 세 구간으로 나누어 병렬 렌더한다(`--sub 2`).
- 결과 파일이 30MB를 넘으면 전송용 720p 파일을 따로 만든다. 100MB가 넘는 파일은 GitHub에 올리지 않는다.

## 6. 전달

- 보내기 전에 완성 파일로 `references/review-loop.md` 2장의 4~6번(`sheet.py --video`, `wave.py`, `verify.sh`)을 실행하고 시트를 모두 연다. 지금 렌더한 파일의 시트를 보지 않고 완성이라고 말하지 않는다.
- `SendUserFile`로 MP4를 보낸다(`display: render`).
- 장면 표, 사용한 자료의 출처, 알려진 한계를 짧게 적는다.
- 사용자의 반응을 `references/taste.md`에 한 줄씩 추가한다.
- **게시 묶음**: 스레드 본문, 만든 방법 댓글, 전문가용·간단 프롬프트를 `../ad-motion-prompt/references/post-kit.md`대로 만들어 영상 폴더의 `threads.md`에 저장한다.
- 브랜드·단체 영상(지딜 등)이면 `../videointro/references/brands/`의 브랜드 파일을 먼저 읽는다.

## 함정

- 사용자가 곡, 문구, 길이 같은 것을 구체적으로 정해 주면 그대로 따른다. 스스로 판단해 다른 것으로 바꾸지 않는다. 막히면(예: 음원 파일이 없음) 바꾸지 말고 묻는다.
- 사용자가 준 음원에 맞출 때는 `librosa`로 박자(`beat_track`)와 구간 경계(`segment.agglomerative`), 초 단위 음량을 먼저 뽑고, 장면 전환을 그 시각에 건다. 박자 목록을 `beats.js`로 페이지에 넣으면 점프·흔들림·카메라 펀치를 실제 박자에 맞출 수 있다. 드럼에 반응시킬 때는 `python3 $SK/scripts/drums.py song.wav beats.json drums.js`로 킥과 스네어 타격을 따로 뽑는다(박자 격자 보정값 포함). 예시: `intro/cheer/cheer5.html`, 긴 모래 이야기 규칙은 `references/techniques.md` 8장 끝. 저작권이 있는 음원과 그 음원이 들어간 영상은 저장소에 올리지 않는다(.gitignore).

- 장면 레이어(한 장면의 요소를 모아 둔 겹)를 숨길 때 `visibility: hidden`을 쓰면, 자식 요소에 `visibility: visible`을 준 순간 그 자식이 다음 장면에 새어 나온다. 레이어는 `display: none`으로 숨긴다.
- 글꼴은 사용한 글자만 담은 부분 파일이다. 문구를 바꾸면 `fonts.py`를 다시 실행한다. 빠진 글자는 시스템 글꼴로 바뀌어 모양이 달라진다.
- 글자 위치(예: 급정지할 단어의 x 좌표)를 `READY`에서 잴 때는 먼저 `document.fonts.load('170px BHS', '쉿')`처럼 글꼴을 직접 불러온다. `document.fonts.ready`만 기다리면 숨겨진 레이어의 글꼴은 아직 안 불러와져서 대체 글꼴 너비로 재고, 위치가 수천 px 어긋난다(HUSH 광고에서 실제로 겪음).
- Anton 글꼴에는 한글이 없다. 영문과 한글을 섞는 자리는 `font-family: 'Anton', 'BHS'`처럼 한글 글꼴을 뒤에 적는다.
- 그래프 잡음을 해마다 크게 넣으면 톱니처럼 보인다. 느린 사인파 두 개를 작게 더한다.
- YouTube 레퍼런스는 이 서버에서 내려받을 수 없는 경우가 많다(봇 확인). oEmbed로 제목을, `i.ytimg.com/vi/ID/maxresdefault.jpg`와 `hq1~3.jpg`로 대표 화면을 받아 분석하고, 움직임은 보지 못했다고 사용자에게 알린다.
- Higgsfield에서 seedance_2_5에 시작 이미지를 줄 때는 `mode: "omni_reference"`가 필요하다. 프리셋 추천으로 제출이 거절되면 `declined_preset_id`를 넣어 다시 보낸다.
