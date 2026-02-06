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
    
    if (!member_id || !image_keys || image_keys.length === 0) {
      return c.json({ error: '필수 항목을 입력해주세요.' }, 400)
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
    return c.json({ error: '우편물 등록 중 오류가 발생했습니다.' }, 500)
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
        // 모델: @cf/unum/uform-gen2-qwen-500m (Vision + Text)
        const aiResponse = await c.env.AI.run('@cf/unum/uform-gen2-qwen-500m', {
          image: Array.from(new Uint8Array(imageBuffer)),
          prompt: "이 이미지의 모든 텍스트를 추출해주세요. 한글과 영어를 모두 인식하세요.",
          max_tokens: 512
        })
        
        // OCR 결과 파싱
        const extractedText = aiResponse?.description || aiResponse?.text || ''
        
        // 봉투 감지 (간단한 키워드 기반)
        const hasEnvelope = detectEnvelope(extractedText)
        
        ocrResults.push({
          image_key: key,
          text: extractedText,
          confidence: 0.85, // AI 모델은 confidence를 제공하지 않을 수 있음
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
    
    // OCR 결과 저장
    await c.env.DB.prepare(`
      UPDATE mailroom_items 
      SET ocr_result = ?, status = 'ocr_completed', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(JSON.stringify(ocrResults), id).run()
    
    return c.json({
      success: true,
      ocr_results: ocrResults
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
  const envelopeKeywords = [
    '발신', '수신', '우편번호', '주소', '보내는 사람', '받는 사람',
    '우표', '등기', '소인', 'sender', 'receiver', 'address', 'zip code'
  ]
  
  const lowerText = text.toLowerCase()
  return envelopeKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()))
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

export default mailroom
