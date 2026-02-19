import { Hono } from 'hono'
import { requireRole, ROLES } from '../middleware/auth'

type Bindings = {
  DB: D1Database
}

const modifications = new Hono<{ Bindings: Bindings }>()

// 수정 요청 생성 (Staff 이상)
modifications.post('/', requireRole(ROLES.STAFF), async (c) => {
  try {
    const { target_type, target_id, field_name, old_value, new_value, reason, requested_by } = await c.req.json()

    if (!target_type || !target_id || !field_name || !new_value || !requested_by) {
      return c.json({ error: '필수 항목을 입력해주세요.' }, 400)
    }

    const result = await c.env.DB.prepare(
      `INSERT INTO modification_requests (target_type, target_id, field_name, old_value, new_value, reason, requested_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`
    ).bind(target_type, target_id, field_name, old_value || '', new_value, reason || '', requested_by).run()

    return c.json({ 
      success: true, 
      request_id: result.meta.last_row_id 
    })
  } catch (error) {
    console.error('수정 요청 생성 오류:', error)
    return c.json({ error: '수정 요청 생성 중 오류가 발생했습니다.' }, 500)
  }
})

// 수정 요청 목록 조회 (Admin)
modifications.get('/pending', requireRole(ROLES.ADMIN), async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT mr.*, 
              s.name as requester_name,
              s.role as requester_role,
              m.name as member_name,
              m.member_number
       FROM modification_requests mr
       LEFT JOIN staff s ON mr.requested_by = s.id
       LEFT JOIN members m ON mr.target_type = 'member' AND mr.target_id = m.id
       WHERE mr.status = 'pending'
       ORDER BY mr.created_at DESC`
    ).all()

    return c.json({ requests: results })
  } catch (error) {
    console.error('수정 요청 목록 조회 오류:', error)
    return c.json({ error: '수정 요청 목록 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 수정 요청 승인/거부 (Admin 전용)
modifications.post('/:id/review', requireRole(ROLES.ADMIN), async (c) => {
  try {
    const request_id = c.req.param('id')
    const { action, reviewed_by } = await c.req.json() // action: 'approve' or 'reject'

    if (!action || !reviewed_by) {
      return c.json({ error: '필수 항목을 입력해주세요.' }, 400)
    }

    // 요청 정보 조회
    const request = await c.env.DB.prepare(
      'SELECT * FROM modification_requests WHERE id = ?'
    ).bind(request_id).first()

    if (!request) {
      return c.json({ error: '수정 요청을 찾을 수 없습니다.' }, 404)
    }

    if ((request as any).status !== 'pending') {
      return c.json({ error: '이미 처리된 요청입니다.' }, 400)
    }

    const req = request as any

    if (action === 'approve') {
      // 승인: 실제 데이터 수정
      const tableName = getTableName(req.target_type)
      
      await c.env.DB.prepare(
        `UPDATE ${tableName} SET ${req.field_name} = ? WHERE id = ?`
      ).bind(req.new_value, req.target_id).run()

      // 요청 상태 업데이트
      await c.env.DB.prepare(
        `UPDATE modification_requests 
         SET status = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).bind(reviewed_by, request_id).run()

      return c.json({ success: true, message: '수정이 승인되고 적용되었습니다.' })
    } else if (action === 'reject') {
      // 거부: 요청 상태만 업데이트
      await c.env.DB.prepare(
        `UPDATE modification_requests 
         SET status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).bind(reviewed_by, request_id).run()

      return c.json({ success: true, message: '수정 요청이 거부되었습니다.' })
    } else {
      return c.json({ error: '올바른 액션을 선택해주세요.' }, 400)
    }
  } catch (error) {
    console.error('수정 요청 처리 오류:', error)
    return c.json({ error: '수정 요청 처리 중 오류가 발생했습니다.' }, 500)
  }
})

// 내 수정 요청 목록 (Staff)
modifications.get('/my-requests', requireRole(ROLES.STAFF), async (c) => {
  try {
    const staff_id = c.req.query('staff_id')

    if (!staff_id) {
      return c.json({ error: '직원 ID가 필요합니다.' }, 400)
    }

    const { results } = await c.env.DB.prepare(
      `SELECT mr.*,
              reviewer.name as reviewer_name
       FROM modification_requests mr
       LEFT JOIN staff reviewer ON mr.reviewed_by = reviewer.id
       WHERE mr.requested_by = ?
       ORDER BY mr.created_at DESC
       LIMIT 50`
    ).bind(staff_id).all()

    return c.json({ requests: results })
  } catch (error) {
    console.error('내 수정 요청 조회 오류:', error)
    return c.json({ error: '수정 요청 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 테이블명 매핑 헬퍼 함수
function getTableName(targetType: string): string {
  const tableMap: { [key: string]: string } = {
    'member': 'members',
    'book': 'books',
    'ticket': 'tickets',
    'match': 'matches',
    'staff': 'staff'
  }
  return tableMap[targetType] || targetType
}

export default modifications
