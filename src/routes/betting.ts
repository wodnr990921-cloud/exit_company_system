import { Hono } from 'hono'
import { verifyToken } from './auth'

type Bindings = {
  DB: D1Database
  API_SPORT_KEY?: string
}

const betting = new Hono<{ Bindings: Bindings }>()

// 일괄 등록 API는 인증 필요
betting.use('/matches/bulk', verifyToken)

// ==========================================
// 경기 관리
// ==========================================

// 경기 목록 조회
betting.get('/matches', async (c) => {
  try {
    const status = c.req.query('status') || 'all'
    const search = c.req.query('search') || ''
    const days_filter = c.req.query('days_filter') !== 'false' // 기본값: true

    let query = 'SELECT * FROM matches WHERE 1=1'
    const params: any[] = []

    // 상태 필터
    if (status && status !== 'all') {
      query += ` AND status = ?`
      params.push(status)
    }

    // 날짜 필터: 종료 후 1일까지만 표시 (days_filter가 true일 때만)
    if (days_filter) {
      query += ` AND datetime(match_date) >= datetime('now', '-1 day')`
    }

    // 검색 필터 (팀명, 리그명, 경기명)
    if (search) {
      query += ` AND (
        home_team LIKE ? OR 
        away_team LIKE ? OR 
        league LIKE ? OR 
        match_name LIKE ?
      )`
      const searchPattern = `%${search}%`
      params.push(searchPattern, searchPattern, searchPattern, searchPattern)
    }

    query += ` ORDER BY match_date DESC`

    const { results } = await c.env.DB.prepare(query).bind(...params).all()

    // 완료된 경기의 경우 배팅 통계 추가
    if (status === 'completed') {
      for (const match of results || []) {
        const statsQuery = await c.env.DB.prepare(
          `SELECT 
            COUNT(DISTINCT bf.id) as bet_count,
            SUM(bf.total_bet_amount) as total_bet_amount,
            SUM(CASE WHEN bf.status = 'won' THEN bf.potential_win ELSE 0 END) as total_win_amount
           FROM bet_folders bf
           JOIN bets b ON bf.id = b.folder_id
           WHERE b.match_id = ?`
        ).bind(match.id).first()

        match.total_bet_amount = Number((statsQuery as any)?.total_bet_amount || 0)
        match.total_win_amount = Number((statsQuery as any)?.total_win_amount || 0)
        match.bet_count = Number((statsQuery as any)?.bet_count || 0)
      }
    }

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
      match_name, match_date, home_team, away_team, league,
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
        match_number, match_name, match_date, home_team, away_team, league,
        home_odds, away_odds, draw_odds,
        over_line, over_odds, under_odds,
        handicap_line, handicap_home_odds, handicap_away_odds,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      match_number, match_name, match_date, home_team, away_team, league || 'ETC',
      home_odds || 1.0, away_odds || 1.0, draw_odds || null,
      over_line || null, over_odds || null, under_odds || null,
      handicap_line || null, handicap_home_odds || null, handicap_away_odds || null,
      'open'
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

// 경기 일괄 저장 (등록/수정)
betting.post('/matches/bulk', async (c) => {
  try {
    const { matches } = await c.req.json()

    if (!matches || matches.length === 0) {
      return c.json({ error: '저장할 경기가 없습니다.' }, 400)
    }

    for (const match of matches) {
      const { id, match_name, match_date, home_team, away_team, league, home_odds, draw_odds, away_odds } = match

      if (!match_name || !match_date || !home_team || !away_team) {
        continue // 필수 필드 누락 시 스킵
      }

      if (id) {
        // 기존 경기 수정
        await c.env.DB.prepare(
          `UPDATE matches 
           SET match_name = ?, match_date = ?, home_team = ?, away_team = ?, league = ?,
               home_odds = ?, draw_odds = ?, away_odds = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`
        ).bind(
          match_name, match_date, home_team, away_team, league || 'ETC',
          home_odds || 1.0, draw_odds || null, away_odds || 1.0,
          id
        ).run()
      } else {
        // 신규 경기 등록
        const match_number = `M${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        await c.env.DB.prepare(
          `INSERT INTO matches (
            match_number, match_name, match_date, home_team, away_team, league,
            home_odds, away_odds, draw_odds,
            over_line, over_odds, under_odds,
            handicap_line, handicap_home_odds, handicap_away_odds,
            status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          match_number, match_name, match_date, home_team, away_team, league || 'ETC',
          home_odds || 1.0, away_odds || 1.0, draw_odds || null,
          match.over_line || null, match.over_odds || null, match.under_odds || null,
          match.handicap_line || null, match.handicap_home_odds || null, match.handicap_away_odds || null,
          'open'
        ).run()
      }
    }

    return c.json({ success: true })
  } catch (error) {
    console.error('경기 일괄 저장 오류:', error)
    return c.json({ error: '경기 일괄 저장 중 오류가 발생했습니다.' }, 500)
  }
})

// 경기 배당 수정
betting.patch('/matches/:id', async (c) => {
  try {
    const match_id = c.req.param('id')
    const { 
      home_odds, draw_odds, away_odds,
      over_line, over_odds, under_odds,
      handicap_line, handicap_home_odds, handicap_away_odds
    } = await c.req.json()

    // 경기 존재 여부 확인
    const match = await c.env.DB.prepare(
      'SELECT * FROM matches WHERE id = ?'
    ).bind(match_id).first()

    if (!match) {
      return c.json({ error: '경기를 찾을 수 없습니다.' }, 404)
    }

    // 배당 업데이트
    await c.env.DB.prepare(
      `UPDATE matches 
       SET home_odds = ?, draw_odds = ?, away_odds = ?,
           over_line = ?, over_odds = ?, under_odds = ?,
           handicap_line = ?, handicap_home_odds = ?, handicap_away_odds = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(
      home_odds !== undefined ? home_odds : null,
      draw_odds !== undefined ? draw_odds : null,
      away_odds !== undefined ? away_odds : null,
      over_line !== undefined ? over_line : null,
      over_odds !== undefined ? over_odds : null,
      under_odds !== undefined ? under_odds : null,
      handicap_line !== undefined ? handicap_line : null,
      handicap_home_odds !== undefined ? handicap_home_odds : null,
      handicap_away_odds !== undefined ? handicap_away_odds : null,
      match_id
    ).run()

    return c.json({ success: true })
  } catch (error) {
    console.error('경기 배당 수정 오류:', error)
    return c.json({ error: '경기 배당 수정 중 오류가 발생했습니다.' }, 500)
  }
})

// 경기 배당 수정 (별도 엔드포인트 - 프론트엔드 호환성)
betting.patch('/matches/:id/odds', async (c) => {
  try {
    const match_id = c.req.param('id')
    const { 
      home_odds, draw_odds, away_odds,
      over_line, over_odds, under_odds,
      handicap_line, handicap_home_odds, handicap_away_odds
    } = await c.req.json()

    // 경기 존재 여부 확인
    const match = await c.env.DB.prepare(
      'SELECT * FROM matches WHERE id = ?'
    ).bind(match_id).first()

    if (!match) {
      return c.json({ error: '경기를 찾을 수 없습니다.' }, 404)
    }

    // 배당 업데이트
    await c.env.DB.prepare(
      `UPDATE matches 
       SET home_odds = ?, draw_odds = ?, away_odds = ?,
           over_line = ?, over_odds = ?, under_odds = ?,
           handicap_line = ?, handicap_home_odds = ?, handicap_away_odds = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(
      home_odds !== undefined ? home_odds : null,
      draw_odds !== undefined ? draw_odds : null,
      away_odds !== undefined ? away_odds : null,
      over_line !== undefined ? over_line : null,
      over_odds !== undefined ? over_odds : null,
      under_odds !== undefined ? under_odds : null,
      handicap_line !== undefined ? handicap_line : null,
      handicap_home_odds !== undefined ? handicap_home_odds : null,
      handicap_away_odds !== undefined ? handicap_away_odds : null,
      match_id
    ).run()

    return c.json({ success: true })
  } catch (error) {
    console.error('경기 배당 수정 오류:', error)
    return c.json({ error: '경기 배당 수정 중 오류가 발생했습니다.' }, 500)
  }
})

// 경기 삭제
betting.delete('/matches/:id', async (c) => {
  try {
    const match_id = c.req.param('id')

    // 이 경기와 관련된 배팅이 있는지 확인
    const { results: bets } = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM bets WHERE match_id = ?'
    ).bind(match_id).all()

    if (bets && bets[0] && (bets[0] as any).count > 0) {
      return c.json({ error: '이 경기와 관련된 배팅이 있어 삭제할 수 없습니다.' }, 400)
    }

    await c.env.DB.prepare('DELETE FROM matches WHERE id = ?').bind(match_id).run()

    return c.json({ success: true })
  } catch (error) {
    console.error('경기 삭제 오류:', error)
    return c.json({ error: '경기 삭제 중 오류가 발생했습니다.' }, 500)
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

    // ⚡ D1 배치 실행: 회원 배팅 포인트 차감 + 포인트 거래 내역 기록을 원자적으로 실행
    const newBalance = (member as any).betting_points - total_bet_amount
    const batchResults = await c.env.DB.batch([
      c.env.DB.prepare(
        'UPDATE members SET betting_points = betting_points - ? WHERE id = ?'
      ).bind(total_bet_amount, member_id),
      
      c.env.DB.prepare(
        `INSERT INTO point_transactions (
          member_id, ticket_id, point_type, transaction_type, 
          amount, balance_after, description, created_by
        ) VALUES (?, ?, 'betting', 'use', ?, ?, ?, ?)`
      ).bind(
        member_id, ticket_id, -total_bet_amount, newBalance,
        `배팅: ${folderNumber} (${folder_type === 'single' ? '단폴더' : '다폴더'})`,
        created_by
      )
    ])

    // 배치 실행 결과 확인
    if (!batchResults || batchResults.length !== 2) {
      throw new Error('배치 실행 실패: 포인트 차감과 거래 기록 동기화 실패')
    }

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
    const league = c.req.query('league')
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const offset = (page - 1) * limit

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
    
    // 리그 필터 (배팅에 포함된 경기의 리그)
    if (league) {
      query += ` AND EXISTS (SELECT 1 FROM bets b JOIN matches m ON b.match_id = m.id WHERE b.folder_id = bf.id AND m.league = ?)`
      params.push(league)
    }

    // 총 개수 조회
    let countQuery = `SELECT COUNT(*) as total FROM bet_folders bf WHERE 1=1`
    const countParams: any[] = []
    
    if (member_id) {
      countQuery += ` AND bf.member_id = ?`
      countParams.push(member_id)
    }
    
    if (status && status !== 'all') {
      countQuery += ` AND bf.status = ?`
      countParams.push(status)
    }
    
    if (league) {
      countQuery += ` AND EXISTS (SELECT 1 FROM bets b JOIN matches m ON b.match_id = m.id WHERE b.folder_id = bf.id AND m.league = ?)`
      countParams.push(league)
    }
    
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first()
    const total = (countResult as any)?.total || 0

    query += ` ORDER BY bf.created_at DESC LIMIT ? OFFSET ?`
    params.push(limit, offset)

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

    return c.json({ 
      folders: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('배팅 폴더 목록 조회 오류:', error)
    return c.json({ error: '배팅 폴더 목록 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// ==========================================
// 배팅 정산 관리
// ==========================================

// 정산 대기 목록 조회
// 정산 목록 조회 (필터링 지원)
betting.get('/settlements', async (c) => {
  try {
    const startDate = c.req.query('start_date')
    const endDate = c.req.query('end_date')
    const status = c.req.query('status')
    const memberId = c.req.query('member_id')
    const folderType = c.req.query('folder_type')
    const league = c.req.query('league')
    
    const conditions = []
    const values = []
    
    // 날짜 필터
    if (startDate && endDate) {
      conditions.push('DATE(bs.created_at) BETWEEN ? AND ?')
      values.push(startDate, endDate)
    }
    
    // 상태 필터
    if (status) {
      conditions.push('bs.status = ?')
      values.push(status)
    }
    
    // 회원 필터
    if (memberId) {
      conditions.push('bs.member_id = ?')
      values.push(memberId)
    }
    
    // 폴더 유형 필터
    if (folderType) {
      conditions.push('bf.folder_type = ?')
      values.push(folderType)
    }
    
    // 리그 필터 (배팅에 포함된 경기의 리그)
    if (league) {
      conditions.push('EXISTS (SELECT 1 FROM bets b JOIN matches m ON b.match_id = m.id WHERE b.folder_id = bf.id AND m.league = ?)')
      values.push(league)
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    
    const query = `
      SELECT bs.*, 
             bf.folder_number, bf.folder_type, bf.total_bet_amount as bet_amount, 
             bf.total_odds, bf.potential_win,
             m.name as member_name, m.member_number, m.prison
      FROM bet_settlements bs
      LEFT JOIN bet_folders bf ON bs.folder_id = bf.id
      LEFT JOIN members m ON bs.member_id = m.id
      ${whereClause}
      ORDER BY bs.created_at DESC
    `
    
    const { results } = await c.env.DB.prepare(query).bind(...values).all()
    
    return c.json({ settlements: results })
  } catch (error) {
    console.error('정산 목록 조회 오류:', error)
    return c.json({ error: '정산 목록 조회 중 오류가 발생했습니다.' }, 500)
  }
})

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
// D1 batch 실행으로 원자성 보장
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

    // 회원 현재 잔액 조회
    const member = await c.env.DB.prepare(
      'SELECT betting_points FROM members WHERE id = ?'
    ).bind((settlement as any).member_id).first()

    if (!member) {
      return c.json({ error: '회원을 찾을 수 없습니다.' }, 404)
    }

    const newBalance = (member as any).betting_points + (settlement as any).settlement_amount

    // ⚡ D1 배치 실행: 포인트 증가 + 정산 상태 업데이트 + 폴더 승인 + 거래 기록을 원자적으로 실행
    const batchResults = await c.env.DB.batch([
      c.env.DB.prepare(
        'UPDATE members SET betting_points = betting_points + ? WHERE id = ?'
      ).bind((settlement as any).settlement_amount, (settlement as any).member_id),
      
      c.env.DB.prepare(
        `UPDATE bet_settlements 
         SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).bind(approved_by, settlement_id),
      
      c.env.DB.prepare(
        `UPDATE bet_folders 
         SET approved_by = ?, approved_at = CURRENT_TIMESTAMP, settled_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).bind(approved_by, (settlement as any).folder_id),
      
      c.env.DB.prepare(
        `INSERT INTO point_transactions (
          member_id, point_type, transaction_type, 
          amount, balance_after, description, approved_by, approved_at
        ) VALUES (?, 'betting', 'earn', ?, ?, ?, ?, CURRENT_TIMESTAMP)`
      ).bind(
        (settlement as any).member_id,
        (settlement as any).settlement_amount,
        newBalance,
        `배팅 당첨금 지급`,
        approved_by
      )
    ])

    // 배치 실행 결과 확인
    if (!batchResults || batchResults.length !== 4) {
      throw new Error('배치 실행 실패: 정산 처리 동기화 실패')
    }

    return c.json({ success: true, new_balance: newBalance })
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

// 경기 정산 통계 조회
betting.get('/settlement-stats', async (c) => {
  try {
    // 정산 완료된 폴더 통계
    const { results: folders } = await c.env.DB.prepare(`
      SELECT 
        folder_type,
        total_bet_amount,
        potential_win,
        settlement_amount,
        result_status,
        status
      FROM bet_folders
      WHERE status IN ('settled', 'approved', 'won', 'lost', 'completed')
    `).all()
    
    let totalBetAmount = 0      // 총 배팅금
    let totalWinPayout = 0      // 실제 지급된 당첨금 (수수료 차감 후)
    let totalFee = 0            // 총 수수료
    let totalLoss = 0           // 손님 루징 (낙첨)
    
    for (const folder of folders) {
      const f = folder as any
      const betAmount = Number(f.total_bet_amount || 0)
      const potentialWin = Number(f.potential_win || 0)
      const settlementAmount = Number(f.settlement_amount || 0)
      
      totalBetAmount += betAmount
      
      if (f.result_status === 'win' || f.status === 'won') {
        // 당첨: 수수료 = 예상당첨금 - 실지급액
        const fee = potentialWin - settlementAmount
        totalFee += fee
        totalWinPayout += settlementAmount
      } else if (f.result_status === 'lose' || f.status === 'lost') {
        // 낙첨: 배팅금 전액이 수익
        totalLoss += betAmount
      }
    }
    
    // 순수익 = 수수료 + 루징 - 실지급액
    const netProfit = totalFee + totalLoss - totalWinPayout
    
    return c.json({
      total_bet: totalBetAmount,              // 총 배팅금
      total_fee: totalFee,                    // 총 수수료 (수익)
      total_loss: totalLoss,                  // 총 루징 (수익)
      total_win_payout: totalWinPayout,       // 실지급액 (손실)
      net_profit: netProfit,                  // 순수익
      revenue: totalFee + totalLoss,          // 총 수익 (수수료 + 루징)
      expense: totalWinPayout                 // 총 지출 (당첨금)
    })
  } catch (error) {
    console.error('정산 통계 조회 오류:', error)
    return c.json({ error: '정산 통계 조회 중 오류가 발생했습니다.' }, 500)
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

    // 전체 통계 (새로운 정산 로직 적용)
    const { results: folders } = await c.env.DB.prepare(
      `SELECT 
        folder_type,
        total_bet_amount,
        potential_win,
        settlement_amount,
        result_status,
        status
       FROM bet_folders
       WHERE DATE(created_at) BETWEEN ? AND ?
       AND status IN ('settled', 'approved', 'won', 'lost', 'completed')`
    ).bind(start_date, end_date).all()
    
    let totalBetCount = folders.length
    let totalBetAmount = 0
    let totalFee = 0
    let totalLoss = 0
    let totalWinPayout = 0
    
    for (const folder of folders) {
      const f = folder as any
      const betAmount = Number(f.total_bet_amount || 0)
      const potentialWin = Number(f.potential_win || 0)
      const settlementAmount = Number(f.settlement_amount || 0)
      
      totalBetAmount += betAmount
      
      if (f.result_status === 'win' || f.status === 'won') {
        const fee = potentialWin - settlementAmount
        totalFee += fee
        totalWinPayout += settlementAmount
      } else if (f.result_status === 'lose' || f.status === 'lost') {
        totalLoss += betAmount
      }
    }
    
    const revenue = totalFee + totalLoss        // 수익 (수수료 + 루징)
    const expense = totalWinPayout              // 지출 (당첨금)
    const net_profit = revenue - expense        // 순수익

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
      total_bet_count: totalBetCount,
      total_bet_amount: totalBetAmount,
      revenue: revenue,                    // 총 수익 (수수료 + 루징)
      expense: expense,                    // 총 지출 (당첨금)
      net_profit: net_profit,              // 순수익
      total_fee: totalFee,                 // 수수료 수익
      total_loss: totalLoss,               // 루징 수익
      total_win_payout: totalWinPayout,    // 당첨금 지출
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

    // 배팅 통계 (새로운 정산 로직 적용)
    const { results: folders } = await c.env.DB.prepare(
      `SELECT 
        folder_type,
        total_bet_amount,
        total_win_amount,
        frozen_amount,
        result,
        status
       FROM bet_folders
       WHERE DATE(created_at) = ?`
    ).bind(date).all()
    
    let totalBetCount = folders.length
    let totalBetAmount = 0
    let totalFee = 0
    let totalLoss = 0
    let totalWinPayout = 0
    let wonCount = 0
    let lostCount = 0
    let pendingCount = 0
    
    for (const folder of folders) {
      const f = folder as any
      const betAmount = Number(f.total_bet_amount || 0)
      const totalWin = Number(f.total_win_amount || 0)
      const frozenAmount = Number(f.frozen_amount || 0)
      
      totalBetAmount += betAmount
      
      // 상태 카운트
      if (f.status === 'won' || f.result === 'win') wonCount++
      else if (f.status === 'lost' || f.result === 'lose') lostCount++
      else if (f.status === 'pending') pendingCount++
      
      // 수익 계산
      if (f.result === 'win') {
        const fee = totalWin - frozenAmount
        totalFee += fee
        totalWinPayout += frozenAmount
      } else if (f.result === 'lose') {
        totalLoss += betAmount
      }
    }
    
    const revenue = totalFee + totalLoss
    const expense = totalWinPayout
    const net_profit = revenue - expense
    const profit_margin = totalBetAmount > 0 ? ((net_profit / totalBetAmount) * 100).toFixed(2) : '0.00'

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
        total_bet_count: totalBetCount,
        total_bet_amount: totalBetAmount,
        revenue: revenue,                  // 총 수익 (수수료 + 루징)
        expense: expense,                  // 총 지출 (당첨금)
        net_profit: net_profit,            // 순수익
        profit_margin: profit_margin,
        total_fee: totalFee,               // 수수료 수익
        total_loss: totalLoss,             // 루징 수익
        total_win_payout: totalWinPayout,  // 당첨금 지출
        won_count: wonCount,
        lost_count: lostCount,
        pending_count: pendingCount
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

// 배팅 정산 확정
betting.post('/settlement/confirm', async (c) => {
  const { DB } = c.env
  
  try {
    // 1. 결과가 확정된 모든 경기의 배팅 폴더 조회
    const { results: folders } = await DB.prepare(`
      SELECT bf.*, m.result, m.match_name
      FROM bet_folders bf
      JOIN bets b ON bf.id = b.folder_id
      JOIN matches m ON b.match_id = m.id
      WHERE bf.status = 'pending'
      AND m.result IS NOT NULL
      AND m.result != ''
      GROUP BY bf.id
    `).all()
    
    if (!folders || folders.length === 0) {
      return c.json({ message: '정산할 배팅이 없습니다.' })
    }
    
    let processedCount = 0
    
    for (const folder of folders) {
      // 2. 각 폴더의 배팅 결과 확인
      const { results: bets } = await DB.prepare(`
        SELECT b.*, m.result, m.home_score, m.away_score, m.total_score
        FROM bets b
        JOIN matches m ON b.match_id = m.id
        WHERE b.folder_id = ?
      `).bind(folder.id).all()
      
      let isWin = true
      
      // 모든 배팅이 적중했는지 확인
      for (const bet of bets) {
        const matchResult = bet.result
        const betType = bet.bet_type
        
        let betWin = false
        
        if (betType === 'home_win' && matchResult === 'home_win') betWin = true
        else if (betType === 'away_win' && matchResult === 'away_win') betWin = true
        else if (betType === 'draw' && matchResult === 'draw') betWin = true
        else if (betType === 'over' && (bet.home_score + bet.away_score) > bet.over_line) betWin = true
        else if (betType === 'under' && (bet.home_score + bet.away_score) < bet.over_line) betWin = true
        
        if (!betWin) {
          isWin = false
          break
        }
      }
      
      // 3. 배팅 폴더 상태 업데이트
      const finalStatus = isWin ? 'won' : 'lost'
      await DB.prepare(`
        UPDATE bet_folders 
        SET status = ?
        WHERE id = ?
      `).bind(finalStatus, folder.id).run()
      
      // 4. 승리 시 회원에게 당첨금 지급 (동결 포인트 → 일반 포인트)
      if (isWin) {
        const winAmount = Math.floor(folder.total_bet_amount * folder.total_odds)
        
        // 동결 포인트 차감 및 배팅 포인트 지급
        await DB.prepare(`
          UPDATE members 
          SET frozen_points = frozen_points - ?,
              betting_points = betting_points + ?
          WHERE id = ?
        `).bind(winAmount, winAmount, folder.member_id).run()
        
        // 포인트 거래 기록
        await DB.prepare(`
          INSERT INTO point_transactions (member_id, transaction_type, point_type, amount, balance, description, created_at)
          SELECT ?, 'earned', 'betting_points', ?, betting_points, ?, datetime('now')
          FROM members WHERE id = ?
        `).bind(
          folder.member_id,
          winAmount,
          `배팅 당첨 (폴더: ${folder.folder_number})`,
          folder.member_id
        ).run()
        
        // 알림 생성
        const notificationMessage = `축하합니다! 배팅 폴더 ${folder.folder_number}가 당첨되었습니다. 당첨금 ${winAmount.toLocaleString()}원이 지급되었습니다.`
        await DB.prepare(`
          INSERT INTO notifications (member_id, type, title, message, created_at)
          VALUES (?, 'betting_win', '배팅 당첨', ?, datetime('now'))
        `).bind(
          folder.member_id,
          notificationMessage
        ).run()
      } else {
        // 패배 시 동결 포인트만 차감
        await DB.prepare(`
          UPDATE members 
          SET frozen_points = frozen_points - ?
          WHERE id = ?
        `).bind(folder.total_bet_amount, folder.member_id).run()
        
        // 알림 생성
        const lostMessage = `배팅 폴더 ${folder.folder_number}가 미당첨되었습니다.`
        await DB.prepare(`
          INSERT INTO notifications (member_id, type, title, message, created_at)
          VALUES (?, 'betting_lost', '배팅 미당첨', ?, datetime('now'))
        `).bind(
          folder.member_id,
          lostMessage
        ).run()
      }
      
      processedCount++
    }
    
    const settlementMessage = `${processedCount}건의 배팅이 정산되었습니다.`
    return c.json({ 
      success: true, 
      message: settlementMessage,
      processed: processedCount
    })
  } catch (error) {
    console.error('배팅 정산 오류:', error)
    return c.json({ error: '배팅 정산 중 오류가 발생했습니다.' }, 500)
  }
})

// ==========================================
// 배팅 통계
// ==========================================

// 대시보드용 배팅 통계
betting.get('/stats/dashboard', async (c) => {
  try {
    const { DB } = c.env
    
    // 오늘 날짜
    const today = new Date().toISOString().split('T')[0]
    
    // 총 배팅액, 총 적중금, 순수익, 배팅 건수
    const statsQuery = await DB.prepare(`
      SELECT 
        COUNT(*) as total_bets,
        SUM(total_bet_amount) as total_bet_amount,
        SUM(CASE WHEN status = 'won' THEN potential_win ELSE 0 END) as total_win_amount
      FROM bet_folders
      WHERE DATE(created_at) = ?
    `).bind(today).first()
    
    const totalBets = Number((statsQuery as any)?.total_bets || 0)
    const totalBetAmount = Number((statsQuery as any)?.total_bet_amount || 0)
    const totalWinAmount = Number((statsQuery as any)?.total_win_amount || 0)
    const netProfit = totalBetAmount - totalWinAmount
    
    // 정산 대기 건수
    const pendingQuery = await DB.prepare(`
      SELECT COUNT(*) as pending_count
      FROM settlements
      WHERE status = 'pending'
    `).first()
    const pendingCount = Number((pendingQuery as any)?.pending_count || 0)
    
    return c.json({
      total_bets: totalBets,
      total_bet_amount: totalBetAmount,
      total_win_amount: totalWinAmount,
      net_profit: netProfit,
      pending_settlements: pendingCount
    })
  } catch (error) {
    console.error('대시보드 통계 조회 오류:', error)
    return c.json({ error: '통계 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// ==========================================
// 배팅 폴더 상세 정보
// ==========================================

// 배팅 폴더 상세 조회
betting.get('/folders/:id', async (c) => {
  try {
    const { DB } = c.env
    const folderId = c.req.param('id')
    
    // 폴더 정보 조회
    const folder = await DB.prepare(`
      SELECT 
        bf.*,
        m.name as member_name,
        m.member_number,
        m.prison
      FROM bet_folders bf
      LEFT JOIN members m ON bf.member_id = m.id
      WHERE bf.id = ?
    `).bind(folderId).first()
    
    if (!folder) {
      return c.json({ error: '배팅 폴더를 찾을 수 없습니다.' }, 404)
    }
    
    // 배팅 상세 조회
    const bets = await DB.prepare(`
      SELECT 
        b.*,
        ma.match_name,
        ma.home_team,
        ma.away_team,
        ma.match_date,
        ma.home_score,
        ma.away_score,
        ma.status as match_status
      FROM bets b
      LEFT JOIN matches ma ON b.match_id = ma.id
      WHERE b.folder_id = ?
    `).bind(folderId).all()
    
    // 정산 정보 조회
    const settlement = await DB.prepare(`
      SELECT 
        s.*,
        st.name as approved_by_name
      FROM settlements s
      LEFT JOIN staff st ON s.approved_by = st.id
      WHERE s.folder_id = ?
    `).bind(folderId).first()
    
    return c.json({
      folder,
      bets: bets.results,
      settlement
    })
  } catch (error) {
    console.error('폴더 상세 조회 오류:', error)
    return c.json({ error: '폴더 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// ==========================================
// 관리자 설정 (리그 수집 설정)
// ==========================================

// 설정 조회
betting.get('/admin/config', async (c) => {
  try {
    // settings 테이블이 없으면 생성
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS betting_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
    
    // 기본 설정 조회
    const config = await c.env.DB.prepare(
      `SELECT key, value FROM betting_settings WHERE key = 'league_config'`
    ).first()
    
    // 기본값
    const defaultConfig = {
      enabled_leagues: [
        // 해외 축구
        { id: 'EPL', name: '프리미어리그', enabled: true, collect_odds: true },
        { id: 'LA_LIGA', name: '라리가', enabled: true, collect_odds: true },
        { id: 'SERIE_A', name: '세리에A', enabled: true, collect_odds: true },
        { id: 'BUNDESLIGA', name: '분데스리가', enabled: true, collect_odds: true },
        { id: 'LIGUE_1', name: '리그앙', enabled: true, collect_odds: true },
        // 국내 축구
        { id: 'K_LEAGUE', name: 'K리그', enabled: true, collect_odds: true },
        // 야구
        { id: 'MLB', name: 'MLB', enabled: true, collect_odds: true },
        { id: 'KBO', name: 'KBO', enabled: true, collect_odds: true },
        // 농구
        { id: 'NBA', name: 'NBA', enabled: true, collect_odds: true },
        { id: 'KBL', name: 'KBL', enabled: true, collect_odds: true },
        { id: 'WKBL', name: 'WKBL', enabled: true, collect_odds: true },
        // 배구
        { id: 'KOVO', name: 'KOVO', enabled: true, collect_odds: true },
      ]
    }
    
    if (config) {
      return c.json(JSON.parse((config as any).value))
    }
    
    return c.json(defaultConfig)
  } catch (error) {
    console.error('설정 조회 오류:', error)
    return c.json({ error: '설정 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 설정 저장
betting.post('/admin/config', async (c) => {
  try {
    const config = await c.req.json()
    
    // settings 테이블이 없으면 생성
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS betting_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
    
    // UPSERT
    await c.env.DB.prepare(`
      INSERT INTO betting_settings (key, value, updated_at)
      VALUES ('league_config', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET 
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `).bind(JSON.stringify(config)).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('설정 저장 오류:', error)
    return c.json({ error: '설정 저장 중 오류가 발생했습니다.' }, 500)
  }
})

// Worker 수동 트리거
betting.post('/admin/trigger-collect', async (c) => {
  try {
    const { mode } = await c.req.json() // 'daily' or 'weekly'
    const workerUrl = c.req.header('X-Worker-URL') || ''
    
    if (!workerUrl) {
      return c.json({ error: 'Worker URL이 설정되지 않았습니다.' }, 400)
    }
    
    const endpoint = mode === 'weekly' ? '/trigger/weekly' : '/trigger'
    const response = await fetch(`${workerUrl}${endpoint}`)
    const result = await response.json()
    
    return c.json(result)
  } catch (error) {
    console.error('수집 트리거 오류:', error)
    return c.json({ error: '수집 트리거 중 오류가 발생했습니다.' }, 500)
  }
})

// ==========================================
// 정산 관리 (관리자 승인 시스템)
// ==========================================

// 정산 대기 목록 조회
betting.get('/settlements/pending', async (c) => {
  try {
    const { results: settlements } = await c.env.DB.prepare(`
      SELECT 
        bf.id as folder_id,
        bf.folder_number,
        bf.folder_type,
        bf.total_bet_amount,
        bf.frozen_amount,
        bf.result,
        bf.settlement_status,
        bf.created_at as settled_at,
        m.name as member_name,
        m.id as member_id,
        t.id as ticket_id
      FROM bet_folders bf
      JOIN members m ON bf.member_id = m.id
      LEFT JOIN tickets t ON bf.ticket_id = t.id
      WHERE bf.settlement_status = 'settled'
      AND bf.result = 'win'
      ORDER BY bf.created_at DESC
    `).all()
    
    // 각 폴더의 경기 내역 조회
    for (const settlement of settlements || []) {
      const { results: bets } = await c.env.DB.prepare(`
        SELECT 
          b.bet_type,
          b.odds,
          b.result,
          m.match_name,
          m.home_team,
          m.away_team,
          m.home_score,
          m.away_score
        FROM bets b
        JOIN matches m ON b.match_id = m.id
        WHERE b.folder_id = ?
      `).bind(settlement.folder_id).all()
      
      ;(settlement as any).matches = bets
    }
    
    return c.json({ settlements: settlements || [] })
  } catch (error) {
    console.error('정산 대기 목록 조회 오류:', error)
    return c.json({ error: '정산 목록을 불러오는데 실패했습니다.' }, 500)
  }
})

// 정산 승인
betting.post('/settlements/:id/approve', async (c) => {
  try {
    const folderId = c.req.param('id')
    const body = await c.req.json()
    const { approved_by } = body
    
    if (!approved_by) {
      return c.json({ error: '승인자 ID가 필요합니다.' }, 400)
    }
    
    // 폴더 정보 조회
    const folder = await c.env.DB.prepare(`
      SELECT * FROM bet_folders WHERE id = ?
    `).bind(folderId).first()
    
    if (!folder) {
      return c.json({ error: '폴더를 찾을 수 없습니다.' }, 404)
    }
    
    const folderData = folder as any
    
    if (folderData.settlement_status !== 'settled') {
      return c.json({ error: '정산 대기 상태가 아닙니다.' }, 400)
    }
    
    // 트랜잭션 시작
    // 1. 폴더 상태 업데이트
    await c.env.DB.prepare(`
      UPDATE bet_folders 
      SET settlement_status = 'approved',
          approved_by = ?,
          approved_at = datetime('now')
      WHERE id = ?
    `).bind(approved_by, folderId).run()
    
    // 2. 회원에게 포인트 지급 및 잔액 조회
    await c.env.DB.prepare(`
      UPDATE members 
      SET betting_points = betting_points + ?
      WHERE id = ?
    `).bind(folderData.frozen_amount, folderData.member_id).run()
    
    // 포인트 지급 후 잔액 조회
    const member = await c.env.DB.prepare(`
      SELECT points, betting_points FROM members WHERE id = ?
    `).bind(folderData.member_id).first() as any
    
    // 3. 당첨 알림 생성 (티켓이 있는 경우)
    if (folderData.ticket_id) {
      // 배팅 내역 조회 (경기 정보 포함)
      const { results: bets } = await c.env.DB.prepare(`
        SELECT 
          b.bet_type,
          b.odds,
          m.match_name,
          m.home_team,
          m.away_team,
          m.home_score,
          m.away_score,
          m.match_date
        FROM bets b
        JOIN matches m ON b.match_id = m.id
        WHERE b.folder_id = ?
      `).bind(folderId).all()
      
      const isSingle = folderData.folder_type === 'single'
      const betAmount = Number(folderData.total_bet_amount)
      
      // 총 배당률 계산
      let totalOdds = 1.0
      for (const bet of bets) {
        totalOdds *= Number(bet.odds)
      }
      
      // 적용 배당 계산 (단폴더 패널티)
      let appliedOdds = totalOdds
      if (isSingle) {
        if (totalOdds < 1.5) {
          appliedOdds = totalOdds - 0.1
        } else {
          appliedOdds = totalOdds - 0.15
        }
      }
      
      // 총 당첨금 계산 (배팅금 x 적용 배당)
      const grossWin = betAmount * appliedOdds
      
      // 수수료 계산
      let fee = 0
      const netWin = grossWin - betAmount  // 순수 당첨금 (배팅금 제외)
      
      if (isSingle) {
        // 단폴더: 기본 2만원 + 순수익 마진
        fee = 20000
        if (netWin < 500000) {
          fee += netWin * 0.05  // 5%
        } else {
          fee += netWin * 0.08  // 8%
        }
      } else {
        // 다폴더: 순수익 마진만
        if (netWin < 500000) {
          fee = netWin * 0.05  // 5%
        } else {
          fee = netWin * 0.08  // 8%
        }
      }
      
      // 최종 당첨금
      const finalWin = grossWin - fee
      
      // 경기 내역 문자열 생성
      const matchDetails = bets.map((bet, idx) => {
        const betTypeText = {
          'home_win': '홈승',
          'away_win': '원정승',
          'draw': '무승부',
          'over': '오버',
          'under': '언더',
          'handicap_home': '핸디캡 홈',
          'handicap_away': '핸디캡 원정'
        }[bet.bet_type] || bet.bet_type
        
        const matchDateStr = new Date(bet.match_date).toLocaleDateString('ko-KR', { 
          month: 'long', 
          day: 'numeric' 
        })
        
        return `${idx + 1}. ${matchDateStr} ${bet.match_name || `${bet.home_team} vs ${bet.away_team}`} (${betTypeText}, 배당 ${bet.odds})`
      }).join('\n')
      
      // 총 포인트 계산 (일반 포인트 + 배팅 포인트)
      const totalPoints = Number(member.points || 0) + Number(member.betting_points || 0)
      
      const winMessage = `🎉 축하합니다! 당첨되었습니다!

📅 적중 경기:
${matchDetails}

💰 정산 내역:
- 배팅금: ${betAmount.toLocaleString()}원
- 적용 배당: ${appliedOdds.toFixed(2)}배
- 당첨금: ${grossWin.toLocaleString()}원
- 수수료: ${fee.toLocaleString()}원
- 총 당첨금: ${finalWin.toLocaleString()}원

💳 현재 잔여 포인트: ${totalPoints.toLocaleString()}원

✅ 배팅 포인트가 지급되었습니다.`
      
      // 오늘 날짜
      const today = new Date().toISOString().split('T')[0]
      
      // 오늘 생성된 response 타입 답변이 있는지 확인
      const existingResponse = await c.env.DB.prepare(`
        SELECT id, content 
        FROM ticket_comments 
        WHERE ticket_id = ? 
          AND comment_type = 'response'
          AND DATE(created_at) = ?
        ORDER BY created_at DESC
        LIMIT 1
      `).bind(folderData.ticket_id, today).first()
      
      if (existingResponse) {
        // 기존 답변이 있으면 내용 추가
        const updatedContent = (existingResponse as any).content + '\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n' + winMessage
        
        await c.env.DB.prepare(`
          UPDATE ticket_comments 
          SET content = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `).bind(updatedContent, (existingResponse as any).id).run()
      } else {
        // 새로운 답변 생성
        await c.env.DB.prepare(`
          INSERT INTO ticket_comments (ticket_id, content, comment_type, created_by, created_at)
          VALUES (?, ?, 'response', ?, datetime('now'))
        `).bind(folderData.ticket_id, winMessage, approved_by).run()
      }
    }
    
    return c.json({ 
      success: true, 
      message: '정산이 승인되었습니다.',
      folder_id: folderId,
      amount: folderData.frozen_amount
    })
  } catch (error) {
    console.error('정산 승인 오류:', error)
    return c.json({ error: '정산 승인에 실패했습니다.' }, 500)
  }
})

// 정산 반려
betting.post('/settlements/:id/reject', async (c) => {
  try {
    const folderId = c.req.param('id')
    const body = await c.req.json()
    const { approved_by, rejection_reason } = body
    
    if (!approved_by || !rejection_reason) {
      return c.json({ error: '승인자 ID와 반려 사유가 필요합니다.' }, 400)
    }
    
    // 폴더 정보 조회
    const folder = await c.env.DB.prepare(`
      SELECT * FROM bet_folders WHERE id = ?
    `).bind(folderId).first()
    
    if (!folder) {
      return c.json({ error: '폴더를 찾을 수 없습니다.' }, 404)
    }
    
    const folderData = folder as any
    
    if (folderData.settlement_status !== 'settled') {
      return c.json({ error: '정산 대기 상태가 아닙니다.' }, 400)
    }
    
    // 폴더 상태 업데이트 (반려)
    await c.env.DB.prepare(`
      UPDATE bet_folders 
      SET settlement_status = 'rejected',
          approved_by = ?,
          approved_at = datetime('now'),
          rejection_reason = ?,
          frozen_amount = 0
      WHERE id = ?
    `).bind(approved_by, rejection_reason, folderId).run()
    
    return c.json({ 
      success: true, 
      message: '정산이 반려되었습니다.',
      folder_id: folderId,
      reason: rejection_reason
    })
  } catch (error) {
    console.error('정산 반려 오류:', error)
    return c.json({ error: '정산 반려에 실패했습니다.' }, 500)
  }
})

// 정산 완료 목록 조회
betting.get('/settlements/approved', async (c) => {
  try {
    const { results: settlements } = await c.env.DB.prepare(`
      SELECT 
        bf.id as folder_id,
        bf.folder_number,
        bf.folder_type,
        bf.total_bet_amount,
        bf.frozen_amount,
        bf.approved_at,
        m.name as member_name,
        s.name as approved_by_name
      FROM bet_folders bf
      JOIN members m ON bf.member_id = m.id
      LEFT JOIN staff s ON bf.approved_by = s.id
      WHERE bf.settlement_status = 'approved'
      ORDER BY bf.approved_at DESC
      LIMIT 100
    `).all()
    
    return c.json({ settlements: settlements || [] })
  } catch (error) {
    console.error('정산 완료 목록 조회 오류:', error)
    return c.json({ error: '정산 목록을 불러오는데 실패했습니다.' }, 500)
  }
})

// ==========================================
// 경기 결과 자동 크롤링 및 정산
// ==========================================

// 경기 결과 자동 업데이트 (GitHub Actions에서 호출)
betting.post('/matches/auto-update-results', verifyToken, async (c) => {
  try {
    // 진행 중 또는 오픈 상태인 경기 중 경기 시간이 지난 것들 조회
    const { results: matches } = await c.env.DB.prepare(
      `SELECT * FROM matches 
       WHERE status IN ('open', 'in_progress') 
       AND datetime(match_date) < datetime('now')
       ORDER BY match_date DESC
       LIMIT 50`
    ).all()

    if (!matches || matches.length === 0) {
      return c.json({ message: '업데이트할 경기가 없습니다.', updated: 0 })
    }

    let updated = 0
    let failed = 0
    const results = []

    // API-SPORT.IO에서 경기 결과 가져오기
    const API_KEY = c.env.API_SPORT_KEY || 'your-api-key'
    
    for (const match of matches) {
      try {
        // external_id가 있는 경우에만 크롤링 시도
        if (!match.external_id) {
          continue
        }

        // API-SPORT.IO 호출
        const apiUrl = `https://v3.football.api-sports.io/fixtures?id=${match.external_id}`
        const response = await fetch(apiUrl, {
          headers: {
            'x-apisports-key': API_KEY
          }
        })

        if (!response.ok) {
          failed++
          results.push({ 
            match_id: match.id, 
            match_name: match.match_name,
            status: 'failed', 
            error: 'API 호출 실패' 
          })
          continue
        }

        const data = await response.json()
        const fixture = data.response?.[0]

        if (!fixture) {
          failed++
          results.push({ 
            match_id: match.id, 
            match_name: match.match_name,
            status: 'failed', 
            error: '경기 데이터 없음' 
          })
          continue
        }

        // 경기 상태 확인
        const fixtureStatus = fixture.fixture.status.short
        const isFinished = ['FT', 'AET', 'PEN'].includes(fixtureStatus)

        if (!isFinished) {
          // 아직 종료되지 않음
          if (fixtureStatus === 'LIVE' || fixtureStatus === '1H' || fixtureStatus === '2H' || fixtureStatus === 'HT') {
            // 진행 중으로 상태 업데이트
            await c.env.DB.prepare(
              `UPDATE matches SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
            ).bind(match.id).run()
          }
          continue
        }

        // 경기 결과 가져오기
        const homeScore = fixture.goals.home
        const awayScore = fixture.goals.away
        const totalScore = homeScore + awayScore

        let result = 'draw'
        if (homeScore > awayScore) {
          result = 'home_win'
        } else if (awayScore > homeScore) {
          result = 'away_win'
        }

        // 경기 결과 업데이트
        await c.env.DB.prepare(
          `UPDATE matches 
           SET result = ?, home_score = ?, away_score = ?, total_score = ?, 
               status = 'completed', updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`
        ).bind(result, homeScore, awayScore, totalScore, match.id).run()

        // 배팅 결과 처리
        await processMatchBets(c.env.DB, match.id, result, homeScore, awayScore, totalScore)

        updated++
        results.push({ 
          match_id: match.id, 
          match_name: match.match_name,
          status: 'success', 
          result,
          score: `${homeScore}-${awayScore}` 
        })

      } catch (error) {
        failed++
        results.push({ 
          match_id: match.id, 
          match_name: match.match_name,
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    return c.json({ 
      message: '경기 결과 자동 업데이트 완료',
      total: matches.length,
      updated,
      failed,
      results 
    })
  } catch (error) {
    console.error('경기 결과 자동 업데이트 오류:', error)
    return c.json({ error: '경기 결과 자동 업데이트 중 오류가 발생했습니다.' }, 500)
  }
})

// 배팅 결과 처리 헬퍼 함수
async function processMatchBets(
  db: D1Database, 
  matchId: number, 
  result: string, 
  homeScore: number, 
  awayScore: number, 
  totalScore: number
) {
  // 이 경기와 관련된 모든 배팅 찾기
  const { results: bets } = await db.prepare(
    `SELECT b.*, bf.id as folder_id, bf.member_id, bf.folder_type
     FROM bets b
     JOIN bet_folders bf ON b.folder_id = bf.id
     WHERE b.match_id = ? AND b.status = 'pending'`
  ).bind(matchId).all()

  // 각 배팅의 승패 판정
  for (const bet of bets || []) {
    let betStatus = 'lose'

    // 승무패 배팅
    if (bet.bet_type === 'win_draw_lose') {
      if (bet.selection === 'home' && result === 'home_win') betStatus = 'win'
      else if (bet.selection === 'away' && result === 'away_win') betStatus = 'win'
      else if (bet.selection === 'draw' && result === 'draw') betStatus = 'win'
    }
    // 오버/언더 배팅
    else if (bet.bet_type === 'over_under') {
      const line = parseFloat(bet.line || '0')
      if (bet.selection === 'over' && totalScore > line) betStatus = 'win'
      else if (bet.selection === 'under' && totalScore < line) betStatus = 'win'
    }
    // 핸디캡 배팅
    else if (bet.bet_type === 'handicap') {
      const handicap = parseFloat(bet.line || '0')
      const adjustedHomeScore = homeScore + handicap
      if (bet.selection === 'home' && adjustedHomeScore > awayScore) betStatus = 'win'
      else if (bet.selection === 'away' && awayScore > adjustedHomeScore) betStatus = 'win'
    }

    // 배팅 상태 업데이트
    await db.prepare(
      'UPDATE bets SET status = ? WHERE id = ?'
    ).bind(betStatus, bet.id).run()

    // 폴더 전체 상태 확인 및 업데이트
    const folderId = bet.folder_id
    const { results: folderBets } = await db.prepare(
      'SELECT * FROM bets WHERE folder_id = ?'
    ).bind(folderId).all()

    if (folderBets && folderBets.length > 0) {
      const allCompleted = folderBets.every((b: any) => b.status !== 'pending')
      
      if (allCompleted) {
        const allWin = folderBets.every((b: any) => b.status === 'win')
        const anyLose = folderBets.some((b: any) => b.status === 'lose')

        // 폴더 타입에 따라 정산
        const folderInfo = await db.prepare(
          'SELECT * FROM bet_folders WHERE id = ?'
        ).bind(folderId).first()

        if (!folderInfo) continue

        if (folderInfo.folder_type === 'single' && anyLose) {
          // 단폴더: 하나라도 실패하면 환불
          await db.prepare(
            `UPDATE bet_folders 
             SET status = 'refund', result_status = 'partial_win', settlement_amount = total_bet_amount
             WHERE id = ?`
          ).bind(folderId).run()

          // 포인트 환불
          await db.prepare(
            `UPDATE members SET betting_points = betting_points + ? WHERE id = ?`
          ).bind(folderInfo.total_bet_amount, folderInfo.member_id).run()
        } else if (allWin) {
          // 전체 승리: 정산 대기 상태로 변경
          await db.prepare(
            `UPDATE bet_folders 
             SET status = 'win', result_status = 'all_win', 
                 settlement_amount = potential_win, settlement_status = 'pending'
             WHERE id = ?`
          ).bind(folderId).run()
        } else {
          // 하나라도 실패하면 패배
          await db.prepare(
            `UPDATE bet_folders 
             SET status = 'lose', result_status = 'all_lose', settlement_amount = 0
             WHERE id = ?`
          ).bind(folderId).run()
        }
      }
    }
  }
}

export default betting
