import { Hono } from 'hono'
import { requireRole, requireExactRole, ROLES } from '../middleware/auth'

type Bindings = {
  DB: D1Database
}

const staff = new Hono<{ Bindings: Bindings }>()

// 직원 목록 조회 - admin 권한 필요
staff.get('/', requireRole(ROLES.ADMIN), async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT id, email, name, role, created_at FROM staff ORDER BY created_at DESC`
    ).all()

    return c.json({ staff: results })
  } catch (error) {
    console.error('직원 목록 조회 오류:', error)
    return c.json({ error: '직원 목록 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 직원 상세 조회 - admin 권한 필요
staff.get('/:id', requireRole(ROLES.ADMIN), async (c) => {
  try {
    const id = c.req.param('id')

    const staffMember = await c.env.DB.prepare(
      'SELECT id, email, name, role, created_at FROM staff WHERE id = ?'
    ).bind(id).first()

    if (!staffMember) {
      return c.json({ error: '직원을 찾을 수 없습니다.' }, 404)
    }

    return c.json({ staff: staffMember })
  } catch (error) {
    console.error('직원 상세 조회 오류:', error)
    return c.json({ error: '직원 상세 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 직원 등록 - admin 권한 필요
staff.post('/', requireRole(ROLES.ADMIN), async (c) => {
  try {
    const { email, password, name, role } = await c.req.json()

    if (!email || !password || !name || !role) {
      return c.json({ error: '필수 항목을 입력해주세요.' }, 400)
    }

    // 중복 이메일 확인
    const existing = await c.env.DB.prepare(
      'SELECT id FROM staff WHERE email = ?'
    ).bind(email).first()

    if (existing) {
      return c.json({ error: '이미 등록된 이메일입니다.' }, 400)
    }

    const result = await c.env.DB.prepare(
      'INSERT INTO staff (email, password, name, role) VALUES (?, ?, ?, ?)'
    ).bind(email, password, name, role).run()

    return c.json({ 
      success: true, 
      staff_id: result.meta.last_row_id 
    })
  } catch (error) {
    console.error('직원 등록 오류:', error)
    return c.json({ error: '직원 등록 중 오류가 발생했습니다.' }, 500)
  }
})

// 직원 수정 (권한 변경 로그 포함) - admin 권한 필요
staff.patch('/:id', requireRole(ROLES.ADMIN), async (c) => {
  try {
    const id = c.req.param('id')
    const { name, role, password, reason } = await c.req.json()
    const currentUser = c.get('staff')

    // 기존 직원 정보 조회 (역할 변경 로그용)
    const oldStaff = await c.env.DB.prepare(
      'SELECT role FROM staff WHERE id = ?'
    ).bind(id).first()

    if (!oldStaff) {
      return c.json({ error: '직원을 찾을 수 없습니다.' }, 404)
    }

    const updates: string[] = []
    const params: any[] = []

    if (name) {
      updates.push('name = ?')
      params.push(name)
    }

    if (role) {
      updates.push('role = ?')
      params.push(role)
    }

    if (password) {
      updates.push('password = ?')
      params.push(password)
    }

    if (updates.length === 0) {
      return c.json({ error: '수정할 항목이 없습니다.' }, 400)
    }

    params.push(id)

    await c.env.DB.prepare(
      `UPDATE staff SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...params).run()

    // 역할이 변경된 경우 로그 기록
    if (role && role !== (oldStaff as any).role) {
      await c.env.DB.prepare(
        `INSERT INTO staff_role_changes (staff_id, old_role, new_role, changed_by, reason)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(
        id, 
        (oldStaff as any).role, 
        role, 
        currentUser.id,
        reason || '역할 변경'
      ).run()
    }

    return c.json({ success: true })
  } catch (error) {
    console.error('직원 수정 오류:', error)
    return c.json({ error: '직원 수정 중 오류가 발생했습니다.' }, 500)
  }
})

// 직원 삭제 - admin 권한 필요
staff.delete('/:id', requireRole(ROLES.ADMIN), async (c) => {
  try {
    const id = c.req.param('id')

    // 관리자는 최소 1명 유지
    const { results } = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM staff WHERE role = 'admin'"
    ).all()

    const adminCount = results && results.length > 0 ? (results[0] as any).count : 0

    if (adminCount <= 1) {
      const staffToDelete = await c.env.DB.prepare(
        'SELECT role FROM staff WHERE id = ?'
      ).bind(id).first()

      if (staffToDelete && (staffToDelete as any).role === 'admin') {
        return c.json({ error: '최소 1명의 관리자는 유지해야 합니다.' }, 400)
      }
    }

    await c.env.DB.prepare('DELETE FROM staff WHERE id = ?').bind(id).run()

    return c.json({ success: true })
  } catch (error) {
    console.error('직원 삭제 오류:', error)
    return c.json({ error: '직원 삭제 중 오류가 발생했습니다.' }, 500)
  }
})

// 직원 업무 통계 - admin 권한 필요
staff.get('/:id/stats', requireRole(ROLES.ADMIN), async (c) => {
  try {
    const id = c.req.param('id')
    const startDate = c.req.query('start_date')
    const endDate = c.req.query('end_date')

    let dateFilter = ''
    const params: any[] = [id]

    if (startDate && endDate) {
      dateFilter = ` AND DATE(created_at) BETWEEN ? AND ?`
      params.push(startDate, endDate)
    }

    // 배정된 티켓 수
    const assignedTickets = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM tickets WHERE assigned_to = ?${dateFilter}`
    ).bind(...params).first()

    // 완료한 티켓 수
    const completedTickets = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM tickets WHERE assigned_to = ? AND status = 'completed'${dateFilter}`
    ).bind(...params).first()

    // 출근 일수
    let attendanceParams: any[] = [id]
    let attendanceDateFilter = ''
    if (startDate && endDate) {
      attendanceDateFilter = ` AND DATE(checkin_time) BETWEEN ? AND ?`
      attendanceParams.push(startDate, endDate)
    }

    const attendanceDays = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM attendance WHERE staff_id = ?${attendanceDateFilter}`
    ).bind(...attendanceParams).first()

    // 우표 사용량
    const stampsUsed = await c.env.DB.prepare(
      `SELECT SUM(stamps_used) as total FROM attendance WHERE staff_id = ?${attendanceDateFilter}`
    ).bind(...attendanceParams).first()

    const assigned = (assignedTickets as any)?.count || 0
    const completed = (completedTickets as any)?.count || 0
    const completionRate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0

    return c.json({
      assigned_tickets: assigned,
      completed_tickets: completed,
      completion_rate: completionRate,
      attendance_days: (attendanceDays as any)?.count || 0,
      stamps_used: (stampsUsed as any)?.total || 0
    })
  } catch (error) {
    console.error('직원 통계 조회 오류:', error)
    return c.json({ error: '직원 통계 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 권한 변경 이력 조회 - admin 권한 필요
staff.get('/:id/role-changes', requireRole(ROLES.ADMIN), async (c) => {
  try {
    const id = c.req.param('id')

    const { results } = await c.env.DB.prepare(
      `SELECT rc.*, s.name as changed_by_name
       FROM staff_role_changes rc
       LEFT JOIN staff s ON rc.changed_by = s.id
       WHERE rc.staff_id = ?
       ORDER BY rc.created_at DESC
       LIMIT 50`
    ).bind(id).all()

    return c.json({ changes: results })
  } catch (error) {
    console.error('권한 변경 이력 조회 오류:', error)
    return c.json({ error: '권한 변경 이력 조회 중 오류가 발생했습니다.' }, 500)
  }
})

export default staff
