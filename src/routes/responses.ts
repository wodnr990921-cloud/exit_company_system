import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  R2: R2Bucket
}

const responses = new Hono<{ Bindings: Bindings }>()

// 답변 조회 (필터링 지원)
responses.get('/', async (c) => {
  const { DB } = c.env
  const date = c.req.query('date') // YYYY-MM-DD 형식
  const startDate = c.req.query('start_date')
  const endDate = c.req.query('end_date')
  const status = c.req.query('status') // pending, printed, error
  const memberId = c.req.query('member_id')
  const responseId = c.req.query('response_id') // 개별 답변 조회
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = (page - 1) * limit
  
  try {
    const conditions = []
    const values = []
    
    // 개별 답변 조회
    if (responseId) {
      const query = `
        SELECT 
          r.*,
          m.name as member_name,
          m.member_number,
          m.institution,
          m.po_box_address,
          t.ticket_number,
          t.title as ticket_title,
          s.name as printed_by_name
        FROM responses r
        LEFT JOIN members m ON r.member_id = m.id
        LEFT JOIN tickets t ON r.ticket_id = t.id
        LEFT JOIN staff s ON r.printed_by = s.id
        WHERE r.id = ?
      `
      const result = await DB.prepare(query).bind(responseId).first()
      
      return c.json({
        responses: result ? [result] : [],
        stats: {
          total: result ? 1 : 0,
          pending: result && result.print_status === 'pending' ? 1 : 0,
          printed: result && result.print_status === 'printed' ? 1 : 0,
          error: result && result.print_status === 'error' ? 1 : 0
        }
      })
    }
    
    // 날짜 필터
    if (date) {
      conditions.push('DATE(r.created_at) = ?')
      values.push(date)
    } else if (startDate && endDate) {
      conditions.push('DATE(r.created_at) BETWEEN ? AND ?')
      values.push(startDate, endDate)
    }
    
    // 상태 필터
    if (status) {
      conditions.push('r.print_status = ?')
      values.push(status)
    }
    
    // 회원 필터
    if (memberId) {
      conditions.push('r.member_id = ?')
      values.push(memberId)
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    
    // 답변 조회
    const query = `
      SELECT 
        r.*,
        m.name as member_name,
        m.member_number,
        m.institution,
        t.ticket_number,
        t.title as ticket_title,
        s.name as printed_by_name
      FROM responses r
      LEFT JOIN members m ON r.member_id = m.id
      LEFT JOIN tickets t ON r.ticket_id = t.id
      LEFT JOIN staff s ON r.printed_by = s.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `
    
    const { results } = await DB.prepare(query).bind(...values, limit, offset).all()
    
    // 총 개수 조회
    const countQuery = `
      SELECT COUNT(*) as total
      FROM responses r
      ${whereClause}
    `
    const { total } = await DB.prepare(countQuery).bind(...values).first() as { total: number }
    
    // 통계 계산
    const printed = results.filter(r => r.print_status === 'printed').length
    const pending = results.filter(r => r.print_status === 'pending').length
    const errorCount = results.filter(r => r.print_status === 'error').length
    
    return c.json({
      responses: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        total: results.length,
        printed,
        pending,
        error: errorCount
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

// 이미지 업로드 (답변 양식용)
responses.post('/upload-image', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('image')
    
    if (!file || !(file instanceof File)) {
      return c.json({ error: '이미지 파일이 필요합니다' }, 400)
    }
    
    // 파일 크기 제한 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: '파일 크기는 10MB 이하여야 합니다' }, 400)
    }
    
    // 파일 타입 확인
    if (!file.type.startsWith('image/')) {
      return c.json({ error: '이미지 파일만 업로드 가능합니다' }, 400)
    }
    
    // R2에 업로드
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(7)
    const extension = file.name.split('.').pop() || 'jpg'
    const key = `response-templates/${timestamp}-${randomStr}.${extension}`
    
    const arrayBuffer = await file.arrayBuffer()
    await c.env.R2.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type
      }
    })
    
    // 공개 URL 반환 (실제 환경에 맞게 수정 필요)
    const publicUrl = `/api/responses/image/${key}`
    
    return c.json({ 
      success: true,
      url: publicUrl,
      key: key
    })
  } catch (error) {
    console.error('이미지 업로드 오류:', error)
    return c.json({ error: '이미지 업로드 실패' }, 500)
  }
})

// 이미지 조회
responses.get('/image/*', async (c) => {
  try {
    const path = c.req.path.replace('/api/responses/image/', '')
    
    const object = await c.env.R2.get(path)
    if (!object) {
      return c.json({ error: '이미지를 찾을 수 없습니다' }, 404)
    }
    
    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('Cache-Control', 'public, max-age=31536000')
    
    return new Response(object.body, { headers })
  } catch (error) {
    console.error('이미지 조회 오류:', error)
    return c.json({ error: '이미지 조회 실패' }, 500)
  }
})

// 답변 템플릿 조회
responses.get('/template', async (c) => {
  const { DB } = c.env
  
  try {
    const template = await DB.prepare(`
      SELECT id, name, content as html_content, variables, is_active, created_at, updated_at
      FROM response_templates
      WHERE is_active = 1
      ORDER BY updated_at DESC
      LIMIT 1
    `).first()
    
    return c.json({ 
      template: template || { html_content: '' }
    })
  } catch (error) {
    console.error('템플릿 조회 오류:', error)
    return c.json({ error: '템플릿 조회 실패' }, 500)
  }
})

// 답변 템플릿 저장
responses.put('/template', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  
  const { html_content, updated_by } = body
  
  if (!html_content) {
    return c.json({ error: 'html_content is required' }, 400)
  }
  
  try {
    // 기존 템플릿 비활성화
    await DB.prepare(`
      UPDATE response_templates SET is_active = 0
    `).run()
    
    // 새 템플릿 추가
    const result = await DB.prepare(`
      INSERT INTO response_templates (name, content, is_active, created_by)
      VALUES (?, ?, 1, ?)
    `).bind('기본 템플릿', html_content, updated_by || 'system').run()
    
    return c.json({ 
      message: '템플릿이 저장되었습니다',
      id: result.meta.last_row_id
    })
  } catch (error) {
    console.error('템플릿 저장 오류:', error)
    return c.json({ error: '템플릿 저장 실패' }, 500)
  }
})

export default responses
