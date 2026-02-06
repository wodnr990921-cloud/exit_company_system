import { Hono } from 'hono'
import { requireRole, ROLES } from '../middleware/auth'

type Bindings = {
  DB: D1Database
}

const points = new Hono<{ Bindings: Bindings }>()

// 포인트 조정 요청 (동결 요청) - staff 이상 권한 필요
points.post('/freeze', requireRole(ROLES.STAFF), async (c) => {
  try {
    const { 
      member_id, ticket_id, point_type, amount, description, created_by 
    } = await c.req.json()

    if (!member_id || !point_type || !amount || !created_by) {
      return c.json({ error: '필수 항목을 입력해주세요.' }, 400)
    }

    // 회원 정보 조회
    const member = await c.env.DB.prepare(
      'SELECT points, betting_points, frozen_points FROM members WHERE id = ?'
    ).bind(member_id).first()

    if (!member) {
      return c.json({ error: '회원을 찾을 수 없습니다.' }, 404)
    }

    // 동결 가능 여부 확인
    const currentPoints = point_type === 'regular' 
      ? (member as any).points 
      : (member as any).betting_points

    if (currentPoints < amount) {
      return c.json({ error: '포인트가 부족합니다.' }, 400)
    }

    // 동결 처리
    await c.env.DB.prepare(
      'UPDATE members SET frozen_points = frozen_points + ? WHERE id = ?'
    ).bind(amount, member_id).run()

    // 거래 내역 기록 (승인 대기)
    const result = await c.env.DB.prepare(
      `INSERT INTO point_transactions (
        member_id, ticket_id, point_type, transaction_type, 
        amount, balance_after, description, status, created_by
      ) VALUES (?, ?, ?, 'freeze', ?, ?, ?, 'pending', ?)`
    ).bind(
      member_id, ticket_id || null, point_type,
      amount, currentPoints, description || '포인트 동결 요청', created_by
    ).run()

    return c.json({ 
      success: true, 
      transaction_id: result.meta.last_row_id 
    })
  } catch (error) {
    console.error('포인트 동결 요청 오류:', error)
    return c.json({ error: '포인트 동결 요청 중 오류가 발생했습니다.' }, 500)
  }
})

// 동결 승인 대기 목록
// 승인 대기 목록 조회 - admin 권한 필요
points.get('/pending', requireRole(ROLES.ADMIN), async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT pt.*, m.name as member_name, t.ticket_number, s.name as created_by_name
       FROM point_transactions pt
       LEFT JOIN members m ON pt.member_id = m.id
       LEFT JOIN tickets t ON pt.ticket_id = t.id
       LEFT JOIN staff s ON pt.created_by = s.id
       WHERE pt.status = 'pending' AND pt.transaction_type = 'freeze'
       ORDER BY pt.created_at ASC`
    ).all()

    return c.json({ transactions: results })
  } catch (error) {
    console.error('승인 대기 목록 조회 오류:', error)
    return c.json({ error: '승인 대기 목록 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 포인트 동결 승인 - admin 권한 필요
points.post('/approve/:id', requireRole(ROLES.ADMIN), async (c) => {
  try {
    const transaction_id = c.req.param('id')
    const { approved_by, action } = await c.req.json()

    if (!approved_by || !action) {
      return c.json({ error: '필수 항목을 입력해주세요.' }, 400)
    }

    // 거래 정보 조회
    const transaction = await c.env.DB.prepare(
      'SELECT * FROM point_transactions WHERE id = ?'
    ).bind(transaction_id).first()

    if (!transaction) {
      return c.json({ error: '거래 정보를 찾을 수 없습니다.' }, 404)
    }

    if ((transaction as any).status !== 'pending') {
      return c.json({ error: '이미 처리된 요청입니다.' }, 400)
    }

    const amount = (transaction as any).amount
    const member_id = (transaction as any).member_id
    const point_type = (transaction as any).point_type

    if (action === 'approve') {
      // 승인: 실제 포인트 차감 및 동결 포인트 감소
      const pointField = point_type === 'regular' ? 'points' : 'betting_points'

      await c.env.DB.prepare(
        `UPDATE members 
         SET ${pointField} = ${pointField} - ?, frozen_points = frozen_points - ?
         WHERE id = ?`
      ).bind(amount, amount, member_id).run()

      // 거래 상태 업데이트
      await c.env.DB.prepare(
        `UPDATE point_transactions 
         SET status = 'completed', approved_by = ?, approved_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).bind(approved_by, transaction_id).run()

      // 새 잔액 조회
      const member = await c.env.DB.prepare(
        `SELECT ${pointField} as balance FROM members WHERE id = ?`
      ).bind(member_id).first()

      return c.json({ 
        success: true, 
        new_balance: (member as any).balance 
      })
    } else if (action === 'reject') {
      // 거부: 동결 포인트만 감소
      await c.env.DB.prepare(
        'UPDATE members SET frozen_points = frozen_points - ? WHERE id = ?'
      ).bind(amount, member_id).run()

      // 거래 상태 업데이트
      await c.env.DB.prepare(
        `UPDATE point_transactions 
         SET status = 'rejected', approved_by = ?, approved_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).bind(approved_by, transaction_id).run()

      return c.json({ success: true })
    } else {
      return c.json({ error: '올바른 액션을 선택해주세요.' }, 400)
    }
  } catch (error) {
    console.error('포인트 승인 처리 오류:', error)
    return c.json({ error: '포인트 승인 처리 중 오류가 발생했습니다.' }, 500)
  }
})

// 포인트 직접 조정 (관리자 전용)
// 포인트 직접 조정 - staff 이상 권한 필요
points.post('/adjust', requireRole(ROLES.STAFF), async (c) => {
  try {
    const { 
      member_id, point_type, transaction_type, amount, description, created_by 
    } = await c.req.json()

    if (!member_id || !point_type || !transaction_type || !amount || !created_by) {
      return c.json({ error: '필수 항목을 입력해주세요.' }, 400)
    }

    const pointField = point_type === 'regular' ? 'points' : 'betting_points'

    // 회원 정보 조회
    const member = await c.env.DB.prepare(
      `SELECT ${pointField} as balance FROM members WHERE id = ?`
    ).bind(member_id).first()

    if (!member) {
      return c.json({ error: '회원을 찾을 수 없습니다.' }, 404)
    }

    let finalAmount = amount
    if (transaction_type === 'use' || transaction_type === 'adjust') {
      finalAmount = -Math.abs(amount)
    } else {
      finalAmount = Math.abs(amount)
    }

    // 포인트 업데이트
    await c.env.DB.prepare(
      `UPDATE members SET ${pointField} = ${pointField} + ? WHERE id = ?`
    ).bind(finalAmount, member_id).run()

    // 새 잔액 조회
    const updatedMember = await c.env.DB.prepare(
      `SELECT ${pointField} as balance FROM members WHERE id = ?`
    ).bind(member_id).first()

    // 거래 내역 기록
    await c.env.DB.prepare(
      `INSERT INTO point_transactions (
        member_id, point_type, transaction_type, 
        amount, balance_after, description, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, 'completed', ?)`
    ).bind(
      member_id, point_type, transaction_type,
      finalAmount, (updatedMember as any).balance, description || '관리자 직접 조정', created_by
    ).run()

    return c.json({ 
      success: true, 
      new_balance: (updatedMember as any).balance 
    })
  } catch (error) {
    console.error('포인트 직접 조정 오류:', error)
    return c.json({ error: '포인트 직접 조정 중 오류가 발생했습니다.' }, 500)
  }
})

export default points
