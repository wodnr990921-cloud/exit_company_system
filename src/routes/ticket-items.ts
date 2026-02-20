import { Hono } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'

type Bindings = {
  DB: D1Database
}

const ticketItems = new Hono<{ Bindings: Bindings }>()

// 티켓의 모든 아이템 조회
ticketItems.get('/:ticketId', async (c) => {
  try {
    const ticketId = c.req.param('ticketId')
    const { env } = c

    const items = await env.DB.prepare(`
      SELECT 
        ti.*,
        s.name as processor_name
      FROM ticket_items ti
      LEFT JOIN staff s ON ti.processed_by = s.id
      WHERE ti.ticket_id = ?
      ORDER BY ti.created_at DESC
    `).bind(ticketId).all()

    return c.json({ 
      success: true, 
      items: items.results.map(item => ({
        ...item,
        item_data: JSON.parse(item.item_data as string)
      }))
    })
  } catch (error) {
    console.error('티켓 아이템 조회 오류:', error)
    return c.json({ error: '티켓 아이템 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 티켓에 새 아이템 추가
ticketItems.post('/:ticketId', async (c) => {
  try {
    const ticketId = c.req.param('ticketId')
    const { item_type, item_data, notes } = await c.req.json()
    const { env } = c

    if (!item_type || !item_data) {
      return c.json({ error: 'item_type과 item_data는 필수입니다.' }, 400)
    }

    // 유효한 item_type 검증
    const validTypes = ['book_order', 'betting', 'point_request']
    if (!validTypes.includes(item_type)) {
      return c.json({ error: '유효하지 않은 아이템 타입입니다.' }, 400)
    }

    const result = await env.DB.prepare(`
      INSERT INTO ticket_items (ticket_id, item_type, item_data, notes)
      VALUES (?, ?, ?, ?)
    `).bind(
      ticketId,
      item_type,
      JSON.stringify(item_data),
      notes || null
    ).run()

    return c.json({ 
      success: true, 
      item_id: result.meta.last_row_id 
    })
  } catch (error) {
    console.error('티켓 아이템 추가 오류:', error)
    return c.json({ error: '티켓 아이템 추가 중 오류가 발생했습니다.' }, 500)
  }
})

// 티켓 아이템 삭제
ticketItems.delete('/:itemId', async (c) => {
  try {
    const itemId = c.req.param('itemId')
    const { env } = c

    // pending 상태만 삭제 가능
    const item = await env.DB.prepare(`
      SELECT status FROM ticket_items WHERE id = ?
    `).bind(itemId).first()

    if (!item) {
      return c.json({ error: '아이템을 찾을 수 없습니다.' }, 404)
    }

    if (item.status !== 'pending') {
      return c.json({ error: '처리 중이거나 완료된 아이템은 삭제할 수 없습니다.' }, 400)
    }

    await env.DB.prepare(`
      DELETE FROM ticket_items WHERE id = ?
    `).bind(itemId).run()

    return c.json({ success: true })
  } catch (error) {
    console.error('티켓 아이템 삭제 오류:', error)
    return c.json({ error: '티켓 아이템 삭제 중 오류가 발생했습니다.' }, 500)
  }
})

// 티켓 아이템 처리 (발주/배팅/포인트 처리)
ticketItems.post('/:itemId/process', async (c) => {
  try {
    const itemId = c.req.param('itemId')
    const { processed_by, notes } = await c.req.json()
    const { env } = c

    // 아이템 정보 조회
    const item = await env.DB.prepare(`
      SELECT * FROM ticket_items WHERE id = ?
    `).bind(itemId).first()

    if (!item) {
      return c.json({ error: '아이템을 찾을 수 없습니다.' }, 404)
    }

    if (item.status !== 'pending' && item.status !== 'approval_pending') {
      return c.json({ error: '이미 처리된 아이템입니다.' }, 400)
    }

    const itemData = JSON.parse(item.item_data as string)

    // 아이템 타입에 따라 실제 처리 수행
    let processingResult = null

    switch (item.item_type) {
      case 'betting':
        // 배팅 처리: betting_folders 테이블에 삽입
        const bettingResult = await env.DB.prepare(`
          INSERT INTO betting_folders (
            member_id, folder_type, total_odds, bet_amount, 
            potential_win, status, created_by
          ) VALUES (?, ?, ?, ?, ?, 'active', ?)
        `).bind(
          itemData.member_id,
          itemData.folder_type,
          itemData.total_odds,
          itemData.bet_amount,
          itemData.potential_win,
          processed_by
        ).run()

        const folderId = bettingResult.meta.last_row_id

        // 배팅 선택 항목들 삽입
        for (const selection of itemData.selections) {
          await env.DB.prepare(`
            INSERT INTO betting_selections (
              folder_id, match_id, selected_outcome, odds
            ) VALUES (?, ?, ?, ?)
          `).bind(
            folderId,
            selection.match_id,
            selection.selected_outcome,
            selection.odds
          ).run()
        }

        // 포인트 차감
        await env.DB.prepare(`
          UPDATE members 
          SET betting_points = betting_points - ?
          WHERE id = ?
        `).bind(itemData.bet_amount, itemData.member_id).run()

        processingResult = { folder_id: folderId }
        break

      case 'book_order':
        // 도서 발주 처리 (실제 구현 필요)
        // TODO: 도서 주문 테이블에 삽입
        processingResult = { order_id: null, message: '도서 발주 기능 구현 예정' }
        break

      case 'point_request':
        // 포인트 요청 처리
        const pointResult = await env.DB.prepare(`
          INSERT INTO point_transactions (
            member_id, point_type, transaction_type, amount, 
            description, created_by, status, balance_after
          )
          SELECT 
            ?, ?, ?, ?,
            ?, ?, 'completed',
            CASE 
              WHEN ? = 'regular' THEN (SELECT points FROM members WHERE id = ?) + ?
              WHEN ? = 'betting' THEN (SELECT betting_points FROM members WHERE id = ?) + ?
            END
        `).bind(
          itemData.member_id,
          itemData.point_type,
          itemData.transaction_type,
          itemData.amount,
          itemData.description,
          processed_by,
          itemData.point_type,
          itemData.member_id,
          itemData.transaction_type === 'add' ? itemData.amount : -itemData.amount,
          itemData.point_type,
          itemData.member_id,
          itemData.transaction_type === 'add' ? itemData.amount : -itemData.amount
        ).run()

        // 회원 포인트 업데이트
        const pointField = itemData.point_type === 'regular' ? 'points' : 'betting_points'
        const operator = itemData.transaction_type === 'add' ? '+' : '-'
        await env.DB.prepare(`
          UPDATE members 
          SET ${pointField} = ${pointField} ${operator} ?
          WHERE id = ?
        `).bind(Math.abs(itemData.amount), itemData.member_id).run()

        processingResult = { transaction_id: pointResult.meta.last_row_id }
        break

      default:
        return c.json({ error: '지원하지 않는 아이템 타입입니다.' }, 400)
    }

    // 아이템 상태 업데이트
    await env.DB.prepare(`
      UPDATE ticket_items 
      SET status = 'completed', 
          processed_by = ?,
          processed_at = CURRENT_TIMESTAMP,
          notes = ?
      WHERE id = ?
    `).bind(processed_by, notes || null, itemId).run()

    return c.json({ 
      success: true, 
      processing_result: processingResult 
    })
  } catch (error) {
    console.error('티켓 아이템 처리 오류:', error)
    return c.json({ error: '티켓 아이템 처리 중 오류가 발생했습니다.' }, 500)
  }
})

// 결재 요청 (pending → approval_pending)
ticketItems.post('/:itemId/request-approval', async (c) => {
  try {
    const itemId = c.req.param('itemId')
    const body = await c.req.json().catch(() => ({}))
    const requested_by = body.requested_by || 'admin@prison-books.kr'
    const { env } = c

    // 아이템 정보 조회
    const item = await env.DB.prepare(`
      SELECT ti.*, t.member_id, t.ticket_number
      FROM ticket_items ti
      JOIN tickets t ON ti.ticket_id = t.id
      WHERE ti.id = ?
    `).bind(itemId).first()

    if (!item) {
      return c.json({ error: '아이템을 찾을 수 없습니다.' }, 404)
    }

    if (item.status !== 'pending') {
      return c.json({ error: '대기 상태의 아이템만 결재 요청할 수 있습니다.' }, 400)
    }

    const itemData = JSON.parse(item.item_data as string)

    // 아이템 타입에 따라 결재 데이터 생성
    switch (item.item_type) {
      case 'point_request':
        // 회원의 현재 포인트 잔액 조회
        const memberPoint = await env.DB.prepare(
          `SELECT balance FROM member_points 
           WHERE member_id = ? AND point_type = ?`
        ).bind(item.member_id, itemData.point_type).first()

        const currentBalance = memberPoint?.balance || 0
        const newBalance = itemData.transaction_type === 'add' 
          ? currentBalance + itemData.amount 
          : currentBalance - itemData.amount

        // 포인트 승인 데이터 생성 (point_transactions에 pending 상태로 삽입)
        const pointResult = await env.DB.prepare(`
          INSERT INTO point_transactions (
            member_id, point_type, transaction_type, amount, 
            balance_after, description, created_by, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        `).bind(
          item.member_id,
          itemData.point_type,
          itemData.transaction_type,
          itemData.amount,
          newBalance,
          itemData.description || `티켓 ${item.ticket_number}에서 요청`,
          requested_by
        ).run()

        // 티켓 아이템에 point_transaction_id 저장
        await env.DB.prepare(`
          UPDATE ticket_items 
          SET processing_data = json_object('point_transaction_id', ?)
          WHERE id = ?
        `).bind(pointResult.meta.last_row_id, itemId).run()
        break

      case 'betting':
        // 배팅은 결재 시스템에 직접 연동하지 않고 ticket_item 상태만 변경
        // (배팅은 별도로 승인 프로세스 없이 처리)
        break

      case 'book_order':
        // 도서 발주도 마찬가지
        break
    }

    // 아이템 상태를 approval_pending으로 변경
    await env.DB.prepare(`
      UPDATE ticket_items 
      SET status = 'approval_pending',
          requested_by = ?,
          requested_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(requested_by, itemId).run()

    return c.json({ 
      success: true,
      message: '결재 요청이 완료되었습니다.'
    })
  } catch (error: any) {
    console.error('결재 요청 오류:', error)
    console.error('Error stack:', error?.stack)
    console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    return c.json({ 
      error: '결재 요청 중 오류가 발생했습니다.', 
      details: error instanceof Error ? error.message : String(error),
      stack: error?.stack
    }, 500)
  }
})

// 결재 승인
ticketItems.post('/:itemId/approve', async (c) => {
  try {
    const itemId = c.req.param('itemId')
    const { approved_by, notes } = await c.req.json()
    const { env } = c

    // 아이템 정보 조회
    const item = await env.DB.prepare(`
      SELECT ti.*, t.member_id
      FROM ticket_items ti
      JOIN tickets t ON ti.ticket_id = t.id
      WHERE ti.id = ?
    `).bind(itemId).first()

    if (!item) {
      return c.json({ error: '아이템을 찾을 수 없습니다.' }, 404)
    }

    if (item.status !== 'approval_pending') {
      return c.json({ error: '결재 대기 상태의 아이템만 승인할 수 있습니다.' }, 400)
    }

    const itemData = JSON.parse(item.item_data as string)
    const processingData = item.processing_data ? JSON.parse(item.processing_data as string) : {}

    // 실제 처리 수행
    switch (item.item_type) {
      case 'point_request':
        // 포인트 트랜잭션 승인
        if (processingData.point_transaction_id) {
          await env.DB.prepare(`
            UPDATE point_transactions 
            SET status = 'approved',
                approved_by = ?,
                approved_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(approved_by, processingData.point_transaction_id).run()

          // 회원 포인트 업데이트
          const pointField = itemData.point_type === 'regular' ? 'points' : 'betting_points'
          const operator = itemData.transaction_type === 'add' ? '+' : '-'
          await env.DB.prepare(`
            UPDATE members 
            SET ${pointField} = ${pointField} ${operator} ?
            WHERE id = ?
          `).bind(Math.abs(itemData.amount), item.member_id).run()
        }
        break

      case 'betting':
        // 배팅 폴더 생성
        const bettingResult = await env.DB.prepare(`
          INSERT INTO betting_folders (
            member_id, folder_type, total_odds, bet_amount, 
            potential_win, status, created_by
          ) VALUES (?, ?, ?, ?, ?, 'active', ?)
        `).bind(
          item.member_id,
          itemData.folder_type,
          itemData.total_odds,
          itemData.bet_amount,
          itemData.potential_win,
          approved_by
        ).run()

        const folderId = bettingResult.meta.last_row_id

        // 배팅 선택 항목들 삽입
        for (const selection of itemData.selections) {
          await env.DB.prepare(`
            INSERT INTO betting_selections (
              folder_id, match_id, selected_outcome, odds
            ) VALUES (?, ?, ?, ?)
          `).bind(
            folderId,
            selection.match_id,
            selection.selected_outcome,
            selection.odds
          ).run()
        }

        // 포인트 차감
        await env.DB.prepare(`
          UPDATE members 
          SET betting_points = betting_points - ?
          WHERE id = ?
        `).bind(itemData.bet_amount, item.member_id).run()
        break

      case 'book_order':
        // 도서 발주 처리
        // TODO: 실제 도서 주문 로직 구현
        break
    }

    // 아이템 상태 업데이트
    await env.DB.prepare(`
      UPDATE ticket_items 
      SET status = 'completed',
          approved_by = ?,
          approved_at = CURRENT_TIMESTAMP,
          processed_by = ?,
          processed_at = CURRENT_TIMESTAMP,
          notes = ?
      WHERE id = ?
    `).bind(approved_by, approved_by, notes || null, itemId).run()

    return c.json({ 
      success: true,
      message: '승인이 완료되었습니다.'
    })
  } catch (error) {
    console.error('승인 처리 오류:', error)
    return c.json({ error: '승인 처리 중 오류가 발생했습니다.' }, 500)
  }
})

// 결재 거부
ticketItems.post('/:itemId/reject', async (c) => {
  try {
    const itemId = c.req.param('itemId')
    const { rejected_by, reason } = await c.req.json()
    const { env } = c

    // 아이템 정보 조회
    const item = await env.DB.prepare(`
      SELECT * FROM ticket_items WHERE id = ?
    `).bind(itemId).first()

    if (!item) {
      return c.json({ error: '아이템을 찾을 수 없습니다.' }, 404)
    }

    if (item.status !== 'approval_pending') {
      return c.json({ error: '결재 대기 상태의 아이템만 거부할 수 있습니다.' }, 400)
    }

    const processingData = item.processing_data ? JSON.parse(item.processing_data as string) : {}

    // 관련 데이터 거부 처리
    if (item.item_type === 'point_request' && processingData.point_transaction_id) {
      await env.DB.prepare(`
        UPDATE point_transactions 
        SET status = 'rejected',
            rejected_by = ?,
            rejected_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(rejected_by, processingData.point_transaction_id).run()
    }

    // 아이템 상태 업데이트
    await env.DB.prepare(`
      UPDATE ticket_items 
      SET status = 'rejected',
          rejected_by = ?,
          rejected_at = CURRENT_TIMESTAMP,
          notes = ?
      WHERE id = ?
    `).bind(rejected_by, reason || null, itemId).run()

    return c.json({ 
      success: true,
      message: '거부가 완료되었습니다.'
    })
  } catch (error) {
    console.error('거부 처리 오류:', error)
    return c.json({ error: '거부 처리 중 오류가 발생했습니다.' }, 500)
  }
})

export default ticketItems
