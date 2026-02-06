import { Hono } from 'hono'
import { requireRole, ROLES } from '../middleware/auth'

type Bindings = {
  DB: D1Database
}

const members = new Hono<{ Bindings: Bindings }>()

// 회원 목록 조회 (모든 직원 접근 가능 - viewer 포함)
members.get('/', requireRole(ROLES.VIEWER), async (c) => {
  try {
    const search = c.req.query('search') || ''
    const status = c.req.query('status') || 'all'

    let query = `
      SELECT id, member_number, name, institution, inmate_number, po_box_address, depositor_name,
             points, betting_points, frozen_points, status, notes, created_at
      FROM members
      WHERE 1=1
    `
    const params: any[] = []

    if (search) {
      query += ` AND (name LIKE ? OR member_number LIKE ? OR inmate_number LIKE ? OR institution LIKE ?)`
      const searchPattern = `%${search}%`
      params.push(searchPattern, searchPattern, searchPattern, searchPattern)
    }

    if (status && status !== 'all') {
      query += ` AND status = ?`
      params.push(status)
    }

    query += ` ORDER BY created_at DESC`

    const { results } = await c.env.DB.prepare(query).bind(...params).all()

    return c.json({ members: results })
  } catch (error) {
    console.error('회원 목록 조회 오류:', error)
    return c.json({ error: '회원 목록 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 회원 상세 조회 (모든 직원 접근 가능 - viewer 포함)
members.get('/:id', requireRole(ROLES.VIEWER), async (c) => {
  try {
    const id = c.req.param('id')

    const member = await c.env.DB.prepare(
      `SELECT * FROM members WHERE id = ?`
    ).bind(id).first()

    if (!member) {
      return c.json({ error: '회원을 찾을 수 없습니다.' }, 404)
    }

    // 회원의 티켓 목록
    const { results: tickets } = await c.env.DB.prepare(
      `SELECT id, ticket_number, title, ticket_type, status, priority, created_at
       FROM tickets 
       WHERE member_id = ? 
       ORDER BY created_at DESC 
       LIMIT 20`
    ).bind(id).all()

    // 회원의 포인트 거래 내역
    const { results: transactions } = await c.env.DB.prepare(
      `SELECT * FROM point_transactions 
       WHERE member_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`
    ).bind(id).all()

    return c.json({ 
      member, 
      tickets: tickets || [],
      transactions: transactions || []
    })
  } catch (error) {
    console.error('회원 상세 조회 오류:', error)
    return c.json({ error: '회원 상세 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 회원 등록 (staff 이상 권한 필요)
members.post('/', requireRole(ROLES.STAFF), async (c) => {
  try {
    const { 
      name, institution, inmate_number, po_box_address, 
      depositor_name, points, betting_points, notes 
    } = await c.req.json()

    if (!name || !institution || !inmate_number) {
      return c.json({ error: '필수 항목을 입력해주세요.' }, 400)
    }

    // 중복 체크 (이름 + 수감번호)
    const existing = await c.env.DB.prepare(
      'SELECT id FROM members WHERE name = ? AND inmate_number = ?'
    ).bind(name, inmate_number).first()

    if (existing) {
      return c.json({ error: '이미 등록된 회원입니다.' }, 400)
    }

    // 고유번호 생성 (M + 5자리 숫자)
    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM members'
    ).first()
    const memberCount = (countResult as any)?.count || 0
    const memberNumber = `M${String(memberCount + 1).padStart(5, '0')}`

    const result = await c.env.DB.prepare(
      `INSERT INTO members (member_number, name, institution, inmate_number, po_box_address, depositor_name, points, betting_points, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      memberNumber, name, institution, inmate_number, po_box_address || '', 
      depositor_name || '', points || 0, betting_points || 0, notes || ''
    ).run()

    return c.json({ 
      success: true, 
      member_id: result.meta.last_row_id,
      member_number: memberNumber
    })
  } catch (error) {
    console.error('회원 등록 오류:', error)
    return c.json({ error: '회원 등록 중 오류가 발생했습니다.' }, 500)
  }
})

// 회원 수정 (staff 이상 권한 필요)
members.patch('/:id', requireRole(ROLES.STAFF), async (c) => {
  try {
    const id = c.req.param('id')
    const updates = await c.req.json()

    const allowedFields = ['name', 'institution', 'inmate_number', 'po_box_address', 'depositor_name', 'notes', 'status']
    const setClause: string[] = []
    const params: any[] = []

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = ?`)
        params.push(value)
      }
    }

    if (setClause.length === 0) {
      return c.json({ error: '수정할 항목이 없습니다.' }, 400)
    }

    params.push(id)

    await c.env.DB.prepare(
      `UPDATE members SET ${setClause.join(', ')} WHERE id = ?`
    ).bind(...params).run()

    return c.json({ success: true })
  } catch (error) {
    console.error('회원 수정 오류:', error)
    return c.json({ error: '회원 수정 중 오류가 발생했습니다.' }, 500)
  }
})

// 회원 삭제 (admin 권한 필요)
members.delete('/:id', requireRole(ROLES.ADMIN), async (c) => {
  try {
    const id = c.req.param('id')

    // 관련 티켓이 있는지 확인
    const tickets = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM tickets WHERE member_id = ?'
    ).bind(id).first()

    if (tickets && (tickets as any).count > 0) {
      return c.json({ error: '관련 티켓이 있어 삭제할 수 없습니다.' }, 400)
    }

    await c.env.DB.prepare('DELETE FROM members WHERE id = ?').bind(id).run()

    return c.json({ success: true })
  } catch (error) {
    console.error('회원 삭제 오류:', error)
    return c.json({ error: '회원 삭제 중 오류가 발생했습니다.' }, 500)
  }
})

export default members
