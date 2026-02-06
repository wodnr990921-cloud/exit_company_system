import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
}

const betting = new Hono<{ Bindings: Bindings }>()

// ==========================================
// 경기 관리
// ==========================================

// 경기 목록 조회
betting.get('/matches', async (c) => {
  try {
    const status = c.req.query('status') || 'all'

    let query = 'SELECT * FROM matches WHERE 1=1'
    const params: any[] = []

    if (status && status !== 'all') {
      query += ` AND status = ?`
      params.push(status)
    }

    query += ` ORDER BY match_date DESC`

    const { results } = await c.env.DB.prepare(query).bind(...params).all()

    return c.json({ matches: results })
  } catch (error) {
    console.error('경기 목록 조회 오류:', error)
    return c.json({ error: '경기 목록 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 경기 등록
betting.post('/matches', async (c) => {
  try {
    const { 
      match_name, match_date, home_team, away_team,
      home_odds, away_odds, draw_odds,
      over_line, over_odds, under_odds,
      handicap_line, handicap_home_odds, handicap_away_odds
    } = await c.req.json()

    if (!match_name || !match_date || !home_team || !away_team) {
      return c.json({ error: '필수 항목을 입력해주세요.' }, 400)
    }

    const match_number = `M${Date.now()}`

    const result = await c.env.DB.prepare(
      `INSERT INTO matches (
        match_number, match_name, match_date, home_team, away_team,
        home_odds, away_odds, draw_odds,
        over_line, over_odds, under_odds,
        handicap_line, handicap_home_odds, handicap_away_odds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      match_number, match_name, match_date, home_team, away_team,
      home_odds || 1.0, away_odds || 1.0, draw_odds || null,
      over_line || null, over_odds || null, under_odds || null,
      handicap_line || null, handicap_home_odds || null, handicap_away_odds || null
    ).run()

    return c.json({ 
      success: true, 
      match_id: result.meta.last_row_id,
      match_number
    })
  } catch (error) {
    console.error('경기 등록 오류:', error)
    return c.json({ error: '경기 등록 중 오류가 발생했습니다.' }, 500)
  }
})

// 경기 결과 입력
betting.post('/matches/:id/result', async (c) => {
  try {
    const match_id = c.req.param('id')
    const { result, home_score, away_score } = await c.req.json()

    if (!result) {
      return c.json({ error: '경기 결과를 입력해주세요.' }, 400)
    }

    const validResults = ['home_win', 'away_win', 'draw', 'cancelled']
    if (!validResults.includes(result)) {
      return c.json({ error: '올바른 경기 결과를 입력해주세요.' }, 400)
    }

    // 경기 정보 조회
    const match = await c.env.DB.prepare(
      'SELECT * FROM matches WHERE id = ?'
    ).bind(match_id).first()

    if (!match) {
      return c.json({ error: '경기를 찾을 수 없습니다.' }, 404)
    }

    // 총점 계산 (언오버 판정용)
    const totalScore = home_score !== undefined && away_score !== undefined 
      ? parseFloat(home_score) + parseFloat(away_score)
      : null

    // 경기 결과 업데이트
    await c.env.DB.prepare(
      `UPDATE matches 
       SET result = ?, home_score = ?, away_score = ?, total_score = ?, 
           status = 'completed', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(result, home_score, away_score, totalScore, match_id).run()

    // 이 경기와 관련된 모든 배팅 찾기
    const { results: bets } = await c.env.DB.prepare(
      `SELECT b.*, bf.id as folder_id, bf.member_id, bf.folder_type
       FROM bets b
       JOIN bet_folders bf ON b.folder_id = bf.id
       WHERE b.match_id = ? AND b.status = 'pending'`
    ).bind(match_id).all()

    // 각 배팅의 승패 판정
    for (const bet of bets || []) {
      let betStatus = 'lose'

      if (result === 'cancelled') {
        betStatus = 'cancelled'
      } else {
        // 배팅 타입별 승패 판정
        switch (bet.bet_type) {
          case 'home_win':
            betStatus = result === 'home_win' ? 'win' : 'lose'
            break
          case 'away_win':
            betStatus = result === 'away_win' ? 'win' : 'lose'
            break
          case 'draw':
            betStatus = result === 'draw' ? 'win' : 'lose'
            break
          case 'over':
            if (totalScore !== null && match.over_line !== null) {
              betStatus = totalScore > match.over_line ? 'win' : 'lose'
            }
            break
          case 'under':
            if (totalScore !== null && match.over_line !== null) {
              betStatus = totalScore < match.over_line ? 'win' : 'lose'
            }
            break
          case 'handicap_home':
            if (home_score !== null && away_score !== null && match.handicap_line !== null) {
              const adjustedHomeScore = parseFloat(home_score) + parseFloat(match.handicap_line)
              betStatus = adjustedHomeScore > away_score ? 'win' : 'lose'
            }
            break
          case 'handicap_away':
            if (home_score !== null && away_score !== null && match.handicap_line !== null) {
              const adjustedAwayScore = parseFloat(away_score) - parseFloat(match.handicap_line)
              betStatus = adjustedAwayScore > home_score ? 'win' : 'lose'
            }
            break
        }
      }

      // 배팅 상태 업데이트
      await c.env.DB.prepare(
        'UPDATE bets SET status = ? WHERE id = ?'
      ).bind(betStatus, bet.id).run()
    }

    // 폴더 상태 업데이트
    const uniqueFolders = [...new Set((bets || []).map(b => b.folder_id))]
    
    for (const folderId of uniqueFolders) {
      const folder = (bets || []).find(b => b.folder_id === folderId)
      if (!folder) continue

      // 이 폴더의 모든 배팅 조회
      const { results: folderBets } = await c.env.DB.prepare(
        'SELECT * FROM bets WHERE folder_id = ?'
      ).bind(folderId).all()

      if (!folderBets || folderBets.length === 0) continue

      const allCompleted = folderBets.every(b => b.status !== 'pending')

      if (allCompleted) {
        if (folder.folder_type === 'single') {
          // 단폴더: 1개만 적중하면 됨
          const isWin = folderBets[0].status === 'win'
          const isCancelled = folderBets[0].status === 'cancelled'

          if (isCancelled) {
            // 취소된 경우 배팅 금액 환불
            await c.env.DB.prepare(
              `UPDATE bet_folders 
               SET status = 'cancelled', result_status = 'cancelled', settlement_amount = total_bet_amount
               WHERE id = ?`
            ).bind(folderId).run()

            // 환불 처리
            const folderInfo = await c.env.DB.prepare(
              'SELECT * FROM bet_folders WHERE id = ?'
            ).bind(folderId).first()

            if (folderInfo) {
              await c.env.DB.prepare(
                'UPDATE members SET betting_points = betting_points + ? WHERE id = ?'
              ).bind(folderInfo.total_bet_amount, folderInfo.member_id).run()
            }
          } else if (isWin) {
            // 승리: 정산 대기 목록에 추가
            await c.env.DB.prepare(
              `UPDATE bet_folders 
               SET status = 'win', result_status = 'all_win', settlement_amount = potential_win
               WHERE id = ?`
            ).bind(folderId).run()

            const folderInfo = await c.env.DB.prepare(
              'SELECT * FROM bet_folders WHERE id = ?'
            ).bind(folderId).all()

            if (folderInfo.results && folderInfo.results.length > 0) {
              const folder = folderInfo.results[0]
              await c.env.DB.prepare(
                `INSERT INTO bet_settlements (folder_id, member_id, settlement_amount)
                 VALUES (?, ?, ?)`
              ).bind(folderId, folder.member_id, folder.potential_win).run()
            }
          } else {
            // 패배
            await c.env.DB.prepare(
              `UPDATE bet_folders 
               SET status = 'lose', result_status = 'all_lose', settlement_amount = 0
               WHERE id = ?`
            ).bind(folderId).run()
          }
        } else {
          // 다폴더: 모두 적중해야 함
          const allWin = folderBets.every(b => b.status === 'win')
          const anyCancelled = folderBets.some(b => b.status === 'cancelled')

          if (anyCancelled) {
            // 하나라도 취소되면 전체 취소 및 환불
            await c.env.DB.prepare(
              `UPDATE bet_folders 
               SET status = 'cancelled', result_status = 'cancelled', settlement_amount = total_bet_amount
               WHERE id = ?`
            ).bind(folderId).run()

            const folderInfo = await c.env.DB.prepare(
              'SELECT * FROM bet_folders WHERE id = ?'
            ).bind(folderId).first()

            if (folderInfo) {
              await c.env.DB.prepare(
                'UPDATE members SET betting_points = betting_points + ? WHERE id = ?'
              ).bind(folderInfo.total_bet_amount, folderInfo.member_id).run()
            }
          } else if (allWin) {
            // 전체 승리: 정산 대기 목록에 추가
            await c.env.DB.prepare(
              `UPDATE bet_folders 
               SET status = 'win', result_status = 'all_win', settlement_amount = potential_win
               WHERE id = ?`
            ).bind(folderId).run()

            const folderInfo = await c.env.DB.prepare(
              'SELECT * FROM bet_folders WHERE id = ?'
            ).bind(folderId).first()

            if (folderInfo) {
              await c.env.DB.prepare(
                `INSERT INTO bet_settlements (folder_id, member_id, settlement_amount)
                 VALUES (?, ?, ?)`
              ).bind(folderId, folderInfo.member_id, folderInfo.potential_win).run()
            }
          } else {
            // 하나라도 실패하면 패배
            await c.env.DB.prepare(
              `UPDATE bet_folders 
               SET status = 'lose', result_status = 'all_lose', settlement_amount = 0
               WHERE id = ?`
            ).bind(folderId).run()
          }
        }
      }
    }

    return c.json({ success: true })
  } catch (error) {
    console.error('경기 결과 입력 오류:', error)
    return c.json({ error: '경기 결과 입력 중 오류가 발생했습니다.' }, 500)
  }
})

// ==========================================
// 배팅 폴더 관리
// ==========================================

// 배팅 폴더 생성 (단폴더 또는 다폴더)
betting.post('/folders', async (c) => {
  try {
    const { 
      ticket_id, member_id, folder_type, total_bet_amount, bets, created_by 
    } = await c.req.json()

    if (!ticket_id || !member_id || !folder_type || !total_bet_amount || !bets || bets.length === 0 || !created_by) {
      return c.json({ error: '필수 항목을 입력해주세요.' }, 400)
    }

    // 폴더 타입 검증
    if (folder_type !== 'single' && folder_type !== 'multi') {
      return c.json({ error: '올바른 폴더 타입을 선택해주세요.' }, 400)
    }

    // 단폴더는 1개, 다폴더는 2개 이상
    if (folder_type === 'single' && bets.length !== 1) {
      return c.json({ error: '단폴더는 1개의 경기만 선택할 수 있습니다.' }, 400)
    }

    if (folder_type === 'multi' && bets.length < 2) {
      return c.json({ error: '다폴더는 최소 2개 이상의 경기를 선택해야 합니다.' }, 400)
    }

    // 회원 배팅 포인트 확인
    const member = await c.env.DB.prepare(
      'SELECT betting_points FROM members WHERE id = ?'
    ).bind(member_id).first()

    if (!member) {
      return c.json({ error: '회원을 찾을 수 없습니다.' }, 404)
    }

    if ((member as any).betting_points < total_bet_amount) {
      return c.json({ error: '배팅 포인트가 부족합니다.' }, 400)
    }

    // 모든 경기가 scheduled 상태인지 확인
    for (const bet of bets) {
      const match = await c.env.DB.prepare(
        'SELECT status FROM matches WHERE id = ?'
      ).bind(bet.match_id).first()

      if (!match) {
        return c.json({ error: `경기(ID: ${bet.match_id})를 찾을 수 없습니다.` }, 404)
      }

      if ((match as any).status !== 'scheduled') {
        return c.json({ error: `이미 시작되었거나 종료된 경기가 포함되어 있습니다.` }, 400)
      }
    }

    // 총 배당률 계산
    let totalOdds = folder_type === 'single' ? bets[0].odds : bets.reduce((acc, bet) => acc * bet.odds, 1)
    
    // 예상 당첨금 계산
    const potentialWin = Math.floor(total_bet_amount * totalOdds)

    // 폴더 번호 생성
    const folderNumber = `F${Date.now()}`

    // 배팅 폴더 생성
    const folderResult = await c.env.DB.prepare(
      `INSERT INTO bet_folders (
        folder_number, ticket_id, member_id, folder_type, 
        total_bet_amount, total_odds, potential_win, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      folderNumber, ticket_id, member_id, folder_type,
      total_bet_amount, totalOdds, potentialWin, created_by
    ).run()

    const folderId = folderResult.meta.last_row_id

    // 개별 배팅 생성
    for (const bet of bets) {
      await c.env.DB.prepare(
        `INSERT INTO bets (folder_id, match_id, bet_type, odds)
         VALUES (?, ?, ?, ?)`
      ).bind(folderId, bet.match_id, bet.bet_type, bet.odds).run()
    }

    // 회원 배팅 포인트 차감
    await c.env.DB.prepare(
      'UPDATE members SET betting_points = betting_points - ? WHERE id = ?'
    ).bind(total_bet_amount, member_id).run()

    // 포인트 거래 내역 기록
    const newBalance = (member as any).betting_points - total_bet_amount
    await c.env.DB.prepare(
      `INSERT INTO point_transactions (
        member_id, ticket_id, point_type, transaction_type, 
        amount, balance_after, description, created_by
      ) VALUES (?, ?, 'betting', 'use', ?, ?, ?, ?)`
    ).bind(
      member_id, ticket_id, -total_bet_amount, newBalance,
      `배팅: ${folderNumber} (${folder_type === 'single' ? '단폴더' : '다폴더'})`,
      created_by
    ).run()

    return c.json({ 
      success: true, 
      folder_id: folderId,
      folder_number: folderNumber,
      potential_win: potentialWin
    })
  } catch (error) {
    console.error('배팅 폴더 생성 오류:', error)
    return c.json({ error: '배팅 폴더 생성 중 오류가 발생했습니다.' }, 500)
  }
})

// 배팅 폴더 목록 조회
betting.get('/folders', async (c) => {
  try {
    const member_id = c.req.query('member_id')
    const status = c.req.query('status') || 'all'

    let query = `
      SELECT bf.*, m.name as member_name, t.ticket_number
      FROM bet_folders bf
      LEFT JOIN members m ON bf.member_id = m.id
      LEFT JOIN tickets t ON bf.ticket_id = t.id
      WHERE 1=1
    `
    const params: any[] = []

    if (member_id) {
      query += ` AND bf.member_id = ?`
      params.push(member_id)
    }

    if (status && status !== 'all') {
      query += ` AND bf.status = ?`
      params.push(status)
    }

    query += ` ORDER BY bf.created_at DESC`

    const { results } = await c.env.DB.prepare(query).bind(...params).all()

    // 각 폴더의 배팅 상세 정보 조회
    for (const folder of results || []) {
      const { results: folderBets } = await c.env.DB.prepare(
        `SELECT b.*, m.match_name, m.home_team, m.away_team, m.status as match_status
         FROM bets b
         LEFT JOIN matches m ON b.match_id = m.id
         WHERE b.folder_id = ?`
      ).bind(folder.id).all()

      folder.bets = folderBets || []
    }

    return c.json({ folders: results })
  } catch (error) {
    console.error('배팅 폴더 목록 조회 오류:', error)
    return c.json({ error: '배팅 폴더 목록 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// ==========================================
// 배팅 정산 관리
// ==========================================

// 정산 대기 목록 조회
betting.get('/settlements/pending', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT bs.*, 
              bf.folder_number, bf.folder_type, bf.total_bet_amount, bf.total_odds,
              m.name as member_name, m.betting_points as current_betting_points
       FROM bet_settlements bs
       LEFT JOIN bet_folders bf ON bs.folder_id = bf.id
       LEFT JOIN members m ON bs.member_id = m.id
       WHERE bs.status = 'pending'
       ORDER BY bs.created_at ASC`
    ).all()

    return c.json({ settlements: results })
  } catch (error) {
    console.error('정산 대기 목록 조회 오류:', error)
    return c.json({ error: '정산 대기 목록 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 정산 승인
betting.post('/settlements/:id/approve', async (c) => {
  try {
    const settlement_id = c.req.param('id')
    const { approved_by } = await c.req.json()

    if (!approved_by) {
      return c.json({ error: '승인자 정보가 필요합니다.' }, 400)
    }

    // 정산 정보 조회
    const settlement = await c.env.DB.prepare(
      'SELECT * FROM bet_settlements WHERE id = ?'
    ).bind(settlement_id).first()

    if (!settlement) {
      return c.json({ error: '정산 정보를 찾을 수 없습니다.' }, 404)
    }

    if ((settlement as any).status !== 'pending') {
      return c.json({ error: '이미 처리된 정산입니다.' }, 400)
    }

    // 회원 배팅 포인트 증가
    await c.env.DB.prepare(
      'UPDATE members SET betting_points = betting_points + ? WHERE id = ?'
    ).bind((settlement as any).settlement_amount, (settlement as any).member_id).run()

    // 정산 상태 업데이트
    await c.env.DB.prepare(
      `UPDATE bet_settlements 
       SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(approved_by, settlement_id).run()

    // 폴더 승인 상태 업데이트
    await c.env.DB.prepare(
      `UPDATE bet_folders 
       SET approved_by = ?, approved_at = CURRENT_TIMESTAMP, settled_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(approved_by, (settlement as any).folder_id).run()

    // 회원 새 잔액 조회
    const member = await c.env.DB.prepare(
      'SELECT betting_points FROM members WHERE id = ?'
    ).bind((settlement as any).member_id).first()

    // 포인트 거래 내역 기록
    await c.env.DB.prepare(
      `INSERT INTO point_transactions (
        member_id, point_type, transaction_type, 
        amount, balance_after, description, approved_by, approved_at
      ) VALUES (?, 'betting', 'earn', ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).bind(
      (settlement as any).member_id,
      (settlement as any).settlement_amount,
      (member as any).betting_points,
      `배팅 당첨금 지급`,
      approved_by
    ).run()

    return c.json({ success: true, new_balance: (member as any).betting_points })
  } catch (error) {
    console.error('정산 승인 오류:', error)
    return c.json({ error: '정산 승인 중 오류가 발생했습니다.' }, 500)
  }
})

// 정산 거부
betting.post('/settlements/:id/reject', async (c) => {
  try {
    const settlement_id = c.req.param('id')
    const { approved_by, notes } = await c.req.json()

    if (!approved_by) {
      return c.json({ error: '승인자 정보가 필요합니다.' }, 400)
    }

    // 정산 정보 조회
    const settlement = await c.env.DB.prepare(
      'SELECT * FROM bet_settlements WHERE id = ?'
    ).bind(settlement_id).first()

    if (!settlement) {
      return c.json({ error: '정산 정보를 찾을 수 없습니다.' }, 404)
    }

    if ((settlement as any).status !== 'pending') {
      return c.json({ error: '이미 처리된 정산입니다.' }, 400)
    }

    // 정산 상태 업데이트
    await c.env.DB.prepare(
      `UPDATE bet_settlements 
       SET status = 'rejected', approved_by = ?, approved_at = CURRENT_TIMESTAMP, notes = ?
       WHERE id = ?`
    ).bind(approved_by, notes || '', settlement_id).run()

    return c.json({ success: true })
  } catch (error) {
    console.error('정산 거부 오류:', error)
    return c.json({ error: '정산 거부 중 오류가 발생했습니다.' }, 500)
  }
})

// ==========================================
// 배팅 통계
// ==========================================

// 배팅 통계 조회
betting.get('/statistics', async (c) => {
  try {
    const start_date = c.req.query('start_date')
    const end_date = c.req.query('end_date')

    if (!start_date || !end_date) {
      return c.json({ error: '시작일과 종료일을 입력해주세요.' }, 400)
    }

    // 전체 통계
    const totalStats = await c.env.DB.prepare(
      `SELECT 
        COUNT(*) as total_bet_count,
        SUM(total_bet_amount) as total_bet_amount,
        SUM(CASE WHEN status = 'won' THEN potential_win ELSE 0 END) as total_win_amount
       FROM bet_folders
       WHERE DATE(created_at) BETWEEN ? AND ?`
    ).bind(start_date, end_date).first()

    const total_bet_amount = (totalStats as any)?.total_bet_amount || 0
    const total_win_amount = (totalStats as any)?.total_win_amount || 0
    const net_profit = total_bet_amount - total_win_amount

    // 회원별 통계 (상위 10명)
    const { results: memberStats } = await c.env.DB.prepare(
      `SELECT 
        m.name as member_name,
        COUNT(bf.id) as bet_count,
        SUM(bf.total_bet_amount) as total_bet_amount,
        SUM(CASE WHEN bf.status = 'won' THEN 1 ELSE 0 END) * 100.0 / COUNT(bf.id) as win_rate
       FROM bet_folders bf
       LEFT JOIN members m ON bf.member_id = m.id
       WHERE DATE(bf.created_at) BETWEEN ? AND ?
       GROUP BY bf.member_id, m.name
       ORDER BY total_bet_amount DESC
       LIMIT 10`
    ).bind(start_date, end_date).all()

    // 경기별 통계 (상위 10개)
    const { results: matchStats } = await c.env.DB.prepare(
      `SELECT 
        ma.match_name,
        COUNT(DISTINCT bf.id) as bet_count,
        SUM(bf.total_bet_amount) as total_bet_amount
       FROM bets b
       LEFT JOIN matches ma ON b.match_id = ma.id
       LEFT JOIN bet_folders bf ON b.folder_id = bf.id
       WHERE DATE(bf.created_at) BETWEEN ? AND ?
       GROUP BY ma.id, ma.match_name
       ORDER BY bet_count DESC
       LIMIT 10`
    ).bind(start_date, end_date).all()

    // 일별 추이
    const { results: dailyTrend } = await c.env.DB.prepare(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as bet_count,
        SUM(total_bet_amount) as total_bet_amount,
        SUM(CASE WHEN status = 'won' THEN potential_win ELSE 0 END) as total_win_amount
       FROM bet_folders
       WHERE DATE(created_at) BETWEEN ? AND ?
       GROUP BY DATE(created_at)
       ORDER BY date DESC`
    ).bind(start_date, end_date).all()

    return c.json({
      total_bet_count: (totalStats as any)?.total_bet_count || 0,
      total_bet_amount,
      total_win_amount,
      net_profit,
      member_stats: memberStats || [],
      match_stats: matchStats || [],
      daily_trend: dailyTrend || []
    })
  } catch (error) {
    console.error('통계 조회 오류:', error)
    return c.json({ error: '통계 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// ==========================================
// 일일 마감 기능
// ==========================================

// 일일 마감 통계 조회
betting.get('/daily-close', async (c) => {
  try {
    const date = c.req.query('date') || new Date().toISOString().split('T')[0]
    
    // 티켓 통계
    const { results: ticketStats } = await c.env.DB.prepare(
      `SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tickets,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_tickets,
        SUM(CASE WHEN ticket_type = 'ORDER' THEN 1 ELSE 0 END) as order_tickets,
        SUM(CASE WHEN ticket_type = 'POINT_ADJUSTMENT' THEN 1 ELSE 0 END) as point_adjustment_tickets
       FROM tickets
       WHERE DATE(created_at) = ?`
    ).bind(date).all()

    // 배팅 통계
    const { results: bettingStats } = await c.env.DB.prepare(
      `SELECT 
        COUNT(*) as total_bet_count,
        SUM(total_bet_amount) as total_bet_amount,
        SUM(CASE WHEN status = 'won' THEN potential_win ELSE 0 END) as total_win_amount,
        SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won_count,
        SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost_count,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count
       FROM bet_folders
       WHERE DATE(created_at) = ?`
    ).bind(date).all()

    const bettingData = bettingStats?.[0] as any || {}
    const total_bet_amount = Number(bettingData.total_bet_amount || 0)
    const total_win_amount = Number(bettingData.total_win_amount || 0)
    const net_profit = total_bet_amount - total_win_amount
    const profit_margin = total_bet_amount > 0 ? ((net_profit / total_bet_amount) * 100).toFixed(2) : '0.00'

    // 포인트 통계
    const { results: pointStats } = await c.env.DB.prepare(
      `SELECT 
        SUM(CASE WHEN adjustment_type = 'add' THEN amount ELSE 0 END) as total_points_added,
        SUM(CASE WHEN adjustment_type = 'subtract' THEN amount ELSE 0 END) as total_points_subtracted,
        SUM(CASE WHEN point_type = 'regular' THEN amount ELSE 0 END) as regular_points,
        SUM(CASE WHEN point_type = 'betting' THEN amount ELSE 0 END) as betting_points
       FROM point_transactions
       WHERE DATE(created_at) = ?`
    ).bind(date).all()

    // 직원 출근 통계
    const { results: attendanceStats } = await c.env.DB.prepare(
      `SELECT 
        COUNT(DISTINCT staff_id) as total_staff,
        AVG(CASE WHEN checkout_time IS NOT NULL 
          THEN (julianday(checkout_time) - julianday(checkin_time)) * 24 
          ELSE 0 END) as avg_work_hours
       FROM attendance
       WHERE DATE(checkin_time) = ?`
    ).bind(date).all()

    // 도서 통계
    const { results: bookStats } = await c.env.DB.prepare(
      `SELECT 
        COUNT(*) as total_books,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_books,
        SUM(CASE WHEN status = 'out_of_stock' THEN 1 ELSE 0 END) as out_of_stock_books,
        SUM(stock) as total_stock
       FROM books`
    ).bind().all()

    // 회원별 활동 통계
    const { results: memberActivity } = await c.env.DB.prepare(
      `SELECT 
        m.name as member_name,
        COUNT(DISTINCT t.id) as ticket_count,
        COUNT(DISTINCT bf.id) as bet_count,
        SUM(bf.total_bet_amount) as total_bet_amount
       FROM members m
       LEFT JOIN tickets t ON m.id = t.member_id AND DATE(t.created_at) = ?
       LEFT JOIN bet_folders bf ON m.id = bf.member_id AND DATE(bf.created_at) = ?
       GROUP BY m.id, m.name
       HAVING ticket_count > 0 OR bet_count > 0
       ORDER BY total_bet_amount DESC
       LIMIT 10`
    ).bind(date, date).all()

    return c.json({
      date,
      ticket_stats: ticketStats?.[0] || {},
      betting_stats: {
        ...bettingData,
        total_bet_amount,
        total_win_amount,
        net_profit,
        profit_margin
      },
      point_stats: pointStats?.[0] || {},
      attendance_stats: attendanceStats?.[0] || {},
      book_stats: bookStats?.[0] || {},
      member_activity: memberActivity || []
    })
  } catch (error) {
    console.error('일일 마감 통계 조회 오류:', error)
    return c.json({ error: '일일 마감 통계 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 일일 마감 확정 (마감 기록 생성)
betting.post('/daily-close', async (c) => {
  try {
    const { date, closed_by, notes } = await c.req.json()
    
    if (!date || !closed_by) {
      return c.json({ error: '필수 항목을 입력해주세요.' }, 400)
    }

    // 이미 마감된 날짜인지 확인
    const { results: existing } = await c.env.DB.prepare(
      `SELECT id FROM daily_closings WHERE closing_date = ?`
    ).bind(date).all()

    if (existing && existing.length > 0) {
      return c.json({ error: '이미 마감된 날짜입니다.' }, 400)
    }

    // 일일 마감 통계 조회
    const statsResponse = await fetch(`${c.req.url.split('/api')[0]}/api/betting/daily-close?date=${date}`)
    const stats = await statsResponse.json()

    // 배팅 마진 계산
    const bet_margin = (stats.betting_stats?.total_bet_amount || 0) - (stats.betting_stats?.total_win_amount || 0)
    
    // 순 포인트 계산
    const net_points = (stats.point_stats?.total_points_added || 0) - (stats.point_stats?.total_points_subtracted || 0)
    
    // 총 마진 = 순 포인트 + 배팅 마진
    const total_margin = net_points + bet_margin

    // 마감 기록 저장
    const result = await c.env.DB.prepare(
      `INSERT INTO daily_closings (
        closing_date, closed_by, 
        total_tickets, completed_tickets, 
        earned_points, used_points, net_points,
        total_bet_amount, total_win_amount, bet_margin,
        book_orders,
        total_revenue, total_margin,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      date,
      closed_by,
      stats.ticket_stats?.total_tickets || 0,
      stats.ticket_stats?.completed_tickets || 0,
      stats.point_stats?.total_points_added || 0,
      stats.point_stats?.total_points_subtracted || 0,
      net_points,
      stats.betting_stats?.total_bet_amount || 0,
      stats.betting_stats?.total_win_amount || 0,
      bet_margin,
      stats.ticket_stats?.order_tickets || 0,
      net_points, // 총 매출 = 순 포인트
      total_margin,
      notes || ''
    ).run()

    return c.json({ 
      success: true, 
      close_id: result.meta.last_row_id 
    })
  } catch (error) {
    console.error('일일 마감 확정 오류:', error)
    return c.json({ error: '일일 마감 확정 중 오류가 발생했습니다.' }, 500)
  }
})

// 마감 기록 목록 조회
betting.get('/daily-closes', async (c) => {
  try {
    const start_date = c.req.query('start_date')
    const end_date = c.req.query('end_date')
    
    let query = `SELECT 
      dc.*,
      s.name as closed_by_name
      FROM daily_closings dc
      LEFT JOIN staff s ON dc.closed_by = s.id
      WHERE 1=1`
    const params: any[] = []

    if (start_date) {
      query += ` AND dc.closing_date >= ?`
      params.push(start_date)
    }
    if (end_date) {
      query += ` AND dc.closing_date <= ?`
      params.push(end_date)
    }

    query += ` ORDER BY dc.closing_date DESC LIMIT 30`

    const { results } = await c.env.DB.prepare(query).bind(...params).all()

    return c.json({ closes: results })
  } catch (error) {
    console.error('마감 기록 조회 오류:', error)
    return c.json({ error: '마감 기록 조회 중 오류가 발생했습니다.' }, 500)
  }
})

export default betting
