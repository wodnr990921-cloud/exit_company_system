# exit-system 프로젝트 마이그레이션 가이드

## 🎯 목표
Direct Upload 프로젝트를 Git 연동 프로젝트로 변경

---

## 📋 방법 1: 기존 도메인 유지 (권장)

### 1️⃣ 기존 프로젝트 삭제

1. Cloudflare Dashboard → Pages
2. exit-system 프로젝트 클릭
3. Settings → "Delete project" (맨 아래)
4. 확인 입력: `exit-system`
5. Delete 클릭

**주의**: 삭제 후 약 5분 후에 같은 이름으로 재생성 가능

### 2️⃣ Git 연동 프로젝트 생성

1. **"Create application"** 클릭
2. **"Connect to Git"** 선택
3. **GitHub** 선택 및 권한 승인
4. **저장소 선택**: `wodnr990921-cloud/exit_company_system`
5. **프로젝트 이름**: `exit-system` (기존과 동일)
6. **빌드 설정**:
   ```
   Production branch: main
   Build command: npm run build
   Build output directory: dist
   ```
7. **"Save and Deploy"** 클릭

### 3️⃣ 커스텀 도메인 재설정 (있는 경우)

Settings → Custom domains에서 도메인 다시 추가

---

## 📋 방법 2: 새 이름으로 프로젝트 생성

기존 프로젝트를 유지하고 새로운 프로젝트 생성:

### 1️⃣ 새 Git 연동 프로젝트 생성

1. **"Create application"** 클릭
2. **"Connect to Git"** 선택
3. **프로젝트 이름**: `exit-system-git` (새 이름)
4. 나머지 설정은 동일

### 2️⃣ 테스트

새 URL에서 정상 작동 확인:
- https://exit-system-git.pages.dev

### 3️⃣ 기존 프로젝트 삭제

새 프로젝트가 정상 작동하면 기존 `exit-system` 삭제

### 4️⃣ 프로젝트 이름 변경

Cloudflare에서는 프로젝트 이름 직접 변경 불가하므로:
1. 새 프로젝트 생성: `exit-system`
2. 기존 `exit-system-git` 삭제

---

## ✅ 마이그레이션 후 확인사항

### 1. 자동 배포 테스트

```bash
cd /home/user/webapp
echo "// Test auto-deploy" >> src/index.tsx
git add .
git commit -m "Test: Auto-deploy from GitHub"
git push origin main
```

Cloudflare Dashboard → Deployments에서 자동 배포 시작 확인

### 2. 환경 변수 확인

Settings → Environment variables에서 필요한 변수 설정

### 3. D1 데이터베이스 바인딩 확인

Settings → Functions → D1 database bindings:
- Variable name: `DB`
- D1 database: `exit-system-production`

### 4. R2 스토리지 바인딩 확인

Settings → Functions → R2 bucket bindings:
- Variable name: `R2`
- R2 bucket: `exit-system-mailroom`

---

## 🔧 wrangler.jsonc 업데이트

프로젝트 이름이 변경되면 `wrangler.jsonc` 업데이트:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "exit-system",  // 새 프로젝트 이름
  "compatibility_date": "2024-01-01",
  "pages_build_output_dir": "./dist",
  "compatibility_flags": ["nodejs_compat"],
  
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "exit-system-production",
      "database_id": "929f31de-899f-4015-be47-1a20e127bfe7"
    }
  ],
  
  "r2_buckets": [
    {
      "binding": "R2",
      "bucket_name": "exit-system-mailroom"
    }
  ]
}
```

---

## 📊 비교: Direct Upload vs Git 연동

| 기능 | Direct Upload | Git 연동 |
|------|---------------|----------|
| 배포 방법 | 수동 업로드 | 자동 (git push) |
| PR 프리뷰 | ❌ | ✅ |
| 배포 히스토리 | 제한적 | 완전한 Git 히스토리 |
| 롤백 | 수동 | Git 기반 자동 |
| 협업 | 어려움 | 쉬움 |

---

## 🆘 문제 해결

### "프로젝트 이름이 이미 사용 중"

- 5분 기다린 후 다시 시도
- 또는 다른 이름 사용 (`exit-system-2`)

### GitHub 권한 오류

1. GitHub → Settings → Applications
2. Cloudflare Pages 찾기
3. "Revoke" 클릭 후 다시 권한 부여

### 빌드 실패

1. Cloudflare Dashboard → Deployments → 실패한 배포 클릭
2. Build log 확인
3. 보통 `npm ci` 또는 `npm run build` 오류

---

## 📚 참고 자료

- Cloudflare Pages Git 연동: https://developers.cloudflare.com/pages/platform/git-integration/
- 프로젝트 마이그레이션: https://developers.cloudflare.com/pages/platform/known-issues/

