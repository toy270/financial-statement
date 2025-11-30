const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4500;
const DART_API_KEY = process.env.DART_API_KEY;

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

