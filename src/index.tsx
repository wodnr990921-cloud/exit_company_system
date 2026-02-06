import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

// API 라우트
import auth from './routes/auth'
import attendance from './routes/attendance'
import members from './routes/members'
import tickets from './routes/tickets'
import books from './routes/books'
import betting from './routes/betting'
import points from './routes/points'
import staff_management from './routes/staff_management'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS 설정
app.use('/api/*', cors())

// 정적 파일 서빙
app.use('/static/*', serveStatic({ root: './public' }))

// API 라우트 등록
app.route('/api/auth', auth)
app.route('/api/attendance', attendance)
app.route('/api/members', members)
app.route('/api/tickets', tickets)
app.route('/api/books', books)
app.route('/api/betting', betting)
app.route('/api/points', points)
app.route('/api/staff', staff_management)

// 메인 페이지
app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EXIT 시스템 - 교도소 도서 판매 관리</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        body { font-family: 'Noto Sans KR', sans-serif; }
        .hidden { display: none !important; }
        .loading { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .nav-item { transition: all 0.3s; }
        .nav-item.active { background: #3b82f6; color: white; }
        .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
        .status-open { background: #dbeafe; color: #1e40af; }
        .status-assigned { background: #fef3c7; color: #92400e; }
        .status-in_progress { background: #fef9c3; color: #854d0e; }
        .status-completed { background: #d1fae5; color: #065f46; }
        .status-closed { background: #e5e7eb; color: #374151; }
        .priority-urgent { background: #fee2e2; color: #991b1b; }
        .priority-high { background: #fed7aa; color: #9a3412; }
        .priority-normal { background: #dbeafe; color: #1e40af; }
        .priority-low { background: #e5e7eb; color: #374151; }
        .modal { animation: fadeIn 0.3s; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .card { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 20px; }
        .btn { padding: 8px 16px; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-primary:hover { background: #2563eb; }
        .btn-success { background: #10b981; color: white; }
        .btn-success:hover { background: #059669; }
        .btn-danger { background: #ef4444; color: white; }
        .btn-danger:hover { background: #dc2626; }
        .btn-secondary { background: #6b7280; color: white; }
        .btn-secondary:hover { background: #4b5563; }
    </style>
</head>
<body class="bg-gray-100">
    <!-- 로딩 화면 -->
    <div id="loading-screen" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
        <div class="text-center">
            <i class="fas fa-spinner text-white text-5xl loading"></i>
            <p class="text-white mt-4">로딩 중...</p>
        </div>
    </div>

    <!-- 로그인 화면 -->
    <div id="login-screen" class="hidden min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div class="bg-white p-8 rounded-lg shadow-2xl w-96">
            <div class="text-center mb-8">
                <i class="fas fa-door-open text-6xl text-blue-500 mb-4"></i>
                <h1 class="text-3xl font-bold text-gray-800">EXIT 시스템</h1>
                <p class="text-gray-600 mt-2">교도소 도서 판매 관리 시스템</p>
            </div>
            <form id="login-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">이메일</label>
                    <input type="email" id="login-email" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
                    <input type="password" id="login-password" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                <button type="submit" class="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition">
                    <i class="fas fa-sign-in-alt mr-2"></i>로그인
                </button>
            </form>
        </div>
    </div>

    <!-- 메인 앱 화면 -->
    <div id="app-screen" class="hidden">
        <!-- 헤더 -->
        <header class="bg-white shadow-sm">
            <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                <div class="flex items-center space-x-3">
                    <i class="fas fa-door-open text-3xl text-blue-500"></i>
                    <div>
                        <h1 class="text-2xl font-bold text-gray-800">EXIT 시스템</h1>
                        <p class="text-sm text-gray-600">교도소 도서 판매 관리</p>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <span class="text-gray-700">
                        <i class="fas fa-user-circle mr-2"></i>
                        <span id="current-user-name"></span>
                        <span id="current-user-role" class="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"></span>
                    </span>
                    <button onclick="logout()" class="text-gray-600 hover:text-gray-800">
                        <i class="fas fa-sign-out-alt"></i> 로그아웃
                    </button>
                </div>
            </div>
        </header>

        <!-- 네비게이션 -->
        <nav class="bg-white shadow-sm border-t border-gray-200">
            <div class="max-w-7xl mx-auto px-4">
                <div class="flex space-x-2 overflow-x-auto">
                    <button onclick="showView('dashboard')" class="nav-item px-4 py-3 rounded-t-lg">
                        <i class="fas fa-home mr-2"></i>대시보드
                    </button>
                    <button onclick="showView('tickets')" class="nav-item px-4 py-3 rounded-t-lg">
                        <i class="fas fa-ticket-alt mr-2"></i>티켓 관리
                    </button>
                    <button onclick="showView('members')" class="nav-item px-4 py-3 rounded-t-lg">
                        <i class="fas fa-users mr-2"></i>회원 관리
                    </button>
                    <button onclick="showView('books')" class="nav-item px-4 py-3 rounded-t-lg">
                        <i class="fas fa-book mr-2"></i>도서 관리
                    </button>
                    <button id="betting-nav" onclick="showView('betting')" class="nav-item px-4 py-3 rounded-t-lg hidden">
                        <i class="fas fa-trophy mr-2"></i>배팅 관리
                    </button>
                    <button id="staff-nav" onclick="showView('staff')" class="nav-item px-4 py-3 rounded-t-lg hidden">
                        <i class="fas fa-user-tie mr-2"></i>직원 관리
                    </button>
                </div>
            </div>
        </nav>

        <!-- 컨텐츠 영역 -->
        <main class="max-w-7xl mx-auto px-4 py-6">
            <!-- 대시보드 뷰 -->
            <div id="dashboard-view" class="view-content">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div class="card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-600 text-sm">내 배정 티켓</p>
                                <p id="my-tickets-count" class="text-3xl font-bold text-blue-600">0</p>
                            </div>
                            <i class="fas fa-clipboard-list text-4xl text-blue-200"></i>
                        </div>
                    </div>
                    <div class="card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-600 text-sm">미배정 티켓</p>
                                <p id="open-tickets-count" class="text-3xl font-bold text-yellow-600">0</p>
                            </div>
                            <i class="fas fa-exclamation-triangle text-4xl text-yellow-200"></i>
                        </div>
                    </div>
                    <div class="card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-600 text-sm">긴급 티켓</p>
                                <p id="urgent-tickets-count" class="text-3xl font-bold text-red-600">0</p>
                            </div>
                            <i class="fas fa-fire text-4xl text-red-200"></i>
                        </div>
                    </div>
                    <div class="card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-600 text-sm">오늘 완료</p>
                                <p id="today-completed-count" class="text-3xl font-bold text-green-600">0</p>
                            </div>
                            <i class="fas fa-check-circle text-4xl text-green-200"></i>
                        </div>
                    </div>
                </div>

                <!-- 출근 관리 -->
                <div class="card mb-6">
                    <h3 class="text-lg font-bold mb-4"><i class="fas fa-clock mr-2"></i>오늘의 출근</h3>
                    <div id="attendance-section">
                        <div id="not-checked-in" class="space-y-4">
                            <button onclick="checkin()" class="btn btn-primary">
                                <i class="fas fa-sign-in-alt mr-2"></i>출근하기
                            </button>
                        </div>
                        <div id="checked-in" class="hidden space-y-4">
                            <p class="text-gray-700">
                                <i class="fas fa-check-circle text-green-500 mr-2"></i>
                                출근 시간: <span id="checkin-time" class="font-bold"></span>
                            </p>
                            <button onclick="showCheckoutForm()" class="btn btn-danger">
                                <i class="fas fa-sign-out-alt mr-2"></i>퇴근하기
                            </button>
                            <div id="checkout-form" class="hidden mt-4 space-y-4">
                                <div>
                                    <label class="block text-sm font-medium mb-2">오늘 사용한 우표 수</label>
                                    <input type="number" id="stamps-used" class="w-full px-4 py-2 border rounded-lg" value="0">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium mb-2">오늘의 업무 보고</label>
                                    <textarea id="daily-report" rows="4" class="w-full px-4 py-2 border rounded-lg"></textarea>
                                </div>
                                <button onclick="checkout()" class="btn btn-success">
                                    <i class="fas fa-save mr-2"></i>퇴근 완료
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 관리자 전용: 승인 대기 -->
                <div id="admin-section" class="hidden">
                    <div class="card">
                        <h3 class="text-lg font-bold mb-4">
                            <i class="fas fa-bell mr-2"></i>승인 대기 중
                        </h3>
                        <div id="pending-approvals"></div>
                    </div>
                </div>
            </div>

            <!-- 티켓 관리 뷰 -->
            <div id="tickets-view" class="view-content hidden">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold"><i class="fas fa-ticket-alt mr-2"></i>티켓 관리</h2>
                    <button onclick="showNewTicketModal()" class="btn btn-primary">
                        <i class="fas fa-plus mr-2"></i>새 티켓 생성
                    </button>
                </div>

                <div class="card mb-6">
                    <div class="flex space-x-4">
                        <div>
                            <label class="block text-sm font-medium mb-2">상태</label>
                            <select id="ticket-status-filter" onchange="loadTickets()" class="px-4 py-2 border rounded-lg">
                                <option value="all">전체 상태</option>
                                <option value="open">미배정</option>
                                <option value="assigned">배정됨</option>
                                <option value="in_progress">처리중</option>
                                <option value="completed">완료</option>
                                <option value="closed">종료</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">유형</label>
                            <select id="ticket-type-filter" onchange="loadTickets()" class="px-4 py-2 border rounded-lg">
                                <option value="all">전체 유형</option>
                                <option value="ORDER">주문</option>
                                <option value="INQUIRY">문의</option>
                                <option value="PURCHASE_ORDER">발주</option>
                                <option value="POINT_ADJUSTMENT">포인트 조정</option>
                                <option value="MEMBER">회원 관리</option>
                                <option value="MAIL_INSPECTION">우편 검수</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div id="tickets-list" class="space-y-4"></div>
            </div>

            <!-- 회원 관리 뷰 -->
            <div id="members-view" class="view-content hidden">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold"><i class="fas fa-users mr-2"></i>회원 관리</h2>
                    <button onclick="showNewMemberModal()" class="btn btn-primary">
                        <i class="fas fa-user-plus mr-2"></i>회원 등록
                    </button>
                </div>

                <div class="card mb-6">
                    <div class="flex space-x-2">
                        <input type="text" id="member-search" placeholder="이름, 수감번호, 교도소 검색..."
                               class="flex-1 px-4 py-2 border rounded-lg">
                        <button onclick="loadMembers()" class="btn btn-primary">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                </div>

                <div id="members-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
            </div>

            <!-- 도서 관리 뷰 -->
            <div id="books-view" class="view-content hidden">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold"><i class="fas fa-book mr-2"></i>도서 관리</h2>
                    <button onclick="showNewBookModal()" class="btn btn-primary">
                        <i class="fas fa-plus mr-2"></i>도서 등록
                    </button>
                </div>

                <div class="card mb-6">
                    <div class="flex space-x-2">
                        <input type="text" id="book-search" placeholder="제목, 저자, 출판사, ISBN 검색..."
                               class="flex-1 px-4 py-2 border rounded-lg">
                        <button onclick="loadBooks()" class="btn btn-primary">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                </div>

                <div id="books-list" class="space-y-4"></div>
            </div>

            <!-- 배팅 관리 뷰 (관리자 전용) -->
            <div id="betting-view" class="view-content hidden">
                <h2 class="text-2xl font-bold mb-6"><i class="fas fa-trophy mr-2"></i>배팅 관리</h2>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <!-- 경기 목록 -->
                    <div class="card">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-bold"><i class="fas fa-futbol mr-2"></i>경기 목록</h3>
                            <button onclick="showNewMatchModal()" class="btn btn-primary btn-sm">
                                <i class="fas fa-plus mr-2"></i>경기 등록
                            </button>
                        </div>
                        <div id="matches-list" class="space-y-2 max-h-96 overflow-y-auto"></div>
                    </div>

                    <!-- 정산 승인 대기 -->
                    <div class="card">
                        <h3 class="text-lg font-bold mb-4"><i class="fas fa-coins mr-2"></i>정산 승인 대기</h3>
                        <div id="pending-settlements-list" class="space-y-2 max-h-96 overflow-y-auto"></div>
                    </div>
                </div>

                <!-- 배팅 폴더 목록 -->
                <div class="card">
                    <h3 class="text-lg font-bold mb-4"><i class="fas fa-folder-open mr-2"></i>배팅 폴더 목록</h3>
                    <div id="bet-folders-list" class="space-y-4"></div>
                </div>
            </div>

            <!-- 직원 관리 뷰 (관리자 전용) -->
            <div id="staff-view" class="view-content hidden">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold"><i class="fas fa-user-tie mr-2"></i>직원 관리</h2>
                    <button onclick="showNewStaffModal()" class="btn btn-primary">
                        <i class="fas fa-user-plus mr-2"></i>직원 등록
                    </button>
                </div>

                <div id="staff-list" class="space-y-4"></div>
            </div>
        </main>
    </div>

    <!-- JavaScript -->
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script>
        // 전역 변수
        const API_BASE = '/api'
        let currentStaff = null
        let currentView = 'dashboard'
        let currentAttendanceId = null

        // 페이지 로드
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                document.getElementById('loading-screen').classList.add('hidden')
                document.getElementById('login-screen').classList.remove('hidden')
            }, 500)

            // 로그인 폼
            document.getElementById('login-form').addEventListener('submit', async (e) => {
                e.preventDefault()
                await login()
            })
        })

        // 로그인
        async function login() {
            const email = document.getElementById('login-email').value
            const password = document.getElementById('login-password').value

            try {
                const response = await axios.post(\`\${API_BASE}/auth/login\`, { email, password })
                currentStaff = response.data.staff

                document.getElementById('login-screen').classList.add('hidden')
                document.getElementById('app-screen').classList.remove('hidden')

                document.getElementById('current-user-name').textContent = currentStaff.name
                document.getElementById('current-user-role').textContent = currentStaff.role === 'admin' ? '관리자' : '직원'

                // 관리자 전용 메뉴 표시
                if (currentStaff.role === 'admin') {
                    document.getElementById('betting-nav').classList.remove('hidden')
                    document.getElementById('staff-nav').classList.remove('hidden')
                }

                await loadDashboard()
            } catch (error) {
                alert('로그인 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 로그아웃
        function logout() {
            currentStaff = null
            document.getElementById('app-screen').classList.add('hidden')
            document.getElementById('login-screen').classList.remove('hidden')
            document.getElementById('login-email').value = ''
            document.getElementById('login-password').value = ''
        }

        // 뷰 전환
        function showView(view) {
            currentView = view
            document.querySelectorAll('.view-content').forEach(el => el.classList.add('hidden'))
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'))

            document.getElementById(\`\${view}-view\`).classList.remove('hidden')
            event.target.closest('.nav-item').classList.add('active')

            // 각 뷰 로드
            if (view === 'dashboard') loadDashboard()
            else if (view === 'tickets') loadTickets()
            else if (view === 'members') loadMembers()
            else if (view === 'books') loadBooks()
            else if (view === 'betting') loadBetting()
            else if (view === 'staff') loadStaff()
        }

        // 대시보드 로드
        async function loadDashboard() {
            try {
                // 출근 상태 확인
                const attendanceRes = await axios.get(\`\${API_BASE}/attendance/status/\${currentStaff.id}\`)
                if (attendanceRes.data.checkedIn) {
                    currentAttendanceId = attendanceRes.data.record.id
                    document.getElementById('not-checked-in').classList.add('hidden')
                    document.getElementById('checked-in').classList.remove('hidden')
                    document.getElementById('checkin-time').textContent = new Date(attendanceRes.data.record.checkin_time).toLocaleString()
                    
                    if (attendanceRes.data.checkedOut) {
                        document.getElementById('checked-in').innerHTML = '<p class="text-green-600"><i class="fas fa-check-double mr-2"></i>오늘 퇴근을 완료했습니다.</p>'
                    }
                } else {
                    document.getElementById('not-checked-in').classList.remove('hidden')
                    document.getElementById('checked-in').classList.add('hidden')
                }

                // 통계 로드
                const [statsRes, ticketsRes] = await Promise.all([
                    axios.get(\`\${API_BASE}/tickets/stats/dashboard\`),
                    axios.get(\`\${API_BASE}/tickets?assigned_to=\${currentStaff.id}&status=open\`)
                ])

                const stats = statsRes.data
                const myTickets = ticketsRes.data.tickets.filter(t => !['completed', 'closed'].includes(t.status))

                document.getElementById('my-tickets-count').textContent = myTickets.length
                document.getElementById('today-completed-count').textContent = stats.todayCompleted

                // 미배정 티켓
                const openTickets = await axios.get(\`\${API_BASE}/tickets?status=open\`)
                document.getElementById('open-tickets-count').textContent = openTickets.data.tickets.length

                // 긴급 티켓
                const urgentCount = stats.priorityStats.find(s => s.priority === 'urgent')?.count || 0
                document.getElementById('urgent-tickets-count').textContent = urgentCount

                // 관리자: 승인 대기 목록
                if (currentStaff.role === 'admin') {
                    document.getElementById('admin-section').classList.remove('hidden')
                    await loadPendingApprovals()
                }
            } catch (error) {
                console.error('대시보드 로드 오류:', error)
            }
        }

        // 출근
        async function checkin() {
            try {
                await axios.post(\`\${API_BASE}/attendance/checkin\`, { staff_id: currentStaff.id })
                alert('출근이 완료되었습니다!')
                await loadDashboard()
            } catch (error) {
                alert('출근 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 퇴근 폼 표시
        function showCheckoutForm() {
            document.getElementById('checkout-form').classList.remove('hidden')
        }

        // 퇴근
        async function checkout() {
            try {
                const stampsUsed = document.getElementById('stamps-used').value
                const dailyReport = document.getElementById('daily-report').value

                await axios.post(\`\${API_BASE}/attendance/checkout\`, {
                    staff_id: currentStaff.id,
                    stamps_used: parseInt(stampsUsed) || 0,
                    daily_report: dailyReport
                })

                alert('퇴근이 완료되었습니다!')
                await loadDashboard()
            } catch (error) {
                alert('퇴근 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 승인 대기 목록 로드
        async function loadPendingApprovals() {
            try {
                const [pointsRes, settlementsRes] = await Promise.all([
                    axios.get(\`\${API_BASE}/points/pending\`),
                    axios.get(\`\${API_BASE}/betting/settlements/pending\`)
                ])

                const points = pointsRes.data.transactions || []
                const settlements = settlementsRes.data.settlements || []

                const html = \`
                    <div class="space-y-2">
                        \${points.length > 0 ? '<h4 class="font-bold text-sm mb-2">포인트 동결 승인</h4>' : ''}
                        \${points.map(p => \`
                            <div class="bg-yellow-50 p-3 rounded border border-yellow-200">
                                <p class="font-bold">\${p.member_name} - \${p.point_type === 'regular' ? '일반' : '배팅'} 포인트</p>
                                <p class="text-sm">\${p.amount.toLocaleString()}원</p>
                                <div class="flex space-x-2 mt-2">
                                    <button onclick="approvePoint(\${p.id}, 'approve')" class="btn btn-success btn-sm">승인</button>
                                    <button onclick="approvePoint(\${p.id}, 'reject')" class="btn btn-danger btn-sm">거부</button>
                                </div>
                            </div>
                        \`).join('')}
                        
                        \${settlements.length > 0 ? '<h4 class="font-bold text-sm mb-2 mt-4">배팅 정산 승인</h4>' : ''}
                        \${settlements.map(s => \`
                            <div class="bg-green-50 p-3 rounded border border-green-200">
                                <p class="font-bold">\${s.member_name} - \${s.folder_number}</p>
                                <p class="text-sm">정산액: \${s.settlement_amount.toLocaleString()}원</p>
                                <div class="flex space-x-2 mt-2">
                                    <button onclick="approveSettlement(\${s.id})" class="btn btn-success btn-sm">승인</button>
                                    <button onclick="rejectSettlement(\${s.id})" class="btn btn-danger btn-sm">거부</button>
                                </div>
                            </div>
                        \`).join('')}
                        
                        \${points.length === 0 && settlements.length === 0 ? '<p class="text-gray-500 text-sm">승인 대기 중인 항목이 없습니다.</p>' : ''}
                    </div>
                \`

                document.getElementById('pending-approvals').innerHTML = html
            } catch (error) {
                console.error('승인 대기 목록 로드 오류:', error)
            }
        }

        // 포인트 승인/거부
        async function approvePoint(id, action) {
            try {
                await axios.post(\`\${API_BASE}/points/approve/\${id}\`, {
                    approved_by: currentStaff.id,
                    action
                })
                alert(action === 'approve' ? '승인되었습니다.' : '거부되었습니다.')
                await loadPendingApprovals()
            } catch (error) {
                alert('처리 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 정산 승인
        async function approveSettlement(id) {
            try {
                await axios.post(\`\${API_BASE}/betting/settlements/\${id}/approve\`, {
                    approved_by: currentStaff.id
                })
                alert('정산이 승인되었습니다.')
                await loadPendingApprovals()
                if (currentView === 'betting') await loadBetting()
            } catch (error) {
                alert('승인 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 정산 거부
        async function rejectSettlement(id) {
            try {
                const notes = prompt('거부 사유를 입력하세요:')
                if (!notes) return

                await axios.post(\`\${API_BASE}/betting/settlements/\${id}/reject\`, {
                    approved_by: currentStaff.id,
                    notes
                })
                alert('정산이 거부되었습니다.')
                await loadPendingApprovals()
                if (currentView === 'betting') await loadBetting()
            } catch (error) {
                alert('거부 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 티켓 목록 로드
        async function loadTickets() {
            const status = document.getElementById('ticket-status-filter').value
            const type = document.getElementById('ticket-type-filter').value

            try {
                let url = \`\${API_BASE}/tickets?\`
                if (status !== 'all') url += \`status=\${status}&\`
                if (type !== 'all') url += \`ticket_type=\${type}&\`

                const response = await axios.get(url)
                const tickets = response.data.tickets

                const html = tickets.length > 0 ? tickets.map(t => \`
                    <div class="card hover:shadow-lg transition cursor-pointer" onclick="showTicketDetail(\${t.id})">
                        <div class="flex justify-between items-start">
                            <div>
                                <h3 class="font-bold text-lg">\${t.ticket_number}: \${t.title}</h3>
                                <p class="text-sm text-gray-600 mt-1">\${t.member_name || '회원 없음'}</p>
                                <div class="flex space-x-2 mt-2">
                                    <span class="status-badge status-\${t.status}">\${getStatusText(t.status)}</span>
                                    <span class="status-badge priority-\${t.priority}">\${getPriorityText(t.priority)}</span>
                                    <span class="status-badge">\${getTypeText(t.ticket_type)}</span>
                                </div>
                            </div>
                            <div class="text-right text-sm text-gray-500">
                                <p>담당: \${t.assigned_to_name || '미배정'}</p>
                                <p>\${new Date(t.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                \`).join('') : '<p class="text-gray-500 text-center py-8">티켓이 없습니다.</p>'

                document.getElementById('tickets-list').innerHTML = html
            } catch (error) {
                console.error('티켓 목록 로드 오류:', error)
            }
        }

        // 회원 목록 로드
        async function loadMembers() {
            const search = document.getElementById('member-search').value

            try {
                const response = await axios.get(\`\${API_BASE}/members?search=\${search}\`)
                const members = response.data.members

                const html = members.length > 0 ? members.map(m => \`
                    <div class="card hover:shadow-lg transition cursor-pointer" onclick="showMemberDetail(\${m.id})">
                        <h3 class="font-bold text-lg">\${m.name}</h3>
                        <p class="text-sm text-gray-600">\${m.institution} - \${m.inmate_number}</p>
                        <div class="mt-3 space-y-1">
                            <p class="text-sm"><span class="font-bold">일반 포인트:</span> \${m.points.toLocaleString()}원</p>
                            <p class="text-sm"><span class="font-bold">배팅 포인트:</span> \${m.betting_points.toLocaleString()}원</p>
                            \${m.frozen_points > 0 ? \`<p class="text-sm text-yellow-600"><span class="font-bold">동결:</span> \${m.frozen_points.toLocaleString()}원</p>\` : ''}
                        </div>
                    </div>
                \`).join('') : '<p class="text-gray-500 text-center py-8">회원이 없습니다.</p>'

                document.getElementById('members-list').innerHTML = html
            } catch (error) {
                console.error('회원 목록 로드 오류:', error)
            }
        }

        // 도서 목록 로드
        async function loadBooks() {
            const search = document.getElementById('book-search').value

            try {
                const response = await axios.get(\`\${API_BASE}/books?search=\${search}\`)
                const books = response.data.books

                const html = books.length > 0 ? books.map(b => \`
                    <div class="card">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <h3 class="font-bold text-lg">\${b.title}</h3>
                                <p class="text-sm text-gray-600 mt-1">\${b.author || '저자 미상'} | \${b.publisher || '출판사 미상'}</p>
                                <p class="text-sm text-gray-500 mt-1">ISBN: \${b.isbn || 'N/A'}</p>
                            </div>
                            <div class="text-right">
                                <p class="text-lg font-bold text-blue-600">\${b.price.toLocaleString()}원</p>
                                <p class="text-sm \${b.stock > 0 ? 'text-green-600' : 'text-red-600'}">
                                    재고: \${b.stock}권
                                </p>
                            </div>
                        </div>
                    </div>
                \`).join('') : '<p class="text-gray-500 text-center py-8">도서가 없습니다.</p>'

                document.getElementById('books-list').innerHTML = html
            } catch (error) {
                console.error('도서 목록 로드 오류:', error)
            }
        }

        // 배팅 관리 로드
        async function loadBetting() {
            try {
                const [matchesRes, settlementsRes, foldersRes] = await Promise.all([
                    axios.get(\`\${API_BASE}/betting/matches\`),
                    axios.get(\`\${API_BASE}/betting/settlements/pending\`),
                    axios.get(\`\${API_BASE}/betting/folders\`)
                ])

                // 경기 목록
                const matches = matchesRes.data.matches
                const matchesHtml = matches.length > 0 ? matches.map(m => \`
                    <div class="bg-gray-50 p-3 rounded">
                        <p class="font-bold">\${m.match_name}</p>
                        <p class="text-sm text-gray-600">\${m.home_team} vs \${m.away_team}</p>
                        <p class="text-xs text-gray-500">\${new Date(m.match_date).toLocaleString()}</p>
                        \${m.status === 'scheduled' ? \`
                            <button onclick="showMatchResultModal(\${m.id})" class="btn btn-primary btn-sm mt-2">결과 입력</button>
                        \` : \`
                            <span class="text-xs text-gray-500">상태: \${m.status}</span>
                        \`}
                    </div>
                \`).join('') : '<p class="text-gray-500 text-sm">경기가 없습니다.</p>'

                document.getElementById('matches-list').innerHTML = matchesHtml

                // 정산 대기 목록은 이미 loadPendingApprovals에서 처리됨
                const settlements = settlementsRes.data.settlements || []
                const settlementsHtml = settlements.length > 0 ? settlements.map(s => \`
                    <div class="bg-green-50 p-3 rounded border border-green-200">
                        <p class="font-bold">\${s.member_name} - \${s.folder_number}</p>
                        <p class="text-sm">배팅: \${s.total_bet_amount?.toLocaleString()}원 → 정산: \${s.settlement_amount.toLocaleString()}원</p>
                        <div class="flex space-x-2 mt-2">
                            <button onclick="approveSettlement(\${s.id})" class="btn btn-success btn-sm">승인</button>
                            <button onclick="rejectSettlement(\${s.id})" class="btn btn-danger btn-sm">거부</button>
                        </div>
                    </div>
                \`).join('') : '<p class="text-gray-500 text-sm">정산 대기가 없습니다.</p>'

                document.getElementById('pending-settlements-list').innerHTML = settlementsHtml

                // 배팅 폴더 목록
                const folders = foldersRes.data.folders || []
                const foldersHtml = folders.length > 0 ? folders.map(f => \`
                    <div class="card">
                        <div class="flex justify-between items-start">
                            <div>
                                <h4 class="font-bold">\${f.folder_number} [\${f.folder_type === 'single' ? '단폴더' : '다폴더'}]</h4>
                                <p class="text-sm text-gray-600">\${f.member_name} - 티켓: \${f.ticket_number}</p>
                                <p class="text-sm mt-2">배팅: \${f.total_bet_amount.toLocaleString()}원 | 배당: \${f.total_odds.toFixed(2)} | 예상: \${f.potential_win.toLocaleString()}원</p>
                                <div class="mt-2">
                                    <span class="status-badge status-\${f.status}">\${getStatusText(f.status)}</span>
                                </div>
                            </div>
                            <div class="text-right text-sm text-gray-500">
                                <p>\${new Date(f.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div class="mt-3 space-y-1">
                            \${(f.bets || []).map(b => \`
                                <p class="text-sm text-gray-700">
                                    <i class="fas fa-chevron-right mr-1"></i>
                                    \${b.match_name}: \${getBetTypeText(b.bet_type)} (\${b.odds}) - \${getStatusText(b.status)}
                                </p>
                            \`).join('')}
                        </div>
                    </div>
                \`).join('') : '<p class="text-gray-500 text-center py-4">배팅 폴더가 없습니다.</p>'

                document.getElementById('bet-folders-list').innerHTML = foldersHtml
            } catch (error) {
                console.error('배팅 관리 로드 오류:', error)
            }
        }

        // 직원 목록 로드
        async function loadStaff() {
            try {
                const response = await axios.get(\`\${API_BASE}/staff\`)
                const staff = response.data.staff

                const html = staff.length > 0 ? staff.map(s => \`
                    <div class="card">
                        <div class="flex justify-between items-center">
                            <div>
                                <h3 class="font-bold text-lg">\${s.name}</h3>
                                <p class="text-sm text-gray-600">\${s.email}</p>
                                <span class="status-badge \${s.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}">
                                    \${s.role === 'admin' ? '관리자' : '직원'}
                                </span>
                            </div>
                            <div class="text-right text-sm text-gray-500">
                                <p>등록일: \${new Date(s.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                \`).join('') : '<p class="text-gray-500 text-center py-8">직원이 없습니다.</p>'

                document.getElementById('staff-list').innerHTML = html
            } catch (error) {
                console.error('직원 목록 로드 오류:', error)
            }
        }

        // 헬퍼 함수들
        function getStatusText(status) {
            const statusMap = {
                'open': '미배정',
                'assigned': '배정됨',
                'in_progress': '처리중',
                'completed': '완료',
                'closed': '종료',
                'pending': '대기',
                'win': '당첨',
                'lose': '낙첨',
                'cancelled': '취소',
                'scheduled': '예정',
                'approved': '승인됨'
            }
            return statusMap[status] || status
        }

        function getPriorityText(priority) {
            const priorityMap = {
                'urgent': '긴급',
                'high': '높음',
                'normal': '보통',
                'low': '낮음'
            }
            return priorityMap[priority] || priority
        }

        function getTypeText(type) {
            const typeMap = {
                'ORDER': '주문',
                'INQUIRY': '문의',
                'PURCHASE_ORDER': '발주',
                'POINT_ADJUSTMENT': '포인트 조정',
                'MEMBER': '회원 관리',
                'MAIL_INSPECTION': '우편 검수'
            }
            return typeMap[type] || type
        }

        function getBetTypeText(betType) {
            const betTypeMap = {
                'home_win': '홈 승',
                'away_win': '원정 승',
                'draw': '무승부',
                'over': '오버',
                'under': '언더',
                'handicap_home': '핸디 홈',
                'handicap_away': '핸디 원정'
            }
            return betTypeMap[betType] || betType
        }

        // 모달 함수들 (구현 필요)
        function showNewTicketModal() { alert('티켓 생성 모달 (구현 예정)') }
        function showNewMemberModal() { alert('회원 등록 모달 (구현 예정)') }
        function showNewBookModal() { alert('도서 등록 모달 (구현 예정)') }
        function showNewMatchModal() { alert('경기 등록 모달 (구현 예정)') }
        function showNewStaffModal() { alert('직원 등록 모달 (구현 예정)') }
        function showTicketDetail(id) { alert(\`티켓 상세 모달 (ID: \${id}) (구현 예정)\`) }
        function showMemberDetail(id) { alert(\`회원 상세 모달 (ID: \${id}) (구현 예정)\`) }
        function showMatchResultModal(id) { alert(\`경기 결과 입력 모달 (ID: \${id}) (구현 예정)\`) }
    </script>
</body>
</html>
  `)
})

export default app
