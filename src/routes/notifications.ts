import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
}

const notifications = new Hono<{ Bindings: Bindings }>()

// 알림 목록 조회
notifications.get('/', async (c) => {
  try {
    const staff_id = c.req.query('staff_id')
    const unread_only = c.req.query('unread_only') === 'true'

    if (!staff_id) {
      return c.json({ error: '직원 ID가 필요합니다.' }, 400)
    }

    let query = `
      SELECT * FROM notifications 
      WHERE staff_id = ?
    `
    const params: any[] = [staff_id]

    if (unread_only) {
      query += ` AND is_read = 0`
    }

    query += ` ORDER BY created_at DESC LIMIT 50`

    const { results } = await c.env.DB.prepare(query).bind(...params).all()

    return c.json({ notifications: results || [] })
  } catch (error) {
    console.error('알림 목록 조회 오류:', error)
    return c.json({ error: '알림 목록 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 알림 읽음 처리
notifications.patch('/:id/read', async (c) => {
  try {
    const id = c.req.param('id')

    await c.env.DB.prepare(
      'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(id).run()

    return c.json({ success: true })
  } catch (error) {
    console.error('알림 읽음 처리 오류:', error)
    return c.json({ error: '알림 읽음 처리 중 오류가 발생했습니다.' }, 500)
  }
})

// 모든 알림 읽음 처리
notifications.post('/read-all', async (c) => {
  try {
    const { staff_id } = await c.req.json()

    if (!staff_id) {
      return c.json({ error: '직원 ID가 필요합니다.' }, 400)
    }

    await c.env.DB.prepare(
      'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE staff_id = ? AND is_read = 0'
    ).bind(staff_id).run()

    return c.json({ success: true })
  } catch (error) {
    console.error('모든 알림 읽음 처리 오류:', error)
    return c.json({ error: '모든 알림 읽음 처리 중 오류가 발생했습니다.' }, 500)
  }
})

// 알림 생성 (내부용 헬퍼 함수)
notifications.post('/', async (c) => {
  try {
    const { staff_id, type, title, message, link } = await c.req.json()

    if (!staff_id || !type || !title || !message) {
      return c.json({ error: '필수 항목을 입력해주세요.' }, 400)
    }

    const result = await c.env.DB.prepare(
      `INSERT INTO notifications (staff_id, type, title, message, link)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(staff_id, type, title, message, link || null).run()

    return c.json({
      success: true,
      notification_id: result.meta.last_row_id
    })
  } catch (error) {
    console.error('알림 생성 오류:', error)
    return c.json({ error: '알림 생성 중 오류가 발생했습니다.' }, 500)
  }
})

// 읽지 않은 알림 개수
notifications.get('/unread-count', async (c) => {
  try {
    const staff_id = c.req.query('staff_id')

    if (!staff_id) {
      return c.json({ error: '직원 ID가 필요합니다.' }, 400)
    }

    const result = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE staff_id = ? AND is_read = 0'
    ).bind(staff_id).first()

    return c.json({ count: (result as any)?.count || 0 })
  } catch (error) {
    console.error('읽지 않은 알림 개수 조회 오류:', error)
    return c.json({ error: '읽지 않은 알림 개수 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 알림 생성 헬퍼 함수 (다른 모듈에서 사용)
export async function createNotification(
  db: D1Database,
  data: {
    staff_id: number
    type: 'ticket_assigned' | 'ticket_urgent' | 'betting_result' | 'point_approved' | 'system'
    title: string
    message: string
    link?: string
    priority?: 'low' | 'normal' | 'high' | 'urgent'
  }
) {
  try {
    const result = await db.prepare(
      `INSERT INTO notifications (
        staff_id, type, title, message, link, priority, is_read, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`
    ).bind(
      data.staff_id,
      data.type,
      data.title,
      data.message,
      data.link || null,
      data.priority || 'normal'
    ).run()

    return result.meta.last_row_id
  } catch (error) {
    console.error('알림 생성 오류:', error)
    return null
  }
}

export default notifications
