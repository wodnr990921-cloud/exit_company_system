import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  R2: R2Bucket
}

const tickets = new Hono<{ Bindings: Bindings }>()

// 티켓 목록 조회
tickets.get('/', async (c) => {
  try {
    const status = c.req.query('status') || 'all'
    const type = c.req.query('type') || 'all'
    const assigned_to = c.req.query('assigned_to')
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const offset = (page - 1) * limit

    let query = `
      SELECT t.*, 
             m.name as member_name,
             s.name as assigned_to_name,
             c.name as created_by_name
      FROM tickets t
      LEFT JOIN members m ON t.member_id = m.id
      LEFT JOIN staff s ON t.assigned_to = s.id
      LEFT JOIN staff c ON t.created_by = c.id
      WHERE 1=1
    `
    const params: any[] = []

    if (status && status !== 'all') {
      query += ` AND t.status = ?`
      params.push(status)
    }

    if (type && type !== 'all') {
      query += ` AND t.ticket_type = ?`
      params.push(type)
    }

    if (assigned_to) {
      query += ` AND t.assigned_to = ?`
      params.push(assigned_to)
    }

    // 총 개수 조회
    let countQuery = `SELECT COUNT(*) as total FROM tickets t WHERE 1=1`
    const countParams: any[] = []
    
    if (status && status !== 'all') {
      countQuery += ` AND t.status = ?`
      countParams.push(status)
    }
    
    if (type && type !== 'all') {
      countQuery += ` AND t.ticket_type = ?`
      countParams.push(type)
    }
    
    if (assigned_to) {
      countQuery += ` AND t.assigned_to = ?`
      countParams.push(assigned_to)
    }
    
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first()
    const total = (countResult as any)?.total || 0

    query += ` ORDER BY 
      CASE t.priority 
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
      END,
      t.created_at DESC
      LIMIT ? OFFSET ?
    `
    params.push(limit, offset)

    const { results } = await c.env.DB.prepare(query).bind(...params).all()

    return c.json({ 
      tickets: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('티켓 목록 조회 오류:', error)
    return c.json({ error: '티켓 목록 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 티켓 상세 조회
tickets.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')

    const ticket = await c.env.DB.prepare(
      `SELECT t.*, 
              m.name as member_name, m.points as member_points, m.betting_points as member_betting_points,
              s.name as assigned_to_name,
              c.name as created_by_name
       FROM tickets t
       LEFT JOIN members m ON t.member_id = m.id
       LEFT JOIN staff s ON t.assigned_to = s.id
       LEFT JOIN staff c ON t.created_by = c.id
       WHERE t.id = ?`
    ).bind(id).first()

    if (!ticket) {
      return c.json({ error: '티켓을 찾을 수 없습니다.' }, 404)
    }

    // 댓글/답변 조회
    const { results: comments } = await c.env.DB.prepare(
      `SELECT tc.*, s.name as staff_name
       FROM ticket_comments tc
       LEFT JOIN staff s ON tc.staff_id = s.id
       WHERE tc.ticket_id = ?
       ORDER BY tc.created_at ASC`
    ).bind(id).all()

    return c.json({ ticket, comments: comments || [] })
  } catch (error) {
    console.error('티켓 상세 조회 오류:', error)
    return c.json({ error: '티켓 상세 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 티켓 생성
tickets.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const { title, description, member_id, ticket_type, priority, assigned_to, created_by, betting_data } = body

    if (!title || !ticket_type || !created_by) {
      return c.json({ error: '필수 항목을 입력해주세요.' }, 400)
    }

    // 티켓 번호 생성 (T + 타임스탬프)
    const ticket_number = `T${Date.now()}`
    
    // 상태 설정: assigned_to가 있으면 'assigned', 없으면 'open'
    const status = assigned_to ? 'assigned' : 'open'

    const result = await c.env.DB.prepare(
      `INSERT INTO tickets (ticket_number, title, description, member_id, ticket_type, priority, status, assigned_to, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      ticket_number, title, description || '', member_id || null, 
      ticket_type, priority || 'normal', status, assigned_to || null, created_by
    ).run()

    const ticketId = result.meta.last_row_id

    // 배팅 티켓인 경우 배팅 폴더 및 배팅 생성
    if (ticket_type === 'BETTING' && betting_data && member_id) {
      try {
        // 회원의 배팅 포인트 조회
        const member = await c.env.DB.prepare(
          'SELECT betting_points FROM members WHERE id = ?'
        ).bind(member_id).first()
        
        const currentPoints = Number((member as any)?.betting_points || 0)
        
        if (currentPoints < betting_data.amount) {
          return c.json({ error: '배팅 포인트가 부족합니다.' }, 400)
        }
        
        // 배팅 폴더 생성
        const folderResult = await c.env.DB.prepare(
          `INSERT INTO bet_folders (member_id, folder_type, total_bet_amount, potential_win, ticket_id)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(
          member_id,
          'single', // 단폴더로 고정
          betting_data.amount,
          betting_data.potential_win,
          ticketId
        ).run()
        
        const folderId = folderResult.meta.last_row_id
        
        // 배팅 레코드 생성
        await c.env.DB.prepare(
          `INSERT INTO bets (folder_id, match_id, bet_type, odds)
           VALUES (?, ?, ?, ?)`
        ).bind(
          folderId,
          betting_data.match_id,
          betting_data.bet_type,
          betting_data.odds
        ).run()
        
        // 회원 배팅 포인트 차감
        await c.env.DB.prepare(
          'UPDATE members SET betting_points = betting_points - ? WHERE id = ?'
        ).bind(betting_data.amount, member_id).run()
        
        // 포인트 트랜잭션 기록
        await c.env.DB.prepare(
          `INSERT INTO point_transactions (member_id, transaction_type, amount, point_type, description, related_ticket_id)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
          member_id,
          'subtract',
          betting_data.amount,
          'betting_points',
          `배팅 사용 (${ticket_number})`,
          ticketId
        ).run()
      } catch (bettingError) {
        console.error('배팅 처리 오류:', bettingError)
        // 티켓은 생성되었으나 배팅 처리 실패
        return c.json({ 
          success: true, 
          ticket_id: ticketId,
          ticket_number,
          warning: '티켓은 생성되었으나 배팅 처리 중 오류가 발생했습니다.'
        })
      }
    }

    return c.json({ 
      success: true, 
      ticket_id: ticketId,
      ticket_number
    })
  } catch (error) {
    console.error('티켓 생성 오류:', error)
    return c.json({ error: '티켓 생성 중 오류가 발생했습니다.' }, 500)
  }
})

// 티켓 이미지 업로드
tickets.post('/:id/images', async (c) => {
  try {
    const ticket_id = c.req.param('id')
    const formData = await c.req.formData()
    const files = formData.getAll('images')

    if (!files || files.length === 0) {
      return c.json({ error: '업로드할 이미지가 없습니다.' }, 400)
    }

    const uploadedKeys: string[] = []

    for (const file of files) {
      if (file instanceof File) {
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(7)
        const key = `tickets/${ticket_id}/${timestamp}-${randomStr}-${file.name}`
        
        const arrayBuffer = await file.arrayBuffer()
        await c.env.R2.put(key, arrayBuffer, {
          httpMetadata: {
            contentType: file.type
          }
        })
        
        uploadedKeys.push(key)
      }
    }

    // 티켓 테이블의 image_keys 업데이트
    const ticket = await c.env.DB.prepare(
      'SELECT image_keys FROM tickets WHERE id = ?'
    ).bind(ticket_id).first()

    let existingKeys: string[] = []
    if (ticket && ticket.image_keys) {
      try {
        existingKeys = JSON.parse(ticket.image_keys as string)
      } catch (e) {
        existingKeys = []
      }
    }

    const allKeys = [...existingKeys, ...uploadedKeys]

    await c.env.DB.prepare(
      'UPDATE tickets SET image_keys = ? WHERE id = ?'
    ).bind(JSON.stringify(allKeys), ticket_id).run()

    return c.json({ 
      success: true, 
      uploaded_keys: uploadedKeys,
      all_keys: allKeys
    })
  } catch (error) {
    console.error('이미지 업로드 오류:', error)
    return c.json({ error: '이미지 업로드 중 오류가 발생했습니다.' }, 500)
  }
})

// 티켓 이미지 조회
tickets.get('/:id/images/:key', async (c) => {
  try {
    const key = c.req.param('key')
    const fullKey = decodeURIComponent(key)
    
    const object = await c.env.R2.get(fullKey)
    
    if (!object) {
      return c.json({ error: '이미지를 찾을 수 없습니다.' }, 404)
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000'
      }
    })
  } catch (error) {
    console.error('이미지 조회 오류:', error)
    return c.json({ error: '이미지 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 티켓 수정
tickets.patch('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const updates = await c.req.json()

    const allowedFields = ['title', 'description', 'status', 'priority', 'assigned_to']
    const setClause: string[] = ['updated_at = CURRENT_TIMESTAMP']
    const params: any[] = []

    // 티켓 배정 변경 감지를 위해 기존 티켓 정보 조회
    const oldTicket = await c.env.DB.prepare('SELECT * FROM tickets WHERE id = ?').bind(id).first()

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = ?`)
        params.push(value)
      }
    }

    params.push(id)

    await c.env.DB.prepare(
      `UPDATE tickets SET ${setClause.join(', ')} WHERE id = ?`
    ).bind(...params).run()

    // 📢 알림: 티켓이 배정되었을 때
    if (updates.assigned_to && oldTicket && (oldTicket as any).assigned_to !== updates.assigned_to) {
      // 티켓 정보 조회
      const ticket = await c.env.DB.prepare('SELECT * FROM tickets WHERE id = ?').bind(id).first()
      
      if (ticket) {
        await createNotification(c.env.DB, {
          staff_id: Number(updates.assigned_to),
          type: 'ticket_assigned',
          title: '새 티켓이 배정되었습니다',
          message: `티켓 ${(ticket as any).ticket_number}: ${(ticket as any).title}`,
          link: `/tickets/${id}`,
          priority: (ticket as any).priority === 'urgent' ? 'urgent' : (ticket as any).priority === 'high' ? 'high' : 'normal'
        })
      }
    }

    // 📢 알림: 긴급 티켓으로 변경되었을 때
    if (updates.priority === 'urgent' && oldTicket && (oldTicket as any).priority !== 'urgent') {
      // 티켓 담당자에게 알림
      if ((oldTicket as any).assigned_to) {
        const ticket = await c.env.DB.prepare('SELECT * FROM tickets WHERE id = ?').bind(id).first()
        
        if (ticket) {
          await c.env.DB.prepare(
            `INSERT INTO notifications (staff_id, type, title, message, link)
             VALUES (?, 'ticket_urgent', ?, ?, ?)`
          ).bind(
            (oldTicket as any).assigned_to,
            '⚠️ 긴급 티켓으로 변경됨',
            `티켓 #${(ticket as any).ticket_number}이(가) 긴급으로 변경되었습니다`,
            `/tickets/${id}`
          ).run()
        }
      }
    }

    return c.json({ success: true })
  } catch (error) {
    console.error('티켓 수정 오류:', error)
    return c.json({ error: '티켓 수정 중 오류가 발생했습니다.' }, 500)
  }
})

// 댓글/답변 추가
tickets.post('/:id/comments', async (c) => {
  try {
    const ticket_id = c.req.param('id')
    const { content, created_by, comment_type } = await c.req.json()

    if (!created_by || !content) {
      return c.json({ error: '필수 항목을 입력해주세요.' }, 400)
    }

    const finalCommentType = comment_type || 'internal'

    const result = await c.env.DB.prepare(
      `INSERT INTO ticket_comments (ticket_id, staff_id, comment, comment_type)
       VALUES (?, ?, ?, ?)`
    ).bind(ticket_id, created_by, content, finalCommentType).run()

    // 티켓 업데이트 시간 갱신
    await c.env.DB.prepare(
      'UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(ticket_id).run()

    return c.json({ 
      success: true, 
      comment_id: result.meta.last_row_id 
    })
  } catch (error) {
    console.error('댓글 추가 오류:', error)
    return c.json({ error: '댓글 추가 중 오류가 발생했습니다.' }, 500)
  }
})

// 댓글 목록 조회
tickets.get('/:id/comments', async (c) => {
  try {
    const ticket_id = c.req.param('id')

    const { results } = await c.env.DB.prepare(
      `SELECT tc.*, s.name as created_by_name
       FROM ticket_comments tc
       LEFT JOIN staff s ON tc.staff_id = s.id
       WHERE tc.ticket_id = ?
       ORDER BY tc.created_at DESC`
    ).bind(ticket_id).all()

    return c.json({ comments: results || [] })
  } catch (error) {
    console.error('댓글 조회 오류:', error)
    return c.json({ error: '댓글 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 대시보드 통계
tickets.get('/stats/dashboard', async (c) => {
  try {
    // 총 티켓 수 (상태별)
    const { results: statusStats } = await c.env.DB.prepare(
      `SELECT status, COUNT(*) as count 
       FROM tickets 
       GROUP BY status`
    ).all()

    // 우선순위별 통계
    const { results: priorityStats } = await c.env.DB.prepare(
      `SELECT priority, COUNT(*) as count 
       FROM tickets 
       WHERE status IN ('open', 'assigned', 'in_progress')
       GROUP BY priority`
    ).all()

    // 유형별 통계
    const { results: typeStats } = await c.env.DB.prepare(
      `SELECT ticket_type, COUNT(*) as count 
       FROM tickets 
       GROUP BY ticket_type`
    ).all()

    // 오늘 완료된 티켓
    const today = new Date().toISOString().split('T')[0]
    const todayCompleted = await c.env.DB.prepare(
      `SELECT COUNT(*) as count 
       FROM tickets 
       WHERE status = 'completed' AND DATE(updated_at) = ?`
    ).bind(today).first()

    return c.json({
      statusStats: statusStats || [],
      priorityStats: priorityStats || [],
      typeStats: typeStats || [],
      todayCompleted: (todayCompleted as any)?.count || 0
    })
  } catch (error) {
    console.error('대시보드 통계 오류:', error)
    return c.json({ error: '대시보드 통계 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 티켓 삭제 (관리자만)
tickets.delete('/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  
  try {
    // 티켓 존재 확인
    const ticket = await DB.prepare('SELECT id FROM tickets WHERE id = ?').bind(id).first()
    
    if (!ticket) {
      return c.json({ error: '티켓을 찾을 수 없습니다.' }, 404)
    }
    
    // 관련 데이터 삭제 (CASCADE 효과)
    await DB.prepare('DELETE FROM ticket_comments WHERE ticket_id = ?').bind(id).run()
    await DB.prepare('DELETE FROM ticket_items WHERE ticket_id = ?').bind(id).run()
    
    // 티켓 삭제
    await DB.prepare('DELETE FROM tickets WHERE id = ?').bind(id).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('티켓 삭제 오류:', error)
    return c.json({ error: '티켓 삭제 중 오류가 발생했습니다.' }, 500)
  }
})

export default tickets
