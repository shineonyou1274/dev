# 뉴스 크롤러 구현 레퍼런스

## 전체 코드 구조

```python
import subprocess, sys, requests
from bs4 import BeautifulSoup
import time, urllib3, re
from urllib.parse import urlparse, urljoin

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

try:
    from google import genai
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "google-genai"])
    from google import genai

MY_API_KEY = 'YOUR_API_KEY_HERE'
client = genai.Client(api_key=MY_API_KEY)

MODELS = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.0-pro']
```

## 사이트 설정

```python
target_sites = [
    {
        "name": "베리타스알파(입시뉴스)",
        "url": "http://www.veritas-a.com/news/articleList.html?sc_section_code=S1N1",
        "link_filter": "/news/articleView"
    },
    {
        "name": "교육부 블로그(정책/정보)",
        "url": "https://if-blog.tistory.com/",
        "link_filter": "/entry/"
    }
]
```

새 사이트 추가 시 `link_filter`는 해당 사이트의 기사 URL 패턴을 직접 확인하고 지정한다.

## 링크 보정 (urljoin 필수)

```python
def get_base_url(url):
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}"

# 크롤링 루프 내부에서:
link = urljoin(get_base_url(site['url']), raw_link)
```

## Rate Limit 429 처리

```python
def call_gemini_with_retry(prompt, max_retries=3):
    for model in MODELS:
        for attempt in range(max_retries):
            try:
                res = client.models.generate_content(model=model, contents=prompt)
                return res.text.strip()
            except Exception as e:
                if '429' in str(e):
                    delay_match = re.search(r'retryDelay.*?(\d+)s', str(e))
                    wait = int(delay_match.group(1)) + 2 if delay_match else (attempt + 1) * 10
                    print(f"[{model}] {wait}초 대기 후 재시도 ({attempt+1}/{max_retries})")
                    time.sleep(wait)
                else:
                    break
        time.sleep(5)
    return None
```

## 교사용 프롬프트 (고정 포맷)

```python
prompt = f"""
다음 고등학교 진학지도 교사용 입시 뉴스 제목을 분석해줘.
제목: {title}

아래 항목을 정확히 이 순서와 항목명으로 작성해:
분류: [대입제도/논술/전형변화 중 택1] / [세부분류] / 활용도 [높음/중/낮음]
교사용 제목: (25자 이내)
핵심 내용 1줄 요약: (40자 이내)
진학지도 포인트: (학생 상담 및 수업 적용 관점)
2027·2028 대입 연결성: (직접/간접/약함)
학교 현장 적용 메모: (수업·상담·세특 활용법)
"""
```

## 출력 파일 포맷

```
📅 수집 일자: {datetime}
📚 주제: 고등학교 진학지도 교사용 교육·입시·정책 뉴스
============================================================

📍 출처: {site_name}
🗂 카테고리: 입시
📌 원본 제목: {title}
{ai_content}
🔗 링크: {link}
--------------------------------------------------
```

## 필터 기준

- 제목 길이 15자 미만 → 제외
- `link_filter` 패턴 미포함 링크 → 제외
- 사이트당 최대 10개 수집 후 break
- 요청 간격: `time.sleep(1)` (API 과호출 방지)
