import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
}

const settings = new Hono<{ Bindings: Bindings }>()

// 설정 조회
settings.get('/', async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      SELECT * FROM settings WHERE id = 1
    `).first()

    if (!result) {
      // 기본 설정 반환
      return c.json({
        openai_key: '',
        telegram_token: '',
        telegram_chat_id: '',
        commission_rate: 10,
        min_settlement: 10000,
        max_settlement: 5000000,
        point_conversion_rate: 1.0,
        notify_ticket_created: true,
        notify_ticket_assigned: true,
        notify_approval_request: true,
        notify_betting_result: true,
        auto_closing_time: '23:59',
        ticket_retention: 365,
        session_timeout: 60,
        updated_at: null
      })
    }

    return c.json(result)
  } catch (error: any) {
    console.error('설정 조회 오류:', error)
    return c.json({ error: '설정 조회 실패', details: error.message }, 500)
  }
})

// 설정 저장
settings.post('/', async (c) => {
  try {
    const data = await c.req.json()

    // 설정 테이블 생성 (없을 경우)
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY,
        openai_key TEXT,
        telegram_token TEXT,
        telegram_chat_id TEXT,
        commission_rate REAL DEFAULT 10,
        min_settlement INTEGER DEFAULT 10000,
        max_settlement INTEGER DEFAULT 5000000,
        point_conversion_rate REAL DEFAULT 1.0,
        notify_ticket_created INTEGER DEFAULT 1,
        notify_ticket_assigned INTEGER DEFAULT 1,
        notify_approval_request INTEGER DEFAULT 1,
        notify_betting_result INTEGER DEFAULT 1,
        auto_closing_time TEXT DEFAULT '23:59',
        ticket_retention INTEGER DEFAULT 365,
        session_timeout INTEGER DEFAULT 60,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()

    // 기존 설정 확인
    const existing = await c.env.DB.prepare(`
      SELECT id FROM settings WHERE id = 1
    `).first()

    if (existing) {
      // 업데이트
      await c.env.DB.prepare(`
        UPDATE settings SET
          openai_key = ?,
          telegram_token = ?,
          telegram_chat_id = ?,
          commission_rate = ?,
          min_settlement = ?,
          max_settlement = ?,
          point_conversion_rate = ?,
          notify_ticket_created = ?,
          notify_ticket_assigned = ?,
          notify_approval_request = ?,
          notify_betting_result = ?,
          auto_closing_time = ?,
          ticket_retention = ?,
          session_timeout = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `).bind(
        data.openai_key || '',
        data.telegram_token || '',
        data.telegram_chat_id || '',
        data.commission_rate || 10,
        data.min_settlement || 10000,
        data.max_settlement || 5000000,
        data.point_conversion_rate || 1.0,
        data.notify_ticket_created ? 1 : 0,
        data.notify_ticket_assigned ? 1 : 0,
        data.notify_approval_request ? 1 : 0,
        data.notify_betting_result ? 1 : 0,
        data.auto_closing_time || '23:59',
        data.ticket_retention || 365,
        data.session_timeout || 60
      ).run()
    } else {
      // 삽입
      await c.env.DB.prepare(`
        INSERT INTO settings (
          id, openai_key, telegram_token, telegram_chat_id,
          commission_rate, min_settlement, max_settlement, point_conversion_rate,
          notify_ticket_created, notify_ticket_assigned, notify_approval_request, notify_betting_result,
          auto_closing_time, ticket_retention, session_timeout
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        data.openai_key || '',
        data.telegram_token || '',
        data.telegram_chat_id || '',
        data.commission_rate || 10,
        data.min_settlement || 10000,
        data.max_settlement || 5000000,
        data.point_conversion_rate || 1.0,
        data.notify_ticket_created ? 1 : 0,
        data.notify_ticket_assigned ? 1 : 0,
        data.notify_approval_request ? 1 : 0,
        data.notify_betting_result ? 1 : 0,
        data.auto_closing_time || '23:59',
        data.ticket_retention || 365,
        data.session_timeout || 60
      ).run()
    }

    return c.json({ success: true, message: '설정이 저장되었습니다' })
  } catch (error: any) {
    console.error('설정 저장 오류:', error)
    return c.json({ error: '설정 저장 실패', details: error.message }, 500)
  }
})

// 특정 설정 값 조회 (다른 모듈에서 사용)
settings.get('/:key', async (c) => {
  try {
    const key = c.req.param('key')
    const result = await c.env.DB.prepare(`
      SELECT ${key} FROM settings WHERE id = 1
    `).first()

    if (!result) {
      return c.json({ value: null })
    }

    return c.json({ value: result[key] })
  } catch (error: any) {
    console.error('설정 값 조회 오류:', error)
    return c.json({ error: '설정 값 조회 실패', details: error.message }, 500)
  }
})

export default settings
