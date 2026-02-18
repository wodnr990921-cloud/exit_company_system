import { Hono } from 'hono'
import { cors } from 'hono/cors'

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
import pointConversions from './routes/point-conversions'

type Bindings = {
  DB: D1Database
  R2: R2Bucket
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS 설정 - 기본 설정 사용
app.use('/api/*', cors())

// HTML 파일 내용을 변수로 저장 (빌드 시 포함됨)
// 프로덕션에서는 Cloudflare Pages가 직접 서빙하므로 이 코드는 실행되지 않음
app.get('/', async (c) => {
  // 로컬 개발 환경용 - 단순 메시지 반환
  return c.html(`
    <html>
    <head><title>EXIT System</title></head>
    <body>
      <h1>EXIT System</h1>
      <p>API is running. Access <a href="/app.html">/app.html</a> for the full application.</p>
      <p>Or use the API endpoints at <code>/api/*</code></p>
    </body>
    </html>
  `)
})

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
app.route('/api/point-conversions', pointConversions)

// 메인 페이지

export default app
