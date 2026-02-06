import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
}

const auth = new Hono<{ Bindings: Bindings }>()

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

    return c.json({ success: true, staff })
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

export default auth
