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

    if (item.status !== 'pending') {
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

export default ticketItems
