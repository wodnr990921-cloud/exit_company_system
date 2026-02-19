import { Context, Next } from 'hono'

// 권한 레벨 정의
export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  VIEWER: 'viewer'
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

// 권한 레벨 순서 (높을수록 강력)
const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 3,
  staff: 2,
  viewer: 1
}

// 권한 검증 미들웨어
export function requireRole(minRole: Role) {
  return async (c: Context, next: Next) => {
    const staffId = c.req.header('X-Staff-ID')
    
    console.log('[Auth Middleware] Staff ID:', staffId)
    
    if (!staffId) {
      console.log('[Auth Middleware] No staff ID provided')
      return c.json({ error: '인증이 필요합니다.', details: 'X-Staff-ID 헤더가 없습니다.' }, 401)
    }

    try {
      // DB에서 직원 정보 조회
      const staff = await c.env.DB.prepare(`
        SELECT id, email, name, role FROM staff WHERE id = ?
      `).bind(parseInt(staffId)).first()

      console.log('[Auth Middleware] Staff from DB:', staff)

      if (!staff) {
        console.log('[Auth Middleware] Staff not found in DB')
        return c.json({ error: '직원 정보를 찾을 수 없습니다.', details: `Staff ID ${staffId}를 DB에서 찾을 수 없습니다.` }, 404)
      }

      const userRole = staff.role as Role
      const userLevel = ROLE_HIERARCHY[userRole] || 0
      const requiredLevel = ROLE_HIERARCHY[minRole]

      console.log('[Auth Middleware] Role check:', { userRole, userLevel, requiredLevel })

      if (userLevel < requiredLevel) {
        console.log('[Auth Middleware] Insufficient permissions')
        return c.json({ 
          error: '접근 권한이 없습니다.',
          required: minRole,
          current: userRole,
          details: `${userRole} 권한으로는 ${minRole} 권한이 필요한 작업을 수행할 수 없습니다.`
        }, 403)
      }

      // Context에 직원 정보 저장
      c.set('staff', staff)
      console.log('[Auth Middleware] Staff set in context, calling next()')
      await next()
      console.log('[Auth Middleware] Returned from next()')
    } catch (error) {
      console.error('[Auth Middleware] 권한 검증 오류:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : 'No stack trace'
      console.error('[Auth Middleware] Error details:', errorMessage)
      console.error('[Auth Middleware] Error stack:', errorStack)
      return c.json({ 
        error: '권한 검증 중 오류가 발생했습니다.',
        details: errorMessage,
        stack: errorStack
      }, 500)
    }
  }
}

// 특정 권한만 허용하는 미들웨어
export function requireExactRole(role: Role) {
  return async (c: Context, next: Next) => {
    const staffId = c.req.header('X-Staff-ID')
    
    if (!staffId) {
      return c.json({ error: '인증이 필요합니다.' }, 401)
    }

    try {
      const staff = await c.env.DB.prepare(`
        SELECT id, email, name, role FROM staff WHERE id = ?
      `).bind(parseInt(staffId)).first()

      if (!staff) {
        return c.json({ error: '직원 정보를 찾을 수 없습니다.' }, 404)
      }

      if (staff.role !== role) {
        return c.json({ 
          error: `${role} 권한이 필요합니다.`,
          current: staff.role
        }, 403)
      }

      c.set('staff', staff)
      await next()
    } catch (error) {
      console.error('권한 검증 오류:', error)
      return c.json({ error: '권한 검증 중 오류가 발생했습니다.' }, 500)
    }
  }
}

// 읽기 전용 체크 (viewer는 읽기만 가능)
export function checkReadOnly(c: Context): boolean {
  const staff = c.get('staff')
  return staff?.role === ROLES.VIEWER
}

// 권한 체크 헬퍼 함수
export function hasPermission(userRole: Role, requiredRole: Role): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] || 0
  const requiredLevel = ROLE_HIERARCHY[requiredRole]
  return userLevel >= requiredLevel
}
