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
    <title>엑시트 시스템 - EXIT System</title>
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
                <h1 class="text-3xl font-bold text-gray-800">엑시트 시스템</h1>
                <p class="text-gray-600 mt-2">EXIT System - Integrated Management</p>
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
                        <h1 class="text-2xl font-bold text-gray-800">엑시트 시스템</h1>
                        <p class="text-sm text-gray-600">EXIT System</p>
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

        <!-- 모달들 -->
        
        <!-- 경기 등록 모달 -->
        <div id="new-match-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold"><i class="fas fa-futbol mr-2"></i>경기 등록</h3>
                        <button onclick="closeNewMatchModal()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-1">경기명 *</label>
                            <input type="text" id="match-name" class="w-full px-3 py-2 border rounded" placeholder="예: EPL 맨유 vs 리버풀">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">경기 일시 *</label>
                            <input type="datetime-local" id="match-date" class="w-full px-3 py-2 border rounded">
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium mb-1">홈 팀 *</label>
                                <input type="text" id="home-team" class="w-full px-3 py-2 border rounded">
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">원정 팀 *</label>
                                <input type="text" id="away-team" class="w-full px-3 py-2 border rounded">
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-1">배팅 유형 *</label>
                            <select id="betting-type" class="w-full px-3 py-2 border rounded" onchange="toggleBettingFields()">
                                <option value="win_draw_lose">승무패</option>
                                <option value="over_under">언오버</option>
                                <option value="handicap">핸디캡</option>
                            </select>
                        </div>

                        <!-- 승무패 배당률 -->
                        <div id="win-draw-lose-fields">
                            <label class="block text-sm font-medium mb-2">배당률 설정</label>
                            <div class="grid grid-cols-3 gap-3">
                                <div>
                                    <label class="text-xs text-gray-600">홈 승</label>
                                    <input type="number" id="home-odds" class="w-full px-3 py-2 border rounded" step="0.01" value="1.0">
                                </div>
                                <div>
                                    <label class="text-xs text-gray-600">무승부</label>
                                    <input type="number" id="draw-odds" class="w-full px-3 py-2 border rounded" step="0.01" value="1.0">
                                </div>
                                <div>
                                    <label class="text-xs text-gray-600">원정 승</label>
                                    <input type="number" id="away-odds" class="w-full px-3 py-2 border rounded" step="0.01" value="1.0">
                                </div>
                            </div>
                        </div>

                        <!-- 언오버 설정 -->
                        <div id="over-under-fields" class="hidden">
                            <label class="block text-sm font-medium mb-2">언오버 설정</label>
                            <div class="grid grid-cols-3 gap-3">
                                <div>
                                    <label class="text-xs text-gray-600">기준 점수</label>
                                    <input type="number" id="over-under-line" class="w-full px-3 py-2 border rounded" step="0.5" value="2.5">
                                </div>
                                <div>
                                    <label class="text-xs text-gray-600">오버 배당</label>
                                    <input type="number" id="over-odds" class="w-full px-3 py-2 border rounded" step="0.01" value="1.0">
                                </div>
                                <div>
                                    <label class="text-xs text-gray-600">언더 배당</label>
                                    <input type="number" id="under-odds" class="w-full px-3 py-2 border rounded" step="0.01" value="1.0">
                                </div>
                            </div>
                        </div>

                        <!-- 핸디캡 설정 -->
                        <div id="handicap-fields" class="hidden">
                            <label class="block text-sm font-medium mb-2">핸디캡 설정</label>
                            <div class="grid grid-cols-3 gap-3">
                                <div>
                                    <label class="text-xs text-gray-600">핸디캡</label>
                                    <input type="number" id="handicap-line" class="w-full px-3 py-2 border rounded" step="0.5" value="0">
                                </div>
                                <div>
                                    <label class="text-xs text-gray-600">홈 배당</label>
                                    <input type="number" id="handicap-home-odds" class="w-full px-3 py-2 border rounded" step="0.01" value="1.0">
                                </div>
                                <div>
                                    <label class="text-xs text-gray-600">원정 배당</label>
                                    <input type="number" id="handicap-away-odds" class="w-full px-3 py-2 border rounded" step="0.01" value="1.0">
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex justify-end space-x-2 mt-6">
                            <button onclick="closeNewMatchModal()" class="btn btn-secondary">취소</button>
                            <button onclick="createMatch()" class="btn btn-primary">등록</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 경기 결과 입력 모달 -->
        <div id="match-result-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-md w-full p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold"><i class="fas fa-trophy mr-2"></i>경기 결과 입력</h3>
                    <button onclick="closeMatchResultModal()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">경기 결과 선택</label>
                        <select id="match-result" class="w-full px-3 py-2 border rounded">
                            <option value="">선택하세요</option>
                            <option value="home_win">홈 팀 승리</option>
                            <option value="draw">무승부</option>
                            <option value="away_win">원정 팀 승리</option>
                            <option value="over">오버</option>
                            <option value="under">언더</option>
                            <option value="handicap_home">핸디캡 홈 승</option>
                            <option value="handicap_away">핸디캡 원정 승</option>
                            <option value="cancelled">취소</option>
                        </select>
                    </div>
                    
                    <div class="flex justify-end space-x-2">
                        <button onclick="closeMatchResultModal()" class="btn btn-secondary">취소</button>
                        <button onclick="submitMatchResult()" class="btn btn-primary">결과 입력</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 티켓 생성 모달 -->
        <div id="new-ticket-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold"><i class="fas fa-ticket-alt mr-2"></i>새 티켓 생성</h3>
                        <button onclick="closeNewTicketModal()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <!-- 티켓 유형 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">티켓 유형 *</label>
                            <select id="ticket-type" class="w-full px-3 py-2 border rounded" onchange="toggleTicketFields()">
                                <option value="">선택하세요</option>
                                <option value="ORDER">주문</option>
                                <option value="INQUIRY">문의</option>
                                <option value="PURCHASE_ORDER">발주</option>
                                <option value="POINT_ADJUSTMENT">포인트 조정</option>
                                <option value="MEMBER">회원 관리</option>
                                <option value="MAIL_INSPECTION">우편 검수</option>
                            </select>
                        </div>

                        <!-- 제목 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">제목 *</label>
                            <input type="text" id="ticket-title" class="w-full px-3 py-2 border rounded" placeholder="티켓 제목을 입력하세요">
                        </div>

                        <!-- 설명 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">설명</label>
                            <textarea id="ticket-description" class="w-full px-3 py-2 border rounded" rows="4" placeholder="티켓 내용을 입력하세요"></textarea>
                        </div>

                        <!-- 회원 선택 (주문, 포인트 조정, 회원 관리 유형일 때) -->
                        <div id="ticket-member-field" class="hidden">
                            <label class="block text-sm font-medium mb-1">회원 선택 *</label>
                            <select id="ticket-member" class="w-full px-3 py-2 border rounded">
                                <option value="">선택하세요</option>
                            </select>
                        </div>

                        <!-- 우선순위 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">우선순위</label>
                            <select id="ticket-priority" class="w-full px-3 py-2 border rounded">
                                <option value="normal">일반</option>
                                <option value="urgent">긴급</option>
                            </select>
                        </div>

                        <!-- 담당자 배정 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">담당자 배정</label>
                            <select id="ticket-assigned-to" class="w-full px-3 py-2 border rounded">
                                <option value="">미배정</option>
                            </select>
                        </div>

                        <!-- 포인트 조정 전용 필드 -->
                        <div id="point-adjustment-fields" class="hidden space-y-3">
                            <div>
                                <label class="block text-sm font-medium mb-1">포인트 유형 *</label>
                                <select id="point-type" class="w-full px-3 py-2 border rounded">
                                    <option value="points">일반 포인트</option>
                                    <option value="betting_points">배팅 포인트</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">조정 유형 *</label>
                                <select id="adjustment-type" class="w-full px-3 py-2 border rounded">
                                    <option value="add">적립</option>
                                    <option value="subtract">차감</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">금액 *</label>
                                <input type="number" id="point-amount" class="w-full px-3 py-2 border rounded" placeholder="금액 입력" min="0">
                            </div>
                        </div>
                        
                        <div class="flex justify-end space-x-2 mt-6">
                            <button onclick="closeNewTicketModal()" class="btn btn-secondary">취소</button>
                            <button onclick="createTicket()" class="btn btn-primary">생성</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 티켓 상세 모달 (배팅 폴더 포함) -->
        <div id="ticket-detail-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <div>
                            <h3 class="text-xl font-bold"><i class="fas fa-ticket-alt mr-2"></i>티켓 상세</h3>
                            <p class="text-sm text-gray-600">
                                <span id="modal-ticket-number" class="font-mono"></span> - 
                                <span id="modal-ticket-title"></span>
                            </p>
                            <p class="text-xs text-gray-500">회원: <span id="modal-ticket-member"></span></p>
                        </div>
                        <button onclick="closeTicketDetail()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <!-- 배팅 접수 -->
                        <div class="card">
                            <h4 class="font-bold mb-3">
                                <i class="fas fa-trophy mr-2"></i>배팅 접수
                                <span class="text-sm text-gray-600 ml-2">
                                    (잔액: <span id="member-betting-points">0</span>원)
                                </span>
                            </h4>
                            
                            <div class="mb-4">
                                <label class="block text-sm font-medium mb-2">경기 선택 (<span id="folder-type-display">단폴더</span>)</label>
                                <div id="betting-matches-list" class="space-y-2 max-h-96 overflow-y-auto border rounded p-2">
                                    로딩중...
                                </div>
                            </div>

                            <div class="space-y-3">
                                <div>
                                    <label class="block text-sm font-medium mb-1">배팅 금액</label>
                                    <input 
                                        type="number" 
                                        id="folder-bet-amount" 
                                        class="w-full px-3 py-2 border rounded" 
                                        placeholder="배팅 금액 입력"
                                        oninput="updatePotentialWin()"
                                    >
                                </div>

                                <div class="bg-blue-50 p-3 rounded">
                                    <div class="flex justify-between text-sm mb-1">
                                        <span>총 배당률:</span>
                                        <span id="total-odds-display" class="font-bold">1.00</span>
                                    </div>
                                    <div class="flex justify-between text-sm">
                                        <span>예상 당첨금:</span>
                                        <span id="potential-win-display" class="font-bold text-green-600">0원</span>
                                    </div>
                                </div>

                                <button onclick="submitBetFolder()" class="btn btn-primary w-full">
                                    <i class="fas fa-check mr-2"></i>배팅 접수
                                </button>
                            </div>
                        </div>

                        <!-- 배팅 내역 -->
                        <div class="card">
                            <h4 class="font-bold mb-3"><i class="fas fa-history mr-2"></i>배팅 내역</h4>
                            <div id="betting-history-list" class="space-y-2 max-h-[500px] overflow-y-auto">
                                로딩중...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

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
        // 헬퍼 함수들
        function getStatusText(status) {
            const map = {
                'pending': '대기',
                'won': '당첨',
                'lost': '낙첨',
                'cancelled': '취소',
                'settled': '정산완료'
            }
            return map[status] || status
        }

        function getBetTypeText(type) {
            const map = {
                'home_win': '홈 승',
                'away_win': '원정 승',
                'draw': '무승부',
                'over': '오버',
                'under': '언더',
                'handicap_home': '핸디캡 홈',
                'handicap_away': '핸디캡 원정'
            }
            return map[type] || type
        }

        // 경기 등록 모달
        function showNewMatchModal() {
            document.getElementById('new-match-modal').classList.remove('hidden')
        }

        function closeNewMatchModal() {
            document.getElementById('new-match-modal').classList.add('hidden')
        }

        async function createMatch() {
            const matchName = document.getElementById('match-name').value
            const matchDate = document.getElementById('match-date').value
            const homeTeam = document.getElementById('home-team').value
            const awayTeam = document.getElementById('away-team').value
            const bettingType = document.getElementById('betting-type').value

            if (!matchName || !matchDate || !homeTeam || !awayTeam) {
                alert('필수 항목을 입력해주세요.')
                return
            }

            const data = {
                match_name: matchName,
                match_date: matchDate,
                home_team: homeTeam,
                away_team: awayTeam,
                betting_type: bettingType
            }

            // 배당률 입력
            if (bettingType === 'win_draw_lose') {
                data.home_odds = parseFloat(document.getElementById('home-odds').value) || 1.0
                data.away_odds = parseFloat(document.getElementById('away-odds').value) || 1.0
                data.draw_odds = parseFloat(document.getElementById('draw-odds').value) || 1.0
            } else if (bettingType === 'over_under') {
                data.over_under_line = parseFloat(document.getElementById('over-under-line').value) || 2.5
                data.over_odds = parseFloat(document.getElementById('over-odds').value) || 1.0
                data.under_odds = parseFloat(document.getElementById('under-odds').value) || 1.0
            } else if (bettingType === 'handicap') {
                data.handicap_line = parseFloat(document.getElementById('handicap-line').value) || 0
                data.handicap_home_odds = parseFloat(document.getElementById('handicap-home-odds').value) || 1.0
                data.handicap_away_odds = parseFloat(document.getElementById('handicap-away-odds').value) || 1.0
            }

            try {
                await axios.post(\`\${API_BASE}/betting/matches\`, data)
                alert('경기가 등록되었습니다.')
                closeNewMatchModal()
                if (currentView === 'betting') await loadBetting()
            } catch (error) {
                alert('경기 등록 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 경기 결과 입력 모달
        let currentMatchId = null

        function showMatchResultModal(matchId) {
            currentMatchId = matchId
            document.getElementById('match-result-modal').classList.remove('hidden')
        }

        function closeMatchResultModal() {
            currentMatchId = null
            document.getElementById('match-result-modal').classList.add('hidden')
        }

        async function submitMatchResult() {
            const result = document.getElementById('match-result').value

            if (!result) {
                alert('결과를 선택해주세요.')
                return
            }

            try {
                await axios.post(\`\${API_BASE}/betting/matches/\${currentMatchId}/result\`, { result })
                alert('경기 결과가 입력되고 자동 정산이 완료되었습니다.')
                closeMatchResultModal()
                if (currentView === 'betting') await loadBetting()
            } catch (error) {
                alert('결과 입력 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 정산 승인/거부
        async function approveSettlement(settlementId) {
            if (!confirm('이 정산을 승인하시겠습니까?')) return

            try {
                await axios.post(\`\${API_BASE}/betting/settlements/\${settlementId}/approve\`, {
                    approved_by: currentStaff.id
                })
                alert('정산이 승인되었습니다.')
                if (currentView === 'betting') await loadBetting()
            } catch (error) {
                alert('승인 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        async function rejectSettlement(settlementId) {
            const reason = prompt('거부 사유를 입력해주세요:')
            if (!reason) return

            try {
                await axios.post(\`\${API_BASE}/betting/settlements/\${settlementId}/reject\`, {
                    rejected_by: currentStaff.id,
                    reject_reason: reason
                })
                alert('정산이 거부되었습니다.')
                if (currentView === 'betting') await loadBetting()
            } catch (error) {
                alert('거부 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 티켓 상세 모달 (배팅 폴더 포함)
        let currentTicketId = null
        let selectedMatches = [] // 다폴더용 선택된 경기들

        async function showTicketDetail(ticketId) {
            currentTicketId = ticketId
            selectedMatches = []
            
            try {
                const [ticketRes, matchesRes] = await Promise.all([
                    axios.get(\`\${API_BASE}/tickets/\${ticketId}\`),
                    axios.get(\`\${API_BASE}/betting/matches?status=scheduled\`)
                ])

                const ticket = ticketRes.data.ticket
                const matches = matchesRes.data.matches || []

                // 티켓 기본 정보
                document.getElementById('modal-ticket-number').textContent = ticket.ticket_number
                document.getElementById('modal-ticket-title').textContent = ticket.title
                document.getElementById('modal-ticket-member').textContent = ticket.member_name || '-'

                // 회원 배팅 포인트 로드
                if (ticket.member_id) {
                    const memberRes = await axios.get(\`\${API_BASE}/members/\${ticket.member_id}\`)
                    document.getElementById('member-betting-points').textContent = 
                        memberRes.data.member.betting_points.toLocaleString()
                }

                // 경기 목록 표시
                const matchesHtml = matches.map(m => {
                    let oddsInfo = ''
                    if (m.betting_type === 'win_draw_lose') {
                        oddsInfo = \`홈승: \${m.home_odds} | 무: \${m.draw_odds || '-'} | 원정승: \${m.away_odds}\`
                    } else if (m.betting_type === 'over_under') {
                        oddsInfo = \`기준: \${m.over_under_line} | 오버: \${m.over_odds} | 언더: \${m.under_odds}\`
                    } else if (m.betting_type === 'handicap') {
                        oddsInfo = \`핸디: \${m.handicap_line} | 홈: \${m.handicap_home_odds} | 원정: \${m.handicap_away_odds}\`
                    }

                    return \`
                        <div class="border rounded p-3 hover:bg-gray-50 cursor-pointer" onclick="toggleMatchSelection(\${m.id})">
                            <div class="flex items-start justify-between">
                                <div class="flex-1">
                                    <div class="flex items-center">
                                        <input type="checkbox" id="match-select-\${m.id}" class="mr-2" disabled>
                                        <h4 class="font-bold">\${m.match_name}</h4>
                                    </div>
                                    <p class="text-sm text-gray-600 ml-6">\${m.home_team} vs \${m.away_team}</p>
                                    <p class="text-xs text-gray-500 ml-6">\${new Date(m.match_date).toLocaleString()}</p>
                                    <p class="text-xs text-blue-600 ml-6 mt-1">\${oddsInfo}</p>
                                </div>
                            </div>
                            <div id="bet-selection-\${m.id}" class="hidden mt-3 ml-6 space-y-2">
                                \${getBetTypeOptions(m)}
                            </div>
                        </div>
                    \`
                }).join('')

                document.getElementById('betting-matches-list').innerHTML = matchesHtml || 
                    '<p class="text-gray-500 text-center py-4">예정된 경기가 없습니다.</p>'

                // 기존 배팅 폴더 로드
                if (ticket.member_id) {
                    const foldersRes = await axios.get(\`\${API_BASE}/betting/folders?member_id=\${ticket.member_id}\`)
                    const folders = foldersRes.data.folders || []
                    
                    const foldersHtml = folders.map(f => \`
                        <div class="bg-gray-50 p-3 rounded">
                            <div class="flex justify-between items-start">
                                <div>
                                    <p class="font-bold">\${f.folder_number} [\${f.folder_type === 'single' ? '단폴더' : '다폴더'}]</p>
                                    <p class="text-sm text-gray-600">배팅: \${f.total_bet_amount.toLocaleString()}원 | 배당: \${f.total_odds.toFixed(2)}</p>
                                    <p class="text-sm text-green-600">예상 당첨: \${f.potential_win.toLocaleString()}원</p>
                                </div>
                                <span class="status-badge status-\${f.status}">\${getStatusText(f.status)}</span>
                            </div>
                            <div class="mt-2 space-y-1 text-xs text-gray-600">
                                \${(f.bets || []).map(b => \`
                                    <p><i class="fas fa-chevron-right mr-1"></i>\${b.match_name}: \${getBetTypeText(b.bet_type)} (\${b.odds})</p>
                                \`).join('')}
                            </div>
                        </div>
                    \`).join('')

                    document.getElementById('betting-history-list').innerHTML = foldersHtml || 
                        '<p class="text-gray-500 text-sm">배팅 내역이 없습니다.</p>'
                }

                document.getElementById('ticket-detail-modal').classList.remove('hidden')
            } catch (error) {
                console.error('티켓 상세 로드 오류:', error)
                alert('티켓 정보를 불러오는데 실패했습니다.')
            }
        }

        function closeTicketDetail() {
            currentTicketId = null
            selectedMatches = []
            document.getElementById('ticket-detail-modal').classList.add('hidden')
        }

        function getBetTypeOptions(match) {
            if (match.betting_type === 'win_draw_lose') {
                return \`
                    <label class="flex items-center">
                        <input type="radio" name="bet-type-\${match.id}" value="home_win" data-odds="\${match.home_odds}" class="mr-2">
                        홈 승 (\${match.home_odds})
                    </label>
                    \${match.draw_odds ? \`
                    <label class="flex items-center">
                        <input type="radio" name="bet-type-\${match.id}" value="draw" data-odds="\${match.draw_odds}" class="mr-2">
                        무승부 (\${match.draw_odds})
                    </label>
                    \` : ''}
                    <label class="flex items-center">
                        <input type="radio" name="bet-type-\${match.id}" value="away_win" data-odds="\${match.away_odds}" class="mr-2">
                        원정 승 (\${match.away_odds})
                    </label>
                \`
            } else if (match.betting_type === 'over_under') {
                return \`
                    <label class="flex items-center">
                        <input type="radio" name="bet-type-\${match.id}" value="over" data-odds="\${match.over_odds}" class="mr-2">
                        오버 \${match.over_under_line} (\${match.over_odds})
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="bet-type-\${match.id}" value="under" data-odds="\${match.under_odds}" class="mr-2">
                        언더 \${match.over_under_line} (\${match.under_odds})
                    </label>
                \`
            } else if (match.betting_type === 'handicap') {
                return \`
                    <label class="flex items-center">
                        <input type="radio" name="bet-type-\${match.id}" value="handicap_home" data-odds="\${match.handicap_home_odds}" class="mr-2">
                        홈 \${match.handicap_line > 0 ? '+' : ''}\${match.handicap_line} (\${match.handicap_home_odds})
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="bet-type-\${match.id}" value="handicap_away" data-odds="\${match.handicap_away_odds}" class="mr-2">
                        원정 \${match.handicap_line < 0 ? '+' : ''}\${-match.handicap_line} (\${match.handicap_away_odds})
                    </label>
                \`
            }
            return ''
        }

        function toggleMatchSelection(matchId) {
            const checkbox = document.getElementById(\`match-select-\${matchId}\`)
            const selection = document.getElementById(\`bet-selection-\${matchId}\`)
            
            checkbox.checked = !checkbox.checked
            
            if (checkbox.checked) {
                selection.classList.remove('hidden')
                if (!selectedMatches.includes(matchId)) {
                    selectedMatches.push(matchId)
                }
            } else {
                selection.classList.add('hidden')
                selectedMatches = selectedMatches.filter(id => id !== matchId)
                // 라디오 버튼 해제
                document.querySelectorAll(\`input[name="bet-type-\${matchId}"]\`).forEach(r => r.checked = false)
            }

            updateFolderType()
        }

        function updateFolderType() {
            const folderType = selectedMatches.length > 1 ? '다폴더' : '단폴더'
            document.getElementById('folder-type-display').textContent = folderType
            
            // 배당률 계산
            let totalOdds = 1.0
            selectedMatches.forEach(matchId => {
                const selected = document.querySelector(\`input[name="bet-type-\${matchId}"]:checked\`)
                if (selected) {
                    totalOdds *= parseFloat(selected.dataset.odds)
                }
            })
            document.getElementById('total-odds-display').textContent = totalOdds.toFixed(2)

            // 예상 당첨금 계산
            const betAmount = parseFloat(document.getElementById('folder-bet-amount').value) || 0
            const potentialWin = betAmount * totalOdds
            document.getElementById('potential-win-display').textContent = Math.floor(potentialWin).toLocaleString()
        }

        // 배팅 금액 입력 시 예상 당첨금 업데이트
        function updatePotentialWin() {
            updateFolderType()
        }

        // 배팅 타입 전환 함수
        function toggleBettingFields() {
            const bettingType = document.getElementById('betting-type').value
            document.getElementById('win-draw-lose-fields').classList.add('hidden')
            document.getElementById('over-under-fields').classList.add('hidden')
            document.getElementById('handicap-fields').classList.add('hidden')
            
            if (bettingType === 'win_draw_lose') {
                document.getElementById('win-draw-lose-fields').classList.remove('hidden')
            } else if (bettingType === 'over_under') {
                document.getElementById('over-under-fields').classList.remove('hidden')
            } else if (bettingType === 'handicap') {
                document.getElementById('handicap-fields').classList.remove('hidden')
            }
        }

        async function submitBetFolder() {
            if (selectedMatches.length === 0) {
                alert('최소 1개 이상의 경기를 선택해주세요.')
                return
            }

            const betAmount = parseFloat(document.getElementById('folder-bet-amount').value)
            if (!betAmount || betAmount <= 0) {
                alert('배팅 금액을 입력해주세요.')
                return
            }

            // 각 경기의 배팅 타입 확인
            const bets = []
            for (const matchId of selectedMatches) {
                const selected = document.querySelector(\`input[name="bet-type-\${matchId}"]:checked\`)
                if (!selected) {
                    alert('선택한 모든 경기의 배팅 타입을 선택해주세요.')
                    return
                }
                bets.push({
                    match_id: matchId,
                    bet_type: selected.value,
                    odds: parseFloat(selected.dataset.odds)
                })
            }

            try {
                const ticketRes = await axios.get(\`\${API_BASE}/tickets/\${currentTicketId}\`)
                const ticket = ticketRes.data.ticket

                await axios.post(\`\${API_BASE}/betting/folders\`, {
                    ticket_id: currentTicketId,
                    member_id: ticket.member_id,
                    bets: bets,
                    total_bet_amount: betAmount,
                    created_by: currentStaff.id
                })

                alert('배팅 폴더가 접수되었습니다!')
                selectedMatches = []
                await showTicketDetail(currentTicketId) // 새로고침
            } catch (error) {
                alert('배팅 접수 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 티켓 생성 모달
        async function showNewTicketModal() {
            try {
                // 회원 목록 로드
                const membersRes = await axios.get(\`\${API_BASE}/members\`)
                const members = membersRes.data.members || []
                
                const memberOptions = members.map(m => 
                    \`<option value="\${m.id}">\${m.name} (\${m.prison_name})</option>\`
                ).join('')
                document.getElementById('ticket-member').innerHTML = '<option value="">선택하세요</option>' + memberOptions

                // 직원 목록 로드
                const staffRes = await axios.get(\`\${API_BASE}/staff\`)
                const staff = staffRes.data.staff || []
                
                const staffOptions = staff.map(s => 
                    \`<option value="\${s.id}">\${s.name} (\${s.role === 'admin' ? '관리자' : '직원'})</option>\`
                ).join('')
                document.getElementById('ticket-assigned-to').innerHTML = '<option value="">미배정</option>' + staffOptions

                // 모달 열기
                document.getElementById('new-ticket-modal').classList.remove('hidden')
            } catch (error) {
                console.error('티켓 생성 모달 오류:', error)
                alert('티켓 생성 모달을 여는데 실패했습니다.')
            }
        }

        function closeNewTicketModal() {
            document.getElementById('new-ticket-modal').classList.add('hidden')
            // 폼 초기화
            document.getElementById('ticket-type').value = ''
            document.getElementById('ticket-title').value = ''
            document.getElementById('ticket-description').value = ''
            document.getElementById('ticket-member').value = ''
            document.getElementById('ticket-priority').value = 'normal'
            document.getElementById('ticket-assigned-to').value = ''
            document.getElementById('point-amount').value = ''
            toggleTicketFields()
        }

        function toggleTicketFields() {
            const ticketType = document.getElementById('ticket-type').value
            const memberField = document.getElementById('ticket-member-field')
            const pointFields = document.getElementById('point-adjustment-fields')

            // 회원 선택 필드 표시 조건
            if (['ORDER', 'POINT_ADJUSTMENT', 'MEMBER'].includes(ticketType)) {
                memberField.classList.remove('hidden')
            } else {
                memberField.classList.add('hidden')
            }

            // 포인트 조정 전용 필드
            if (ticketType === 'POINT_ADJUSTMENT') {
                pointFields.classList.remove('hidden')
            } else {
                pointFields.classList.add('hidden')
            }
        }

        async function createTicket() {
            const ticketType = document.getElementById('ticket-type').value
            const title = document.getElementById('ticket-title').value
            const description = document.getElementById('ticket-description').value
            const memberId = document.getElementById('ticket-member').value
            const priority = document.getElementById('ticket-priority').value
            const assignedTo = document.getElementById('ticket-assigned-to').value

            // 필수 항목 검증
            if (!ticketType || !title) {
                alert('티켓 유형과 제목은 필수입니다.')
                return
            }

            // 회원 필수 유형 검증
            if (['ORDER', 'POINT_ADJUSTMENT', 'MEMBER'].includes(ticketType) && !memberId) {
                alert('이 유형은 회원 선택이 필수입니다.')
                return
            }

            const data = {
                type: ticketType,
                title: title,
                description: description,
                member_id: memberId || null,
                priority: priority,
                assigned_to: assignedTo || null,
                created_by: currentStaff.id
            }

            // 포인트 조정일 경우 추가 데이터
            if (ticketType === 'POINT_ADJUSTMENT') {
                const pointType = document.getElementById('point-type').value
                const adjustmentType = document.getElementById('adjustment-type').value
                const amount = parseFloat(document.getElementById('point-amount').value)

                if (!amount || amount <= 0) {
                    alert('금액을 입력해주세요.')
                    return
                }

                data.point_type = pointType
                data.adjustment_type = adjustmentType
                data.amount = amount
            }

            try {
                await axios.post(\`\${API_BASE}/tickets\`, data)
                alert('티켓이 생성되었습니다.')
                closeNewTicketModal()
                if (currentView === 'tickets') await loadTickets()
                if (currentView === 'dashboard') await loadDashboard()
            } catch (error) {
                alert('티켓 생성 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        function showNewMemberModal() { alert('회원 등록 모달 (구현 예정)') }
        function showNewBookModal() { alert('도서 등록 모달 (구현 예정)') }
        function showNewStaffModal() { alert('직원 등록 모달 (구현 예정)') }
        function showMemberDetail(id) { alert(\`회원 상세 모달 (ID: \${id}) (구현 예정)\`) }
    </script>
</body>
</html>
  `)
})

export default app
