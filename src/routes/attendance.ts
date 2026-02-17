import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
}

const attendance = new Hono<{ Bindings: Bindings }>()

// 출근
attendance.post('/checkin', async (c) => {
  try {
    const { staff_id } = await c.req.json()

    if (!staff_id) {
      return c.json({ error: '직원 ID가 필요합니다.' }, 400)
    }

    // 오늘 이미 출근했는지 확인
    const today = new Date().toISOString().split('T')[0]
    const existing = await c.env.DB.prepare(
      `SELECT id FROM attendance 
       WHERE staff_id = ? AND DATE(checkin_time) = ?`
    ).bind(staff_id, today).first()

    if (existing) {
      return c.json({ error: '오늘 이미 출근하셨습니다.' }, 400)
    }

    // 출근 기록
    const result = await c.env.DB.prepare(
      'INSERT INTO attendance (staff_id, checkin_time) VALUES (?, CURRENT_TIMESTAMP)'
    ).bind(staff_id).run()

    return c.json({ 
      success: true, 
      attendance_id: result.meta.last_row_id 
    })
  } catch (error) {
    console.error('출근 기록 오류:', error)
    return c.json({ error: '출근 기록 중 오류가 발생했습니다.' }, 500)
  }
})

// 퇴근
attendance.post('/checkout', async (c) => {
  try {
    const { staff_id, stamps_used, daily_report } = await c.req.json()

    if (!staff_id) {
      return c.json({ error: '직원 ID가 필요합니다.' }, 400)
    }

    // 오늘의 출근 기록 찾기
    const today = new Date().toISOString().split('T')[0]
    const record = await c.env.DB.prepare(
      `SELECT id FROM attendance 
       WHERE staff_id = ? AND DATE(checkin_time) = ? AND checkout_time IS NULL`
    ).bind(staff_id, today).first()

    if (!record) {
      return c.json({ error: '오늘의 출근 기록을 찾을 수 없습니다.' }, 404)
    }

    // 퇴근 기록
    await c.env.DB.prepare(
      `UPDATE attendance 
       SET checkout_time = CURRENT_TIMESTAMP, stamps_used = ?, daily_report = ?
       WHERE id = ?`
    ).bind(stamps_used || 0, daily_report || '', record.id).run()

    return c.json({ success: true })
  } catch (error) {
    console.error('퇴근 기록 오류:', error)
    return c.json({ error: '퇴근 기록 중 오류가 발생했습니다.' }, 500)
  }
})

// 출근 상태 확인
attendance.get('/status/:staff_id', async (c) => {
  try {
    const staff_id = c.req.param('staff_id')
    const today = new Date().toISOString().split('T')[0]

    const record = await c.env.DB.prepare(
      `SELECT id, checkin_time, checkout_time, stamps_used, daily_report
       FROM attendance 
       WHERE staff_id = ? AND DATE(checkin_time) = ?`
    ).bind(staff_id, today).first()

    return c.json({ 
      checkedIn: !!record,
      checkedOut: record ? !!record.checkout_time : false,
      record: record || null
    })
  } catch (error) {
    console.error('출근 상태 확인 오류:', error)
    return c.json({ error: '출근 상태 확인 중 오류가 발생했습니다.' }, 500)
  }
})

// 직원별 출퇴근 기록 조회
attendance.get('/staff/:staff_id', async (c) => {
  try {
    const staff_id = c.req.param('staff_id')
    const start_date = c.req.query('start_date')
    
    let query = `
      SELECT id, checkin_time, checkout_time, stamps_used, daily_report
      FROM attendance 
      WHERE staff_id = ?
    `
    const params: any[] = [staff_id]
    
    if (start_date) {
      query += ` AND DATE(checkin_time) >= ?`
      params.push(start_date)
    }
    
    query += ` ORDER BY checkin_time DESC LIMIT 30`
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all()
    
    return c.json({ records: results })
  } catch (error) {
    console.error('출퇴근 기록 조회 오류:', error)
    return c.json({ error: '출퇴근 기록 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 출근 기록 조회
attendance.get('/history/:staff_id', async (c) => {
  try {
    const staff_id = c.req.param('staff_id')
    const limit = parseInt(c.req.query('limit') || '30')

    const { results } = await c.env.DB.prepare(
      `SELECT * FROM attendance 
       WHERE staff_id = ? 
       ORDER BY checkin_time DESC 
       LIMIT ?`
    ).bind(staff_id, limit).all()

    return c.json({ records: results })
  } catch (error) {
    console.error('출근 기록 조회 오류:', error)
    return c.json({ error: '출근 기록 조회 중 오류가 발생했습니다.' }, 500)
  }
})

export default attendance
