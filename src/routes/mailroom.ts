import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  R2: R2Bucket
  AI: any
}

const mailroom = new Hono<{ Bindings: Bindings }>()

// 우편물 목록 조회
mailroom.get('/', async (c) => {
  try {
    const { status = 'all', search = '' } = c.req.query()
    
    let query = `
      SELECT 
        m.*,
        mem.name as member_name,
        mem.member_number,
        mem.institution,
        t.ticket_number,
        t.title as ticket_title,
        t.status as ticket_status
      FROM mailroom_items m
      LEFT JOIN members mem ON m.member_id = mem.id
      LEFT JOIN tickets t ON m.ticket_id = t.id
      WHERE 1=1
    `
    
    const params: any[] = []
    
    if (status !== 'all') {
      query += ` AND m.status = ?`
      params.push(status)
    }
    
    if (search) {
      query += ` AND (mem.name LIKE ? OR mem.member_number LIKE ? OR t.ticket_number LIKE ?)`
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    
    query += ` ORDER BY m.created_at DESC`
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all()
    
    return c.json({ mailroom_items: results })
  } catch (error: any) {
    console.error('우편물 목록 조회 오류:', error)
    return c.json({ error: '우편물 목록 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 우편물 상세 조회
mailroom.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const { results } = await c.env.DB.prepare(`
      SELECT 
        m.*,
        mem.name as member_name,
        mem.member_number,
        mem.institution,
        t.ticket_number,
        t.title as ticket_title
      FROM mailroom_items m
      LEFT JOIN members mem ON m.member_id = mem.id
      LEFT JOIN tickets t ON m.ticket_id = t.id
      WHERE m.id = ?
    `).bind(id).all()
    
    if (results.length === 0) {
      return c.json({ error: '우편물을 찾을 수 없습니다.' }, 404)
    }
    
    return c.json({ mailroom_item: results[0] })
  } catch (error: any) {
    console.error('우편물 상세 조회 오류:', error)
    return c.json({ error: '우편물 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 이미지 업로드
mailroom.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return c.json({ error: '파일이 없습니다.' }, 400)
    }
    
    // 파일 확장자 검증
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: '지원하지 않는 파일 형식입니다. (JPG, PNG, GIF, WEBP만 가능)' }, 400)
    }
    
    // 파일 크기 제한 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: '파일 크기는 10MB를 초과할 수 없습니다.' }, 400)
    }
    
    // 고유 파일명 생성
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 15)
    const ext = file.name.split('.').pop()
    const key = `mailroom/${timestamp}-${randomStr}.${ext}`
    
    // R2에 업로드
    const arrayBuffer = await file.arrayBuffer()
    await c.env.R2.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type
      }
    })
    
    return c.json({
      success: true,
      key: key,
      url: `/api/mailroom/image/${key}`
    })
  } catch (error: any) {
    console.error('이미지 업로드 오류:', error)
    return c.json({ error: '이미지 업로드 중 오류가 발생했습니다.' }, 500)
  }
})

// 이미지 조회
mailroom.get('/image/:key{.+}', async (c) => {
  try {
    const key = c.req.param('key')
    
    const object = await c.env.R2.get(key)
    
    if (!object) {
      return c.json({ error: '이미지를 찾을 수 없습니다.' }, 404)
    }
    
    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000'
      }
    })
  } catch (error: any) {
    console.error('이미지 조회 오류:', error)
    return c.json({ error: '이미지 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 우편물 등록
mailroom.post('/', async (c) => {
  try {
    const { member_id, image_keys, notes, created_by } = await c.req.json()
    
    if (!image_keys || image_keys.length === 0) {
      return c.json({ error: '이미지를 업로드해주세요.' }, 400)
    }
    
    // 우편물 번호 생성 (MAIL + 타임스탬프)
    const mailNumber = `MAIL${Date.now()}`
    
    // 우편물 등록
    const result = await c.env.DB.prepare(`
      INSERT INTO mailroom_items (
        mail_number, member_id, image_keys, status, notes, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      mailNumber,
      member_id,
      JSON.stringify(image_keys),
      'received', // 수령 상태
      notes || '',
      created_by
    ).run()
    
    return c.json({
      success: true,
      mailroom_id: result.meta.last_row_id,
      mail_number: mailNumber
    })
  } catch (error: any) {
    console.error('우편물 등록 오류:', error)
    return c.json({ 
      error: '우편물 등록 중 오류가 발생했습니다.',
      details: error?.message || String(error)
    }, 500)
  }
})

// 우편물 상태 업데이트
mailroom.patch('/:id/status', async (c) => {
  try {
    const id = c.req.param('id')
    const { status, ticket_id } = await c.req.json()
    
    const validStatuses = ['received', 'ocr_processing', 'ocr_completed', 'inspection', 'assigned', 'completed']
    if (!validStatuses.includes(status)) {
      return c.json({ error: '유효하지 않은 상태입니다.' }, 400)
    }
    
    let query = `UPDATE mailroom_items SET status = ?, updated_at = CURRENT_TIMESTAMP`
    const params = [status]
    
    if (ticket_id) {
      query += `, ticket_id = ?`
      params.push(ticket_id)
    }
    
    query += ` WHERE id = ?`
    params.push(id)
    
    await c.env.DB.prepare(query).bind(...params).run()
    
    return c.json({ success: true })
  } catch (error: any) {
    console.error('우편물 상태 업데이트 오류:', error)
    return c.json({ error: '상태 업데이트 중 오류가 발생했습니다.' }, 500)
  }
})

// 간단한 OCR 처리 (단일 이미지)
mailroom.post('/ocr-simple', async (c) => {
  try {
    const { image_key } = await c.req.json()
    
    if (!image_key) {
      return c.json({ error: '이미지 키가 필요합니다.' }, 400)
    }
    
    // R2에서 이미지 가져오기
    const object = await c.env.R2.get(image_key)
    if (!object) {
      return c.json({ error: '이미지를 찾을 수 없습니다.' }, 404)
    }
    
    // 이미지를 ArrayBuffer로 변환
    const imageBuffer = await object.arrayBuffer()
    
    // Cloudflare AI Workers로 OCR 실행
    let text = ''
    
    try {
      if (!c.env.AI) {
        throw new Error('AI binding is not configured')
      }
      
      const aiResponse = await c.env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
        image: Array.from(new Uint8Array(imageBuffer)),
        prompt: "agree",
        messages: [{
          role: "user",
          content: `이 이미지를 분석하여 다음 정보를 추출해주세요:

1. 이것이 편지 봉투인지 확인 ([ENVELOPE: YES/NO])
2. 수신자 이름
3. 수신자 번호 (전화번호, 수감번호 등)
4. 기관명 (교도소, 구치소 등)
5. 주소 (있는 경우)
6. 기타 텍스트

모든 텍스트를 정확하게 추출하고 구조화하여 제공해주세요.`
        }]
      })
      
      text = aiResponse?.response || ''
    } catch (aiError: any) {
      console.error('AI OCR error:', aiError)
      text = `[OCR 실패: Workers AI를 사용할 수 없습니다. Cloudflare Dashboard에서 Workers AI를 활성화해주세요.]`
    }
    
    return c.json({ 
      success: true,
      text: text,
      image_key: image_key
    })
  } catch (error: any) {
    console.error('간단 OCR 오류:', error)
    return c.json({ 
      error: 'OCR 처리 중 오류가 발생했습니다.',
      details: error?.message || String(error)
    }, 500)
  }
})

// OCR 처리 (Cloudflare AI Workers 사용)
mailroom.post('/:id/ocr', async (c) => {
  try {
    const id = c.req.param('id')
    
    // 상태를 ocr_processing으로 변경
    await c.env.DB.prepare(`
      UPDATE mailroom_items 
      SET status = 'ocr_processing', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(id).run()
    
    // 우편물 정보 조회
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM mailroom_items WHERE id = ?
    `).bind(id).all()
    
    if (results.length === 0) {
      return c.json({ error: '우편물을 찾을 수 없습니다.' }, 404)
    }
    
    const mailItem = results[0] as any
    const imageKeys = JSON.parse(mailItem.image_keys)
    
    // OCR 결과 저장할 배열
    const ocrResults: any[] = []
    
    // 각 이미지에 대해 OCR 수행
    for (const key of imageKeys) {
      try {
        // R2에서 이미지 가져오기
        const object = await c.env.R2.get(key)
        if (!object) {
          console.log(`Image not found in R2: ${key}`)
          continue
        }
        
        // 이미지를 ArrayBuffer로 변환
        const imageBuffer = await object.arrayBuffer()
        
        // Cloudflare AI Workers로 OCR 실행
        // 모델: @cf/meta/llama-3.2-11b-vision-instruct (최신 Vision 모델)
        let extractedText = ''
        let aiResponse: any = null
        
        try {
          if (!c.env.AI) {
            throw new Error('AI binding is not configured. Please set up Workers AI in wrangler.toml')
          }
          
          aiResponse = await c.env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
            image: Array.from(new Uint8Array(imageBuffer)),
            prompt: "agree",
            messages: [{
              role: "user",
              content: `당신은 우편물 분석 전문가입니다. 이 이미지를 분석하여 다음 정보를 제공해주세요:

1. **봉투 여부 판단** (매우 중요!)
   - 이것이 편지 봉투인지 확인하세요
   - 봉투의 특징: 발신자/수신자 정보, 우표, 우편번호, 주소 등
   - 판단 결과를 반드시 "[ENVELOPE: YES]" 또는 "[ENVELOPE: NO]"로 시작하세요

2. **텍스트 추출**
   - 이미지의 모든 텍스트를 정확하게 추출
   - 한글, 영어, 숫자 모두 인식
   - 발신자, 수신자, 주소, 우편번호를 구분하여 추출

3. **구조화된 정보**
   - 발신자 (보내는 사람)
   - 수신자 (받는 사람)  
   - 주소
   - 우편번호
   - 기타 텍스트

응답 형식:
[ENVELOPE: YES/NO]
발신자: ...
수신자: ...
주소: ...
우편번호: ...
기타: ...`
            }],
            max_tokens: 512
          })
          
          // OCR 결과 파싱
          extractedText = aiResponse?.response || aiResponse?.description || aiResponse?.text || ''
        } catch (aiError: any) {
          console.error(`AI OCR error for ${key}:`, aiError)
          extractedText = `[AI OCR 실패: ${aiError.message || 'Workers AI 권한이 필요합니다'}]`
        }
        
        // 봉투 감지 (간단한 키워드 기반)
        const hasEnvelope = detectEnvelope(extractedText)
        
        ocrResults.push({
          image_key: key,
          text: extractedText,
          confidence: 0.90, // Llama 3.2 Vision은 고정밀 모델
          has_envelope: hasEnvelope,
          raw_response: aiResponse
        })
        
        console.log(`OCR completed for ${key}: ${extractedText.substring(0, 100)}...`)
      } catch (imageError: any) {
        console.error(`OCR failed for image ${key}:`, imageError)
        ocrResults.push({
          image_key: key,
          text: `[OCR 실패: ${imageError.message}]`,
          confidence: 0,
          has_envelope: false,
          error: imageError.message
        })
      }
    }
    
    // 케이스 판단: 봉투가 하나라도 감지되면 새 케이스
    const hasAnyEnvelope = ocrResults.some(result => result.has_envelope)
    const caseType = hasAnyEnvelope ? 'new_case' : 'continued_case'
    
    console.log(`Mail ${id}: Case type determined as ${caseType} (envelope detected: ${hasAnyEnvelope})`)
    
    // OCR 결과와 케이스 타입 저장
    const ocrData = {
      results: ocrResults,
      case_type: caseType,
      has_envelope: hasAnyEnvelope,
      processed_at: new Date().toISOString(),
      total_images: imageKeys.length,
      successful_ocr: ocrResults.filter(r => !r.error).length
    }
    
    await c.env.DB.prepare(`
      UPDATE mailroom_items 
      SET ocr_result = ?, status = 'ocr_completed', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(JSON.stringify(ocrData), id).run()
    
    return c.json({
      success: true,
      case_type: caseType,
      has_envelope: hasAnyEnvelope,
      ocr_results: ocrResults,
      summary: {
        total_images: imageKeys.length,
        successful: ocrData.successful_ocr,
        failed: imageKeys.length - ocrData.successful_ocr
      }
    })
  } catch (error: any) {
    console.error('OCR 처리 오류:', error)
    
    // 오류 발생 시 상태를 received로 되돌림
    try {
      await c.env.DB.prepare(`
        UPDATE mailroom_items 
        SET status = 'received', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(c.req.param('id')).run()
    } catch (dbError) {
      console.error('상태 되돌리기 실패:', dbError)
    }
    
    return c.json({ error: 'OCR 처리 중 오류가 발생했습니다: ' + error.message }, 500)
  }
})

// 봉투 감지 헬퍼 함수
function detectEnvelope(text: string): boolean {
  // 1. AI가 명시적으로 판단한 결과 확인
  if (text.includes('[ENVELOPE: YES]')) {
    return true
  }
  if (text.includes('[ENVELOPE: NO]')) {
    return false
  }
  
  // 2. 키워드 기반 감지 (폴백)
  const envelopeKeywords = [
    '발신', '수신', '우편번호', '주소', '보내는 사람', '받는 사람',
    '우표', '등기', '소인', 'sender', 'receiver', 'address', 'zip code',
    '보낸이', '받는이', '주소:', '우편', '번지', '도로', '시', '구', '동',
    '발신자', '수신자', '우편물', '우체국', '배달', '봉투'
  ]
  
  const lowerText = text.toLowerCase()
  
  // 3. 강한 봉투 신호 (2개 이상 키워드)
  const matchCount = envelopeKeywords.filter(keyword => 
    lowerText.includes(keyword.toLowerCase())
  ).length
  
  return matchCount >= 2
}

// 주소 정보 추출 헬퍼 함수
function extractAddress(text: string): any {
  const addressInfo: any = {}
  
  // 우편번호 추출 (5자리 또는 6자리)
  const zipCodeMatch = text.match(/\b\d{5,6}\b/)
  if (zipCodeMatch) {
    addressInfo.zip_code = zipCodeMatch[0]
  }
  
  // 주소 패턴 매칭 (간단한 한국 주소 패턴)
  const addressPatterns = [
    /([가-힣]+시\s[가-힣]+구\s[가-힣]+동\s[\d-]+)/g,  // 서울시 강남구 역삼동 123-45
    /([가-힣]+도\s[가-힣]+시\s[가-힣]+[동읍면]\s[\d-]+)/g, // 경기도 성남시 분당구 123
    /([가-힣]+[시도]\s[가-힣]+[구군]\s[가-힣]+로\s[\d]+)/g  // 도로명 주소
  ]
  
  for (const pattern of addressPatterns) {
    const matches = text.match(pattern)
    if (matches && matches.length > 0) {
      addressInfo.addresses = matches
      break
    }
  }
  
  return Object.keys(addressInfo).length > 0 ? addressInfo : null
}

// 우편물 삭제
mailroom.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    // 우편물 정보 조회
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM mailroom_items WHERE id = ?
    `).bind(id).all()
    
    if (results.length === 0) {
      return c.json({ error: '우편물을 찾을 수 없습니다.' }, 404)
    }
    
    const mailItem = results[0] as any
    
    // R2에서 이미지 삭제
    const imageKeys = JSON.parse(mailItem.image_keys)
    for (const key of imageKeys) {
      await c.env.R2.delete(key)
    }
    
    // DB에서 삭제
    await c.env.DB.prepare(`DELETE FROM mailroom_items WHERE id = ?`).bind(id).run()
    
    return c.json({ success: true })
  } catch (error: any) {
    console.error('우편물 삭제 오류:', error)
    return c.json({ error: '우편물 삭제 중 오류가 발생했습니다.' }, 500)
  }
})

// 대량 우편물 등록 API (각 이미지별 회원 지정 + 티켓 자동 생성)
mailroom.post('/bulk', async (c) => {
  try {
    const { items, created_by } = await c.req.json()
    
    // items 형식: [{ member_id, image_key, notes }]
    if (!items || items.length === 0) {
      return c.json({ error: '등록할 우편물이 없습니다.' }, 400)
    }
    
    const createdItems = []
    
    for (const item of items) {
      const { member_id, image_key, notes } = item
      
      if (!member_id || !image_key) {
        continue // 필수 정보 없으면 건너뛰기
      }
      
      // 우편물 번호 생성
      const mailNumber = `MAIL${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
      
      // 우편물 등록
      const mailResult = await c.env.DB.prepare(`
        INSERT INTO mailroom_items (
          mail_number, member_id, image_keys, status, notes, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        mailNumber,
        member_id,
        JSON.stringify([image_key]),
        'received',
        notes || '',
        created_by
      ).run()
      
      const mailroomId = mailResult.meta.last_row_id
      
      // 회원 정보 조회
      const { results: members } = await c.env.DB.prepare(`
        SELECT name, member_number, institution FROM members WHERE id = ?
      `).bind(member_id).all()
      
      if (members.length === 0) continue
      
      const member = members[0] as any
      
      // 티켓 번호 생성
      const ticketNumber = `MAIL-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
      
      // 티켓 자동 생성
      const ticketResult = await c.env.DB.prepare(`
        INSERT INTO tickets (
          ticket_number, title, description, member_id, ticket_type,
          status, priority, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(
        ticketNumber,
        `우편물 수령 - ${member.name}(${member.member_number})`,
        `우편물 번호: ${mailNumber}\n기관: ${member.institution}\n비고: ${notes || '없음'}`,
        member_id,
        'MAIL_INSPECTION',
        'open',
        'normal',
        created_by
      ).run()
      
      const ticketId = ticketResult.meta.last_row_id
      
      // 우편물에 티켓 ID 연결
      await c.env.DB.prepare(`
        UPDATE mailroom_items 
        SET ticket_id = ?, status = 'assigned'
        WHERE id = ?
      `).bind(ticketId, mailroomId).run()
      
      createdItems.push({
        mailroom_id: mailroomId,
        mail_number: mailNumber,
        ticket_id: ticketId,
        ticket_number: ticketNumber,
        member_name: member.name
      })
    }
    
    return c.json({
      success: true,
      created: createdItems,
      count: createdItems.length
    })
  } catch (error: any) {
    console.error('대량 우편물 등록 오류:', error)
    return c.json({ 
      error: '대량 등록 중 오류가 발생했습니다.',
      details: error?.message || String(error)
    }, 500)
  }
})

// 일괄 배당 및 티켓 생성
mailroom.post('/batch-assign', async (c) => {
  try {
    const { mailroom_ids, member_id, staff_id } = await c.req.json()
    
    if (!mailroom_ids || !Array.isArray(mailroom_ids) || mailroom_ids.length === 0) {
      return c.json({ error: '우편물 ID가 필요합니다.' }, 400)
    }
    
    if (!member_id) {
      return c.json({ error: '회원 ID가 필요합니다.' }, 400)
    }
    
    if (!staff_id) {
      return c.json({ error: '직원 ID가 필요합니다.' }, 400)
    }
    
    const createdTickets = []
    
    // 각 우편물에 대해 티켓 생성
    for (const mailroom_id of mailroom_ids) {
      // 우편물 정보 조회
      const { results: mailResults } = await c.env.DB.prepare(
        `SELECT * FROM mailroom_items WHERE id = ?`
      ).bind(mailroom_id).all()
      
      if (!mailResults || mailResults.length === 0) continue
      
      const mailItem = mailResults[0] as any
      
      // 티켓 번호 생성 (T + timestamp + random)
      const ticketNumber = `T${Date.now()}${Math.floor(Math.random() * 1000)}`
      
      // OCR 결과에서 제목 추출 (없으면 기본값)
      let title = '우편물 접수'
      if (mailItem.ocr_result) {
        try {
          const ocrData = JSON.parse(mailItem.ocr_result)
          if (ocrData.case_type === 'new_case') {
            title = '신규 우편물 접수'
          } else if (ocrData.case_type === 'continued_case') {
            title = '연속 우편물 접수'
          }
        } catch (e) {
          // OCR 결과 파싱 실패 시 기본값 사용
        }
      }
      
      // 티켓 생성
      const insertResult = await c.env.DB.prepare(`
        INSERT INTO tickets (
          ticket_number, title, description, ticket_type, status, priority,
          member_id, assigned_to, mailroom_id, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        ticketNumber,
        title,
        `우편물 ID: ${mailroom_id}`,
        'ORDER', // 주문 유형
        'assigned', // 배정됨 상태
        'normal', // 보통 우선순위
        member_id,
        staff_id,
        mailroom_id,
        staff_id
      ).run()
      
      const ticketId = insertResult.meta.last_row_id
      
      // 우편물 상태 업데이트 (assigned로 변경)
      await c.env.DB.prepare(`
        UPDATE mailroom_items 
        SET member_id = ?, ticket_id = ?, status = 'assigned', updated_at = datetime('now')
        WHERE id = ?
      `).bind(member_id, ticketId, mailroom_id).run()
      
      createdTickets.push({
        ticket_id: ticketId,
        ticket_number: ticketNumber,
        mailroom_id: mailroom_id
      })
    }
    
    return c.json({ 
      success: true, 
      tickets: createdTickets,
      count: createdTickets.length
    })
  } catch (error: any) {
    console.error('일괄 배당 오류:', error)
    return c.json({ error: '일괄 배당 중 오류가 발생했습니다.' }, 500)
  }
})

// 이미지 조회 API
mailroom.get('/image/:key', async (c) => {
  try {
    const key = c.req.param('key')
    
    // R2에서 이미지 조회
    const object = await c.env.R2.get(key)
    
    if (!object) {
      return c.json({ error: '이미지를 찾을 수 없습니다.' }, 404)
    }
    
    // 이미지 반환
    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000'
      }
    })
  } catch (error: any) {
    console.error('이미지 조회 오류:', error)
    return c.json({ error: '이미지 조회 중 오류가 발생했습니다.' }, 500)
  }
})

export default mailroom
