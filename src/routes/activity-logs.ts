import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
}

const activityLogs = new Hono<{ Bindings: Bindings }>()

// 활동 로그 조회
activityLogs.get('/', async (c) => {
  try {
    const { DB } = c.env
    const { start_date, end_date, staff_id, action } = c.req.query()

    let query = `
      SELECT 
        al.id,
        al.staff_id,
        al.action,
        al.action_description,
        al.entity_type,
        al.entity_id,
        al.details,
        al.ip_address,
        al.created_at,
        s.name as staff_name,
        s.email as staff_email
      FROM activity_logs al
      LEFT JOIN staff s ON al.staff_id = s.id
      WHERE al.created_at >= ? AND al.created_at <= ?
    `
    
    const params: any[] = [start_date + ' 00:00:00', end_date + ' 23:59:59']
    
    if (staff_id) {
      query += ' AND al.staff_id = ?'
      params.push(staff_id)
    }
    
    if (action) {
      query += ' AND al.action = ?'
      params.push(action)
    }
    
    query += ' ORDER BY al.created_at DESC LIMIT 1000'

    const result = await DB.prepare(query).bind(...params).all()
    
    return c.json({ logs: result.results })
  } catch (error) {
    console.error('활동 로그 조회 오류:', error)
    return c.json({ error: '활동 로그 조회 실패' }, 500)
  }
})

// 활동 로그 생성 (시스템 내부 사용)
activityLogs.post('/', async (c) => {
  try {
    const { DB } = c.env
    const {
      staff_id,
      action,
      action_description,
      entity_type,
      entity_id,
      details,
      ip_address
    } = await c.req.json()

    // activity_logs 테이블 생성 (없을 경우)
    await DB.prepare(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id INTEGER,
        action TEXT NOT NULL,
        action_description TEXT,
        entity_type TEXT,
        entity_id INTEGER,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_id) REFERENCES staff(id)
      )
    `).run()

    // 로그 삽입
    const result = await DB.prepare(`
      INSERT INTO activity_logs (staff_id, action, action_description, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      staff_id || null,
      action,
      action_description || null,
      entity_type || null,
      entity_id || null,
      details ? JSON.stringify(details) : null,
      ip_address || null
    ).run()

    return c.json({
      success: true,
      log_id: result.meta.last_row_id
    })
  } catch (error) {
    console.error('활동 로그 생성 오류:', error)
    return c.json({ error: '활동 로그 생성 실패' }, 500)
  }
})

// 활동 로그 통계
activityLogs.get('/stats', async (c) => {
  try {
    const { DB } = c.env
    const { start_date, end_date } = c.req.query()

    const result = await DB.prepare(`
      SELECT 
        action,
        COUNT(*) as count,
        COUNT(DISTINCT staff_id) as unique_staff
      FROM activity_logs
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY action
      ORDER BY count DESC
    `).bind(
      start_date + ' 00:00:00',
      end_date + ' 23:59:59'
    ).all()

    return c.json({ stats: result.results })
  } catch (error) {
    console.error('활동 로그 통계 오류:', error)
    return c.json({ error: '활동 로그 통계 조회 실패' }, 500)
  }
})

export default activityLogs

// 로그 기록 헬퍼 함수 (다른 모듈에서 import하여 사용)
export async function logActivity(
  db: D1Database,
  data: {
    staff_id?: number
    action: string
    action_description?: string
    entity_type?: string
    entity_id?: number
    details?: Record<string, any>
    ip_address?: string
  }
) {
  try {
    // 테이블 존재 확인 및 생성
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id INTEGER,
        action TEXT NOT NULL,
        action_description TEXT,
        entity_type TEXT,
        entity_id INTEGER,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_id) REFERENCES staff(id)
      )
    `).run()

    await db.prepare(`
      INSERT INTO activity_logs (staff_id, action, action_description, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.staff_id || null,
      data.action,
      data.action_description || null,
      data.entity_type || null,
      data.entity_id || null,
      data.details ? JSON.stringify(data.details) : null,
      data.ip_address || null
    ).run()
  } catch (error) {
    console.error('활동 로그 기록 오류:', error)
    // 로그 실패는 전체 프로세스를 중단하지 않음
  }
}
