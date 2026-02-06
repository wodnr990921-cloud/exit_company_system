# EXIT System - Cloudflare Pages 배포 가이드

## 🚀 빠른 배포 (5분)

### 사전 준비
- Cloudflare 계정 (무료): https://dash.cloudflare.com
- Node.js 18+ 설치
- Git 설치

---

## 📦 방법 1: 로컬에서 직접 배포 (권장)

### 1단계: 프로젝트 다운로드 및 설정

```bash
# 프로젝트 압축 해제
tar -xzf exit-system-v8.5-deploy.tar.gz
cd webapp

# 의존성 설치
npm install

# 빌드
npm run build
```

### 2단계: Cloudflare 로그인

```bash
# Wrangler 로그인 (브라우저 열림)
npx wrangler login
```

### 3단계: D1 데이터베이스 생성

```bash
# 프로덕션 데이터베이스 생성
npx wrangler d1 create exit-system-production

# 출력된 database_id를 복사하여 wrangler.jsonc에 붙여넣기
# wrangler.jsonc의 d1_databases[0].database_id를 업데이트
```

### 4단계: wrangler.jsonc 업데이트

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "exit-system",
  "main": "src/index.tsx",
  "compatibility_date": "2024-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "pages_build_output_dir": "./dist",
  
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "exit-system-production",
      "database_id": "여기에-복사한-database-id-입력"
    }
  ]
}
```

### 5단계: 마이그레이션 실행

```bash
# 프로덕션 DB에 마이그레이션 적용
npx wrangler d1 migrations apply exit-system-production
```

### 6단계: Pages 프로젝트 생성 및 배포

```bash
# Pages 프로젝트 생성
npx wrangler pages project create exit-system \
  --production-branch main \
  --compatibility-date 2024-01-01

# 배포
npx wrangler pages deploy dist --project-name exit-system
```

### 7단계: 배포 확인

배포 완료 후 URL이 표시됩니다:
```
✨ Success! Uploaded 1 file
✨ https://exit-system.pages.dev
```

---

## 📦 방법 2: GitHub 연동 자동 배포

### 1단계: GitHub Repository 생성

```bash
# GitHub에 새 레포지토리 생성 후
git remote add origin https://github.com/YOUR_USERNAME/exit-system.git
git push -u origin main
```

### 2단계: Cloudflare Pages 연결

1. https://dash.cloudflare.com → **Workers & Pages** → **Create Application**
2. **Pages** 탭 선택 → **Connect to Git**
3. GitHub 계정 연결 및 레포지토리 선택
4. 빌드 설정:
   ```
   Framework preset: None
   Build command: npm run build
   Build output directory: dist
   Root directory: /
   ```

5. **Environment variables** 설정 (선택):
   ```
   NODE_VERSION=18
   ```

6. **Save and Deploy** 클릭

### 3단계: D1 데이터베이스 연결

1. Cloudflare 대시보드 → **Workers & Pages** → **exit-system**
2. **Settings** → **Bindings** → **Add binding**
3. **D1 database** 선택
4. Variable name: `DB`
5. D1 database: `exit-system-production` (생성 필요)
6. **Save** 클릭

### 4단계: 마이그레이션 실행

로컬에서:
```bash
npx wrangler d1 migrations apply exit-system-production
```

### 5단계: 재배포

GitHub에 푸시하면 자동 배포됩니다:
```bash
git add .
git commit -m "Configure D1 database"
git push origin main
```

---

## 🗄️ D1 데이터베이스 마이그레이션

### 마이그레이션 파일 위치
```
migrations/
├── 0001_initial_schema.sql
├── 0002_add_betting_system.sql
├── 0003_add_folders.sql
├── 0004_update_betting_system.sql
├── 0005_add_response_templates.sql
├── 0006_add_ticket_responses.sql
├── 0007_add_daily_closings.sql
└── 0008_update_closings_staff.sql
```

### 로컬 테스트
```bash
# 로컬 D1 데이터베이스에 마이그레이션 적용
npx wrangler d1 migrations apply exit-system-production --local

# 로컬 개발 서버 시작
npm run dev:d1
```

### 프로덕션 마이그레이션
```bash
# 프로덕션 DB에 마이그레이션 적용
npx wrangler d1 migrations apply exit-system-production

# 마이그레이션 상태 확인
npx wrangler d1 migrations list exit-system-production
```

---

## 🔐 관리자 계정 설정

배포 후 첫 관리자 계정 생성:

```bash
# D1 콘솔 접속
npx wrangler d1 execute exit-system-production

# SQL 실행
INSERT INTO staff (name, email, password, role, created_at)
VALUES (
  '관리자',
  'admin@prison-books.kr',
  'admin123',  -- ⚠️ 실제 배포 시 반드시 변경하세요!
  'admin',
  CURRENT_TIMESTAMP
);
```

**⚠️ 보안 주의사항**:
- 배포 후 즉시 비밀번호 변경
- 프로덕션에서는 강력한 비밀번호 사용
- 정기적인 비밀번호 변경 권장

---

## 🌐 커스텀 도메인 연결

### 1단계: 도메인 추가
```bash
npx wrangler pages domain add example.com --project-name exit-system
```

### 2단계: DNS 설정
Cloudflare DNS에 CNAME 레코드 추가:
```
Type: CNAME
Name: @  (또는 원하는 서브도메인)
Target: exit-system.pages.dev
Proxy status: Proxied (오렌지 클라우드)
```

### 3단계: SSL/TLS 설정
Cloudflare 대시보드 → **SSL/TLS** → **Full (strict)** 선택

---

## 📊 배포 후 체크리스트

- [ ] URL 접속 확인: https://exit-system.pages.dev
- [ ] 로그인 테스트: admin@prison-books.kr / admin123
- [ ] D1 데이터베이스 연결 확인
- [ ] 티켓 생성 테스트
- [ ] 회원 등록 테스트
- [ ] 배팅 시스템 테스트
- [ ] 일일 마감 테스트
- [ ] 관리자 비밀번호 변경 ⚠️

---

## 🐛 문제 해결

### 빌드 오류
```bash
# 캐시 삭제 후 재빌드
rm -rf node_modules dist .wrangler
npm install
npm run build
```

### D1 연결 오류
```bash
# 바인딩 확인
npx wrangler pages deployment list --project-name exit-system

# D1 상태 확인
npx wrangler d1 info exit-system-production
```

### 배포 로그 확인
```bash
# 최근 배포 로그
npx wrangler pages deployment tail --project-name exit-system
```

---

## 📞 지원

- Cloudflare Docs: https://developers.cloudflare.com/pages/
- Wrangler Docs: https://developers.cloudflare.com/workers/wrangler/
- D1 Docs: https://developers.cloudflare.com/d1/

---

## 🎉 배포 완료!

EXIT System이 성공적으로 배포되었습니다! 🚀

**다음 단계**:
1. 관리자 비밀번호 변경
2. 초기 데이터 입력 (회원, 도서 등)
3. 직원 계정 추가
4. 운영 시작

**접속 URL**: https://exit-system.pages.dev (또는 커스텀 도메인)
