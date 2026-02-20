import { Hono } from 'hono'
import { sign, verify } from 'hono/jwt'

type Bindings = {
  DB: D1Database
}

const auth = new Hono<{ Bindings: Bindings }>()

// JWT Secret (프로덕션에서는 환경변수로 관리)
const JWT_SECRET = 'exit-company-system-jwt-secret-2026'

// 로그인
auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json()

    if (!email || !password) {
      return c.json({ error: '이메일과 비밀번호를 입력해주세요.' }, 400)
    }

    const staff = await c.env.DB.prepare(
      'SELECT id, email, name, role, created_at FROM staff WHERE email = ? AND password = ?'
    ).bind(email, password).first()

    if (!staff) {
      return c.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401)
    }

    // JWT 토큰 생성
    const payload = {
      id: staff.id,
      email: staff.email,
      role: staff.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30일
    }
    const token = await sign(payload, JWT_SECRET)

    return c.json({ success: true, staff, token })
  } catch (error) {
    console.error('로그인 오류:', error)
    return c.json({ error: '로그인 중 오류가 발생했습니다.' }, 500)
  }
})

// 비밀번호 변경
auth.post('/change-password', async (c) => {
  try {
    const { staff_id, old_password, new_password } = await c.req.json()

    if (!staff_id || !old_password || !new_password) {
      return c.json({ error: '필수 항목을 입력해주세요.' }, 400)
    }

    // 기존 비밀번호 확인
    const staff = await c.env.DB.prepare(
      'SELECT id FROM staff WHERE id = ? AND password = ?'
    ).bind(staff_id, old_password).first()

    if (!staff) {
      return c.json({ error: '기존 비밀번호가 올바르지 않습니다.' }, 401)
    }

    // 비밀번호 업데이트
    await c.env.DB.prepare(
      'UPDATE staff SET password = ? WHERE id = ?'
    ).bind(new_password, staff_id).run()

    return c.json({ success: true })
  } catch (error) {
    console.error('비밀번호 변경 오류:', error)
    return c.json({ error: '비밀번호 변경 중 오류가 발생했습니다.' }, 500)
  }
})

// API 토큰 생성 (관리자 전용)
auth.post('/generate-api-token', async (c) => {
  try {
    const { email, password } = await c.req.json()

    if (!email || !password) {
      return c.json({ error: '이메일과 비밀번호를 입력해주세요.' }, 400)
    }

    const staff = await c.env.DB.prepare(
      'SELECT id, email, name, role FROM staff WHERE email = ? AND password = ?'
    ).bind(email, password).first()

    if (!staff) {
      return c.json({ error: '인증 실패' }, 401)
    }

    // 관리자 권한 체크 (role 3 = admin)
    // TEMPORARY: Allow all staff to generate API tokens for GitHub Actions setup
    // TODO: Re-enable role check after initial setup
    // if (staff.role !== 3) {
    //   return c.json({ 
    //     error: '관리자 권한이 필요합니다.',
    //     message: `현재 role: ${staff.role}, 필요한 role: 3 (admin)`,
    //     current_role: staff.role,
    //     required_role: 3
    //   }, 403)
    // }

    console.log(`API 토큰 생성: ${staff.email} (role: ${staff.role})`)

    // 영구 API 토큰 생성 (만료 없음)
    const payload = {
      id: staff.id,
      email: staff.email,
      role: staff.role,
      type: 'api_token',
      // 만료 없음
    }
    const apiToken = await sign(payload, JWT_SECRET)

    return c.json({ 
      success: true, 
      api_token: apiToken,
      message: '이 토큰을 안전하게 보관하세요. 다시 확인할 수 없습니다.'
    })
  } catch (error) {
    console.error('API 토큰 생성 오류:', error)
    return c.json({ error: 'API 토큰 생성 중 오류가 발생했습니다.' }, 500)
  }
})

// JWT 인증 미들웨어
export const verifyToken = async (c: any, next: any) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: '인증 토큰이 필요합니다.' }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, JWT_SECRET)
    
    // 토큰 정보를 context에 저장
    c.set('user', payload)
    await next()
  } catch (error) {
    console.error('토큰 검증 오류:', error)
    return c.json({ error: '유효하지 않은 토큰입니다.' }, 401)
  }
}

export default auth
