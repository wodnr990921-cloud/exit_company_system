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
import responses from './routes/responses'

type Bindings = {
  DB: D1Database
  R2: R2Bucket
  AI: any
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS 설정
app.use('/api/*', cors({
  origin: [
    'http://localhost:5173',
    'https://5173-izz2akoud4rd9s8t7plxq-b32ec7bb.sandbox.novita.ai',
    'https://exit-frontend.pages.dev'
  ],
  credentials: true,
}))

// 정적 파일 서빙
app.use('/static/*', serveStatic({ root: './public' }))

// 루트 경로는 app.html 제공
app.get('/', serveStatic({ path: './public/app.html' }))

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
app.route('/api/responses', responses)

// 메인 페이지

export default app
