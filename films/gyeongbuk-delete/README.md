# 경북, 삭제하시겠습니까 (40초, 수묵화 영상)

사람이 떠나 지도에서 지워져 가는 경북의 작은 마을을 다룬 40초 영상입니다. 완성 파일은 `gyeongbuk-delete.mp4`(1920×1080, 30fps, 음악과 내레이션 포함)입니다.

## 장면

| 시각 | 화면 | 소리 |
|---|---|---|
| 0~5초 | 빈 한지에 먹물 한 방울이 떨어져 번지고, 그 번짐이 산이 된다. | 물방울 소리, 낮은 현악, 거문고처럼 뜯는 소리 |
| 5~11초 | 계곡에 집이 그려지고 창마다 붉은 불이 켜진다. 굴뚝에서 연기가 오르고 아이들이 길을 달린다. 오른쪽에 '감나무골' 붓글씨와 '사람' 낙관이 찍힌다. | 대금처럼 숨이 섞인 피리 선율 |
| 12~16초 | 불이 하나씩 꺼지고, 꺼진 집은 먹가루가 되어 바람에 날아간다. 한 사람이 보따리를 지고 고개 너머로 떠난다. | 불이 꺼질 때마다 한 음씩 내려가는 낮은 현 |
| 17~20초 | 불 하나만 남고 '감나무골' 글씨가 물에 번지듯 흐려진다. | 물에 씻기는 소리 |
| 20~29초 | 그림이 줄어들어 경상북도 지도 위의 점 하나가 된다. 지도 위 마을 64곳의 불이 점점 빨리 꺼진다. | 점점 빨라지는 북, 차오르는 낮은 현악 |
| 29~34초 | 지도가 씻겨 나가고 불 하나만 남는다. '삭제하시겠습니까?' 대화상자가 붓으로 그려지고 커서가 '예'로 다가간다. | 거의 무음, 바람, 숨 |
| 34초 | '사람' 낙관이 '아니오' 위에 찍힌다. 커서는 먹가루가 되어 흩어진다. | 깊은 북소리, 낮은 범종 |
| 35~40초 | "아직, 이곳에 사람이 살고 있습니다." 낙관이 제목 끝으로 옮겨 가고 제목이 쓰인다. | 범종의 여운, 짧은 피리 |

남은 불 하나는 처음부터 끝까지 같은 불입니다. 마을의 마지막 창이 지도 위의 점이 되고, 대화상자 위의 점이 되고, 제목 위의 점이 됩니다.

## 쓴 자료

- 내레이션: Higgsfield 음성 생성(ElevenLabs 엔진, Sterling 목소리), `build/narr_raw.mp3`
- 지도: southkorea/southkorea-maps의 `kostat/2013/json/skorea_provinces_geo_simple.json`. 이 자료에는 독도가 없어서 좌표(북위 37.24°, 동경 131.87°)로 직접 넣었습니다. 다시 만들 때는 `data/prov.json`으로 받아 둡니다.
- 글꼴: East Sea Dokdo(붓글씨), Gowun Batang(자막과 대화상자). 모두 Google Fonts이며 `fonts_ink.py`로 사용한 글자만 받습니다.
- 음악과 효과음: `ink_audio.py`에서 코드로 합성했습니다. 외부 음원은 없습니다.
- '감나무골'은 실제 마을을 가리키지 않는 이름입니다. 지도 위 64개 점도 실제 마을 위치가 아니라 도 경계 안에 고르게 흩어 놓은 점입니다.

## 다시 만들기

```bash
SK=skills/fixed/videointro2
curl -sS -o data/prov.json --create-dirs https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2013/json/skorea_provinces_geo_simple.json
VI2_SCRIPTS=$SK/scripts python3 ink_audio.py build/music.wav
for i in 0 1 2 3; do node $SK/scripts/render_dom.mjs --html ink.html --out build/s$i.mp4 --from $((i*10)) --to $((i*10+10)) --fps 30 --sub 2 & done; wait
```
