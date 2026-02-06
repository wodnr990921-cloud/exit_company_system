import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
}

const closing = new Hono<{ Bindings: Bindings }>()

/**
 * 일일 마감 데이터 조회 API
 * GET /closing?date=YYYY-MM-DD
 */
closing.get('/', async (c) => {
  try {
    const { DB } = c.env
    const date = c.req.query('date') || new Date().toISOString().split('T')[0]
    
    // 날짜 범위 설정 (해당 날짜 00:00:00 ~ 23:59:59)
    const startDate = `${date} 00:00:00`
    const endDate = `${date} 23:59:59`

    // 1. 티켓 통계
    const ticketStatsQuery = await DB.prepare(`
      SELECT 
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN status IN ('completed', 'closed') THEN 1 END) as completed_tickets,
        COUNT(CASE WHEN status NOT IN ('completed', 'closed') THEN 1 END) as pending_tickets
      FROM tickets
      WHERE created_at BETWEEN ? AND ?
    `).bind(startDate, endDate).first()

    // 2. 포인트 통계
    const pointStatsQuery = await DB.prepare(`
      SELECT 
        SUM(CASE WHEN transaction_type = 'earn' THEN amount ELSE 0 END) as earned_points,
        SUM(CASE WHEN transaction_type = 'use' THEN amount ELSE 0 END) as used_points
      FROM point_transactions
      WHERE created_at BETWEEN ? AND ?
    `).bind(startDate, endDate).first()

    // 3. 배팅 통계
    const bettingStatsQuery = await DB.prepare(`
      SELECT 
        COUNT(*) as total_bets,
        SUM(bet_amount) as total_bet_amount,
        SUM(CASE WHEN status = 'won' THEN win_amount ELSE 0 END) as total_win_amount
      FROM bet_folders
      WHERE created_at BETWEEN ? AND ?
    `).bind(startDate, endDate).first()

    // 4. 도서 판매 통계 (티켓 기반)
    const bookStatsQuery = await DB.prepare(`
      SELECT 
        COUNT(DISTINCT t.id) as book_orders,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as shipped_orders,
        COUNT(CASE WHEN t.status NOT IN ('completed', 'closed') THEN 1 END) as pending_orders
      FROM tickets t
      WHERE t.ticket_type = 'ORDER' 
        AND t.created_at BETWEEN ? AND ?
    `).bind(startDate, endDate).first()

    // 도서 판매 금액 (포인트 사용 기반)
    const bookSalesQuery = await DB.prepare(`
      SELECT 
        SUM(pt.amount) as total_sales
      FROM point_transactions pt
      INNER JOIN tickets t ON pt.ticket_id = t.id
      WHERE pt.transaction_type = 'use'
        AND t.ticket_type = 'ORDER'
        AND pt.created_at BETWEEN ? AND ?
    `).bind(startDate, endDate).first()

    // 계산
    const earnedPoints = Number(pointStatsQuery?.earned_points || 0)
    const usedPoints = Number(pointStatsQuery?.used_points || 0)
    const netPoints = earnedPoints - usedPoints

    const totalBetAmount = Number(bettingStatsQuery?.total_bet_amount || 0)
    const totalWinAmount = Number(bettingStatsQuery?.total_win_amount || 0)
    const betMargin = totalBetAmount - totalWinAmount

    const bookSales = Number(bookSalesQuery?.total_sales || 0)

    // 총 매출: 포인트 순입금 + 도서 판매액
    const totalRevenue = netPoints + bookSales

    // 총 마진: 포인트 순입금 + 배팅 마진
    const totalMargin = netPoints + betMargin

    // 5. 기존 마감 기록 확인
    const existingClosing = await DB.prepare(`
      SELECT * FROM daily_closings
      WHERE closing_date = ?
    `).bind(date).first()

    return c.json({
      date,
      ticket_stats: {
        total_tickets: ticketStatsQuery?.total_tickets || 0,
        completed_tickets: ticketStatsQuery?.completed_tickets || 0,
        pending_tickets: ticketStatsQuery?.pending_tickets || 0
      },
      point_stats: {
        earned_points: earnedPoints,
        used_points: usedPoints,
        net_points: netPoints
      },
      betting_stats: {
        total_bets: bettingStatsQuery?.total_bets || 0,
        total_bet_amount: totalBetAmount,
        total_win_amount: totalWinAmount,
        bet_margin: betMargin
      },
      book_stats: {
        book_orders: bookStatsQuery?.book_orders || 0,
        shipped_orders: bookStatsQuery?.shipped_orders || 0,
        pending_orders: bookStatsQuery?.pending_orders || 0,
        total_sales: bookSales
      },
      summary: {
        total_revenue: totalRevenue,
        total_margin: totalMargin
      },
      is_closed: !!existingClosing,
      closed_at: existingClosing?.closed_at || null,
      closed_by: existingClosing?.closed_by_name || null
    })
  } catch (error: any) {
    console.error('일일 마감 데이터 조회 오류:', error)
    return c.json({ error: '일일 마감 데이터 조회 중 오류가 발생했습니다.' }, 500)
  }
})

/**
 * 일일 마감 실행 API
 * POST /closing
 */
closing.post('/', async (c) => {
  try {
    const { DB } = c.env
    const { date, closed_by } = await c.req.json()

    if (!date || !closed_by) {
      return c.json({ error: '필수 항목을 입력해주세요.' }, 400)
    }

    // 이미 마감된 날짜인지 확인
    const existingClosing = await DB.prepare(`
      SELECT * FROM daily_closings WHERE closing_date = ?
    `).bind(date).first()

    if (existingClosing) {
      return c.json({ error: '이미 마감된 날짜입니다.' }, 400)
    }

    // 마감 데이터 재계산 (중복 코드이지만 정확성을 위해)
    const startDate = `${date} 00:00:00`
    const endDate = `${date} 23:59:59`

    const ticketStats = await DB.prepare(`
      SELECT 
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN status IN ('completed', 'closed') THEN 1 END) as completed_tickets
      FROM tickets
      WHERE created_at BETWEEN ? AND ?
    `).bind(startDate, endDate).first()

    const pointStats = await DB.prepare(`
      SELECT 
        SUM(CASE WHEN transaction_type = 'earn' THEN amount ELSE 0 END) as earned_points,
        SUM(CASE WHEN transaction_type = 'use' THEN amount ELSE 0 END) as used_points
      FROM point_transactions
      WHERE created_at BETWEEN ? AND ?
    `).bind(startDate, endDate).first()

    const bettingStats = await DB.prepare(`
      SELECT 
        SUM(bet_amount) as total_bet_amount,
        SUM(CASE WHEN status = 'won' THEN win_amount ELSE 0 END) as total_win_amount
      FROM bet_folders
      WHERE created_at BETWEEN ? AND ?
    `).bind(startDate, endDate).first()

    const bookSales = await DB.prepare(`
      SELECT SUM(pt.amount) as total_sales
      FROM point_transactions pt
      INNER JOIN tickets t ON pt.ticket_id = t.id
      WHERE pt.transaction_type = 'use'
        AND t.ticket_type = 'ORDER'
        AND pt.created_at BETWEEN ? AND ?
    `).bind(startDate, endDate).first()

    const earnedPoints = Number(pointStats?.earned_points || 0)
    const usedPoints = Number(pointStats?.used_points || 0)
    const netPoints = earnedPoints - usedPoints
    const totalBetAmount = Number(bettingStats?.total_bet_amount || 0)
    const totalWinAmount = Number(bettingStats?.total_win_amount || 0)
    const betMargin = totalBetAmount - totalWinAmount
    const bookSalesAmount = Number(bookSales?.total_sales || 0)
    const totalRevenue = netPoints + bookSalesAmount
    const totalMargin = netPoints + betMargin

    // 마감 기록 저장
    const result = await DB.prepare(`
      INSERT INTO daily_closings (
        closing_date, 
        total_tickets, 
        completed_tickets,
        earned_points,
        used_points,
        net_points,
        total_bet_amount,
        total_win_amount,
        bet_margin,
        book_orders,
        book_sales,
        total_revenue,
        total_margin,
        closed_by,
        closed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      date,
      ticketStats?.total_tickets || 0,
      ticketStats?.completed_tickets || 0,
      earnedPoints,
      usedPoints,
      netPoints,
      totalBetAmount,
      totalWinAmount,
      betMargin,
      0, // book_orders - 필요시 추가
      bookSalesAmount,
      totalRevenue,
      totalMargin,
      closed_by
    ).run()

    return c.json({
      success: true,
      closing_id: result.meta.last_row_id,
      message: '일일 마감이 완료되었습니다.'
    })
  } catch (error: any) {
    console.error('일일 마감 실행 오류:', error)
    return c.json({ error: '일일 마감 실행 중 오류가 발생했습니다.' }, 500)
  }
})

/**
 * 월간 마감 리포트 API
 * GET /closing/monthly?year=YYYY&month=MM
 */
closing.get('/monthly', async (c) => {
  try {
    const { DB } = c.env
    const year = c.req.query('year') || new Date().getFullYear().toString()
    const month = c.req.query('month') || (new Date().getMonth() + 1).toString().padStart(2, '0')
    
    const monthPattern = `${year}-${month}-%`

    const monthlyData = await DB.prepare(`
      SELECT 
        closing_date,
        total_revenue,
        total_margin,
        total_tickets,
        completed_tickets,
        closed_at
      FROM daily_closings
      WHERE closing_date LIKE ?
      ORDER BY closing_date DESC
    `).bind(monthPattern).all()

    // 월간 합계
    const summary = {
      total_revenue: 0,
      total_margin: 0,
      total_tickets: 0,
      completed_tickets: 0,
      closed_days: monthlyData.results?.length || 0
    }

    monthlyData.results?.forEach((row: any) => {
      summary.total_revenue += Number(row.total_revenue || 0)
      summary.total_margin += Number(row.total_margin || 0)
      summary.total_tickets += Number(row.total_tickets || 0)
      summary.completed_tickets += Number(row.completed_tickets || 0)
    })

    return c.json({
      year,
      month,
      summary,
      daily_records: monthlyData.results || []
    })
  } catch (error: any) {
    console.error('월간 리포트 조회 오류:', error)
    return c.json({ error: '월간 리포트 조회 중 오류가 발생했습니다.' }, 500)
  }
})

export default closing
