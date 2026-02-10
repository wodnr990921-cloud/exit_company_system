# GitHub ↔ Cloudflare Pages 자동 배포 연동 가이드

## 🎯 목표

GitHub에 `git push`하면 자동으로 Cloudflare Pages에 배포되도록 설정

---

## 📋 방법 1: Cloudflare Dashboard 연동 (가장 쉬움) ⭐

### 1️⃣ Cloudflare Pages 대시보드 접속

1. **Cloudflare 대시보드 열기**
   - URL: https://dash.cloudflare.com/
   - 로그인

2. **Pages 프로젝트로 이동**
   - 좌측 메뉴: "Workers & Pages"
   - "Pages" 탭 클릭
   - "exit-system" 프로젝트 클릭

### 2️⃣ GitHub 연동 설정

1. **Settings 탭 클릭**

2. **"Builds & deployments" 섹션 찾기**

3. **"Connect to Git" 클릭** (또는 "Source" 섹션에서 "Connect")

4. **GitHub 선택**
   - "Connect GitHub" 버튼 클릭
   - GitHub 로그인 (필요시)
   - Cloudflare Pages 앱 권한 승인

5. **저장소 선택**
   - 저장소: `wodnr990921-cloud/exit_company_system`
   - Production 브랜치: `main`

6. **빌드 설정**
   ```
   Build command: npm run build
   Build output directory: dist
   Root directory: (비워두기 또는 /)
   ```

7. **환경 변수 설정** (선택사항)
   - `NODE_VERSION`: 18 또는 20
   - 기타 환경 변수는 필요시 추가

8. **"Save and Deploy" 클릭**

### 3️⃣ 자동 배포 확인

이제부터:
- `git push origin main` → 자동으로 Cloudflare Pages 배포 시작
- GitHub PR 생성 → Preview 배포 생성
- 배포 상태는 Cloudflare Dashboard에서 확인 가능

---

## 📋 방법 2: GitHub Actions 워크플로우 (고급)

Cloudflare Dashboard 연동이 안 되면 GitHub Actions 사용:

### 1️⃣ GitHub Secrets 설정

1. **GitHub 저장소로 이동**
   - https://github.com/wodnr990921-cloud/exit_company_system

2. **Settings → Secrets and variables → Actions**

3. **New repository secret 클릭**
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: `GmLjbrVQa6y7pupsPiS4plyhNqHAz1U6BliHpHpi`
   - "Add secret" 클릭

4. **Account ID 추가**
   - Name: `CLOUDFLARE_ACCOUNT_ID`
   - Value: `25c3e9e62e47328ad63f39ad0cf8bc55`
   - "Add secret" 클릭

### 2️⃣ GitHub Actions 워크플로우 생성

파일: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches:
      - main
  pull_request:

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    name: Deploy to Cloudflare Pages
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
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
          projectName: exit-system
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
          branch: main
```

### 3️⃣ 워크플로우 푸시

```bash
cd /home/user/webapp
mkdir -p .github/workflows
# 위 내용을 .github/workflows/deploy.yml 파일로 저장
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Actions workflow for Cloudflare Pages deployment"
git push origin main
```

---

## ✅ 연동 확인

### 테스트 방법

1. **코드 수정**
   ```bash
   cd /home/user/webapp
   echo "// Test" >> src/index.tsx
   git add .
   git commit -m "Test: Trigger auto-deploy"
   git push origin main
   ```

2. **배포 확인**
   - **방법 1 (Dashboard 연동)**: Cloudflare Pages Dashboard에서 배포 진행 상황 확인
   - **방법 2 (GitHub Actions)**: GitHub 저장소 → "Actions" 탭에서 워크플로우 실행 확인

3. **배포 완료 확인**
   - URL: https://exit-system.pages.dev
   - 변경사항이 반영되었는지 확인

---

## 🔄 배포 흐름

### 자동 배포 프로세스

```
개발자 코드 수정
    ↓
git add & commit
    ↓
git push origin main
    ↓
GitHub 저장소 업데이트
    ↓
[Cloudflare Dashboard 연동 OR GitHub Actions 트리거]
    ↓
npm install & npm run build
    ↓
Cloudflare Pages 배포
    ↓
✅ https://exit-system.pages.dev 업데이트
```

---

## 🎯 권장 방법

**방법 1 (Cloudflare Dashboard 연동)**을 추천합니다:
- ✅ 설정이 가장 간단
- ✅ Cloudflare에서 직접 관리
- ✅ GitHub Actions 설정 불필요
- ✅ PR 프리뷰 자동 생성
- ✅ 배포 히스토리 관리 편리

**방법 2 (GitHub Actions)**는 다음 경우에 사용:
- Cloudflare Dashboard 연동이 작동하지 않을 때
- 더 복잡한 빌드 프로세스가 필요할 때
- 다른 GitHub Actions와 통합이 필요할 때

---

## 📚 추가 자료

- **Cloudflare Pages 문서**: https://developers.cloudflare.com/pages/
- **Git 연동 가이드**: https://developers.cloudflare.com/pages/platform/git-integration/
- **GitHub Actions**: https://github.com/cloudflare/pages-action

---

## 🆘 문제 해결

### 연동이 안 될 때

1. **GitHub 권한 확인**
   - GitHub → Settings → Applications
   - Cloudflare Pages 앱이 저장소 접근 권한이 있는지 확인

2. **Cloudflare 권한 확인**
   - API 토큰에 Pages:Edit 권한이 있는지 확인
   - Account 권한도 필요

3. **빌드 설정 확인**
   - `package.json`에 `build` 스크립트가 있는지 확인
   - 빌드 결과가 `dist/` 폴더에 생성되는지 확인

---

**현재 상태**:
- ✅ GitHub 저장소: https://github.com/wodnr990921-cloud/exit_company_system
- ✅ Cloudflare Pages: https://exit-system.pages.dev
- ⏳ 자동 배포 연동: 위 방법 중 하나 선택하여 설정
