import { Hono } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'

type Bindings = {
  DB: D1Database
}

const pointConversions = new Hono<{ Bindings: Bindings }>()

// 포인트 전환 내역 조회
pointConversions.get('/', async (c) => {
  try {
    const { env } = c
    const { member_id, start_date, end_date, status } = c.req.query()

    let query = `
      SELECT 
        pc.*,
        m.name as member_name,
        m.member_number,
        s.name as creator_name,
        cs.name as canceller_name
      FROM point_conversions pc
      JOIN members m ON pc.member_id = m.id
      LEFT JOIN staff s ON pc.created_by = s.id
      LEFT JOIN staff cs ON pc.cancelled_by = cs.id
      WHERE 1=1
    `
    const params: any[] = []

    if (member_id) {
      query += ` AND pc.member_id = ?`
      params.push(member_id)
    }

    if (start_date) {
      query += ` AND DATE(pc.created_at) >= ?`
      params.push(start_date)
    }

    if (end_date) {
      query += ` AND DATE(pc.created_at) <= ?`
      params.push(end_date)
    }

    if (status) {
      query += ` AND pc.status = ?`
      params.push(status)
    }

    query += ` ORDER BY pc.created_at DESC`

    const result = await env.DB.prepare(query).bind(...params).all()

    return c.json({
      success: true,
      conversions: result.results
    })
  } catch (error) {
    console.error('포인트 전환 내역 조회 오류:', error)
    return c.json({ error: '포인트 전환 내역 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 포인트 전환 통계
pointConversions.get('/stats', async (c) => {
  try {
    const { env } = c
    const { start_date, end_date } = c.req.query()

    let dateFilter = ''
    const params: any[] = []

    if (start_date) {
      dateFilter += ` AND DATE(created_at) >= ?`
      params.push(start_date)
    }

    if (end_date) {
      dateFilter += ` AND DATE(created_at) <= ?`
      params.push(end_date)
    }

    // 전체 통계
    const totalStats = await env.DB.prepare(`
      SELECT 
        COUNT(*) as total_count,
        SUM(amount) as total_amount,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
        SUM(CASE WHEN status = 'active' THEN amount ELSE 0 END) as active_amount,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
        SUM(CASE WHEN status = 'cancelled' THEN amount ELSE 0 END) as cancelled_amount
      FROM point_conversions
      WHERE 1=1 ${dateFilter}
    `).bind(...params).first()

    // 방향별 통계
    const directionStats = await env.DB.prepare(`
      SELECT 
        from_type,
        to_type,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM point_conversions
      WHERE status = 'active' ${dateFilter}
      GROUP BY from_type, to_type
    `).bind(...params).all()

    // 일별 통계 (최근 7일)
    const dailyStats = await env.DB.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(amount) as amount
      FROM point_conversions
      WHERE status = 'active'
        AND DATE(created_at) >= DATE('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).all()

    // 회원별 상위 10명
    const topMembers = await env.DB.prepare(`
      SELECT 
        m.id,
        m.name,
        m.member_number,
        COUNT(pc.id) as conversion_count,
        SUM(pc.amount) as total_amount
      FROM point_conversions pc
      JOIN members m ON pc.member_id = m.id
      WHERE pc.status = 'active' ${dateFilter}
      GROUP BY m.id, m.name, m.member_number
      ORDER BY total_amount DESC
      LIMIT 10
    `).bind(...params).all()

    return c.json({
      success: true,
      stats: {
        total: totalStats,
        by_direction: directionStats.results,
        daily: dailyStats.results,
        top_members: topMembers.results
      }
    })
  } catch (error) {
    console.error('포인트 전환 통계 조회 오류:', error)
    return c.json({ error: '포인트 전환 통계 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 포인트 전환 생성
pointConversions.post('/', async (c) => {
  try {
    const { env } = c
    const { 
      member_id, 
      from_type, 
      to_type, 
      amount, 
      ticket_id,
      created_by 
    } = await c.req.json()

    if (!member_id || !from_type || !to_type || !amount || !ticket_id || !created_by) {
      return c.json({ error: '필수 정보가 누락되었습니다.' }, 400)
    }

    if (from_type === to_type) {
      return c.json({ error: '동일한 포인트 타입으로는 전환할 수 없습니다.' }, 400)
    }

    // 회원 잔액 확인
    const member = await env.DB.prepare(`
      SELECT points, betting_points FROM members WHERE id = ?
    `).bind(member_id).first()

    if (!member) {
      return c.json({ error: '회원을 찾을 수 없습니다.' }, 404)
    }

    const currentBalance = from_type === 'regular' ? member.points : member.betting_points
    if (currentBalance < amount) {
      return c.json({ error: '잔액이 부족합니다.' }, 400)
    }

    // 1. 차감 ticket_item 생성
    const deductResult = await env.DB.prepare(`
      INSERT INTO ticket_items (
        ticket_id, item_type, item_data, status, notes
      ) VALUES (?, 'point_request', ?, 'completed', '포인트 전환 (차감)')
    `).bind(
      ticket_id,
      JSON.stringify({
        member_id,
        point_type: from_type,
        transaction_type: 'deduct',
        amount,
        description: '포인트 전환 (차감)'
      })
    ).run()

    const deductItemId = deductResult.meta.last_row_id

    // 2. 지급 ticket_item 생성
    const addResult = await env.DB.prepare(`
      INSERT INTO ticket_items (
        ticket_id, item_type, item_data, status, notes
      ) VALUES (?, 'point_request', ?, 'completed', '포인트 전환 (지급)')
    `).bind(
      ticket_id,
      JSON.stringify({
        member_id,
        point_type: to_type,
        transaction_type: 'add',
        amount,
        description: '포인트 전환 (지급)'
      })
    ).run()

    const addItemId = addResult.meta.last_row_id

    // 3. 포인트 전환 내역 기록
    const conversionResult = await env.DB.prepare(`
      INSERT INTO point_conversions (
        member_id, from_type, to_type, amount, 
        deduct_item_id, add_item_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      member_id, from_type, to_type, amount,
      deductItemId, addItemId, created_by
    ).run()

    // 4. 실제 포인트 차감
    const deductField = from_type === 'regular' ? 'points' : 'betting_points'
    await env.DB.prepare(`
      UPDATE members 
      SET ${deductField} = ${deductField} - ?
      WHERE id = ?
    `).bind(amount, member_id).run()

    // 5. 실제 포인트 지급
    const addField = to_type === 'regular' ? 'points' : 'betting_points'
    await env.DB.prepare(`
      UPDATE members 
      SET ${addField} = ${addField} + ?
      WHERE id = ?
    `).bind(amount, member_id).run()

    return c.json({
      success: true,
      conversion_id: conversionResult.meta.last_row_id,
      deduct_item_id: deductItemId,
      add_item_id: addItemId
    })
  } catch (error) {
    console.error('포인트 전환 생성 오류:', error)
    return c.json({ error: '포인트 전환 중 오류가 발생했습니다.' }, 500)
  }
})

// 포인트 전환 취소 (10분 이내만 가능)
pointConversions.post('/:id/cancel', async (c) => {
  try {
    const { env } = c
    const conversionId = c.req.param('id')
    const { cancelled_by, cancel_reason } = await c.req.json()

    // 전환 내역 조회
    const conversion = await env.DB.prepare(`
      SELECT * FROM point_conversions WHERE id = ?
    `).bind(conversionId).first()

    if (!conversion) {
      return c.json({ error: '전환 내역을 찾을 수 없습니다.' }, 404)
    }

    if (conversion.status === 'cancelled') {
      return c.json({ error: '이미 취소된 전환입니다.' }, 400)
    }

    // 시간 제한 확인 (10분)
    const createdAt = new Date(conversion.created_at as string)
    const now = new Date()
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60)

    if (diffMinutes > 10) {
      return c.json({ 
        error: '전환 후 10분이 경과하여 취소할 수 없습니다.',
        elapsed_minutes: Math.floor(diffMinutes)
      }, 400)
    }

    // 전환 취소 처리
    await env.DB.prepare(`
      UPDATE point_conversions
      SET status = 'cancelled',
          cancelled_by = ?,
          cancelled_at = CURRENT_TIMESTAMP,
          cancel_reason = ?
      WHERE id = ?
    `).bind(cancelled_by, cancel_reason || '사용자 요청', conversionId).run()

    // 포인트 되돌리기 - 원래대로 복구
    const fromField = conversion.from_type === 'regular' ? 'points' : 'betting_points'
    const toField = conversion.to_type === 'regular' ? 'points' : 'betting_points'

    // 차감했던 포인트 복구
    await env.DB.prepare(`
      UPDATE members 
      SET ${fromField} = ${fromField} + ?
      WHERE id = ?
    `).bind(conversion.amount, conversion.member_id).run()

    // 지급했던 포인트 회수
    await env.DB.prepare(`
      UPDATE members 
      SET ${toField} = ${toField} - ?
      WHERE id = ?
    `).bind(conversion.amount, conversion.member_id).run()

    // ticket_items 상태 업데이트
    if (conversion.deduct_item_id) {
      await env.DB.prepare(`
        UPDATE ticket_items
        SET status = 'cancelled',
            notes = COALESCE(notes, '') || ' [전환 취소됨]'
        WHERE id = ?
      `).bind(conversion.deduct_item_id).run()
    }

    if (conversion.add_item_id) {
      await env.DB.prepare(`
        UPDATE ticket_items
        SET status = 'cancelled',
            notes = COALESCE(notes, '') || ' [전환 취소됨]'
        WHERE id = ?
      `).bind(conversion.add_item_id).run()
    }

    return c.json({
      success: true,
      message: '포인트 전환이 취소되었습니다.'
    })
  } catch (error) {
    console.error('포인트 전환 취소 오류:', error)
    return c.json({ error: '포인트 전환 취소 중 오류가 발생했습니다.' }, 500)
  }
})

export default pointConversions
