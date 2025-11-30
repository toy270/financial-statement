const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

console.log('\n========================================');
console.log('🗄️  데이터베이스 초기화를 시작합니다...');
console.log('========================================\n');

const CORP_CODES_PATH = path.join('data', 'corpCodes.json');
const DB_PATH = path.join('data', 'companies.db');

// 1. corpCodes.json 파일 확인
if (!fs.existsSync(CORP_CODES_PATH)) {
    console.error('❌ corpCodes.json 파일을 찾을 수 없습니다.');
    console.error('   경로:', CORP_CODES_PATH);
    process.exit(1);
}

console.log('✓ corpCodes.json 파일 발견');

// 2. JSON 파일 로드
let corpCodes;
try {
    const jsonData = fs.readFileSync(CORP_CODES_PATH, 'utf-8');
    corpCodes = JSON.parse(jsonData);
    console.log(`✓ ${corpCodes.length.toLocaleString()}개의 회사 데이터 로드 완료`);
} catch (error) {
    console.error('❌ JSON 파일 읽기 실패:', error.message);
    process.exit(1);
}

// 3. 기존 데이터베이스 삭제 (있는 경우)
if (fs.existsSync(DB_PATH)) {
    console.log('⚠️  기존 데이터베이스 파일 삭제 중...');
    fs.unlinkSync(DB_PATH);
    console.log('✓ 기존 데이터베이스 삭제 완료');
}

// 4. 데이터베이스 생성
console.log('\n📊 데이터베이스 생성 중...');
const db = new Database(DB_PATH);

// 5. 테이블 생성
console.log('✓ 테이블 생성 중...');
db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        corp_code TEXT NOT NULL UNIQUE,
        corp_name TEXT NOT NULL,
        corp_eng_name TEXT,
        stock_code TEXT,
        modify_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_corp_name ON companies(corp_name);
    CREATE INDEX IF NOT EXISTS idx_stock_code ON companies(stock_code);
    CREATE INDEX IF NOT EXISTS idx_corp_code ON companies(corp_code);
`);
console.log('✓ 테이블 생성 완료');

// 6. 데이터 삽입 (배치 처리)
console.log('\n💾 데이터 삽입 중...');
const insert = db.prepare(`
    INSERT INTO companies (corp_code, corp_name, corp_eng_name, stock_code, modify_date)
    VALUES (?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((companies) => {
    for (const company of companies) {
        try {
            insert.run(
                company.corp_code,
                company.corp_name,
                company.corp_eng_name || '',
                company.stock_code || '',
                company.modify_date || ''
            );
        } catch (error) {
            // 중복 키 등의 오류는 무시
            if (!error.message.includes('UNIQUE constraint')) {
                console.error(`⚠️  오류 (${company.corp_name}):`, error.message);
            }
        }
    }
});

// 배치 크기 설정 (한 번에 1000개씩)
const BATCH_SIZE = 1000;
let processed = 0;

for (let i = 0; i < corpCodes.length; i += BATCH_SIZE) {
    const batch = corpCodes.slice(i, i + BATCH_SIZE);
    insertMany(batch);
    processed += batch.length;
    
    // 진행 상황 표시
    const percentage = ((processed / corpCodes.length) * 100).toFixed(1);
    process.stdout.write(`\r진행 중: ${processed.toLocaleString()} / ${corpCodes.length.toLocaleString()} (${percentage}%)`);
}

console.log('\n✓ 데이터 삽입 완료');

// 7. 통계 정보 출력
console.log('\n📈 데이터베이스 통계:');

const totalCount = db.prepare('SELECT COUNT(*) as count FROM companies').get();
console.log(`   총 회사 수: ${totalCount.count.toLocaleString()}개`);

const listedCount = db.prepare("SELECT COUNT(*) as count FROM companies WHERE stock_code != '' AND stock_code != ' '").get();
console.log(`   상장 회사: ${listedCount.count.toLocaleString()}개`);

const unlistedCount = totalCount.count - listedCount.count;
console.log(`   비상장 회사: ${unlistedCount.toLocaleString()}개`);

// 8. 샘플 데이터 출력
console.log('\n📋 샘플 데이터 (상장 회사):');
const samples = db.prepare(`
    SELECT corp_name, corp_code, stock_code 
    FROM companies 
    WHERE stock_code != '' AND stock_code != ' '
    LIMIT 5
`).all();

samples.forEach((company, index) => {
    console.log(`   ${index + 1}. ${company.corp_name} (${company.corp_code}) [${company.stock_code.trim()}]`);
});

// 9. 데이터베이스 닫기
db.close();

// 10. 파일 크기 확인
const dbStats = fs.statSync(DB_PATH);
const dbSizeMB = (dbStats.size / (1024 * 1024)).toFixed(2);

console.log('\n========================================');
console.log('✅ 데이터베이스 초기화 완료!');
console.log('========================================');
console.log(`📁 파일 경로: ${DB_PATH}`);
console.log(`📊 파일 크기: ${dbSizeMB} MB`);
console.log('\n이제 서버를 실행하세요: npm start\n');

