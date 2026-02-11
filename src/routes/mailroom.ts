import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  R2: R2Bucket
  AI: any
  OPENAI_API_KEY: string
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
      text = await callOpenAIVision(c, imageBuffer)
    } catch (aiError: any) {
      console.error('OpenAI OCR error:', aiError)
      text = '[AI OCR 실패: ' + aiError.message + ']'
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
          extractedText = await callOpenAIVision(c, imageBuffer)
          aiResponse = { response: extractedText }
        } catch (aiError: any) {
          console.error('OpenAI OCR error for ' + key + ':', aiError)
          extractedText = '[AI OCR 실패: ' + aiError.message + ']'
        }
        
        // 봉투 감지 (간단한 키워드 기반)
        const hasEnvelope = detectEnvelope(extractedText)
        
        // 우편물 정보 추출 (발신자 정보 + 편지 내용)
        const mailInfo = extractMailInfo(extractedText, hasEnvelope)
        
        ocrResults.push({
          image_key: key,
          text: extractedText,
          confidence: 0.90, // Llama 3.2 Vision은 고정밀 모델
          has_envelope: hasEnvelope,
          sender_info: mailInfo.sender_info,  // 발신자 정보
          letter_content: mailInfo.letter_content,  // 편지 내용
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
    
    // 회원 자동 매칭 (봉투가 있는 경우에만)
    let matchedMemberId = null
    if (hasAnyEnvelope) {
      const envelopeResult = ocrResults.find(r => r.has_envelope && r.sender_info)
      if (envelopeResult?.sender_info) {
        const { sender_name, inmate_number } = envelopeResult.sender_info
        
        if (sender_name && inmate_number) {
          // 이름 + 수용번호로 회원 검색
          const { results: members } = await c.env.DB.prepare(`
            SELECT id FROM members 
            WHERE name = ? AND inmate_number = ?
            LIMIT 1
          `).bind(sender_name, inmate_number).all()
          
          if (members.length > 0) {
            matchedMemberId = (members[0] as any).id
            
            // 자동으로 회원 연결
            await c.env.DB.prepare(`
              UPDATE mailroom_items 
              SET member_id = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).bind(matchedMemberId, id).run()
            
            console.log(`Auto-matched member ${matchedMemberId} for mail ${id}`)
          }
        }
      }
    }
    
    return c.json({
      success: true,
      case_type: caseType,
      has_envelope: hasAnyEnvelope,
      matched_member_id: matchedMemberId,
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
  
  const lowerText = text.toLowerCase()
  
  // 2. 사서함 주소 확인 (필수)
  const hasMailbox = lowerText.includes('사서함') || 
                     lowerText.includes('사 서') || 
                     lowerText.includes('p.o. box')
  
  // 3. 발신자 정보 확인
  const hasSenderInfo = lowerText.includes('발신') || 
                        lowerText.includes('보내는') ||
                        lowerText.includes('sender') ||
                        lowerText.includes('from')
  
  // 4. 사서함 주소 패턴 (예: 사서함 123-1234)
  const hasMailboxAddress = /사서함\s*\d+\s*-\s*\d{1,4}/.test(text)
  
  // 5. 강한 봉투 신호: 사서함 주소 패턴 또는 (사서함 + 발신자 정보)
  if (hasMailboxAddress || (hasMailbox && hasSenderInfo)) {
    return true
  }
  
  // 6. 약한 신호: 수용기관 이름 + 사서함
  const institutionKeywords = [
    '교도소', '구치소', '교정', '수용',
    '서울', '안양', '의정부', '수원', '청주', '대전', '대구', '부산'
  ]
  
  const hasInstitution = institutionKeywords.some(keyword => 
    lowerText.includes(keyword.toLowerCase())
  )
  
  return hasMailbox && hasInstitution
}

// 우편물 정보 추출 헬퍼 함수 (발신자 정보 + 편지 내용)
function extractMailInfo(text: string, hasEnvelope: boolean): any {
  const result: any = {
    sender_info: null,
    letter_content: null
  }
  
  // 1. 발신자 정보 추출 (봉투가 있을 때만)
  if (hasEnvelope) {
    const senderInfo: any = {}
    
    // 발신자 이름
    const senderPatterns = [
      /발신자:\s*([가-힣\s]+)/,
      /발신:\s*([가-힣\s]+)/,
      /보내는\s*사람:\s*([가-힣\s]+)/,
      /보낸\s*사람:\s*([가-힣\s]+)/
    ]
    
    for (const pattern of senderPatterns) {
      const match = text.match(pattern)
      if (match) {
        senderInfo.sender_name = match[1].trim()
        break
      }
    }
    
    // 사서함 주소 + 수용번호 추출
    // 형식: "서울 사서함 211-1111"
    // → 수용기관: 서울
    // → 사서함주소: 서울 사서함 211
    // → 수용번호: 1111
    
    const fullAddressPattern = /([가-힣]{2,4})\s*사서함\s*(\d+)\s*-\s*(\d{1,4})/
    const fullMatch = text.match(fullAddressPattern)
    
    if (fullMatch) {
      senderInfo.institution = fullMatch[1].trim()  // 서울
      senderInfo.mailbox_address = `${fullMatch[1]} 사서함 ${fullMatch[2]}`  // 서울 사서함 211
      senderInfo.inmate_number = fullMatch[3]  // 1111
    } else {
      // 패턴 매칭 실패 시 개별 추출
      
      // 수용기관 (라벨 또는 사서함 앞)
      if (!senderInfo.institution) {
        const institutionPatterns = [
          /수용기관:\s*([가-힣]+)/,
          /([가-힣]{2,4})\s*사서함/
        ]
        
        for (const pattern of institutionPatterns) {
          const match = text.match(pattern)
          if (match) {
            senderInfo.institution = match[1].trim()
            break
          }
        }
      }
      
      // 수용번호 (라벨 또는 하이픈 뒤)
      if (!senderInfo.inmate_number) {
        const inmateNumberPatterns = [
          /수용번호:\s*(\d{1,4})/,
          /사서함\s*\d+\s*-\s*(\d{1,4})/,
          /\((\d{1,4})\)/
        ]
        
        for (const pattern of inmateNumberPatterns) {
          const match = text.match(pattern)
          if (match) {
            senderInfo.inmate_number = match[1]
            break
          }
        }
      }
      
      // 사서함주소 (라벨 또는 패턴)
      if (!senderInfo.mailbox_address) {
        const mailboxPatterns = [
          /주소:\s*([가-힣]{2,4}\s*사서함\s*\d+)/,
          /([가-힣]{2,4}\s*사서함\s*\d+)/
        ]
        
        for (const pattern of mailboxPatterns) {
          const match = text.match(pattern)
          if (match) {
            senderInfo.mailbox_address = match[1].trim()
            break
          }
        }
      }
    }
    
    // 전체 주소 (참고용)
    const fullAddressPatterns = [
      /주소:\s*([^\n]+)/,
      /([가-힣]{2,4}\s*사서함\s*\d+\s*-\s*\d{1,4})/
    ]
    
    for (const pattern of fullAddressPatterns) {
      const match = text.match(pattern)
      if (match) {
        senderInfo.full_address = match[1].trim()
        break
      }
    }
    
    result.sender_info = Object.keys(senderInfo).length > 0 ? senderInfo : null
  }
  
  // 2. 편지 내용 추출
  const contentPatterns = [
    /내용:\s*([\s\S]+)/,  // "내용:" 라벨 이후 모든 텍스트
    /\[ENVELOPE: (?:YES|NO)\][\s\S]*?(?:주소:[^\n]+\n)([\s\S]+)/  // 봉투 정보 이후 모든 텍스트
  ]
  
  for (const pattern of contentPatterns) {
    const match = text.match(pattern)
    if (match) {
      result.letter_content = match[1].trim()
      break
    }
  }
  
  // 내용 라벨이 없으면 전체 텍스트를 내용으로 간주 (봉투가 없을 때)
  if (!result.letter_content && !hasEnvelope) {
    result.letter_content = text.trim()
  }
  
  return result
}

// 발신자 정보 추출 헬퍼 함수 (하위 호환성 유지)
function extractSenderInfo(text: string): any {
  const senderInfo: any = {}
  
  // 1. 발신자 이름 추출
  const senderPatterns = [
    /발신자:\s*([가-힣\s]+)/,
    /발신:\s*([가-힣\s]+)/,
    /보내는\s*사람:\s*([가-힣\s]+)/,
    /보낸\s*사람:\s*([가-힣\s]+)/
  ]
  
  for (const pattern of senderPatterns) {
    const match = text.match(pattern)
    if (match) {
      senderInfo.sender_name = match[1].trim()
      break
    }
  }
  
  // 2. 사서함 주소 + 수용번호 추출 (통합 패턴)
  // 형식: "서울 사서함 211-1111"
  // → 수용기관: 서울, 사서함주소: 서울 사서함 211, 수용번호: 1111
  
  const fullPattern = /([가-힣]{2,4})\s*사서함\s*(\d+)\s*-\s*(\d{1,4})/
  const fullMatch = text.match(fullPattern)
  
  if (fullMatch) {
    senderInfo.institution = fullMatch[1].trim()
    senderInfo.mailbox_address = `${fullMatch[1]} 사서함 ${fullMatch[2]}`
    senderInfo.inmate_number = fullMatch[3]
    senderInfo.full_address = fullMatch[0].trim()
  } else {
    // 개별 추출
    
    // 수용기관
    const institutionPatterns = [
      /수용기관:\s*([가-힣]+)/,
      /([가-힣]{2,4})\s*사서함/
    ]
    
    for (const pattern of institutionPatterns) {
      const match = text.match(pattern)
      if (match) {
        senderInfo.institution = match[1].trim()
        break
      }
    }
    
    // 수용번호
    const inmateNumberPatterns = [
      /수용번호:\s*(\d{1,4})/,
      /사서함\s*\d+\s*-\s*(\d{1,4})/,
      /\((\d{1,4})\)/
    ]
    
    for (const pattern of inmateNumberPatterns) {
      const match = text.match(pattern)
      if (match) {
        senderInfo.inmate_number = match[1]
        break
      }
    }
    
    // 사서함주소
    const mailboxPatterns = [
      /주소:\s*([가-힣]{2,4}\s*사서함\s*\d+)/,
      /([가-힣]{2,4}\s*사서함\s*\d+)/
    ]
    
    for (const pattern of mailboxPatterns) {
      const match = text.match(pattern)
      if (match) {
        senderInfo.mailbox_address = match[1].trim()
        break
      }
    }
    
    // 전체 주소
    const addressPatterns = [
      /주소:\s*([^\n]+)/,
      /([가-힣]{2,4}\s*사서함\s*\d+\s*-\s*\d{1,4})/
    ]
    
    for (const pattern of addressPatterns) {
      const match = text.match(pattern)
      if (match) {
        senderInfo.full_address = match[1].trim()
        break
      }
    }
  }
  
  // 3. 편지 내용 추출
  const contentPattern = /내용:\s*(.+)/s
  const contentMatch = text.match(contentPattern)
  if (contentMatch) {
    senderInfo.letter_content = contentMatch[1].trim()
  }
  
  return Object.keys(senderInfo).length > 0 ? senderInfo : null
}

// 주소 정보 추출 헬퍼 함수 (구 버전, 하위 호환성 유지)
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

// 우편물 정보 수정 (담당자 배정, 회원 연결 등)
mailroom.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const { member_id, staff_id, ocr_result, notes, status } = body
    
    const updates: string[] = []
    const params: any[] = []
    
    if (member_id !== undefined) {
      updates.push('member_id = ?')
      params.push(member_id)
    }
    
    if (staff_id !== undefined) {
      updates.push('staff_id = ?')
      params.push(staff_id)
    }
    
    if (ocr_result !== undefined) {
      updates.push('ocr_result = ?')
      params.push(typeof ocr_result === 'string' ? ocr_result : JSON.stringify(ocr_result))
    }
    
    if (notes !== undefined) {
      updates.push('notes = ?')
      params.push(notes)
    }
    
    if (status !== undefined) {
      updates.push('status = ?')
      params.push(status)
    }
    
    if (updates.length === 0) {
      return c.json({ error: '수정할 내용이 없습니다.' }, 400)
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP')
    params.push(id)
    
    const query = `UPDATE mailroom_items SET ${updates.join(', ')} WHERE id = ?`
    await c.env.DB.prepare(query).bind(...params).run()
    
    return c.json({ success: true })
  } catch (error: any) {
    console.error('우편물 수정 오류:', error)
    return c.json({ error: '수정 중 오류가 발생했습니다.' }, 500)
  }
})

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

// OpenAI GPT-4o Vision OCR 함수
async function callOpenAIVision(c: any, imageBuffer: ArrayBuffer): Promise<string> {
  const apiKey = c.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }
  
  const uint8Array = new Uint8Array(imageBuffer)
  const base64Image = btoa(
    uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), '')
  )
  
  const promptText = `이 편지 이미지를 분석하세요.

**중요: 발신자 정보는 절대 추출하지 마세요. 수신자 정보만 추출하세요.**

**STEP 1: 봉투 판별** (이미지 상단 1/3 영역을 집중 분석)
- 이미지 맨 위에 주소 정보가 있는지 확인하세요
- 다음 조건을 **모두** 만족해야 [ENVELOPE: YES]:
  1. **반드시 "사서함" 키워드가 포함**되어야 함
  2. "OO 사서함 XX-YYYY" 형식 (예: 서울 사서함 211-1111)
  3. 또는 "OO사서함XX-YYYY" (띄어쓰기 없음)
- 위 조건을 만족하지 않으면 → [ENVELOPE: NO]

**STEP 2: 수신자 정보 추출 (봉투가 있으면)**
- **수신자**: 편지를 **받는** 사람 이름 (상단 봉투에서만)
- **수용기관**: 주소에서 '사서함' 앞의 지역명 (예: "서울 사서함 211-1111" → "서울")
- **사서함주소**: 하이픈 전까지 (예: "서울 사서함 211-1111" → "서울 사서함 211")
- **수용번호**: 하이픈 뒤 숫자만 (예: "서울 사서함 211-1111" → "1111")
- **주소**: 전체 주소 그대로 (예: "서울 사서함 211-1111")

**주소 형식 예시:**
"서울 사서함 211-1111"
  → 수신자: 홍길동 (받는 사람)
  → 수용기관: 서울
  → 사서함주소: 서울 사서함 211
  → 수용번호: 1111
  → 주소: 서울 사서함 211-1111

**STEP 3: 편지 요약 및 카테고리 분류**
- **편지 요약**: 편지 내용을 2-3문장으로 간단히 요약 (핵심만)
- **카테고리**: 다음 중 하나로 분류
  • 도서: 책 관련 요청
  • 베팅: 배팅/게임 관련
  • 문의: 질문/문의 사항
  • 이체: 금전 이체 요청
  • 충전: 계좌 충전 요청
  • 기타: 위에 해당하지 않음

**STEP 4: 원문 추출**
- **이미지에 보이는 모든 텍스트를 그대로 추출**하세요
- 줄바꿈과 문단 구조를 유지하세요

**응답 형식 (정확히 이 형식으로):**
[ENVELOPE: YES/NO]
수신자: (받는 사람 이름)
수용기관: (지역명)
사서함주소: (서울 사서함 211)
수용번호: (1111)
주소: (서울 사서함 211-1111)
요약: (2-3문장 요약)
카테고리: (도서/베팅/문의/이체/충전/기타)
원문: (이미지의 모든 텍스트를 그대로 포함)`
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: promptText
            },
            {
              type: 'image_url',
              image_url: {
                url: 'data:image/jpeg;base64,' + base64Image,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 1500,
      temperature: 0.1
    })
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error('OpenAI API 오류 (' + response.status + '): ' + errorText)
  }
  
  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

export default mailroom
