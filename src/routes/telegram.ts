import { Hono } from 'hono'
import type { Context } from 'hono'

type Bindings = {
  DB: D1Database
  TELEGRAM_BOT_TOKEN: string
  TELEGRAM_CHAT_ID: string
}

const telegram = new Hono<{ Bindings: Bindings }>()

// 텔레그램 API 호출
async function sendTelegramMessage(botToken: string, chatId: string, text: string, parse_mode = 'Markdown') {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Telegram API Error: ${error.description || 'Unknown error'}`)
  }
  
  return await response.json()
}

// Webhook 엔드포인트
telegram.post('/webhook', async (c: Context) => {
  try {
    const update = await c.req.json()
    console.log('📱 텔레그램 Webhook:', update)
    
    const message = update.message
    if (!message || !message.text) {
      return c.json({ ok: true })
    }
    
    const chatId = message.chat.id.toString()
    const text = message.text
    const username = message.from.username || message.from.first_name
    
    const botToken = c.env.TELEGRAM_BOT_TOKEN
    const db = c.env.DB
    
    // 명령어 처리
    if (text.startsWith('/')) {
      await handleCommand(botToken, chatId, text, username, db)
    } else {
      // 일반 메시지는 AI에게 전달
      const reply = `받은 메시지: "${text}"\n\nAI 챗봇 기능은 웹에서 이용해주세요: https://exit-company-system-5je.pages.dev`
      await sendTelegramMessage(botToken, chatId, reply)
    }
    
    return c.json({ ok: true })
  } catch (error) {
    console.error('Webhook 처리 오류:', error)
    return c.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

// 명령어 처리
async function handleCommand(botToken: string, chatId: string, command: string, username: string, db: D1Database) {
  const [cmd, ...args] = command.split(' ')
  
  switch (cmd) {
    case '/start':
      await sendTelegramMessage(botToken, chatId, `안녕하세요 ${username}님! 👋\n\n*EXIT COMPANY 알림 봇*입니다.\n\n사용 가능한 명령어:\n/status - 오늘 티켓 현황\n/mytickets - 내 담당 티켓\n/help - 도움말`)
      break
      
    case '/status':
      const stats = await getTicketStats(db)
      const statsMessage = formatStatsMessage(stats)
      await sendTelegramMessage(botToken, chatId, statsMessage)
      break
      
    case '/mytickets':
      // TODO: 사용자별 티켓 조회 (텔레그램 ID와 직원 매칭 필요)
      await sendTelegramMessage(botToken, chatId, '내 담당 티켓 조회 기능은 준비 중입니다.')
      break
      
    case '/help':
      await sendTelegramMessage(botToken, chatId, `*도움말*\n\n/start - 봇 시작\n/status - 오늘 티켓 현황\n/mytickets - 내 담당 티켓\n/help - 이 도움말`)
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

// 알림 전송 API
telegram.post('/notify', async (c: Context) => {
  try {
    const { type, data } = await c.req.json()
    const botToken = c.env.TELEGRAM_BOT_TOKEN
    const chatId = c.env.TELEGRAM_CHAT_ID
    
    if (!botToken || !chatId) {
      throw new Error('텔레그램 설정이 없습니다.')
    }
    
    let message = ''
    
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
        message += `유형: ${data.type}\n`
        message += `회원: ${data.member_name}\n`
        message += `금액: ${data.amount}P\n`
        message += `사유: ${data.reason}\n`
        break
        
      case 'betting_result':
        message = `🏆 *배팅 결과*\n\n`
        message += `회원: ${data.member_name}\n`
        message += `결과: ${data.result === 'win' ? '당첨' : '낙첨'}\n`
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
        message = `알림: ${JSON.stringify(data)}`
    }
    
    await sendTelegramMessage(botToken, chatId, message)
    
    return c.json({ success: true, message: 'Notification sent' })
  } catch (error) {
    console.error('알림 전송 오류:', error)
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500)
  }
})

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

export default telegram
