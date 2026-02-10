# GitHub - Cloudflare Pages 권한 문제 해결 가이드

## ❌ 오류 메시지
"Failed to load repositories. Please check your connection and try again."

## 🔍 원인
Cloudflare Pages가 GitHub 저장소에 접근할 수 없음

---

## ✅ 해결 방법

### 1️⃣ GitHub에서 Cloudflare Pages 앱 제거

1. **GitHub 접속**: https://github.com/settings/installations

2. **Cloudflare Pages 찾기**
   - Installed GitHub Apps 섹션에서 "Cloudflare Pages" 찾기

3. **Configure 클릭**

4. **Uninstall 클릭** (또는 맨 아래 "Uninstall" 버튼)
   - 확인 대화창에서 "OK" 클릭

### 2️⃣ Cloudflare에서 다시 GitHub 연결

1. **Cloudflare Dashboard**: https://dash.cloudflare.com/

2. **Workers & Pages → Create application**

3. **"Connect to Git"** 선택

4. **GitHub 선택**

5. **새로운 권한 요청이 나타남**
   - "Install & Authorize" 클릭
   - GitHub 로그인 (필요시)

6. **저장소 접근 권한 설정**
   
   **옵션 A - 특정 저장소만 선택 (권장)**:
   ```
   ○ Only select repositories
   └─ Select repositories 드롭다운 클릭
      └─ exit_company_system 체크
   ```
   
   **옵션 B - 모든 저장소 접근**:
   ```
   ○ All repositories
   ```

7. **"Install" 버튼 클릭**

8. **Cloudflare로 리다이렉트**
   - 저장소 목록이 이제 나타남
   - `wodnr990921-cloud/exit_company_system` 선택 가능

### 3️⃣ 프로젝트 생성

1. **저장소 선택**: `exit_company_system`

2. **프로젝트 이름**: `exit-system-git`

3. **빌드 설정**:
   ```
   Production branch: main
   Build command: npm run build
   Build output directory: dist
   Root directory: / (비워두기)
   ```

4. **"Save and Deploy"** 클릭

---

## 🔄 대안: GitHub Personal Access Token 사용

만약 GitHub Apps 방식이 계속 실패하면:

### 1️⃣ GitHub Personal Access Token 생성

1. **GitHub 접속**: https://github.com/settings/tokens

2. **"Generate new token" → "Generate new token (classic)"**

3. **Token 설정**:
   ```
   Note: Cloudflare Pages Deploy
   Expiration: No expiration (또는 1년)
   
   Scopes (필수):
   ✅ repo (전체)
   ✅ workflow
   ```

4. **"Generate token"** 클릭

5. **토큰 복사** (한 번만 표시됨!)

### 2️⃣ GitHub Actions로 배포 (Token 사용)

저장소 Secrets 설정:

1. **GitHub 저장소**: https://github.com/wodnr990921-cloud/exit_company_system

2. **Settings → Secrets and variables → Actions**

3. **"New repository secret"** 클릭

4. **Secret 추가**:
   ```
   Name: CLOUDFLARE_API_TOKEN
   Value: GmLjbrVQa6y7pupsPiS4plyhNqHAz1U6BliHpHpi
   
   Name: CLOUDFLARE_ACCOUNT_ID
   Value: 25c3e9e62e47328ad63f39ad0cf8bc55
   ```

5. **GitHub Actions 워크플로우 생성**

파일: `.github/workflows/cloudflare-deploy.yml`

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run build
      
      - name: Publish
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: exit-system
          directory: dist
```

---

## 🧪 연결 테스트

### GitHub Apps 권한 확인

```bash
# GitHub CLI로 확인 (선택사항)
gh auth status
gh repo view wodnr990921-cloud/exit_company_system
```

### Cloudflare API로 직접 확인

```bash
curl -X GET "https://api.cloudflare.com/client/v4/user" \
  -H "Authorization: Bearer GmLjbrVQa6y7pupsPiS4plyhNqHAz1U6BliHpHpi" \
  -H "Content-Type: application/json"
```

---

## 📊 문제 해결 체크리스트

- [ ] GitHub에서 Cloudflare Pages 앱 제거함
- [ ] Cloudflare에서 GitHub 재연결 시도함
- [ ] 저장소 접근 권한 부여함 (Install & Authorize)
- [ ] 특정 저장소 선택함 (exit_company_system)
- [ ] Cloudflare에서 저장소 목록이 나타남
- [ ] 프로젝트 생성 성공

---

## 🆘 여전히 안 될 때

### 시도해볼 것들:

1. **다른 브라우저 사용**
   - Chrome → Firefox 또는 Edge

2. **VPN/프록시 확인**
   - VPN 사용 중이면 끄기

3. **GitHub 2FA 확인**
   - 2단계 인증 설정 확인

4. **Cloudflare 계정 확인**
   - 올바른 Cloudflare 계정으로 로그인했는지 확인

5. **시간 대기**
   - GitHub/Cloudflare API 일시적 오류일 수 있음
   - 30분~1시간 후 재시도

---

## 📞 Support 문의

### Cloudflare Support

URL: https://dash.cloudflare.com/support

메시지 예시:
```
Subject: Cannot connect GitHub repository to Cloudflare Pages

I'm getting "Failed to load repositories" error when trying to 
connect my GitHub repository to Cloudflare Pages.

Account ID: 25c3e9e62e47328ad63f39ad0cf8bc55
GitHub Username: wodnr990921-cloud
Repository: exit_company_system

Steps I took:
1. Uninstalled Cloudflare Pages GitHub App
2. Reinstalled with repository access
3. Still getting "Failed to load repositories" error

Browser: Chrome (also tried Firefox)
Already cleared cache and cookies.
```

### GitHub Support

URL: https://support.github.com/

---

## ✅ 성공 확인

연결 성공 시:
- ✅ Cloudflare에서 저장소 목록이 보임
- ✅ `wodnr990921-cloud/exit_company_system` 선택 가능
- ✅ 프로젝트 생성 진행 가능

