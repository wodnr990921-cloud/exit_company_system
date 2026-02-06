import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
}

const books = new Hono<{ Bindings: Bindings }>()

// 도서 목록 조회
books.get('/', async (c) => {
  try {
    const search = c.req.query('search') || ''
    const status = c.req.query('status') || 'all'

    let query = `SELECT * FROM books WHERE 1=1`
    const params: any[] = []

    if (search) {
      query += ` AND (title LIKE ? OR author LIKE ? OR publisher LIKE ? OR isbn LIKE ?)`
      const searchPattern = `%${search}%`
      params.push(searchPattern, searchPattern, searchPattern, searchPattern)
    }

    if (status && status !== 'all') {
      query += ` AND status = ?`
      params.push(status)
    }

    query += ` ORDER BY title ASC`

    const { results } = await c.env.DB.prepare(query).bind(...params).all()

    return c.json({ books: results })
  } catch (error) {
    console.error('도서 목록 조회 오류:', error)
    return c.json({ error: '도서 목록 조회 중 오류가 발생했습니다.' }, 500)
  }
})

// 도서 등록
books.post('/', async (c) => {
  try {
    const { title, author, publisher, isbn, price, stock } = await c.req.json()

    if (!title || price === undefined) {
      return c.json({ error: '필수 항목을 입력해주세요.' }, 400)
    }

    const status = (stock && stock > 0) ? 'available' : 'out_of_stock'

    const result = await c.env.DB.prepare(
      `INSERT INTO books (title, author, publisher, isbn, price, stock, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(title, author || '', publisher || '', isbn || '', price, stock || 0, status).run()

    return c.json({ 
      success: true, 
      book_id: result.meta.last_row_id 
    })
  } catch (error) {
    console.error('도서 등록 오류:', error)
    return c.json({ error: '도서 등록 중 오류가 발생했습니다.' }, 500)
  }
})

// 도서 수정
books.patch('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const updates = await c.req.json()

    const allowedFields = ['title', 'author', 'publisher', 'isbn', 'price', 'stock']
    const setClause: string[] = []
    const params: any[] = []

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = ?`)
        params.push(value)
      }
    }

    // 재고에 따라 상태 자동 업데이트
    if ('stock' in updates) {
      const status = updates.stock > 0 ? 'available' : 'out_of_stock'
      setClause.push('status = ?')
      params.push(status)
    }

    if (setClause.length === 0) {
      return c.json({ error: '수정할 항목이 없습니다.' }, 400)
    }

    params.push(id)

    await c.env.DB.prepare(
      `UPDATE books SET ${setClause.join(', ')} WHERE id = ?`
    ).bind(...params).run()

    return c.json({ success: true })
  } catch (error) {
    console.error('도서 수정 오류:', error)
    return c.json({ error: '도서 수정 중 오류가 발생했습니다.' }, 500)
  }
})

// 도서 삭제
books.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')

    await c.env.DB.prepare('DELETE FROM books WHERE id = ?').bind(id).run()

    return c.json({ success: true })
  } catch (error) {
    console.error('도서 삭제 오류:', error)
    return c.json({ error: '도서 삭제 중 오류가 발생했습니다.' }, 500)
  }
})

export default books
