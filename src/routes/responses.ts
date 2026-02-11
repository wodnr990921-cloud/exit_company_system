import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
}

const responses = new Hono<{ Bindings: Bindings }>()

// 날짜별 답변 조회
responses.get('/', async (c) => {
  const { DB } = c.env
  const date = c.req.query('date') // YYYY-MM-DD 형식
  
  if (!date) {
    return c.json({ error: 'Date parameter is required' }, 400)
  }
  
  try {
    // 해당 날짜의 답변 조회
    const query = `
      SELECT 
        r.*,
        m.name as member_name,
        m.member_number,
        t.ticket_number,
        t.title as ticket_title,
        s.name as printed_by_name
      FROM responses r
      LEFT JOIN members m ON r.member_id = m.id
      LEFT JOIN tickets t ON r.ticket_id = t.id
      LEFT JOIN staff s ON r.printed_by = s.id
      WHERE DATE(r.created_at) = ?
      ORDER BY r.created_at DESC
    `
    
    const { results } = await DB.prepare(query).bind(date).all()
    
    // 통계 계산
    const total = results.length
    const printed = results.filter(r => r.print_status === 'printed').length
    const pending = results.filter(r => r.print_status === 'pending').length
    const error = results.filter(r => r.print_status === 'error').length
    
    return c.json({
      responses: results,
      stats: {
        total,
        printed,
        pending,
        error
      }
    })
  } catch (error) {
    console.error('Failed to fetch responses:', error)
    return c.json({ error: 'Failed to fetch responses' }, 500)
  }
})

// 답변 생성 (티켓 답변 작성 시 자동 호출)
responses.post('/', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  
  const {
    ticket_id,
    member_id,
    response_type,
    content,
    recipient_name,
    recipient_number,
    recipient_institution,
    po_box_address
  } = body
  
  if (!ticket_id || !member_id || !response_type || !content || !recipient_name || !recipient_number) {
    return c.json({ error: 'Missing required fields' }, 400)
  }
  
  try {
    const result = await DB.prepare(`
      INSERT INTO responses (
        ticket_id, member_id, response_type, content,
        recipient_name, recipient_number, recipient_institution, po_box_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      ticket_id, member_id, response_type, content,
      recipient_name, recipient_number, recipient_institution, po_box_address
    ).run()
    
    return c.json({
      id: result.meta.last_row_id,
      message: 'Response created successfully'
    }, 201)
  } catch (error) {
    console.error('Failed to create response:', error)
    return c.json({ error: 'Failed to create response' }, 500)
  }
})

// 답변 출력 상태 업데이트
responses.patch('/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const body = await c.req.json()
  
  const { print_status, printed_by, error_message } = body
  
  if (!print_status) {
    return c.json({ error: 'print_status is required' }, 400)
  }
  
  try {
    const updates = []
    const values = []
    
    updates.push('print_status = ?')
    values.push(print_status)
    
    if (print_status === 'printed') {
      updates.push('printed_at = CURRENT_TIMESTAMP')
      if (printed_by) {
        updates.push('printed_by = ?')
        values.push(printed_by)
      }
    }
    
    if (error_message) {
      updates.push('error_message = ?')
      values.push(error_message)
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)
    
    await DB.prepare(`
      UPDATE responses
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...values).run()
    
    return c.json({ message: 'Response updated successfully' })
  } catch (error) {
    console.error('Failed to update response:', error)
    return c.json({ error: 'Failed to update response' }, 500)
  }
})

// 일괄 출력 상태 업데이트
responses.post('/bulk-print', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  
  const { response_ids, printed_by } = body
  
  if (!response_ids || !Array.isArray(response_ids) || response_ids.length === 0) {
    return c.json({ error: 'response_ids array is required' }, 400)
  }
  
  try {
    const placeholders = response_ids.map(() => '?').join(',')
    const values = [...response_ids]
    
    let query = `
      UPDATE responses
      SET print_status = 'printed',
          printed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
    `
    
    if (printed_by) {
      query += ', printed_by = ?'
      values.push(printed_by)
    }
    
    query += ` WHERE id IN (${placeholders})`
    
    await DB.prepare(query).bind(...values).run()
    
    return c.json({
      message: 'Responses marked as printed',
      count: response_ids.length
    })
  } catch (error) {
    console.error('Failed to bulk update responses:', error)
    return c.json({ error: 'Failed to bulk update responses' }, 500)
  }
})

// 출력 양식 설정 조회
responses.get('/settings', async (c) => {
  const { DB } = c.env
  
  try {
    const { results } = await DB.prepare(`
      SELECT * FROM response_settings
      ORDER BY setting_key
    `).all()
    
    // 객체 형태로 변환
    const settings = {}
    results.forEach(row => {
      settings[row.setting_key] = row.setting_value
    })
    
    return c.json({ settings })
  } catch (error) {
    console.error('Failed to fetch settings:', error)
    return c.json({ error: 'Failed to fetch settings' }, 500)
  }
})

// 출력 양식 설정 업데이트
responses.put('/settings', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  
  const { settings, updated_by } = body
  
  if (!settings || typeof settings !== 'object') {
    return c.json({ error: 'settings object is required' }, 400)
  }
  
  try {
    for (const [key, value] of Object.entries(settings)) {
      await DB.prepare(`
        INSERT INTO response_settings (setting_key, setting_value, updated_by, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(setting_key) DO UPDATE SET
          setting_value = excluded.setting_value,
          updated_by = excluded.updated_by,
          updated_at = CURRENT_TIMESTAMP
      `).bind(key, value, updated_by).run()
    }
    
    return c.json({ message: 'Settings updated successfully' })
  } catch (error) {
    console.error('Failed to update settings:', error)
    return c.json({ error: 'Failed to update settings' }, 500)
  }
})

export default responses
