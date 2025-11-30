const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4500;
const DART_API_KEY = process.env.DART_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Gemini AI 초기화
let genAI;
if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// CORS 허용
app.use(cors());

// 정적 파일 제공 (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// DART API 프록시 엔드포인트
app.get('/api/financial', async (req, res) => {
    try {
        const { corpCode, year, reportCode } = req.query;
        
        // .env 파일에서 API 키 사용 (클라이언트에서 전달된 키도 허용)
        const apiKey = req.query.apiKey || DART_API_KEY;

        if (!apiKey) {
            return res.status(400).json({
                status: 'error',
                message: 'API 인증키가 필요합니다. .env 파일에 DART_API_KEY를 설정하거나 apiKey 파라미터를 전달하세요.'
            });
        }

        if (!corpCode || !year || !reportCode) {
            return res.status(400).json({
                status: 'error',
                message: '필수 파라미터가 누락되었습니다.'
            });
        }

        const url = `https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=${apiKey}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=${reportCode}`;
        
        console.log(`API 호출: ${corpCode} (${year}, ${reportCode})`);
        
        const response = await axios.get(url, {
            timeout: 10000 // 10초 타임아웃
        });

        res.json(response.data);

    } catch (error) {
        console.error('API 오류:', error.message);
        
        if (error.response) {
            // DART API에서 에러 응답을 받은 경우
            res.status(error.response.status).json(error.response.data);
        } else if (error.request) {
            // 요청은 보냈지만 응답을 받지 못한 경우
            res.status(503).json({
                status: 'error',
                message: 'DART API 서버에 연결할 수 없습니다.'
            });
        } else {
            // 요청 설정 중 오류가 발생한 경우
            res.status(500).json({
                status: 'error',
                message: '서버 오류가 발생했습니다.'
            });
        }
    }
});

// 헬스 체크 엔드포인트
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Gemini API 엔드포인트 - 재무제표 설명
app.post('/api/explain', express.json(), async (req, res) => {
    try {
        if (!GEMINI_API_KEY) {
            return res.status(400).json({
                status: 'error',
                message: 'GEMINI_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.'
            });
        }

        const { companyName, financialData, dataType } = req.body;

        if (!companyName || !financialData) {
            return res.status(400).json({
                status: 'error',
                message: '회사명과 재무 데이터가 필요합니다.'
            });
        }

        // Gemini 모델 가져오기
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        // 프롬프트 생성
        const dataTypeName = dataType === 'BS' ? '재무상태표' : '손익계산서';
        const prompt = `
당신은 재무 전문가입니다. 다음 ${companyName}의 ${dataTypeName} 데이터를 일반인도 이해하기 쉽게 설명해주세요.

재무 데이터:
${JSON.stringify(financialData, null, 2)}

다음 형식으로 설명해주세요:
1. **전반적인 재무 상태**: 회사의 재무 상태를 한 문장으로 요약
2. **주요 지표 분석**: 
   - 중요한 계정 항목 3-5개를 선택하여 설명
   - 각 항목의 의미와 변화 추이
   - 긍정적/부정적 신호 해석
3. **투자자 관점**: 이 데이터가 투자자에게 의미하는 바
4. **주의할 점**: 데이터 해석 시 고려해야 할 사항

쉬운 용어를 사용하고, 구체적인 숫자를 인용하며, 비유를 들어 설명해주세요.
`;

        console.log('Gemini API 호출 중...');
        
        // Gemini API 호출
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const explanation = response.text();

        console.log('Gemini 설명 생성 완료');

        res.json({
            status: 'success',
            explanation: explanation
        });

    } catch (error) {
        console.error('Gemini API 오류:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'AI 설명 생성 중 오류가 발생했습니다: ' + error.message
        });
    }
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`
========================================
🚀 재무제표 시각화 서버가 시작되었습니다!
========================================
📍 서버 주소: http://localhost:${PORT}
📊 API 엔드포인트: http://localhost:${PORT}/api/financial
========================================
    `);
});

