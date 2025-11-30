# 📊 재무제표 시각화 앱

DART(전자공시시스템) API를 활용한 재무제표 시각화 웹 애플리케이션입니다.

## ✨ 주요 기능

1. **회사 검색**: 회사명 또는 종목코드로 검색하여 회사 정보 조회
2. **재무제표 조회**: 사업보고서, 분기보고서 등 다양한 보고서의 재무제표 데이터 조회
3. **데이터 시각화**: 재무상태표, 손익계산서 데이터를 차트로 시각화

## 🚀 시작하기

### 1. API 인증키 발급

DART API를 사용하기 위해서는 인증키가 필요합니다.

1. [DART 오픈API](https://opendart.fss.or.kr/) 접속
2. 회원가입 후 로그인
3. `오픈API 이용현황` 메뉴에서 API 인증키 발급

### 2. 프로젝트 실행

이 프로젝트는 순수 HTML, CSS, JavaScript로 작성되어 별도의 설치가 필요 없습니다.

#### 방법 1: Live Server 사용 (권장)

```bash
# VS Code의 Live Server 확장 프로그램 사용
# index.html 파일을 열고 우클릭 > "Open with Live Server"
```

#### 방법 2: Python 간단한 웹 서버

```bash
# Python 3가 설치되어 있다면
python -m http.server 8000

# 브라우저에서 http://localhost:8000 접속
```

#### 방법 3: Node.js http-server

```bash
# http-server 설치 (전역)
npm install -g http-server

# 프로젝트 폴더에서 실행
http-server

# 브라우저에서 http://localhost:8080 접속
```

## 📁 프로젝트 구조

```
재무제표-시각화/
├── index.html          # 메인 HTML 페이지
├── styles.css          # 스타일시트
├── app.js              # 메인 JavaScript 로직
├── data/
│   └── corpCodes.json  # 회사 코드 데이터베이스
└── README.md           # 프로젝트 문서
```

## 💡 사용 방법

### 1. 회사 검색

- 회사명 입력란에 검색하고 싶은 회사명을 입력합니다 (예: 삼성전자)
- 자동완성 목록에서 원하는 회사를 선택합니다

### 2. 조회 옵션 설정

- **DART API 인증키**: 발급받은 API 인증키를 입력합니다
- **사업연도**: 조회하고 싶은 연도를 입력합니다 (2015년 이후)
- **보고서 유형**: 
  - 사업보고서 (연간)
  - 반기보고서 (6개월)
  - 1분기보고서
  - 3분기보고서

### 3. 데이터 조회

- "조회하기" 버튼을 클릭하여 재무제표 데이터를 가져옵니다

### 4. 결과 확인

- **재무상태표 탭**: 자산, 부채, 자본 정보 확인
- **손익계산서 탭**: 매출, 비용, 이익 정보 확인
- **차트 탭**: 주요 재무 지표를 시각화하여 확인

## 🔧 기술 스택

- **HTML5**: 웹 페이지 구조
- **CSS3**: 스타일링 및 반응형 디자인
- **JavaScript (ES6+)**: 동적 기능 구현
- **Chart.js**: 데이터 시각화
- **DART Open API**: 재무제표 데이터 제공

## 📊 DART API 정보

### API 엔드포인트

```
https://opendart.fss.or.kr/api/fnlttSinglAcnt.json
```

### 주요 파라미터

| 파라미터 | 설명 | 예시 |
|---------|------|------|
| crtfc_key | API 인증키 | xxxxxxxx... |
| corp_code | 회사 고유번호 (8자리) | 00126380 |
| bsns_year | 사업연도 (4자리) | 2023 |
| reprt_code | 보고서 코드 | 11011 (사업보고서) |

### 보고서 코드

- `11011`: 사업보고서
- `11012`: 반기보고서
- `11013`: 1분기보고서
- `11014`: 3분기보고서

## ⚠️ 주의사항

### CORS 이슈

브라우저의 CORS 정책으로 인해 직접 API 호출 시 오류가 발생할 수 있습니다.

**해결 방법:**

1. **CORS 프록시 서버 사용** (권장)
   - 별도의 백엔드 서버를 구성하여 API 호출을 프록시합니다

2. **브라우저 확장 프로그램**
   - CORS Unblock 등의 확장 프로그램 사용 (개발 목적으로만)

3. **백엔드 구현 예시** (Node.js + Express)

```javascript
// server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

app.get('/api/financial', async (req, res) => {
    const { apiKey, corpCode, year, reportCode } = req.query;
    const url = `https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=${apiKey}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=${reportCode}`;
    
    try {
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

## 🎨 UI 특징

- **현대적인 디자인**: 그라데이션과 부드러운 애니메이션
- **반응형 레이아웃**: 모바일, 태블릿, 데스크톱 모두 지원
- **사용자 친화적**: 자동완성, 실시간 검색 등
- **직관적인 탭 구조**: 재무상태표, 손익계산서, 차트를 쉽게 전환

## 📝 라이선스

이 프로젝트는 교육 및 개인 프로젝트 용도로 자유롭게 사용 가능합니다.

## 🔗 참고 링크

- [DART 오픈API 가이드](https://opendart.fss.or.kr/guide/main.do)
- [Chart.js 문서](https://www.chartjs.org/docs/latest/)
- [DART 공시시스템](https://dart.fss.or.kr/)

## 🐛 알려진 이슈

1. **CORS 정책**: 프로덕션 환경에서는 백엔드 서버를 통한 API 호출이 필요합니다
2. **데이터 형식**: 일부 회사의 재무제표 데이터 형식이 다를 수 있습니다

## 📧 문의

프로젝트에 대한 문의사항이나 버그 리포트는 이슈를 등록해주세요.

---

**Made with ❤️ for Financial Data Visualization**

