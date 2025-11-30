// 전역 변수
let corpCodes = [];
let selectedCompany = null;
let currentFinancialData = null;
let currentChart = null;

// corpCodes.json 로드
async function loadCorpCodes() {
    try {
        const response = await fetch('data/corpCodes.json');
        corpCodes = await response.json();
        console.log(`${corpCodes.length}개의 회사 데이터 로드 완료`);
    } catch (error) {
        console.error('회사 코드 로드 실패:', error);
        showError('회사 코드 데이터를 불러오는데 실패했습니다.');
    }
}

// 페이지 로드 시 초기화
window.addEventListener('DOMContentLoaded', () => {
    loadCorpCodes();
    initializeEventListeners();
});

// 이벤트 리스너 초기화
function initializeEventListeners() {
    const companyInput = document.getElementById('companyInput');
    const searchBtn = document.getElementById('searchBtn');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const chartMetric = document.getElementById('chartMetric');

    // 회사 검색 자동완성
    companyInput.addEventListener('input', handleCompanySearch);
    companyInput.addEventListener('blur', () => {
        setTimeout(() => {
            document.getElementById('suggestions').classList.remove('active');
        }, 200);
    });

    // 조회 버튼
    searchBtn.addEventListener('click', handleSearch);

    // 탭 전환
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            switchTab(tab);
        });
    });

    // 차트 지표 변경
    chartMetric.addEventListener('change', updateChart);
}

// 회사 검색 자동완성
function handleCompanySearch(e) {
    const searchTerm = e.target.value.trim();
    const suggestionsDiv = document.getElementById('suggestions');

    if (searchTerm.length < 1) {
        suggestionsDiv.classList.remove('active');
        suggestionsDiv.innerHTML = '';
        return;
    }

    // 회사명으로 검색 (최대 10개)
    const matches = corpCodes
        .filter(corp => 
            corp.corp_name.includes(searchTerm) || 
            (corp.stock_code && corp.stock_code.trim() && corp.stock_code.includes(searchTerm))
        )
        .slice(0, 10);

    if (matches.length === 0) {
        suggestionsDiv.classList.remove('active');
        return;
    }

    // 검색 결과 표시
    suggestionsDiv.innerHTML = matches.map(corp => `
        <div class="suggestion-item" data-corp-code="${corp.corp_code}" data-corp-name="${corp.corp_name}" data-stock-code="${corp.stock_code}">
            <span class="corp-name">${corp.corp_name}</span>
            <span class="corp-code">(${corp.corp_code})</span>
            ${corp.stock_code && corp.stock_code.trim() ? `<span class="stock-code">[${corp.stock_code.trim()}]</span>` : ''}
        </div>
    `).join('');

    suggestionsDiv.classList.add('active');

    // 선택 이벤트
    document.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            selectedCompany = {
                corp_code: item.getAttribute('data-corp-code'),
                corp_name: item.getAttribute('data-corp-name'),
                stock_code: item.getAttribute('data-stock-code')
            };
            document.getElementById('companyInput').value = selectedCompany.corp_name;
            suggestionsDiv.classList.remove('active');
            
            // 회사 정보 표시
            showCompanyInfo();
        });
    });
}

// 회사 정보 표시
function showCompanyInfo() {
    if (!selectedCompany) return;

    document.getElementById('companyInfo').style.display = 'block';
    document.getElementById('infoCorpName').textContent = selectedCompany.corp_name;
    document.getElementById('infoCorpCode').textContent = selectedCompany.corp_code;
    document.getElementById('infoStockCode').textContent = selectedCompany.stock_code.trim() || '비상장';
}

// 검색 실행
async function handleSearch() {
    if (!selectedCompany) {
        showError('회사를 선택해주세요.');
        return;
    }

    const year = document.getElementById('year').value;
    const reportType = document.getElementById('reportType').value;

    // UI 초기화
    hideError();
    document.getElementById('financialData').style.display = 'none';
    document.getElementById('loading').style.display = 'block';

    try {
        // DART API 호출 (API 키는 서버에서 자동으로 사용)
        const data = await fetchFinancialData(selectedCompany.corp_code, year, reportType);
        
        if (data.status !== '000') {
            throw new Error(data.message || '데이터를 불러오는데 실패했습니다.');
        }

        if (!data.list || data.list.length === 0) {
            throw new Error('해당 기간의 재무제표 데이터가 없습니다.');
        }

        currentFinancialData = data.list;
        displayFinancialData();

    } catch (error) {
        console.error('검색 실패:', error);
        showError(error.message);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// DART API 호출 (프록시 서버 사용)
async function fetchFinancialData(corpCode, year, reportCode) {
    // 프록시 서버를 통해 API 호출 (서버에서 .env의 API 키 사용)
    const url = `/api/financial?corpCode=${corpCode}&year=${year}&reportCode=${reportCode}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('API 요청 실패');
        }
        return await response.json();
    } catch (error) {
        console.error('API 호출 오류:', error);
        throw new Error('프록시 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
}

// 재무제표 데이터 표시
function displayFinancialData() {
    document.getElementById('financialData').style.display = 'block';

    // 재무상태표 (BS) 데이터
    const bsData = currentFinancialData.filter(item => item.sj_div === 'BS' && item.fs_div === 'CFS');
    displayTable('bsTable', bsData);

    // 손익계산서 (IS) 데이터
    const isData = currentFinancialData.filter(item => item.sj_div === 'IS' && item.fs_div === 'CFS');
    displayTable('isTable', isData);

    // 차트 지표 옵션 생성
    populateChartMetrics();
}

// 테이블 표시
function displayTable(tableId, data) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px;">데이터가 없습니다.</td></tr>';
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.account_nm}</strong></td>
            <td class="amount">${formatAmount(item.thstrm_amount)}</td>
            <td class="amount">${formatAmount(item.frmtrm_amount)}</td>
            <td class="amount">${formatAmount(item.bfefrmtrm_amount)}</td>
        `;
        tbody.appendChild(row);
    });
}

// 금액 포맷팅
function formatAmount(amount) {
    if (!amount || amount === '-' || amount === '') return '-';
    
    // 숫자로 변환
    const num = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(num)) return amount;
    
    // 천 단위 콤마
    return num.toLocaleString('ko-KR');
}

// 차트 지표 옵션 생성
function populateChartMetrics() {
    const chartMetric = document.getElementById('chartMetric');
    chartMetric.innerHTML = '<option value="">지표를 선택하세요</option>';

    // 주요 계정 항목만 선택
    const keyAccounts = [
        '자산총계', '부채총계', '자본총계',
        '매출액', '영업이익', '당기순이익'
    ];

    const uniqueAccounts = [...new Set(currentFinancialData.map(item => item.account_nm))]
        .filter(account => keyAccounts.some(key => account.includes(key)));

    uniqueAccounts.forEach(account => {
        const option = document.createElement('option');
        option.value = account;
        option.textContent = account;
        chartMetric.appendChild(option);
    });

    // 첫 번째 항목 자동 선택
    if (uniqueAccounts.length > 0) {
        chartMetric.value = uniqueAccounts[0];
        updateChart();
    }
}

// 차트 업데이트
function updateChart() {
    const metric = document.getElementById('chartMetric').value;
    if (!metric) return;

    const data = currentFinancialData.find(item => item.account_nm === metric);
    if (!data) return;

    const labels = [];
    const values = [];

    // 데이터 추출
    if (data.bfefrmtrm_nm && data.bfefrmtrm_amount) {
        labels.push(data.bfefrmtrm_nm);
        values.push(parseAmount(data.bfefrmtrm_amount));
    }
    if (data.frmtrm_nm && data.frmtrm_amount) {
        labels.push(data.frmtrm_nm);
        values.push(parseAmount(data.frmtrm_amount));
    }
    if (data.thstrm_nm && data.thstrm_amount) {
        labels.push(data.thstrm_nm);
        values.push(parseAmount(data.thstrm_amount));
    }

    // 기존 차트 제거
    if (currentChart) {
        currentChart.destroy();
    }

    // 새 차트 생성
    const ctx = document.getElementById('financialChart').getContext('2d');
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: metric,
                data: values,
                backgroundColor: [
                    'rgba(74, 144, 226, 0.7)',
                    'rgba(102, 126, 234, 0.7)',
                    'rgba(118, 75, 162, 0.7)'
                ],
                borderColor: [
                    'rgba(74, 144, 226, 1)',
                    'rgba(102, 126, 234, 1)',
                    'rgba(118, 75, 162, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                title: {
                    display: true,
                    text: `${selectedCompany.corp_name} - ${metric} 추이`,
                    font: {
                        size: 18,
                        weight: 'bold'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += context.parsed.y.toLocaleString('ko-KR');
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('ko-KR');
                        }
                    }
                }
            }
        }
    });
}

// 금액을 숫자로 변환
function parseAmount(amount) {
    if (!amount || amount === '-' || amount === '') return 0;
    const num = parseFloat(amount.replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
}

// 탭 전환
function switchTab(tab) {
    // 모든 탭 버튼 비활성화
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // 모든 탭 콘텐츠 숨기기
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // 선택된 탭 활성화
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}Tab`).classList.add('active');
}

// 에러 표시
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// 에러 숨기기
function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

