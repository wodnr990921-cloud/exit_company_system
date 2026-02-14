# EXIT System 배포 및 운영 가이드
## 📅 작성일: 2026-02-14

---

## 📋 목차
1. [개발 환경 설정](#개발-환경-설정)
2. [로컬 개발 가이드](#로컬-개발-가이드)
3. [프로덕션 배포](#프로덕션-배포)
4. [CI/CD 자동화](#cicd-자동화)
5. [모니터링 및 로깅](#모니터링-및-로깅)
6. [성능 최적화](#성능-최적화)
7. [보안 가이드](#보안-가이드)
8. [트러블슈팅](#트러블슈팅)

---

## 1. 개발 환경 설정

### 1.1 필수 도구 설치

```bash
# Node.js 18+ 설치 확인
node --version  # v18.0.0 이상

# npm 업데이트
npm install -g npm@latest

# Wrangler CLI 설치
npm install -g wrangler

# Git 설치 확인
git --version
```

### 1.2 프로젝트 클론

```bash
# 백엔드
cd /home/user
git clone https://github.com/your-username/exit-company-system.git webapp
cd webapp
npm install

# 프론트엔드
git clone https://github.com/your-username/exit-frontend.git
cd exit-frontend
npm install
```

### 1.3 환경 변수 설정

**백엔드 (.dev.vars):**
```env
# D1 Database
D1_DATABASE_ID=de6b386e-c93a-417d-a595-24321cc1bf0b

# OpenAI API
OPENAI_API_KEY=sk-...

# R2 Storage (자동 바인딩)
```

**프론트엔드 (.env.development):**
```env
VITE_API_BASE=http://localhost:8787/api
```

**프론트엔드 (.env.production):**
```env
VITE_API_BASE=https://exit-company-system.pages.dev/api
```

---

## 2. 로컬 개발 가이드

### 2.1 백엔드 개발 서버 실행

```bash
cd /home/user/webapp

# D1 마이그레이션 (최초 1회)
npx wrangler d1 migrations apply exit-company-production --local

# 개발 서버 시작
npm run dev

# 또는 D1 데이터베이스 포함
npm run dev:d1
```

**접속 URL**: http://localhost:8787

### 2.2 프론트엔드 개발 서버 실행

```bash
cd /home/user/exit-frontend

# 개발 서버 시작
npm run dev
```

**접속 URL**: http://localhost:5173

### 2.3 동시 개발 (권장)

**Terminal 1 - 백엔드:**
```bash
cd /home/user/webapp
npm run dev:d1
```

**Terminal 2 - 프론트엔드:**
```bash
cd /home/user/exit-frontend
npm run dev
```

**브라우저에서 접속**: http://localhost:5173

### 2.4 핫 리로드

- **프론트엔드**: Vite가 자동으로 변경 감지 및 HMR
- **백엔드**: Wrangler가 자동으로 변경 감지 및 재시작

---

## 3. 프로덕션 배포

### 3.1 사전 준비

#### Cloudflare 계정 설정
```bash
# Wrangler 로그인
npx wrangler login

# 계정 확인
npx wrangler whoami
```

#### D1 데이터베이스 생성 (최초 1회)
```bash
cd /home/user/webapp

# 프로덕션 DB 생성
npx wrangler d1 create exit-company-production

# 출력된 database_id를 wrangler.jsonc에 복사
# database_id: de6b386e-c93a-417d-a595-24321cc1bf0b

# 마이그레이션 적용
npx wrangler d1 migrations apply exit-company-production
```

#### R2 Bucket 생성 (최초 1회)
```bash
# R2 버킷 생성
npx wrangler r2 bucket create exit-company-images
```

### 3.2 백엔드 배포

```bash
cd /home/user/webapp

# 빌드
npm run build

# 배포
npx wrangler pages deploy dist --project-name exit-company
```

**배포 URL**: https://exit-company-system.pages.dev

### 3.3 프론트엔드 배포

```bash
cd /home/user/exit-frontend

# 빌드
npm run build

# 배포
npx wrangler pages deploy dist --project-name exit-frontend
```

**배포 URL**: https://exit-frontend.pages.dev

### 3.4 커스텀 도메인 설정 (선택)

```bash
# 백엔드 도메인 추가
npx wrangler pages domain add api.exit-system.com --project-name exit-company

# 프론트엔드 도메인 추가
npx wrangler pages domain add exit-system.com --project-name exit-frontend
```

**DNS 설정 (Cloudflare):**
- `api.exit-system.com` → CNAME → `exit-company-system.pages.dev`
- `exit-system.com` → CNAME → `exit-frontend.pages.dev`

### 3.5 환경 변수 (시크릿) 설정

```bash
# OpenAI API Key 설정
cd /home/user/webapp
npx wrangler pages secret put OPENAI_API_KEY --project-name exit-company
# 프롬프트에서 키 입력

# 시크릿 목록 확인
npx wrangler pages secret list --project-name exit-company
```

---

## 4. CI/CD 자동화

### 4.1 GitHub Actions 설정

**백엔드 (.github/workflows/deploy-backend.yml):**
```yaml
name: Deploy Backend

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy to Cloudflare Pages
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: exit-company
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

**프론트엔드 (.github/workflows/deploy-frontend.yml):**
```yaml
name: Deploy Frontend

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy to Cloudflare Pages
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        env:
          VITE_API_BASE: https://exit-company-system.pages.dev/api
        
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: exit-frontend
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

### 4.2 GitHub Secrets 설정

GitHub Repository → Settings → Secrets and variables → Actions

**필요한 Secrets:**
- `CLOUDFLARE_API_TOKEN`: Cloudflare API Token
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare Account ID

### 4.3 배포 프로세스

```bash
# 코드 변경 후 커밋
git add .
git commit -m "feat: Add new feature"
git push origin main

# GitHub Actions가 자동으로 빌드 및 배포
```

---

## 5. 모니터링 및 로깅

### 5.1 Cloudflare Analytics

**접속**: Cloudflare Dashboard → Pages → exit-company → Analytics

**확인 항목**:
- 요청 수
- 대역폭 사용량
- 응답 시간
- 에러율

### 5.2 실시간 로그 확인

```bash
# 백엔드 로그
npx wrangler pages deployment tail --project-name exit-company

# 특정 배포 로그
npx wrangler pages deployment tail <DEPLOYMENT_ID>
```

### 5.3 로그 레벨 설정

**src/index.tsx:**
```typescript
import { logger } from 'hono/logger'

const app = new Hono()

// 개발 환경에서만 로그
if (process.env.NODE_ENV === 'development') {
  app.use('*', logger())
}
```

### 5.4 에러 추적

**Sentry 통합 (권장):**
```bash
npm install @sentry/browser
```

**src/main.tsx:**
```typescript
import * as Sentry from '@sentry/browser'

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: import.meta.env.MODE,
})
```

---

## 6. 성능 최적화

### 6.1 빌드 최적화

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: true, filename: 'dist/stats.html' }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          store: ['zustand'],
          http: ['axios'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
```

### 6.2 코드 스플리팅

**React Lazy Loading:**
```tsx
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Tickets = lazy(() => import('./pages/Tickets'))

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tickets" element={<Tickets />} />
      </Routes>
    </Suspense>
  )
}
```

### 6.3 이미지 최적화

```typescript
// R2 이미지 URL에 변환 파라미터 추가
const imageUrl = `${API_BASE}/mailroom/image/${key}?width=800&quality=80`
```

### 6.4 캐싱 전략

**백엔드 (Hono):**
```typescript
import { cache } from 'hono/cache'

app.get(
  '/api/books',
  cache({
    cacheName: 'books-cache',
    cacheControl: 'max-age=3600',
  }),
  async (c) => {
    // ...
  }
)
```

**프론트엔드 (React Query 권장):**
```typescript
import { useQuery } from '@tanstack/react-query'

const { data, isLoading } = useQuery({
  queryKey: ['books'],
  queryFn: () => bookAPI.getBooks(),
  staleTime: 5 * 60 * 1000, // 5분
  cacheTime: 10 * 60 * 1000, // 10분
})
```

---

## 7. 보안 가이드

### 7.1 CORS 설정

**src/index.tsx:**
```typescript
import { cors } from 'hono/cors'

app.use('/api/*', cors({
  origin: [
    'http://localhost:5173',
    'https://exit-frontend.pages.dev',
    'https://exit-system.com',
  ],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}))
```

### 7.2 JWT 보안

**토큰 만료 시간:**
```typescript
// src/routes/auth.ts
const token = jwt.sign(
  { id: user.id, email: user.email },
  JWT_SECRET,
  { expiresIn: '24h' }  // 24시간 후 만료
)
```

**Refresh Token 구현 (권장):**
```typescript
// Access Token: 15분
// Refresh Token: 7일
```

### 7.3 Rate Limiting

**Cloudflare Rate Limiting:**
- Dashboard → Security → WAF → Rate Limiting Rules
- 예: 60 requests / minute per IP

### 7.4 SQL Injection 방어

**D1 Prepared Statements 사용:**
```typescript
// ✅ 안전
const result = await c.env.DB.prepare(
  'SELECT * FROM tickets WHERE id = ?'
).bind(ticketId).first()

// ❌ 위험
const result = await c.env.DB.prepare(
  `SELECT * FROM tickets WHERE id = ${ticketId}`
).first()
```

### 7.5 XSS 방어

**React는 기본적으로 방어:**
```tsx
// ✅ 안전 (자동 이스케이프)
<div>{userInput}</div>

// ❌ 위험
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

**필요 시 DOMPurify 사용:**
```typescript
import DOMPurify from 'dompurify'

const clean = DOMPurify.sanitize(userInput)
```

---

## 8. 트러블슈팅

### 8.1 빌드 오류

#### 문제: "Template literal error"
```
원인: 중첩된 템플릿 리터럴
해결: 문자열 연결 또는 DOM 생성 방식 사용
```

#### 문제: "Module not found"
```bash
# 해결
rm -rf node_modules package-lock.json
npm install
```

#### 문제: "Out of memory"
```bash
# 해결: Node 메모리 증가
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### 8.2 배포 오류

#### 문제: "Deployment failed"
```bash
# 로그 확인
npx wrangler pages deployment list --project-name exit-company

# 특정 배포 로그
npx wrangler pages deployment tail <DEPLOYMENT_ID>
```

#### 문제: "Worker size exceeded"
```
원인: 번들 크기가 10MB 초과
해결:
1. 번들 분석 (rollup-plugin-visualizer)
2. 불필요한 패키지 제거
3. Tree-shaking 확인
4. 코드 스플리팅
```

#### 문제: "D1 database not found"
```bash
# 데이터베이스 목록 확인
npx wrangler d1 list

# wrangler.jsonc의 database_id 확인
```

### 8.3 런타임 오류

#### 문제: "API 401 Unauthorized"
```
원인: 토큰 만료 또는 없음
해결:
1. localStorage에 토큰 확인
2. checkAuth() 호출
3. 로그인 다시 시도
```

#### 문제: "CORS error"
```
원인: CORS 설정 오류
해결:
1. 백엔드 CORS origin 확인
2. credentials: true 설정
3. 브라우저 캐시 삭제
```

#### 문제: "Infinite loading"
```
원인: API 호출 실패 또는 무한 루프
해결:
1. 브라우저 Console 확인
2. Network 탭 확인
3. useEffect 의존성 배열 확인
```

### 8.4 데이터베이스 오류

#### 문제: "Database locked"
```bash
# 로컬 DB 초기화
rm -rf .wrangler/state/v3/d1
npx wrangler d1 migrations apply exit-company-production --local
```

#### 문제: "Migration failed"
```bash
# 마이그레이션 이력 확인
npx wrangler d1 execute exit-company-production \
  --command="SELECT * FROM _cf_KV WHERE key = 'd1-migrations'"

# 강제 재적용 (주의!)
npx wrangler d1 migrations apply exit-company-production --force
```

---

## 9. 백업 및 복구

### 9.1 데이터베이스 백업

```bash
# D1 데이터 내보내기
npx wrangler d1 export exit-company-production --output backup.sql

# 또는 특정 테이블만
npx wrangler d1 execute exit-company-production \
  --command="SELECT * FROM tickets" > tickets_backup.sql
```

### 9.2 데이터베이스 복구

```bash
# SQL 파일 가져오기
npx wrangler d1 execute exit-company-production --file=backup.sql
```

### 9.3 R2 백업

```bash
# R2 파일 다운로드
npx wrangler r2 object get exit-company-images/IMAGE_KEY \
  --file=./backup/IMAGE_KEY
```

### 9.4 자동 백업 스크립트

**scripts/backup.sh:**
```bash
#!/bin/bash

DATE=$(date +%Y%m%d)
BACKUP_DIR="./backups/$DATE"

mkdir -p $BACKUP_DIR

# D1 백업
npx wrangler d1 export exit-company-production \
  --output "$BACKUP_DIR/db_backup.sql"

# 압축
tar -czf "$BACKUP_DIR.tar.gz" $BACKUP_DIR

echo "Backup completed: $BACKUP_DIR.tar.gz"
```

---

## 10. 유지보수 가이드

### 10.1 정기 점검 항목 (주 1회)

- [ ] 에러 로그 확인
- [ ] 응답 시간 확인
- [ ] 디스크 사용량 확인
- [ ] D1 데이터베이스 크기 확인
- [ ] R2 Storage 크기 확인

### 10.2 패키지 업데이트 (월 1회)

```bash
# 업데이트 가능한 패키지 확인
npm outdated

# 마이너 업데이트
npm update

# 메이저 업데이트 (주의!)
npm install <package>@latest

# 보안 취약점 확인
npm audit

# 자동 수정
npm audit fix
```

### 10.3 성능 모니터링

```bash
# Lighthouse CI
npm install -g @lhci/cli

lhci autorun --collect.url=https://exit-frontend.pages.dev
```

### 10.4 로그 보관 정책

- **액세스 로그**: 30일 보관
- **에러 로그**: 90일 보관
- **데이터베이스 백업**: 7일 주기, 4주 보관

---

## 11. 배포 체크리스트

### 배포 전

- [ ] 모든 테스트 통과
- [ ] 코드 리뷰 완료
- [ ] CHANGELOG 업데이트
- [ ] 버전 번호 업데이트 (package.json)
- [ ] 환경 변수 확인
- [ ] 데이터베이스 마이그레이션 확인

### 배포 중

- [ ] 백엔드 빌드 성공
- [ ] 프론트엔드 빌드 성공
- [ ] 백엔드 배포 성공
- [ ] 프론트엔드 배포 성공
- [ ] 배포 URL 접속 확인

### 배포 후

- [ ] 로그인 테스트
- [ ] 주요 기능 테스트
- [ ] API 응답 시간 확인
- [ ] 에러 로그 확인
- [ ] 모니터링 대시보드 확인
- [ ] 팀에 배포 알림

---

## 12. 롤백 가이드

### 12.1 즉시 롤백

```bash
# 이전 배포로 롤백
npx wrangler pages deployment list --project-name exit-company

# 특정 배포 ID로 롤백 (Cloudflare Dashboard에서 수동)
# Pages → exit-company → Deployments → "Rollback to this deployment"
```

### 12.2 Git 롤백

```bash
# 이전 커밋으로 되돌리기
git log --oneline
git revert <COMMIT_SHA>
git push origin main

# GitHub Actions가 자동으로 재배포
```

---

## 13. 참고 자료

### 공식 문서
- [Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [D1 Database](https://developers.cloudflare.com/d1/)
- [R2 Storage](https://developers.cloudflare.com/r2/)
- [Hono](https://hono.dev/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)

### 유용한 명령어

```bash
# Wrangler
npx wrangler --help
npx wrangler pages --help
npx wrangler d1 --help
npx wrangler r2 --help

# 프로젝트 정보
npx wrangler pages project list
npx wrangler d1 list
npx wrangler r2 bucket list

# 로그
npx wrangler pages deployment tail --project-name exit-company

# 시크릿
npx wrangler pages secret list --project-name exit-company
```

---

## 📞 지원

**문제 발생 시**:
1. 이 문서의 트러블슈팅 섹션 확인
2. GitHub Issues 검색
3. Cloudflare Community 검색
4. 팀 내부 문의

---

**마지막 업데이트**: 2026-02-14
