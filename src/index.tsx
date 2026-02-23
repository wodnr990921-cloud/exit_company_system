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
import ai from './routes/ai'
import telegram from './routes/telegram'

type Bindings = {
  DB: D1Database
  R2: R2Bucket
  OPENAI_API_KEY: string
  TELEGRAM_BOT_TOKEN: string
  TELEGRAM_CHAT_ID: string
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS 설정 - 기본 설정 사용
app.use('/api/*', cors())

// 메인 페이지를 app으로 리다이렉트 (Cloudflare Pages는 .html 자동 제거)
app.get('/', async (c) => {
  return c.redirect('/app')
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
app.route('/api/ai', ai)
app.route('/api/telegram', telegram)

// 메인 페이지

export default app
