# GitHub Actions 자동 경기 일정 등록 설정 가이드

## 📋 개요
EXIT Company System은 GitHub Actions를 사용하여 api-sport.io에서 경기 일정과 배당 정보를 자동으로 수집하고 등록합니다.

## 🔧 설정 단계

### 1. API 토큰 생성 (관리자 전용)

**방법 A: curl 명령어 사용**
```bash
curl -X POST https://exit-company-system.pages.dev/api/auth/generate-api-token \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }'
```

**응답 예시:**
```json
{
  "success": true,
  "api_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "이 토큰을 안전하게 보관하세요. 다시 확인할 수 없습니다."
}
```

**방법 B: 브라우저 콘솔 사용**
1. EXIT System에 관리자로 로그인
2. F12 키를 눌러 개발자 도구 열기
3. Console 탭에서 다음 코드 실행:

```javascript
const response = await fetch('/api/auth/generate-api-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'your_password'
  })
});
const data = await response.json();
console.log('API Token:', data.api_token);
```

⚠️ **중요**: API 토큰은 한 번만 표시됩니다. 안전한 곳에 저장하세요!

---

### 2. GitHub Secrets 설정

1. GitHub 저장소로 이동: https://github.com/wodnr990921-cloud/exit_company_system
2. **Settings** → **Secrets and variables** → **Actions** 클릭
3. **New repository secret** 버튼 클릭
4. 다음 두 개의 Secret 추가:

#### Secret 1: API_SPORT_KEY
- **Name**: `API_SPORT_KEY`
- **Value**: `67a6f09f9f2e43faec8e39ae4ad3d419` (api-sport.io API 키)

#### Secret 2: ADMIN_TOKEN
- **Name**: `ADMIN_TOKEN`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (위에서 생성한 JWT 토큰)

---

### 3. GitHub Workflow 파일 추가

⚠️ **중요**: GitHub App 권한 문제로 Git push가 실패하므로 GitHub 웹에서 직접 추가해야 합니다.

1. GitHub 저장소로 이동
2. **Add file** → **Create new file** 클릭
3. 파일 이름 입력: `.github/workflows/match-scheduler.yml`
4. 다음 내용 붙여넣기:

```yaml
name: 경기 일정 자동 등록

on:
  # 스케줄 실행 (KST 기준)
  schedule:
    # 매일 오전 9시 KST = UTC 00:00
    - cron: '0 0 * * *'
    # 매일 오후 9시 KST = UTC 12:00
    - cron: '0 12 * * *'
    # 매주 목요일 오후 2시 KST = UTC 05:00 (목요일)
    - cron: '0 5 * * 4'
  
  # 수동 실행 가능
  workflow_dispatch:
    inputs:
      mode:
        description: '실행 모드 (daily: 하루치, weekly: 일주일치)'
        required: true
        default: 'daily'
        type: choice
        options:
          - daily
          - weekly

jobs:
  fetch-and-upload:
    runs-on: ubuntu-latest
    
    steps:
      - name: 📥 저장소 체크아웃
        uses: actions/checkout@v4
      
      - name: 🔧 Node.js 설정
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: 📦 의존성 설치
        run: |
          npm install -g node-fetch
      
      - name: 🚀 경기 일정 가져오기 및 등록
        env:
          API_SPORT_KEY: ${{ secrets.API_SPORT_KEY }}
          ADMIN_TOKEN: ${{ secrets.ADMIN_TOKEN }}
          EXIT_SYSTEM_URL: https://exit-company-system.pages.dev
          MODE: ${{ github.event.inputs.mode || (github.event.schedule == '0 5 * * 4' && 'weekly' || 'daily') }}
        run: |
          echo "🕒 실행 시간: $(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M:%S KST')"
          echo "📅 실행 모드: $MODE"
          node scripts/fetch-matches.js
      
      - name: ✅ 완료 알림
        if: success()
        run: |
          echo "✅ 경기 일정 등록이 완료되었습니다!"
          echo "🕒 완료 시간: $(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M:%S KST')"
      
      - name: ❌ 실패 알림
        if: failure()
        run: |
          echo "❌ 경기 일정 등록 중 오류가 발생했습니다."
          echo "🕒 실패 시간: $(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M:%S KST')"
          echo "📧 관리자에게 알림을 보내세요."
```

5. **Commit changes** 버튼 클릭

---

### 4. 수동 실행 테스트

1. GitHub 저장소에서 **Actions** 탭 클릭
2. 왼쪽 사이드바에서 **경기 일정 자동 등록** 워크플로우 선택
3. **Run workflow** 버튼 클릭
4. 실행 모드 선택 (`daily` 또는 `weekly`)
5. **Run workflow** 버튼 다시 클릭
6. 실행 로그 확인

---

## 📅 자동 실행 스케줄

| 시간 (KST) | 요일 | 모드 | 설명 |
|------------|------|------|------|
| 오전 9시 | 매일 | `daily` | 하루치 경기 일정 등록 |
| 오후 9시 | 매일 | `daily` | 다음날 경기 일정 등록 |
| 오후 2시 | 목요일 | `weekly` | 일주일치 경기 일정 일괄 등록 |

---

## 🏆 지원 리그

### ⚽ 축구
- EPL (Premier League)
- LA_LIGA (La Liga)
- SERIE_A (Serie A)
- BUNDESLIGA (Bundesliga)
- LIGUE_1 (Ligue 1)
- K_LEAGUE (K League 1)

### 🏀 농구
- NBA (NBA)
- WNBA (WNBA)
- KBL (Korean Basketball League)
- WKBL (Women's Korean Basketball League)

### ⚾ 야구
- MLB (MLB)
- KBO (KBO)

### 🏐 배구
- KOVO_M (V-League Men)
- KOVO_W (V-League Women)

### 🏈 기타
- NFL (NFL)
- NHL (NHL)

---

## 🔍 데이터 수집 항목

각 경기마다 다음 정보가 자동으로 수집됩니다:

### 경기 정보
- 경기명 (예: "맨체스터 시티 vs 리버풀")
- 홈팀, 원정팀
- 리그
- 경기 날짜/시간 (ISO 8601 형식)

### 배당 정보
- **승무패**: `home_odds`, `draw_odds`, `away_odds`
- **오버/언더**: `over_line`, `over_odds`, `under_odds`
- **핸디캡**: `handicap_line`, `handicap_home_odds`, `handicap_away_odds`

---

## 🐛 문제 해결

### 1. Workflow가 실행되지 않음
- GitHub Actions 탭에서 워크플로우가 활성화되어 있는지 확인
- Secrets가 올바르게 설정되어 있는지 확인

### 2. API 인증 실패 (401 Unauthorized)
- `ADMIN_TOKEN`이 올바른지 확인
- 토큰이 만료되지 않았는지 확인
- 관리자 계정으로 새 토큰 재생성

### 3. api-sport.io API 오류
- `API_SPORT_KEY`가 올바른지 확인
- api-sport.io 할당량 초과 여부 확인
- https://dashboard.api-football.com/ 에서 사용량 확인

### 4. 중복 경기 등록
- 스크립트는 중복 체크를 하지 않습니다
- 필요시 데이터베이스에서 중복 제거:
  ```sql
  DELETE FROM matches 
  WHERE id NOT IN (
    SELECT MIN(id) 
    FROM matches 
    GROUP BY match_name, match_date
  );
  ```

---

## 📧 문의

문제가 지속되면 시스템 관리자에게 문의하세요.
- **GitHub Issues**: https://github.com/wodnr990921-cloud/exit_company_system/issues
- **Email**: admin@exitcompany.com
