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

export default betting
