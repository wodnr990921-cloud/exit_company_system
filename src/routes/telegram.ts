import { Hono } from 'hono'
import type { Context } from 'hono'

type Bindings = {
  DB: D1Database
  TELEGRAM_ADMIN_BOT_TOKEN: string
  TELEGRAM_STAFF_BOT_TOKEN: string
  TELEGRAM_CHANNEL_ID: string
  TELEGRAM_ADMIN_USER_ID: string
  TELEGRAM_STAFF_USER_IDS: string
  TELEGRAM_PARSER_BOT_TOKEN: string
}

const telegram = new Hono<{ Bindings: Bindings }>()

// 텔레그램 API 호출
async function sendTelegramMessage(
  botToken: string, 
  chatId: string, 
  text: string, 
  options: {
    parse_mode?: 'Markdown' | 'HTML'
    reply_markup?: any
  } = {}
) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options.parse_mode || 'Markdown',
      reply_markup: options.reply_markup
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Telegram API Error: ${error.description || 'Unknown error'}`)
  }
  
  return await response.json()
}

// 인라인 키보드 버튼 생성
function createInlineKeyboard(buttons: { text: string, callback_data: string }[][]) {
  return {
    inline_keyboard: buttons
  }
}

// Admin Bot Webhook (승인 기능 포함)
telegram.post('/webhook/admin', async (c: Context) => {
  try {
    const update = await c.req.json()
    console.log('📱 [Admin Bot] Webhook:', update)
    
    const db = c.env.DB
    const adminBotToken = c.env.TELEGRAM_ADMIN_BOT_TOKEN
    const adminUserId = c.env.TELEGRAM_ADMIN_USER_ID
    const channelId = c.env.TELEGRAM_CHANNEL_ID
    
    // Channel post 처리 (채널에서 온 메시지)
    if (update.channel_post) {
      const message = update.channel_post
      const text = message.text
      
      if (text) {
        // 채널 명령어 처리
        await handleChannelCommand(db, adminBotToken, channelId, text, adminUserId)
      }
      
      return c.json({ ok: true })
    }
    
    // Callback query 처리 (인라인 버튼 클릭)
    if (update.callback_query) {
      const callbackQuery = update.callback_query
      const chatId = callbackQuery.message.chat.id.toString()
      const userId = callbackQuery.from.id.toString()
      const data = callbackQuery.data
      
      // 관리자만 승인 가능
      if (userId !== adminUserId) {
        await fetch(`https://api.telegram.org/bot${adminBotToken}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: callbackQuery.id,
            text: '❌ 권한이 없습니다.',
            show_alert: true
          })
        })
        return c.json({ ok: true })
      }
      
      // 승인/거절 처리
      if (data.startsWith('approve_') || data.startsWith('reject_')) {
        const [action, type, id] = data.split('_')
        await handleApproval(db, adminBotToken, chatId, action, type, id, callbackQuery)
      }
      
      return c.json({ ok: true })
    }
    
    // 일반 메시지 처리
    const message = update.message
    if (!message || !message.text) {
      return c.json({ ok: true })
    }
    
    const chatId = message.chat.id.toString()
    const text = message.text
    const username = message.from.username || message.from.first_name
    
    // 명령어 처리
    if (text.startsWith('/')) {
      await handleAdminCommand(adminBotToken, chatId, text, username, db)
    }
    
    return c.json({ ok: true })
  } catch (error) {
    console.error('[Admin Bot] Webhook 오류:', error)
    return c.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

// Staff Bot Webhook (직원용 정보 조회)
telegram.post('/webhook/staff', async (c: Context) => {
  try {
    const update = await c.req.json()
    console.log('📱 [Staff Bot] Webhook:', update)
    
    const db = c.env.DB
    const staffBotToken = c.env.TELEGRAM_STAFF_BOT_TOKEN
    const staffUserIds = c.env.TELEGRAM_STAFF_USER_IDS?.split(',') || []
    
    // Callback query 처리 (인라인 버튼)
    if (update.callback_query) {
      const callbackQuery = update.callback_query
      const chatId = callbackQuery.message.chat.id.toString()
      const userId = callbackQuery.from.id.toString()
      const data = callbackQuery.data
      
      // 직원 권한 확인
      if (!staffUserIds.includes(userId)) {
        await fetch(`https://api.telegram.org/bot${staffBotToken}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: callbackQuery.id,
            text: '❌ 권한이 없습니다.',
            show_alert: true
          })
        })
        return c.json({ ok: true })
      }
      
      // 출처 확인 처리
      if (data.startsWith('source_')) {
        await handleSourceConfirmation(db, staffBotToken, chatId, data, callbackQuery, userId)
      }
      
      return c.json({ ok: true })
    }
    
    const message = update.message
    if (!message || !message.text) {
      return c.json({ ok: true })
    }
    
    const chatId = message.chat.id.toString()
    const text = message.text
    const username = message.from.username || message.from.first_name
    const userId = message.from.id.toString()
    
    // 명령어 처리
    if (text.startsWith('/')) {
      await handleStaffCommand(staffBotToken, chatId, text, username, db, userId, staffUserIds)
    } else {
      // 일반 메시지는 AI에게 전달
      const reply = `받은 메시지: "${text}"\n\nAI 챗봇 기능은 웹에서 이용해주세요: https://exit-company-system-5je.pages.dev`
      await sendTelegramMessage(staffBotToken, chatId, reply)
    }
    
    return c.json({ ok: true })
  } catch (error) {
    console.error('[Staff Bot] Webhook 오류:', error)
    return c.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

// Admin 명령어 처리
async function handleAdminCommand(botToken: string, chatId: string, command: string, username: string, db: D1Database) {
  const [cmd, ...args] = command.split(' ')
  
  switch (cmd) {
    case '/start':
      await sendTelegramMessage(botToken, chatId, 
        `안녕하세요 ${username}님! 👋\n\n*EXIT COMPANY 관리자 봇*입니다.\n\n사용 가능한 명령어:\n` +
        `/status - 전체 현황\n` +
        `/pending - 대기중인 승인\n` +
        `/transactions - 오늘 입출금\n` +
        `/help - 도움말`
      )
      break
      
    case '/status':
      const stats = await getTicketStats(db)
      const statsMessage = formatStatsMessage(stats)
      await sendTelegramMessage(botToken, chatId, statsMessage)
      break
      
    case '/pending':
      const pending = await getPendingApprovals(db)
      const pendingMessage = formatPendingMessage(pending)
      await sendTelegramMessage(botToken, chatId, pendingMessage)
      break
      
    case '/transactions':
      const transactions = await getTodayTransactions(db)
      const transMessage = formatTransactionsMessage(transactions)
      await sendTelegramMessage(botToken, chatId, transMessage)
      break
      
    case '/help':
      await sendTelegramMessage(botToken, chatId, 
        `*관리자 명령어*\n\n` +
        `/start - 봇 시작\n` +
        `/status - 전체 현황\n` +
        `/pending - 대기중인 승인\n` +
        `/transactions - 오늘 입출금\n` +
        `/help - 이 도움말\n\n` +
        `💡 승인 요청은 인라인 버튼으로 처리하세요.`
      )
      break
      
    default:
      await sendTelegramMessage(botToken, chatId, '알 수 없는 명령어입니다. /help를 입력하세요.')
  }
}

// 채널 명령어 처리 (채널에서 모든 기능 실행 가능)
async function handleChannelCommand(
  db: D1Database,
  botToken: string,
  channelId: string,
  text: string,
  adminUserId: string
) {
  const [cmd, ...args] = text.split(' ')
  
  switch (cmd) {
    case '/status':
      const stats = await getTicketStats(db)
      const statsMessage = formatStatsMessage(stats)
      await sendTelegramMessage(botToken, channelId, statsMessage)
      break
      
    case '/pending':
      const pending = await getPendingApprovals(db)
      const pendingMessage = formatPendingMessage(pending)
      await sendTelegramMessage(botToken, channelId, pendingMessage)
      break
      
    case '/transactions':
      const transactions = await getTodayTransactions(db)
      const transMessage = formatTransactionsMessage(transactions)
      await sendTelegramMessage(botToken, channelId, transMessage)
      break
      
    case '/unconfirmed':
      const unconfirmed = await getUnconfirmedDeposits(db)
      const unconfirmedMsg = formatUnconfirmedDeposits(unconfirmed)
      await sendTelegramMessage(botToken, channelId, unconfirmedMsg)
      break
      
    case '/settle':
      // 자동 정산 실행
      const settleResult = await runAutoSettlement(db, botToken, channelId)
      break
      
    case '/bookkeep':
      // 자동 장부 정리 실행
      const bookkeepResult = await runAutoBookkeeping(db, botToken, channelId)
      break
      
    case '/help':
      await sendTelegramMessage(botToken, channelId, 
        `📱 *채널 명령어*\n\n` +
        `📊 조회:\n` +
        `/status - 전체 현황\n` +
        `/pending - 대기중인 승인\n` +
        `/transactions - 오늘 입출금\n` +
        `/unconfirmed - 미확인 입금\n\n` +
        `⚙️ 자동화:\n` +
        `/settle - 배팅 자동 정산\n` +
        `/bookkeep - 장부 자동 정리\n\n` +
        `💡 채널에서 직접 명령어를 입력하세요!`
      )
      break
  }
}

// Staff 명령어 처리
async function handleStaffCommand(
  botToken: string, 
  chatId: string, 
  command: string, 
  username: string, 
  db: D1Database,
  userId: string,
  staffUserIds: string[]
) {
  const [cmd, ...args] = command.split(' ')
  
  // 권한 확인
  if (!staffUserIds.includes(userId)) {
    await sendTelegramMessage(botToken, chatId, '❌ 권한이 없습니다.')
    return
  }
  
  switch (cmd) {
    case '/start':
      await sendTelegramMessage(botToken, chatId, 
        `안녕하세요 ${username}님! 👋\n\n*EXIT COMPANY 직원 봇*입니다.\n\n사용 가능한 명령어:\n` +
        `/unconfirmed - 미확인 입금 조회\n` +
        `/mytickets - 내 담당 티켓\n` +
        `/price - 가격표 조회\n` +
        `/help - 도움말`
      )
      break
      
    case '/unconfirmed':
      const unconfirmed = await getUnconfirmedDeposits(db)
      const unconfirmedMsg = formatUnconfirmedDeposits(unconfirmed)
      await sendTelegramMessage(botToken, chatId, unconfirmedMsg)
      break
      
    case '/mytickets':
      await sendTelegramMessage(botToken, chatId, '⏳ 내 담당 티켓 조회 기능은 준비 중입니다.')
      break
      
    case '/price':
      const prices = await getPriceTable(db)
      const priceMessage = formatPriceMessage(prices)
      await sendTelegramMessage(botToken, chatId, priceMessage)
      break
      
    case '/help':
      await sendTelegramMessage(botToken, chatId, 
        `*직원 명령어*\n\n` +
        `/start - 봇 시작\n` +
        `/unconfirmed - 미확인 입금 조회\n` +
        `/mytickets - 내 담당 티켓\n` +
        `/price - 가격표 조회\n` +
        `/help - 이 도움말`
      )
      break
      
    default:
      await sendTelegramMessage(botToken, chatId, '알 수 없는 명령어입니다. /help를 입력하세요.')
  }
}

// 티켓 통계 조회
async function getTicketStats(db: D1Database) {
  const [statusStats, todayCount] = await Promise.all([
    db.prepare(`
      SELECT status, COUNT(*) as count
      FROM tickets
      GROUP BY status
    `).all(),
    db.prepare(`
      SELECT COUNT(*) as count
      FROM tickets
      WHERE DATE(created_at) = DATE('now')
    `).first()
  ])
  
  return {
    byStatus: statusStats.results || [],
    today: todayCount?.count || 0
  }
}

// 통계 메시지 포맷
function formatStatsMessage(stats: any) {
  let message = `📊 *오늘 티켓 현황*\n\n`
  message += `오늘 생성: *${stats.today}건*\n\n`
  message += `*상태별 통계:*\n`
  
  const statusMap: any = {
    'open': '미처리',
    'assigned': '배정됨',
    'in_progress': '처리중',
    'pending': '대기중',
    'completed': '완료',
    'closed': '종료'
  }
  
  stats.byStatus.forEach((s: any) => {
    const emoji = s.status === 'open' ? '🆕' : s.status === 'in_progress' ? '⏳' : '✅'
    message += `${emoji} ${statusMap[s.status] || s.status}: ${s.count}건\n`
  })
  
  return message
}

// 알림 전송 API (채널로 방송)
telegram.post('/notify', async (c: Context) => {
  try {
    const { type, data } = await c.req.json()
    const adminBotToken = c.env.TELEGRAM_ADMIN_BOT_TOKEN
    const channelId = c.env.TELEGRAM_CHANNEL_ID
    
    if (!adminBotToken || !channelId) {
      throw new Error('텔레그램 설정이 없습니다.')
    }
    
    let message = ''
    let keyboard = null
    
    switch (type) {
      case 'ticket_created':
        message = `🎫 *신규 티켓 생성*\n\n`
        message += `번호: \`${data.ticket_number}\`\n`
        message += `제목: ${data.title}\n`
        message += `회원: ${data.member_name || '미지정'}\n`
        message += `유형: ${data.ticket_type}\n`
        break
        
      case 'ticket_assigned':
        message = `👤 *티켓 배정*\n\n`
        message += `번호: \`${data.ticket_number}\`\n`
        message += `담당자: ${data.assigned_to_name}\n`
        message += `제목: ${data.title}\n`
        break
        
      case 'approval_request':
        message = `⚠️ *승인 요청*\n\n`
        message += `유형: ${data.type === 'deposit' ? '입금' : data.type === 'withdraw' ? '출금' : data.type}\n`
        message += `회원: ${data.member_name}\n`
        message += `금액: ${Number(data.amount).toLocaleString()}P\n`
        if (data.reason) {
          message += `사유: ${data.reason}\n`
        }
        
        // 승인/거절 버튼 추가
        keyboard = createInlineKeyboard([
          [
            { text: '✅ 승인', callback_data: `approve_${data.type}_${data.id}` },
            { text: '❌ 거절', callback_data: `reject_${data.type}_${data.id}` }
          ]
        ])
        break
        
      case 'betting_result':
        message = `🏆 *배팅 결과*\n\n`
        message += `회원: ${data.member_name}\n`
        message += `결과: ${data.result === 'win' ? '✅ 당첨' : '❌ 낙첨'}\n`
        if (data.result === 'win') {
          message += `당첨금: ${Number(data.winnings).toLocaleString()}P\n`
        }
        break
        
      case 'settlement_complete':
        message = `💰 *정산 완료*\n\n`
        message += `총 처리 건수: ${data.total_count}건\n`
        message += `총 금액: ${Number(data.total_amount).toLocaleString()}P\n`
        break
        
      default:
        message = `📢 알림: ${JSON.stringify(data)}`
    }
    
    await sendTelegramMessage(adminBotToken, channelId, message, { reply_markup: keyboard })
    
    return c.json({ success: true, message: 'Notification sent to channel' })
  } catch (error) {
    console.error('알림 전송 오류:', error)
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500)
  }
})

// 승인 처리
async function handleApproval(
  db: D1Database, 
  botToken: string, 
  chatId: string, 
  action: string, 
  type: string, 
  id: string,
  callbackQuery: any
) {
  try {
    const isApproved = action === 'approve'
    const status = isApproved ? 'approved' : 'rejected'
    
    // DB에서 승인 처리
    if (type === 'deposit' || type === 'withdraw') {
      await db.prepare(`
        UPDATE transactions 
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(status, id).run()
    }
    
    // 콜백 쿼리 응답
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQuery.id,
        text: isApproved ? '✅ 승인되었습니다.' : '❌ 거절되었습니다.',
        show_alert: false
      })
    })
    
    // 메시지 업데이트
    const originalText = callbackQuery.message.text
    const updatedText = originalText + `\n\n${isApproved ? '✅ *승인됨*' : '❌ *거절됨*'} (${new Date().toLocaleString('ko-KR')})`
    
    await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
        text: updatedText,
        parse_mode: 'Markdown'
      })
    })
    
  } catch (error) {
    console.error('승인 처리 오류:', error)
  }
}

// 대기중인 승인 조회
async function getPendingApprovals(db: D1Database) {
  const result = await db.prepare(`
    SELECT * FROM transactions 
    WHERE status = 'pending' 
    ORDER BY created_at DESC 
    LIMIT 10
  `).all()
  
  return result.results || []
}

// 오늘 거래 조회
async function getTodayTransactions(db: D1Database) {
  const result = await db.prepare(`
    SELECT * FROM transactions 
    WHERE DATE(created_at) = DATE('now')
    ORDER BY created_at DESC
  `).all()
  
  return result.results || []
}

// 가격표 조회
async function getPriceTable(db: D1Database) {
  const result = await db.prepare(`
    SELECT * FROM ai_memory 
    WHERE category = 'price' 
    ORDER BY memory_key
  `).all()
  
  return result.results || []
}

// 포맷 함수들
function formatPendingMessage(pending: any[]) {
  if (pending.length === 0) {
    return '✅ 대기중인 승인이 없습니다.'
  }
  
  let message = '⏳ *대기중인 승인*\n\n'
  pending.forEach((t: any) => {
    message += `${t.type === 'deposit' ? '💵' : '💸'} ${t.type === 'deposit' ? '입금' : '출금'}\n`
    message += `금액: ${Number(t.amount).toLocaleString()}P\n`
    message += `회원: ${t.member_name || 'N/A'}\n`
    message += `시간: ${new Date(t.created_at).toLocaleString('ko-KR')}\n`
    message += `\n`
  })
  
  return message
}

function formatTransactionsMessage(transactions: any[]) {
  if (transactions.length === 0) {
    return '📊 오늘 거래 내역이 없습니다.'
  }
  
  let totalDeposit = 0
  let totalWithdraw = 0
  
  transactions.forEach((t: any) => {
    if (t.type === 'deposit' && t.status === 'approved') {
      totalDeposit += Number(t.amount)
    } else if (t.type === 'withdraw' && t.status === 'approved') {
      totalWithdraw += Number(t.amount)
    }
  })
  
  let message = `📊 *오늘 거래 현황*\n\n`
  message += `총 거래: ${transactions.length}건\n`
  message += `💵 입금: ${totalDeposit.toLocaleString()}P\n`
  message += `💸 출금: ${totalWithdraw.toLocaleString()}P\n`
  message += `📈 순수익: ${(totalDeposit - totalWithdraw).toLocaleString()}P\n`
  
  return message
}

// 미확인 입금 조회
async function getUnconfirmedDeposits(db: D1Database) {
  const result = await db.prepare(`
    SELECT * FROM transactions 
    WHERE type = 'deposit' 
    AND status = 'pending'
    AND (member_id IS NULL OR member_name IS NULL)
    ORDER BY created_at DESC 
    LIMIT 10
  `).all()
  
  return result.results || []
}

// 출처 확인 안되는 출금 조회
async function getUnconfirmedWithdrawals(db: D1Database) {
  const result = await db.prepare(`
    SELECT * FROM transactions 
    WHERE type = 'withdraw' 
    AND status = 'pending'
    AND (source IS NULL OR source = '')
    ORDER BY created_at DESC 
    LIMIT 10
  `).all()
  
  return result.results || []
}

// 출처 확인 처리
async function handleSourceConfirmation(
  db: D1Database,
  botToken: string,
  chatId: string,
  data: string,
  callbackQuery: any,
  userId: string
) {
  try {
    // data format: source_{transactionId}_{source}
    const parts = data.split('_')
    const transactionId = parts[1]
    const source = parts.slice(2).join('_')
    
    // DB 업데이트
    await db.prepare(`
      UPDATE transactions 
      SET source = ?, 
          updated_at = CURRENT_TIMESTAMP,
          updated_by = ?
      WHERE id = ?
    `).bind(source, userId, transactionId).run()
    
    // 콜백 쿼리 응답
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQuery.id,
        text: `✅ 출처를 "${source}"로 등록했습니다.`,
        show_alert: false
      })
    })
    
    // 메시지 업데이트
    const originalText = callbackQuery.message.text
    const updatedText = originalText + `\n\n✅ *출처 확인됨*: ${source}\n담당자: <@${userId}> (${new Date().toLocaleString('ko-KR')})`
    
    await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
        text: updatedText,
        parse_mode: 'Markdown'
      })
    })
  } catch (error) {
    console.error('출처 확인 처리 오류:', error)
  }
}

// 미확인 입금 포맷
function formatUnconfirmedDeposits(deposits: any[]) {
  if (deposits.length === 0) {
    return '✅ 미확인 입금이 없습니다.'
  }
  
  let message = '💳 *미확인 입금 내역*\n\n'
  deposits.forEach((d: any, idx: number) => {
    message += `${idx + 1}. 💰 ${Number(d.amount).toLocaleString()}원\n`
    message += `   입금자: ${d.depositor_name || '미확인'}\n`
    message += `   시간: ${new Date(d.created_at).toLocaleString('ko-KR')}\n`
    if (d.memo) {
      message += `   메모: ${d.memo}\n`
    }
    message += `\n`
  })
  
  message += `\n📝 회원 매칭은 웹에서 처리해주세요.`
  
  return message
}

function formatPriceMessage(prices: any[]) {
  if (prices.length === 0) {
    return '📋 등록된 가격표가 없습니다.'
  }
  
  let message = '📋 *가격표*\n\n'
  prices.forEach((p: any) => {
    message += `• ${p.memory_key}: ${p.memory_value}\n`
  })
  
  return message
}

// Webhook 설정
telegram.post('/setup-webhook', async (c: Context) => {
  try {
    const { webhook_url } = await c.req.json()
    const botToken = c.env.TELEGRAM_BOT_TOKEN
    
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN이 설정되지 않았습니다.')
    }
    
    const url = `https://api.telegram.org/bot${botToken}/setWebhook`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: webhook_url
      })
    })
    
    const result = await response.json()
    
    return c.json({ success: result.ok, result })
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500)
  }
})

// 파서 봇 Webhook (입출금 자동 파싱)
telegram.post('/webhook/parser', async (c: Context) => {
  try {
    const update = await c.req.json()
    console.log('📱 [Parser Bot] Webhook:', update)
    
    const message = update.message || update.channel_post
    if (!message || !message.text) {
      return c.json({ ok: true })
    }
    
    const text = message.text
    const db = c.env.DB
    const adminBotToken = c.env.TELEGRAM_ADMIN_BOT_TOKEN
    const channelId = c.env.TELEGRAM_CHANNEL_ID
    
    // 입출금 메시지 파싱
    const parsed = parseTransactionMessage(text)
    
    if (parsed) {
      // DB에 저장
      const result = await saveTransaction(db, parsed)
      
      // 채널에 알림
      if (result.success) {
        let notification = `${parsed.type === 'deposit' ? '💵' : '💸'} *${parsed.type === 'deposit' ? '입금' : '출금'} 감지*\n\n`
        notification += `금액: ${Number(parsed.amount).toLocaleString()}원\n`
        notification += `${parsed.type === 'deposit' ? '입금자' : '출금자'}: ${parsed.name}\n`
        notification += `시간: ${new Date().toLocaleString('ko-KR')}\n`
        
        if (parsed.type === 'deposit' && !parsed.member_id) {
          notification += `\n⚠️ *미확인 입금* - 회원 매칭 필요`
        }
        
        if (parsed.type === 'withdraw' && !parsed.source) {
          notification += `\n⚠️ *출처 미확인* - 출금 사유 확인 필요\n\n`
          
          // 직원에게 출처 확인 버튼 제공
          const keyboard = createInlineKeyboard([
            [
              { text: '💼 업무 경비', callback_data: `source_${result.id}_업무경비` },
              { text: '🏦 회원 출금', callback_data: `source_${result.id}_회원출금` }
            ],
            [
              { text: '📦 물품 구매', callback_data: `source_${result.id}_물품구매` },
              { text: '🔧 기타', callback_data: `source_${result.id}_기타` }
            ]
          ])
          
          await sendTelegramMessage(adminBotToken, channelId, notification, { reply_markup: keyboard })
          return c.json({ ok: true, saved: true, needs_source: true })
        }
        
        await sendTelegramMessage(adminBotToken, channelId, notification)
        return c.json({ ok: true, saved: true })
      }
    }
    
    return c.json({ ok: true, parsed: false })
  } catch (error) {
    console.error('[Parser Bot] Webhook 오류:', error)
    return c.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

// 입출금 메시지 파싱
function parseTransactionMessage(text: string): {
  type: 'deposit' | 'withdraw',
  amount: number,
  name: string,
  bank?: string,
  account?: string,
  memo?: string,
  member_id?: number,
  source?: string
} | null {
  try {
    // 입금 패턴: "입금 1,000,000원 홍길동 (국민은행)"
    const depositPattern = /입금[\\s]*([\\d,]+)[원]?[\\s]*([\\w가-힣]+)/i
    const depositMatch = text.match(depositPattern)
    
    if (depositMatch) {
      const amount = parseInt(depositMatch[1].replace(/,/g, ''))
      const name = depositMatch[2]
      
      return {
        type: 'deposit',
        amount,
        name,
        memo: text
      }
    }
    
    // 출금 패턴: "출금 500,000원 김철수"
    const withdrawPattern = /출금[\\s]*([\\d,]+)[원]?[\\s]*([\\w가-힣]+)/i
    const withdrawMatch = text.match(withdrawPattern)
    
    if (withdrawMatch) {
      const amount = parseInt(withdrawMatch[1].replace(/,/g, ''))
      const name = withdrawMatch[2]
      
      return {
        type: 'withdraw',
        amount,
        name,
        memo: text
      }
    }
    
    return null
  } catch (error) {
    console.error('파싱 오류:', error)
    return null
  }
}

// 거래 저장
async function saveTransaction(db: D1Database, data: any) {
  try {
    const result = await db.prepare(`
      INSERT INTO transactions (
        type, amount, member_name, bank, account_number, 
        memo, status, source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      data.type,
      data.amount,
      data.name,
      data.bank || null,
      data.account || null,
      data.memo || null,
      'pending',
      data.source || null
    ).run()
    
    return {
      success: true,
      id: result.meta.last_row_id
    }
  } catch (error) {
    console.error('거래 저장 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// 자동 정산 실행 (채널에서 호출 가능)
async function runAutoSettlement(db: D1Database, botToken: string, channelId: string) {
  try {
    // 오늘 정산 대상 배팅 조회
    const bettings = await db.prepare(`
      SELECT b.*, m.name as member_name
      FROM betting_folders b
      LEFT JOIN members m ON b.member_id = m.id
      WHERE DATE(b.created_at) = DATE('now')
      AND b.status IN ('win', 'lose')
      AND b.settled = 0
    `).all()
    
    let totalWin = 0
    let totalLose = 0
    let settledCount = 0
    
    for (const bet of (bettings.results || [])) {
      const amount = Number(bet.bet_amount)
      
      if (bet.status === 'win') {
        const winAmount = amount * (bet.total_odds || 1)
        totalWin += winAmount
        
        // 포인트 지급
        await db.prepare(`
          UPDATE members 
          SET points = points + ?
          WHERE id = ?
        `).bind(winAmount, bet.member_id).run()
      } else {
        totalLose += amount
      }
      
      // 정산 완료 표시
      await db.prepare(`
        UPDATE betting_folders 
        SET settled = 1, settled_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(bet.id).run()
      
      settledCount++
    }
    
    // 채널에 정산 결과 알림
    let message = `💰 *자동 정산 완료*\n\n`
    message += `📊 정산 건수: ${settledCount}건\n`
    message += `✅ 당첨금 지급: ${totalWin.toLocaleString()}P\n`
    message += `📉 낙첨 회수: ${totalLose.toLocaleString()}P\n`
    message += `📈 순수익: ${(totalLose - totalWin).toLocaleString()}P\n`
    message += `\n⏰ ${new Date().toLocaleString('ko-KR')}`
    
    await sendTelegramMessage(botToken, channelId, message)
    
    return {
      success: true,
      settled_count: settledCount,
      total_win: totalWin,
      total_lose: totalLose
    }
  } catch (error) {
    console.error('자동 정산 오류:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// 자동 장부 정리 실행 (채널에서 호출 가능)
async function runAutoBookkeeping(db: D1Database, botToken: string, channelId: string) {
  try {
    // 오늘 입출금 내역 정리
    const transactions = await db.prepare(`
      SELECT * FROM transactions
      WHERE DATE(created_at) = DATE('now')
      ORDER BY created_at DESC
    `).all()
    
    let totalDeposit = 0
    let totalWithdraw = 0
    let unconfirmedDeposit = 0
    let expenseByCategory: any = {}
    
    for (const trans of (transactions.results || [])) {
      const amount = Number(trans.amount)
      
      if (trans.type === 'deposit') {
        totalDeposit += amount
        if (trans.status === 'pending' || !trans.member_id) {
          unconfirmedDeposit += amount
        }
      } else if (trans.type === 'withdraw') {
        totalWithdraw += amount
        const category = trans.source || '미분류'
        expenseByCategory[category] = (expenseByCategory[category] || 0) + amount
      }
    }
    
    // 장부 정리 리포트
    let message = `📚 *일일 장부 정리*\n\n`
    message += `📅 ${new Date().toLocaleDateString('ko-KR')}\n\n`
    message += `💵 총 입금: ${totalDeposit.toLocaleString()}원\n`
    message += `💸 총 출금: ${totalWithdraw.toLocaleString()}원\n`
    message += `📊 순 현금흐름: ${(totalDeposit - totalWithdraw).toLocaleString()}원\n`
    
    if (unconfirmedDeposit > 0) {
      message += `\n⚠️ 미확인 입금: ${unconfirmedDeposit.toLocaleString()}원\n`
    }
    
    if (Object.keys(expenseByCategory).length > 0) {
      message += `\n💼 *경비 내역*:\n`
      for (const [category, amount] of Object.entries(expenseByCategory)) {
        message += `  • ${category}: ${(amount as number).toLocaleString()}원\n`
      }
    }
    
    await sendTelegramMessage(botToken, channelId, message)
    
    return {
      success: true,
      total_deposit: totalDeposit,
      total_withdraw: totalWithdraw
    }
  } catch (error) {
    console.error('장부 정리 오류:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// 자동 정산 API
telegram.post('/auto-settlement', async (c: Context) => {
  try {
    const db = c.env.DB
    const adminBotToken = c.env.TELEGRAM_ADMIN_BOT_TOKEN
    const channelId = c.env.TELEGRAM_CHANNEL_ID
    
    // 오늘 정산 대상 배팅 조회
    const bettings = await db.prepare(`
      SELECT b.*, m.name as member_name
      FROM betting_folders b
      LEFT JOIN members m ON b.member_id = m.id
      WHERE DATE(b.created_at) = DATE('now')
      AND b.status IN ('win', 'lose')
      AND b.settled = 0
    `).all()
    
    let totalWin = 0
    let totalLose = 0
    let settledCount = 0
    
    for (const bet of (bettings.results || [])) {
      const amount = Number(bet.bet_amount)
      
      if (bet.status === 'win') {
        const winAmount = amount * (bet.total_odds || 1)
        totalWin += winAmount
        
        // 포인트 지급
        await db.prepare(`
          UPDATE members 
          SET points = points + ?
          WHERE id = ?
        `).bind(winAmount, bet.member_id).run()
      } else {
        totalLose += amount
      }
      
      // 정산 완료 표시
      await db.prepare(`
        UPDATE betting_folders 
        SET settled = 1, settled_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(bet.id).run()
      
      settledCount++
    }
    
    // 채널에 정산 결과 알림
    let message = `💰 *자동 정산 완료*\n\n`
    message += `📊 정산 건수: ${settledCount}건\n`
    message += `✅ 당첨금 지급: ${totalWin.toLocaleString()}P\n`
    message += `📉 낙첨 회수: ${totalLose.toLocaleString()}P\n`
    message += `📈 순수익: ${(totalLose - totalWin).toLocaleString()}P\n`
    message += `\n⏰ ${new Date().toLocaleString('ko-KR')}`
    
    await sendTelegramMessage(adminBotToken, channelId, message)
    
    return c.json({
      success: true,
      settled_count: settledCount,
      total_win: totalWin,
      total_lose: totalLose,
      net_profit: totalLose - totalWin
    })
  } catch (error) {
    console.error('자동 정산 오류:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// 장부 정리 API
telegram.post('/auto-bookkeeping', async (c: Context) => {
  try {
    const db = c.env.DB
    const adminBotToken = c.env.TELEGRAM_ADMIN_BOT_TOKEN
    const channelId = c.env.TELEGRAM_CHANNEL_ID
    
    // 오늘 입출금 내역 정리
    const transactions = await db.prepare(`
      SELECT * FROM transactions
      WHERE DATE(created_at) = DATE('now')
      ORDER BY created_at DESC
    `).all()
    
    let totalDeposit = 0
    let totalWithdraw = 0
    let unconfirmedDeposit = 0
    let expenseByCategory: any = {}
    
    for (const trans of (transactions.results || [])) {
      const amount = Number(trans.amount)
      
      if (trans.type === 'deposit') {
        totalDeposit += amount
        if (trans.status === 'pending' || !trans.member_id) {
          unconfirmedDeposit += amount
        }
      } else if (trans.type === 'withdraw') {
        totalWithdraw += amount
        const category = trans.source || '미분류'
        expenseByCategory[category] = (expenseByCategory[category] || 0) + amount
      }
    }
    
    // 장부 정리 리포트
    let message = `📚 *일일 장부 정리*\n\n`
    message += `📅 ${new Date().toLocaleDateString('ko-KR')}\n\n`
    message += `💵 총 입금: ${totalDeposit.toLocaleString()}원\n`
    message += `💸 총 출금: ${totalWithdraw.toLocaleString()}원\n`
    message += `📊 순 현금흐름: ${(totalDeposit - totalWithdraw).toLocaleString()}원\n`
    
    if (unconfirmedDeposit > 0) {
      message += `\n⚠️ 미확인 입금: ${unconfirmedDeposit.toLocaleString()}원\n`
    }
    
    if (Object.keys(expenseByCategory).length > 0) {
      message += `\n💼 *경비 내역*:\n`
      for (const [category, amount] of Object.entries(expenseByCategory)) {
        message += `  • ${category}: ${(amount as number).toLocaleString()}원\n`
      }
    }
    
    await sendTelegramMessage(adminBotToken, channelId, message)
    
    return c.json({
      success: true,
      total_deposit: totalDeposit,
      total_withdraw: totalWithdraw,
      unconfirmed_deposit: unconfirmedDeposit,
      expense_by_category: expenseByCategory
    })
  } catch (error) {
    console.error('장부 정리 오류:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

export default telegram
