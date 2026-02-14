# EXIT System 단계별 구현 체크리스트
## 📅 작성일: 2026-02-14

---

## 🎯 전체 진행 상황

```
총 13개 Phase
예상 기간: 15-20일
현재 진행률: 0%

[                                        ] 0/13 완료
```

---

## Phase 1: 환경 설정 (1일)

### ✅ 1.1 기술 스택 선택
- [ ] React + TypeScript (권장)
- [ ] Vue 3 + TypeScript
- [ ] Vanilla JS 모듈 분리
- [ ] 최종 결정 문서화

### ✅ 1.2 새 프로젝트 생성

**React 선택 시:**
```bash
cd /home/user
npm create vite@latest exit-frontend -- --template react-ts
cd exit-frontend
npm install axios zustand react-router-dom
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Vue 선택 시:**
```bash
cd /home/user
npm create vite@latest exit-frontend -- --template vue-ts
cd exit-frontend
npm install axios pinia vue-router
npm install -D tailwindcss postcss autoprefixer
```

**Vanilla JS 선택 시:**
```bash
cd /home/user
mkdir exit-frontend
cd exit-frontend
npm init -y
npm install -D vite tailwindcss postcss autoprefixer
```

**체크리스트:**
- [ ] 프로젝트 생성 완료
- [ ] 패키지 설치 완료
- [ ] Git 초기화
- [ ] .gitignore 생성
- [ ] 첫 커밋

### ✅ 1.3 TailwindCSS 설정

**tailwind.config.js:**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**src/index.css:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**체크리스트:**
- [ ] tailwind.config.js 작성
- [ ] CSS 파일 설정
- [ ] Tailwind 작동 확인

### ✅ 1.4 백엔드 정리

**src/index.tsx 간소화:**
```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'

// API 라우트
import auth from './routes/auth'
import tickets from './routes/tickets'
// ... 나머지 라우트 import

const app = new Hono()

// CORS 설정
app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'https://exit-frontend.pages.dev'],
  credentials: true,
}))

// API 라우트 등록
app.route('/api/auth', auth)
app.route('/api/tickets', tickets)
// ... 나머지 라우트 등록

export default app
```

**체크리스트:**
- [ ] index.tsx 간소화 완료
- [ ] CORS 설정 추가
- [ ] 백엔드 빌드 성공
- [ ] 백엔드 로컬 테스트

### ✅ 1.5 환경 변수 설정

**프론트엔드 .env:**
```env
VITE_API_BASE=http://localhost:8787/api
```

**백엔드 wrangler.jsonc:**
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "exit-company",
  "compatibility_date": "2024-01-01",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "exit-company-production",
      "database_id": "de6b386e-c93a-417d-a595-24321cc1bf0b"
    }
  ]
}
```

**체크리스트:**
- [ ] 프론트엔드 환경 변수 설정
- [ ] 백엔드 환경 변수 확인
- [ ] D1 데이터베이스 ID 확인

### ✅ 1.6 데이터베이스 마이그레이션

```bash
cd /home/user/webapp
npx wrangler d1 migrations apply exit-company-production --local
```

**체크리스트:**
- [ ] 로컬 DB 마이그레이션 완료
- [ ] 프로덕션 DB 마이그레이션 완료
- [ ] 테스트 데이터 삽입

### 📊 Phase 1 완료 기준
- [ ] 모든 패키지 설치 완료
- [ ] 백엔드 빌드 성공
- [ ] 프론트엔드 빌드 성공
- [ ] Git 초기 커밋 완료

---

## Phase 2: 인증 시스템 (1일)

### ✅ 2.1 API 클라이언트 생성

**src/api/client.ts:**
```typescript
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

**체크리스트:**
- [ ] API 클라이언트 생성
- [ ] 요청 인터셉터 추가
- [ ] 응답 인터셉터 추가
- [ ] 에러 처리 추가

### ✅ 2.2 타입 정의

**src/types/auth.ts:**
```typescript
export interface User {
  id: number
  email: string
  name: string
  role: 'admin' | 'manager' | 'staff' | 'viewer'
  created_at: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface LoginResponse {
  user: User
  token: string
}
```

**체크리스트:**
- [ ] User 타입 정의
- [ ] LoginInput 타입 정의
- [ ] LoginResponse 타입 정의

### ✅ 2.3 인증 API

**src/api/auth.ts:**
```typescript
import { apiClient } from './client'
import type { LoginInput, LoginResponse, User } from '@/types/auth'

export const authAPI = {
  async login(data: LoginInput): Promise<LoginResponse> {
    const response = await apiClient.post('/auth/login', data)
    return response.data
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout')
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get('/auth/me')
    return response.data
  },
}
```

**체크리스트:**
- [ ] login 함수 구현
- [ ] logout 함수 구현
- [ ] getMe 함수 구현

### ✅ 2.4 상태 관리 (Zustand)

**src/stores/authStore.ts:**
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authAPI } from '@/api/auth'
import type { User, LoginInput } from '@/types/auth'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  login: (data: LoginInput) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (data: LoginInput) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authAPI.login(data)
          localStorage.setItem('token', response.token)
          set({ user: response.user, token: response.token, isLoading: false })
        } catch (error: any) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      logout: () => {
        authAPI.logout().catch(console.error)
        localStorage.removeItem('token')
        set({ user: null, token: null })
      },

      checkAuth: async () => {
        const token = localStorage.getItem('token')
        if (!token) {
          set({ user: null, token: null })
          return
        }

        try {
          const user = await authAPI.getMe()
          set({ user, token })
        } catch {
          localStorage.removeItem('token')
          set({ user: null, token: null })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
)
```

**체크리스트:**
- [ ] Zustand store 생성
- [ ] login 액션 구현
- [ ] logout 액션 구현
- [ ] checkAuth 액션 구현
- [ ] localStorage 연동

### ✅ 2.5 로그인 페이지

**src/pages/Login.tsx:**
```tsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoading, error } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      navigate('/dashboard')
    } catch {
      // Error is already in store
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">EXIT System</h1>
          <p className="text-gray-600 mt-2">교정시설 외부 수용자 관리 시스템</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400"
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

**체크리스트:**
- [ ] 로그인 폼 UI 구현
- [ ] 이메일/비밀번호 입력
- [ ] 로그인 버튼 클릭 처리
- [ ] 에러 메시지 표시
- [ ] 로딩 상태 표시
- [ ] 성공 시 대시보드로 이동

### ✅ 2.6 라우트 설정

**src/App.tsx:**
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  return user ? <>{children}</> : <Navigate to="/login" />
}

function App() {
  const { checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

**체크리스트:**
- [ ] React Router 설정
- [ ] ProtectedRoute 컴포넌트 생성
- [ ] 로그인 라우트
- [ ] 대시보드 라우트
- [ ] 루트 리다이렉트

### 📊 Phase 2 완료 기준
- [ ] 로그인 성공
- [ ] 토큰 저장 확인
- [ ] 대시보드로 이동
- [ ] 로그아웃 작동
- [ ] 인증 없이 대시보드 접근 시 로그인 페이지로 리다이렉트

**테스트 계정:**
```
이메일: admin@manager-exit.cloud
비밀번호: admin123
```

---

## Phase 3: 대시보드 (1일)

### ✅ 3.1 레이아웃 컴포넌트

**src/components/layout/Layout.tsx:**
```tsx
import React from 'react'
import Header from './Header'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

**체크리스트:**
- [ ] Layout 컴포넌트 생성
- [ ] 반응형 레이아웃 구현
- [ ] Header 영역
- [ ] Sidebar 영역
- [ ] Main 영역

### ✅ 3.2 Header 컴포넌트

**src/components/layout/Header.tsx:**
```tsx
import React from 'react'
import { useAuthStore } from '@/stores/authStore'

export default function Header() {
  const { user, logout } = useAuthStore()

  return (
    <header className="bg-white shadow-md">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-gray-800">EXIT System</h1>
        </div>

        <div className="flex items-center space-x-4">
          {/* 알림 아이콘 */}
          <button className="relative p-2 text-gray-600 hover:text-gray-800">
            <i className="fas fa-bell text-xl"></i>
            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              3
            </span>
          </button>

          {/* 사용자 정보 */}
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-800">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
          </div>

          {/* 로그아웃 버튼 */}
          <button
            onClick={logout}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            <i className="fas fa-sign-out-alt mr-2"></i>
            로그아웃
          </button>
        </div>
      </div>
    </header>
  )
}
```

**체크리스트:**
- [ ] 로고 표시
- [ ] 사용자 이름 표시
- [ ] 역할 표시
- [ ] 알림 아이콘
- [ ] 로그아웃 버튼

### ✅ 3.3 Sidebar 컴포넌트

**src/components/layout/Sidebar.tsx:**
```tsx
import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function Sidebar() {
  const location = useLocation()
  const { user } = useAuthStore()

  const menuItems = [
    { path: '/dashboard', icon: 'fa-home', label: '대시보드' },
    { path: '/tickets', icon: 'fa-ticket-alt', label: '티켓 관리' },
    { path: '/members', icon: 'fa-users', label: '회원 관리' },
    { path: '/books', icon: 'fa-book', label: '도서 관리' },
    { path: '/mailroom', icon: 'fa-envelope', label: '우편물 처리' },
    { path: '/betting', icon: 'fa-dice', label: '배팅 관리' },
    { path: '/responses', icon: 'fa-reply', label: '답변 관리' },
  ]

  // 관리자 전용 메뉴
  if (user?.role === 'admin' || user?.role === 'manager') {
    menuItems.push(
      { path: '/staff', icon: 'fa-user-tie', label: '직원 관리' }
    )
  }

  if (user?.role === 'admin') {
    menuItems.push(
      { path: '/closing', icon: 'fa-calculator', label: '일일 마감' }
    )
  }

  return (
    <aside className="w-64 bg-white shadow-md min-h-screen">
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <i className={`fas ${item.icon} w-5 mr-3`}></i>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
```

**체크리스트:**
- [ ] 메뉴 항목 생성
- [ ] 현재 경로 하이라이트
- [ ] 역할별 메뉴 표시/숨김
- [ ] 아이콘 추가
- [ ] 호버 효과

### ✅ 3.4 대시보드 통계 API

**src/api/dashboard.ts:**
```typescript
import { apiClient } from './client'

export interface DashboardStats {
  today_tickets: number
  pending_approvals: number
  betting_stats: {
    total_bets: number
    total_amount: number
    total_win: number
  }
  mailroom_stats: {
    received: number
    processing: number
    completed: number
  }
}

export const dashboardAPI = {
  async getStats(): Promise<DashboardStats> {
    const response = await apiClient.get('/dashboard/stats')
    return response.data
  },
}
```

**체크리스트:**
- [ ] DashboardStats 타입 정의
- [ ] getStats 함수 구현
- [ ] 에러 처리

### ✅ 3.5 대시보드 페이지

**src/pages/Dashboard.tsx:**
```tsx
import React, { useEffect, useState } from 'react'
import Layout from '@/components/layout/Layout'
import { dashboardAPI, DashboardStats } from '@/api/dashboard'

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const data = await dashboardAPI.getStats()
      setStats(data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">대시보드</h2>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 오늘의 티켓 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">오늘의 티켓</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {stats?.today_tickets || 0}
                </p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <i className="fas fa-ticket-alt text-2xl text-blue-600"></i>
              </div>
            </div>
          </div>

          {/* 대기 중인 승인 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">대기 중인 승인</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {stats?.pending_approvals || 0}
                </p>
              </div>
              <div className="bg-yellow-100 rounded-full p-3">
                <i className="fas fa-clock text-2xl text-yellow-600"></i>
              </div>
            </div>
          </div>

          {/* 배팅 통계 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 배팅 금액</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {(stats?.betting_stats.total_amount || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <i className="fas fa-dice text-2xl text-green-600"></i>
              </div>
            </div>
          </div>

          {/* 우편물 현황 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">처리 중인 우편물</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {stats?.mailroom_stats.processing || 0}
                </p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <i className="fas fa-envelope text-2xl text-purple-600"></i>
              </div>
            </div>
          </div>
        </div>

        {/* 차트 영역 (추후 추가) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              티켓 처리 추이
            </h3>
            <div className="h-64 flex items-center justify-center text-gray-400">
              차트가 여기에 표시됩니다
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              배팅 통계
            </h3>
            <div className="h-64 flex items-center justify-center text-gray-400">
              차트가 여기에 표시됩니다
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
```

**체크리스트:**
- [ ] 통계 카드 4개 구현
- [ ] 로딩 상태 표시
- [ ] 에러 처리
- [ ] 차트 영역 준비 (추후 구현)
- [ ] 반응형 레이아웃

### 📊 Phase 3 완료 기준
- [ ] 대시보드 페이지 로드 성공
- [ ] 통계 데이터 표시
- [ ] Header 작동
- [ ] Sidebar 작동
- [ ] 메뉴 네비게이션 작동

---

## Phase 4: 티켓 관리 (2일)

### ✅ 4.1 티켓 타입 정의

**src/types/ticket.ts:**
```typescript
export type TicketType = 'GENERAL' | 'BOOK_ORDER' | 'BETTING' | 'MAILROOM' | 'POINT_REQUEST'
export type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'closed'
export type TicketPriority = 'urgent' | 'high' | 'normal' | 'low'

export interface Ticket {
  id: number
  ticket_number: string
  title: string
  description: string | null
  member_id: number | null
  member?: {
    id: number
    name: string
    institution: string
    inmate_number: string
  }
  ticket_type: TicketType
  status: TicketStatus
  priority: TicketPriority
  assigned_to: number | null
  assigned_staff?: {
    id: number
    name: string
  }
  created_by: number
  creator?: {
    id: number
    name: string
  }
  image_keys: string | null
  created_at: string
  updated_at: string
}

export interface CreateTicketInput {
  title: string
  description?: string
  member_id?: number
  ticket_type: TicketType
  priority?: TicketPriority
  assigned_to?: number
  image_keys?: string[]
}
```

**체크리스트:**
- [ ] 티켓 타입 정의
- [ ] 상태 타입 정의
- [ ] 우선순위 타입 정의
- [ ] CreateTicketInput 정의

### ✅ 4.2 티켓 API

**src/api/tickets.ts:**
```typescript
import { apiClient } from './client'
import type { Ticket, CreateTicketInput } from '@/types/ticket'

export const ticketAPI = {
  async getTickets(params?: {
    page?: number
    limit?: number
    status?: string
    type?: string
    search?: string
  }): Promise<{
    tickets: Ticket[]
    total: number
    page: number
    totalPages: number
  }> {
    const response = await apiClient.get('/tickets', { params })
    return response.data
  },

  async getTicket(id: number): Promise<Ticket> {
    const response = await apiClient.get(`/tickets/${id}`)
    return response.data
  },

  async createTicket(data: CreateTicketInput): Promise<Ticket> {
    const response = await apiClient.post('/tickets', data)
    return response.data
  },

  async updateTicket(id: number, data: Partial<CreateTicketInput>): Promise<Ticket> {
    const response = await apiClient.patch(`/tickets/${id}`, data)
    return response.data
  },

  async deleteTicket(id: number): Promise<void> {
    await apiClient.delete(`/tickets/${id}`)
  },

  async updateStatus(id: number, status: TicketStatus): Promise<Ticket> {
    const response = await apiClient.patch(`/tickets/${id}/status`, { status })
    return response.data
  },

  async assignTicket(id: number, assignedTo: number): Promise<Ticket> {
    const response = await apiClient.patch(`/tickets/${id}/assign`, {
      assigned_to: assignedTo,
    })
    return response.data
  },
}
```

**체크리스트:**
- [ ] getTickets 구현
- [ ] getTicket 구현
- [ ] createTicket 구현
- [ ] updateTicket 구현
- [ ] deleteTicket 구현
- [ ] updateStatus 구현
- [ ] assignTicket 구현

### ✅ 4.3 티켓 Store

**src/stores/ticketStore.ts:**
```typescript
import { create } from 'zustand'
import { ticketAPI } from '@/api/tickets'
import type { Ticket, CreateTicketInput } from '@/types/ticket'

interface TicketState {
  tickets: Ticket[]
  currentTicket: Ticket | null
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters: {
    status: string
    type: string
    search: string
  }
  fetchTickets: () => Promise<void>
  fetchTicket: (id: number) => Promise<void>
  createTicket: (data: CreateTicketInput) => Promise<void>
  updateTicket: (id: number, data: Partial<CreateTicketInput>) => Promise<void>
  deleteTicket: (id: number) => Promise<void>
  setFilters: (filters: Partial<TicketState['filters']>) => void
  setPage: (page: number) => void
}

export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  currentTicket: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  filters: {
    status: 'all',
    type: 'all',
    search: '',
  },

  fetchTickets: async () => {
    set({ isLoading: true, error: null })
    try {
      const { filters, pagination } = get()
      const response = await ticketAPI.getTickets({
        page: pagination.page,
        limit: pagination.limit,
        status: filters.status !== 'all' ? filters.status : undefined,
        type: filters.type !== 'all' ? filters.type : undefined,
        search: filters.search || undefined,
      })
      set({
        tickets: response.tickets,
        pagination: {
          ...pagination,
          total: response.total,
          totalPages: response.totalPages,
        },
        isLoading: false,
      })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchTicket: async (id: number) => {
    set({ isLoading: true, error: null })
    try {
      const ticket = await ticketAPI.getTicket(id)
      set({ currentTicket: ticket, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  createTicket: async (data: CreateTicketInput) => {
    set({ isLoading: true, error: null })
    try {
      await ticketAPI.createTicket(data)
      await get().fetchTickets()
      set({ isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  updateTicket: async (id: number, data: Partial<CreateTicketInput>) => {
    set({ isLoading: true, error: null })
    try {
      await ticketAPI.updateTicket(id, data)
      await get().fetchTickets()
      if (get().currentTicket?.id === id) {
        await get().fetchTicket(id)
      }
      set({ isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  deleteTicket: async (id: number) => {
    set({ isLoading: true, error: null })
    try {
      await ticketAPI.deleteTicket(id)
      await get().fetchTickets()
      set({ isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  setFilters: (filters: Partial<TicketState['filters']>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
      pagination: { ...state.pagination, page: 1 },
    }))
    get().fetchTickets()
  },

  setPage: (page: number) => {
    set((state) => ({
      pagination: { ...state.pagination, page },
    }))
    get().fetchTickets()
  },
}))
```

**체크리스트:**
- [ ] Store 생성
- [ ] 상태 정의
- [ ] 액션 구현
- [ ] 필터링 로직
- [ ] 페이지네이션 로직

### ✅ 4.4 티켓 목록 페이지

**파일 구조:**
```
src/pages/Tickets.tsx (메인 페이지)
src/components/tickets/TicketList.tsx (목록)
src/components/tickets/TicketCard.tsx (카드)
src/components/tickets/TicketFilters.tsx (필터)
src/components/common/Pagination.tsx (페이지네이션)
```

**체크리스트:**
- [ ] Tickets 페이지 생성
- [ ] TicketList 컴포넌트
- [ ] TicketCard 컴포넌트
- [ ] 필터 컴포넌트
- [ ] 페이지네이션 컴포넌트
- [ ] 검색 기능
- [ ] 상태별 필터링
- [ ] 타입별 필터링

### ✅ 4.5 티켓 생성 모달

**src/components/tickets/CreateTicketModal.tsx:**

**체크리스트:**
- [ ] 모달 UI 구현
- [ ] 제목 입력
- [ ] 설명 입력
- [ ] 회원 선택 (자동완성)
- [ ] 담당자 선택
- [ ] 우선순위 선택
- [ ] 티켓 타입 선택
- [ ] 이미지 업로드
- [ ] 유효성 검사
- [ ] 제출 처리

### ✅ 4.6 티켓 상세 모달

**src/components/tickets/TicketDetailModal.tsx:**

**탭 구조:**
1. 기본 정보
2. 회원 관리
3. 상태 변경
4. 댓글
5. 이미지 갤러리
6. 이력

**체크리스트:**
- [ ] 모달 UI 구현
- [ ] 탭 네비게이션
- [ ] 기본 정보 탭
- [ ] 회원 관리 탭
- [ ] 상태 변경 탭
- [ ] 댓글 탭
- [ ] 이미지 갤러리 탭
- [ ] 이력 탭

### 📊 Phase 4 완료 기준
- [ ] 티켓 목록 로드 성공
- [ ] 필터링 작동
- [ ] 검색 작동
- [ ] 페이지네이션 작동
- [ ] 티켓 생성 성공
- [ ] 티켓 상세 조회 성공
- [ ] 티켓 수정 성공
- [ ] 티켓 삭제 성공

---

## Phase 5: 회원 관리 (2일)

### ✅ 5.1 회원 타입 정의
- [ ] Member 인터페이스
- [ ] CreateMemberInput
- [ ] UpdateMemberInput
- [ ] PointTransaction

### ✅ 5.2 회원 API
- [ ] getMembers
- [ ] getMember
- [ ] createMember
- [ ] updateMember
- [ ] deleteMember
- [ ] searchMembers (자동완성)

### ✅ 5.3 회원 Store
- [ ] Store 생성
- [ ] 상태 관리
- [ ] 액션 구현

### ✅ 5.4 회원 목록 페이지
- [ ] 카드형 뷰
- [ ] 리스트형 뷰
- [ ] 뷰 전환 버튼
- [ ] 검색 기능
- [ ] 필터링

### ✅ 5.5 회원 등록/수정 모달
- [ ] 입력 폼
- [ ] 유효성 검사
- [ ] 제출 처리

### ✅ 5.6 회원 상세 모달
- [ ] 기본 정보 탭
- [ ] 포인트 내역 탭
- [ ] 거래 내역 탭
- [ ] 티켓 이력 탭
- [ ] 배팅 이력 탭
- [ ] 포인트 직접 지급/차감 (관리자)

### 📊 Phase 5 완료 기준
- [ ] 회원 목록 로드
- [ ] 회원 등록 성공
- [ ] 회원 수정 성공
- [ ] 회원 삭제 성공
- [ ] 회원 상세 조회
- [ ] 포인트 관리 작동

---

## Phase 6: 우편물 처리 시스템 (3일)

### Day 1: 업로드 및 대기 탭

**✅ 6.1 타입 정의**
- [ ] MailroomItem
- [ ] OCRResult
- [ ] UploadMailInput

**✅ 6.2 API**
- [ ] uploadImages (R2)
- [ ] ocrSimple
- [ ] ocrDetectMultiple
- [ ] getMailroomItems

**✅ 6.3 업로드 컴포넌트**
- [ ] 다중 이미지 업로드 (최대 10개)
- [ ] 드래그 앤 드롭
- [ ] 미리보기
- [ ] 업로드 진행률

**✅ 6.4 대기 탭**
- [ ] OCR 처리 중 목록
- [ ] 실시간 상태 업데이트
- [ ] 자동 새로고침

### Day 2: 검수 탭

**✅ 6.5 검수 탭 UI**
- [ ] OCR 결과 표시
- [ ] 수신자 정보 수정
- [ ] 편지 내용 확인/수정
- [ ] 카테고리 선택

**✅ 6.6 회원 매칭**
- [ ] 자동 매칭
- [ ] 신규 회원 등록
- [ ] 회원 검색

**✅ 6.7 담당자 배정**
- [ ] 담당자 선택
- [ ] 티켓 자동 생성
- [ ] 일괄 배정

### Day 3: 이미지 뷰어

**✅ 6.8 이미지 뷰어**
- [ ] 확대/축소 (마우스 휠)
- [ ] 회전 (90도씩)
- [ ] 팬 (드래그)
- [ ] 전체화면
- [ ] 썸네일 네비게이션
- [ ] 이전/다음 버튼

### 📊 Phase 6 완료 기준
- [ ] 이미지 업로드 성공
- [ ] OCR 처리 성공
- [ ] 다중 편지 감지 작동
- [ ] 검수 탭 작동
- [ ] 회원 매칭 작동
- [ ] 담당자 배정 성공
- [ ] 이미지 뷰어 작동

---

## Phase 7: 배팅 관리 (3일)

### Day 1: 경기 관리

**✅ 7.1 타입 정의**
- [ ] Match
- [ ] BetFolder
- [ ] Bet
- [ ] CreateBettingInput

**✅ 7.2 경기 관리 API**
- [ ] getMatches
- [ ] createMatch
- [ ] updateMatch
- [ ] deleteMatch
- [ ] bulkCreateMatches (Excel)

**✅ 7.3 경기 관리 UI**
- [ ] 엑셀 형태 테이블
- [ ] 인라인 편집
- [ ] 경기 추가
- [ ] Excel 업로드
- [ ] 템플릿 다운로드

### Day 2: 배팅 생성

**✅ 7.4 배팅 폴더 API**
- [ ] getBettingFolders
- [ ] createBettingFolder
- [ ] deleteBettingFolder

**✅ 7.5 배팅 생성 모달**
- [ ] Step 1: 회원 선택
- [ ] Step 2: 경기 선택 (다중)
- [ ] Step 3: 배팅 타입 선택
- [ ] Step 4: 배팅 금액 입력
- [ ] Step 5: 예상 배당률/당첨금 계산
- [ ] Step 6: 확인 및 생성

**✅ 7.6 배팅 목록**
- [ ] 폴더 목록 표시
- [ ] 필터링 (상태, 회원, 날짜)
- [ ] 상세 정보 모달

### Day 3: 정산

**✅ 7.7 정산 시스템**
- [ ] 완료된 경기 목록
- [ ] 경기 결과 입력
- [ ] 정산 실행
- [ ] 정산 통계

**✅ 7.8 정산 승인**
- [ ] 대기 중인 정산 목록
- [ ] 승인/거부 처리
- [ ] 포인트 자동 지급

### 📊 Phase 7 완료 기준
- [ ] 경기 등록 성공
- [ ] Excel 업로드 성공
- [ ] 배팅 생성 성공
- [ ] 배팅 목록 조회
- [ ] 정산 실행 성공
- [ ] 정산 승인 작동
- [ ] 통계 표시

---

## Phase 8: 답변 관리 (2일)

### ✅ 8.1 타입 정의
- [ ] Response
- [ ] ResponseTemplate
- [ ] ResponseSettings

### ✅ 8.2 API
- [ ] getResponses
- [ ] createResponse
- [ ] updateResponse
- [ ] getTemplates
- [ ] getSettings
- [ ] updateSettings

### ✅ 8.3 오늘의 답변 탭
- [ ] 답변 대상 티켓 목록
- [ ] 빠른 답변 선택 (7가지)
- [ ] 수동 답변 작성
- [ ] 대량 선택
- [ ] 일괄 인쇄

### ✅ 8.4 답변 출력 설정
- [ ] 설정 모달
- [ ] 헤더 안내문구
- [ ] 인사말
- [ ] 맺음말
- [ ] 수신일 표시 옵션
- [ ] 자동 헤더 (사서함 주소, 수용번호, 이름)

### ✅ 8.5 인쇄 기능
- [ ] 선택한 답변 일괄 인쇄
- [ ] 자동 양식 적용
- [ ] 프린트 프리뷰

### 📊 Phase 8 완료 기준
- [ ] 답변 목록 로드
- [ ] 빠른 답변 작동
- [ ] 수동 답변 작동
- [ ] 설정 저장 성공
- [ ] 인쇄 작동

---

## Phase 9: 도서 관리 (1일)

### ✅ 9.1 타입 정의
- [ ] Book
- [ ] Order
- [ ] OrderItem

### ✅ 9.2 API
- [ ] getBooks
- [ ] createBook
- [ ] updateBook
- [ ] deleteBook
- [ ] getOrders
- [ ] createOrder

### ✅ 9.3 도서 관리 UI
- [ ] 도서 목록
- [ ] 도서 등록/수정
- [ ] 재고 관리
- [ ] 검색

### ✅ 9.4 주문 관리 UI
- [ ] 주문 목록
- [ ] 주문 생성
- [ ] 상태 변경

### 📊 Phase 9 완료 기준
- [ ] 도서 등록 성공
- [ ] 주문 생성 성공
- [ ] 재고 관리 작동

---

## Phase 10: 직원 관리 (1일)

### ✅ 10.1 API
- [ ] getStaff
- [ ] createStaff
- [ ] updateStaff
- [ ] deleteStaff
- [ ] changeRole
- [ ] getRoleChanges

### ✅ 10.2 직원 관리 UI
- [ ] 직원 목록
- [ ] 직원 등록/수정
- [ ] 역할 변경
- [ ] 역할 변경 이력

### 📊 Phase 10 완료 기준
- [ ] 직원 등록 성공
- [ ] 역할 변경 성공
- [ ] 이력 조회 작동

---

## Phase 11: 일일 마감 (1일)

### ✅ 11.1 API
- [ ] getClosing
- [ ] executeClosing
- [ ] getClosingHistory

### ✅ 11.2 마감 UI
- [ ] 마감 데이터 조회
- [ ] 통계 표시
- [ ] 마감 실행
- [ ] 인쇄 리포트

### 📊 Phase 11 완료 기준
- [ ] 마감 데이터 조회
- [ ] 마감 실행 성공
- [ ] 리포트 인쇄 작동

---

## Phase 12: 알림 시스템 (1일)

### ✅ 12.1 API
- [ ] getNotifications
- [ ] markAsRead
- [ ] deleteNotification

### ✅ 12.2 알림 UI
- [ ] Header 알림 아이콘
- [ ] 알림 드롭다운
- [ ] 알림 목록 페이지
- [ ] 읽음 처리

### 📊 Phase 12 완료 기준
- [ ] 알림 표시
- [ ] 읽음 처리 작동
- [ ] 삭제 작동

---

## Phase 13: 수정 요청 시스템 (1일)

### ✅ 13.1 API
- [ ] getModifications
- [ ] approveModification
- [ ] rejectModification

### ✅ 13.2 수정 요청 UI
- [ ] 요청 목록 (관리자)
- [ ] 승인/거부 처리
- [ ] 변경 전/후 비교

### 📊 Phase 13 완료 기준
- [ ] 요청 목록 조회
- [ ] 승인 처리 성공
- [ ] 거부 처리 성공

---

## 🎯 최종 체크리스트

### 기능 테스트
- [ ] 모든 페이지 로드 성공
- [ ] 모든 CRUD 작동
- [ ] 모든 필터/검색 작동
- [ ] 모든 모달 작동
- [ ] 파일 업로드 작동
- [ ] 인쇄 기능 작동

### 성능 테스트
- [ ] 첫 페이지 로드 < 2초
- [ ] API 응답 시간 < 500ms
- [ ] 빌드 시간 < 10초
- [ ] Worker 크기 < 200KB

### 보안 테스트
- [ ] 인증 없이 API 호출 차단
- [ ] CORS 설정 확인
- [ ] XSS 방어 확인
- [ ] CSRF 방어 확인

### 배포 테스트
- [ ] 프론트엔드 배포 성공
- [ ] 백엔드 배포 성공
- [ ] D1 데이터베이스 연결 확인
- [ ] R2 Storage 작동 확인
- [ ] 프로덕션 URL 접속 확인

### 문서화
- [ ] README.md 업데이트
- [ ] API 문서 작성
- [ ] 컴포넌트 문서 작성
- [ ] 배포 가이드 작성

---

## 📝 일일 진행 기록

### Day 1: 환경 설정
```
날짜: 
작업 내용:
- 
완료 여부: [ ]
이슈:
- 
```

### Day 2: 인증 시스템
```
날짜: 
작업 내용:
- 
완료 여부: [ ]
이슈:
- 
```

... (20일까지 계속)

---

**예상 완료일**: 시작일 + 20일
**실제 완료일**: _________
