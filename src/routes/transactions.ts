import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  TELEGRAM_BOT_TOKEN: string
  TELEGRAM_CHAT_ID: string
}

const transactions = new Hono<{ Bindings: Bindings }>()

// 테이블 초기화 함수
async function initTables(db: D1Database) {
  try {
    // transactions 테이블
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        depositor_name TEXT,
        account_number TEXT,
        bank_name TEXT,
        transaction_date DATETIME NOT NULL,
        member_id INTEGER,
        match_confidence REAL DEFAULT 0,
        telegram_message_id INTEGER,
        source TEXT DEFAULT 'manual',
        approval_status TEXT DEFAULT 'pending',
        approved_by INTEGER,
        approved_at DATETIME,
        rejection_reason TEXT,
        matched_by INTEGER,
        matched_at DATETIME,
        memo TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()

    // pending_deposits 테이블
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS pending_deposits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL,
        depositor_name TEXT NOT NULL,
        amount INTEGER NOT NULL,
        transaction_date DATETIME NOT NULL,
        suggested_member_id INTEGER,
        suggestion_reason TEXT,
        match_score REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        processed_by INTEGER,
        processed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()

    // 인덱스 생성
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type)').run()
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date)').run()
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(approval_status)').run()
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_pending_deposits_status ON pending_deposits(status)').run()
  } catch (error) {
    console.error('테이블 초기화 오류:', error)
  }
}

// 텔레그램 입출금 메시지 파싱
function parseBankNotification(message: string): {
  type: 'deposit' | 'withdrawal' | 'unknown'
  amount: number
  depositorName?: string
  accountNumber?: string
  bankName?: string
  transactionDate: Date
} | null {
  // 입금 패턴: [입금] 1,000,000원 / 홍길동 / 국민은행 123-45-678901 / 2024.02.23 14:30
  const depositPattern = /\[입금\]\s*([0-9,]+)원?\s*\/\s*([^\s\/]+)\s*\/\s*([^\s]+)\s+([0-9-]+)\s*\/\s*(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})/
  const depositMatch = message.match(depositPattern)
  
  if (depositMatch) {
    const [_, amountStr, depositorName, bankAndAccount, accountNumber, year, month, day, hour, minute] = depositMatch
    const amount = parseInt(amountStr.replace(/,/g, ''))
    const bankName = bankAndAccount.split(' ')[0]
    const transactionDate = new Date(
      parseInt(year), 
      parseInt(month) - 1, 
      parseInt(day), 
      parseInt(hour), 
      parseInt(minute)
    )
    
    return {
      type: 'deposit',
      amount,
      depositorName,
      accountNumber,
      bankName,
      transactionDate
    }
  }
  
  // 출금 패턴: [출금] 500,000원 / 김철수 / 신한은행 110-123-456789 / 2024.02.23 15:45
  const withdrawalPattern = /\[출금\]\s*([0-9,]+)원?\s*\/\s*([^\s\/]+)\s*\/\s*([^\s]+)\s+([0-9-]+)\s*\/\s*(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})/
  const withdrawalMatch = message.match(withdrawalPattern)
  
  if (withdrawalMatch) {
    const [_, amountStr, depositorName, bankAndAccount, accountNumber, year, month, day, hour, minute] = withdrawalMatch
    const amount = parseInt(amountStr.replace(/,/g, ''))
    const bankName = bankAndAccount.split(' ')[0]
    const transactionDate = new Date(
      parseInt(year), 
      parseInt(month) - 1, 
      parseInt(day), 
      parseInt(hour), 
      parseInt(minute)
    )
    
    return {
      type: 'withdrawal',
      amount,
      depositorName,
      accountNumber,
      bankName,
      transactionDate
    }
  }
  
  // 간단한 입금 패턴: 입금 1000000 홍길동
  const simpleDepositPattern = /입금\s+([0-9,]+)\s+([^\s]+)/
  const simpleMatch = message.match(simpleDepositPattern)
  
  if (simpleMatch) {
    const [_, amountStr, depositorName] = simpleMatch
    const amount = parseInt(amountStr.replace(/,/g, ''))
    
    return {
      type: 'deposit',
      amount,
      depositorName,
      transactionDate: new Date()
    }
  }
  
  return null
}

// 입금자명으로 회원 자동 매칭
async function matchMemberByName(db: D1Database, depositorName: string): Promise<{
  memberId: number | null
  confidence: number
  reason: string
}> {
  try {
    // 정확한 이름 매칭
    const exactMatch = await db.prepare(`
      SELECT id, name FROM members 
      WHERE name = ? OR inmate_number LIKE ?
      LIMIT 1
    `).bind(depositorName, `%${depositorName}%`).first()
    
    if (exactMatch) {
      return {
        memberId: exactMatch.id as number,
        confidence: 1.0,
        reason: `정확한 이름 매칭: ${exactMatch.name}`
      }
    }
    
    // 부분 매칭 (성씨 + 이름 일부)
    const partialMatch = await db.prepare(`
      SELECT id, name FROM members 
      WHERE name LIKE ?
      LIMIT 5
    `).bind(`%${depositorName}%`).all()
    
    if (partialMatch.results && partialMatch.results.length > 0) {
      const firstMatch = partialMatch.results[0]
      return {
        memberId: firstMatch.id as number,
        confidence: 0.7,
        reason: `부분 매칭: ${firstMatch.name} (${partialMatch.results.length}개 후보)`
      }
    }
    
    // 최근 입금 이력 기반 매칭
    const recentMatch = await db.prepare(`
      SELECT m.id, m.name, COUNT(*) as count
      FROM transactions t
      JOIN members m ON t.member_id = m.id
      WHERE t.depositor_name = ? AND t.transaction_type = 'deposit'
      GROUP BY m.id
      ORDER BY count DESC
      LIMIT 1
    `).bind(depositorName).first()
    
    if (recentMatch) {
      return {
        memberId: recentMatch.id as number,
        confidence: 0.9,
        reason: `이전 입금 이력 기반: ${recentMatch.name} (${recentMatch.count}회)`
      }
    }
    
    return {
      memberId: null,
      confidence: 0,
      reason: '매칭되는 회원을 찾을 수 없습니다'
    }
  } catch (error) {
    console.error('회원 매칭 오류:', error)
    return {
      memberId: null,
      confidence: 0,
      reason: '매칭 중 오류 발생'
    }
  }
}

// 텔레그램 webhook에서 입출금 자동 처리
transactions.post('/telegram/process', async (c) => {
  try {
    const { message, message_id } = await c.req.json()
    
    if (!message) {
      return c.json({ error: '메시지가 없습니다' }, 400)
    }
    
    // 메시지 파싱
    const parsed = parseBankNotification(message)
    
    if (!parsed) {
      return c.json({ 
        success: false, 
        message: '입출금 정보를 파싱할 수 없습니다',
        original_message: message
      })
    }
    
    // 회원 자동 매칭 (입금인 경우)
    let matchResult = { memberId: null, confidence: 0, reason: '' }
    if (parsed.type === 'deposit' && parsed.depositorName) {
      matchResult = await matchMemberByName(c.env.DB, parsed.depositorName)
    }
    
    // 거래 기록 저장
    const transactionResult = await c.env.DB.prepare(`
      INSERT INTO transactions (
        transaction_type, amount, depositor_name, account_number, bank_name,
        transaction_date, member_id, match_confidence, telegram_message_id,
        source, approval_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'telegram', 'pending')
    `).bind(
      parsed.type,
      parsed.amount,
      parsed.depositorName || null,
      parsed.accountNumber || null,
      parsed.bankName || null,
      parsed.transactionDate.toISOString(),
      matchResult.memberId,
      matchResult.confidence,
      message_id || null
    ).run()
    
    const transactionId = transactionResult.meta.last_row_id
    
    // 입금이고 매칭이 불확실한 경우 대기 큐에 추가
    if (parsed.type === 'deposit' && matchResult.confidence < 0.9) {
      await c.env.DB.prepare(`
        INSERT INTO pending_deposits (
          transaction_id, depositor_name, amount, transaction_date,
          suggested_member_id, suggestion_reason, match_score, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
      `).bind(
        transactionId,
        parsed.depositorName || '알 수 없음',
        parsed.amount,
        parsed.transactionDate.toISOString(),
        matchResult.memberId,
        matchResult.reason,
        matchResult.confidence
      ).run()
    }
    
    // 텔레그램 알림 전송
    const notificationMessage = `
🔔 ${parsed.type === 'deposit' ? '입금' : '출금'} 알림

💰 금액: ${parsed.amount.toLocaleString()}원
👤 ${parsed.type === 'deposit' ? '입금자' : '출금자'}: ${parsed.depositorName || '-'}
🏦 은행: ${parsed.bankName || '-'}
📅 일시: ${parsed.transactionDate.toLocaleString('ko-KR')}

${matchResult.memberId 
  ? `✅ 회원 자동 매칭 (${(matchResult.confidence * 100).toFixed(0)}%)\n${matchResult.reason}` 
  : '⚠️ 회원 매칭 필요'}

📋 거래 ID: ${transactionId}
    `.trim()
    
    // 텔레그램으로 알림 전송 (TELEGRAM_BOT_TOKEN이 있는 경우)
    if (c.env.TELEGRAM_BOT_TOKEN && c.env.TELEGRAM_CHAT_ID) {
      try {
        await fetch(`https://api.telegram.org/bot${c.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: c.env.TELEGRAM_CHAT_ID,
            text: notificationMessage,
            parse_mode: 'HTML'
          })
        })
      } catch (error) {
        console.error('텔레그램 알림 전송 오류:', error)
      }
    }
    
    return c.json({
      success: true,
      transaction_id: transactionId,
      parsed,
      match: matchResult,
      needs_manual_review: matchResult.confidence < 0.9
    })
  } catch (error: any) {
    console.error('입출금 처리 오류:', error)
    return c.json({ error: '입출금 처리 실패', details: error.message }, 500)
  }
})

// 미확인 입금 목록 조회
transactions.get('/pending', async (c) => {
  try {
    // 테이블 초기화 (첫 요청 시)
    await initTables(c.env.DB)
    
    const result = await c.env.DB.prepare(`
      SELECT 
        pd.*,
        t.amount, t.depositor_name, t.bank_name, t.account_number, t.transaction_date,
        m.name as suggested_member_name,
        m.inmate_number as suggested_inmate_number
      FROM pending_deposits pd
      JOIN transactions t ON pd.transaction_id = t.id
      LEFT JOIN members m ON pd.suggested_member_id = m.id
      WHERE pd.status = 'pending'
      ORDER BY pd.created_at DESC
    `).all()
    
    return c.json(result.results || [])
  } catch (error: any) {
    console.error('미확인 입금 조회 오류:', error)
    return c.json({ error: '미확인 입금 조회 실패', details: error.message }, 500)
  }
})

// 입금 수동 매칭
transactions.post('/pending/:id/match', async (c) => {
  try {
    const pendingId = parseInt(c.req.param('id'))
    const { member_id, staff_id } = await c.req.json()
    
    if (!member_id) {
      return c.json({ error: '회원 ID가 필요합니다' }, 400)
    }
    
    // pending_deposits 상태 업데이트
    await c.env.DB.prepare(`
      UPDATE pending_deposits 
      SET status = 'confirmed', processed_by = ?, processed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(staff_id, pendingId).run()
    
    // transactions 테이블에 회원 매칭 정보 업데이트
    const pending = await c.env.DB.prepare(`
      SELECT transaction_id FROM pending_deposits WHERE id = ?
    `).bind(pendingId).first()
    
    if (pending) {
      await c.env.DB.prepare(`
        UPDATE transactions 
        SET member_id = ?, match_confidence = 1.0, matched_by = ?, matched_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(member_id, staff_id, pending.transaction_id).run()
    }
    
    return c.json({ success: true, message: '입금 매칭이 완료되었습니다' })
  } catch (error: any) {
    console.error('입금 매칭 오류:', error)
    return c.json({ error: '입금 매칭 실패', details: error.message }, 500)
  }
})

// 거래 목록 조회
transactions.get('/', async (c) => {
  try {
    const type = c.req.query('type') // 'deposit', 'withdrawal', 'expense'
    const status = c.req.query('status') // 'pending', 'approved', 'rejected'
    const startDate = c.req.query('start_date')
    const endDate = c.req.query('end_date')
    const memberId = c.req.query('member_id')
    
    let query = `
      SELECT 
        t.*,
        m.name as member_name,
        m.inmate_number,
        s.name as approved_by_name
      FROM transactions t
      LEFT JOIN members m ON t.member_id = m.id
      LEFT JOIN staff s ON t.approved_by = s.id
      WHERE 1=1
    `
    const params: any[] = []
    
    if (type) {
      query += ` AND t.transaction_type = ?`
      params.push(type)
    }
    
    if (status) {
      query += ` AND t.approval_status = ?`
      params.push(status)
    }
    
    if (startDate) {
      query += ` AND DATE(t.transaction_date) >= ?`
      params.push(startDate)
    }
    
    if (endDate) {
      query += ` AND DATE(t.transaction_date) <= ?`
      params.push(endDate)
    }
    
    if (memberId) {
      query += ` AND t.member_id = ?`
      params.push(parseInt(memberId))
    }
    
    query += ` ORDER BY t.transaction_date DESC LIMIT 100`
    
    const stmt = c.env.DB.prepare(query)
    const result = await stmt.bind(...params).all()
    
    return c.json(result.results || [])
  } catch (error: any) {
    console.error('거래 조회 오류:', error)
    return c.json({ error: '거래 조회 실패', details: error.message }, 500)
  }
})

// 거래 승인
transactions.post('/:id/approve', async (c) => {
  try {
    const transactionId = parseInt(c.req.param('id'))
    const { staff_id, memo } = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE transactions 
      SET 
        approval_status = 'approved',
        approved_by = ?,
        approved_at = CURRENT_TIMESTAMP,
        memo = COALESCE(?, memo)
      WHERE id = ?
    `).bind(staff_id, memo || null, transactionId).run()
    
    return c.json({ success: true, message: '거래가 승인되었습니다' })
  } catch (error: any) {
    console.error('거래 승인 오류:', error)
    return c.json({ error: '거래 승인 실패', details: error.message }, 500)
  }
})

// 거래 거부
transactions.post('/:id/reject', async (c) => {
  try {
    const transactionId = parseInt(c.req.param('id'))
    const { staff_id, reason } = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE transactions 
      SET 
        approval_status = 'rejected',
        approved_by = ?,
        approved_at = CURRENT_TIMESTAMP,
        rejection_reason = ?
      WHERE id = ?
    `).bind(staff_id, reason || '사유 없음', transactionId).run()
    
    return c.json({ success: true, message: '거래가 거부되었습니다' })
  } catch (error: any) {
    console.error('거래 거부 오류:', error)
    return c.json({ error: '거래 거부 실패', details: error.message }, 500)
  }
})

// 경비 등록
transactions.post('/:id/expense', async (c) => {
  try {
    const transactionId = parseInt(c.req.param('id'))
    const { category, subcategory, description, amount } = await c.req.json()
    
    await c.env.DB.prepare(`
      INSERT INTO expense_items (transaction_id, category, subcategory, description, amount)
      VALUES (?, ?, ?, ?, ?)
    `).bind(transactionId, category, subcategory || null, description, amount).run()
    
    // 거래 카테고리 업데이트
    await c.env.DB.prepare(`
      UPDATE transactions SET category = ? WHERE id = ?
    `).bind(`expense_${category}`, transactionId).run()
    
    return c.json({ success: true, message: '경비가 등록되었습니다' })
  } catch (error: any) {
    console.error('경비 등록 오류:', error)
    return c.json({ error: '경비 등록 실패', details: error.message }, 500)
  }
})

// 통계 조회
transactions.get('/stats', async (c) => {
  try {
    // 테이블 초기화 (첫 요청 시)
    await initTables(c.env.DB)
    
    const startDate = c.req.query('start_date')
    const endDate = c.req.query('end_date')
    
    const params: any[] = []
    let dateFilter = ''
    
    if (startDate && endDate) {
      dateFilter = ` AND DATE(transaction_date) BETWEEN ? AND ?`
      params.push(startDate, endDate)
    }
    
    // 입출금 통계
    const stmt1 = c.env.DB.prepare(`
      SELECT 
        transaction_type,
        approval_status,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM transactions
      WHERE 1=1 ${dateFilter}
      GROUP BY transaction_type, approval_status
    `)
    const stats = await stmt1.bind(...params).all()
    
    // 미확인 입금 수
    const pendingCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM pending_deposits WHERE status = 'pending'
    `).first()
    
    return c.json({
      stats: stats.results || [],
      pending_deposits: pendingCount?.count || 0
    })
  } catch (error: any) {
    console.error('통계 조회 오류:', error)
    return c.json({ error: '통계 조회 실패', details: error.message }, 500)
  }
})

export default transactions
