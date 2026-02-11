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
import closing from './routes/closing'
import mailroom from './routes/mailroom'
import notifications from './routes/notifications'
import modifications from './routes/modifications'
import ticketItems from './routes/ticket-items'

type Bindings = {
  DB: D1Database
  R2: R2Bucket
  AI: any
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
app.route('/api/closing', closing)
app.route('/api/mailroom', mailroom)
app.route('/api/notifications', notifications)
app.route('/api/modifications', modifications)
app.route('/api/ticket-items', ticketItems)

// 메인 페이지
app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>엑시트 시스템 - EXIT System</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎫</text></svg>">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
    <style>
        body { font-family: 'Noto Sans KR', sans-serif; }
        /* 데스크톱 네비게이션 강제 표시 */
        @media (min-width: 768px) {
            nav.hidden.md\:block {
                display: block !important;
            }
        }
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
                    <!-- 모바일 햄버거 메뉴 버튼 -->
                    <button onclick="toggleMobileMenu()" class="md:hidden text-gray-600 hover:text-gray-800 mr-2">
                        <i class="fas fa-bars text-2xl"></i>
                    </button>
                    
                    <i class="fas fa-door-open text-3xl text-blue-500"></i>
                    <div>
                        <h1 class="text-xl md:text-2xl font-bold text-gray-800">엑시트 시스템</h1>
                        <p class="text-xs md:text-sm text-gray-600">EXIT System</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2 md:space-x-4">
                    <span class="hidden md:inline text-gray-700">
                        <i class="fas fa-user-circle mr-2"></i>
                        <span id="current-user-name"></span>
                        <span id="current-user-role" class="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"></span>
                    </span>
                    <!-- 모바일: 사용자 이름만 표시 -->
                    <span class="md:hidden text-sm text-gray-700">
                        <i class="fas fa-user-circle mr-1"></i>
                        <span id="current-user-name-mobile"></span>
                    </span>
                    <button onclick="logout()" class="text-gray-600 hover:text-gray-800">
                        <i class="fas fa-sign-out-alt"></i> 
                        <span class="hidden md:inline">로그아웃</span>
                    </button>
                </div>
            </div>
        </header>

        <!-- 모바일 메뉴 오버레이 -->
        <div id="mobile-menu-overlay" class="hidden fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onclick="toggleMobileMenu()"></div>
        
        <!-- 모바일 사이드 메뉴 -->
        <div id="mobile-menu" class="fixed top-0 left-0 h-full w-64 bg-white shadow-lg transform -translate-x-full transition-transform duration-300 z-50 md:hidden">
            <div class="p-4 border-b">
                <div class="flex justify-between items-center">
                    <div>
                        <p class="font-bold text-gray-800" id="mobile-menu-user-name"></p>
                        <p class="text-sm" id="mobile-menu-user-role"></p>
                    </div>
                    <button onclick="toggleMobileMenu()" class="text-gray-600 hover:text-gray-800">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
            </div>
            <nav class="p-4 space-y-2">
                <button onclick="showView('dashboard'); toggleMobileMenu()" class="mobile-nav-item w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50">
                    <i class="fas fa-home mr-3 w-5"></i>대시보드
                </button>
                <button onclick="showView('tickets'); toggleMobileMenu()" class="mobile-nav-item w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50">
                    <i class="fas fa-ticket-alt mr-3 w-5"></i>티켓 관리
                </button>
                <button onclick="showView('members'); toggleMobileMenu()" class="mobile-nav-item w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50">
                    <i class="fas fa-users mr-3 w-5"></i>회원 관리
                </button>
                <button onclick="showView('books'); toggleMobileMenu()" class="mobile-nav-item w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50">
                    <i class="fas fa-book mr-3 w-5"></i>도서 관리
                </button>
                <button onclick="showView('mailroom'); toggleMobileMenu()" class="mobile-nav-item w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50">
                    <i class="fas fa-envelope-open-text mr-3 w-5"></i>우편실
                </button>
                <button id="betting-nav-mobile" onclick="showView('betting'); toggleMobileMenu()" class="mobile-nav-item w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50 hidden">
                    <i class="fas fa-trophy mr-3 w-5"></i>배팅 관리
                </button>
                <button id="staff-nav-mobile" onclick="showView('staff'); toggleMobileMenu()" class="mobile-nav-item w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50 hidden">
                    <i class="fas fa-user-tie mr-3 w-5"></i>직원 관리
                </button>
                <button id="closing-nav-mobile" onclick="showView('closing'); toggleMobileMenu()" class="mobile-nav-item w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50 hidden">
                    <i class="fas fa-calculator mr-3 w-5"></i>일일 마감
                </button>
                <button id="modifications-nav-mobile" onclick="showView('modifications'); toggleMobileMenu()" class="mobile-nav-item w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50 hidden">
                    <i class="fas fa-check-circle mr-3 w-5"></i>수정 승인
                </button>
            </nav>
        </div>

        <!-- 네비게이션 (데스크톱 항상 표시, 모바일은 햄버거 메뉴만) -->
        <nav class="block bg-white shadow-sm border-t border-gray-200">
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
                    <button onclick="showView('mailroom')" class="nav-item px-4 py-3 rounded-t-lg">
                        <i class="fas fa-envelope-open-text mr-2"></i>우편실
                    </button>
                    <button id="betting-nav" onclick="showView('betting')" class="nav-item px-4 py-3 rounded-t-lg hidden">
                        <i class="fas fa-trophy mr-2"></i>배팅 관리
                    </button>
                    <button id="staff-nav" onclick="showView('staff')" class="nav-item px-4 py-3 rounded-t-lg hidden">
                        <i class="fas fa-user-tie mr-2"></i>직원 관리
                    </button>
                    <button id="closing-nav" onclick="showView('closing')" class="nav-item px-4 py-3 rounded-t-lg hidden">
                        <i class="fas fa-calculator mr-2"></i>일일 마감
                    </button>
                    <button id="modifications-nav" onclick="showView('modifications')" class="nav-item px-4 py-3 rounded-t-lg hidden">
                        <i class="fas fa-check-circle mr-2"></i>수정 승인
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

                <!-- 통계 차트 -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <!-- 티켓 상태 별 통계 (도넛 차트) -->
                    <div class="card">
                        <h3 class="text-lg font-bold mb-4">
                            <i class="fas fa-chart-pie mr-2"></i>티켓 상태 별 현황
                        </h3>
                        <div class="h-64">
                            <canvas id="ticketStatusChart"></canvas>
                        </div>
                    </div>

                    <!-- 우편물 처리 현황 (도넛 차트) -->
                    <div class="card">
                        <h3 class="text-lg font-bold mb-4">
                            <i class="fas fa-envelope mr-2"></i>우편물 처리 현황
                        </h3>
                        <div class="h-64">
                            <canvas id="mailroomStatusChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- 월별 추이 차트 -->
                <div class="grid grid-cols-1 gap-6 mb-6">
                    <!-- 월별 티켓 추이 (라인 차트) -->
                    <div class="card">
                        <h3 class="text-lg font-bold mb-4">
                            <i class="fas fa-chart-line mr-2"></i>월별 티켓 처리 추이 (최근 6개월)
                        </h3>
                        <div class="h-64">
                            <canvas id="ticketTrendChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- 배팅 및 포인트 현황 -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <!-- 배팅 현황 (바 차트) -->
                    <div class="card">
                        <h3 class="text-lg font-bold mb-4">
                            <i class="fas fa-trophy mr-2"></i>배팅 폴더 현황
                        </h3>
                        <div class="h-64">
                            <canvas id="bettingStatusChart"></canvas>
                        </div>
                    </div>

                    <!-- 포인트 거래 현황 (바 차트) -->
                    <div class="card">
                        <h3 class="text-lg font-bold mb-4">
                            <i class="fas fa-coins mr-2"></i>일주일 포인트 거래
                        </h3>
                        <div class="h-64">
                            <canvas id="pointTransactionChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 티켓 관리 뷰 -->
            <div id="tickets-view" class="view-content hidden">
                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
                    <h2 class="text-xl md:text-2xl font-bold"><i class="fas fa-ticket-alt mr-2"></i>티켓 관리</h2>
                    <button id="create-ticket-btn" onclick="showNewTicketModal()" class="btn btn-primary w-full sm:w-auto" data-permission="staff">
                        <i class="fas fa-plus mr-2"></i>새 티켓 생성
                    </button>
                </div>

                <div class="card mb-6">
                    <div class="flex flex-col sm:flex-row gap-4">
                        <div class="flex-1">
                            <label class="block text-sm font-medium mb-2">상태</label>
                            <select id="ticket-status-filter" onchange="loadTickets()" class="w-full px-4 py-2 border rounded-lg">
                                <option value="all">전체 상태</option>
                                <option value="open">미배정</option>
                                <option value="assigned">배정됨</option>
                                <option value="in_progress">처리중</option>
                                <option value="completed">완료</option>
                                <option value="closed">종료</option>
                            </select>
                        </div>
                        <div class="flex-1">
                            <label class="block text-sm font-medium mb-2">유형</label>
                            <select id="ticket-type-filter" onchange="loadTickets()" class="w-full px-4 py-2 border rounded-lg">
                                <option value="all">전체 유형</option>
                                <option value="ORDER">주문</option>
                                <option value="INQUIRY">문의</option>
                                <option value="PURCHASE_ORDER">발주</option>
                                <option value="POINT_ADJUSTMENT">포인트 조정</option>
                                <option value="MEMBER">회원 관리</option>

                            </select>
                        </div>
                    </div>
                </div>

                <div id="tickets-list" class="space-y-4"></div>
                <div id="tickets-pagination"></div>
            </div>

            <!-- 회원 관리 뷰 -->
            <div id="members-view" class="view-content hidden">
                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
                    <h2 class="text-xl md:text-2xl font-bold"><i class="fas fa-users mr-2"></i>회원 관리</h2>
                    <div class="flex gap-2 w-full sm:w-auto">
                        <!-- 목록 형태 토글 -->
                        <div class="flex gap-1 bg-gray-100 rounded-lg p-1">
                            <button id="view-card-btn" onclick="setMemberViewType('card')" 
                                    class="px-3 py-1.5 rounded bg-white text-gray-700 transition text-sm">
                                <i class="fas fa-th mr-1"></i>카드
                            </button>
                            <button id="view-list-btn" onclick="setMemberViewType('list')" 
                                    class="px-3 py-1.5 rounded text-gray-600 hover:text-gray-800 transition text-sm">
                                <i class="fas fa-list mr-1"></i>목록
                            </button>
                        </div>
                        <button id="create-member-btn" onclick="showNewMemberModal()" class="btn btn-primary flex-1 sm:flex-none" data-permission="staff">
                            <i class="fas fa-user-plus mr-2"></i>회원 등록
                        </button>
                    </div>
                </div>

                <div class="card mb-6">
                    <div class="flex gap-2">
                        <input type="text" id="member-search" placeholder="이름, 수감번호, 교도소 검색..."
                               class="flex-1 px-3 md:px-4 py-2 border rounded-lg text-sm md:text-base">
                        <button onclick="loadMembers()" class="btn btn-primary px-3 md:px-4">
                            <i class="fas fa-search"></i>
                            <span class="hidden sm:inline ml-2">검색</span>
                        </button>
                    </div>
                </div>

                <div id="members-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
                <div id="members-pagination"></div>
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
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold"><i class="fas fa-trophy mr-2"></i>배팅 관리</h2>
                    
                    <!-- 탭 네비게이션 -->
                    <div class="flex space-x-2">
                        <button onclick="showBettingTab('management')" id="betting-tab-management" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                            <i class="fas fa-wallet mr-1"></i>배팅 목록
                        </button>
                        <button onclick="showBettingTab('statistics')" id="betting-tab-statistics" class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                            <i class="fas fa-chart-line mr-1"></i>통계
                        </button>
                    </div>
                </div>

                <!-- 배팅 목록 탭 -->
                <div id="betting-management-tab" class="betting-tab-content">
                    <!-- 경기 일정 (상단) -->
                    <div class="card mb-6">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-bold"><i class="fas fa-calendar mr-2"></i>경기 일정</h3>
                            <button onclick="showMatchManagementModal()" class="btn btn-primary btn-sm">
                                <i class="fas fa-cog mr-2"></i>경기 관리
                            </button>
                        </div>
                        <p class="text-sm text-gray-600 mb-4">경기 종료 후 하루까지 표시됩니다</p>
                        <div id="match-schedule-list" class="space-y-2 max-h-96 overflow-y-auto"></div>
                    </div>

                    <!-- 고객 베팅 목록 (하단) -->
                    <div class="card">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-bold"><i class="fas fa-wallet mr-2"></i>고객 베팅 목록</h3>
                        </div>
                        
                        <!-- 기간 필터 -->
                        <div class="mb-4 flex items-center gap-2 flex-wrap">
                            <button onclick="setBettingPeriod('1day')" class="btn btn-sm" id="period-1day">최근 1일</button>
                            <button onclick="setBettingPeriod('7days')" class="btn btn-sm" id="period-7days">최근 7일</button>
                            <button onclick="setBettingPeriod('30days')" class="btn btn-sm" id="period-30days">최근 30일</button>
                            <button onclick="showCustomDateModal()" class="btn btn-sm">특정 날짜</button>
                            <button onclick="loadAllBettings()" class="btn btn-sm btn-success">전체 조회</button>
                            <span class="text-sm text-gray-600 ml-auto" id="betting-period-label"></span>
                        </div>
                        
                        <div id="betting-folders-list" class="space-y-2 max-h-96 overflow-y-auto"></div>
                    </div>
                </div>

                <!-- 통계 탭 -->
                <div id="betting-statistics-tab" class="betting-tab-content hidden">
                    <!-- 기간 선택 -->
                    <div class="card mb-6">
                        <div class="flex items-center gap-4">
                            <div>
                                <label class="block text-sm font-medium mb-1">시작일</label>
                                <input type="date" id="stats-start-date" class="px-3 py-2 border rounded">
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">종료일</label>
                                <input type="date" id="stats-end-date" class="px-3 py-2 border rounded">
                            </div>
                            <div class="self-end">
                                <button onclick="loadBettingStatistics()" class="btn btn-primary">
                                    <i class="fas fa-search mr-2"></i>조회
                                </button>
                            </div>
                            <div class="self-end ml-auto space-x-2">
                                <button onclick="setStatsDateRange('today')" class="btn btn-sm">오늘</button>
                                <button onclick="setStatsDateRange('week')" class="btn btn-sm">1주일</button>
                                <button onclick="setStatsDateRange('month')" class="btn btn-sm">1개월</button>
                            </div>
                        </div>
                    </div>

                    <!-- 전체 통계 요약 -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div class="card bg-blue-50">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm text-gray-600">총 배팅 금액</p>
                                    <p class="text-2xl font-bold text-blue-600" id="total-bet-amount">0원</p>
                                </div>
                                <i class="fas fa-coins text-3xl text-blue-400"></i>
                            </div>
                        </div>
                        
                        <div class="card bg-green-50">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm text-gray-600">총 당첨 금액</p>
                                    <p class="text-2xl font-bold text-green-600" id="total-win-amount">0원</p>
                                </div>
                                <i class="fas fa-trophy text-3xl text-green-400"></i>
                            </div>
                        </div>
                        
                        <div class="card bg-purple-50">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm text-gray-600">순수익 (마진)</p>
                                    <p class="text-2xl font-bold text-purple-600" id="net-profit">0원</p>
                                </div>
                                <i class="fas fa-chart-line text-3xl text-purple-400"></i>
                            </div>
                        </div>
                        
                        <div class="card bg-orange-50">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm text-gray-600">총 배팅 건수</p>
                                    <p class="text-2xl font-bold text-orange-600" id="total-bet-count">0건</p>
                                </div>
                                <i class="fas fa-folder text-3xl text-orange-400"></i>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <!-- 회원별 통계 -->
                        <div class="card">
                            <h3 class="text-lg font-bold mb-4"><i class="fas fa-users mr-2"></i>회원별 통계 (상위 10명)</h3>
                            <div class="overflow-x-auto">
                                <table class="min-w-full">
                                    <thead class="bg-gray-50">
                                        <tr>
                                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">회원명</th>
                                            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500">배팅 건수</th>
                                            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500">배팅 금액</th>
                                            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500">당첨률</th>
                                        </tr>
                                    </thead>
                                    <tbody id="member-stats-table">
                                        <tr><td colspan="4" class="text-center py-4 text-gray-500">데이터 없음</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- 경기별 통계 -->
                        <div class="card">
                            <h3 class="text-lg font-bold mb-4"><i class="fas fa-futbol mr-2"></i>경기별 통계 (상위 10개)</h3>
                            <div class="overflow-x-auto">
                                <table class="min-w-full">
                                    <thead class="bg-gray-50">
                                        <tr>
                                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">경기명</th>
                                            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500">배팅 건수</th>
                                            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500">배팅 금액</th>
                                        </tr>
                                    </thead>
                                    <tbody id="match-stats-table">
                                        <tr><td colspan="3" class="text-center py-4 text-gray-500">데이터 없음</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- 일별 추이 -->
                        <div class="card lg:col-span-2">
                            <h3 class="text-lg font-bold mb-4"><i class="fas fa-calendar-alt mr-2"></i>일별 배팅 추이</h3>
                            <div id="daily-trend-list" class="space-y-2 max-h-96 overflow-y-auto">
                                <p class="text-gray-500 text-center py-4">데이터 없음</p>
                            </div>
                        </div>
                    </div>
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

                <!-- 역할별 필터 -->
                <div class="card mb-6">
                    <div class="flex gap-2">
                        <button onclick="filterStaffByRole('all')" class="btn btn-secondary" id="filter-all">
                            전체
                        </button>
                        <button onclick="filterStaffByRole('admin')" class="btn btn-secondary" id="filter-admin">
                            <i class="fas fa-crown mr-1 text-yellow-500"></i>관리자
                        </button>
                        <button onclick="filterStaffByRole('staff')" class="btn btn-secondary" id="filter-staff">
                            <i class="fas fa-user mr-1 text-blue-500"></i>직원
                        </button>
                        <button onclick="filterStaffByRole('viewer')" class="btn btn-secondary" id="filter-viewer">
                            <i class="fas fa-eye mr-1 text-gray-500"></i>뷰어
                        </button>
                    </div>
                </div>

                <!-- 직원 목록 -->
                <div id="staff-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
            </div>

            <!-- 일일 마감 뷰 (관리자 전용) -->
            <div id="closing-view" class="view-content hidden">
                <h2 class="text-2xl font-bold mb-6"><i class="fas fa-calculator mr-2"></i>일일 마감</h2>

                <!-- 날짜 선택 -->
                <div class="card mb-6">
                    <div class="flex items-center gap-4">
                        <div>
                            <label class="block text-sm font-medium mb-1">마감 날짜</label>
                            <input type="date" id="closing-date" class="px-3 py-2 border rounded">
                        </div>
                        <div class="self-end">
                            <button onclick="loadClosingData()" class="btn btn-primary">
                                <i class="fas fa-search mr-2"></i>조회
                            </button>
                        </div>
                        <div class="self-end ml-auto flex gap-2">
                            <button onclick="printClosingReport()" class="btn btn-secondary">
                                <i class="fas fa-print mr-2"></i>인쇄
                            </button>
                            <button id="execute-closing-btn" onclick="executeClosing()" class="btn btn-success">
                                <i class="fas fa-check-circle mr-2"></i>마감 실행
                            </button>
                        </div>
                    </div>
                    
                    <!-- 마감 상태 표시 -->
                    <div id="closing-status" class="mt-4"></div>
                </div>

                <!-- 마감 통계 -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <!-- 티켓 통계 -->
                    <div class="card bg-blue-50">
                        <h3 class="font-bold mb-3 text-blue-800"><i class="fas fa-ticket-alt mr-2"></i>티켓 처리</h3>
                        <div class="space-y-2">
                            <div class="flex justify-between">
                                <span class="text-gray-600">총 티켓 수</span>
                                <span class="font-bold" id="closing-total-tickets">0건</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">처리 완료</span>
                                <span class="font-bold text-green-600" id="closing-completed-tickets">0건</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">미처리</span>
                                <span class="font-bold text-red-600" id="closing-pending-tickets">0건</span>
                            </div>
                        </div>
                    </div>

                    <!-- 포인트 통계 -->
                    <div class="card bg-green-50">
                        <h3 class="font-bold mb-3 text-green-800"><i class="fas fa-coins mr-2"></i>포인트 거래</h3>
                        <div class="space-y-2">
                            <div class="flex justify-between">
                                <span class="text-gray-600">적립</span>
                                <span class="font-bold text-green-600" id="closing-earned-points">0원</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">사용</span>
                                <span class="font-bold text-red-600" id="closing-used-points">0원</span>
                            </div>
                            <div class="flex justify-between border-t pt-2">
                                <span class="text-gray-600 font-bold">순 입금</span>
                                <span class="font-bold text-blue-600" id="closing-net-points">0원</span>
                            </div>
                        </div>
                    </div>

                    <!-- 배팅 통계 -->
                    <div class="card bg-purple-50">
                        <h3 class="font-bold mb-3 text-purple-800"><i class="fas fa-trophy mr-2"></i>배팅 수익</h3>
                        <div class="space-y-2">
                            <div class="flex justify-between">
                                <span class="text-gray-600">총 배팅액</span>
                                <span class="font-bold" id="closing-bet-amount">0원</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">당첨금</span>
                                <span class="font-bold text-red-600" id="closing-win-amount">0원</span>
                            </div>
                            <div class="flex justify-between border-t pt-2">
                                <span class="text-gray-600 font-bold">배팅 마진</span>
                                <span class="font-bold text-purple-600" id="closing-bet-margin">0원</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 도서 판매 통계 -->
                <div class="card mb-6">
                    <h3 class="font-bold mb-4"><i class="fas fa-book mr-2"></i>도서 판매</h3>
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div class="bg-gray-50 p-4 rounded">
                            <p class="text-sm text-gray-600">주문 건수</p>
                            <p class="text-2xl font-bold text-blue-600" id="closing-book-orders">0건</p>
                        </div>
                        <div class="bg-gray-50 p-4 rounded">
                            <p class="text-sm text-gray-600">판매 금액</p>
                            <p class="text-2xl font-bold text-green-600" id="closing-book-sales">0원</p>
                        </div>
                        <div class="bg-gray-50 p-4 rounded">
                            <p class="text-sm text-gray-600">발송 완료</p>
                            <p class="text-2xl font-bold text-purple-600" id="closing-book-shipped">0건</p>
                        </div>
                        <div class="bg-gray-50 p-4 rounded">
                            <p class="text-sm text-gray-600">처리 대기</p>
                            <p class="text-2xl font-bold text-orange-600" id="closing-book-pending">0건</p>
                        </div>
                    </div>
                </div>

                <!-- 총 마감 요약 -->
                <div class="card bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                    <h3 class="font-bold mb-4 text-xl"><i class="fas fa-chart-line mr-2"></i>일일 종합 요약</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <p class="text-blue-100 mb-1">총 매출</p>
                            <p class="text-3xl font-bold" id="closing-total-revenue">0원</p>
                        </div>
                        <div>
                            <p class="text-blue-100 mb-1">총 마진</p>
                            <p class="text-3xl font-bold" id="closing-total-margin">0원</p>
                        </div>
                        <div>
                            <p class="text-blue-100 mb-1">마감 일시</p>
                            <p class="text-xl font-bold" id="closing-timestamp">-</p>
                        </div>
                    </div>
                </div>

                <!-- 마감 이력 -->
                <div class="card mt-6">
                    <h3 class="font-bold mb-4"><i class="fas fa-history mr-2"></i>최근 마감 이력</h3>
                    <div id="closing-history-list" class="space-y-2 max-h-96 overflow-y-auto">
                        <p class="text-gray-500 text-center py-4">마감 이력이 없습니다.</p>
                    </div>
                </div>
            </div>
        </main>

        <!-- 모달들 -->
        
        <!-- 경기 등록 모달 -->
        <div id="new-match-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] mx-4 overflow-y-auto">
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

        <!-- 우편실 뷰 -->
        <div id="mailroom-view" class="view-content hidden">
            <div class="mb-6">
                <h2 class="text-2xl font-bold"><i class="fas fa-envelope-open-text mr-2"></i>우편실 관리</h2>
                <p class="text-gray-600 mt-2">우편 수령 → OCR 처리 → 검수 및 배당 → 티켓 생성</p>
            </div>

            <!-- 탭 네비게이션 -->
            <div class="flex space-x-2 mb-6">
                <button onclick="showMailroomTab('receive')" id="mailroom-tab-receive" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    <i class="fas fa-inbox mr-1"></i>우편 수령
                </button>
                <button onclick="showMailroomTab('inspection')" id="mailroom-tab-inspection" class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                    <i class="fas fa-search mr-1"></i>검수 및 배당
                </button>
                <button onclick="showMailroomTab('history')" id="mailroom-tab-history" class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                    <i class="fas fa-history mr-1"></i>처리 내역
                </button>
            </div>

            <!-- 우편 수령 탭 -->
            <div id="mailroom-receive-tab" class="mailroom-tab-content">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- 이미지 업로드 -->
                    <div class="card">
                        <h3 class="text-lg font-bold mb-4"><i class="fas fa-cloud-upload-alt mr-2"></i>우편물 사진 업로드</h3>
                        <div class="space-y-4">
                            <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                                <input type="file" id="mail-images" accept="image/*" multiple class="hidden" onchange="handleMailImages(event)">
                                <label for="mail-images" class="cursor-pointer">
                                    <i class="fas fa-camera text-5xl text-blue-400 mb-4"></i>
                                    <p class="text-gray-800 font-medium text-lg">클릭하여 사진 선택</p>
                                    <p class="text-sm text-gray-500 mt-2">여러 장 선택 가능 (PNG, JPG, JPEG)</p>
                                </label>
                            </div>
                            
                            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div class="flex items-start gap-2">
                                    <i class="fas fa-info-circle text-blue-500 mt-1"></i>
                                    <div class="text-sm text-blue-800">
                                        <p class="font-medium mb-1">자동 처리 흐름</p>
                                        <ol class="list-decimal list-inside space-y-1 text-blue-700">
                                            <li>이미지 선택 시 자동으로 우편물 등록</li>
                                            <li>우측 대기 목록에 임시 티켓 생성</li>
                                            <li>OCR 자동 시작 (5초마다 상태 확인)</li>
                                            <li>완료 후 "검수하기" 버튼 표시</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 업로드된 우편물 목록 -->
                    <div class="card">
                        <h3 class="text-lg font-bold mb-4"><i class="fas fa-list mr-2"></i>대기 중인 우편물</h3>
                        <div id="pending-mail-list" class="space-y-2 max-h-96 overflow-y-auto">
                            <p class="text-gray-500 text-center py-8">업로드된 우편물이 없습니다.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 검수 및 배당 탭 -->
            <div id="mailroom-inspection-tab" class="mailroom-tab-content hidden">
                <div class="card">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold"><i class="fas fa-search mr-2"></i>임시 티켓 검수</h3>
                        <div class="text-sm text-gray-600">
                            <i class="fas fa-info-circle mr-1"></i>
                            체크박스로 선택 후 합치기/분리 가능
                        </div>
                    </div>
                    
                    <div class="mb-4 flex gap-2">
                        <button onclick="mergeTempTickets()" class="btn btn-sm btn-primary" id="merge-tickets-btn" disabled>
                            <i class="fas fa-compress mr-1"></i>선택 항목 합치기
                        </button>
                        <button onclick="confirmAllTempTickets()" class="btn btn-sm btn-success">
                            <i class="fas fa-check-double mr-1"></i>전체 확정
                        </button>
                    </div>
                    
                    <div id="processed-mail-list" class="space-y-4">
                        <p class="text-gray-500 text-center py-8">처리 완료된 우편물이 없습니다.</p>
                    </div>
                </div>
            </div>

            <!-- 처리 내역 탭 -->
            <div id="mailroom-history-tab" class="mailroom-tab-content hidden">
                <div class="card">
                    <h3 class="text-lg font-bold mb-4"><i class="fas fa-history mr-2"></i>우편물 처리 내역</h3>
                    <div id="mail-history-list" class="space-y-2">
                        <p class="text-gray-500 text-center py-8">처리 내역이 없습니다.</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- 대량 우편물 등록 모달 -->
        <div id="bulk-register-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold"><i class="fas fa-users mr-2"></i>대량 우편물 등록</h3>
                        <button onclick="closeBulkRegisterModal()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="mb-4 p-3 bg-blue-50 rounded">
                        <p class="text-sm text-blue-700">
                            <i class="fas fa-info-circle mr-1"></i>
                            각 이미지마다 회원을 선택하면 자동으로 우편물과 티켓이 생성됩니다.
                        </p>
                    </div>
                    
                    <div id="bulk-register-items" class="space-y-4"></div>
                    
                    <div class="mt-6 flex justify-end space-x-2">
                        <button onclick="closeBulkRegisterModal()" class="btn btn-secondary">취소</button>
                        <button onclick="submitBulkRegister()" class="btn btn-success">
                            <i class="fas fa-check mr-2"></i>등록 완료
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 검수 상세 모달 -->
        <div id="inspection-detail-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
                <div class="p-6 border-b flex justify-between items-center">
                    <h3 class="text-xl font-bold"><i class="fas fa-search mr-2"></i>우편물 검수</h3>
                    <button onclick="closeInspectionDetail()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                
                <div class="flex-1 overflow-hidden flex">
                    <!-- 좌측: 이미지 -->
                    <div class="w-1/2 border-r p-6 overflow-y-auto">
                        <div id="inspection-images" class="space-y-4"></div>
                    </div>
                    
                    <!-- 우측: OCR 결과 및 편집 -->
                    <div class="w-1/2 p-6 overflow-y-auto">
                        <div class="space-y-4">
                            <!-- 회원 매칭 상태 -->
                            <div id="member-match-status"></div>
                            
                            <div class="relative">
                                <label class="block text-sm font-medium mb-2">
                                    발신자 이름 (회원명)
                                    <span class="text-xs text-gray-500 ml-1">(입력 시 자동완성)</span>
                                </label>
                                <input 
                                    type="text" 
                                    id="inspection-name" 
                                    class="w-full px-3 py-2 border rounded"
                                    oninput="handleMemberNameInput(event)"
                                    autocomplete="off"
                                >
                                <div id="member-search-dropdown" class="hidden absolute z-10 w-full bg-white border border-gray-300 rounded-b shadow-lg max-h-60 overflow-y-auto"></div>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">수용번호</label>
                                <input type="text" id="inspection-number" class="w-full px-3 py-2 border rounded" placeholder="예: 1234">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">수용기관</label>
                                <input type="text" id="inspection-institution" class="w-full px-3 py-2 border rounded" placeholder="예: 서울">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">사서함 주소</label>
                                <input type="text" id="inspection-address" class="w-full px-3 py-2 border rounded" placeholder="예: 서울 사서함 123-1234">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">
                                    편지 내용
                                    <span class="text-xs text-gray-500 ml-1">(AI 추출)</span>
                                </label>
                                <textarea id="inspection-letter-content" class="w-full px-3 py-2 border rounded h-32" readonly></textarea>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">
                                    OCR 원문 (편집 가능)
                                    <span class="text-xs text-gray-500 ml-1">(오타 수정 가능)</span>
                                </label>
                                <textarea id="inspection-ocr-text" class="w-full px-3 py-2 border rounded h-32"></textarea>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium mb-2">비고</label>
                                <textarea id="inspection-notes" class="w-full px-3 py-2 border rounded h-24"></textarea>
                            </div>
                            
                            <div class="border-t pt-4 mt-4">
                                <label class="block text-sm font-medium mb-2 text-blue-700">
                                    <i class="fas fa-user-tie mr-1"></i>담당자 선택 (필수)
                                </label>
                                <select id="inspection-staff" class="w-full px-3 py-2 border rounded bg-white">
                                    <option value="">-- 담당자를 선택하세요 --</option>
                                </select>
                            </div>
                            
                            <div class="flex gap-2 mt-4">
                                <button onclick="saveInspectionEdit()" class="btn btn-secondary flex-1">
                                    <i class="fas fa-save mr-2"></i>임시 저장
                                </button>
                                <button onclick="assignStaffAndConfirmTicket()" class="btn btn-success flex-1">
                                    <i class="fas fa-user-check mr-2"></i>담당자 배정
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 회원 변경 모달 -->
        <div id="change-member-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
                <div class="p-6 border-b">
                    <h3 class="text-xl font-bold"><i class="fas fa-user-edit mr-2"></i>회원 변경</h3>
                    <p class="text-sm text-gray-600 mt-1">기존 회원을 검색하거나 신규 회원을 등록하세요</p>
                </div>
                
                <div class="flex-1 overflow-y-auto p-6 space-y-4">
                    <!-- 회원 검색 -->
                    <div class="relative">
                        <label class="block text-sm font-medium mb-2">회원 검색</label>
                        <input 
                            type="text" 
                            id="change-member-search" 
                            class="w-full px-3 py-2 border rounded"
                            placeholder="이름 또는 수용번호로 검색..."
                            oninput="searchMembersForChange(event)"
                            autocomplete="off"
                        >
                        <div id="change-member-dropdown" class="hidden absolute z-[110] w-full bg-white border border-gray-300 rounded-b shadow-lg max-h-60 overflow-y-auto mt-1"></div>
                    </div>
                    
                    <!-- 신규 회원 등록 버튼 -->
                    <div class="pt-4 border-t">
                        <button onclick="openNewMemberRegistration()" class="btn btn-success w-full">
                            <i class="fas fa-user-plus mr-2"></i>신규 회원 등록
                        </button>
                    </div>
                </div>
                
                <div class="p-6 border-t flex gap-2">
                    <button onclick="closeChangeMemberModal()" class="btn btn-secondary flex-1">
                        취소
                    </button>
                </div>
            </div>
        </div>

        <!-- 회원 정보 수정 모달 -->
        <div id="edit-member-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
                <div class="p-6 border-b">
                    <h3 class="text-xl font-bold"><i class="fas fa-user-edit mr-2"></i>회원 정보 수정</h3>
                    <p class="text-sm text-gray-600 mt-1">회원 정보를 수정하고 승인을 요청하세요</p>
                </div>
                
                <div class="flex-1 overflow-y-auto p-6 space-y-4">
                    <!-- 현재 정보 표시 -->
                    <div class="bg-gray-50 p-4 rounded">
                        <h4 class="font-semibold mb-2 text-sm text-gray-700">현재 정보</h4>
                        <div id="edit-member-current-info" class="space-y-1 text-sm text-gray-600">
                            <!-- JavaScript로 채워짐 -->
                        </div>
                    </div>
                    
                    <!-- 이름 (읽기 전용) -->
                    <div>
                        <label class="block text-sm font-medium mb-1">회원 이름</label>
                        <input 
                            type="text" 
                            id="edit-member-name" 
                            class="w-full px-3 py-2 border rounded bg-gray-100"
                            readonly
                        >
                        <p class="text-xs text-gray-500 mt-1">이름은 변경할 수 없습니다</p>
                    </div>
                    
                    <!-- 수용번호 -->
                    <div>
                        <label class="block text-sm font-medium mb-1">수용번호</label>
                        <input 
                            type="text" 
                            id="edit-member-number" 
                            class="w-full px-3 py-2 border rounded"
                            placeholder="예: 1234"
                        >
                    </div>
                    
                    <!-- 수용기관 -->
                    <div>
                        <label class="block text-sm font-medium mb-1">수용기관</label>
                        <input 
                            type="text" 
                            id="edit-member-institution" 
                            class="w-full px-3 py-2 border rounded"
                            placeholder="예: 서울, 안양, 의정부"
                        >
                    </div>
                    
                    <!-- 사서함 주소 -->
                    <div>
                        <label class="block text-sm font-medium mb-1">사서함 주소</label>
                        <input 
                            type="text" 
                            id="edit-member-mailbox" 
                            class="w-full px-3 py-2 border rounded"
                            placeholder="예: 서울 사서함 123"
                        >
                    </div>
                    
                    <!-- 입금자명 -->
                    <div>
                        <label class="block text-sm font-medium mb-1">입금자명</label>
                        <input 
                            type="text" 
                            id="edit-member-depositor" 
                            class="w-full px-3 py-2 border rounded"
                            placeholder="예: 김영희"
                        >
                    </div>
                    
                    <!-- 수정 사유 -->
                    <div>
                        <label class="block text-sm font-medium mb-1">수정 사유 (선택)</label>
                        <textarea 
                            id="edit-member-reason" 
                            class="w-full px-3 py-2 border rounded"
                            rows="3"
                            placeholder="수정 사유를 입력하세요..."
                        ></textarea>
                    </div>
                    
                    <div class="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <p class="text-sm text-yellow-800">
                            <i class="fas fa-info-circle mr-1"></i>
                            이 수정은 관리자 승인이 필요합니다.
                        </p>
                    </div>
                </div>
                
                <div class="p-6 border-t flex gap-2">
                    <button onclick="closeEditMemberModal()" class="btn btn-secondary flex-1">
                        취소
                    </button>
                    <button onclick="submitMemberEdit()" class="btn btn-primary flex-1">
                        <i class="fas fa-check mr-2"></i>수정 요청
                    </button>
                </div>
            </div>
        </div>

        <!-- 경기 결과 입력 모달 -->
        <div id="bulk-register-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold"><i class="fas fa-users mr-2"></i>대량 우편물 등록</h3>
                        <button onclick="closeBulkRegisterModal()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="mb-4 p-3 bg-blue-50 rounded">
                        <p class="text-sm text-blue-700">
                            <i class="fas fa-info-circle mr-1"></i>
                            각 이미지마다 회원을 선택하면 자동으로 우편물과 티켓이 생성됩니다.
                        </p>
                    </div>
                    
                    <div id="bulk-register-items" class="space-y-4"></div>
                    
                    <div class="mt-6 flex justify-end space-x-2">
                        <button onclick="closeBulkRegisterModal()" class="btn btn-secondary">취소</button>
                        <button onclick="submitBulkRegister()" class="btn btn-success">
                            <i class="fas fa-check mr-2"></i>등록 완료
                        </button>
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

        <!-- 경기 관리 모달 -->
        <div id="match-management-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold"><i class="fas fa-cog mr-2"></i>경기 관리</h3>
                        <button onclick="closeMatchManagementModal()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <!-- 경기 목록 -->
                        <div class="card">
                            <div class="flex justify-between items-center mb-4">
                                <h4 class="font-bold">등록된 경기 일정</h4>
                                <button onclick="addMatchRow()" class="btn btn-success btn-sm">
                                    <i class="fas fa-plus mr-2"></i>경기 추가
                                </button>
                            </div>
                            <div id="match-management-list" class="space-y-3"></div>
                        </div>
                        
                        <div class="flex justify-end space-x-2">
                            <button onclick="closeMatchManagementModal()" class="btn btn-secondary">취소</button>
                            <button onclick="saveAllMatches()" class="btn btn-primary">
                                <i class="fas fa-save mr-2"></i>모두 저장
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 이미지 뷰어 모달 -->
        <div id="image-viewer-modal" class="hidden fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
            <div class="relative w-full h-full flex items-center justify-center">
                <button onclick="closeImageViewer()" class="absolute top-4 right-4 text-white text-2xl hover:text-gray-300">
                    <i class="fas fa-times"></i>
                </button>
                
                <!-- 이미지 컨트롤 -->
                <div class="absolute top-4 left-4 flex gap-2">
                    <button onclick="zoomIn()" class="bg-white text-gray-800 px-3 py-2 rounded hover:bg-gray-100">
                        <i class="fas fa-search-plus"></i>
                    </button>
                    <button onclick="zoomOut()" class="bg-white text-gray-800 px-3 py-2 rounded hover:bg-gray-100">
                        <i class="fas fa-search-minus"></i>
                    </button>
                    <button onclick="rotateImage()" class="bg-white text-gray-800 px-3 py-2 rounded hover:bg-gray-100">
                        <i class="fas fa-redo"></i>
                    </button>
                    <button onclick="resetImage()" class="bg-white text-gray-800 px-3 py-2 rounded hover:bg-gray-100">
                        <i class="fas fa-undo"></i> 초기화
                    </button>
                </div>
                
                <!-- 이미지 -->
                <div class="overflow-auto max-w-full max-h-full">
                    <img id="viewer-image" src="" alt="Image" class="transition-transform duration-200" style="transform-origin: center center;">
                </div>
            </div>
        </div>

        <!-- 우편물 검수 및 배당 모달 -->
        <div id="mail-assignment-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold"><i class="fas fa-clipboard-check mr-2"></i>우편물 검수 및 배당</h3>
                        <button onclick="closeMailAssignmentModal()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <!-- 좌측: 우편물 정보 -->
                        <div class="space-y-4">
                            <div class="card">
                                <h4 class="font-bold mb-3"><i class="fas fa-info-circle mr-2"></i>우편물 정보</h4>
                                <div id="mail-assignment-info" class="space-y-2 text-sm">
                                    <!-- JavaScript로 채워짐 -->
                                </div>
                            </div>
                            
                            <div class="card">
                                <h4 class="font-bold mb-3"><i class="fas fa-image mr-2"></i>우편물 이미지</h4>
                                <div id="mail-assignment-images" class="grid grid-cols-2 gap-2">
                                    <!-- JavaScript로 채워짐 -->
                                </div>
                            </div>
                            
                            <div class="card">
                                <h4 class="font-bold mb-3"><i class="fas fa-file-alt mr-2"></i>OCR 결과</h4>
                                <div id="mail-assignment-ocr" class="bg-gray-50 p-3 rounded text-sm max-h-60 overflow-y-auto">
                                    <!-- JavaScript로 채워짐 -->
                                </div>
                            </div>
                        </div>
                        
                        <!-- 우측: 티켓 선택 및 배당 -->
                        <div class="space-y-4">
                            <div class="card">
                                <h4 class="font-bold mb-3"><i class="fas fa-search mr-2"></i>티켓 검색</h4>
                                <div class="space-y-3">
                                    <input type="text" id="ticket-search" class="w-full px-3 py-2 border rounded" placeholder="티켓 번호 또는 회원명 검색" onkeyup="searchTicketsForAssignment(event)">
                                    <div id="ticket-search-results" class="space-y-2 max-h-60 overflow-y-auto">
                                        <p class="text-gray-500 text-sm text-center py-4">티켓을 검색하세요</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="card">
                                <h4 class="font-bold mb-3"><i class="fas fa-list-check mr-2"></i>배당할 티켓</h4>
                                <div id="selected-tickets-for-assignment" class="space-y-2 max-h-60 overflow-y-auto">
                                    <p class="text-gray-500 text-sm text-center py-4">티켓을 선택하세요</p>
                                </div>
                            </div>
                            
                            <div class="card bg-yellow-50">
                                <div class="flex items-start">
                                    <i class="fas fa-info-circle text-yellow-600 mt-1 mr-2"></i>
                                    <div class="text-sm">
                                        <p class="font-medium text-yellow-800 mb-1">배당 안내</p>
                                        <ul class="text-yellow-700 space-y-1">
                                            <li>• 새 케이스: 신규 회원 또는 새로운 문의</li>
                                            <li>• 연속 케이스: 기존 티켓에 추가 자료</li>
                                            <li>• 여러 티켓에 동시 배당 가능</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex justify-end space-x-2 mt-6">
                        <button onclick="closeMailAssignmentModal()" class="btn btn-secondary">취소</button>
                        <button onclick="executeMailAssignment()" class="btn btn-primary" id="execute-assignment-btn">
                            <i class="fas fa-check mr-2"></i>배당 실행
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 경기 정산 모달 -->
        <div id="match-settlement-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold"><i class="fas fa-check-circle mr-2"></i>경기 정산</h3>
                        <button onclick="closeMatchSettlementModal()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <!-- 완료된 경기 목록 -->
                        <div class="card">
                            <h4 class="font-bold mb-4">완료된 경기 목록</h4>
                            <div id="completed-matches-list" class="space-y-3"></div>
                        </div>
                        
                        <!-- 정산 요약 -->
                        <div class="card bg-blue-50">
                            <h4 class="font-bold mb-4">정산 요약</h4>
                            <div class="grid grid-cols-3 gap-4">
                                <div>
                                    <p class="text-sm text-gray-600">총 배팅 금액</p>
                                    <p class="text-xl font-bold text-blue-600" id="settlement-total-bet">0원</p>
                                </div>
                                <div>
                                    <p class="text-sm text-gray-600">총 당첨 금액</p>
                                    <p class="text-xl font-bold text-green-600" id="settlement-total-win">0원</p>
                                </div>
                                <div>
                                    <p class="text-sm text-gray-600">순수익</p>
                                    <p class="text-xl font-bold text-purple-600" id="settlement-net-profit">0원</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex justify-end">
                            <button onclick="closeMatchSettlementModal()" class="btn btn-secondary">닫기</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 티켓 생성 모달 -->
        <div id="new-ticket-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] mx-4 overflow-y-auto">
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
                            <div class="flex gap-2">
                                <select id="ticket-member" class="flex-1 px-3 py-2 border rounded">
                                    <option value="">선택하세요</option>
                                </select>
                                <button type="button" onclick="showNewMemberModalFromTicket()" class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 whitespace-nowrap">
                                    <i class="fas fa-user-plus mr-1"></i>신규 회원
                                </button>
                            </div>
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

                        <!-- 이미지 첨부 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">이미지 첨부 (선택)</label>
                            <input type="file" id="ticket-images" class="w-full px-3 py-2 border rounded" accept="image/*" multiple>
                            <p class="text-xs text-gray-500 mt-1">여러 이미지를 선택할 수 있습니다 (최대 5장)</p>
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

        <!-- 회원 등록 모달 -->
        <div id="new-member-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] mx-4 overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold"><i class="fas fa-user-plus mr-2"></i>회원 등록</h3>
                        <button onclick="closeNewMemberModal()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <!-- 이름 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">이름 *</label>
                            <input type="text" id="member-name" class="w-full px-3 py-2 border rounded" placeholder="회원 이름">
                        </div>

                        <!-- 교도소명 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">교도소 *</label>
                            <input type="text" id="member-prison" class="w-full px-3 py-2 border rounded" placeholder="예: 서울구치소">
                        </div>

                        <!-- 수감번호 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">수감번호 *</label>
                            <input type="text" id="member-prisoner-number" class="w-full px-3 py-2 border rounded" placeholder="수감번호 입력">
                        </div>

                        <!-- 사서함 주소 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">사서함 주소</label>
                            <textarea id="member-address" class="w-full px-3 py-2 border rounded" rows="2" placeholder="우편물 수신 주소"></textarea>
                        </div>

                        <!-- 입금자명 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">입금자명</label>
                            <input type="text" id="member-depositor" class="w-full px-3 py-2 border rounded" placeholder="입금자 이름">
                        </div>

                        <!-- 초기 포인트 (주석처리 - 포인트는 회원 상세에서 별도 관리) -->
                        <!-- <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium mb-1">초기 일반 포인트</label>
                                <input type="number" id="member-initial-points" class="w-full px-3 py-2 border rounded" placeholder="0" min="0" value="0">
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">초기 배팅 포인트</label>
                                <input type="number" id="member-initial-betting-points" class="w-full px-3 py-2 border rounded" placeholder="0" min="0" value="0">
                            </div>
                        </div> -->

                        <!-- 메모 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">메모</label>
                            <textarea id="member-notes" class="w-full px-3 py-2 border rounded" rows="3" placeholder="회원 관련 메모"></textarea>
                        </div>
                        
                        <div class="flex justify-end space-x-2 mt-6">
                            <button onclick="closeNewMemberModal()" class="btn btn-secondary">취소</button>
                            <button onclick="createMember()" class="btn btn-primary">등록</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 회원 상세 모달 -->
        <div id="member-detail-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <div>
                            <h3 class="text-xl font-bold"><i class="fas fa-user mr-2"></i>회원 상세</h3>
                            <p class="text-sm text-gray-600">
                                <span id="detail-member-name"></span> - 
                                <span id="detail-member-prison"></span>
                            </p>
                        </div>
                        <button onclick="closeMemberDetail()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <!-- 기본 정보 -->
                        <div class="card">
                            <h4 class="font-bold mb-3"><i class="fas fa-info-circle mr-2"></i>기본 정보</h4>
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">이름:</span>
                                    <span id="detail-member-name-field" class="font-medium"></span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">회원 고유번호:</span>
                                    <span id="detail-member-number" class="font-mono font-bold text-blue-600"></span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">수용기관:</span>
                                    <span id="detail-institution"></span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">수용번호:</span>
                                    <span id="detail-inmate-number" class="font-mono"></span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">사서함:</span>
                                    <span id="detail-address" class="text-right"></span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">입금자명:</span>
                                    <span id="detail-depositor"></span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">가입일:</span>
                                    <span id="detail-created-at"></span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">상태:</span>
                                    <span id="detail-status"></span>
                                </div>
                            </div>
                        </div>

                        <!-- 포인트 정보 -->
                        <div class="card">
                            <h4 class="font-bold mb-3"><i class="fas fa-coins mr-2"></i>포인트 현황</h4>
                            <div class="space-y-3">
                                <div class="bg-blue-50 p-3 rounded">
                                    <p class="text-xs text-gray-600 mb-1">일반 포인트</p>
                                    <p class="text-2xl font-bold text-blue-600"><span id="detail-points">0</span>원</p>
                                </div>
                                <div class="bg-green-50 p-3 rounded">
                                    <p class="text-xs text-gray-600 mb-1">배팅 포인트</p>
                                    <p class="text-2xl font-bold text-green-600"><span id="detail-betting-points">0</span>원</p>
                                </div>
                                <div class="bg-orange-50 p-3 rounded">
                                    <p class="text-xs text-gray-600 mb-1">동결 포인트</p>
                                    <p class="text-2xl font-bold text-orange-600"><span id="detail-frozen-points">0</span>원</p>
                                </div>
                                
                                <!-- 포인트 관리 버튼 -->
                                <div class="grid grid-cols-2 gap-2 pt-3 border-t">
                                    <button onclick="showPointAdjustModal('add')" class="btn btn-sm btn-success">
                                        <i class="fas fa-plus mr-1"></i>포인트 지급
                                    </button>
                                    <button onclick="showPointAdjustModal('subtract')" class="btn btn-sm btn-danger">
                                        <i class="fas fa-minus mr-1"></i>포인트 차감
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- 포인트 거래 내역 -->
                        <div class="card lg:col-span-2">
                            <h4 class="font-bold mb-3"><i class="fas fa-history mr-2"></i>포인트 거래 내역</h4>
                            <div id="member-point-transactions" class="space-y-2 max-h-60 overflow-y-auto">
                                로딩중...
                            </div>
                        </div>

                        <!-- 티켓 이력 -->
                        <div class="card lg:col-span-2">
                            <h4 class="font-bold mb-3"><i class="fas fa-ticket-alt mr-2"></i>티켓 이력</h4>
                            <div id="member-tickets" class="space-y-2 max-h-60 overflow-y-auto">
                                로딩중...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 포인트 조정 모달 -->
        <div id="point-adjust-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-md w-full">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold"><i class="fas fa-coins mr-2"></i>포인트 <span id="point-adjust-title">지급</span></h3>
                        <button onclick="closePointAdjustModal()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-1">포인트 유형 *</label>
                            <select id="point-adjust-type" class="w-full px-3 py-2 border rounded">
                                <option value="points">일반 포인트</option>
                                <option value="betting_points">배팅 포인트</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">금액 *</label>
                            <input type="number" id="point-adjust-amount" class="w-full px-3 py-2 border rounded" placeholder="금액 입력" min="1" step="1000">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">사유</label>
                            <textarea id="point-adjust-reason" class="w-full px-3 py-2 border rounded" rows="3" placeholder="포인트 조정 사유를 입력하세요"></textarea>
                        </div>
                        
                        <div class="flex justify-end space-x-2 pt-4 border-t">
                            <button onclick="closePointAdjustModal()" class="btn btn-secondary">취소</button>
                            <button onclick="executePointAdjust()" class="btn btn-primary" id="point-adjust-submit">
                                <i class="fas fa-check mr-2"></i>확인
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 도서 등록 모달 -->
        <div id="new-book-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] mx-4 overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold"><i class="fas fa-book mr-2"></i>도서 등록</h3>
                        <button onclick="closeNewBookModal()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <!-- 제목 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">제목 *</label>
                            <input type="text" id="book-title" class="w-full px-3 py-2 border rounded" placeholder="도서 제목">
                        </div>

                        <!-- 저자 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">저자</label>
                            <input type="text" id="book-author" class="w-full px-3 py-2 border rounded" placeholder="저자명">
                        </div>

                        <!-- 출판사 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">출판사</label>
                            <input type="text" id="book-publisher" class="w-full px-3 py-2 border rounded" placeholder="출판사명">
                        </div>

                        <!-- ISBN -->
                        <div>
                            <label class="block text-sm font-medium mb-1">ISBN</label>
                            <input type="text" id="book-isbn" class="w-full px-3 py-2 border rounded" placeholder="ISBN 번호">
                        </div>

                        <!-- 가격 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">가격 *</label>
                            <input type="number" id="book-price" class="w-full px-3 py-2 border rounded" placeholder="0" min="0">
                        </div>

                        <!-- 재고 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">재고</label>
                            <input type="number" id="book-stock" class="w-full px-3 py-2 border rounded" placeholder="0" min="0" value="0">
                        </div>

                        <!-- 설명 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">설명</label>
                            <textarea id="book-description" class="w-full px-3 py-2 border rounded" rows="3" placeholder="도서 설명 또는 메모"></textarea>
                        </div>
                        
                        <div class="flex justify-end space-x-2 mt-6">
                            <button onclick="closeNewBookModal()" class="btn btn-secondary">취소</button>
                            <button onclick="createBook()" class="btn btn-primary">등록</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 도서 상세/수정 모달 -->
        <div id="book-detail-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] mx-4 overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <div>
                            <h3 class="text-xl font-bold"><i class="fas fa-book mr-2"></i>도서 상세</h3>
                            <p class="text-sm text-gray-600">
                                <span id="detail-book-title"></span>
                            </p>
                        </div>
                        <button onclick="closeBookDetail()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>

                    <div class="space-y-4">
                        <!-- 제목 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">제목 *</label>
                            <input type="text" id="edit-book-title" class="w-full px-3 py-2 border rounded">
                        </div>

                        <!-- 저자 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">저자</label>
                            <input type="text" id="edit-book-author" class="w-full px-3 py-2 border rounded">
                        </div>

                        <!-- 출판사 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">출판사</label>
                            <input type="text" id="edit-book-publisher" class="w-full px-3 py-2 border rounded">
                        </div>

                        <!-- ISBN -->
                        <div>
                            <label class="block text-sm font-medium mb-1">ISBN</label>
                            <input type="text" id="edit-book-isbn" class="w-full px-3 py-2 border rounded">
                        </div>

                        <!-- 가격 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">가격 *</label>
                            <input type="number" id="edit-book-price" class="w-full px-3 py-2 border rounded" min="0">
                        </div>

                        <!-- 재고 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">재고</label>
                            <div class="flex space-x-2">
                                <input type="number" id="edit-book-stock" class="flex-1 px-3 py-2 border rounded" min="0">
                                <button onclick="adjustStock(-10)" class="btn btn-secondary">-10</button>
                                <button onclick="adjustStock(-1)" class="btn btn-secondary">-1</button>
                                <button onclick="adjustStock(1)" class="btn btn-secondary">+1</button>
                                <button onclick="adjustStock(10)" class="btn btn-secondary">+10</button>
                            </div>
                        </div>

                        <!-- 상태 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">상태</label>
                            <select id="edit-book-status" class="w-full px-3 py-2 border rounded">
                                <option value="available">판매가능</option>
                                <option value="out_of_stock">품절</option>
                                <option value="discontinued">단종</option>
                            </select>
                        </div>

                        <!-- 설명 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">설명</label>
                            <textarea id="edit-book-description" class="w-full px-3 py-2 border rounded" rows="3"></textarea>
                        </div>
                        
                        <div class="flex justify-between mt-6">
                            <button onclick="deleteBook()" class="btn btn-danger" data-permission="admin">
                                <i class="fas fa-trash mr-2"></i>삭제 (관리자 전용)
                            </button>
                            <div class="flex space-x-2">
                                <button onclick="closeBookDetail()" class="btn btn-secondary">취소</button>
                                <button onclick="updateBook()" class="btn btn-primary">저장</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 직원 등록 모달 -->
        <div id="new-staff-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] mx-4 overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold"><i class="fas fa-user-plus mr-2"></i>직원 등록</h3>
                        <button onclick="closeNewStaffModal()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <!-- 이름 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">이름 *</label>
                            <input type="text" id="staff-name" class="w-full px-3 py-2 border rounded" placeholder="직원 이름">
                        </div>

                        <!-- 이메일 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">이메일 *</label>
                            <input type="email" id="staff-email" class="w-full px-3 py-2 border rounded" placeholder="email@example.com">
                        </div>

                        <!-- 비밀번호 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">비밀번호 *</label>
                            <input type="password" id="staff-password" class="w-full px-3 py-2 border rounded" placeholder="최소 6자">
                        </div>

                        <!-- 비밀번호 확인 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">비밀번호 확인 *</label>
                            <input type="password" id="staff-password-confirm" class="w-full px-3 py-2 border rounded" placeholder="비밀번호 재입력">
                        </div>

                        <!-- 권한 -->
                        <div>
                            <label class="block text-sm font-medium mb-1">권한 *</label>
                            <select id="staff-role" class="w-full px-3 py-2 border rounded">
                                <option value="staff">일반 직원 (Staff)</option>
                                <option value="viewer">뷰어 (Viewer) - 읽기 전용</option>
                                <option value="admin">관리자 (Admin)</option>
                            </select>
                            <div class="text-xs text-gray-500 mt-2 space-y-1">
                                <p><strong>Admin:</strong> 모든 기능 접근 (회원 삭제, 직원 관리, 배팅, 마감)</p>
                                <p><strong>Staff:</strong> 일반 업무 (티켓 처리, 회원 등록/수정, 포인트 조정)</p>
                                <p><strong>Viewer:</strong> 읽기 전용 (조회만 가능, 생성/수정/삭제 불가)</p>
                            </div>
                        </div>
                        
                        <div class="flex justify-end space-x-2 mt-6">
                            <button onclick="closeNewStaffModal()" class="btn btn-secondary">취소</button>
                            <button onclick="createStaff()" class="btn btn-primary">등록</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 직원 상세/수정 모달 -->
        <div id="staff-detail-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <div>
                            <h3 class="text-xl font-bold"><i class="fas fa-user-tie mr-2"></i>직원 상세</h3>
                            <p class="text-sm text-gray-600">
                                <span id="detail-staff-name"></span>
                            </p>
                        </div>
                        <button onclick="closeStaffDetail()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <!-- 기본 정보 -->
                        <div class="card">
                            <h4 class="font-bold mb-3"><i class="fas fa-info-circle mr-2"></i>기본 정보</h4>
                            <div class="space-y-3">
                                <div>
                                    <label class="block text-sm font-medium mb-1">이름</label>
                                    <input type="text" id="edit-staff-name" class="w-full px-3 py-2 border rounded">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium mb-1">이메일</label>
                                    <input type="email" id="edit-staff-email" class="w-full px-3 py-2 border rounded">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium mb-1">권한</label>
                                    <select id="edit-staff-role" class="w-full px-3 py-2 border rounded">
                                        <option value="staff">일반 직원 (Staff)</option>
                                        <option value="viewer">뷰어 (Viewer) - 읽기 전용</option>
                                        <option value="admin">관리자 (Admin)</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium mb-1">역할 변경 사유 (선택)</label>
                                    <input type="text" id="edit-staff-role-reason" class="w-full px-3 py-2 border rounded" placeholder="예: 승진, 부서 이동 등">
                                    <p class="text-xs text-gray-500 mt-1">권한 변경 시 이력에 기록됩니다</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium mb-1">가입일</label>
                                    <input type="text" id="detail-staff-created" class="w-full px-3 py-2 border rounded bg-gray-50" readonly>
                                </div>
                            </div>
                        </div>

                        <!-- 비밀번호 변경 -->
                        <div class="card">
                            <h4 class="font-bold mb-3"><i class="fas fa-key mr-2"></i>비밀번호 변경</h4>
                            <div class="space-y-3">
                                <div>
                                    <label class="block text-sm font-medium mb-1">새 비밀번호</label>
                                    <input type="password" id="edit-staff-new-password" class="w-full px-3 py-2 border rounded" placeholder="변경하려면 입력">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium mb-1">비밀번호 확인</label>
                                    <input type="password" id="edit-staff-password-confirm" class="w-full px-3 py-2 border rounded" placeholder="비밀번호 재입력">
                                </div>
                                <p class="text-xs text-gray-500">
                                    비밀번호를 변경하지 않으려면 비워두세요.
                                </p>
                            </div>
                        </div>

                        <!-- 업무 통계 -->
                        <div class="card">
                            <h4 class="font-bold mb-3"><i class="fas fa-chart-bar mr-2"></i>업무 통계</h4>
                            <div id="staff-statistics" class="grid grid-cols-2 gap-4">
                                <div class="text-center p-3 bg-blue-50 rounded">
                                    <p class="text-2xl font-bold text-blue-600" id="stat-assigned-tickets">0</p>
                                    <p class="text-xs text-gray-600">배정된 티켓</p>
                                </div>
                                <div class="text-center p-3 bg-green-50 rounded">
                                    <p class="text-2xl font-bold text-green-600" id="stat-completed-tickets">0</p>
                                    <p class="text-xs text-gray-600">완료한 티켓</p>
                                </div>
                                <div class="text-center p-3 bg-purple-50 rounded">
                                    <p class="text-2xl font-bold text-purple-600" id="stat-completion-rate">0%</p>
                                    <p class="text-xs text-gray-600">완료율</p>
                                </div>
                                <div class="text-center p-3 bg-orange-50 rounded">
                                    <p class="text-2xl font-bold text-orange-600" id="stat-attendance-days">0</p>
                                    <p class="text-xs text-gray-600">출근일수</p>
                                </div>
                            </div>
                        </div>

                        <!-- 권한 변경 이력 -->
                        <div class="card">
                            <h4 class="font-bold mb-3"><i class="fas fa-history mr-2"></i>권한 변경 이력</h4>
                            <div id="staff-role-changes" class="space-y-2 max-h-60 overflow-y-auto">
                                <p class="text-sm text-gray-500">로딩 중...</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex justify-between mt-6">
                        <button onclick="deleteStaff()" class="btn btn-danger">
                            <i class="fas fa-trash mr-2"></i>삭제
                        </button>
                        <div class="flex space-x-2">
                            <button onclick="closeStaffDetail()" class="btn btn-secondary">취소</button>
                            <button onclick="updateStaff()" class="btn btn-primary">저장</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 티켓 상세 모달 (배팅 폴더 포함) -->
        <!-- 티켓 상세 모달 (좌우 레이아웃) -->
        <div id="ticket-detail-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg w-full max-w-[95vw] h-[90vh] flex flex-col">
                <!-- 모달 헤더 -->
                <div class="p-4 border-b flex justify-between items-center">
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

                <!-- 좌우 레이아웃 -->
                <div class="flex-1 flex overflow-hidden">
                    <!-- 좌측: 우편물 이미지 뷰어 (40%) -->
                    <div class="w-2/5 border-r bg-gray-50 flex flex-col">
                        <div class="p-4 border-b bg-white">
                            <h4 class="font-bold text-sm"><i class="fas fa-envelope-open-text mr-2"></i>우편물 이미지</h4>
                        </div>
                        <div id="ticket-mail-images" class="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden">
                            <!-- 이미지 컨테이너 -->
                            <div id="mail-image-container" class="hidden w-full h-full flex flex-col">
                                <!-- 이미지 뷰어 -->
                                <div class="flex-1 flex items-center justify-center bg-black rounded overflow-hidden relative">
                                    <img id="current-mail-image" src="" alt="우편물" class="max-w-full max-h-full object-contain" style="transform-origin: center;">
                                    
                                    <!-- 이미지 컨트롤 오버레이 -->
                                    <div class="absolute top-2 right-2 flex gap-2">
                                        <button onclick="rotateMailImage(-90)" class="bg-black bg-opacity-50 text-white p-2 rounded hover:bg-opacity-70" title="왼쪽 회전 (↺)">
                                            <i class="fas fa-undo"></i>
                                        </button>
                                        <button onclick="rotateMailImage(90)" class="bg-black bg-opacity-50 text-white p-2 rounded hover:bg-opacity-70" title="오른쪽 회전 (↻)">
                                            <i class="fas fa-redo"></i>
                                        </button>
                                        <button onclick="zoomMailImage('in')" class="bg-black bg-opacity-50 text-white p-2 rounded hover:bg-opacity-70" title="확대 (+)">
                                            <i class="fas fa-search-plus"></i>
                                        </button>
                                        <button onclick="zoomMailImage('out')" class="bg-black bg-opacity-50 text-white p-2 rounded hover:bg-opacity-70" title="축소 (-)">
                                            <i class="fas fa-search-minus"></i>
                                        </button>
                                        <button onclick="resetMailImage()" class="bg-black bg-opacity-50 text-white p-2 rounded hover:bg-opacity-70" title="초기화 (0)">
                                            <i class="fas fa-sync-alt"></i>
                                        </button>
                                        <button onclick="toggleFullscreen()" class="bg-black bg-opacity-50 text-white p-2 rounded hover:bg-opacity-70" title="전체화면 (F)">
                                            <i class="fas fa-expand"></i>
                                        </button>
                                    </div>
                                </div>
                                
                                <!-- 이미지 네비게이션 -->
                                <div class="mt-3 flex items-center justify-center gap-3">
                                    <button onclick="prevMailImage()" id="prev-image-btn" class="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <i class="fas fa-chevron-left"></i>
                                    </button>
                                    <span id="image-counter" class="text-sm text-gray-700">-/-</span>
                                    <button onclick="nextMailImage()" id="next-image-btn" class="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <i class="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                                
                                <!-- 썸네일 리스트 -->
                                <div id="mail-thumbnails" class="mt-3 flex gap-2 overflow-x-auto pb-2">
                                    <!-- 썸네일 동적 생성 -->
                                </div>
                            </div>
                            
                            <!-- 이미지 없음 상태 -->
                            <div id="no-mail-images" class="text-center text-gray-500">
                                <i class="fas fa-image text-4xl mb-2 opacity-30"></i>
                                <p class="text-sm">연결된 우편물이 없습니다</p>
                            </div>
                        </div>
                    </div>

                    <!-- 우측: 기존 티켓 정보 (60%) -->
                    <div class="w-3/5 flex flex-col overflow-hidden">
                        <!-- 탭 네비게이션 -->
                        <div class="flex border-b bg-white">
                            <button onclick="showTicketTab('info')" id="tab-info" class="px-4 py-2 font-medium border-b-2 border-blue-500 text-blue-500">
                                <i class="fas fa-info-circle mr-1"></i>티켓 정보
                            </button>
                            <button onclick="showTicketTab('requests')" id="tab-requests" class="px-4 py-2 font-medium text-gray-500 hover:text-blue-500">
                                <i class="fas fa-shopping-cart mr-1"></i>요청사항 <span id="cart-count" class="ml-1 px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">0</span>
                            </button>
                            <button onclick="showTicketTab('comments')" id="tab-comments" class="px-4 py-2 font-medium text-gray-500 hover:text-blue-500">
                                <i class="fas fa-comments mr-1"></i>댓글
                            </button>
                        </div>

                        <!-- 탭 컨텐츠 영역 -->
                        <div class="flex-1 overflow-y-auto p-6">
                            <!-- 티켓 정보 탭 -->
                            <div id="ticket-tab-info" class="tab-content">
                                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <!-- 좌측: 이미지 + 요약 -->
                                    <div class="space-y-4">
                                        <!-- 우편물 이미지 (mailroom 탭에서 옮겨옴) -->
                                        <div id="mail-images-section" class="hidden">
                                            <div class="card">
                                                <h4 class="font-bold mb-3"><i class="fas fa-images mr-2"></i>우편물 이미지</h4>
                                                <div id="mail-image-viewer" class="space-y-2">
                                                    <!-- JavaScript로 렌더링 -->
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- 요약 -->
                                        <div class="card">
                                            <h4 class="font-bold mb-3"><i class="fas fa-clipboard-list mr-2"></i>요약</h4>
                                            <div id="ticket-summary" class="text-sm text-gray-700">
                                                <!-- JavaScript로 요약 정보 표시 -->
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- 중앙: 기본 정보 + 원문 -->
                                    <div class="space-y-4">
                                        <!-- 기본 정보 -->
                                        <div class="card">
                                            <h4 class="font-bold mb-3"><i class="fas fa-file-alt mr-2"></i>기본 정보</h4>
                                            <div class="space-y-2 text-sm">
                                                <div class="flex justify-between">
                                                    <span class="text-gray-600">티켓 번호:</span>
                                                    <span class="font-mono" id="detail-ticket-number"></span>
                                                </div>
                                                <div class="flex justify-between">
                                                    <span class="text-gray-600">제목:</span>
                                                    <span id="detail-ticket-title"></span>
                                                </div>
                                                <div class="flex justify-between">
                                                    <span class="text-gray-600">유형:</span>
                                                    <span id="detail-ticket-type"></span>
                                                </div>
                                                <div class="flex justify-between">
                                                    <span class="text-gray-600">상태:</span>
                                                    <span id="detail-ticket-status"></span>
                                                </div>
                                                <div class="flex justify-between">
                                                    <span class="text-gray-600">우선순위:</span>
                                                    <span id="detail-ticket-priority"></span>
                                                </div>
                                                <div class="flex justify-between">
                                                    <span class="text-gray-600">회원:</span>
                                                    <span id="detail-ticket-member-name"></span>
                                                </div>
                                                <div class="flex justify-between">
                                                    <span class="text-gray-600">담당자:</span>
                                                    <span id="detail-ticket-assigned"></span>
                                                </div>
                                                <div class="flex justify-between">
                                                    <span class="text-gray-600">생성일:</span>
                                                    <span id="detail-ticket-created"></span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- 원문 -->
                                        <div class="card">
                                            <h4 class="font-bold mb-3"><i class="fas fa-file-text mr-2"></i>원문</h4>
                                            <div id="ticket-original-text" class="text-sm text-gray-800 whitespace-pre-wrap max-h-96 overflow-y-auto p-3 bg-gray-50 rounded border">
                                                <p id="detail-ticket-description" class="text-gray-800"></p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- 우측: 회원 관리 + 상태 변경 -->
                                    <div class="space-y-4">
                                        <!-- 회원 관리 -->
                                        <div id="member-management-card">
                                            <!-- JavaScript로 동적 렌더링됩니다 -->
                                        </div>

                                        <!-- 상태 변경 -->
                                        <div class="card">
                                            <h4 class="font-bold mb-3"><i class="fas fa-edit mr-2"></i>상태 변경</h4>
                                            <div class="space-y-3">
                                                <div>
                                                    <label class="block text-sm font-medium mb-1">티켓 상태</label>
                                                    <select id="update-ticket-status" class="w-full px-3 py-2 border rounded">
                                                        <option value="open">미배정</option>
                                                        <option value="assigned">배정됨</option>
                                                        <option value="in_progress">처리중</option>
                                                        <option value="completed">완료</option>
                                                        <option value="closed">종료</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label class="block text-sm font-medium mb-1">우선순위</label>
                                                    <select id="update-ticket-priority" class="w-full px-3 py-2 border rounded">
                                                        <option value="low">낮음</option>
                                                        <option value="normal">보통</option>
                                                        <option value="high">높음</option>
                                                        <option value="urgent">긴급</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label class="block text-sm font-medium mb-1">담당자</label>
                                                    <select id="update-ticket-assigned" class="w-full px-3 py-2 border rounded">
                                                        <option value="">미배정</option>
                                                    </select>
                                                </div>
                                                <button onclick="updateTicketInfo()" class="btn btn-primary w-full">
                                                    <i class="fas fa-save mr-2"></i>변경사항 저장
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 댓글 탭 -->
                            <div id="ticket-tab-comments" class="tab-content hidden">
                                <div class="card mb-4">
                                    <h4 class="font-bold mb-3"><i class="fas fa-comment mr-2"></i>댓글/답변 작성</h4>
                                    
                                    <!-- 댓글 타입 선택 -->
                                    <div class="mb-3">
                                        <label class="block text-sm font-medium mb-1">타입</label>
                                        <div class="flex gap-4">
                                            <label class="flex items-center">
                                                <input type="radio" name="comment-type" value="internal" checked class="mr-2">
                                                <span>내부 메모 (직원만 보기)</span>
                                            </label>
                                            <label class="flex items-center">
                                                <input type="radio" name="comment-type" value="response" class="mr-2">
                                                <span class="text-blue-600 font-bold">회원 답변 (출력용)</span>
                                            </label>
                                        </div>
                                    </div>
                                    
                                    <!-- 답변 템플릿 선택 -->
                                    <div class="mb-3" id="template-section">
                                        <label class="block text-sm font-medium mb-1">빠른 답변 템플릿</label>
                                        <select id="comment-template" onchange="insertTemplate()" class="w-full px-3 py-2 border rounded">
                                            <option value="">-- 템플릿 선택 또는 직접 입력 --</option>
                                            <option value="order_received">주문 접수 완료</option>
                                            <option value="order_processing">주문 처리 중</option>
                                            <option value="order_shipped">발송 완료</option>
                                            <option value="point_adjusted">포인트 조정 완료</option>
                                            <option value="inquiry_answer">문의 답변</option>
                                            <option value="need_more_info">추가 정보 필요</option>
                                            <option value="completed">처리 완료</option>
                                        </select>
                                    </div>
                                    
                                    <textarea 
                                        id="comment-content" 
                                        class="w-full px-3 py-2 border rounded mb-2" 
                                        rows="5" 
                                        placeholder="내용을 입력하세요... (수기 작성 가능)"
                                    ></textarea>
                                    
                                    <div class="flex gap-2">
                                        <button onclick="addComment()" class="btn btn-primary flex-1">
                                            <i class="fas fa-paper-plane mr-2"></i>저장
                                        </button>
                                        <button onclick="addAndNotify()" class="btn btn-success flex-1" id="notify-btn" style="display:none;">
                                            <i class="fas fa-bell mr-2"></i>저장 + 알림 발송
                                        </button>
                                    </div>
                                </div>

                                <!-- 일괄 답변 출력 버튼 -->
                                <div class="card mb-4 bg-blue-50">
                                    <div class="flex justify-between items-center">
                                        <div>
                                            <h4 class="font-bold text-blue-800"><i class="fas fa-print mr-2"></i>답변 출력</h4>
                                            <p class="text-sm text-blue-600">회원 답변으로 저장된 댓글을 일괄 출력합니다</p>
                                        </div>
                                        <button onclick="printAllResponses()" class="btn btn-primary">
                                            <i class="fas fa-file-alt mr-2"></i>답변 일괄 출력
                                        </button>
                                    </div>
                                </div>

                                <div class="card">
                                    <h4 class="font-bold mb-3"><i class="fas fa-comments mr-2"></i>댓글/답변 목록</h4>
                                    <div id="comments-list" class="space-y-3 max-h-[400px] overflow-y-auto">
                                        로딩중...
                                    </div>
                                </div>
                            </div>

                            <!-- 요청사항 탭 (장바구니) -->
                            <div id="ticket-tab-requests" class="tab-content hidden">
                                <!-- 요청사항 추가 버튼 -->
                                <div class="mb-6 flex gap-3 flex-wrap">
                                    <button onclick="showAddRequestModal('betting')" class="btn btn-success">
                                        <i class="fas fa-trophy mr-2"></i>배팅 추가
                                    </button>
                                    <button onclick="showAddRequestModal('book_order')" class="btn btn-primary">
                                        <i class="fas fa-book mr-2"></i>도서 발주 추가
                                    </button>
                                    <button onclick="showAddRequestModal('point_request')" class="btn btn-warning">
                                        <i class="fas fa-coins mr-2"></i>포인트 요청 추가
                                    </button>
                                </div>

                                <!-- 요청사항 목록 (장바구니) -->
                                <div class="card">
                                    <h4 class="font-bold mb-3">
                                        <i class="fas fa-shopping-cart mr-2"></i>요청사항 목록
                                        <span class="ml-2 px-2 py-1 text-xs bg-blue-500 text-white rounded-full" id="cart-badge">0</span>
                                    </h4>
                                    <div id="ticket-requests-list" class="space-y-3">
                                        <p class="text-gray-500 text-center py-8">추가된 요청사항이 없습니다</p>
                                    </div>
                                </div>

                                <!-- 일괄 처리 버튼 -->
                                <div class="mt-4 flex gap-3">
                                    <button onclick="processAllRequests()" class="btn btn-success flex-1" id="process-all-btn" style="display:none;">
                                        <i class="fas fa-check-double mr-2"></i>전체 처리
                                    </button>
                                    <button onclick="clearAllRequests()" class="btn btn-danger flex-1" id="clear-all-btn" style="display:none;">
                                        <i class="fas fa-trash mr-2"></i>전체 삭제
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div>

    <!-- 요청사항 추가 모달 -->
    <div id="add-request-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center z-50" onclick="if(event.target === this) closeAddRequestModal()">
        <div class="bg-white rounded-lg shadow-xl w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto">
            <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h3 class="text-xl font-bold" id="add-request-modal-title">요청사항 추가</h3>
                <button onclick="closeAddRequestModal()" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>

            <div class="p-6">
                <!-- 배팅 추가 폼 -->
                <div id="betting-form" class="request-form hidden">
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">폴더 타입</label>
                        <select id="new-folder-type" class="w-full px-3 py-2 border rounded" onchange="updateFolderType()">
                            <option value="single">단폴더</option>
                            <option value="multi">다폴더</option>
                        </select>
                    </div>

                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">
                            경기 선택 (<span id="new-folder-type-display">단폴더</span>)
                            <span class="text-xs text-gray-500 ml-2" id="selection-guide">1개만 선택 가능</span>
                        </label>
                        <div id="modal-betting-matches-list" class="space-y-2 max-h-64 overflow-y-auto border rounded p-2">
                            로딩중...
                        </div>
                    </div>

                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">배팅 금액</label>
                        <input type="number" id="new-bet-amount" class="w-full px-3 py-2 border rounded" placeholder="배팅 금액 입력" oninput="updateModalPotentialWin()">
                    </div>

                    <div class="bg-blue-50 p-3 rounded mb-4">
                        <div class="flex justify-between text-sm mb-1">
                            <span>총 배당률:</span>
                            <span id="modal-total-odds-display" class="font-bold">1.00</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span>예상 당첨금:</span>
                            <span id="modal-potential-win-display" class="font-bold text-green-600">0원</span>
                        </div>
                    </div>

                    <button onclick="addBettingRequest()" class="btn btn-primary w-full">
                        <i class="fas fa-plus mr-2"></i>배팅 장바구니에 담기
                    </button>
                </div>

                <!-- 도서 발주 폼 -->
                <div id="book-order-form" class="request-form hidden">
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">도서 검색</label>
                        <input type="text" id="book-search" class="w-full px-3 py-2 border rounded" placeholder="도서명 또는 ISBN 검색" oninput="searchBooksForOrder()">
                    </div>

                    <div id="book-search-results" class="space-y-2 max-h-64 overflow-y-auto border rounded p-2 mb-4">
                        <p class="text-gray-500 text-center">도서명을 입력하여 검색하세요</p>
                    </div>

                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">수량</label>
                        <input type="number" id="book-order-quantity" class="w-full px-3 py-2 border rounded" placeholder="수량 입력" min="1" value="1">
                    </div>

                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">메모</label>
                        <textarea id="book-order-notes" class="w-full px-3 py-2 border rounded" rows="3" placeholder="특이사항이나 메모를 입력하세요"></textarea>
                    </div>

                    <button onclick="addBookOrderRequest()" class="btn btn-primary w-full">
                        <i class="fas fa-plus mr-2"></i>발주 장바구니에 담기
                    </button>
                </div>

                <!-- 포인트 요청 폼 -->
                <div id="point-request-form" class="request-form hidden">
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">포인트 타입</label>
                        <select id="point-request-type" class="w-full px-3 py-2 border rounded">
                            <option value="regular">일반 포인트</option>
                            <option value="betting">배팅 포인트</option>
                        </select>
                    </div>

                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">처리 유형</label>
                        <select id="point-transaction-type" class="w-full px-3 py-2 border rounded">
                            <option value="add">지급</option>
                            <option value="deduct">차감</option>
                        </select>
                    </div>

                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">금액</label>
                        <input type="number" id="point-request-amount" class="w-full px-3 py-2 border rounded" placeholder="금액 입력" min="1">
                    </div>

                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">사유</label>
                        <textarea id="point-request-reason" class="w-full px-3 py-2 border rounded" rows="3" placeholder="처리 사유를 입력하세요" required></textarea>
                    </div>

                    <button onclick="addPointRequest()" class="btn btn-primary w-full">
                        <i class="fas fa-plus mr-2"></i>포인트 요청 장바구니에 담기
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- 수정 승인 뷰 (Admin 전용) -->
    <div id="modifications-view" class="view-content hidden">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div class="mb-6 sm:mb-8">
                <h2 class="text-2xl sm:text-3xl font-bold text-gray-800"><i class="fas fa-check-circle mr-3"></i>수정 승인 관리</h2>
                <p class="text-gray-600 mt-2">직원의 수정 요청을 승인하거나 거부합니다</p>
            </div>

            <!-- 대기중인 수정 요청 -->
            <div class="card mb-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold"><i class="fas fa-clock mr-2"></i>승인 대기 (<span id="pending-count">0</span>)</h3>
                    <button onclick="loadPendingModifications()" class="btn btn-secondary btn-sm">
                        <i class="fas fa-sync mr-2"></i>새로고침
                    </button>
                </div>
                <div id="pending-modifications-list">
                    <p class="text-gray-500 text-center py-8">로딩중...</p>
                </div>
            </div>
        </div>
    </div>

    <!-- JavaScript -->
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script>
        // 전역 변수
        const API_BASE = '/api'
// ==========================================
// 권한 관리 함수
// ==========================================

// 권한 레벨 정의
const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  VIEWER: 'viewer'
}

// 권한 레벨 순서 (높을수록 강력)
const ROLE_HIERARCHY = {
  admin: 3,
  staff: 2,
  viewer: 1
}

// 권한 체크 함수
function hasPermission(requiredRole) {
  if (!currentStaff) return false
  
  const userLevel = ROLE_HIERARCHY[currentStaff.role] || 0
  const requiredLevel = ROLE_HIERARCHY[requiredRole]
  
  return userLevel >= requiredLevel
}

// ==========================================
// 안전한 DOM 조작 헬퍼 함수
// ==========================================

// 안전하게 요소의 textContent 설정
function safeSetText(elementId, text) {
  const el = document.getElementById(elementId)
  if (el) {
    el.textContent = text
    return true
  }
  console.warn(\`Element not found: \${elementId}\`)
  return false
}

// 안전하게 요소의 innerHTML 설정
function safeSetHTML(elementId, html) {
  const el = document.getElementById(elementId)
  if (el) {
    el.innerHTML = html
    return true
  }
  console.warn(\`Element not found: \${elementId}\`)
  return false
}

// 안전하게 요소의 value 가져오기
function safeGetValue(elementId, defaultValue = '') {
  const el = document.getElementById(elementId)
  if (el) {
    return el.value
  }
  console.warn(\`Element not found: \${elementId}\`)
  return defaultValue
}

// Admin 권한 체크
function isAdmin() {
  return currentStaff?.role === ROLES.ADMIN
}

// Staff 이상 권한 체크
function isStaffOrAbove() {
  return hasPermission(ROLES.STAFF)
}

// Viewer 권한 체크 (읽기 전용)
function isViewer() {
  return currentStaff?.role === ROLES.VIEWER
}

// 역할 텍스트 변환
function getRoleText(role) {
  const roleNames = {
    'admin': '관리자',
    'staff': '직원',
    'viewer': '뷰어'
  }
  return roleNames[role] || role
}

// API 요청 헤더에 Staff ID 추가
axios.interceptors.request.use(config => {
  if (currentStaff && currentStaff.id) {
    config.headers['X-Staff-ID'] = currentStaff.id
  }
  return config
})

// UI 요소 권한 제어 헬퍼
function setElementPermission(elementId, requiredRole) {
  const element = document.getElementById(elementId)
  if (!element) return
  
  if (hasPermission(requiredRole)) {
    element.classList.remove('hidden')
  } else {
    element.classList.add('hidden')
  }
}

// 버튼 활성화/비활성화
function setButtonPermission(elementId, requiredRole) {
  const button = document.getElementById(elementId)
  if (!button) return
  
  if (hasPermission(requiredRole)) {
    button.disabled = false
    button.classList.remove('opacity-50', 'cursor-not-allowed')
  } else {
    button.disabled = true
    button.classList.add('opacity-50', 'cursor-not-allowed')
  }
}

// 권한에 따른 UI 초기화
function initializePermissions() {
  if (!currentStaff) return
  
  // 역할 표시
  const roleText = getRoleText(currentStaff.role)
  document.getElementById('current-user-role').textContent = roleText
  document.getElementById('mobile-menu-user-role').textContent = roleText
  
  // Admin 전용 메뉴 (데스크톱)
  setElementPermission('betting-nav', ROLES.ADMIN)
  setElementPermission('staff-nav', ROLES.ADMIN)
  setElementPermission('closing-nav', ROLES.ADMIN)
  setElementPermission('modifications-nav', ROLES.ADMIN)
  
  // Admin 전용 메뉴 (모바일)
  setElementPermission('betting-nav-mobile', ROLES.ADMIN)
  setElementPermission('staff-nav-mobile', ROLES.ADMIN)
  setElementPermission('closing-nav-mobile', ROLES.ADMIN)
  setElementPermission('modifications-nav-mobile', ROLES.ADMIN)
  setElementPermission('staff-nav-mobile', ROLES.ADMIN)
  setElementPermission('closing-nav-mobile', ROLES.ADMIN)
  
  // Staff 이상 권한 필요한 버튼
  setButtonPermission('create-ticket-btn', ROLES.STAFF)
  setButtonPermission('create-member-btn', ROLES.STAFF)
  
  // Viewer는 읽기 전용 모드 활성화
  if (isViewer()) {
    // 모든 생성/수정/삭제 버튼 비활성화
    document.querySelectorAll('[data-permission="staff"]').forEach(btn => {
      btn.disabled = true
      btn.classList.add('opacity-50', 'cursor-not-allowed')
      btn.title = '읽기 전용 권한입니다'
    })
  }
  
  // Staff는 admin 전용 버튼 비활성화
  if (!isAdmin()) {
    document.querySelectorAll('[data-permission="admin"]').forEach(btn => {
      btn.disabled = true
      btn.classList.add('opacity-50', 'cursor-not-allowed')
      btn.title = '관리자 전용 기능입니다'
    })
  }
}

// 모바일 메뉴 토글
function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu')
  const overlay = document.getElementById('mobile-menu-overlay')
  
  if (menu.classList.contains('-translate-x-full')) {
    // 메뉴 열기
    menu.classList.remove('-translate-x-full')
    overlay.classList.remove('hidden')
    document.body.style.overflow = 'hidden' // 스크롤 방지
  } else {
    // 메뉴 닫기
    menu.classList.add('-translate-x-full')
    overlay.classList.add('hidden')
    document.body.style.overflow = '' // 스크롤 복구
  }
}

console.log('권한 관리 함수 로드 완료')
        let currentStaff = null
        let currentView = 'dashboard'
        let currentAttendanceId = null
        
        // 페이지네이션 상태 관리
        const pagination = {
            members: { page: 1, limit: 20, total: 0, totalPages: 0 },
            tickets: { page: 1, limit: 20, total: 0, totalPages: 0 },
            betting: { page: 1, limit: 20, total: 0, totalPages: 0 }
        }

        // 페이지 로드
        document.addEventListener('DOMContentLoaded', async () => {
            // 로딩 화면 표시
            document.getElementById('loading-screen').classList.remove('hidden')
            
            // 세션 복구 시도
            const sessionRestored = await restoreSession()
            
            setTimeout(() => {
                document.getElementById('loading-screen').classList.add('hidden')
                if (!sessionRestored) {
                    document.getElementById('login-screen').classList.remove('hidden')
                }
            }, 500)

            // 로그인 폼
            document.getElementById('login-form').addEventListener('submit', async (e) => {
                e.preventDefault()
                await login()
            })

            // 댓글 타입 라디오 버튼 이벤트 (delegation)
            document.addEventListener('change', (e) => {
                if (e.target.name === 'comment-type') {
                    const isResponse = e.target.value === 'response'
                    const notifyBtn = document.getElementById('notify-btn')
                    if (notifyBtn) {
                        notifyBtn.style.display = isResponse ? 'block' : 'none'
                    }
                }
            })
        })

        // 로그인
        async function login() {
            const email = document.getElementById('login-email').value
            const password = document.getElementById('login-password').value

            try {
                const response = await axios.post(\`\${API_BASE}/auth/login\`, { email, password })
                currentStaff = response.data.staff

                // localStorage에 세션 정보 저장
                localStorage.setItem('exit_system_session', JSON.stringify({
                    staff: currentStaff,
                    timestamp: Date.now()
                }))

                document.getElementById('login-screen').classList.add('hidden')
                document.getElementById('app-screen').classList.remove('hidden')

                document.getElementById('current-user-name').textContent = currentStaff.name
                document.getElementById('current-user-name-mobile').textContent = currentStaff.name
                document.getElementById('mobile-menu-user-name').textContent = currentStaff.name
                
                // 권한에 따른 UI 초기화
                initializePermissions()

                await loadDashboard()
            } catch (error) {
                alert('로그인 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 로그아웃
        function logout() {
            currentStaff = null
            // localStorage에서 세션 정보 삭제
            localStorage.removeItem('exit_system_session')
            
            document.getElementById('app-screen').classList.add('hidden')
            document.getElementById('login-screen').classList.remove('hidden')
            document.getElementById('login-email').value = ''
            document.getElementById('login-password').value = ''
        }

        // 세션 복구 (페이지 로드 시)
        async function restoreSession() {
            try {
                const sessionData = localStorage.getItem('exit_system_session')
                if (!sessionData) return false

                const session = JSON.parse(sessionData)
                const sessionAge = Date.now() - session.timestamp

                // 세션 만료 시간: 24시간 (86400000ms)
                if (sessionAge > 86400000) {
                    localStorage.removeItem('exit_system_session')
                    return false
                }

                // 세션 복구
                currentStaff = session.staff

                document.getElementById('login-screen').classList.add('hidden')
                document.getElementById('app-screen').classList.remove('hidden')

                document.getElementById('current-user-name').textContent = currentStaff.name
                document.getElementById('current-user-name-mobile').textContent = currentStaff.name
                document.getElementById('mobile-menu-user-name').textContent = currentStaff.name
                
                // 권한에 따른 UI 초기화
                initializePermissions()

                await loadDashboard()
                return true
            } catch (error) {
                console.error('세션 복구 실패:', error)
                localStorage.removeItem('exit_system_session')
                return false
            }
        }

        // 뷰 전환
        function showView(view) {
            currentView = view
            document.querySelectorAll('.view-content').forEach(el => el.classList.add('hidden'))
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'))
            document.querySelectorAll('.mobile-nav-item').forEach(el => el.classList.remove('active'))

            document.getElementById(\`\${view}-view\`).classList.remove('hidden')
            
            // 데스크톱 네비게이션 활성화
            const desktopNavButtons = document.querySelectorAll('.nav-item')
            desktopNavButtons.forEach(btn => {
                if (btn.getAttribute('onclick')?.includes(\`showView('\${view}')\`)) {
                    btn.classList.add('active')
                }
            })
            
            // 모바일 네비게이션 활성화
            const mobileNavButtons = document.querySelectorAll('.mobile-nav-item')
            mobileNavButtons.forEach(btn => {
                if (btn.getAttribute('onclick')?.includes(\`showView('\${view}')\`)) {
                    btn.classList.add('active')
                }
            })

            // 각 뷰 로드
            if (view === 'dashboard') loadDashboard()
            else if (view === 'tickets') loadTickets()
            else if (view === 'members') loadMembers()
            else if (view === 'books') loadBooks()
            else if (view === 'mailroom') loadMailroom()
            else if (view === 'betting') loadBetting()
            else if (view === 'staff') loadStaff()
            else if (view === 'closing') loadClosing()
            else if (view === 'modifications') loadPendingModifications()
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

                // 차트 렌더링
                await renderDashboardCharts()
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

        // 대시보드 차트 렌더링
        let dashboardCharts = {} // 차트 인스턴스 저장

        async function renderDashboardCharts() {
            try {
                // 기존 차트 파괴
                Object.values(dashboardCharts).forEach(chart => {
                    if (chart) chart.destroy()
                })
                dashboardCharts = {}

                // 데이터 로드
                const [ticketStats, mailroomStats, bettingStats, pointStats] = await Promise.all([
                    axios.get(\`\${API_BASE}/tickets/stats/dashboard\`),
                    axios.get(\`\${API_BASE}/mailroom?status=all\`),
                    axios.get(\`\${API_BASE}/betting/folders\`),
                    axios.get(\`\${API_BASE}/points/pending\`)
                ])

                // 1. 티켓 상태 별 통계 (도넛 차트)
                renderTicketStatusChart(ticketStats.data)

                // 2. 우편물 처리 현황 (도넛 차트)
                renderMailroomStatusChart(mailroomStats.data.mailroom_items || [])

                // 3. 월별 티켓 추이 (라인 차트)
                await renderTicketTrendChart()

                // 4. 배팅 현황 (바 차트)
                renderBettingStatusChart(bettingStats.data.folders || [])

                // 5. 포인트 거래 현황 (바 차트)
                await renderPointTransactionChart()

            } catch (error) {
                console.error('차트 렌더링 오류:', error)
            }
        }

        // 1. 티켓 상태 별 차트
        function renderTicketStatusChart(stats) {
            const ctx = document.getElementById('ticketStatusChart')
            if (!ctx) return

            const statusData = stats.statusStats || []
            const labels = statusData.map(s => getStatusText(s.status))
            const data = statusData.map(s => s.count)
            const colors = [
                '#FCD34D', // open (노랑)
                '#60A5FA', // assigned (파랑)
                '#A78BFA', // in_progress (보라)
                '#34D399', // completed (초록)
                '#94A3B8'  // closed (회색)
            ]

            dashboardCharts.ticketStatus = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors,
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || ''
                                    const value = context.parsed || 0
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0)
                                    const percentage = ((value / total) * 100).toFixed(1)
                                    return \`\${label}: \${value}건 (\${percentage}%)\`
                                }
                            }
                        }
                    }
                }
            })
        }

        // 2. 우편물 처리 현황 차트
        function renderMailroomStatusChart(items) {
            const ctx = document.getElementById('mailroomStatusChart')
            if (!ctx) return

            // 상태별 집계
            const statusCount = {}
            items.forEach(item => {
                statusCount[item.status] = (statusCount[item.status] || 0) + 1
            })

            const statusLabels = {
                'received': '수령',
                'ocr_processing': 'OCR 처리중',
                'ocr_completed': 'OCR 완료',
                'inspection': '검수중',
                'assigned': '배당완료',
                'completed': '처리완료'
            }

            const labels = Object.keys(statusCount).map(s => statusLabels[s] || s)
            const data = Object.values(statusCount)
            const colors = ['#FBBF24', '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#6B7280']

            dashboardCharts.mailroomStatus = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors,
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            })
        }

        // 3. 월별 티켓 추이 차트
        async function renderTicketTrendChart() {
            const ctx = document.getElementById('ticketTrendChart')
            if (!ctx) return

            try {
                // 최근 6개월 티켓 데이터
                const response = await axios.get(\`\${API_BASE}/tickets\`)
                const tickets = response.data.tickets || []

                // 월별 집계
                const monthlyData = {}
                const now = new Date()
                for (let i = 5; i >= 0; i--) {
                    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
                    const key = \`\${date.getFullYear()}-\${String(date.getMonth() + 1).padStart(2, '0')}\`
                    monthlyData[key] = { created: 0, completed: 0 }
                }

                tickets.forEach(ticket => {
                    const created = ticket.created_at.substring(0, 7)
                    if (monthlyData[created]) {
                        monthlyData[created].created++
                        if (['completed', 'closed'].includes(ticket.status)) {
                            monthlyData[created].completed++
                        }
                    }
                })

                const labels = Object.keys(monthlyData).map(key => {
                    const [year, month] = key.split('-')
                    return \`\${year}년 \${month}월\`
                })
                const createdData = Object.values(monthlyData).map(d => d.created)
                const completedData = Object.values(monthlyData).map(d => d.completed)

                dashboardCharts.ticketTrend = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: '생성된 티켓',
                                data: createdData,
                                borderColor: '#3B82F6',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                tension: 0.4,
                                fill: true
                            },
                            {
                                label: '완료된 티켓',
                                data: completedData,
                                borderColor: '#10B981',
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                tension: 0.4,
                                fill: true
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'top'
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1
                                }
                            }
                        }
                    }
                })
            } catch (error) {
                console.error('티켓 추이 차트 오류:', error)
            }
        }

        // 4. 배팅 현황 차트
        function renderBettingStatusChart(folders) {
            const ctx = document.getElementById('bettingStatusChart')
            if (!ctx) return

            // 상태별 집계
            const statusCount = {}
            folders.forEach(folder => {
                statusCount[folder.status] = (statusCount[folder.status] || 0) + 1
            })

            const statusLabels = {
                'pending': '대기중',
                'settled_win': '적중',
                'settled_lose': '미적중',
                'cancelled': '취소'
            }

            const labels = Object.keys(statusCount).map(s => statusLabels[s] || s)
            const data = Object.values(statusCount)
            const colors = ['#FBBF24', '#10B981', '#EF4444', '#6B7280']

            dashboardCharts.bettingStatus = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '폴더 수',
                        data: data,
                        backgroundColor: colors
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            })
        }

        // 5. 포인트 거래 현황 차트
        async function renderPointTransactionChart() {
            const ctx = document.getElementById('pointTransactionChart')
            if (!ctx) return

            try {
                // 일주일 데이터 (임시 데이터 - 실제로는 API에서 가져와야 함)
                const labels = []
                const addData = []
                const deductData = []

                for (let i = 6; i >= 0; i--) {
                    const date = new Date()
                    date.setDate(date.getDate() - i)
                    labels.push(\`\${date.getMonth() + 1}/\${date.getDate()}\`)
                    addData.push(Math.floor(Math.random() * 10))
                    deductData.push(Math.floor(Math.random() * 10))
                }

                dashboardCharts.pointTransaction = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: '지급',
                                data: addData,
                                backgroundColor: '#10B981'
                            },
                            {
                                label: '차감',
                                data: deductData,
                                backgroundColor: '#EF4444'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'top'
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1
                                }
                            }
                        }
                    }
                })
            } catch (error) {
                console.error('포인트 차트 오류:', error)
            }
        }

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
        async function loadTickets(page = 1) {
            const status = document.getElementById('ticket-status-filter').value
            const type = document.getElementById('ticket-type-filter').value
            pagination.tickets.page = page

            try {
                let url = \`\${API_BASE}/tickets?page=\${page}&limit=\${pagination.tickets.limit}&\`
                if (status !== 'all') url += \`status=\${status}&\`
                if (type !== 'all') url += \`ticket_type=\${type}&\`

                const response = await axios.get(url)
                const tickets = response.data.tickets
                const paginationInfo = response.data.pagination
                
                // 페이지네이션 정보 업데이트
                if (paginationInfo) {
                    pagination.tickets = { ...pagination.tickets, ...paginationInfo }
                }

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
                
                // 페이지네이션 UI 렌더링
                renderPagination('tickets', 'tickets-pagination', 'loadTickets')
            } catch (error) {
                console.error('티켓 목록 로드 오류:', error)
            }
        }

        // 페이지네이션 UI 렌더링
        function renderPagination(type, containerId, onPageChange) {
            const paginationData = pagination[type]
            const container = document.getElementById(containerId)
            
            if (!container || paginationData.totalPages <= 1) {
                if (container) container.innerHTML = ''
                return
            }
            
            const { page, totalPages } = paginationData
            let html = '<div class="flex justify-center items-center space-x-2 mt-6">'
            
            // 이전 버튼
            if (page > 1) {
                html += \`<button onclick="\${onPageChange}(\${page - 1})" class="btn btn-secondary px-3 py-1">
                    <i class="fas fa-chevron-left"></i> 이전
                </button>\`
            }
            
            // 페이지 번호
            const startPage = Math.max(1, page - 2)
            const endPage = Math.min(totalPages, page + 2)
            
            if (startPage > 1) {
                html += \`<button onclick="\${onPageChange}(1)" class="btn btn-secondary px-3 py-1">1</button>\`
                if (startPage > 2) html += '<span class="px-2">...</span>'
            }
            
            for (let i = startPage; i <= endPage; i++) {
                if (i === page) {
                    html += \`<button class="btn btn-primary px-3 py-1">\${i}</button>\`
                } else {
                    html += \`<button onclick="\${onPageChange}(\${i})" class="btn btn-secondary px-3 py-1">\${i}</button>\`
                }
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) html += '<span class="px-2">...</span>'
                html += \`<button onclick="\${onPageChange}(\${totalPages})" class="btn btn-secondary px-3 py-1">\${totalPages}</button>\`
            }
            
            // 다음 버튼
            if (page < totalPages) {
                html += \`<button onclick="\${onPageChange}(\${page + 1})" class="btn btn-secondary px-3 py-1">
                    다음 <i class="fas fa-chevron-right"></i>
                </button>\`
            }
            
            html += '</div>'
            container.innerHTML = html
        }

        // 회원 목록 뷰 타입 (카드형/리스트형)
        let memberViewType = 'card' // 'card' 또는 'list'
        
        function setMemberViewType(type) {
            memberViewType = type
            
            // 버튼 스타일 업데이트
            const cardBtn = document.getElementById('view-card-btn')
            const listBtn = document.getElementById('view-list-btn')
            
            if (type === 'card') {
                cardBtn.classList.add('bg-white', 'text-gray-700')
                cardBtn.classList.remove('text-gray-600', 'hover:text-gray-800')
                listBtn.classList.remove('bg-white', 'text-gray-700')
                listBtn.classList.add('text-gray-600', 'hover:text-gray-800')
            } else {
                listBtn.classList.add('bg-white', 'text-gray-700')
                listBtn.classList.remove('text-gray-600', 'hover:text-gray-800')
                cardBtn.classList.remove('bg-white', 'text-gray-700')
                cardBtn.classList.add('text-gray-600', 'hover:text-gray-800')
            }
            
            // 목록 다시 로드
            loadMembers()
        }

        // 회원 목록 로드
        async function loadMembers(page = 1) {
            const search = document.getElementById('member-search').value
            pagination.members.page = page

            try {
                const response = await axios.get(\`\${API_BASE}/members?search=\${search}&page=\${page}&limit=\${pagination.members.limit}\`)
                const members = response.data.members
                const paginationInfo = response.data.pagination
                
                // 페이지네이션 정보 업데이트
                if (paginationInfo) {
                    pagination.members = { ...pagination.members, ...paginationInfo }
                }

                const membersList = document.getElementById('members-list')
                
                if (members.length === 0) {
                    membersList.innerHTML = '<p class="text-gray-500 text-center py-8">회원이 없습니다.</p>'
                    membersList.className = ''
                } else if (memberViewType === 'card') {
                    // 카드형 뷰
                    membersList.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                    membersList.innerHTML = members.map(m => \`
                        <div class="card hover:shadow-lg transition">
                            <div class="flex justify-between items-start mb-2">
                                <div class="flex-1" onclick="showMemberDetail(\${m.id})" style="cursor: pointer;">
                                    <h3 class="font-bold text-lg">\${m.name}</h3>
                                    <p class="text-sm text-gray-600">
                                        <i class="fas fa-building mr-1"></i>수용기관: \${m.institution || '미지정'}
                                    </p>
                                    <p class="text-sm text-gray-600">
                                        <i class="fas fa-id-card mr-1"></i>수용번호: \${m.inmate_number || '-'}
                                    </p>
                                </div>
                                <button onclick="event.stopPropagation(); showEditMemberModal(\${m.id})" 
                                        class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </div>
                            <div class="mt-3 space-y-1">
                                <p class="text-sm"><span class="font-bold">일반 포인트:</span> \${m.points.toLocaleString()}원</p>
                                <p class="text-sm"><span class="font-bold">배팅 포인트:</span> \${m.betting_points.toLocaleString()}원</p>
                                \${m.frozen_points > 0 ? \`<p class="text-sm text-yellow-600"><span class="font-bold">동결:</span> \${m.frozen_points.toLocaleString()}원</p>\` : ''}
                            </div>
                            <p class="text-xs text-gray-400 mt-2">가입일: \${new Date(m.created_at).toLocaleDateString()}</p>
                        </div>
                    \`).join('')
                } else {
                    // 리스트형 뷰
                    membersList.className = 'overflow-x-auto'
                    membersList.innerHTML = \`
                        <table class="w-full border-collapse">
                            <thead>
                                <tr class="bg-gray-100 border-b">
                                    <th class="text-left p-3 text-sm font-semibold">이름</th>
                                    <th class="text-left p-3 text-sm font-semibold">수용기관</th>
                                    <th class="text-left p-3 text-sm font-semibold">수용번호</th>
                                    <th class="text-right p-3 text-sm font-semibold">일반 포인트</th>
                                    <th class="text-right p-3 text-sm font-semibold">배팅 포인트</th>
                                    <th class="text-center p-3 text-sm font-semibold">가입일</th>
                                    <th class="text-center p-3 text-sm font-semibold">관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                \${members.map(m => \`
                                    <tr class="border-b hover:bg-gray-50 transition cursor-pointer" 
                                        onclick="showMemberDetail(\${m.id})">
                                        <td class="p-3">
                                            <div class="font-medium text-gray-800">\${m.name}</div>
                                        </td>
                                        <td class="p-3 text-sm text-gray-600">
                                            <i class="fas fa-building mr-1"></i>\${m.institution || '미지정'}
                                        </td>
                                        <td class="p-3 text-sm text-gray-600">
                                            \${m.inmate_number || '-'}
                                        </td>
                                        <td class="p-3 text-right text-sm">
                                            \${m.points.toLocaleString()}원
                                        </td>
                                        <td class="p-3 text-right text-sm">
                                            \${m.betting_points.toLocaleString()}원
                                        </td>
                                        <td class="p-3 text-center text-xs text-gray-500">
                                            \${new Date(m.created_at).toLocaleDateString()}
                                        </td>
                                        <td class="p-3 text-center">
                                            <button onclick="event.stopPropagation(); showEditMemberModal(\${m.id})" 
                                                    class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                        </td>
                                    </tr>
                                \`).join('')}
                            </tbody>
                        </table>
                    \`
                }
                
                // 페이지네이션 UI 렌더링
                renderPagination('members', 'members-pagination', 'loadMembers')
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
                    <div class="card hover:shadow-lg transition cursor-pointer" onclick="showBookDetail(\${b.id})">
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
                                <span class="text-xs px-2 py-1 rounded \${b.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                    \${b.status === 'available' ? '판매중' : '품절'}
                                </span>
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
                const foldersRes = await axios.get(\`\${API_BASE}/betting/folders\`)

                // 배팅 폴더 목록 (고객 배팅) - 더 상세한 정보 표시
                const folders = foldersRes.data.folders || []
                const bettingHtml = folders.length > 0 ? folders.map(f => \`
                    <div class="bg-white border-l-4 \${f.status === 'won' ? 'border-green-500' : f.status === 'lost' ? 'border-red-500' : 'border-blue-500'} p-4 rounded shadow-sm">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <p class="font-bold text-lg">\${f.folder_number}</p>
                                <p class="text-sm text-gray-600">\${f.member_name} | \${f.ticket_number}</p>
                            </div>
                            <span class="status-badge status-\${f.status}">\${getStatusText(f.status)}</span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 mt-2 text-sm">
                            <div>
                                <p class="text-gray-500">폴더 유형</p>
                                <p class="font-semibold">\${f.folder_type === 'single' ? '단폴더' : '다폴더'}</p>
                            </div>
                            <div>
                                <p class="text-gray-500">배팅 금액</p>
                                <p class="font-semibold text-blue-600">\${f.total_bet_amount.toLocaleString()}원</p>
                            </div>
                            <div>
                                <p class="text-gray-500">총 배당률</p>
                                <p class="font-semibold">\${f.total_odds.toFixed(2)}</p>
                            </div>
                            <div>
                                <p class="text-gray-500">예상 적중금</p>
                                <p class="font-semibold text-green-600">\${(f.total_bet_amount * f.total_odds).toLocaleString()}원</p>
                            </div>
                        </div>
                        <div class="mt-2 text-xs text-gray-400">
                            \${new Date(f.created_at).toLocaleString()}
                        </div>
                    </div>
                \`).join('') : '<p class="text-gray-500 text-sm text-center py-4">배팅이 없습니다.</p>'

                document.getElementById('betting-folders-list').innerHTML = bettingHtml

                // 경기 정산 목록 로드
                await loadMatchSettlementList()
            } catch (error) {
                console.error('배팅 관리 로드 오류:', error)
            }
        }

        // 경기 정산 목록 로드 (완료된 경기만)
        async function loadMatchSettlementList() {
            try {
                const response = await axios.get(\`\${API_BASE}/betting/matches?status=completed\`)
                const matches = response.data.matches || []

                const html = matches.length > 0 ? matches.map(m => \`
                    <div class="bg-green-50 p-3 rounded border border-green-200">
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="font-bold">\${m.match_name}</p>
                                <p class="text-sm text-gray-600">\${new Date(m.match_date).toLocaleString()}</p>
                                <p class="text-xs text-gray-500">결과: \${m.result || '미정'}</p>
                            </div>
                            <button onclick="viewMatchSettlement(\${m.id})" class="btn btn-sm btn-primary">
                                상세보기
                            </button>
                        </div>
                    </div>
                \`).join('') : '<p class="text-gray-500 text-sm text-center py-4">완료된 경기가 없습니다.</p>'

                document.getElementById('match-settlement-list').innerHTML = html
            } catch (error) {
                console.error('경기 정산 목록 로드 오류:', error)
            }
        }

        // 배팅 탭 전환
        function showBettingTab(tabName) {
            // 버튼 활성화
            document.getElementById('betting-tab-management').classList.remove('bg-blue-500', 'text-white')
            document.getElementById('betting-tab-management').classList.add('bg-gray-200', 'text-gray-700')
            document.getElementById('betting-tab-statistics').classList.remove('bg-blue-500', 'text-white')
            document.getElementById('betting-tab-statistics').classList.add('bg-gray-200', 'text-gray-700')
            
            document.getElementById(\`betting-tab-\${tabName}\`).classList.remove('bg-gray-200', 'text-gray-700')
            document.getElementById(\`betting-tab-\${tabName}\`).classList.add('bg-blue-500', 'text-white')

            // 탭 콘텐츠 표시
            document.querySelectorAll('.betting-tab-content').forEach(tab => tab.classList.add('hidden'))
            document.getElementById(\`betting-\${tabName}-tab\`).classList.remove('hidden')

            // 통계 탭이면 데이터 로드
            if (tabName === 'statistics') {
                setStatsDateRange('month')
                loadBettingStatistics()
            }
        }

        // 통계 기간 설정
        function setStatsDateRange(range) {
            const endDate = new Date()
            const startDate = new Date()

            if (range === 'today') {
                startDate.setHours(0, 0, 0, 0)
            } else if (range === 'week') {
                startDate.setDate(endDate.getDate() - 7)
            } else if (range === 'month') {
                startDate.setMonth(endDate.getMonth() - 1)
            }

            document.getElementById('stats-start-date').value = startDate.toISOString().split('T')[0]
            document.getElementById('stats-end-date').value = endDate.toISOString().split('T')[0]
        }

        // 배팅 통계 로드
        async function loadBettingStatistics() {
            try {
                const startDate = document.getElementById('stats-start-date').value
                const endDate = document.getElementById('stats-end-date').value

                if (!startDate || !endDate) {
                    alert('기간을 선택해주세요.')
                    return
                }

                const response = await axios.get(\`\${API_BASE}/betting/statistics?start_date=\${startDate}&end_date=\${endDate}\`)
                const stats = response.data

                // 전체 통계
                document.getElementById('total-bet-amount').textContent = (stats.total_bet_amount || 0).toLocaleString() + '원'
                document.getElementById('total-win-amount').textContent = (stats.total_win_amount || 0).toLocaleString() + '원'
                document.getElementById('net-profit').textContent = (stats.net_profit || 0).toLocaleString() + '원'
                document.getElementById('total-bet-count').textContent = (stats.total_bet_count || 0).toLocaleString() + '건'

                // 회원별 통계
                const memberStats = stats.member_stats || []
                const memberHtml = memberStats.length > 0 ? memberStats.map(m => \`
                    <tr class="border-b hover:bg-gray-50">
                        <td class="px-4 py-2">\${m.member_name}</td>
                        <td class="px-4 py-2 text-right">\${m.bet_count}건</td>
                        <td class="px-4 py-2 text-right">\${parseInt(m.total_bet_amount || 0).toLocaleString()}원</td>
                        <td class="px-4 py-2 text-right">
                            <span class="\${parseFloat(m.win_rate) >= 50 ? 'text-green-600' : 'text-red-600'} font-bold">
                                \${parseFloat(m.win_rate || 0).toFixed(1)}%
                            </span>
                        </td>
                    </tr>
                \`).join('') : '<tr><td colspan="4" class="text-center py-4 text-gray-500">데이터 없음</td></tr>'

                document.getElementById('member-stats-table').innerHTML = memberHtml

                // 경기별 통계
                const matchStats = stats.match_stats || []
                const matchHtml = matchStats.length > 0 ? matchStats.map(m => \`
                    <tr class="border-b hover:bg-gray-50">
                        <td class="px-4 py-2">\${m.match_name}</td>
                        <td class="px-4 py-2 text-right">\${m.bet_count}건</td>
                        <td class="px-4 py-2 text-right">\${parseInt(m.total_bet_amount || 0).toLocaleString()}원</td>
                    </tr>
                \`).join('') : '<tr><td colspan="3" class="text-center py-4 text-gray-500">데이터 없음</td></tr>'

                document.getElementById('match-stats-table').innerHTML = matchHtml

                // 일별 추이
                const dailyTrend = stats.daily_trend || []
                const trendHtml = dailyTrend.length > 0 ? dailyTrend.map(d => \`
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                            <p class="font-bold">\${new Date(d.date).toLocaleDateString()}</p>
                            <p class="text-sm text-gray-600">배팅 \${d.bet_count}건</p>
                        </div>
                        <div class="text-right">
                            <p class="text-sm">배팅액: <span class="font-bold text-blue-600">\${parseInt(d.total_bet_amount || 0).toLocaleString()}원</span></p>
                            <p class="text-sm">당첨액: <span class="font-bold text-green-600">\${parseInt(d.total_win_amount || 0).toLocaleString()}원</span></p>
                        </div>
                    </div>
                \`).join('') : '<p class="text-gray-500 text-center py-4">데이터 없음</p>'

                document.getElementById('daily-trend-list').innerHTML = trendHtml

            } catch (error) {
                console.error('통계 로드 오류:', error)
                alert('통계를 불러오는데 실패했습니다.')
            }
        }


        // 직원 목록 로드
        // ==========================================
        // 직원 관리 함수 (개선 버전)
        // ==========================================

        let currentStaffFilter = 'all'
        let allStaffList = []
        let currentEditingStaffId = null

        // 직원 목록 로드
        async function loadStaff() {
            try {
                const response = await axios.get(\`\${API_BASE}/staff\`)
                allStaffList = response.data.staff
                renderStaffList()
            } catch (error) {
                console.error('직원 목록 로드 오류:', error)
                document.getElementById('staff-list').innerHTML = '<p class="text-red-500 text-center py-8">직원 목록을 불러올 수 없습니다.</p>'
            }
        }

        // 역할별 필터링
        function filterStaffByRole(role) {
            currentStaffFilter = role
            
            // 필터 버튼 활성화 상태 업데이트
            document.querySelectorAll('[id^="filter-"]').forEach(btn => {
                btn.classList.remove('btn-primary')
                btn.classList.add('btn-secondary')
            })
            document.getElementById(\`filter-\${role}\`).classList.remove('btn-secondary')
            document.getElementById(\`filter-\${role}\`).classList.add('btn-primary')
            
            renderStaffList()
        }

        // 직원 목록 렌더링
        function renderStaffList() {
            let filteredStaff = allStaffList
            
            if (currentStaffFilter !== 'all') {
                filteredStaff = allStaffList.filter(s => s.role === currentStaffFilter)
            }
            
            const getRoleBadge = (role) => {
                const badges = {
                    'admin': '<span class="status-badge bg-yellow-100 text-yellow-800"><i class="fas fa-crown mr-1"></i>관리자</span>',
                    'staff': '<span class="status-badge bg-blue-100 text-blue-800"><i class="fas fa-user mr-1"></i>직원</span>',
                    'viewer': '<span class="status-badge bg-gray-100 text-gray-800"><i class="fas fa-eye mr-1"></i>뷰어</span>'
                }
                return badges[role] || role
            }
            
            const html = filteredStaff.length > 0 ? filteredStaff.map(s => \`
                <div class="card hover:shadow-lg transition cursor-pointer" onclick="showStaffDetail(\${s.id})">
                    <div class="flex flex-col space-y-3">
                        <div class="flex justify-between items-start">
                            <div>
                                <h3 class="font-bold text-lg">\${s.name}</h3>
                                <p class="text-sm text-gray-600">\${s.email}</p>
                            </div>
                            \${getRoleBadge(s.role)}
                        </div>
                        <div class="text-sm text-gray-500 pt-2 border-t">
                            <i class="fas fa-calendar mr-1"></i>등록: \${new Date(s.created_at).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            \`).join('') : '<p class="text-gray-500 text-center py-8 col-span-full">직원이 없습니다.</p>'
            
            document.getElementById('staff-list').innerHTML = html
        }

        // 직원 상세 조회
        async function showStaffDetail(staffId) {
            if (!isAdmin()) {
                alert('관리자만 직원 정보를 조회할 수 있습니다.')
                return
            }
            
            currentEditingStaffId = staffId
            
            try {
                // 직원 정보 조회
                const staffRes = await axios.get(\`\${API_BASE}/staff/\${staffId}\`)
                const staff = staffRes.data.staff
                
                // 업무 통계 조회
                const statsRes = await axios.get(\`\${API_BASE}/staff/\${staffId}/stats\`)
                const stats = statsRes.data
                
                // 권한 변경 이력 조회
                const changesRes = await axios.get(\`\${API_BASE}/staff/\${staffId}/role-changes\`)
                const changes = changesRes.data.changes
                
                // 기본 정보 채우기
                document.getElementById('detail-staff-name').textContent = staff.name
                document.getElementById('edit-staff-name').value = staff.name || ''
                document.getElementById('edit-staff-email').value = staff.email || ''
                document.getElementById('edit-staff-role').value = staff.role || 'staff'
                document.getElementById('detail-staff-created').value = new Date(staff.created_at).toLocaleString() || ''
                document.getElementById('edit-staff-role-reason').value = ''
                
                // 비밀번호 필드 초기화
                document.getElementById('edit-staff-new-password').value = ''
                document.getElementById('edit-staff-password-confirm').value = ''
                
                // 업무 통계 채우기
                document.getElementById('stat-assigned-tickets').textContent = stats.assigned_tickets || 0
                document.getElementById('stat-completed-tickets').textContent = stats.completed_tickets || 0
                document.getElementById('stat-completion-rate').textContent = \`\${stats.completion_rate || 0}%\`
                document.getElementById('stat-attendance-days').textContent = stats.attendance_days || 0
                
                // 권한 변경 이력 렌더링
                const getRoleTextLocal = (role) => {
                    const roles = {
                        'admin': '관리자',
                        'staff': '직원',
                        'viewer': '뷰어'
                    }
                    return roles[role] || role
                }
                
                const changesHtml = changes.length > 0 ? changes.map(change => \`
                    <div class="p-2 bg-gray-50 rounded text-sm">
                        <div class="flex justify-between items-start">
                            <div>
                                <span class="font-medium">\${getRoleTextLocal(change.old_role)}</span>
                                <i class="fas fa-arrow-right mx-1 text-gray-400"></i>
                                <span class="font-medium">\${getRoleTextLocal(change.new_role)}</span>
                            </div>
                            <span class="text-xs text-gray-500">\${new Date(change.created_at).toLocaleDateString()}</span>
                        </div>
                        \${change.reason ? \`<p class="text-xs text-gray-600 mt-1">사유: \${change.reason}</p>\` : ''}
                        <p class="text-xs text-gray-500 mt-1">변경자: \${change.changed_by_name}</p>
                    </div>
                \`).join('') : '<p class="text-sm text-gray-500">권한 변경 이력이 없습니다.</p>'
                
                document.getElementById('staff-role-changes').innerHTML = changesHtml
                
                // 모달 표시
                document.getElementById('staff-detail-modal').classList.remove('hidden')
                
            } catch (error) {
                console.error('직원 상세 조회 오류:', error)
                alert('직원 정보를 불러올 수 없습니다.')
            }
        }

        // 직원 상세 모달 닫기
        function closeStaffDetail() {
            document.getElementById('staff-detail-modal').classList.add('hidden')
            currentEditingStaffId = null
        }

        // 직원 정보 업데이트
        async function updateStaff() {
            if (!currentEditingStaffId) return
            
            try {
                const name = document.getElementById('edit-staff-name').value
                const role = document.getElementById('edit-staff-role').value
                const reason = document.getElementById('edit-staff-role-reason').value
                const newPassword = document.getElementById('edit-staff-new-password').value
                const confirmPassword = document.getElementById('edit-staff-password-confirm').value
                
                if (!name || !role) {
                    alert('필수 항목을 입력해주세요.')
                    return
                }
                
                // 비밀번호 확인
                if (newPassword && newPassword !== confirmPassword) {
                    alert('비밀번호가 일치하지 않습니다.')
                    return
                }
                
                const updateData = { name, role, reason }
                if (newPassword) {
                    updateData.password = newPassword
                }
                
                await axios.patch(\`\${API_BASE}/staff/\${currentEditingStaffId}\`, updateData)
                
                alert('직원 정보가 업데이트되었습니다.')
                closeStaffDetail()
                await loadStaff()
                
            } catch (error) {
                console.error('직원 업데이트 오류:', error)
                alert('직원 정보 업데이트에 실패했습니다: ' + (error.response?.data?.error || error.message))
            }
        }

        // 직원 삭제
        async function deleteStaff() {
            if (!currentEditingStaffId) return
            
            if (!confirm('정말 이 직원을 삭제하시겠습니까?\\n\\n이 작업은 되돌릴 수 없습니다.')) {
                return
            }
            
            try {
                await axios.delete(\`\${API_BASE}/staff/\${currentEditingStaffId}\`)
                alert('직원이 삭제되었습니다.')
                closeStaffDetail()
                await loadStaff()
            } catch (error) {
                console.error('직원 삭제 오류:', error)
                alert('직원 삭제에 실패했습니다: ' + (error.response?.data?.error || error.message))
            }
        }

        // 새 직원 모달 표시
        function showNewStaffModal() {
            if (!isAdmin()) {
                alert('관리자만 직원을 등록할 수 있습니다.')
                return
            }
            
            // 입력 필드 초기화
            document.getElementById('staff-name').value = ''
            document.getElementById('staff-email').value = ''
            document.getElementById('staff-password').value = ''
            document.getElementById('staff-password-confirm').value = ''
            document.getElementById('staff-role').value = 'staff'
            
            document.getElementById('new-staff-modal').classList.remove('hidden')
        }

        // 새 직원 모달 닫기
        function closeNewStaffModal() {
            document.getElementById('new-staff-modal').classList.add('hidden')
        }

        // 직원 등록
        async function createStaff() {
            try {
                const name = document.getElementById('staff-name').value
                const email = document.getElementById('staff-email').value
                const password = document.getElementById('staff-password').value
                const confirmPassword = document.getElementById('staff-password-confirm').value
                const role = document.getElementById('staff-role').value
                
                if (!name || !email || !password || !role) {
                    alert('모든 필수 항목을 입력해주세요.')
                    return
                }
                
                if (password !== confirmPassword) {
                    alert('비밀번호가 일치하지 않습니다.')
                    return
                }
                
                if (password.length < 6) {
                    alert('비밀번호는 최소 6자 이상이어야 합니다.')
                    return
                }
                
                await axios.post(\`\${API_BASE}/staff\`, {
                    name,
                    email,
                    password,
                    role
                })
                
                alert('직원이 등록되었습니다.')
                closeNewStaffModal()
                await loadStaff()
                
            } catch (error) {
                console.error('직원 등록 오류:', error)
                alert('직원 등록에 실패했습니다: ' + (error.response?.data?.error || error.message))
            }
        }

        // 일일 마감 뷰 로드
        async function loadClosing() {
            // 오늘 날짜를 기본값으로 설정
            const today = new Date().toISOString().split('T')[0]
            document.getElementById('closing-date').value = today
            
            // 오늘 데이터 자동 로드
            await loadClosingData()
        }

        // 일일 마감 데이터 조회
        async function loadClosingData() {
            try {
                const date = document.getElementById('closing-date').value
                if (!date) {
                    alert('날짜를 선택해주세요.')
                    return
                }

                const response = await axios.get(\`\${API_BASE}/closing?date=\${date}\`)
                const data = response.data

                // 티켓 통계
                document.getElementById('closing-total-tickets').textContent = \`\${data.ticket_stats.total_tickets || 0}건\`
                document.getElementById('closing-completed-tickets').textContent = \`\${data.ticket_stats.completed_tickets || 0}건\`
                const pendingTickets = (data.ticket_stats.total_tickets || 0) - (data.ticket_stats.completed_tickets || 0)
                document.getElementById('closing-pending-tickets').textContent = \`\${pendingTickets}건\`

                // 포인트 통계
                document.getElementById('closing-earned-points').textContent = \`\${Number(data.point_stats.earned_points || 0).toLocaleString()}원\`
                document.getElementById('closing-used-points').textContent = \`\${Number(data.point_stats.used_points || 0).toLocaleString()}원\`
                document.getElementById('closing-net-points').textContent = \`\${Number(data.point_stats.net_points || 0).toLocaleString()}원\`

                // 배팅 통계
                document.getElementById('closing-bet-amount').textContent = \`\${Number(data.betting_stats.total_bet_amount || 0).toLocaleString()}원\`
                document.getElementById('closing-win-amount').textContent = \`\${Number(data.betting_stats.total_win_amount || 0).toLocaleString()}원\`
                document.getElementById('closing-bet-margin').textContent = \`\${Number(data.betting_stats.bet_margin || 0).toLocaleString()}원\`

                // 도서 판매 통계
                document.getElementById('closing-book-orders').textContent = \`\${data.book_stats.book_orders || 0}건\`
                document.getElementById('closing-book-sales').textContent = \`\${Number(data.book_stats.total_sales || 0).toLocaleString()}원\`
                document.getElementById('closing-book-shipped').textContent = \`\${data.book_stats.shipped_orders || 0}건\`
                document.getElementById('closing-book-pending').textContent = \`\${data.book_stats.pending_orders || 0}건\`

                // 종합 요약
                document.getElementById('closing-total-revenue').textContent = \`\${Number(data.summary.total_revenue || 0).toLocaleString()}원\`
                document.getElementById('closing-total-margin').textContent = \`\${Number(data.summary.total_margin || 0).toLocaleString()}원\`
                
                // 마감 상태 표시
                if (data.is_closed) {
                    document.getElementById('closing-status').innerHTML = \`
                        <div class="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded">
                            <i class="fas fa-check-circle mr-2"></i>
                            \${data.closed_at ? new Date(data.closed_at).toLocaleString() : ''} 마감 완료
                            \${data.closed_by ? \` (담당: \${data.closed_by})\` : ''}
                        </div>
                    \`
                    document.getElementById('execute-closing-btn').disabled = true
                    document.getElementById('execute-closing-btn').classList.add('opacity-50', 'cursor-not-allowed')
                } else {
                    document.getElementById('closing-status').innerHTML = \`
                        <div class="bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-3 rounded">
                            <i class="fas fa-exclamation-triangle mr-2"></i>
                            아직 마감되지 않았습니다.
                        </div>
                    \`
                    document.getElementById('execute-closing-btn').disabled = false
                    document.getElementById('execute-closing-btn').classList.remove('opacity-50', 'cursor-not-allowed')
                }

            } catch (error) {
                console.error('마감 데이터 조회 오류:', error)
                alert('마감 데이터를 불러올 수 없습니다.')
            }
        }

        // 일일 마감 실행
        async function executeClosing() {
            try {
                const date = document.getElementById('closing-date').value
                if (!date) {
                    alert('날짜를 선택해주세요.')
                    return
                }

                if (!confirm(\`\${date} 일일 마감을 실행하시겠습니까?\\n\\n마감 후에는 수정할 수 없습니다.\`)) {
                    return
                }

                const notes = prompt('마감 메모를 입력하세요 (선택사항):')

                const response = await axios.post(\`\${API_BASE}/closing\`, {
                    date: date,
                    closed_by: currentStaff.id,
                    notes: notes || ''
                })

                alert('일일 마감이 완료되었습니다.')
                await loadClosingData()

            } catch (error) {
                console.error('마감 실행 오류:', error)
                const errorMsg = error.response?.data?.error || '마감 실행 중 오류가 발생했습니다.'
                alert(errorMsg)
            }
        }

        // 일일 마감 리포트 인쇄
        function printClosingReport() {
            const date = document.getElementById('closing-date').value
            if (!date) {
                alert('날짜를 선택해주세요.')
                return
            }
            
            const printWindow = window.open('', '', 'width=800,height=600')
            const content = \`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>일일 마감 리포트 - \${date}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        h1 { text-align: center; color: #333; }
                        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                        th { background-color: #f4f4f4; font-weight: bold; }
                        .summary { background-color: #e8f4f8; }
                        .total { background-color: #4299e1; color: white; font-weight: bold; }
                        @media print {
                            button { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <h1>📊 일일 마감 리포트</h1>
                    <p style="text-align: center; color: #666;">마감 일자: \${date}</p>
                    
                    <h2>티켓 처리 현황</h2>
                    <table>
                        <tr><th>항목</th><th>수량</th></tr>
                        <tr><td>총 티켓 수</td><td>\${document.getElementById('closing-total-tickets').textContent}</td></tr>
                        <tr><td>처리 완료</td><td>\${document.getElementById('closing-completed-tickets').textContent}</td></tr>
                        <tr><td>미처리</td><td>\${document.getElementById('closing-pending-tickets').textContent}</td></tr>
                    </table>
                    
                    <h2>포인트 현황</h2>
                    <table>
                        <tr><th>항목</th><th>금액</th></tr>
                        <tr><td>포인트 적립</td><td>\${document.getElementById('closing-earned-points').textContent}</td></tr>
                        <tr><td>포인트 사용</td><td>\${document.getElementById('closing-used-points').textContent}</td></tr>
                        <tr class="summary"><td>순 포인트</td><td>\${document.getElementById('closing-net-points').textContent}</td></tr>
                    </table>
                    
                    <h2>배팅 현황</h2>
                    <table>
                        <tr><th>항목</th><th>금액</th></tr>
                        <tr><td>배팅 금액</td><td>\${document.getElementById('closing-bet-amount').textContent}</td></tr>
                        <tr><td>당첨 금액</td><td>\${document.getElementById('closing-win-amount').textContent}</td></tr>
                        <tr class="summary"><td>배팅 마진</td><td>\${document.getElementById('closing-bet-margin').textContent}</td></tr>
                    </table>
                    
                    <h2>도서 판매 현황</h2>
                    <table>
                        <tr><th>항목</th><th>수량/금액</th></tr>
                        <tr><td>주문 건수</td><td>\${document.getElementById('closing-book-orders').textContent}</td></tr>
                        <tr><td>판매 금액</td><td>\${document.getElementById('closing-book-sales').textContent}</td></tr>
                        <tr><td>발송 완료</td><td>\${document.getElementById('closing-book-shipped').textContent}</td></tr>
                        <tr><td>미발송</td><td>\${document.getElementById('closing-book-pending').textContent}</td></tr>
                    </table>
                    
                    <h2>종합 요약</h2>
                    <table>
                        <tr class="total"><th>항목</th><th>금액</th></tr>
                        <tr><td><strong>총 매출</strong></td><td><strong>\${document.getElementById('closing-total-revenue').textContent}</strong></td></tr>
                        <tr><td><strong>총 마진</strong></td><td><strong>\${document.getElementById('closing-total-margin').textContent}</strong></td></tr>
                    </table>
                    
                    <p style="text-align: center; margin-top: 40px; color: #999;">
                        생성 일시: \${new Date().toLocaleString()}<br>
                        EXIT System - 엑시트 관리 시스템
                    </p>
                    
                    <div style="text-align: center; margin-top: 20px;">
                        <button onclick="window.print()" style="padding: 10px 20px; background: #4299e1; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            인쇄하기
                        </button>
                        <button onclick="window.close()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
                            닫기
                        </button>
                    </div>
                </body>
                </html>
            \`
            
            printWindow.document.write(content)
            printWindow.document.close()
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
                'MEMBER': '회원 관리'
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

        // 경기 관리 모달 열기
        async function showMatchManagementModal() {
            document.getElementById('match-management-modal').classList.remove('hidden')
            await loadMatchManagement()
        }

        // 경기 관리 모달 닫기
        function closeMatchManagementModal() {
            document.getElementById('match-management-modal').classList.add('hidden')
        }

        // 경기 관리 목록 로드
        async function loadMatchManagement() {
            try {
                const response = await axios.get(\`\${API_BASE}/betting/matches\`)
                const matches = response.data.matches || []

                const html = matches.map((m, index) => \`
                    <div class="border rounded p-4 bg-gray-50" data-match-id="\${m.id || 'new-' + index}">
                        <div class="grid grid-cols-12 gap-4 items-center">
                            <div class="col-span-3">
                                <label class="text-xs text-gray-600">경기명</label>
                                <input type="text" class="w-full px-2 py-1 border rounded text-sm" 
                                       value="\${m.match_name || ''}" data-field="match_name">
                            </div>
                            <div class="col-span-2">
                                <label class="text-xs text-gray-600">홈팀</label>
                                <input type="text" class="w-full px-2 py-1 border rounded text-sm" 
                                       value="\${m.home_team || ''}" data-field="home_team">
                            </div>
                            <div class="col-span-2">
                                <label class="text-xs text-gray-600">원정팀</label>
                                <input type="text" class="w-full px-2 py-1 border rounded text-sm" 
                                       value="\${m.away_team || ''}" data-field="away_team">
                            </div>
                            <div class="col-span-2">
                                <label class="text-xs text-gray-600">경기일시</label>
                                <input type="datetime-local" class="w-full px-2 py-1 border rounded text-sm" 
                                       value="\${m.match_date ? new Date(m.match_date).toISOString().slice(0, 16) : ''}" data-field="match_date">
                            </div>
                            <div class="col-span-1">
                                <label class="text-xs text-gray-600">홈승 배당</label>
                                <input type="number" step="0.01" class="w-full px-2 py-1 border rounded text-sm" 
                                       value="\${m.home_odds || ''}" data-field="home_odds" placeholder="1.50">
                            </div>
                            <div class="col-span-1">
                                <label class="text-xs text-gray-600">무승부 배당</label>
                                <input type="number" step="0.01" class="w-full px-2 py-1 border rounded text-sm" 
                                       value="\${m.draw_odds || ''}" data-field="draw_odds" placeholder="3.20">
                            </div>
                            <div class="col-span-1">
                                <label class="text-xs text-gray-600">원정승 배당</label>
                                <input type="number" step="0.01" class="w-full px-2 py-1 border rounded text-sm" 
                                       value="\${m.away_odds || ''}" data-field="away_odds" placeholder="2.10">
                            </div>
                        </div>
                        <div class="flex justify-end mt-2 space-x-2">
                            \${m.id && isAdmin() ? \`<button onclick="deleteMatch(\${m.id})" class="btn btn-danger btn-sm">삭제</button>\` : ''}
                        </div>
                    </div>
                \`).join('')

                document.getElementById('match-management-list').innerHTML = html || '<p class="text-gray-500 text-center py-4">등록된 경기가 없습니다.</p>'
            } catch (error) {
                console.error('경기 관리 목록 로드 오류:', error)
            }
        }

        // 경기 추가 행
        function addMatchRow() {
            const list = document.getElementById('match-management-list')
            const newIndex = list.children.length
            const html = \`
                <div class="border rounded p-4 bg-white" data-match-id="new-\${newIndex}">
                    <div class="grid grid-cols-12 gap-4 items-center">
                        <div class="col-span-3">
                            <label class="text-xs text-gray-600">경기명</label>
                            <input type="text" class="w-full px-2 py-1 border rounded text-sm" 
                                   data-field="match_name" placeholder="예: 맨체스터 유나이티드 vs 리버풀">
                        </div>
                        <div class="col-span-2">
                            <label class="text-xs text-gray-600">홈팀</label>
                            <input type="text" class="w-full px-2 py-1 border rounded text-sm" 
                                   data-field="home_team" placeholder="홈팀명">
                        </div>
                        <div class="col-span-2">
                            <label class="text-xs text-gray-600">원정팀</label>
                            <input type="text" class="w-full px-2 py-1 border rounded text-sm" 
                                   data-field="away_team" placeholder="원정팀명">
                        </div>
                        <div class="col-span-2">
                            <label class="text-xs text-gray-600">경기일시</label>
                            <input type="datetime-local" class="w-full px-2 py-1 border rounded text-sm" 
                                   data-field="match_date">
                        </div>
                        <div class="col-span-1">
                            <label class="text-xs text-gray-600">홈승 배당</label>
                            <input type="number" step="0.01" class="w-full px-2 py-1 border rounded text-sm" 
                                   data-field="home_odds" placeholder="1.50">
                        </div>
                        <div class="col-span-1">
                            <label class="text-xs text-gray-600">무승부 배당</label>
                            <input type="number" step="0.01" class="w-full px-2 py-1 border rounded text-sm" 
                                   data-field="draw_odds" placeholder="3.20">
                        </div>
                        <div class="col-span-1">
                            <label class="text-xs text-gray-600">원정승 배당</label>
                            <input type="number" step="0.01" class="w-full px-2 py-1 border rounded text-sm" 
                                   data-field="away_odds" placeholder="2.10">
                        </div>
                    </div>
                    <div class="flex justify-end mt-2">
                        <button onclick="this.parentElement.parentElement.remove()" class="btn btn-danger btn-sm">제거</button>
                    </div>
                </div>
            \`
            list.insertAdjacentHTML('beforeend', html)
        }

        // 모든 경기 저장
        async function saveAllMatches() {
            try {
                const matchDivs = document.querySelectorAll('#match-management-list > div')
                const matches = []

                matchDivs.forEach(div => {
                    const matchId = div.dataset.matchId
                    const match = { id: matchId.startsWith('new-') ? null : parseInt(matchId) }

                    div.querySelectorAll('[data-field]').forEach(input => {
                        const field = input.dataset.field
                        match[field] = input.value
                    })

                    // 필수 필드 검증
                    if (match.match_name && match.home_team && match.away_team && match.match_date) {
                        matches.push(match)
                    }
                })

                if (matches.length === 0) {
                    alert('저장할 경기가 없습니다.')
                    return
                }

                // 일괄 저장
                await axios.post(\`\${API_BASE}/betting/matches/bulk\`, { matches })
                alert('경기가 저장되었습니다.')
                closeMatchManagementModal()
                await loadBetting()
            } catch (error) {
                console.error('경기 저장 오류:', error)
                alert('경기 저장 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 경기 삭제
        async function deleteMatch(matchId) {
            if (!isAdmin()) {
                alert('경기 삭제는 관리자만 가능합니다.')
                return
            }
            
            if (!confirm('이 경기를 삭제하시겠습니까?')) return

            try {
                await axios.delete(\`\${API_BASE}/betting/matches/\` + matchId)
                alert('경기가 삭제되었습니다.')
                await loadMatchManagement()
            } catch (error) {
                console.error('경기 삭제 오류:', error)
                alert('경기 삭제 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 경기 정산 모달 열기
        async function showMatchSettlementModal() {
            document.getElementById('match-settlement-modal').classList.remove('hidden')
            await loadCompletedMatches()
        }

        // 경기 정산 모달 닫기
        function closeMatchSettlementModal() {
            document.getElementById('match-settlement-modal').classList.add('hidden')
        }

        // 완료된 경기 목록 로드 및 정산 통계
        async function loadCompletedMatches() {
            try {
                const [matchesRes, statsRes] = await Promise.all([
                    axios.get(\`\${API_BASE}/betting/matches?status=completed\`),
                    axios.get(\`\${API_BASE}/betting/settlement-stats\`)
                ])

                const matches = matchesRes.data.matches || []
                const stats = statsRes.data

                // 완료된 경기 목록
                const html = matches.length > 0 ? matches.map(m => \`
                    <div class="bg-white border p-4 rounded">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <p class="font-bold text-lg">\${m.match_name}</p>
                                <p class="text-sm text-gray-600">\${m.home_team} vs \${m.away_team}</p>
                                <p class="text-xs text-gray-500 mt-1">\${new Date(m.match_date).toLocaleString()}</p>
                            </div>
                            <div class="text-right">
                                <span class="status-badge status-\${m.status}">\${getStatusText(m.status)}</span>
                                <p class="text-sm mt-2">결과: <strong>\${getBetTypeText(m.result)}</strong></p>
                            </div>
                        </div>
                        <div class="mt-3 grid grid-cols-3 gap-2 text-sm">
                            <div class="bg-blue-50 p-2 rounded">
                                <p class="text-xs text-gray-600">총 배팅금</p>
                                <p class="font-bold text-blue-600">\${(m.total_bet_amount || 0).toLocaleString()}원</p>
                            </div>
                            <div class="bg-green-50 p-2 rounded">
                                <p class="text-xs text-gray-600">당첨금</p>
                                <p class="font-bold text-green-600">\${(m.total_win_amount || 0).toLocaleString()}원</p>
                            </div>
                            <div class="bg-purple-50 p-2 rounded">
                                <p class="text-xs text-gray-600">수익</p>
                                <p class="font-bold text-purple-600">\${((m.total_bet_amount || 0) - (m.total_win_amount || 0)).toLocaleString()}원</p>
                            </div>
                        </div>
                    </div>
                \`).join('') : '<p class="text-gray-500 text-center py-4">완료된 경기가 없습니다.</p>'

                document.getElementById('completed-matches-list').innerHTML = html

                // 정산 통계
                document.getElementById('settlement-total-bet').textContent = (stats.total_bet || 0).toLocaleString() + '원'
                document.getElementById('settlement-total-win').textContent = (stats.total_win || 0).toLocaleString() + '원'
                document.getElementById('settlement-net-profit').textContent = ((stats.total_bet || 0) - (stats.total_win || 0)).toLocaleString() + '원'
            } catch (error) {
                console.error('완료된 경기 로드 오류:', error)
            }
        }

        // 경기 상세 정산 보기
        async function viewMatchSettlement(matchId) {
            // TODO: 경기별 상세 정산 정보를 표시하는 모달이나 페이지로 이동
            alert('경기 상세 정산 화면 (구현 예정)')
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
        // 신규 배팅 등록 모달 (티켓 상세에서 배팅 등록과 동일)
        function showNewBettingModal() {
            alert('배팅은 티켓 상세 화면에서 등록할 수 있습니다.\\n\\n티켓 관리 → 티켓 선택 → 배팅 탭에서 등록해주세요.')
        }

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
                data.over_line = parseFloat(document.getElementById('over-under-line').value) || 2.5
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
        let currentTicket = null
        let selectedMatches = [] // 다폴더용 선택된 경기들

        // 티켓 이미지 뷰어 관련 변수
        let currentMailImages = [] // 현재 티켓의 이미지 목록
        let currentImageIndex = 0 // 현재 보고 있는 이미지 인덱스
        let imageRotation = 0 // 현재 회전 각도
        let imageScale = 1.0 // 현재 줌 배율
        
        // 드래그(Pan) 관련 변수
        let isPanning = false
        let panStartX = 0
        let panStartY = 0
        let panOffsetX = 0
        let panOffsetY = 0
        
        // 전체화면 모드 변수
        let isFullscreen = false

        // 이미지 뷰어 초기화
        function initMailImageViewer(images) {
            currentMailImages = images || []
            currentImageIndex = 0
            imageRotation = 0
            imageScale = 1.0
            panOffsetX = 0
            panOffsetY = 0

            const container = document.getElementById('mail-image-container')
            const noImages = document.getElementById('no-mail-images')

            if (!currentMailImages || currentMailImages.length === 0) {
                container.classList.add('hidden')
                noImages.classList.remove('hidden')
                return
            }

            container.classList.remove('hidden')
            noImages.classList.add('hidden')

            // 이벤트 리스너 등록
            setupImageViewerEvents()
            
            // 썸네일 생성
            renderThumbnails()
            // 첫 번째 이미지 표시
            showMailImageAtIndex(0)
        }

        // 썸네일 렌더링
        function renderThumbnails() {
            const thumbnailsContainer = document.getElementById('mail-thumbnails')
            thumbnailsContainer.innerHTML = ''

            currentMailImages.forEach((imageKey, index) => {
                const thumbnail = document.createElement('div')
                thumbnail.className = \`w-16 h-16 border-2 rounded cursor-pointer overflow-hidden \${index === currentImageIndex ? 'border-blue-500' : 'border-gray-300'}\`
                thumbnail.onclick = () => showMailImageAtIndex(index)

                const img = document.createElement('img')
                img.src = \`\${API_BASE}/mailroom/image/\${imageKey}\`
                img.className = 'w-full h-full object-cover'
                img.alt = \`썸네일 \${index + 1}\`

                thumbnail.appendChild(img)
                thumbnailsContainer.appendChild(thumbnail)
            })
        }

        // 특정 인덱스의 이미지 표시
        function showMailImageAtIndex(index) {
            if (index < 0 || index >= currentMailImages.length) return

            currentImageIndex = index
            imageRotation = 0
            imageScale = 1.0
            panOffsetX = 0
            panOffsetY = 0

            const imageKey = currentMailImages[index]
            const imgElement = document.getElementById('current-mail-image')
            imgElement.src = \`\${API_BASE}/mailroom/image/\${imageKey}\`
            imgElement.style.transform = 'rotate(0deg) scale(1)'
            imgElement.style.cursor = 'default'

            // 카운터 업데이트
            document.getElementById('image-counter').textContent = \`\${index + 1}/\${currentMailImages.length}\`

            // 버튼 상태 업데이트
            document.getElementById('prev-image-btn').disabled = (index === 0)
            document.getElementById('next-image-btn').disabled = (index === currentMailImages.length - 1)

            // 썸네일 업데이트
            renderThumbnails()
        }

        // 이전 이미지
        function prevMailImage() {
            if (currentImageIndex > 0) {
                showMailImageAtIndex(currentImageIndex - 1)
            }
        }

        // 다음 이미지
        function nextMailImage() {
            if (currentImageIndex < currentMailImages.length - 1) {
                showMailImageAtIndex(currentImageIndex + 1)
            }
        }

        // 이미지 회전
        function rotateMailImage(degrees) {
            imageRotation = (imageRotation + degrees) % 360
            updateImageTransform()
        }

        // 이미지 줌
        function zoomMailImage(direction) {
            if (direction === 'in') {
                imageScale = Math.min(imageScale * 1.2, 3.0)
            } else if (direction === 'out') {
                imageScale = Math.max(imageScale / 1.2, 0.5)
            }
            updateImageTransformAdvanced()
        }

        // 이미지 초기화
        function resetMailImage() {
            imageRotation = 0
            imageScale = 1.0
            panOffsetX = 0
            panOffsetY = 0
            updateImageTransformAdvanced()
        }

        // Transform 업데이트
        function updateImageTransform() {
            const imgElement = document.getElementById('current-mail-image')
            imgElement.style.transform = \`rotate(\${imageRotation}deg) scale(\${imageScale})\`
        }

        // 이벤트 리스너 설정
        function setupImageViewerEvents() {
            const imgElement = document.getElementById('current-mail-image')
            if (!imgElement) return

            // 드래그(Pan) 이벤트
            imgElement.addEventListener('mousedown', handlePanStart)
            document.addEventListener('mousemove', handlePanMove)
            document.addEventListener('mouseup', handlePanEnd)

            // 마우스 휠 줌
            imgElement.addEventListener('wheel', handleWheelZoom, { passive: false })

            // 더블클릭 줌 토글
            imgElement.addEventListener('dblclick', handleDoubleClickZoom)

            // 키보드 단축키 (티켓 모달이 열려있을 때만)
            document.addEventListener('keydown', handleImageViewerKeyboard)
        }

        // 드래그 시작
        function handlePanStart(e) {
            if (imageScale <= 1.0) return // 줌이 1배 이하면 드래그 불가
            
            isPanning = true
            panStartX = e.clientX - panOffsetX
            panStartY = e.clientY - panOffsetY
            e.target.style.cursor = 'grabbing'
        }

        // 드래그 이동
        function handlePanMove(e) {
            if (!isPanning) return
            
            e.preventDefault()
            panOffsetX = e.clientX - panStartX
            panOffsetY = e.clientY - panStartY
            
            updateImageTransformAdvanced()
        }

        // 드래그 종료
        function handlePanEnd(e) {
            if (!isPanning) return
            
            isPanning = false
            const imgElement = document.getElementById('current-mail-image')
            if (imgElement) {
                imgElement.style.cursor = imageScale > 1.0 ? 'grab' : 'default'
            }
        }

        // 마우스 휠 줌
        function handleWheelZoom(e) {
            const modalVisible = !document.getElementById('ticket-detail-modal').classList.contains('hidden')
            if (!modalVisible) return
            
            e.preventDefault()
            
            const delta = e.deltaY > 0 ? -1 : 1
            const zoomFactor = 1.1
            
            if (delta > 0) {
                imageScale = Math.min(imageScale * zoomFactor, 3.0)
            } else {
                imageScale = Math.max(imageScale / zoomFactor, 0.5)
            }
            
            updateImageTransformAdvanced()
        }

        // 더블클릭 줌 토글
        function handleDoubleClickZoom(e) {
            e.preventDefault()
            
            if (imageScale === 1.0) {
                imageScale = 2.0
            } else {
                imageScale = 1.0
                panOffsetX = 0
                panOffsetY = 0
            }
            
            updateImageTransformAdvanced()
        }

        // 키보드 단축키
        function handleImageViewerKeyboard(e) {
            const modalVisible = !document.getElementById('ticket-detail-modal').classList.contains('hidden')
            if (!modalVisible) return
            
            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault()
                    prevMailImage()
                    break
                case 'ArrowRight':
                    e.preventDefault()
                    nextMailImage()
                    break
                case '+':
                case '=':
                    e.preventDefault()
                    zoomMailImage('in')
                    break
                case '-':
                case '_':
                    e.preventDefault()
                    zoomMailImage('out')
                    break
                case '0':
                    e.preventDefault()
                    resetMailImage()
                    break
                case 'f':
                case 'F':
                    e.preventDefault()
                    toggleFullscreen()
                    break
                case 'Escape':
                    if (isFullscreen) {
                        e.preventDefault()
                        toggleFullscreen()
                    }
                    break
            }
        }

        // Transform 업데이트 (Pan 포함)
        function updateImageTransformAdvanced() {
            const imgElement = document.getElementById('current-mail-image')
            imgElement.style.transform = \`rotate(\${imageRotation}deg) scale(\${imageScale}) translate(\${panOffsetX / imageScale}px, \${panOffsetY / imageScale}px)\`
            imgElement.style.cursor = imageScale > 1.0 ? 'grab' : 'default'
        }

        // 전체화면 토글
        function toggleFullscreen() {
            const modal = document.getElementById('ticket-detail-modal')
            
            if (!isFullscreen) {
                // 전체화면 진입
                modal.classList.remove('p-4')
                modal.querySelector('.bg-white').classList.remove('max-w-[95vw]', 'h-[90vh]')
                modal.querySelector('.bg-white').classList.add('w-screen', 'h-screen')
                isFullscreen = true
            } else {
                // 전체화면 종료
                modal.classList.add('p-4')
                modal.querySelector('.bg-white').classList.add('max-w-[95vw]', 'h-[90vh]')
                modal.querySelector('.bg-white').classList.remove('w-screen', 'h-screen')
                isFullscreen = false
            }
        }


        async function showTicketDetail(ticketId) {
            currentTicketId = ticketId
            
            try {
                const [ticketRes, staffRes] = await Promise.all([
                    axios.get(\`\${API_BASE}/tickets/\${ticketId}\`),
                    axios.get(\`\${API_BASE}/staff\`)
                ])

                const ticket = ticketRes.data.ticket
                currentTicket = ticket // 전역 변수에 저장
                const staffList = staffRes.data.staff || []

                // 티켓 기본 정보 (헤더)
                document.getElementById('modal-ticket-number').textContent = ticket.ticket_number
                document.getElementById('modal-ticket-title').textContent = ticket.title
                document.getElementById('modal-ticket-member').textContent = ticket.member_name || '-'

                // 티켓 정보 탭 상세
                document.getElementById('detail-ticket-number').textContent = ticket.ticket_number
                document.getElementById('detail-ticket-title').textContent = ticket.title
                document.getElementById('detail-ticket-type').textContent = getTicketTypeText(ticket.ticket_type)
                document.getElementById('detail-ticket-status').innerHTML = \`<span class="status-badge status-\${ticket.status}">\${getStatusText(ticket.status)}</span>\`
                document.getElementById('detail-ticket-priority').innerHTML = getPriorityBadge(ticket.priority)
                document.getElementById('detail-ticket-member-name').textContent = ticket.member_name || '-'
                document.getElementById('detail-ticket-assigned').textContent = ticket.assigned_to_name || '미배정'
                document.getElementById('detail-ticket-created').textContent = new Date(ticket.created_at).toLocaleString()
                document.getElementById('detail-ticket-description').textContent = ticket.description || '설명 없음'

                // 상태 변경 폼
                document.getElementById('update-ticket-status').value = ticket.status
                document.getElementById('update-ticket-priority').value = ticket.priority
                
                const assignedSelect = document.getElementById('update-ticket-assigned')
                assignedSelect.innerHTML = '<option value="">미배정</option>' + 
                    staffList.map(s => \`<option value="\${s.id}" \${ticket.assigned_to === s.id ? 'selected' : ''}>\${s.name} (\${s.role === 'admin' ? '관리자' : '직원'})</option>\`).join('')

                // 회원 관리 카드 렌더링
                const memberManagementCard = document.getElementById('member-management-card')
                if (memberManagementCard) {
                    if (!ticket.member_name) {
                        // 미지정 회원: 신규 등록 버튼 표시
                        memberManagementCard.innerHTML = \`
                            <div class="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                                <div class="flex items-center justify-between mb-3">
                                    <h3 class="font-semibold text-gray-800">
                                        <i class="fas fa-user-tag mr-2 text-orange-500"></i>
                                        회원 정보
                                    </h3>
                                    <span class="text-sm text-orange-600 font-medium">
                                        <i class="fas fa-exclamation-triangle mr-1"></i>
                                        미지정
                                    </span>
                                </div>
                                <div class="text-sm text-gray-600 mb-4">
                                    <i class="fas fa-info-circle mr-1"></i>
                                    회원이 지정되지 않았습니다.
                                </div>
                                <div class="flex gap-2">
                                    <button onclick="openNewMemberRegistration()" 
                                            class="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition text-sm">
                                        <i class="fas fa-user-plus mr-1"></i>
                                        신규 회원 등록
                                    </button>
                                    <button onclick="openChangeMemberModal()" 
                                            class="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm">
                                        <i class="fas fa-exchange-alt mr-1"></i>
                                        기존 회원 선택
                                    </button>
                                </div>
                            </div>
                        \`
                    } else {
                        // 기존 회원: 정보 표시 + 회원 변경 + 회원 정보 수정 버튼
                        memberManagementCard.innerHTML = \`
                            <div class="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                                <div class="flex items-center justify-between mb-3">
                                    <h3 class="font-semibold text-gray-800">
                                        <i class="fas fa-user-check mr-2 text-green-500"></i>
                                        회원 정보
                                    </h3>
                                    <span class="text-sm text-green-600 font-medium">
                                        <i class="fas fa-check-circle mr-1"></i>
                                        등록 완료
                                    </span>
                                </div>
                                <div class="space-y-2 mb-4">
                                    <div class="flex items-start">
                                        <span class="text-sm text-gray-500 w-20">이름</span>
                                        <span class="text-sm text-gray-800 font-medium">\${ticket.member_name}</span>
                                    </div>
                                    \${ticket.member_number ? \`
                                        <div class="flex items-start">
                                            <span class="text-sm text-gray-500 w-20">수용번호</span>
                                            <span class="text-sm text-gray-800">\${ticket.member_number}</span>
                                        </div>
                                    \` : ''}
                                    \${ticket.institution ? \`
                                        <div class="flex items-start">
                                            <span class="text-sm text-gray-500 w-20">수용기관</span>
                                            <span class="text-sm text-gray-800">\${ticket.institution}</span>
                                        </div>
                                    \` : ''}
                                </div>
                                <div class="flex gap-2">
                                    <button onclick="openChangeMemberModal()" 
                                            class="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm">
                                        <i class="fas fa-exchange-alt mr-1"></i>
                                        회원 변경
                                    </button>
                                    <button onclick="showEditMemberModal(\${ticket.member_id})" 
                                            class="flex-1 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition text-sm">
                                        <i class="fas fa-edit mr-1"></i>
                                        정보 수정
                                    </button>
                                </div>
                            </div>
                        \`
                    }
                }

                // 댓글 로드
                await loadTicketComments(ticketId)

                // 경기 데이터는 로드되었지만 요청사항 탭의 배팅 추가 모달에서 사용됨
                // showAddRequestModal('betting')에서 loadMatchesForBetting()를 호출하여 경기 목록 표시

                // 우편물 이미지 로드 (mailroom_id가 있는 경우)
                if (ticket.mailroom_id) {
                    try {
                        const mailRes = await axios.get(\`\${API_BASE}/mailroom/\${ticket.mailroom_id}\`)
                        const mailItem = mailRes.data.mailroom_item
                        
                        if (mailItem && mailItem.image_keys) {
                            // 이미지 뷰어 초기화
                            initMailImageViewer(mailItem.image_keys)
                        } else {
                            initMailImageViewer([])
                        }
                    } catch (error) {
                        console.error('우편물 이미지 로드 오류:', error)
                        initMailImageViewer([])
                    }
                } else {
                    // mailroom_id가 없으면 빈 뷰어
                    initMailImageViewer([])
                }

                document.getElementById('ticket-detail-modal').classList.remove('hidden')
                showTicketTab('info') // 기본 탭: 티켓 정보
            } catch (error) {
                console.error('티켓 상세 로드 오류:', error)
                console.error('에러 상세:', error.response?.data)
                console.error('상태 코드:', error.response?.status)
                const errorMsg = error.response?.data?.error || error.message || '알 수 없는 오류'
                alert(\`티켓 정보를 불러오는데 실패했습니다.\\n\\n오류: \${errorMsg}\`)
            }
        }

        function showTicketTab(tabName) {
            // 탭 버튼 활성화
            document.querySelectorAll('[id^="tab-"]').forEach(btn => {
                btn.classList.remove('border-blue-500', 'text-blue-500')
                btn.classList.add('text-gray-500')
            })
            document.getElementById(\`tab-\${tabName}\`).classList.add('border-blue-500', 'text-blue-500')
            document.getElementById(\`tab-\${tabName}\`).classList.remove('text-gray-500')

            // 탭 콘텐츠 표시
            document.querySelectorAll('[id^="ticket-tab-"]').forEach(tab => {
                tab.classList.add('hidden')
            })
            document.getElementById(\`ticket-tab-\${tabName}\`).classList.remove('hidden')

            // requests 탭이 열리면 티켓 아이템 로드
            if (tabName === 'requests' && currentTicketId) {
                loadTicketItems(currentTicketId)
            }
        }

        async function updateTicketInfo() {
            if (!currentTicketId) return

            const status = document.getElementById('update-ticket-status').value
            const priority = document.getElementById('update-ticket-priority').value
            const assigned_to = document.getElementById('update-ticket-assigned').value || null

            try {
                await axios.patch(\`\${API_BASE}/tickets/\${currentTicketId}\`, {
                    status,
                    priority,
                    assigned_to
                })
                alert('티켓 정보가 업데이트되었습니다.')
                await showTicketDetail(currentTicketId)
                if (currentView === 'tickets') await loadTickets()
            } catch (error) {
                alert('업데이트 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        async function loadTicketComments(ticketId) {
            try {
                const response = await axios.get(\`\${API_BASE}/tickets/\${ticketId}/comments\`)
                const comments = response.data.comments || []

                const commentsHtml = comments.map(c => {
                    const isResponse = c.comment_type === 'response'
                    const bgColor = isResponse ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-gray-50'
                    const typeLabel = isResponse ? '<span class="text-xs bg-blue-600 text-white px-2 py-1 rounded">회원 답변</span>' : '<span class="text-xs bg-gray-500 text-white px-2 py-1 rounded">내부 메모</span>'
                    
                    return \`
                    <div class="\${bgColor} p-3 rounded">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex items-center gap-2">
                                <span class="font-bold">\${c.created_by_name}</span>
                                \${typeLabel}
                                <span class="text-xs text-gray-500">\${new Date(c.created_at).toLocaleString()}</span>
                            </div>
                        </div>
                        <p class="text-gray-800 whitespace-pre-wrap">\${c.content || c.comment}</p>
                    </div>
                \`
                }).join('')

                document.getElementById('comments-list').innerHTML = commentsHtml || 
                    '<p class="text-gray-500 text-center py-4">댓글이 없습니다.</p>'
            } catch (error) {
                console.error('댓글 로드 오류:', error)
                document.getElementById('comments-list').innerHTML = 
                    '<p class="text-red-500 text-center py-4">댓글을 불러올 수 없습니다.</p>'
            }
        }

        async function addComment() {
            if (!currentTicketId) return

            const content = document.getElementById('comment-content').value.trim()
            if (!content) {
                alert('내용을 입력해주세요.')
                return
            }

            const commentType = document.querySelector('input[name="comment-type"]:checked').value

            try {
                await axios.post(\`\${API_BASE}/tickets/\${currentTicketId}/comments\`, {
                    content,
                    created_by: currentStaff.id,
                    comment_type: commentType
                })
                document.getElementById('comment-content').value = ''
                document.getElementById('comment-template').value = ''
                await loadTicketComments(currentTicketId)
                
                if (commentType === 'response') {
                    alert('회원 답변이 저장되었습니다. "답변 일괄 출력"으로 인쇄할 수 있습니다.')
                }
            } catch (error) {
                alert('저장 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        async function addAndNotify() {
            await addComment()
            // TODO: 알림 발송 기능 (향후 구현)
            alert('답변이 저장되었습니다. 알림 발송 기능은 향후 추가 예정입니다.')
        }

        // 답변 템플릿 삽입
        function insertTemplate() {
            const template = document.getElementById('comment-template').value
            const textarea = document.getElementById('comment-content')

            const templates = {
                'order_received': '주문이 정상적으로 접수되었습니다. 빠른 시일 내에 처리하여 발송해드리겠습니다.',
                'order_processing': '주문하신 도서를 현재 처리 중입니다. 조금만 기다려주시기 바랍니다.',
                'order_shipped': '주문하신 도서가 발송되었습니다. 영업일 기준 3-5일 내 도착 예정입니다.',
                'point_adjusted': '포인트 조정이 완료되었습니다. 현재 잔액을 확인해주세요.',
                'inquiry_answer': '문의하신 내용에 대해 답변드립니다.\\\\n\\\\n',
                'need_more_info': '정확한 처리를 위해 추가 정보가 필요합니다. 다음 내용을 확인해주세요:\\\\n\\\\n',
                'completed': '요청하신 사항이 모두 처리 완료되었습니다. 감사합니다.'
            }

            if (template && templates[template]) {
                textarea.value = templates[template]
                textarea.focus()
            }
        }

        function getTicketTypeText(type) {
            const types = {
                'ORDER': '주문',
                'INQUIRY': '문의',
                'PURCHASE_ORDER': '발주',
                'POINT_ADJUSTMENT': '포인트 조정',
                'MEMBER': '회원 관리'
            }
            return types[type] || type
        }

        function getPriorityBadge(priority) {
            const badges = {
                'urgent': '<span class="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">긴급</span>',
                'high': '<span class="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">높음</span>',
                'normal': '<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">보통</span>',
                'low': '<span class="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">낮음</span>'
            }
            return badges[priority] || priority
        }

        // 일괄 답변 출력
        async function printAllResponses() {
            if (!currentTicketId) return

            try {
                const [ticketRes, commentsRes] = await Promise.all([
                    axios.get(\`\${API_BASE}/tickets/\${currentTicketId}\`),
                    axios.get(\`\${API_BASE}/tickets/\${currentTicketId}/comments\`)
                ])

                const ticket = ticketRes.data.ticket
                const comments = commentsRes.data.comments || []
                
                // 회원 답변만 필터링
                const responses = comments.filter(c => c.comment_type === 'response')

                if (responses.length === 0) {
                    alert('출력할 회원 답변이 없습니다.')
                    return
                }

                // 인쇄용 HTML 생성
                const printWindow = window.open('', '_blank', 'width=800,height=600')
                const printContent = \`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <title>답변서 - \${ticket.ticket_number}</title>
                        <style>
                            body {
                                font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
                                padding: 40px;
                                line-height: 1.8;
                            }
                            .header {
                                text-align: center;
                                border-bottom: 3px double #333;
                                padding-bottom: 20px;
                                margin-bottom: 30px;
                            }
                            .header h1 {
                                font-size: 28px;
                                margin: 0 0 10px 0;
                            }
                            .info-section {
                                margin-bottom: 30px;
                                background: #f5f5f5;
                                padding: 15px;
                                border-radius: 5px;
                            }
                            .info-row {
                                display: flex;
                                margin: 5px 0;
                            }
                            .info-label {
                                font-weight: bold;
                                width: 120px;
                            }
                            .response-item {
                                margin: 20px 0;
                                padding: 20px;
                                border: 2px solid #333;
                                border-radius: 5px;
                                page-break-inside: avoid;
                            }
                            .response-header {
                                font-weight: bold;
                                margin-bottom: 10px;
                                color: #0066cc;
                                border-bottom: 1px solid #ddd;
                                padding-bottom: 5px;
                            }
                            .response-content {
                                white-space: pre-wrap;
                                font-size: 15px;
                            }
                            .footer {
                                margin-top: 40px;
                                text-align: right;
                                font-size: 14px;
                            }
                            @media print {
                                body { padding: 20px; }
                                .no-print { display: none; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>답 변 서</h1>
                            <p>티켓번호: \${ticket.ticket_number}</p>
                        </div>

                        <div class="info-section">
                            <div class="info-row">
                                <div class="info-label">회원명:</div>
                                <div>\${ticket.member_name || '-'}</div>
                            </div>
                            <div class="info-row">
                                <div class="info-label">티켓 제목:</div>
                                <div>\${ticket.title}</div>
                            </div>
                            <div class="info-row">
                                <div class="info-label">티켓 유형:</div>
                                <div>\${getTicketTypeText(ticket.ticket_type)}</div>
                            </div>
                            <div class="info-row">
                                <div class="info-label">발행일:</div>
                                <div>\${new Date().toLocaleDateString('ko-KR')}</div>
                            </div>
                        </div>

                        <div class="responses-section">
                            \${responses.map((r, index) => \`
                                <div class="response-item">
                                    <div class="response-header">
                                        답변 \${index + 1} - \${r.created_by_name} (\${new Date(r.created_at).toLocaleString('ko-KR')})
                                    </div>
                                    <div class="response-content">\${r.content || r.comment}</div>
                                </div>
                            \`).join('')}
                        </div>

                        <div class="footer">
                            <p>EXIT 시스템</p>
                            <p>\${new Date().toLocaleDateString('ko-KR')}</p>
                        </div>

                        <div class="no-print" style="text-align: center; margin-top: 30px;">
                            <button onclick="window.print()" style="padding: 10px 30px; font-size: 16px; cursor: pointer;">인쇄</button>
                            <button onclick="window.close()" style="padding: 10px 30px; font-size: 16px; cursor: pointer; margin-left: 10px;">닫기</button>
                        </div>
                    </body>
                    </html>
                \`

                printWindow.document.write(printContent)
                printWindow.document.close()
            } catch (error) {
                console.error('답변 출력 오류:', error)
                alert('답변 출력에 실패했습니다.')
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
                    \`<option value="\${m.id}">\${m.name} (\${m.institution})</option>\`
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

            // 디버깅: 입력값 확인
            console.log('티켓 생성 입력값:', { ticketType, title, description })

            // 필수 항목 검증
            if (!ticketType) {
                alert('티켓 유형을 선택해주세요.')
                return
            }
            
            if (!title || title.trim() === '') {
                alert('제목을 입력해주세요.')
                return
            }

            // 회원 필수 유형 검증
            if (['ORDER', 'POINT_ADJUSTMENT', 'MEMBER'].includes(ticketType) && !memberId) {
                alert('이 유형은 회원 선택이 필수입니다.')
                return
            }

            const data = {
                ticket_type: ticketType,
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
                const ticketResponse = await axios.post(\`\${API_BASE}/tickets\`, data)
                const ticketId = ticketResponse.data.ticket_id

                // 이미지 업로드 처리
                const imageInput = document.getElementById('ticket-images')
                if (imageInput && imageInput.files.length > 0) {
                    const formData = new FormData()
                    for (let i = 0; i < imageInput.files.length; i++) {
                        formData.append('images', imageInput.files[i])
                    }
                    
                    try {
                        await axios.post(\`\${API_BASE}/tickets/\${ticketId}/images\`, formData, {
                            headers: {
                                'Content-Type': 'multipart/form-data'
                            }
                        })
                    } catch (uploadError) {
                        console.error('이미지 업로드 오류:', uploadError)
                        alert('티켓은 생성되었으나 이미지 업로드에 실패했습니다.')
                    }
                }

                alert('티켓이 생성되었습니다.')
                closeNewTicketModal()
                if (currentView === 'tickets') await loadTickets()
                if (currentView === 'dashboard') await loadDashboard()
            } catch (error) {
                alert('티켓 생성 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 회원 등록 모달
        function showNewMemberModal() {
            document.getElementById('new-member-modal').classList.remove('hidden')
        }

        // 티켓 생성에서 회원 등록 모달 열기 (생성 후 자동 선택)
        function showNewMemberModalFromTicket() {
            // 회원 등록 모달 열기
            showNewMemberModal()
            // 티켓 모달은 뒤에 유지
        }

        function closeNewMemberModal() {
            document.getElementById('new-member-modal').classList.add('hidden')
            // 폼 초기화
            document.getElementById('member-name').value = ''
            document.getElementById('member-prison').value = ''
            document.getElementById('member-prisoner-number').value = ''
            document.getElementById('member-address').value = ''
            document.getElementById('member-depositor').value = ''
            // document.getElementById('member-initial-points').value = '0' // 주석처리
            // document.getElementById('member-initial-betting-points').value = '0' // 주석처리
            document.getElementById('member-notes').value = ''
        }

        async function createMember() {
            const name = document.getElementById('member-name').value
            const prisonName = document.getElementById('member-prison').value
            const prisonerNumber = document.getElementById('member-prisoner-number').value
            const address = document.getElementById('member-address').value
            const depositor = document.getElementById('member-depositor').value
            // 초기 포인트는 0으로 설정 (별도 포인트 관리 기능 사용)
            // const initialPoints = parseFloat(document.getElementById('member-initial-points').value) || 0
            // const initialBettingPoints = parseFloat(document.getElementById('member-initial-betting-points').value) || 0
            const notes = document.getElementById('member-notes').value

            // 필수 항목 검증
            if (!name || !prisonName || !prisonerNumber) {
                alert('이름, 교도소, 수감번호는 필수입니다.')
                return
            }

            const data = {
                name: name,
                institution: prisonName,
                inmate_number: prisonerNumber,
                po_box_address: address,
                depositor_name: depositor,
                points: 0, // 초기 포인트는 0
                betting_points: 0, // 초기 배팅 포인트는 0
                notes: notes
            }

            try {
                const response = await axios.post(\`\${API_BASE}/members\`, data)
                const newMemberId = response.data.member_id
                alert('회원이 등록되었습니다.')
                closeNewMemberModal()
                
                // 티켓 모달이 열려있으면 회원 목록 새로고침 및 자동 선택
                const ticketModal = document.getElementById('new-ticket-modal')
                if (ticketModal && !ticketModal.classList.contains('hidden')) {
                    const membersRes = await axios.get(\`\${API_BASE}/members\`)
                    const members = membersRes.data.members || []
                    const memberOptions = members.map(m => 
                        \`<option value="\${m.id}">\${m.name} (\${m.institution})</option>\`
                    ).join('')
                    document.getElementById('ticket-member').innerHTML = '<option value="">선택하세요</option>' + memberOptions
                    // 방금 생성한 회원 자동 선택
                    document.getElementById('ticket-member').value = newMemberId
                }
                
                if (currentView === 'members') await loadMembers()
            } catch (error) {
                alert('회원 등록 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 회원 상세 모달
        async function showMemberDetail(memberId) {
            currentMemberId = memberId // 포인트 조정용 ID 저장
            try {
                const memberRes = await axios.get(\`\${API_BASE}/members/\${memberId}\`)
                const member = memberRes.data.member
                const transactions = memberRes.data.transactions || []
                const tickets = memberRes.data.tickets || []

                // 기본 정보
                document.getElementById('detail-member-name').textContent = member.name
                document.getElementById('detail-member-prison').textContent = member.institution || '미지정'
                document.getElementById('detail-member-name-field').textContent = member.name
                document.getElementById('detail-member-number').textContent = member.member_number || '-'
                document.getElementById('detail-institution').textContent = member.institution || '미지정'
                document.getElementById('detail-inmate-number').textContent = member.inmate_number || '-'
                document.getElementById('detail-address').textContent = member.mailbox_address || member.po_box_address || '-'
                document.getElementById('detail-depositor').textContent = member.depositor_name || '-'
                document.getElementById('detail-created-at').textContent = new Date(member.created_at).toLocaleDateString()
                document.getElementById('detail-status').textContent = member.status === 'active' ? '활성' : '비활성'

                // 포인트 정보
                document.getElementById('detail-points').textContent = member.points.toLocaleString()
                document.getElementById('detail-betting-points').textContent = member.betting_points.toLocaleString()
                document.getElementById('detail-frozen-points').textContent = member.frozen_points.toLocaleString()

                // 포인트 거래 내역
                const transactionsHtml = transactions.length > 0 ? transactions.map(t => \`
                    <div class="flex justify-between items-center py-2 border-b">
                        <div>
                            <p class="text-sm font-medium">\${t.description}</p>
                            <p class="text-xs text-gray-500">\${new Date(t.created_at).toLocaleString()}</p>
                        </div>
                        <div class="text-right">
                            <p class="font-bold \${t.transaction_type === 'earn' ? 'text-green-600' : 'text-red-600'}">
                                \${t.transaction_type === 'earn' ? '+' : '-'}\${t.amount.toLocaleString()}원
                            </p>
                            <p class="text-xs text-gray-500">\${t.point_type === 'betting' ? '배팅' : '일반'}</p>
                        </div>
                    </div>
                \`).join('') : '<p class="text-gray-500 text-sm text-center py-4">거래 내역이 없습니다.</p>'

                document.getElementById('member-point-transactions').innerHTML = transactionsHtml

                // 티켓 이력 (클릭 시 티켓 상세 모달 열림)
                const ticketsHtml = tickets.length > 0 ? tickets.map(t => \`
                    <div class="flex justify-between items-center py-2 border-b hover:bg-gray-50 cursor-pointer transition" 
                         onclick="showTicketDetail(\${t.id})">
                        <div>
                            <p class="text-sm font-medium">\${t.title}</p>
                            <p class="text-xs text-gray-500">\${t.ticket_number} - \${new Date(t.created_at).toLocaleDateString()}</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="status-badge status-\${t.status}">\${getStatusText(t.status)}</span>
                            <i class="fas fa-chevron-right text-gray-400 text-xs"></i>
                        </div>
                    </div>
                \`).join('') : '<p class="text-gray-500 text-sm text-center py-4">티켓 이력이 없습니다.</p>'

                document.getElementById('member-tickets').innerHTML = ticketsHtml

                document.getElementById('member-detail-modal').classList.remove('hidden')
            } catch (error) {
                console.error('회원 상세 로드 오류:', error)
                alert('회원 정보를 불러오는데 실패했습니다.')
            }
        }

        function closeMemberDetail() {
            document.getElementById('member-detail-modal').classList.add('hidden')
        }

        // 포인트 조정 모달
        let currentMemberId = null
        let currentAdjustMode = 'add' // 'add' 또는 'subtract'
        
        function showPointAdjustModal(mode) {
            currentAdjustMode = mode
            const title = mode === 'add' ? '지급' : '차감'
            document.getElementById('point-adjust-title').textContent = title
            document.getElementById('point-adjust-amount').value = ''
            document.getElementById('point-adjust-reason').value = ''
            document.getElementById('point-adjust-modal').classList.remove('hidden')
        }
        
        function closePointAdjustModal() {
            document.getElementById('point-adjust-modal').classList.add('hidden')
        }
        
        async function executePointAdjust() {
            const pointTypeRaw = document.getElementById('point-adjust-type').value
            const amount = parseInt(document.getElementById('point-adjust-amount').value)
            const reason = document.getElementById('point-adjust-reason').value
            
            if (!amount || amount <= 0) {
                alert('금액을 입력해주세요.')
                return
            }
            
            if (!currentMemberId) {
                alert('회원 정보를 찾을 수 없습니다.')
                return
            }
            
            try {
                // API 필드 매핑: UI -> API
                // pointTypeRaw: 'points' -> 'regular', 'betting_points' -> 'betting'
                // currentAdjustMode: 'add' -> 'add', 'subtract' -> 'deduct'
                const pointType = pointTypeRaw === 'points' ? 'regular' : 'betting'
                const transactionType = currentAdjustMode === 'add' ? 'add' : 'deduct'
                
                // 포인트 조정 API 호출 (point_transactions 테이블에 자동 기록)
                await axios.post(\`\${API_BASE}/points/adjust\`, {
                    member_id: currentMemberId,
                    point_type: pointType,
                    transaction_type: transactionType,
                    amount: amount,
                    description: reason || \`관리자 직접 \${currentAdjustMode === 'add' ? '지급' : '차감'} - \${currentStaff.name}\`,
                    created_by: currentStaff.id
                })
                
                alert(\`포인트가 \${currentAdjustMode === 'add' ? '지급' : '차감'}되었습니다.\n거래 내역에 기록되었습니다.\`)
                closePointAdjustModal()
                
                // 회원 정보 새로고침 (거래 내역 포함)
                await showMemberDetail(currentMemberId)
            } catch (error) {
                console.error('포인트 조정 오류:', error)
                alert('포인트 조정 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 우편실 관리
        let uploadedMailImages = [] // 업로드된 이미지 정보 저장

        async function loadMailroom() {
            try {
                await loadPendingMail()
                await loadProcessedMail()
                await loadMailHistory()
            } catch (error) {
                console.error('우편실 로드 오류:', error)
            }
        }

        function showMailroomTab(tab) {
            // 모든 탭 버튼 비활성화
            document.querySelectorAll('[id^="mailroom-tab-"]').forEach(btn => {
                btn.classList.remove('bg-blue-500', 'text-white')
                btn.classList.add('bg-gray-200', 'text-gray-700')
            })

            // 모든 탭 콘텐츠 숨기기
            document.querySelectorAll('.mailroom-tab-content').forEach(content => {
                content.classList.add('hidden')
            })

            // 선택된 탭 활성화
            document.getElementById(\`mailroom-tab-\${tab}\`).classList.remove('bg-gray-200', 'text-gray-700')
            document.getElementById(\`mailroom-tab-\${tab}\`).classList.add('bg-blue-500', 'text-white')
            document.getElementById(\`mailroom-\${tab}-tab\`).classList.remove('hidden')

            // 탭별 데이터 로드
            if (tab === 'receive') loadPendingMail()
            if (tab === 'inspection') loadProcessedMail()
            if (tab === 'history') loadMailHistory()
        }

        // 이미지 압축 함수
        async function compressImage(file, maxWidth = 1920, quality = 0.8) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = (e) => {
                    const img = new Image()
                    img.onload = () => {
                        const canvas = document.createElement('canvas')
                        let width = img.width
                        let height = img.height

                        // 최대 너비 제한
                        if (width > maxWidth) {
                            height = (height * maxWidth) / width
                            width = maxWidth
                        }

                        canvas.width = width
                        canvas.height = height

                        const ctx = canvas.getContext('2d')
                        ctx.drawImage(img, 0, 0, width, height)

                        canvas.toBlob((blob) => {
                            resolve(new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now()
                            }))
                        }, 'image/jpeg', quality)
                    }
                    img.onerror = reject
                    img.src = e.target.result
                }
                reader.onerror = reject
                reader.readAsDataURL(file)
            })
        }


        function displayImagePreviews() {
            const previewContainer = document.getElementById('uploaded-images-preview')
            previewContainer.innerHTML = uploadedMailImages.map((img, index) => \`
                <div class="relative border rounded overflow-hidden">
                    <img src="\${img.url}" alt="\${img.name}" class="w-full h-24 object-cover">
                    <button onclick="removeImage(\${index})" class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            \`).join('')
        }

        // OCR 처리 및 임시 티켓 생성
        async function processImageToTempTicket(imageKey, imageUrl) {
            try {
                // 1. Cloudflare AI로 OCR 처리 (간단하게 텍스트 추출)
                const ocrRes = await axios.post(\`\${API_BASE}/mailroom/ocr-simple\`, {
                    image_key: imageKey
                })
                
                const ocrText = ocrRes.data.text || ''
                
                // 2. 수신자 정보 추출 (간단한 패턴 매칭)
                const receiverInfo = extractReceiverInfo(ocrText)
                
                // 3. 임시 티켓 생성
                const ticketRes = await axios.post(\`\${API_BASE}/tickets\`, {
                    ticket_number: \`TEMP-\${Date.now()}-\${Math.random().toString(36).substr(2, 4)}\`,
                    title: \`[임시] 우편물 - \${receiverInfo.name || '미인식'}\`,
                    description: \`수신자: \${receiverInfo.name || '미인식'}\\n번호: \${receiverInfo.number || '미인식'}\\n기관: \${receiverInfo.institution || '미인식'}\\n\\nOCR 텍스트:\\n\${ocrText}\`,
                    member_id: null,
                    ticket_type: 'MAIL_INSPECTION',
                    status: 'open',
                    priority: 'normal',
                    created_by: currentStaff.id,
                    image_keys: JSON.stringify([imageKey])
                })
                
                return ticketRes.data
            } catch (error) {
                console.error('OCR 처리 오류:', error)
                // 오류 발생해도 일단 빈 티켓 생성
                const ticketRes = await axios.post(\`\${API_BASE}/tickets\`, {
                    ticket_number: \`TEMP-\${Date.now()}-\${Math.random().toString(36).substr(2, 4)}\`,
                    title: '[임시] 우편물 - OCR 실패',
                    description: 'OCR 처리 실패. 수동으로 정보를 입력해주세요.',
                    member_id: null,
                    ticket_type: 'MAIL_INSPECTION',
                    status: 'open',
                    priority: 'high',
                    created_by: currentStaff.id,
                    image_keys: JSON.stringify([imageKey])
                })
                return ticketRes.data
            }
        }

        // 수신자 정보 추출 (간단한 패턴 매칭)
        function extractReceiverInfo(text) {
            const info = {
                name: null,
                number: null,
                institution: null
            }
            
            // 이름 추출 (한글 2-4자)
            const nameMatch = text.match(/[가-힣]{2,4}/)
            if (nameMatch) info.name = nameMatch[0]
            
            // 번호 추출 (숫자 4-8자리)
            const numberMatch = text.match(/\\d{4,8}/)
            if (numberMatch) info.number = numberMatch[0]
            
            // 기관명 추출 (교도소, 구치소 등)
            const institutionMatch = text.match(/([가-힣]+교도소|[가-힣]+구치소|[가-힣]+교정소)/)
            if (institutionMatch) info.institution = institutionMatch[0]
            
            return info
        }

        function removeImage(index) {
            uploadedMailImages.splice(index, 1)
            displayImagePreviews()
            
            if (uploadedMailImages.length === 0) {
                const processBtn = document.getElementById('process-mail-btn')
                const bulkBtn = document.getElementById('bulk-register-btn')
                if (processBtn) processBtn.disabled = true
                if (bulkBtn) bulkBtn.disabled = true
            }
        }

        async function processMailImages() {
            if (uploadedMailImages.length === 0) {
                alert('업로드된 이미지가 없습니다.')
                return
            }

            // 회원 선택 모달 표시 (간단한 prompt로 대체)
            const memberId = prompt('회원 ID를 입력하세요 (선택사항, 입력하지 않으면 나중에 배당 가능):')

            try {
                const imageKeys = uploadedMailImages.map(img => img.key)
                
                // 우편물 등록
                const res = await axios.post(\`\${API_BASE}/mailroom\`, {
                    member_id: memberId || null,
                    image_keys: imageKeys,
                    notes: '',
                    created_by: currentStaff.id
                })

                const mailroomId = res.data.mailroom_id

                // OCR 처리 시작
                await axios.post(\`\${API_BASE}/mailroom/\${mailroomId}/ocr\`)

                alert('우편물이 등록되고 OCR 처리가 시작되었습니다.')
                
                // 초기화
                uploadedMailImages = []
                displayImagePreviews()
                document.getElementById('mail-images').value = ''
                const processBtn = document.getElementById('process-mail-btn')
                if (processBtn) processBtn.disabled = true
                
                // 목록 새로고침
                await loadPendingMail()
                await loadProcessedMail()
            } catch (error) {
                console.error('우편물 처리 오류:', error)
                alert('우편물 처리 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        let allMembers = [] // 전체 회원 목록 캐시

        async function showBulkRegisterModal() {
            if (uploadedMailImages.length === 0) {
                alert('업로드된 이미지가 없습니다.')
                return
            }

            try {
                // 회원 목록 로드
                const res = await axios.get(\`\${API_BASE}/members\`)
                allMembers = res.data.members || []

                // 모달에 이미지별 회원 선택 UI 생성
                const container = document.getElementById('bulk-register-items')
                container.innerHTML = uploadedMailImages.map((img, index) => {
                    const memberOptions = allMembers.map(m => 
                        \`<option value="\${m.id}">\${m.name} (\${m.member_number}) - \${m.institution}</option>\`
                    ).join('')
                    
                    return \`
                    <div class="border rounded p-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <img src="\${img.url}" alt="\${img.name}" class="w-full h-32 object-cover rounded">
                                <p class="text-xs text-gray-500 mt-1">\${img.name}</p>
                            </div>
                            <div class="space-y-2">
                                <div>
                                    <label class="block text-sm font-medium mb-1">회원 선택 *</label>
                                    <select id="member-select-\${index}" class="w-full px-3 py-2 border rounded text-sm">
                                        <option value="">회원을 선택하세요</option>
                                        \${memberOptions}
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium mb-1">비고</label>
                                    <input type="text" id="notes-\${index}" class="w-full px-3 py-2 border rounded text-sm" placeholder="특이사항 입력">
                                </div>
                            </div>
                        </div>
                    </div>
                    \`
                }).join('')

                document.getElementById('bulk-register-modal').classList.remove('hidden')
            } catch (error) {
                console.error('회원 목록 로드 오류:', error)
                alert('회원 목록을 불러올 수 없습니다.')
            }
        }

        function closeBulkRegisterModal() {
            document.getElementById('bulk-register-modal').classList.add('hidden')
        }

        async function submitBulkRegister() {
            try {
                const items = []

                for (let i = 0; i < uploadedMailImages.length; i++) {
                    const memberSelect = document.getElementById(\`member-select-\${i}\`)
                    const notesInput = document.getElementById(\`notes-\${i}\`)

                    const memberId = memberSelect.value
                    if (!memberId) {
                        alert(\`\${i + 1}번째 이미지의 회원을 선택해주세요.\`)
                        return
                    }

                    items.push({
                        member_id: parseInt(memberId),
                        image_key: uploadedMailImages[i].key,
                        notes: notesInput.value || ''
                    })
                }

                // 대량 등록 API 호출
                const res = await axios.post(\`\${API_BASE}/mailroom/bulk\`, {
                    items,
                    created_by: currentStaff.id
                })

                alert(\`총 \${res.data.count}건의 우편물과 티켓이 생성되었습니다.\`)

                // 초기화
                uploadedMailImages = []
                displayImagePreviews()
                document.getElementById('mail-images').value = ''
                const processBtn = document.getElementById('process-mail-btn')
                if (processBtn) processBtn.disabled = true
                const bulkBtn = document.getElementById('bulk-register-btn')
                if (bulkBtn) bulkBtn.disabled = true
                closeBulkRegisterModal()

                // 목록 새로고침
                await loadPendingMail()
                if (currentView === 'tickets') {
                    await loadTickets()
                }
            } catch (error) {
                console.error('대량 등록 오류:', error)
                alert('대량 등록 실패: ' + (error.response?.data?.error || error.response?.data?.details || error.message))
            }
        }

        async function loadPendingMail() {
            try {
                const res = await axios.get(\`\${API_BASE}/mailroom\`)
                const items = res.data.mailroom_items || []

                const container = document.getElementById('pending-mail-list')
                if (items.length === 0) {
                    container.innerHTML = '<p class="text-gray-500 text-center py-8">업로드된 우편물이 없습니다.</p>'
                    stopAutoRefresh()
                    return
                }

                // 상태별 정렬 (received -> ocr_processing -> ocr_completed -> ocr_failed)
                const sortedItems = items.sort((a, b) => {
                    const statusOrder = { 'received': 0, 'ocr_processing': 1, 'ocr_completed': 2, 'ocr_failed': 3 }
                    return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99)
                })
                
                // OCR 처리 중인 항목이 있으면 자동 새로고침 유지
                const hasProcessing = sortedItems.some(item => item.status === 'ocr_processing' || item.status === 'received')
                if (!hasProcessing) {
                    stopAutoRefresh()
                }

                container.innerHTML = sortedItems.map(item => {
                    const imageKeys = item.image_keys ? JSON.parse(item.image_keys) : []
                    const firstImage = imageKeys[0] || null
                    
                    // 상태별 표시
                    let statusBadge = ''
                    let statusIcon = ''
                    let actionButtons = ''
                    let cardStyle = 'border-l-4 border-gray-300'
                    
                    if (item.status === 'received') {
                        statusBadge = '<span class="status-badge bg-yellow-100 text-yellow-800"><i class="fas fa-clock mr-1"></i>대기중</span>'
                        statusIcon = '<i class="fas fa-hourglass-half text-yellow-500 text-2xl"></i>'
                        cardStyle = 'border-l-4 border-yellow-400'
                        actionButtons = \`
                            <button onclick="startOCR(\${item.id})" class="btn btn-sm btn-primary">
                                <i class="fas fa-magic mr-1"></i>OCR 시작
                            </button>
                        \`
                    } else if (item.status === 'ocr_processing') {
                        statusBadge = '<span class="status-badge bg-blue-100 text-blue-800"><i class="fas fa-spinner fa-spin mr-1"></i>처리중</span>'
                        statusIcon = '<i class="fas fa-spinner fa-spin text-blue-500 text-2xl"></i>'
                        cardStyle = 'border-l-4 border-blue-400 bg-blue-50'
                        actionButtons = \`
                            <button class="btn btn-sm" disabled>
                                <i class="fas fa-spinner fa-spin mr-1"></i>처리중...
                            </button>
                        \`
                    } else if (item.status === 'ocr_completed') {
                        statusBadge = '<span class="status-badge bg-green-100 text-green-800"><i class="fas fa-check-circle mr-1"></i>완료</span>'
                        statusIcon = '<i class="fas fa-check-circle text-green-500 text-2xl"></i>'
                        cardStyle = 'border-l-4 border-green-400 bg-green-50'
                        actionButtons = \`
                            <button onclick="moveToInspection(\${item.id})" class="btn btn-sm btn-success">
                                <i class="fas fa-arrow-right mr-1"></i>검수하기
                            </button>
                        \`
                    } else if (item.status === 'ocr_failed') {
                        statusBadge = '<span class="status-badge bg-red-100 text-red-800"><i class="fas fa-exclamation-triangle mr-1"></i>실패</span>'
                        statusIcon = '<i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>'
                        cardStyle = 'border-l-4 border-red-400'
                        actionButtons = \`
                            <button onclick="retryOCR(\${item.id})" class="btn btn-sm btn-danger">
                                <i class="fas fa-redo mr-1"></i>재시도
                            </button>
                        \`
                    }
                    
                    return \`
                        <div class="card \${cardStyle} hover:shadow-lg transition-all">
                            <div class="flex gap-4">
                                <!-- 상태 아이콘 -->
                                <div class="flex items-center justify-center w-16">
                                    \${statusIcon}
                                </div>
                                
                                <!-- 이미지 썸네일 -->
                                \${firstImage ? \`
                                    <img src="/api/mailroom/image/\${firstImage}" 
                                         class="w-32 h-32 object-cover rounded border-2 border-gray-200 cursor-pointer hover:border-blue-400 transition-colors"
                                         onclick="viewMailImages(\${item.id})">
                                \` : \`
                                    <div class="w-32 h-32 bg-gray-200 rounded flex items-center justify-center border-2 border-gray-300">
                                        <i class="fas fa-image text-gray-400 text-3xl"></i>
                                    </div>
                                \`}
                                
                                <!-- 우편물 정보 -->
                                <div class="flex-1">
                                    <div class="flex justify-between items-start mb-2">
                                        <div>
                                            <div class="flex items-center gap-2">
                                                <p class="font-mono font-bold text-lg text-blue-600">\${item.mail_number}</p>
                                                \${statusBadge}
                                            </div>
                                            <p class="text-sm text-gray-600 mt-1">\${item.member_name || '수신자 미지정'}</p>
                                        </div>
                                    </div>
                                    
                                    \${item.notes ? \`<p class="text-sm text-gray-700 mb-2 bg-gray-50 p-2 rounded"><i class="fas fa-sticky-note mr-1 text-gray-400"></i>\${item.notes}</p>\` : ''}
                                    
                                    <div class="flex items-center gap-3 text-sm text-gray-500 mb-3">
                                        <span class="flex items-center gap-1">
                                            <i class="fas fa-images"></i>
                                            <strong>\${imageKeys.length}</strong>장
                                        </span>
                                        <span class="flex items-center gap-1">
                                            <i class="fas fa-clock"></i>
                                            \${new Date(item.created_at).toLocaleString('ko-KR', { 
                                                month: 'short', 
                                                day: 'numeric', 
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            })}
                                        </span>
                                    </div>
                                    
                                    <div class="flex gap-2">
                                        \${actionButtons}
                                        <button onclick="viewMailImages(\${item.id})" class="btn btn-sm btn-secondary">
                                            <i class="fas fa-images mr-1"></i>이미지 보기
                                        </button>
                                        <button onclick="deleteMailItem(\${item.id})" class="btn btn-sm btn-danger" data-permission="admin">
                                            <i class="fas fa-trash mr-1"></i>삭제
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    \`
                }).join('')
            } catch (error) {
                console.error('대기 우편물 로드 오류:', error)
            }
        }

        async function startOCR(mailroomId) {
            try {
                await axios.post(\`\${API_BASE}/mailroom/\${mailroomId}/ocr\`)
                alert('OCR 처리가 시작되었습니다.')
                await loadPendingMail()
                
                // 자동 새로고침 시작
                startAutoRefresh()
            } catch (error) {
                console.error('OCR 시작 오류:', error)
                alert('OCR 시작 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        async function retryOCR(mailroomId) {
            if (!confirm('OCR을 다시 시도하시겠습니까?')) return
            await startOCR(mailroomId)
        }

        async function moveToInspection(mailroomId) {
            try {
                // 상태를 inspection으로 변경
                await axios.patch(\`\${API_BASE}/mailroom/\${mailroomId}/status\`, {
                    status: 'inspection'
                })
                
                await loadPendingMail()
                
                // 검수 탭으로 이동
                showMailroomTab('inspection')
                await loadProcessedMail()
            } catch (error) {
                console.error('검수 이동 오류:', error)
                alert('검수 이동 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        async function deleteMailItem(mailroomId) {
            if (!confirm('이 우편물을 삭제하시겠습니까?')) return
            
            try {
                await axios.delete(\`\${API_BASE}/mailroom/\${mailroomId}\`)
                alert('삭제되었습니다.')
                await loadPendingMail()
            } catch (error) {
                console.error('삭제 오류:', error)
                alert('삭제 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        let selectedTempTickets = [] // 선택된 임시 티켓 ID들

        async function loadProcessedMail() {
            try {
                // inspection 상태의 우편물 조회
                const res = await axios.get(\`\${API_BASE}/mailroom?status=inspection\`)
                const items = res.data.mailroom_items || []

                const container = document.getElementById('processed-mail-list')
                if (items.length === 0) {
                    container.innerHTML = '<p class="text-gray-500 text-center py-8">검수할 우편물이 없습니다.</p>'
                    return
                }

                container.innerHTML = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">' + 
                items.map(item => {
                    const imageKeys = item.image_keys ? JSON.parse(item.image_keys) : []
                    const firstImage = imageKeys[0] || null
                    const ocrData = item.ocr_result ? JSON.parse(item.ocr_result) : {}
                    const ocrResults = ocrData.results || []
                    
                    // 발신자 정보 추출 (첫 번째 봉투 이미지에서)
                    const envelopeResult = ocrResults.find(r => r.has_envelope && r.sender_info)
                    const senderInfo = envelopeResult?.sender_info || null
                    
                    const ocrText = ocrResults.length > 0 && ocrResults[0].text ? ocrResults[0].text.substring(0, 100) : '없음'
                    
                    return \`
                        <div class="card cursor-pointer hover:shadow-lg transition-shadow" onclick="showInspectionDetail(\${item.id})">
                            \${firstImage ? \`
                                <img src="/api/mailroom/image/\${firstImage}" 
                                     class="w-full h-48 object-cover rounded-t mb-3">
                            \` : \`
                                <div class="w-full h-48 bg-gray-200 rounded-t mb-3 flex items-center justify-center">
                                    <i class="fas fa-image text-gray-400 text-4xl"></i>
                                </div>
                            \`}
                            
                            <div>
                                <div class="flex justify-between items-start mb-2">
                                    <p class="font-medium text-sm">\${item.mail_number}</p>
                                    <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        <i class="fas fa-images mr-1"></i>\${imageKeys.length}
                                    </span>
                                </div>
                                
                                \${senderInfo ? \`
                                    <div class="bg-green-50 border border-green-200 rounded p-2 mb-2 text-xs">
                                        <div class="flex items-center text-green-800 font-medium mb-1">
                                            <i class="fas fa-envelope mr-1"></i>봉투 정보
                                        </div>
                                        \${senderInfo.sender_name ? \`<p class="text-gray-700"><strong>발신자:</strong> \${senderInfo.sender_name}</p>\` : ''}
                                        \${senderInfo.institution ? \`<p class="text-gray-700"><strong>수용기관:</strong> \${senderInfo.institution}</p>\` : ''}
                                        \${senderInfo.inmate_number ? \`<p class="text-gray-700"><strong>수용번호:</strong> \${senderInfo.inmate_number}</p>\` : ''}
                                        \${senderInfo.address ? \`<p class="text-gray-700 text-xs">\${senderInfo.address}</p>\` : ''}
                                    </div>
                                \` : ''}
                                
                                <p class="text-xs text-gray-600 mb-2">\${item.member_name || '미배정'}</p>
                                
                                <div class="bg-gray-50 p-2 rounded text-xs max-h-20 overflow-hidden">
                                    <p class="text-gray-700 line-clamp-3">\${ocrText.substring(0, 100)}...</p>
                                </div>
                                
                                <p class="text-xs text-gray-400 mt-2">
                                    <i class="fas fa-clock mr-1"></i>\${new Date(item.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    \`
                }).join('') + '</div>'
                
            } catch (error) {
                console.error('검수 우편물 로드 오류:', error)
            }
        }

        async function loadMailHistory() {
            try {
                const res = await axios.get(\`\${API_BASE}/mailroom?status=assigned\`)
                const items = res.data.mailroom_items || []

                const container = document.getElementById('mail-history-list')
                if (items.length === 0) {
                    container.innerHTML = '<p class="text-gray-500 text-center py-8">처리 내역이 없습니다.</p>'
                    return
                }

                container.innerHTML = items.map(item => \`
                    <div class="border rounded p-3 hover:bg-gray-50">
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="font-medium">\${item.mail_number}</p>
                                <p class="text-sm text-gray-600">\${item.member_name || '미배정'}</p>
                                <p class="text-xs text-gray-500">티켓: \${item.ticket_number || '-'}</p>
                            </div>
                            <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">완료</span>
                        </div>
                    </div>
                \`).join('')
            } catch (error) {
                console.error('우편물 내역 로드 오류:', error)
            }
        }

        async function viewMailImages(mailId) {
            try {
                const res = await axios.get(\`\${API_BASE}/mailroom/\${mailId}\`)
                const item = res.data.mailroom_item
                const imageKeys = JSON.parse(item.image_keys)

                // 간단한 이미지 뷰어 (나중에 고급 뷰어로 교체 예정)
                const imageHtml = imageKeys.map(key => 
                    \`<img src="\${API_BASE}/mailroom/image/\${key}" class="w-full mb-2 border rounded">\`
                ).join('')

                alert('이미지 뷰어 (개선 예정)\\n\\n우편물 번호: ' + item.mail_number)
                // TODO: 모달로 이미지 표시
            } catch (error) {
                console.error('이미지 조회 오류:', error)
                alert('이미지 조회 실패')
            }
        }

        async function deleteMailItem(mailId) {
            if (!isAdmin()) {
                alert('우편물 삭제는 관리자만 가능합니다.')
                return
            }
            
            if (!confirm('이 우편물을 삭제하시겠습니까?')) return

            try {
                await axios.delete(\`\${API_BASE}/mailroom/\${mailId}\`)
                alert('우편물이 삭제되었습니다.')
                await loadPendingMail()
            } catch (error) {
                console.error('우편물 삭제 오류:', error)
                alert('삭제 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 우편물 배당 시스템
        let currentAssignmentMailId = null
        let selectedTicketsForAssignment = []

        async function assignToTicket(mailId) {
            currentAssignmentMailId = mailId
            selectedTicketsForAssignment = []
            
            try {
                // 우편물 정보 로드
                const res = await axios.get(\`\${API_BASE}/mailroom/\${mailId}\`)
                const mail = res.data.mailroom_item
                
                // 모달에 정보 표시
                const ocrData = mail.ocr_result ? JSON.parse(mail.ocr_result) : {}
                const imageKeys = JSON.parse(mail.image_keys)
                
                // 우편물 정보
                const caseType = ocrData.case_type || 'unknown'
                const caseTypeLabel = caseType === 'new_case' ? '새 케이스 📧' : '연속 케이스 📄'
                const caseTypeColor = caseType === 'new_case' ? 'text-blue-600' : 'text-purple-600'
                
                document.getElementById('mail-assignment-info').innerHTML = \`
                    <div class="flex justify-between">
                        <span class="text-gray-600">우편물 번호:</span>
                        <span class="font-mono font-medium">\${mail.mail_number}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">케이스 유형:</span>
                        <span class="font-medium \${caseTypeColor}">\${caseTypeLabel}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">회원:</span>
                        <span class="font-medium">\${mail.member_name || '미배정'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">이미지 수:</span>
                        <span class="font-medium">\${imageKeys.length}장</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">등록 일시:</span>
                        <span class="text-gray-500">\${new Date(mail.created_at).toLocaleString()}</span>
                    </div>
                \`
                
                // 이미지 미리보기
                document.getElementById('mail-assignment-images').innerHTML = imageKeys.map(key => \`
                    <img src="\${API_BASE}/mailroom/image/\${key}" 
                         class="w-full h-32 object-cover border rounded cursor-pointer hover:opacity-75" 
                         onclick="viewFullImage('\${API_BASE}/mailroom/image/\${key}')"
                         title="클릭하여 확대">
                \`).join('')
                
                // OCR 결과
                const ocrResults = ocrData.results || []
                document.getElementById('mail-assignment-ocr').innerHTML = ocrResults.length > 0 
                    ? ocrResults.map((r, idx) => \`
                        <div class="border-b pb-2 mb-2 last:border-0 last:mb-0">
                            <p class="text-xs text-gray-500 mb-1">
                                이미지 \${idx + 1} \${r.has_envelope ? '📧' : '📄'}
                            </p>
                            <p class="text-gray-700">\${r.text || '[텍스트 없음]'}</p>
                        </div>
                    \`).join('')
                    : '<p class="text-gray-500">OCR 결과 없음</p>'
                
                // 티켓 검색 결과 초기화
                document.getElementById('ticket-search-results').innerHTML = '<p class="text-gray-500 text-sm text-center py-4">티켓을 검색하세요</p>'
                document.getElementById('selected-tickets-for-assignment').innerHTML = '<p class="text-gray-500 text-sm text-center py-4">티켓을 선택하세요</p>'
                document.getElementById('ticket-search').value = ''
                
                // 모달 열기
                document.getElementById('mail-assignment-modal').classList.remove('hidden')
            } catch (error) {
                console.error('배당 모달 로드 오류:', error)
                alert('우편물 정보 로드 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        function closeMailAssignmentModal() {
            document.getElementById('mail-assignment-modal').classList.add('hidden')
            currentAssignmentMailId = null
            selectedTicketsForAssignment = []
        }

        async function searchTicketsForAssignment(event) {
            const query = event.target.value.trim()
            
            if (query.length < 2) {
                document.getElementById('ticket-search-results').innerHTML = '<p class="text-gray-500 text-sm text-center py-4">최소 2자 이상 입력하세요</p>'
                return
            }
            
            try {
                const res = await axios.get(\`\${API_BASE}/tickets?search=\${query}\`)
                const tickets = res.data.tickets || []
                
                const container = document.getElementById('ticket-search-results')
                if (tickets.length === 0) {
                    container.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">검색 결과가 없습니다</p>'
                    return
                }
                
                container.innerHTML = tickets.filter(t => 
                    !selectedTicketsForAssignment.find(st => st.id === t.id)
                ).map(ticket => \`
                    <div class="border rounded p-2 hover:bg-gray-50 cursor-pointer" onclick="selectTicketForAssignment(\${ticket.id}, '\${ticket.ticket_number}', '\${ticket.title.replace(/'/g, "\\\\'")}', '\${ticket.member_name || ""}')">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <p class="font-medium text-sm">\${ticket.ticket_number}</p>
                                <p class="text-xs text-gray-600">\${ticket.title}</p>
                                <p class="text-xs text-gray-500">\${ticket.member_name || '회원 없음'}</p>
                            </div>
                            <span class="status-badge status-\${ticket.status} text-xs">\${ticket.status}</span>
                        </div>
                    </div>
                \`).join('')
            } catch (error) {
                console.error('티켓 검색 오류:', error)
            }
        }

        function selectTicketForAssignment(ticketId, ticketNumber, ticketTitle, memberName) {
            // 이미 선택되었는지 확인
            if (selectedTicketsForAssignment.find(t => t.id === ticketId)) {
                return
            }
            
            selectedTicketsForAssignment.push({
                id: ticketId,
                ticket_number: ticketNumber,
                title: ticketTitle,
                member_name: memberName
            })
            
            updateSelectedTicketsDisplay()
        }

        function removeTicketFromAssignment(ticketId) {
            selectedTicketsForAssignment = selectedTicketsForAssignment.filter(t => t.id !== ticketId)
            updateSelectedTicketsDisplay()
        }

        function updateSelectedTicketsDisplay() {
            const container = document.getElementById('selected-tickets-for-assignment')
            
            if (selectedTicketsForAssignment.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">티켓을 선택하세요</p>'
                return
            }
            
            container.innerHTML = selectedTicketsForAssignment.map(ticket => \`
                <div class="border rounded p-2 bg-blue-50">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <p class="font-medium text-sm">\${ticket.ticket_number}</p>
                            <p class="text-xs text-gray-600">\${ticket.title}</p>
                            <p class="text-xs text-gray-500">\${ticket.member_name || '회원 없음'}</p>
                        </div>
                        <button onclick="removeTicketFromAssignment(\${ticket.id})" class="text-red-500 hover:text-red-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            \`).join('')
        }

        async function executeMailAssignment() {
            if (!currentAssignmentMailId) {
                alert('우편물 정보를 찾을 수 없습니다.')
                return
            }
            
            if (selectedTicketsForAssignment.length === 0) {
                alert('배당할 티켓을 선택하세요.')
                return
            }
            
            const btn = document.getElementById('execute-assignment-btn')
            btn.disabled = true
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>배당 중...'
            
            try {
                // 각 티켓에 대해 배당 실행
                for (const ticket of selectedTicketsForAssignment) {
                    await axios.patch(\`\${API_BASE}/mailroom/\${currentAssignmentMailId}/status\`, {
                        status: 'assigned',
                        ticket_id: ticket.id
                    })
                }
                
                alert(\`\${selectedTicketsForAssignment.length}개 티켓에 배당이 완료되었습니다.\`)
                closeMailAssignmentModal()
                await loadProcessedMail()
                await loadMailHistory()
            } catch (error) {
                console.error('배당 실행 오류:', error)
                alert('배당 실패: ' + (error.response?.data?.error || error.message))
            } finally {
                btn.disabled = false
                btn.innerHTML = '<i class="fas fa-check mr-2"></i>배당 실행'
            }
        }

        // 이미지 뷰어
        let currentZoom = 1
        let currentRotation = 0

        function viewFullImage(imageUrl) {
            document.getElementById('viewer-image').src = imageUrl
            document.getElementById('image-viewer-modal').classList.remove('hidden')
            resetImage()
        }

        function closeImageViewer() {
            document.getElementById('image-viewer-modal').classList.add('hidden')
            resetImage()
        }

        function zoomIn() {
            currentZoom += 0.2
            updateImageTransform()
        }

        function zoomOut() {
            if (currentZoom > 0.2) {
                currentZoom -= 0.2
                updateImageTransform()
            }
        }

        function rotateImage() {
            currentRotation += 90
            if (currentRotation >= 360) currentRotation = 0
            updateImageTransform()
        }

        function resetImage() {
            currentZoom = 1
            currentRotation = 0
            updateImageTransform()
        }

        function updateImageTransform() {
            const img = document.getElementById('viewer-image')
            img.style.transform = \`scale(\${currentZoom}) rotate(\${currentRotation}deg)\`
        }


        let uploadedImageKeys = [] // 업로드된 이미지 키 저장
        let selectedMailItems = [] // 검수 시 선택된 우편물들
        
        // 우편실 로드
        async function loadMailroom() {
            await loadPendingMail()
            await loadProcessedMail()
            await loadMailHistory()
        }
        
        // 탭 전환
        function showMailroomTab(tabName) {
            // 모든 탭 버튼 비활성화
            document.querySelectorAll('[id^="mailroom-tab-"]').forEach(btn => {
                btn.classList.remove('bg-blue-500', 'text-white')
                btn.classList.add('bg-gray-200', 'text-gray-700')
            })
            
            // 모든 탭 콘텐츠 숨기기
            document.querySelectorAll('.mailroom-tab-content').forEach(content => {
                content.classList.add('hidden')
            })
            
            // 선택된 탭 활성화
            document.getElementById(\`mailroom-tab-\${tabName}\`).classList.remove('bg-gray-200', 'text-gray-700')
            document.getElementById(\`mailroom-tab-\${tabName}\`).classList.add('bg-blue-500', 'text-white')
            document.getElementById(\`mailroom-\${tabName}-tab\`).classList.remove('hidden')
            
            // 탭별 데이터 로드
            if (tabName === 'receive') {
                loadPendingMail()
            } else if (tabName === 'inspection') {
                loadProcessedMail()
            } else if (tabName === 'history') {
                loadMailHistory()
            }
        }
        
        // 이미지 파일 선택 처리
        async function handleMailImages(event) {
            const files = event.target.files
            if (files.length === 0) return
            
            try {
                // 업로드 확인 모달 생성
                const confirmModal = createConfirmModal(
                    '우편물 업로드',
                    \`\${files.length}개의 이미지를 업로드하시겠습니까?\\n\\n자동으로 봉투를 감지하여 우편물을 분리합니다.\`,
                    '업로드',
                    '취소'
                )
                
                document.body.appendChild(confirmModal)
                
                const result = await new Promise((resolve) => {
                    const confirmBtn = confirmModal.querySelector('.confirm-btn')
                    const cancelBtn = confirmModal.querySelector('.cancel-btn')
                    
                    confirmBtn.addEventListener('click', () => {
                        confirmModal.remove()
                        resolve(true)
                    })
                    
                    cancelBtn.addEventListener('click', () => {
                        confirmModal.remove()
                        resolve(false)
                    })
                })
                
                if (!result) {
                    event.target.value = ''
                    return
                }
                
                // 메모 입력 모달
                const notesModal = createInputModal(
                    '메모 입력',
                    '우편물에 대한 메모를 입력하세요 (선택사항)',
                    '확인',
                    '건너뛰기'
                )
                
                document.body.appendChild(notesModal)
                
                const notes = await new Promise((resolve) => {
                    const confirmBtn = notesModal.querySelector('.confirm-btn')
                    const cancelBtn = notesModal.querySelector('.cancel-btn')
                    const input = notesModal.querySelector('input')
                    
                    confirmBtn.addEventListener('click', () => {
                        const value = input.value.trim()
                        notesModal.remove()
                        resolve(value)
                    })
                    
                    cancelBtn.addEventListener('click', () => {
                        notesModal.remove()
                        resolve('')
                    })
                    
                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            const value = input.value.trim()
                            notesModal.remove()
                            resolve(value)
                        }
                    })
                })
                
                // 로딩 모달 생성
                const loadingModal = createLoadingModal('이미지 업로드 중...', files.length)
                document.body.appendChild(loadingModal)
                
                // 각 파일을 R2에 업로드
                const uploadedKeys = []
                for (let i = 0; i < files.length; i++) {
                    const file = files[i]
                    
                    updateLoadingModal(loadingModal, i + 1, files.length)
                    
                    const formData = new FormData()
                    formData.append('file', file)
                    
                    const response = await axios.post(\`\${API_BASE}/mailroom/upload\`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    })
                    
                    if (response.data.success) {
                        uploadedKeys.push(response.data.key)
                    }
                }
                
                // 우편물 등록 (모든 이미지를 하나로)
                updateLoadingModal(loadingModal, files.length, files.length, '우편물 등록 중...')
                
                const response = await axios.post(\`\${API_BASE}/mailroom\`, {
                    member_id: null,
                    image_keys: uploadedKeys,
                    notes: notes || '',
                    created_by: currentStaff.id
                })
                
                if (response.data.success) {
                    const mailroomId = response.data.mailroom_id
                    const mailNumber = response.data.mail_number
                    
                    // 임시 티켓 자동 생성
                    try {
                        const ticketRes = await axios.post(\`\${API_BASE}/tickets\`, {
                            member_id: null,  // 미지정
                            staff_id: null,   // 담당자 미배정
                            ticket_type: 'mailroom',
                            priority: 'normal',
                            title: \`[임시] 우편물 \${mailNumber}\`,
                            description: \`우편물 자동 등록\\n번호: \${mailNumber}\\n상태: OCR 처리 대기 중\`,
                            status: 'pending',
                            mailroom_id: mailroomId
                        })
                        
                        console.log('임시 티켓 생성됨:', ticketRes.data.ticket.ticket_number)
                    } catch (ticketError) {
                        console.error('임시 티켓 생성 실패:', ticketError)
                        // 티켓 생성 실패해도 우편물 등록은 성공이므로 계속 진행
                    }
                    
                    // OCR 처리 시작 (비동기)
                    updateLoadingModal(loadingModal, files.length, files.length, 'OCR 처리 시작 중...')
                    
                    axios.post(\`\${API_BASE}/mailroom/\${mailroomId}/ocr\`)
                        .then(() => console.log('OCR 시작됨:', mailroomId))
                        .catch(err => console.error('OCR 시작 실패:', err))
                    
                    // 로딩 모달 제거
                    loadingModal.remove()
                    
                    // 성공 모달
                    const successModal = createAlertModal(
                        '업로드 완료',
                        \`우편물이 등록되었습니다.\\n우편물 번호: \${mailNumber}\\n\\nOCR 처리가 시작되었습니다.\\n우측 대기 목록에서 확인하세요.\`,
                        '확인'
                    )
                    document.body.appendChild(successModal)
                    
                    successModal.querySelector('.confirm-btn').addEventListener('click', () => {
                        successModal.remove()
                    })
                    
                    // 초기화
                    uploadedImageKeys = []
                    event.target.value = ''
                    
                    // 대기 탭으로 전환
                    showMailroomTab('receive')
                    
                    // 목록 새로고침
                    await loadPendingMail()
                    
                    // 자동 새로고침 시작
                    startAutoRefresh()
                }
            } catch (error) {
                const errorModal = createAlertModal(
                    '업로드 실패',
                    \`이미지 업로드에 실패했습니다.\\n\\n오류: \${error.response?.data?.error || error.message}\`,
                    '확인'
                )
                document.body.appendChild(errorModal)
                errorModal.querySelector('.confirm-btn').addEventListener('click', () => {
                    errorModal.remove()
                })
            }
        }
        
        // 모달 생성 함수들
        function createConfirmModal(title, message, confirmText, cancelText) {
            const modal = document.createElement('div')
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'
            modal.innerHTML = \`
                <div class="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
                    <h3 class="text-xl font-bold mb-4 text-gray-800">\${title}</h3>
                    <p class="text-gray-600 mb-6 whitespace-pre-line">\${message}</p>
                    <div class="flex gap-3">
                        <button class="cancel-btn btn btn-secondary flex-1">\${cancelText}</button>
                        <button class="confirm-btn btn btn-primary flex-1">\${confirmText}</button>
                    </div>
                </div>
            \`
            return modal
        }
        
        function createInputModal(title, placeholder, confirmText, cancelText) {
            const modal = document.createElement('div')
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'
            modal.innerHTML = \`
                <div class="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
                    <h3 class="text-xl font-bold mb-4 text-gray-800">\${title}</h3>
                    <input type="text" 
                           placeholder="\${placeholder}" 
                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-6"
                           autofocus>
                    <div class="flex gap-3">
                        <button class="cancel-btn btn btn-secondary flex-1">\${cancelText}</button>
                        <button class="confirm-btn btn btn-primary flex-1">\${confirmText}</button>
                    </div>
                </div>
            \`
            return modal
        }
        
        function createAlertModal(title, message, confirmText) {
            const modal = document.createElement('div')
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'
            modal.innerHTML = \`
                <div class="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
                    <h3 class="text-xl font-bold mb-4 text-gray-800">\${title}</h3>
                    <p class="text-gray-600 mb-6 whitespace-pre-line">\${message}</p>
                    <button class="confirm-btn btn btn-primary w-full">\${confirmText}</button>
                </div>
            \`
            return modal
        }
        
        function createLoadingModal(message, total) {
            const modal = document.createElement('div')
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'
            modal.innerHTML = \`
                <div class="bg-white rounded-lg max-w-md w-full p-8 shadow-xl text-center">
                    <i class="fas fa-spinner fa-spin text-5xl text-blue-500 mb-4"></i>
                    <p class="text-lg font-medium text-gray-800 mb-2 loading-message">\${message}</p>
                    <p class="text-sm text-gray-600 loading-progress">0 / \${total}</p>
                    <div class="mt-4 bg-gray-200 rounded-full h-2">
                        <div class="loading-bar bg-blue-500 h-2 rounded-full transition-all" style="width: 0%"></div>
                    </div>
                </div>
            \`
            return modal
        }
        
        function updateLoadingModal(modal, current, total, message) {
            const messageEl = modal.querySelector('.loading-message')
            const progressEl = modal.querySelector('.loading-progress')
            const barEl = modal.querySelector('.loading-bar')
            
            if (message && messageEl) messageEl.textContent = message
            if (progressEl) progressEl.textContent = \`\${current} / \${total}\`
            if (barEl) {
                const percent = Math.round((current / total) * 100)
                barEl.style.width = \`\${percent}%\`
            }
        }
        
        // 업로드된 이미지 제거 (제거됨 - 더 이상 필요 없음)
        function removeUploadedImage(key) {
            // 이제 사용하지 않음
        }
        
        // 자동 새로고침 (OCR 상태 폴링)
        let autoRefreshInterval = null
        
        function startAutoRefresh() {
            // 기존 인터벌 제거
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval)
            }
            
            // 5초마다 새로고침
            autoRefreshInterval = setInterval(async () => {
                await loadPendingMail()
            }, 5000)
            
            // 2분 후 자동 새로고침 중지
            setTimeout(() => {
                if (autoRefreshInterval) {
                    clearInterval(autoRefreshInterval)
                    autoRefreshInterval = null
                }
            }, 120000)
        }
        
        function stopAutoRefresh() {
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval)
                autoRefreshInterval = null
            }
        }
        
        // 우편물 선택 토글
        function toggleMailSelection(mailId) {
            if (selectedMailItems.includes(mailId)) {
                selectedMailItems = selectedMailItems.filter(id => id !== mailId)
            } else {
                selectedMailItems.push(mailId)
            }
            loadProcessedMail()
        }
        
        // 검수 상세 모달 표시
        let currentInspectionId = null
        
        async function showInspectionDetail(mailId) {
            try {
                currentInspectionId = mailId
                
                // 우편물 상세 정보 조회
                const response = await axios.get(\`\${API_BASE}/mailroom/\${mailId}\`)
                const item = response.data.mailroom_item
                
                // 이미지 표시
                const imageKeys = item.image_keys ? JSON.parse(item.image_keys) : []
                const imagesContainer = document.getElementById('inspection-images')
                imagesContainer.innerHTML = imageKeys.map(key => \`
                    <img src="/api/mailroom/image/\${key}" class="w-full rounded border mb-2">
                \`).join('')
                
                // OCR 결과 파싱
                const ocrData = item.ocr_result ? JSON.parse(item.ocr_result) : {}
                const ocrResults = ocrData.results || []
                
                // 발신자 정보 추출 (봉투가 있는 이미지에서)
                const envelopeResult = ocrResults.find(r => r.has_envelope && r.sender_info)
                const senderInfo = envelopeResult?.sender_info || null
                
                // 편지 내용 추출 (모든 이미지에서)
                const letterContents = ocrResults
                    .map(r => r.letter_content)
                    .filter(c => c)
                    .join('\\n\\n')
                
                // OCR 원문 (전체)
                const ocrText = ocrResults.map(r => r.text).join('\\n\\n')
                
                // 폼 채우기 - 발신자 정보가 있으면 자동 입력
                if (senderInfo) {
                    document.getElementById('inspection-name').value = senderInfo.sender_name || ''
                    document.getElementById('inspection-number').value = senderInfo.inmate_number || ''
                    document.getElementById('inspection-institution').value = senderInfo.institution || ''
                    document.getElementById('inspection-address').value = senderInfo.mailbox_address || senderInfo.full_address || ''
                } else {
                    // OCR 실패 시 기존 정보 표시
                    document.getElementById('inspection-name').value = item.member_name || ''
                    document.getElementById('inspection-number').value = item.member_number || ''
                    document.getElementById('inspection-institution').value = item.institution || ''
                    document.getElementById('inspection-address').value = item.mailbox_address || ''
                }
                
                document.getElementById('inspection-ocr-text').value = ocrText
                document.getElementById('inspection-letter-content').value = letterContents
                document.getElementById('inspection-notes').value = item.notes || ''
                
                // 회원 자동 매칭 (수용번호 기반)
                if (senderInfo && senderInfo.inmate_number) {
                    await searchAndMatchMember(senderInfo.inmate_number)
                }
                
                // 담당자 목록 로드
                await loadStaffList()
                
                // 모달 표시
                document.getElementById('inspection-detail-modal').classList.remove('hidden')
            } catch (error) {
                console.error('검수 상세 조회 오류:', error)
                alert('우편물 정보를 불러올 수 없습니다.')
            }
        }
        
        // 담당자 목록 로드
        async function loadStaffList() {
            try {
                const res = await axios.get(\`\${API_BASE}/staff\`)
                const staffList = res.data.staff || []
                
                const staffSelect = document.getElementById('inspection-staff')
                staffSelect.innerHTML = '<option value="">-- 담당자를 선택하세요 --</option>' +
                    staffList.map(staff => \`
                        <option value="\${staff.id}">\${staff.name} (\${staff.role === 'admin' ? '관리자' : staff.role === 'manager' ? '매니저' : '직원'})</option>
                    \`).join('')
            } catch (error) {
                console.error('담당자 목록 로드 오류:', error)
            }
        }
        
        // 회원 자동 매칭 (수용번호 기반)
        async function searchAndMatchMember(inmateNumber) {
            try {
                const res = await axios.get(\`\${API_BASE}/members?search=\${inmateNumber}\`)
                const members = res.data.members || []
                
                if (members.length > 0) {
                    // 회원 찾음
                    const member = members[0]
                    document.getElementById('member-match-status').innerHTML = \`
                        <div class="bg-green-50 border border-green-200 rounded p-2 text-sm">
                            <i class="fas fa-check-circle text-green-600 mr-1"></i>
                            <strong>기존 회원 매칭:</strong> \${member.name} (수용번호: \${member.inmate_number})
                        </div>
                    \`
                } else {
                    // 신규 회원
                    document.getElementById('member-match-status').innerHTML = \`
                        <div class="bg-yellow-50 border border-yellow-200 rounded p-2 text-sm">
                            <i class="fas fa-exclamation-triangle text-yellow-600 mr-1"></i>
                            <strong>신규 회원:</strong> 티켓 생성 시 자동 등록됩니다.
                        </div>
                    \`
                }
            } catch (error) {
                console.error('회원 검색 오류:', error)
            }
        }
        
        // 회원명 자동완성 (드롭다운)
        let memberSearchTimeout = null
        let memberSearchResults = []
        
        async function handleMemberNameInput(event) {
            const query = event.target.value.trim()
            
            clearTimeout(memberSearchTimeout)
            
            if (query.length < 1) {
                document.getElementById('member-search-dropdown').classList.add('hidden')
                return
            }
            
            memberSearchTimeout = setTimeout(async () => {
                try {
                    const res = await axios.get(\`\${API_BASE}/members?search=\${query}\`)
                    memberSearchResults = res.data.members || []
                    
                    const dropdown = document.getElementById('member-search-dropdown')
                    
                    if (memberSearchResults.length === 0) {
                        dropdown.classList.add('hidden')
                        return
                    }
                    
                    dropdown.innerHTML = memberSearchResults.map(m => \`
                        <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b" 
                             onclick="selectMember(\${m.id}, '\${m.name}', '\${m.inmate_number}', '\${m.institution}', '\${m.mailbox_address || ''}')">
                            <p class="font-medium text-sm">\${m.name}</p>
                            <p class="text-xs text-gray-600">수용번호: \${m.inmate_number} | \${m.institution}</p>
                        </div>
                    \`).join('')
                    
                    dropdown.classList.remove('hidden')
                } catch (error) {
                    console.error('회원 검색 오류:', error)
                }
            }, 300)
        }
        
        function selectMember(id, name, inmateNumber, institution, address) {
            document.getElementById('inspection-name').value = name
            document.getElementById('inspection-number').value = inmateNumber
            document.getElementById('inspection-institution').value = institution
            document.getElementById('inspection-address').value = address
            document.getElementById('member-search-dropdown').classList.add('hidden')
            
            // 매칭 상태 표시
            document.getElementById('member-match-status').innerHTML = \`
                <div class="bg-green-50 border border-green-200 rounded p-2 text-sm">
                    <i class="fas fa-check-circle text-green-600 mr-1"></i>
                    <strong>기존 회원 선택됨:</strong> \${name} (수용번호: \${inmateNumber})
                </div>
            \`
        }
        
        // 검수 모달 닫기
        function closeInspectionDetail() {
            document.getElementById('inspection-detail-modal').classList.add('hidden')
            currentInspectionId = null
        }
        
        // ==================== 회원 변경 관련 함수 ====================
        let memberSearchTimeout2 = null
        let memberSearchResults2 = []
        
        // 회원 변경 모달 열기
        function openChangeMemberModal() {
            if (!currentTicket) return
            
            // 현재 회원 정보 표시
            const currentMemberInfo = document.getElementById('current-member-info')
            if (currentTicket.member_name) {
                const memberNumber = currentTicket.member_number ? \` (\${currentTicket.member_number})\` : ''
                currentMemberInfo.innerHTML = \`
                    <div class="text-sm">
                        <div class="font-semibold text-gray-700">현재 회원</div>
                        <div class="mt-1">
                            <span class="font-medium">\${currentTicket.member_name || '-'}</span>
                            <span class="text-gray-500 ml-2">\${memberNumber}</span>
                        </div>
                    </div>
                \`
            } else {
                currentMemberInfo.innerHTML = \`
                    <div class="text-sm text-orange-600">
                        <i class="fas fa-exclamation-triangle mr-1"></i>
                        미지정 회원
                    </div>
                \`
            }
            
            // 검색창 초기화
            document.getElementById('change-member-search').value = ''
            document.getElementById('change-member-dropdown').classList.add('hidden')
            
            document.getElementById('change-member-modal').classList.remove('hidden')
        }
        
        // 회원 변경 모달 닫기
        function closeChangeMemberModal() {
            document.getElementById('change-member-modal').classList.add('hidden')
            memberSearchResults2 = []
        }
        
        // 회원 검색 (자동완성)
        function handleChangeMemberSearch(event) {
            const query = event.target.value.trim()
            const dropdown = document.getElementById('change-member-dropdown')
            
            if (!query) {
                dropdown.classList.add('hidden')
                return
            }
            
            clearTimeout(memberSearchTimeout2)
            memberSearchTimeout2 = setTimeout(async () => {
                try {
                    const res = await axios.get(\`\${API_BASE}/members?search=\${encodeURIComponent(query)}\`)
                    memberSearchResults2 = res.data.members || []
                    
                    if (memberSearchResults2.length === 0) {
                        dropdown.innerHTML = '<div class="p-3 text-sm text-gray-500">검색 결과가 없습니다.</div>'
                        dropdown.classList.remove('hidden')
                        return
                    }
                    
                    dropdown.innerHTML = memberSearchResults2.map(member => {
                        const numberDiv = member.member_number ? \`<div class="text-sm text-gray-600">수용번호: \${member.member_number}</div>\` : ''
                        const instDiv = member.institution ? \`<div class="text-sm text-gray-500">수용기관: \${member.institution}</div>\` : ''
                        return \`
                            <div class="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0" 
                                 onclick="selectChangeMember(\${member.id}, '\${member.name}', '\${member.member_number || ''}', '\${member.institution || ''}', '\${member.mailbox_address || ''}')">
                                <div class="font-medium text-gray-800">\${member.name}</div>
                                \${numberDiv}
                                \${instDiv}
                            </div>
                        \`
                    }).join('')
                    
                    dropdown.classList.remove('hidden')
                } catch (error) {
                    console.error('회원 검색 오류:', error)
                    dropdown.innerHTML = '<div class="p-3 text-sm text-red-500">검색 오류가 발생했습니다.</div>'
                    dropdown.classList.remove('hidden')
                }
            }, 300)
        }
        
        // 기존 회원 선택 → 변경 승인 요청
        async function selectChangeMember(memberId, name, memberNumber, institution, mailboxAddress) {
            if (!currentTicketId || !currentTicket) return
            
            // 드롭다운 닫기
            document.getElementById('change-member-dropdown').classList.add('hidden')
            
            // 확인
            const oldMember = currentTicket.member_name || '미지정'
            if (!confirm(\`회원을 변경하시겠습니까?\\n\\n기존: \${oldMember}\\n변경: \${name} (\${memberNumber})\\n\\n※ 이 변경은 승인이 필요합니다.\`)) {
                return
            }
            
            try {
                // 티켓의 member_id 변경 + 수정 내역 저장 (approval_required: true)
                await axios.put(\`\${API_BASE}/tickets/\${currentTicketId}\`, {
                    member_id: memberId,
                    change_reason: \`회원 변경: \${oldMember} → \${name}\`,
                    approval_required: true
                })
                
                alert(\`회원 변경 요청이 저장되었습니다.\\n\\n변경된 회원: \${name}\\n\\n※ 관리자 승인 후 반영됩니다.\`)
                
                // 모달 닫고 티켓 다시 로드
                closeChangeMemberModal()
                await showTicketDetail(currentTicketId)
            } catch (error) {
                console.error('회원 변경 오류:', error)
                alert(\`회원 변경 실패:\\n\\n\${error.response?.data?.error || error.message}\`)
            }
        }
        
        // 신규 회원 등록 버튼 클릭
        async function openNewMemberRegistration() {
            if (!currentTicketForMemberChange) {
                alert('오류: 티켓 정보가 없습니다.')
                return
            }
            
            closeChangeMemberModal()
            
            const name = prompt('회원 이름을 입력하세요:')
            if (!name || !name.trim()) return
            
            const memberNumber = prompt('수용번호를 입력하세요:')
            if (!memberNumber || !memberNumber.trim()) return
            
            const institution = prompt('수용기관을 입력하세요 (예: 서울):') || '미지정'
            const mailboxAddress = prompt('사서함 주소를 입력하세요 (예: 서울 사서함 123):') || ''
            
            if (!confirm(\`신규 회원을 등록하시겠습니까?\\n\\n이름: \${name}\\n수용번호: \${memberNumber}\\n수용기관: \${institution}\\n\\n※ 이 변경은 승인이 필요합니다.\`)) {
                return
            }
            
            try {
                const ticketId = currentTicketForMemberChange.id
                const oldMemberName = currentTicketForMemberChange.currentMemberName || '미지정'
                
                // 1. 신규 회원 등록
                const memberRes = await axios.post(\`\${API_BASE}/members\`, {
                    name: name.trim(),
                    member_number: memberNumber.trim(),
                    inmate_number: memberNumber.trim(),
                    institution: institution.trim(),
                    mailbox_address: mailboxAddress.trim(),
                    depositor_name: '',
                    status: 'active',
                    notes: \`티켓에서 신규 등록\`
                })
                
                const newMemberId = memberRes.data.member.id
                const newMemberName = name.trim()
                
                // 2. 승인 요청 생성 (신규 회원 등록 + 티켓 연결)
                await axios.post(\`\${API_BASE}/modifications\`, {
                    target_type: 'ticket',
                    target_id: ticketId,
                    field_name: 'member_id',
                    old_value: oldMemberName,
                    new_value: \`\${newMemberName} (신규 등록)\`,
                    reason: \`신규 회원 등록 및 연결: \${oldMemberName} → \${newMemberName}\`,
                    requested_by: currentStaff.id
                })
                
                alert(\`✅ 승인 요청이 생성되었습니다.\\n\\n회원: \${newMemberName} (\${memberNumber})\\n\\n관리자 승인 후 회원이 등록되고 티켓에 연결됩니다.\`)
                
                // 티켓 다시 로드
                await showTicketDetail(ticketId)
            } catch (error) {
                console.error('신규 회원 등록 오류:', error)
                alert(\`신규 회원 등록 실패:\\n\\n\${error.response?.data?.error || error.message}\`)
            }
        }
        
        // ==================== 회원 변경 관련 함수 끝 ====================
        
        // ==================== 회원 정보 수정 관련 함수 ====================
        let currentEditingMemberId = null
        let currentEditingMemberData = null
        
        // 회원 정보 수정 모달 열기
        async function showEditMemberModal(memberId) {
            currentEditingMemberId = memberId
            
            try {
                // 회원 정보 조회
                const res = await axios.get(\`\${API_BASE}/members/\${memberId}\`)
                const member = res.data.member
                currentEditingMemberData = member
                
                // 현재 정보 표시
                const currentInfo = document.getElementById('edit-member-current-info')
                currentInfo.innerHTML = \`
                    <div><strong>이름:</strong> \${member.name}</div>
                    <div><strong>수용번호:</strong> \${member.member_number || '-'}</div>
                    <div><strong>수용기관:</strong> \${member.institution || '미지정'}</div>
                    <div><strong>사서함:</strong> \${member.mailbox_address || '-'}</div>
                    <div><strong>입금자명:</strong> \${member.depositor_name || '-'}</div>
                \`
                
                // 폼 필드 채우기
                document.getElementById('edit-member-name').value = member.name
                document.getElementById('edit-member-number').value = member.member_number || ''
                document.getElementById('edit-member-institution').value = member.institution || ''
                document.getElementById('edit-member-mailbox').value = member.mailbox_address || ''
                document.getElementById('edit-member-depositor').value = member.depositor_name || ''
                document.getElementById('edit-member-reason').value = ''
                
                // 모달 열기
                document.getElementById('edit-member-modal').classList.remove('hidden')
            } catch (error) {
                console.error('회원 정보 조회 오류:', error)
                alert(\`회원 정보를 불러오는데 실패했습니다.\\n\\n\${error.response?.data?.error || error.message}\`)
            }
        }
        
        // 회원 정보 수정 모달 닫기
        function closeEditMemberModal() {
            document.getElementById('edit-member-modal').classList.add('hidden')
            currentEditingMemberId = null
            currentEditingMemberData = null
        }
        
        // 회원 정보 수정 제출
        async function submitMemberEdit() {
            if (!currentEditingMemberId || !currentEditingMemberData) return
            
            const newNumber = document.getElementById('edit-member-number').value.trim()
            const newInstitution = document.getElementById('edit-member-institution').value.trim()
            const newMailbox = document.getElementById('edit-member-mailbox').value.trim()
            const newDepositor = document.getElementById('edit-member-depositor').value.trim()
            const reason = document.getElementById('edit-member-reason').value.trim()
            
            // 변경 사항 확인
            const changes = []
            if (newNumber !== (currentEditingMemberData.member_number || '')) {
                changes.push(\`수용번호: \${currentEditingMemberData.member_number || '-'} → \${newNumber || '-'}\`)
            }
            if (newInstitution !== (currentEditingMemberData.institution || '')) {
                changes.push(\`수용기관: \${currentEditingMemberData.institution || '미지정'} → \${newInstitution || '미지정'}\`)
            }
            if (newMailbox !== (currentEditingMemberData.mailbox_address || '')) {
                changes.push(\`사서함: \${currentEditingMemberData.mailbox_address || '-'} → \${newMailbox || '-'}\`)
            }
            if (newDepositor !== (currentEditingMemberData.depositor_name || '')) {
                changes.push(\`입금자명: \${currentEditingMemberData.depositor_name || '-'} → \${newDepositor || '-'}\`)
            }
            
            if (changes.length === 0) {
                alert('변경된 내용이 없습니다.')
                return
            }
            
            // 확인
            const confirmMsg = \`다음 정보를 수정하시겠습니까?\\n\\n\${changes.join('\\n')}\\n\\n※ 이 변경은 관리자 승인이 필요합니다.\`
            if (!confirm(confirmMsg)) return
            
            try {
                // 회원 정보 수정 요청 (승인 필요)
                await axios.put(\`\${API_BASE}/members/\${currentEditingMemberId}\`, {
                    member_number: newNumber,
                    institution: newInstitution,
                    mailbox_address: newMailbox,
                    depositor_name: newDepositor,
                    change_reason: reason || changes.join(', '),
                    approval_required: true
                })
                
                alert(\`회원 정보 수정 요청이 저장되었습니다.\\n\\n변경 내역:\\n\${changes.join('\\n')}\\n\\n※ 관리자 승인 후 반영됩니다.\`)
                
                // 모달 닫고 목록 새로고침
                closeEditMemberModal()
                loadMembers()
            } catch (error) {
                console.error('회원 정보 수정 오류:', error)
                alert(\`회원 정보 수정 실패:\\n\\n\${error.response?.data?.error || error.message}\`)
            }
        }
        
        // ==================== 회원 정보 수정 관련 함수 끝 ====================
        
        // 담당자 배정 및 티켓 확정
        async function assignStaffAndConfirmTicket() {
            if (!currentInspectionId) return
            
            const staffId = document.getElementById('inspection-staff').value
            
            if (!staffId) {
                alert('담당자를 선택해주세요.')
                return
            }
            
            const name = document.getElementById('inspection-name').value.trim()
            const number = document.getElementById('inspection-number').value.trim()
            const institution = document.getElementById('inspection-institution').value.trim()
            const mailboxAddress = document.getElementById('inspection-address').value.trim()
            const notes = document.getElementById('inspection-notes').value.trim()
            
            try {
                let memberId = null
                let memberName = '미지정'
                
                // 회원 정보가 있으면 처리
                if (name && number) {
                    // 1. 회원 검색
                    const membersRes = await axios.get(\`\${API_BASE}/members?search=\${number}\`)
                    const members = membersRes.data.members || []
                    
                    if (members.length === 0) {
                        // 신규 회원 등록
                        const confirmCreate = window.confirm(\`수용번호 "\${number}"를 찾을 수 없습니다.\\n\\n신규 회원으로 등록하시겠습니까?\\n\\n(취소 시 미지정 회원으로 처리됩니다)\`)
                        
                        if (confirmCreate) {
                            const newMemberRes = await axios.post(\`\${API_BASE}/members\`, {
                                name,
                                member_number: number,
                                inmate_number: number,
                                institution: institution || '미지정',
                                mailbox_address: mailboxAddress || '',
                                depositor_name: name,
                                status: 'active',
                                notes: '우편물 검수에서 자동 등록'
                            })
                            
                            memberId = newMemberRes.data.member.id
                            memberName = name
                            alert(\`신규 회원이 등록되었습니다: \${name}\`)
                        }
                    } else {
                        // 기존 회원 매칭
                        memberId = members[0].id
                        memberName = members[0].name
                    }
                }
                
                // 2. 우편물 정보 업데이트
                await axios.put(\`\${API_BASE}/mailroom/\${currentInspectionId}\`, {
                    member_id: memberId,
                    member_name: memberName,
                    member_number: number || '',
                    institution: institution || '',
                    notes: notes,
                    status: 'assigned'
                })
                
                // 3. 티켓 생성 및 확정 (임시 티켓 → 정식 티켓)
                const ticketRes = await axios.post(\`\${API_BASE}/tickets\`, {
                    member_id: memberId,  // null 가능 (미지정)
                    staff_id: parseInt(staffId),
                    ticket_type: 'mailroom',
                    priority: 'normal',
                    title: \`우편물 처리: \${memberName}\`,
                    description: memberId 
                        ? \`우편물 검수 완료\\n발신자: \${name}\\n수용번호: \${number}\\n기관: \${institution}\`
                        : \`우편물 검수 완료\\n회원: 미지정\\n담당자가 추후 회원을 연결해주세요.\`,
                    status: 'in_progress'
                })
                
                const ticketNumber = ticketRes.data.ticket.ticket_number
                
                // 4. 우편물에 티켓 연결
                await axios.patch(\`\${API_BASE}/mailroom/\${currentInspectionId}/status\`, {
                    status: 'assigned',
                    ticket_id: ticketRes.data.ticket.id
                })
                
                const message = memberId 
                    ? \`담당자 배정 완료!\\n\\n티켓 번호: \${ticketNumber}\\n회원: \${memberName}\\n담당자가 배정되었습니다.\`
                    : \`담당자 배정 완료!\\n\\n티켓 번호: \${ticketNumber}\\n회원: 미지정\\n\\n담당자가 티켓 상세에서 회원을 등록할 수 있습니다.\`
                
                alert(message)
                
                closeInspectionDetail()
                await loadProcessedMail()
                await loadPendingMail()
            } catch (error) {
                console.error('담당자 배정 오류:', error)
                alert('담당자 배정 실패: ' + (error.response?.data?.error || error.message))
            }
        }
        
        // 검수 정보 임시 저장
        async function saveInspectionEdit() {
            if (!currentInspectionId) return
            
            const name = document.getElementById('inspection-name').value
            const number = document.getElementById('inspection-number').value
            const institution = document.getElementById('inspection-institution').value
            const notes = document.getElementById('inspection-notes').value
            
            try {
                await axios.put(\`\${API_BASE}/mailroom/\${currentInspectionId}\`, {
                    notes,
                    member_name: name,
                    member_number: number,
                    institution
                })
                
                alert('임시 저장되었습니다.')
                closeInspectionDetail()
                await loadProcessedMail()
            } catch (error) {
                console.error('저장 오류:', error)
                alert('저장 실패: ' + (error.response?.data?.error || error.message))
            }
        }
        
        // 검수 후 티켓 생성
        async function createTicketFromInspection() {
            if (!currentInspectionId) return
            
            const name = document.getElementById('inspection-name').value
            const number = document.getElementById('inspection-number').value
            const institution = document.getElementById('inspection-institution').value
            
            if (!name || !number) {
                alert('수신자 이름과 번호를 입력해주세요.')
                return
            }
            
            try {
                // 회원 검색
                const membersRes = await axios.get(\`\${API_BASE}/members?search=\${number}\`)
                const members = membersRes.data.members || []
                
                let memberId
                
                if (members.length === 0) {
                    // 신규 회원 등록
                    const confirm = window.confirm(\`회원번호 "\${number}"를 찾을 수 없습니다.\\n\\n신규 회원으로 등록하시겠습니까?\`)
                    if (!confirm) return
                    
                    const newMemberRes = await axios.post(\`\${API_BASE}/members\`, {
                        name,
                        member_number: number,
                        institution: institution || '미지정',
                        mailbox_address: '',
                        depositor_name: name,
                        status: 'active',
                        notes: '우편물 검수에서 자동 등록'
                    })
                    
                    memberId = newMemberRes.data.id
                    alert('신규 회원이 등록되었습니다.')
                } else {
                    memberId = members[0].id
                }
                
                // 티켓 생성
                const ticketRes = await axios.post(\`\${API_BASE}/tickets\`, {
                    member_id: memberId,
                    title: \`우편물: \${name}\`,
                    description: \`우편물 검수를 통해 생성된 티켓\\n수신자: \${name}\\n번호: \${number}\\n기관: \${institution || '미지정'}\`,
                    priority: 'normal',
                    status: 'open',
                    assigned_to: currentStaff.id
                })
                
                const ticketId = ticketRes.data.id
                
                // 우편물에 티켓 연결
                await axios.put(\`\${API_BASE}/mailroom/\${currentInspectionId}\`, {
                    member_id: memberId,
                    ticket_id: ticketId,
                    status: 'assigned'
                })
                
                alert(\`티켓이 생성되었습니다.\\n티켓 번호: \${ticketRes.data.ticket_number}\`)
                closeInspectionDetail()
                await loadProcessedMail()
            } catch (error) {
                console.error('티켓 생성 오류:', error)
                alert('티켓 생성 실패: ' + (error.response?.data?.error || error.message))
            }
        }
        
        // 선택된 우편물 일괄 배당 (직원 선택 모달)
        async function assignSelectedMail() {
            if (selectedMailItems.length === 0) {
                alert('선택된 우편물이 없습니다.')
                return
            }
            
            try {
                // 직원 목록 조회
                const staffRes = await axios.get(\`\${API_BASE}/staff\`)
                const staffList = staffRes.data.staff || []
                
                if (staffList.length === 0) {
                    alert('담당자를 찾을 수 없습니다.')
                    return
                }
                
                // 직원 선택 HTML 생성
                const staffOptions = staffList.map(s => 
                    \`<option value="\${s.id}">\${s.name} (\${s.role === 'admin' ? '관리자' : s.role === 'staff' ? '직원' : '뷰어'})</option>\`
                ).join('')
                
                // 직원 선택 모달 생성
                const modalHTML = \`
                    <div id="staff-select-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                        <div class="bg-white rounded-lg max-w-md w-full p-6">
                            <div class="flex justify-between items-center mb-4">
                                <h3 class="text-xl font-bold">
                                    <i class="fas fa-user-check mr-2"></i>담당자 선택
                                </h3>
                                <button onclick="closeStaffSelectModal()" class="text-gray-500 hover:text-gray-700">
                                    <i class="fas fa-times text-xl"></i>
                                </button>
                            </div>
                            
                            <p class="text-gray-600 mb-4">
                                <i class="fas fa-info-circle mr-1"></i>
                                선택된 <strong>\${selectedMailItems.length}개</strong> 우편물을 담당자에게 배당합니다.
                            </p>
                            
                            <div class="mb-4">
                                <label class="block text-sm font-medium mb-2">담당자</label>
                                <select id="selected-staff-id" class="w-full px-3 py-2 border rounded">
                                    <option value="">-- 담당자 선택 --</option>
                                    \${staffOptions}
                                </select>
                            </div>
                            
                            <div class="flex gap-2">
                                <button onclick="closeStaffSelectModal()" class="btn btn-secondary flex-1">
                                    취소
                                </button>
                                <button onclick="confirmStaffAssign()" class="btn btn-primary flex-1">
                                    <i class="fas fa-check mr-1"></i>배당
                                </button>
                            </div>
                        </div>
                    </div>
                \`
                
                // 모달 추가
                document.body.insertAdjacentHTML('beforeend', modalHTML)
                
            } catch (error) {
                console.error('직원 목록 조회 오류:', error)
                alert('직원 목록을 불러올 수 없습니다.')
            }
        }
        
        // 직원 선택 모달 닫기
        function closeStaffSelectModal() {
            const modal = document.getElementById('staff-select-modal')
            if (modal) modal.remove()
        }
        
        // 직원 배당 확인
        async function confirmStaffAssign() {
            const staffId = document.getElementById('selected-staff-id').value
            
            if (!staffId) {
                alert('담당자를 선택해주세요.')
                return
            }
            
            try {
                // 일괄 배당 API 호출
                const response = await axios.post(\`\${API_BASE}/mailroom/batch-assign\`, {
                    mailroom_ids: selectedMailItems,
                    member_id: null,
                    staff_id: parseInt(staffId)
                })
                
                const { count } = response.data
                
                alert(\`✅ 배당 완료!\\n\\n- 우편물: \${count}개\\n- 담당자에게 배당되었습니다.\`)
                
                selectedMailItems = []
                closeStaffSelectModal()
                await loadProcessedMail()
                
            } catch (error) {
                console.error('일괄 배당 오류:', error)
                alert('배당 실패: ' + (error.response?.data?.error || error.message))
            }
        }
        
        // 선택된 우편물 삭제
        async function deleteSelectedMail() {
            if (!isAdmin()) {
                alert('우편물 삭제는 관리자만 가능합니다.')
                return
            }
            
            if (selectedMailItems.length === 0) {
                alert('선택된 우편물이 없습니다.')
                return
            }
            
            const confirmMsg = \`선택된 \${selectedMailItems.length}개 우편물을 삭제하시겠습니까?\\n\\n⚠️ 이 작업은 되돌릴 수 없습니다!\`
            if (!confirm(confirmMsg)) return
            
            try {
                // 각 우편물 삭제
                for (const mailId of selectedMailItems) {
                    await axios.delete(\`\${API_BASE}/mailroom/\${mailId}\`)
                }
                
                alert(\`✅ \${selectedMailItems.length}개 우편물이 삭제되었습니다.\`)
                
                selectedMailItems = []
                await loadProcessedMail()
                
            } catch (error) {
                console.error('우편물 삭제 오류:', error)
                alert('삭제 실패: ' + (error.response?.data?.error || error.message))
            }
        }
        
        // 우편물 이미지 보기
        async function viewMailImages(mailId) {
            try {
                const response = await axios.get(\`\${API_BASE}/mailroom/\${mailId}\`)
                const item = response.data.mailroom_item
                const imageKeys = JSON.parse(item.image_keys)
                
                // 간단한 이미지 뷰어 (새 창)
                const imageUrls = imageKeys.map(key => \`\${API_BASE}/mailroom/image/\${key}\`).join('\\n')
                alert(\`우편물 번호: \${item.mail_number}\\n\\n이미지 URL:\\n\${imageUrls}\`)
                
                // TODO: 나중에 모달로 개선
            } catch (error) {
                alert('이미지 조회 실패: ' + (error.response?.data?.error || error.message))
            }
        }
        
        // 우편물 삭제
        async function deleteMailItem(mailId) {
            if (!isAdmin()) {
                alert('우편물 삭제는 관리자만 가능합니다.')
                return
            }
            
            if (!confirm('이 우편물을 삭제하시겠습니까?')) return
            
            try {
                await axios.delete(\`\${API_BASE}/mailroom/\${mailId}\`)
                alert('우편물이 삭제되었습니다.')
                await loadPendingMail()
            } catch (error) {
                alert('삭제 실패: ' + (error.response?.data?.error || error.message))
            }
        }
        
        // 처리 내역 로드
        async function loadMailHistory() {
            try {
                const response = await axios.get(\`\${API_BASE}/mailroom?status=all\`)
                const items = response.data.mailroom_items || []
                
                const container = document.getElementById('mail-history-list')
                
                if (items.length === 0) {
                    container.innerHTML = '<p class="text-gray-500 text-center py-8">처리 내역이 없습니다.</p>'
                    return
                }
                
                const getStatusBadge = (status) => {
                    const badges = {
                        'received': '<span class="status-badge bg-gray-100 text-gray-800">수령</span>',
                        'ocr_processing': '<span class="status-badge bg-blue-100 text-blue-800">OCR 처리중</span>',
                        'ocr_completed': '<span class="status-badge bg-green-100 text-green-800">OCR 완료</span>',
                        'inspection': '<span class="status-badge bg-yellow-100 text-yellow-800">검수중</span>',
                        'assigned': '<span class="status-badge bg-purple-100 text-purple-800">배당완료</span>',
                        'completed': '<span class="status-badge bg-green-100 text-green-800">처리완료</span>'
                    }
                    return badges[status] || status
                }
                
                container.innerHTML = items.map(item => \`
                    <div class="border rounded p-3 hover:bg-gray-50">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <div class="flex items-center space-x-2">
                                    <span class="font-mono font-bold text-blue-600">\${item.mail_number}</span>
                                    \${getStatusBadge(item.status)}
                                </div>
                                \${item.member_name ? \`<p class="text-sm mt-1"><i class="fas fa-user mr-1"></i>\${item.member_name} (\${item.institution})</p>\` : ''}
                                \${item.ticket_number ? \`<p class="text-sm text-gray-600"><i class="fas fa-ticket-alt mr-1"></i>\${item.ticket_number}</p>\` : ''}
                                <p class="text-xs text-gray-400 mt-1">\${new Date(item.created_at).toLocaleString()}</p>
                            </div>
                            <button onclick="viewMailImages('\${item.id}')" class="btn btn-sm btn-secondary">
                                <i class="fas fa-images"></i>
                            </button>
                        </div>
                    </div>
                \`).join('')
            } catch (error) {
                console.error('처리 내역 로드 오류:', error)
            }
        }


        // 도서 등록 모달
        function showNewBookModal() {
            document.getElementById('new-book-modal').classList.remove('hidden')
        }

        function closeNewBookModal() {
            document.getElementById('new-book-modal').classList.add('hidden')
            // 폼 초기화
            document.getElementById('book-title').value = ''
            document.getElementById('book-author').value = ''
            document.getElementById('book-publisher').value = ''
            document.getElementById('book-isbn').value = ''
            document.getElementById('book-price').value = ''
            document.getElementById('book-stock').value = '0'
            document.getElementById('book-description').value = ''
        }

        async function createBook() {
            const title = document.getElementById('book-title').value
            const author = document.getElementById('book-author').value
            const publisher = document.getElementById('book-publisher').value
            const isbn = document.getElementById('book-isbn').value
            const price = parseFloat(document.getElementById('book-price').value)
            const stock = parseInt(document.getElementById('book-stock').value) || 0
            const description = document.getElementById('book-description').value

            // 필수 항목 검증
            if (!title || !price || price <= 0) {
                alert('제목과 가격은 필수입니다.')
                return
            }

            const data = {
                title: title,
                author: author,
                publisher: publisher,
                isbn: isbn,
                price: price,
                stock: stock,
                description: description
            }

            try {
                await axios.post(\`\${API_BASE}/books\`, data)
                alert('도서가 등록되었습니다.')
                closeNewBookModal()
                if (currentView === 'books') await loadBooks()
            } catch (error) {
                alert('도서 등록 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 도서 상세/수정 모달
        let currentBookId = null

        async function showBookDetail(bookId) {
            try {
                const response = await axios.get(\`\${API_BASE}/books/\${bookId}\`)
                const book = response.data.book

                currentBookId = bookId

                // 기본 정보 표시
                document.getElementById('detail-book-title').textContent = book.title
                document.getElementById('edit-book-title').value = book.title
                document.getElementById('edit-book-author').value = book.author || ''
                document.getElementById('edit-book-publisher').value = book.publisher || ''
                document.getElementById('edit-book-isbn').value = book.isbn || ''
                document.getElementById('edit-book-price').value = book.price
                document.getElementById('edit-book-stock').value = book.stock
                document.getElementById('edit-book-status').value = book.status || 'available'
                document.getElementById('edit-book-description').value = book.description || ''

                document.getElementById('book-detail-modal').classList.remove('hidden')
            } catch (error) {
                console.error('도서 상세 로드 오류:', error)
                alert('도서 정보를 불러오는데 실패했습니다.')
            }
        }

        function closeBookDetail() {
            currentBookId = null
            document.getElementById('book-detail-modal').classList.add('hidden')
        }

        function adjustStock(amount) {
            const stockInput = document.getElementById('edit-book-stock')
            const currentStock = parseInt(stockInput.value) || 0
            const newStock = Math.max(0, currentStock + amount)
            stockInput.value = newStock
        }

        async function updateBook() {
            if (!currentBookId) return

            const title = document.getElementById('edit-book-title').value
            const author = document.getElementById('edit-book-author').value
            const publisher = document.getElementById('edit-book-publisher').value
            const isbn = document.getElementById('edit-book-isbn').value
            const price = parseFloat(document.getElementById('edit-book-price').value)
            const stock = parseInt(document.getElementById('edit-book-stock').value)
            const status = document.getElementById('edit-book-status').value
            const description = document.getElementById('edit-book-description').value

            // 필수 항목 검증
            if (!title || !price || price <= 0) {
                alert('제목과 가격은 필수입니다.')
                return
            }

            const data = {
                title: title,
                author: author,
                publisher: publisher,
                isbn: isbn,
                price: price,
                stock: stock,
                status: status,
                description: description
            }

            try {
                await axios.patch(\`\${API_BASE}/books/\${currentBookId}\`, data)
                alert('도서 정보가 수정되었습니다.')
                closeBookDetail()
                if (currentView === 'books') await loadBooks()
            } catch (error) {
                alert('도서 수정 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        async function deleteBook() {
            if (!isAdmin()) {
                alert('도서 삭제는 관리자만 가능합니다.')
                return
            }
            
            if (!currentBookId) return

            if (!confirm('정말 이 도서를 삭제하시겠습니까?')) return

            try {
                await axios.delete(\`\${API_BASE}/books/\${currentBookId}\`)
                alert('도서가 삭제되었습니다.')
                closeBookDetail()
                if (currentView === 'books') await loadBooks()
            } catch (error) {
                alert('도서 삭제 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 직원 등록 모달
        function showNewStaffModal() {
            document.getElementById('new-staff-modal').classList.remove('hidden')
        }

        function closeNewStaffModal() {
            document.getElementById('new-staff-modal').classList.add('hidden')
            // 폼 초기화
            document.getElementById('staff-name').value = ''
            document.getElementById('staff-email').value = ''
            document.getElementById('staff-password').value = ''
            document.getElementById('staff-password-confirm').value = ''
            document.getElementById('staff-role').value = 'staff'
        }

        async function createStaff() {
            const name = document.getElementById('staff-name').value
            const email = document.getElementById('staff-email').value
            const password = document.getElementById('staff-password').value
            const passwordConfirm = document.getElementById('staff-password-confirm').value
            const role = document.getElementById('staff-role').value

            // 필수 항목 검증
            if (!name || !email || !password) {
                alert('이름, 이메일, 비밀번호는 필수입니다.')
                return
            }

            // 이메일 형식 검증
            const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/
            if (!emailRegex.test(email)) {
                alert('올바른 이메일 형식을 입력해주세요.')
                return
            }

            // 비밀번호 길이 검증
            if (password.length < 6) {
                alert('비밀번호는 최소 6자 이상이어야 합니다.')
                return
            }

            // 비밀번호 확인
            if (password !== passwordConfirm) {
                alert('비밀번호가 일치하지 않습니다.')
                return
            }

            const data = {
                name: name,
                email: email,
                password: password,
                role: role
            }

            try {
                await axios.post(\`\${API_BASE}/staff\`, data)
                alert('직원이 등록되었습니다.')
                closeNewStaffModal()
                if (currentView === 'staff') await loadStaff()
            } catch (error) {
                alert('직원 등록 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 직원 상세/수정 모달
        let currentStaffDetailId = null

        async function showStaffDetail(staffId) {
            try {
                const response = await axios.get(\`\${API_BASE}/staff/\${staffId}\`)
                const staff = response.data.staff
                const stats = response.data.stats || {}

                currentStaffDetailId = staffId

                // 기본 정보
                document.getElementById('detail-staff-name').textContent = staff.name
                document.getElementById('edit-staff-name').value = staff.name
                document.getElementById('edit-staff-email').value = staff.email
                document.getElementById('edit-staff-role').value = staff.role
                document.getElementById('detail-staff-created').value = new Date(staff.created_at).toLocaleDateString()

                // 비밀번호 필드 초기화
                document.getElementById('edit-staff-new-password').value = ''
                document.getElementById('edit-staff-password-confirm').value = ''

                // 업무 통계
                document.getElementById('stat-assigned-tickets').textContent = stats.assigned_tickets || 0
                document.getElementById('stat-completed-tickets').textContent = stats.completed_tickets || 0
                document.getElementById('stat-completion-rate').textContent = 
                    (stats.assigned_tickets > 0 ? Math.round((stats.completed_tickets / stats.assigned_tickets) * 100) : 0) + '%'
                document.getElementById('stat-attendance-days').textContent = stats.attendance_days || 0

                document.getElementById('staff-detail-modal').classList.remove('hidden')
            } catch (error) {
                console.error('직원 상세 로드 오류:', error)
                alert('직원 정보를 불러오는데 실패했습니다.')
            }
        }

        function closeStaffDetail() {
            currentStaffDetailId = null
            document.getElementById('staff-detail-modal').classList.add('hidden')
        }

        async function updateStaff() {
            if (!currentStaffDetailId) return

            const name = document.getElementById('edit-staff-name').value
            const email = document.getElementById('edit-staff-email').value
            const role = document.getElementById('edit-staff-role').value
            const newPassword = document.getElementById('edit-staff-new-password').value
            const passwordConfirm = document.getElementById('edit-staff-password-confirm').value

            // 필수 항목 검증
            if (!name || !email) {
                alert('이름과 이메일은 필수입니다.')
                return
            }

            // 이메일 형식 검증
            const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/
            if (!emailRegex.test(email)) {
                alert('올바른 이메일 형식을 입력해주세요.')
                return
            }

            // 비밀번호 변경 시 검증
            if (newPassword) {
                if (newPassword.length < 6) {
                    alert('비밀번호는 최소 6자 이상이어야 합니다.')
                    return
                }
                if (newPassword !== passwordConfirm) {
                    alert('비밀번호가 일치하지 않습니다.')
                    return
                }
            }

            const data = {
                name: name,
                email: email,
                role: role
            }

            // 비밀번호 변경 시에만 포함
            if (newPassword) {
                data.password = newPassword
            }

            try {
                await axios.patch(\`\${API_BASE}/staff/\${currentStaffDetailId}\`, data)
                alert('직원 정보가 수정되었습니다.')
                closeStaffDetail()
                if (currentView === 'staff') await loadStaff()
            } catch (error) {
                alert('직원 수정 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        async function deleteStaff() {
            if (!currentStaffDetailId) return

            // 자기 자신은 삭제 불가
            if (currentStaffDetailId === currentStaff.id) {
                alert('자기 자신은 삭제할 수 없습니다.')
                return
            }

            if (!confirm('정말 이 직원을 삭제하시겠습니까?\\n\\n직원과 관련된 모든 데이터는 유지되지만, 로그인할 수 없게 됩니다.')) return

            try {
                await axios.delete(\`\${API_BASE}/staff/\${currentStaffDetailId}\`)
                alert('직원이 삭제되었습니다.')
                closeStaffDetail()
                if (currentView === 'staff') await loadStaff()
            } catch (error) {
                alert('직원 삭제 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // ==================== 티켓 아이템 시스템 (장바구니) ====================
        
        let currentRequestType = null
        // selectedMatches는 이미 위에서 선언됨 (라인 4392)
        let selectedBook = null

        // 요청사항 추가 모달 열기
        function showAddRequestModal(requestType) {
            currentRequestType = requestType
            document.getElementById('add-request-modal').classList.remove('hidden')
            
            // 모든 폼 숨기기
            document.querySelectorAll('.request-form').forEach(form => form.classList.add('hidden'))
            
            // 선택된 타입의 폼만 표시
            if (requestType === 'betting') {
                document.getElementById('add-request-modal-title').textContent = '배팅 추가'
                document.getElementById('betting-form').classList.remove('hidden')
                loadMatchesForBetting()
            } else if (requestType === 'book_order') {
                document.getElementById('add-request-modal-title').textContent = '도서 발주 추가'
                document.getElementById('book-order-form').classList.remove('hidden')
            } else if (requestType === 'point_request') {
                document.getElementById('add-request-modal-title').textContent = '포인트 요청 추가'
                document.getElementById('point-request-form').classList.remove('hidden')
            }
        }

        // 모달 닫기
        function closeAddRequestModal() {
            document.getElementById('add-request-modal').classList.add('hidden')
            selectedMatches = []
            selectedBook = null
        }

        // 경기 목록 로드
        async function loadMatchesForBetting() {
            try {
                const response = await axios.get(\`\${API_BASE}/betting/matches?status=open\`)
                const matches = response.data.matches || []
                
                const container = document.getElementById('modal-betting-matches-list')
                if (matches.length === 0) {
                    container.innerHTML = '<p class="text-gray-500 text-center">진행 중인 경기가 없습니다</p>'
                    return
                }
                
                container.innerHTML = matches.map(m => {
                    let optionsHtml = ''
                    
                    // 승무패 옵션
                    if (m.home_odds && m.draw_odds && m.away_odds) {
                        optionsHtml += \`
                            <div class="text-xs text-gray-600 font-medium mb-1">승무패</div>
                            <div class="grid grid-cols-3 gap-1 text-sm mb-2">
                                <label class="border rounded p-1 cursor-pointer hover:bg-blue-50">
                                    <input type="checkbox" 
                                        data-match-id="\${m.id}" 
                                        data-outcome="home_win" 
                                        data-odds="\${m.home_odds}"
                                        data-teams="\${m.home_team} vs \${m.away_team}"
                                        onchange="toggleMatchSelection(this)"
                                        class="match-checkbox mr-1">
                                    <span>홈승 (\${m.home_odds})</span>
                                </label>
                                <label class="border rounded p-1 cursor-pointer hover:bg-blue-50">
                                    <input type="checkbox" 
                                        data-match-id="\${m.id}" 
                                        data-outcome="draw" 
                                        data-odds="\${m.draw_odds}"
                                        data-teams="\${m.home_team} vs \${m.away_team}"
                                        onchange="toggleMatchSelection(this)"
                                        class="match-checkbox mr-1">
                                    <span>무승부 (\${m.draw_odds})</span>
                                </label>
                                <label class="border rounded p-1 cursor-pointer hover:bg-blue-50">
                                    <input type="checkbox" 
                                        data-match-id="\${m.id}" 
                                        data-outcome="away_win" 
                                        data-odds="\${m.away_odds}"
                                        data-teams="\${m.home_team} vs \${m.away_team}"
                                        onchange="toggleMatchSelection(this)"
                                        class="match-checkbox mr-1">
                                    <span>원정승 (\${m.away_odds})</span>
                                </label>
                            </div>
                        \`
                    }
                    
                    // 언오버 옵션
                    if (m.over_line && m.over_odds && m.under_odds) {
                        optionsHtml += \`
                            <div class="text-xs text-gray-600 font-medium mb-1">언오버 (기준: \${m.over_line})</div>
                            <div class="grid grid-cols-2 gap-1 text-sm mb-2">
                                <label class="border rounded p-1 cursor-pointer hover:bg-blue-50">
                                    <input type="checkbox" 
                                        data-match-id="\${m.id}" 
                                        data-outcome="over" 
                                        data-odds="\${m.over_odds}"
                                        data-teams="\${m.home_team} vs \${m.away_team}"
                                        data-line="\${m.over_line}"
                                        onchange="toggleMatchSelection(this)"
                                        class="match-checkbox mr-1">
                                    <span>오버 \${m.over_line} (\${m.over_odds})</span>
                                </label>
                                <label class="border rounded p-1 cursor-pointer hover:bg-blue-50">
                                    <input type="checkbox" 
                                        data-match-id="\${m.id}" 
                                        data-outcome="under" 
                                        data-odds="\${m.under_odds}"
                                        data-teams="\${m.home_team} vs \${m.away_team}"
                                        data-line="\${m.over_line}"
                                        onchange="toggleMatchSelection(this)"
                                        class="match-checkbox mr-1">
                                    <span>언더 \${m.over_line} (\${m.under_odds})</span>
                                </label>
                            </div>
                        \`
                    }
                    
                    // 핸디캡 옵션
                    if (m.handicap_line !== null && m.handicap_home_odds && m.handicap_away_odds) {
                        optionsHtml += \`
                            <div class="text-xs text-gray-600 font-medium mb-1">핸디캡 (\${m.handicap_line > 0 ? '+' : ''}\${m.handicap_line})</div>
                            <div class="grid grid-cols-2 gap-1 text-sm">
                                <label class="border rounded p-1 cursor-pointer hover:bg-blue-50">
                                    <input type="checkbox" 
                                        data-match-id="\${m.id}" 
                                        data-outcome="handicap_home" 
                                        data-odds="\${m.handicap_home_odds}"
                                        data-teams="\${m.home_team} vs \${m.away_team}"
                                        data-line="\${m.handicap_line}"
                                        onchange="toggleMatchSelection(this)"
                                        class="match-checkbox mr-1">
                                    <span>홈 \${m.handicap_line > 0 ? '+' : ''}\${m.handicap_line} (\${m.handicap_home_odds})</span>
                                </label>
                                <label class="border rounded p-1 cursor-pointer hover:bg-blue-50">
                                    <input type="checkbox" 
                                        data-match-id="\${m.id}" 
                                        data-outcome="handicap_away" 
                                        data-odds="\${m.handicap_away_odds}"
                                        data-teams="\${m.home_team} vs \${m.away_team}"
                                        data-line="\${m.handicap_line}"
                                        onchange="toggleMatchSelection(this)"
                                        class="match-checkbox mr-1">
                                    <span>원정 \${m.handicap_line < 0 ? '+' : ''}\${-m.handicap_line} (\${m.handicap_away_odds})</span>
                                </label>
                            </div>
                        \`
                    }
                    
                    return \`
                        <div class="border rounded p-2 hover:bg-gray-50">
                            <div class="flex justify-between items-center mb-2">
                                <span class="font-medium">\${m.home_team} vs \${m.away_team}</span>
                                <span class="text-xs text-gray-500">\${new Date(m.match_date).toLocaleDateString()}</span>
                            </div>
                            \${optionsHtml}
                        </div>
                    \`
                }).join('')
            } catch (error) {
                console.error('경기 목록 로드 오류:', error)
            }
        }

        // 경기 선택 토글
        function toggleMatchSelection(checkbox) {
            const folderType = document.getElementById('new-folder-type').value
            const matchId = checkbox.dataset.matchId
            
            if (checkbox.checked) {
                if (folderType === 'single') {
                    // 단폴더: 기존 선택 해제하고 현재만 선택
                    document.querySelectorAll('.match-checkbox').forEach(cb => {
                        if (cb !== checkbox) cb.checked = false
                    })
                    selectedMatches = [{
                        match_id: matchId,
                        selected_outcome: checkbox.dataset.outcome,
                        odds: parseFloat(checkbox.dataset.odds),
                        teams: checkbox.dataset.teams,
                        line: checkbox.dataset.line ? parseFloat(checkbox.dataset.line) : null
                    }]
                } else {
                    // 다폴더: 같은 경기의 다른 결과는 해제
                    document.querySelectorAll(\`.match-checkbox[data-match-id="\${matchId}"]\`).forEach(cb => {
                        if (cb !== checkbox) cb.checked = false
                    })
                    
                    // 선택 목록에 추가
                    selectedMatches = selectedMatches.filter(m => m.match_id !== matchId)
                    selectedMatches.push({
                        match_id: matchId,
                        selected_outcome: checkbox.dataset.outcome,
                        odds: parseFloat(checkbox.dataset.odds),
                        teams: checkbox.dataset.teams,
                        line: checkbox.dataset.line ? parseFloat(checkbox.dataset.line) : null
                    })
                }
            } else {
                // 선택 해제
                selectedMatches = selectedMatches.filter(m => 
                    !(m.match_id === matchId && m.selected_outcome === checkbox.dataset.outcome)
                )
            }
            
            updateModalPotentialWin()
        }

        // 폴더 타입 변경
        function updateFolderType() {
            const folderType = document.getElementById('new-folder-type').value
            const displayText = folderType === 'single' ? '단폴더' : '다폴더'
            const guideText = folderType === 'single' ? '1개만 선택 가능' : '여러 경기 선택 가능'
            
            document.getElementById('new-folder-type-display').textContent = displayText
            document.getElementById('selection-guide').textContent = guideText
            
            // 선택 초기화
            document.querySelectorAll('.match-checkbox').forEach(cb => cb.checked = false)
            selectedMatches = []
            updateModalPotentialWin()
        }

        // 예상 당첨금 업데이트
        function updateModalPotentialWin() {
            const betAmount = parseFloat(document.getElementById('new-bet-amount').value) || 0
            const totalOdds = selectedMatches.reduce((acc, m) => acc * m.odds, 1)
            const potentialWin = Math.floor(betAmount * totalOdds)
            
            document.getElementById('modal-total-odds-display').textContent = totalOdds.toFixed(2)
            document.getElementById('modal-potential-win-display').textContent = potentialWin.toLocaleString() + '원'
        }

        // 배팅 요청 추가
        async function addBettingRequest() {
            if (!currentTicketId) {
                alert('티켓이 선택되지 않았습니다.')
                return
            }
            
            if (selectedMatches.length === 0) {
                alert('경기를 선택해주세요.')
                return
            }
            
            const betAmount = parseFloat(document.getElementById('new-bet-amount').value)
            if (!betAmount || betAmount <= 0) {
                alert('배팅 금액을 입력해주세요.')
                return
            }
            
            // 회원 ID 가져오기
            const memberId = currentTicket?.member_id
            if (!memberId) {
                alert('회원 정보를 찾을 수 없습니다.')
                return
            }
            
            const folderType = document.getElementById('new-folder-type').value
            const totalOdds = selectedMatches.reduce((acc, m) => acc * m.odds, 1)
            const potentialWin = Math.floor(betAmount * totalOdds)
            
            try {
                await axios.post(\`\${API_BASE}/ticket-items/\${currentTicketId}\`, {
                    item_type: 'betting',
                    item_data: {
                        member_id: memberId,
                        folder_type: folderType,
                        selections: selectedMatches,
                        bet_amount: betAmount,
                        total_odds: totalOdds,
                        potential_win: potentialWin
                    }
                })
                
                alert('배팅이 장바구니에 추가되었습니다.')
                closeAddRequestModal()
                loadTicketItems(currentTicketId)
            } catch (error) {
                alert('추가 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 도서 검색
        async function searchBooksForOrder() {
            const keyword = document.getElementById('book-search').value
            if (keyword.length < 2) {
                document.getElementById('book-search-results').innerHTML = '<p class="text-gray-500 text-center">최소 2글자 이상 입력하세요</p>'
                return
            }
            
            try {
                const response = await axios.get(\`\${API_BASE}/books?search=\${keyword}\`)
                const books = response.data.books || []
                
                const container = document.getElementById('book-search-results')
                if (books.length === 0) {
                    container.innerHTML = '<p class="text-gray-500 text-center">검색 결과가 없습니다</p>'
                    return
                }
                
                container.innerHTML = books.map(book => \`
                    <div class="border rounded p-2 hover:bg-gray-50 cursor-pointer" onclick='selectBook(\${JSON.stringify(book)})'>
                        <div class="font-medium">\${book.title}</div>
                        <div class="text-sm text-gray-600">\${book.author} · \${book.publisher}</div>
                        <div class="text-sm text-blue-600 font-bold">\${book.price?.toLocaleString()}원 · 재고: \${book.stock}</div>
                    </div>
                \`).join('')
            } catch (error) {
                console.error('도서 검색 오류:', error)
            }
        }

        // 도서 선택
        function selectBook(book) {
            selectedBook = book
            document.getElementById('book-search').value = book.title
            document.getElementById('book-search-results').innerHTML = \`
                <div class="border border-blue-500 rounded p-2 bg-blue-50">
                    <div class="font-medium">\${book.title}</div>
                    <div class="text-sm text-gray-600">\${book.author} · \${book.publisher}</div>
                    <div class="text-sm text-blue-600 font-bold">\${book.price?.toLocaleString()}원</div>
                    <div class="text-xs text-green-600 mt-1">✓ 선택됨</div>
                </div>
            \`
        }

        // 도서 발주 요청 추가
        async function addBookOrderRequest() {
            if (!currentTicketId) {
                alert('티켓이 선택되지 않았습니다.')
                return
            }
            
            if (!selectedBook) {
                alert('도서를 선택해주세요.')
                return
            }
            
            const quantity = parseInt(document.getElementById('book-order-quantity').value) || 1
            const notes = document.getElementById('book-order-notes').value
            
            try {
                await axios.post(\`\${API_BASE}/ticket-items/\${currentTicketId}\`, {
                    item_type: 'book_order',
                    item_data: {
                        book_id: selectedBook.id,
                        book_title: selectedBook.title,
                        book_author: selectedBook.author,
                        book_price: selectedBook.price,
                        quantity: quantity,
                        total_price: selectedBook.price * quantity
                    },
                    notes: notes
                })
                
                alert('도서 발주가 장바구니에 추가되었습니다.')
                closeAddRequestModal()
                loadTicketItems(currentTicketId)
            } catch (error) {
                alert('추가 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 포인트 요청 추가
        async function addPointRequest() {
            if (!currentTicketId) {
                alert('티켓이 선택되지 않았습니다.')
                return
            }
            
            // 회원 ID 가져오기
            const memberId = currentTicket?.member_id
            if (!memberId) {
                alert('회원 정보를 찾을 수 없습니다.')
                return
            }
            
            const pointType = document.getElementById('point-request-type').value
            const transactionType = document.getElementById('point-transaction-type').value
            const amount = parseInt(document.getElementById('point-request-amount').value)
            const reason = document.getElementById('point-request-reason').value
            
            if (!amount || amount <= 0) {
                alert('금액을 입력해주세요.')
                return
            }
            
            if (!reason) {
                alert('사유를 입력해주세요.')
                return
            }
            
            try {
                await axios.post(\`\${API_BASE}/ticket-items/\${currentTicketId}\`, {
                    item_type: 'point_request',
                    item_data: {
                        member_id: memberId,
                        point_type: pointType,
                        transaction_type: transactionType,
                        amount: amount,
                        description: reason
                    }
                })
                
                alert('포인트 요청이 장바구니에 추가되었습니다.')
                closeAddRequestModal()
                loadTicketItems(currentTicketId)
            } catch (error) {
                alert('추가 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 티켓 아이템 목록 로드
        async function loadTicketItems(ticketId) {
            try {
                const response = await axios.get(\`\${API_BASE}/ticket-items/\${ticketId}\`)
                const items = response.data.items || []
                
                const countBadge = document.getElementById('cart-count')
                const cartBadge = document.getElementById('cart-badge')
                countBadge.textContent = items.length
                cartBadge.textContent = items.length
                
                const container = document.getElementById('ticket-requests-list')
                if (items.length === 0) {
                    container.innerHTML = '<p class="text-gray-500 text-center py-8">추가된 요청사항이 없습니다</p>'
                    document.getElementById('process-all-btn').style.display = 'none'
                    document.getElementById('clear-all-btn').style.display = 'none'
                    return
                }
                
                document.getElementById('process-all-btn').style.display = 'block'
                document.getElementById('clear-all-btn').style.display = 'block'
                
                container.innerHTML = items.map(item => {
                    const data = item.item_data
                    let itemContent = ''
                    let icon = ''
                    let color = ''
                    
                    if (item.item_type === 'betting') {
                        icon = 'fa-trophy'
                        color = 'text-green-600'
                        itemContent = \`
                            <div class="font-medium">배팅 (\${data.folder_type === 'single' ? '단폴더' : '다폴더'})</div>
                            <div class="text-sm text-gray-600">
                                \${data.selections.map(s => \`\${s.teams} - \${getOutcomeText(s.selected_outcome, s.line)} (\${s.odds})\`).join('<br>')}
                            </div>
                            <div class="text-sm font-bold text-blue-600">배팅금: \${data.bet_amount?.toLocaleString()}원 · 예상 당첨금: \${data.potential_win?.toLocaleString()}원</div>
                        \`
                    } else if (item.item_type === 'book_order') {
                        icon = 'fa-book'
                        color = 'text-blue-600'
                        itemContent = \`
                            <div class="font-medium">도서 발주: \${data.book_title}</div>
                            <div class="text-sm text-gray-600">\${data.book_author} · \${data.quantity}권</div>
                            <div class="text-sm font-bold text-blue-600">금액: \${data.total_price?.toLocaleString()}원</div>
                            \${item.notes ? \`<div class="text-xs text-gray-500 mt-1">메모: \${item.notes}</div>\` : ''}
                        \`
                    } else if (item.item_type === 'point_request') {
                        icon = 'fa-coins'
                        color = 'text-yellow-600'
                        const pointTypeText = data.point_type === 'regular' ? '일반 포인트' : '배팅 포인트'
                        const transactionText = data.transaction_type === 'add' ? '지급' : '차감'
                        itemContent = \`
                            <div class="font-medium">포인트 \${transactionText}: \${pointTypeText}</div>
                            <div class="text-sm text-gray-600">\${data.description}</div>
                            <div class="text-sm font-bold text-blue-600">\${data.transaction_type === 'add' ? '+' : '-'}\${data.amount?.toLocaleString()}원</div>
                        \`
                    }
                    
                    const statusBadge = getStatusBadge(item.status)
                    
                    return \`
                        <div class="border rounded-lg p-4 hover:bg-gray-50">
                            <div class="flex justify-between items-start mb-2">
                                <div class="flex items-center">
                                    <i class="fas \${icon} \${color} mr-2"></i>
                                    <div class="flex-1">\${itemContent}</div>
                                </div>
                                <div class="flex items-center gap-2">
                                    \${statusBadge}
                                    \${item.status === 'pending' ? \`
                                        <button onclick="deleteTicketItem(\${item.id})" class="text-red-500 hover:text-red-700">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    \` : ''}
                                </div>
                            </div>
                            \${item.status === 'pending' ? \`
                                <button onclick="processSingleItem(\${item.id})" class="btn btn-sm btn-success mt-2">
                                    <i class="fas fa-check mr-1"></i>처리
                                </button>
                            \` : ''}
                        </div>
                    \`
                }).join('')
            } catch (error) {
                console.error('티켓 아이템 로드 오류:', error)
            }
        }

        // 결과 텍스트 변환
        function getOutcomeText(outcome, line) {
            const map = {
                'home_win': '홈승',
                'draw': '무승부',
                'away_win': '원정승',
                'over': line ? \`오버 \${line}\` : '오버',
                'under': line ? \`언더 \${line}\` : '언더',
                'handicap_home': line ? \`홈 \${line > 0 ? '+' : ''}\${line}\` : '홈 핸디캡',
                'handicap_away': line ? \`원정 \${line < 0 ? '+' : ''}\${-line}\` : '원정 핸디캡'
            }
            return map[outcome] || outcome
        }

        // 상태 배지
        function getStatusBadge(status) {
            const badges = {
                'pending': '<span class="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">대기</span>',
                'processing': '<span class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">처리중</span>',
                'completed': '<span class="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">완료</span>',
                'cancelled': '<span class="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">취소</span>'
            }
            return badges[status] || status
        }

        // 단일 아이템 처리
        async function processSingleItem(itemId) {
            if (!confirm('이 요청을 처리하시겠습니까?')) return
            
            try {
                await axios.post(\`\${API_BASE}/ticket-items/\${itemId}/process\`, {
                    processed_by: currentStaff.id
                })
                
                alert('처리가 완료되었습니다.')
                loadTicketItems(currentTicketId)
            } catch (error) {
                alert('처리 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 티켓 아이템 삭제
        async function deleteTicketItem(itemId) {
            if (!confirm('이 요청을 삭제하시겠습니까?')) return
            
            try {
                await axios.delete(\`\${API_BASE}/ticket-items/\${itemId}\`)
                alert('삭제되었습니다.')
                loadTicketItems(currentTicketId)
            } catch (error) {
                alert('삭제 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 전체 처리
        async function processAllRequests() {
            if (!confirm('모든 대기 중인 요청을 일괄 처리하시겠습니까?')) return
            
            try {
                const response = await axios.get(\`\${API_BASE}/ticket-items/\${currentTicketId}\`)
                const items = response.data.items || []
                const pendingItems = items.filter(item => item.status === 'pending')
                
                for (const item of pendingItems) {
                    await axios.post(\`\${API_BASE}/ticket-items/\${item.id}/process\`, {
                        processed_by: currentStaff.id
                    })
                }
                
                alert(\`\${pendingItems.length}개의 요청이 처리되었습니다.\`)
                loadTicketItems(currentTicketId)
            } catch (error) {
                alert('처리 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // 전체 삭제
        async function clearAllRequests() {
            if (!confirm('모든 대기 중인 요청을 삭제하시겠습니까?')) return
            
            try {
                const response = await axios.get(\`\${API_BASE}/ticket-items/\${currentTicketId}\`)
                const items = response.data.items || []
                const pendingItems = items.filter(item => item.status === 'pending')
                
                for (const item of pendingItems) {
                    await axios.delete(\`\${API_BASE}/ticket-items/\${item.id}\`)
                }
                
                alert(\`\${pendingItems.length}개의 요청이 삭제되었습니다.\`)
                loadTicketItems(currentTicketId)
            } catch (error) {
                alert('삭제 실패: ' + (error.response?.data?.error || error.message))
            }
        }

        // ==================== 수정 승인 시스템 ====================
        
        async function loadPendingModifications() {
            try {
                const response = await axios.get(\`\${API_BASE}/modifications/pending\`)
                const requests = response.data.requests || []
                
                document.getElementById('pending-count').textContent = requests.length
                
                const container = document.getElementById('pending-modifications-list')
                
                if (requests.length === 0) {
                    container.innerHTML = '<p class="text-gray-500 text-center py-8">승인 대기중인 수정 요청이 없습니다.</p>'
                    return
                }
                
                container.innerHTML = requests.map(req => \`
                    <div class="border rounded-lg p-4 mb-3 hover:bg-gray-50">
                        <div class="flex justify-between items-start mb-3">
                            <div>
                                <span class="font-medium text-blue-600">\${getTargetTypeText(req.target_type)}</span>
                                <span class="text-gray-400 mx-2">|</span>
                                <span class="text-gray-600">\${req.field_name}</span>
                            </div>
                            <span class="text-xs text-gray-500">\${new Date(req.created_at).toLocaleString()}</span>
                        </div>
                        
                        <div class="bg-gray-50 p-3 rounded mb-3">
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <p class="text-xs text-gray-500 mb-1">이전 값</p>
                                    <p class="font-mono text-sm text-red-600">\${req.old_value || '(없음)'}</p>
                                </div>
                                <div>
                                    <p class="text-xs text-gray-500 mb-1">새로운 값</p>
                                    <p class="font-mono text-sm text-green-600">\${req.new_value}</p>
                                </div>
                            </div>
                            \${req.reason ? \`<p class="text-sm text-gray-600 mt-2"><strong>사유:</strong> \${req.reason}</p>\` : ''}
                        </div>
                        
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">
                                <i class="fas fa-user mr-1"></i>\${req.requester_name} (\${req.requester_role === 'staff' ? '직원' : '관리자'})
                            </span>
                            <div class="flex space-x-2">
                                <button onclick="reviewModification(\${req.id}, 'approve')" class="btn btn-sm btn-success">
                                    <i class="fas fa-check mr-1"></i>승인
                                </button>
                                <button onclick="reviewModification(\${req.id}, 'reject')" class="btn btn-sm btn-danger">
                                    <i class="fas fa-times mr-1"></i>거부
                                </button>
                            </div>
                        </div>
                    </div>
                \`).join('')
            } catch (error) {
                console.error('수정 요청 로드 오류:', error)
                document.getElementById('pending-modifications-list').innerHTML = 
                    '<p class="text-red-500 text-center py-8">로드 실패</p>'
            }
        }
        
        async function reviewModification(requestId, action) {
            if (!confirm(\`이 수정 요청을 \${action === 'approve' ? '승인' : '거부'}하시겠습니까?\`)) return
            
            try {
                await axios.post(\`\${API_BASE}/modifications/\${requestId}/review\`, {
                    action: action,
                    reviewed_by: currentStaff.id
                })
                
                alert(action === 'approve' ? '수정이 승인되고 적용되었습니다.' : '수정 요청이 거부되었습니다.')
                await loadPendingModifications()
            } catch (error) {
                alert('처리 실패: ' + (error.response?.data?.error || error.message))
            }
        }
        
        function getTargetTypeText(type) {
            const typeMap = {
                'member': '회원',
                'book': '도서',
                'ticket': '티켓',
                'match': '경기',
                'staff': '직원'
            }
            return typeMap[type] || type
        }
        
        // ==================== 회원 변경 모달 ====================
        
        let currentTicketForMemberChange = null
        let memberChangeDebounceTimer = null
        
//         function openChangeMemberModal() {
//             // 현재 티켓 정보 저장
//             const ticketId = document.getElementById('modal-ticket-id').textContent
//             currentTicketForMemberChange = {
//                 id: ticketId,
//                 currentMemberId: null,
//                 currentMemberName: null,
//                 currentMemberNumber: null
//             }
//             
//             // 현재 회원 정보 가져오기
//             const memberNameEl = document.getElementById('detail-ticket-member-name')
//             if (memberNameEl && memberNameEl.textContent !== '-') {
//                 currentTicketForMemberChange.currentMemberName = memberNameEl.textContent
//             }
//             
//             // 모달 열기
//             document.getElementById('change-member-modal').classList.remove('hidden')
//             document.getElementById('change-member-search').value = ''
//             document.getElementById('change-member-dropdown').classList.add('hidden')
//             document.getElementById('change-member-search').focus()
//         }
//         
//         function closeChangeMemberModal() {
//             document.getElementById('change-member-modal').classList.add('hidden')
//             currentTicketForMemberChange = null
//             memberChangeDebounceTimer = null
//         }
//         
//         async function searchMembersForChange(event) {
//             const searchValue = event.target.value.trim()
//             
//             // 디바운스 처리 (300ms)
//             if (memberChangeDebounceTimer) {
//                 clearTimeout(memberChangeDebounceTimer)
//             }
//             
//             if (searchValue.length < 2) {
//                 document.getElementById('change-member-dropdown').classList.add('hidden')
//                 return
//             }
//             
//             memberChangeDebounceTimer = setTimeout(async () => {
//                 try {
//                     const response = await axios.get(\`\${API_BASE}/members?search=\${encodeURIComponent(searchValue)}\`)
//                     const members = response.data.members || []
//                     
//                     const dropdown = document.getElementById('change-member-dropdown')
//                     
//                     if (members.length === 0) {
//                         dropdown.innerHTML = '<div class="p-3 text-gray-500 text-sm">검색 결과가 없습니다.</div>'
//                         dropdown.classList.remove('hidden')
//                         return
//                     }
//                     
//                     dropdown.innerHTML = members.map(member => \`
//                         <div onclick="selectChangeMember(\${member.id}, '\${member.name}', '\${member.inmate_number || ''}')" 
//                              class="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0">
//                             <div class="font-medium">\${member.name}</div>
//                             <div class="text-sm text-gray-600">
//                                 수용번호: \${member.inmate_number || '-'} | 
//                                 기관: \${member.institution || '-'}
//                             </div>
//                         </div>
//                     \`).join('')
//                     
//                     dropdown.classList.remove('hidden')
//                 } catch (error) {
//                     console.error('회원 검색 오류:', error)
//                     alert('회원 검색 실패: ' + (error.response?.data?.error || error.message))
//                 }
//             }, 300)
//         }
        
        async function selectChangeMember(memberId, memberName, inmateNumber) {
            if (!currentTicketForMemberChange) {
                alert('오류: 티켓 정보가 없습니다.')
                return
            }
            
            const ticketId = currentTicketForMemberChange.id
            const oldMemberName = currentTicketForMemberChange.currentMemberName
            
            // 동일한 회원 선택 방지
            if (oldMemberName && oldMemberName === memberName) {
                alert('이미 동일한 회원이 지정되어 있습니다.')
                return
            }
            
            const confirmMsg = oldMemberName 
                ? \`회원을 변경하시겠습니까?\\n\\n현재: \${oldMemberName}\\n변경: \${memberName} (수용번호: \${inmateNumber || '-'})\`
                : \`회원을 지정하시겠습니까?\\n\\n회원: \${memberName} (수용번호: \${inmateNumber || '-'})\`
            
            if (!confirm(confirmMsg)) return
            
            try {
                // 승인 요청 생성
                await axios.post(\`\${API_BASE}/modifications\`, {
                    target_type: 'ticket',
                    target_id: ticketId,
                    field_name: 'member_id',
                    old_value: oldMemberName || '미지정',
                    new_value: memberName,
                    reason: oldMemberName 
                        ? \`회원 변경: \${oldMemberName} → \${memberName}\`
                        : \`회원 지정: \${memberName}\`,
                    requested_by: currentStaff.id
                })
                
                alert('✅ 승인 요청이 생성되었습니다.\\n\\n관리자 승인 후 회원이 변경됩니다.')
                
                closeChangeMemberModal()
                await showTicketDetail(ticketId) // 티켓 정보 새로고침
                
            } catch (error) {
                console.error('회원 변경 오류:', error)
                alert('회원 변경 실패: ' + (error.response?.data?.error || error.message))
            }
        }
    </script>
</body>
</html>
  `)
})

export default app
