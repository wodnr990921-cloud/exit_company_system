import { Hono } from 'hono'
import type { Context } from 'hono'

type Bindings = {
  DB: D1Database
  OPENAI_API_KEY: string
}

const ai = new Hono<{ Bindings: Bindings }>()

// OpenAI API 호출
async function callOpenAI(apiKey: string, messages: any[], functions?: any[]) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      functions: functions || undefined,
      function_call: functions ? 'auto' : undefined,
      temperature: 0.7,
      max_tokens: 1000
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(`OpenAI API Error: ${error.error?.message || 'Unknown error'}`)
  }
  
  return await response.json()
}

// 메뉴얼/FAQ 데이터 (나중에 DB로 이동 가능)
const manualData = {
  '도서 발주': {
    description: '도서 발주 프로세스',
    steps: [
      '1. 티켓 관리 → 새 티켓 생성 → 유형: 주문(ORDER) 선택',
      '2. 회원 선택 또는 신규 등록',
      '3. 요청사항 탭 → 도서 발주 추가',
      '4. 도서명, 저자, 수량 입력',
      '5. 담당자 배정 후 처리'
    ],
    notes: '도서는 검수 후 3-5일 내 발송됩니다.'
  },
  '포인트 조정': {
    description: '회원 포인트 조정 방법',
    steps: [
      '1. 회원 관리 → 회원 검색',
      '2. 회원 상세 → 포인트 조정 버튼',
      '3. 조정 유형 선택 (충전/차감/이체)',
      '4. 금액 입력 및 사유 작성',
      '5. 관리자 승인 대기'
    ],
    notes: '일반 포인트와 배팅 포인트는 별도 관리됩니다.'
  },
  '배팅 처리': {
    description: '스포츠 배팅 처리 절차',
    steps: [
      '1. 티켓 상세 → 요청사항 탭 → 배팅 추가',
      '2. 경기 선택 (종목, 팀, 배당률)',
      '3. 배팅 금액 입력',
      '4. 경기 결과 입력 후 정산',
      '5. 당첨 시 자동으로 배팅 포인트 지급'
    ],
    notes: '배팅은 경기 시작 30분 전까지 가능합니다.'
  },
  '우편물 검수': {
    description: '우편물 검수 및 티켓 생성',
    steps: [
      '1. 우편실 → 새 우편물 등록',
      '2. 이미지 업로드 (OCR 자동 실행)',
      '3. 발신자 정보 확인 및 회원 매칭',
      '4. 카테고리 선택 (도서/베팅/문의 등)',
      '5. 담당자 배정 후 티켓 생성'
    ],
    notes: 'OCR 오류는 수동으로 수정 가능합니다.'
  },
  '가격': {
    description: '서비스 가격표',
    items: {
      '도서 발주': '실비 + 수수료 500P',
      '포인트 충전': '수수료 없음 (1:1)',
      '배팅': '당첨금에서 10% 수수료',
      '문의 답변': '무료',
      '긴급 처리': '추가 1000P'
    }
  },
  '배당률': {
    description: '스포츠 배당률 정보',
    sports: {
      '축구': '승무패 평균 1.5~3.5배',
      '야구': '승패 평균 1.8~2.2배',
      '농구': '핸디캡 평균 1.9배',
      '배구': '승패 평균 1.7~2.5배'
    },
    notes: '실시간 배당률은 경기 상황에 따라 변동됩니다.'
  }
}

// OpenAI Function Calling 스키마
const openAIFunctions = [
  {
    name: 'searchMember',
    description: '회원을 이름이나 수용번호로 검색합니다',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '검색할 회원의 이름 또는 수용번호'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'searchTickets',
    description: '티켓을 검색합니다',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '검색할 티켓 번호, 제목 또는 회원 이름'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'getTicketStats',
    description: '티켓 통계 정보를 조회합니다 (오늘 생성 건수, 상태별/유형별 통계)',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'searchBooks',
    description: '도서를 검색합니다',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '검색할 도서명 또는 저자명'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'searchManual',
    description: '메뉴얼이나 가이드를 검색합니다',
    parameters: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: '검색할 키워드 (예: 도서발주, 포인트조정, 배팅처리, 가격 등)'
        }
      },
      required: ['keyword']
    }
  }
]

// Function Calling 정의
const availableFunctions = {
  // 회원 검색
  searchMember: async (db: D1Database, query: string) => {
    const result = await db.prepare(`
      SELECT id, name, institution, inmate_number, points, betting_points, status
      FROM members 
      WHERE name LIKE ? OR inmate_number LIKE ?
      LIMIT 5
    `).bind(`%${query}%`, `%${query}%`).all()
    
    return result.results || []
  },
  
  // 회원 상세 조회
  getMemberDetail: async (db: D1Database, memberId: number) => {
    const result = await db.prepare(`
      SELECT * FROM members WHERE id = ?
    `).bind(memberId).first()
    
    return result
  },
  
  // 티켓 검색
  searchTickets: async (db: D1Database, query: string, limit = 5) => {
    const result = await db.prepare(`
      SELECT t.id, t.ticket_number, t.title, t.status, t.ticket_type, 
             t.created_at, m.name as member_name
      FROM tickets t
      LEFT JOIN members m ON t.member_id = m.id
      WHERE t.ticket_number LIKE ? OR t.title LIKE ? OR m.name LIKE ?
      ORDER BY t.created_at DESC
      LIMIT ?
    `).bind(`%${query}%`, `%${query}%`, `%${query}%`, limit).all()
    
    return result.results || []
  },
  
  // 티켓 통계
  getTicketStats: async (db: D1Database) => {
    const [statusStats, typeStats, todayStats] = await Promise.all([
      db.prepare(`
        SELECT status, COUNT(*) as count
        FROM tickets
        GROUP BY status
      `).all(),
      db.prepare(`
        SELECT ticket_type, COUNT(*) as count
        FROM tickets
        GROUP BY ticket_type
      `).all(),
      db.prepare(`
        SELECT COUNT(*) as count
        FROM tickets
        WHERE DATE(created_at) = DATE('now')
      `).first()
    ])
    
    return {
      byStatus: statusStats.results || [],
      byType: typeStats.results || [],
      today: todayStats?.count || 0
    }
  },
  
  // 도서 검색
  searchBooks: async (db: D1Database, query: string) => {
    try {
      const result = await db.prepare(`
        SELECT title, author, publisher, price, isbn
        FROM books
        WHERE title LIKE ? OR author LIKE ?
        LIMIT 10
      `).bind(`%${query}%`, `%${query}%`).all()
      
      return result.results || []
    } catch (error) {
      return []
    }
  },
  
  // 최근 활동 로그
  getRecentActivities: async (db: D1Database, limit = 10) => {
    const result = await db.prepare(`
      SELECT action, details, created_at, staff_id
      FROM activity_logs
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(limit).all()
    
    return result.results || []
  },
  
  // 메뉴얼/가이드 검색
  searchManual: (keyword: string) => {
    const results: any[] = []
    const lowerKeyword = keyword.toLowerCase()
    
    for (const [key, value] of Object.entries(manualData)) {
      if (key.toLowerCase().includes(lowerKeyword) || 
          value.description.toLowerCase().includes(lowerKeyword)) {
        results.push({ topic: key, ...value })
      }
    }
    
    return results
  }
}

// AI 챗봇 엔드포인트
// AI 챗봇 엔드포인트 (OpenAI GPT-4o-mini)
ai.post('/chat', async (c: Context) => {
  try {
    const { message, ticket_context, chat_history } = await c.req.json()
    const db = c.env.DB
    const apiKey = c.env.OPENAI_API_KEY
    
    if (!apiKey) {
      throw new Error('OpenAI API Key가 설정되지 않았습니다.')
    }
    
    console.log('🤖 사용자 메시지:', message)
    
    // 시스템 프롬프트
    const systemPrompt = `당신은 EXIT COMPANY 교정시설 업무 대행 시스템의 AI 어시스턴트입니다.

주요 역할:
- 회원, 티켓, 도서 검색
- 업무 절차 안내 (도서 발주, 포인트 조정, 배팅 처리 등)
- 가격 및 수수료 안내
- 티켓 통계 및 현황 제공

사용 가능한 함수:
- searchMember: 회원 검색
- searchTickets: 티켓 검색
- getTicketStats: 티켓 통계
- searchBooks: 도서 검색
- searchManual: 메뉴얼 검색

현재 티켓 컨텍스트:
${ticket_context ? JSON.stringify(ticket_context, null, 2) : '없음'}

응답 시 유의사항:
- 친절하고 전문적인 톤 유지
- 구체적이고 실용적인 정보 제공
- 필요 시 함수를 호출하여 정확한 데이터 제공
- 마크다운 형식으로 깔끔하게 구조화`

    // 대화 히스토리 구성
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(chat_history || []).slice(-5), // 최근 5개만
      { role: 'user', content: message }
    ]
    
    // OpenAI API 호출
    const aiResponse = await callOpenAI(apiKey, messages, openAIFunctions)
    
    console.log('✅ OpenAI 응답:', aiResponse)
    
    const choice = aiResponse.choices[0]
    const responseMessage = choice.message
    
    // Function Calling 처리
    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name
      const functionArgs = JSON.parse(responseMessage.function_call.arguments)
      
      console.log('🔧 함수 호출:', functionName, functionArgs)
      
      let functionResult: any
      
      // 함수 실행
      switch (functionName) {
        case 'searchMember':
          functionResult = await availableFunctions.searchMember(db, functionArgs.query)
          break
        case 'searchTickets':
          functionResult = await availableFunctions.searchTickets(db, functionArgs.query)
          break
        case 'getTicketStats':
          functionResult = await availableFunctions.getTicketStats(db)
          break
        case 'searchBooks':
          functionResult = await availableFunctions.searchBooks(db, functionArgs.query)
          break
        case 'searchManual':
          functionResult = availableFunctions.searchManual(functionArgs.keyword)
          break
        default:
          functionResult = { error: 'Unknown function' }
      }
      
      console.log('📊 함수 결과:', functionResult)
      
      // 함수 결과를 포함하여 다시 AI에게 질문
      const secondMessages = [
        ...messages,
        responseMessage,
        {
          role: 'function',
          name: functionName,
          content: JSON.stringify(functionResult)
        }
      ]
      
      const finalResponse = await callOpenAI(apiKey, secondMessages)
      const finalMessage = finalResponse.choices[0].message
      
      return c.json({
        reply: finalMessage.content,
        function_called: functionName,
        function_result: functionResult
      })
    }
    
    // 일반 응답
    return c.json({
      reply: responseMessage.content,
      function_called: null
    })
  } catch (error) {
    console.error('AI 챗봇 오류:', error)
    return c.json({
      reply: `❌ 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}\n\n다시 시도해주세요.`,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, 500)
  }
})

// 의도 감지 함수
function detectIntent(message: string) {
  const lower = message.toLowerCase()
  
  // 인사말
  if (/^(안녕|hi|hello|헬로|하이)/.test(lower)) {
    return { type: 'greeting', query: '' }
  }
  
  // 회원 검색
  if (/회원|찾아|검색/.test(lower) && !/티켓/.test(lower)) {
    const query = message.replace(/(회원|찾아|검색|줘|주세요)/g, '').trim()
    return { type: 'search_member', query }
  }
  
  // 티켓 검색
  if (/티켓.*?(T-|번호|찾|검색)/.test(lower)) {
    const query = message.replace(/(티켓|찾아|검색|줘|주세요|보여)/g, '').trim()
    return { type: 'search_ticket', query }
  }
  
  // 티켓 통계
  if (/(오늘|현황|통계|상태|몇|개).*?티켓/.test(lower) || /티켓.*(오늘|현황|통계|상태)/.test(lower)) {
    return { type: 'ticket_stats', query: '' }
  }
  
  // 도서 검색
  if (/도서|책|book/.test(lower) && !/(발주|방법|어떻게)/.test(lower)) {
    const query = message.replace(/(도서|책|찾아|검색|줘|주세요)/g, '').trim()
    return { type: 'search_book', query }
  }
  
  // 메뉴얼
  if (/(방법|어떻게|절차|프로세스|가이드|메뉴얼)/.test(lower)) {
    const query = message.replace(/(방법|어떻게|절차|프로세스|가이드|메뉴얼|알려|줘|주세요)/g, '').trim()
    return { type: 'manual', query }
  }
  
  // 가격
  if (/(가격|비용|요금|수수료|얼마)/.test(lower)) {
    return { type: 'price', query: '' }
  }
  
  // 현재 티켓
  if (/(이|현재|지금).*(티켓|내용|정보)/.test(lower)) {
    return { type: 'current_ticket', query: '' }
  }
  
  return { type: 'unknown', query: message }
}

// 응답 포맷 함수들
function formatMemberSearchResponse(members: any[]) {
  if (members.length === 0) {
    return '검색 결과가 없습니다. 다른 이름이나 번호로 검색해보세요.'
  }
  
  let response = `🔍 회원 검색 결과 (${members.length}건):\n\n`
  
  members.forEach((m, i) => {
    response += `${i + 1}. **${m.name}** (${m.institution})\n`
    response += `   수용번호: ${m.inmate_number || '-'}\n`
    response += `   일반P: ${Number(m.points || 0).toLocaleString()}P\n`
    response += `   배팅P: ${Number(m.betting_points || 0).toLocaleString()}P\n`
    response += `   상태: ${m.status === 'active' ? '활성' : '비활성'}\n\n`
  })
  
  return response
}

function formatTicketSearchResponse(tickets: any[]) {
  if (tickets.length === 0) {
    return '검색 결과가 없습니다.'
  }
  
  let response = `🎫 티켓 검색 결과 (${tickets.length}건):\n\n`
  
  tickets.forEach((t, i) => {
    const statusEmoji = t.status === 'open' ? '🆕' : t.status === 'in_progress' ? '⏳' : '✅'
    response += `${i + 1}. ${statusEmoji} **${t.ticket_number}**\n`
    response += `   제목: ${t.title}\n`
    response += `   회원: ${t.member_name || '미지정'}\n`
    response += `   유형: ${getTicketTypeKorean(t.ticket_type)}\n`
    response += `   상태: ${getStatusKorean(t.status)}\n\n`
  })
  
  return response
}

function formatTicketStatsResponse(stats: any) {
  let response = '📊 티켓 현황:\n\n'
  
  response += `**오늘 생성된 티켓**: ${stats.today}건\n\n`
  
  response += '**상태별**:\n'
  stats.byStatus.forEach((s: any) => {
    response += `• ${getStatusKorean(s.status)}: ${s.count}건\n`
  })
  
  response += '\n**유형별**:\n'
  stats.byType.forEach((t: any) => {
    response += `• ${getTicketTypeKorean(t.ticket_type)}: ${t.count}건\n`
  })
  
  return response
}

function formatBookSearchResponse(books: any[]) {
  if (books.length === 0) {
    return '검색된 도서가 없습니다.'
  }
  
  let response = `📚 도서 검색 결과 (${books.length}건):\n\n`
  
  books.forEach((b, i) => {
    response += `${i + 1}. **${b.title}**\n`
    response += `   저자: ${b.author || '-'}\n`
    response += `   출판사: ${b.publisher || '-'}\n`
    response += `   가격: ${Number(b.price || 0).toLocaleString()}원\n`
    if (b.isbn) response += `   ISBN: ${b.isbn}\n`
    response += '\n'
  })
  
  return response
}

function formatManualResponse(manuals: any[]) {
  if (manuals.length === 0) {
    return '관련 메뉴얼을 찾을 수 없습니다.\n\n사용 가능한 메뉴얼:\n• 도서 발주\n• 포인트 조정\n• 배팅 처리\n• 우편물 검수\n• 가격/수수료'
  }
  
  let response = '📖 메뉴얼:\n\n'
  
  manuals.forEach((m) => {
    response += `**${m.topic}**\n`
    response += `${m.description}\n\n`
    
    if (m.steps) {
      response += '절차:\n'
      m.steps.forEach((step: string) => response += `${step}\n`)
      response += '\n'
    }
    
    if (m.items) {
      response += '항목:\n'
      Object.entries(m.items).forEach(([key, value]) => {
        response += `• ${key}: ${value}\n`
      })
      response += '\n'
    }
    
    if (m.sports) {
      response += '종목별:\n'
      Object.entries(m.sports).forEach(([key, value]) => {
        response += `• ${key}: ${value}\n`
      })
      response += '\n'
    }
    
    if (m.notes) {
      response += `💡 참고: ${m.notes}\n\n`
    }
  })
  
  return response
}

function formatPriceResponse() {
  const priceData = manualData['가격']
  let response = '💰 서비스 가격표:\n\n'
  
  Object.entries(priceData.items).forEach(([service, price]) => {
    response += `• ${service}: ${price}\n`
  })
  
  response += '\n💡 모든 금액은 포인트(P) 기준입니다.'
  
  return response
}

function formatTicketContextResponse(ticket: any) {
  let response = `📋 현재 티켓 정보:\n\n`
  response += `**${ticket.ticket_number}** - ${ticket.title}\n\n`
  response += `유형: ${getTicketTypeKorean(ticket.ticket_type)}\n`
  response += `상태: ${getStatusKorean(ticket.status)}\n`
  response += `회원: ${ticket.member_name || '미지정'}\n`
  response += `담당자: ${ticket.assigned_to_name || '미배정'}\n`
  response += `우선순위: ${getPriorityKorean(ticket.priority)}\n`
  
  if (ticket.description) {
    response += `\n설명:\n${ticket.description}`
  }
  
  return response
}

function getTicketTypeKorean(type: string) {
  const types: any = {
    'ORDER': '주문',
    'INQUIRY': '문의',
    'BETTING': '배팅',
    'POINT_ADJUSTMENT': '포인트 조정',
    'MEMBER': '회원 관리'
  }
  return types[type] || type
}

function getStatusKorean(status: string) {
  const statuses: any = {
    'open': '미처리',
    'assigned': '배정됨',
    'in_progress': '처리중',
    'pending': '대기중',
    'completed': '완료',
    'closed': '종료'
  }
  return statuses[status] || status
}

function getPriorityKorean(priority: string) {
  const priorities: any = {
    'urgent': '긴급',
    'high': '높음',
    'normal': '보통',
    'low': '낮음'
  }
  return priorities[priority] || priority
}

export default ai
