# 📱 텔레그램 자동화 시스템 설정 가이드 (v61.0)

## 🎯 시스템 개요

EXIT COMPANY의 모든 입출금, 배팅 정산, 장부 정리를 텔레그램 기반으로 자동화합니다.

```
┌─────────────────────────────────────────────┐
│          텔레그램 자동화 시스템                │
├─────────────────────────────────────────────┤
│                                             │
│  파서 봇 → 입출금 파싱 → DB 저장 → 채널 알림  │
│     ↓                          ↓            │
│  자동 정산 ← 배팅 결과     직원 확인          │
│     ↓                          ↓            │
│  장부 정리 → 리포트 생성 → 채널 브로드캐스트   │
│                                             │
└─────────────────────────────────────────────┘
```

## 📋 필요한 봇 (총 3개)

### 1️⃣ Admin Bot (관리자 전용)
- **이름**: ExitSystem_bot
- **토큰**: `8482830575:AAGsth2J04_JWafIpPJOHPrCvvMc6aF2A6A`
- **역할**: 승인/거절, 통계 조회
- **Webhook**: `/api/telegram/webhook/admin`

### 2️⃣ Staff Bot (직원용)
- **이름**: ExitStaff_bot (새로 생성 필요)
- **토큰**: [생성 후 입력]
- **역할**: 미확인 입금 조회, 출처 확인
- **Webhook**: `/api/telegram/webhook/staff`

### 3️⃣ Parser Bot (입출금 파싱)
- **기존 봇 사용 가능** (있다면)
- **없으면 새로 생성**
- **역할**: 입출금 메시지 자동 파싱
- **Webhook**: `/api/telegram/webhook/parser`

## 🔧 환경 변수 설정

Cloudflare Pages → Settings → Environment variables에 추가:

```bash
# Admin Bot
TELEGRAM_ADMIN_BOT_TOKEN=8482830575:AAGsth2J04_JWafIpPJOHPrCvvMc6aF2A6A
TELEGRAM_ADMIN_USER_ID=[관리자 사용자 ID]

# Staff Bot
TELEGRAM_STAFF_BOT_TOKEN=[Staff Bot 토큰]
TELEGRAM_STAFF_USER_IDS=[직원1_ID,직원2_ID,직원3_ID]

# Channel
TELEGRAM_CHANNEL_ID=[채널 ID, -100으로 시작]

# Parser Bot
TELEGRAM_PARSER_BOT_TOKEN=[Parser Bot 토큰]
```

## 📝 설정 단계

### Step 1: Staff Bot 생성

```
1. @BotFather에게 /newbot 전송
2. 봇 이름: EXIT 직원 봇
3. 봇 사용자명: ExitStaff_bot
4. 토큰 저장
```

### Step 2: Parser Bot 생성 (기존 봇 없는 경우)

```
1. @BotFather에게 /newbot 전송
2. 봇 이름: EXIT 파서 봇
3. 봇 사용자명: ExitParser_bot
4. 토큰 저장
```

### Step 3: 직원 ID 확인

```bash
# 각 직원이 Staff Bot에게 /start 전송 후
curl https://api.telegram.org/bot[STAFF_BOT_TOKEN]/getUpdates | jq '.result[-1].message.from.id'

# 결과 예시: 111222333, 444555666, 777888999
# TELEGRAM_STAFF_USER_IDS에 쉼표로 구분하여 입력
```

### Step 4: Webhook 설정

```bash
# Admin Bot
curl -X POST https://api.telegram.org/bot8482830575:AAGsth2J04_JWafIpPJOHPrCvvMc6aF2A6A/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://2cd7dbfe.exit-company-system-5je.pages.dev/api/telegram/webhook/admin"}'

# Staff Bot
curl -X POST https://api.telegram.org/bot[STAFF_BOT_TOKEN]/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://2cd7dbfe.exit-company-system-5je.pages.dev/api/telegram/webhook/staff"}'

# Parser Bot
curl -X POST https://api.telegram.org/bot[PARSER_BOT_TOKEN]/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://2cd7dbfe.exit-company-system-5je.pages.dev/api/telegram/webhook/parser"}'
```

### Step 5: 파서 봇을 채널에 추가

```
1. EXIT COMPANY 알림 채널 열기
2. 채널 관리자 추가 → Parser Bot 검색
3. 메시지 전송 권한 부여
```

## 🚀 기능별 사용법

### 1️⃣ 직원 기능 (Staff Bot)

**명령어**:
```
/start - 봇 시작
/unconfirmed - 미확인 입금 조회
/mytickets - 내 담당 티켓
/price - 가격표 조회
/help - 도움말
```

**미확인 입금 조회 예시**:
```
직원: /unconfirmed

봇: 💳 *미확인 입금 내역*

1. 💰 1,000,000원
   입금자: 홍길동
   시간: 2026-02-23 15:30

2. 💰 500,000원
   입금자: 미확인
   시간: 2026-02-23 14:20

📝 회원 매칭은 웹에서 처리해주세요.
```

**출처 확인 (인라인 버튼)**:
```
채널에 출금 알림이 올 때:

💸 *출금 감지*
금액: 300,000원
출금자: 김철수
시간: 2026-02-23 16:00

⚠️ *출처 미확인* - 출금 사유 확인 필요

[💼 업무 경비] [🏦 회원 출금]
[📦 물품 구매] [🔧 기타]

→ 직원이 버튼 클릭하면 출처 자동 기록
```

### 2️⃣ 파서 봇 (자동 파싱)

**입금 메시지 형식**:
```
입금 1,000,000원 홍길동 (국민은행)
```

**출금 메시지 형식**:
```
출금 500,000원 김철수
```

**파싱 결과**:
- DB에 자동 저장
- 채널에 실시간 알림
- 미확인 입금/출금 자동 탐지

### 3️⃣ 자동 정산 (API)

**수동 실행**:
```bash
curl -X POST https://2cd7dbfe.exit-company-system-5je.pages.dev/api/telegram/auto-settlement
```

**결과 예시**:
```
💰 *자동 정산 완료*

📊 정산 건수: 25건
✅ 당첨금 지급: 5,000,000P
📉 낙첨 회수: 8,000,000P
📈 순수익: 3,000,000P

⏰ 2026-02-23 23:00
```

**자동 실행 (GitHub Actions)**:
```yaml
# .github/workflows/auto-settlement.yml
name: Auto Settlement
on:
  schedule:
    - cron: '0 15 * * *'  # 매일 자정 (KST)
jobs:
  settle:
    runs-on: ubuntu-latest
    steps:
      - name: Run Auto Settlement
        run: |
          curl -X POST https://2cd7dbfe.exit-company-system-5je.pages.dev/api/telegram/auto-settlement
```

### 4️⃣ 자동 장부 정리 (API)

**수동 실행**:
```bash
curl -X POST https://2cd7dbfe.exit-company-system-5je.pages.dev/api/telegram/auto-bookkeeping
```

**결과 예시**:
```
📚 *일일 장부 정리*

📅 2026-02-23

💵 총 입금: 10,000,000원
💸 총 출금: 3,500,000원
📊 순 현금흐름: 6,500,000원

⚠️ 미확인 입금: 1,000,000원

💼 *경비 내역*:
  • 업무경비: 1,500,000원
  • 물품구매: 800,000원
  • 회원출금: 1,200,000원
```

**자동 실행 (GitHub Actions)**:
```yaml
# .github/workflows/auto-bookkeeping.yml
name: Auto Bookkeeping
on:
  schedule:
    - cron: '0 14 * * *'  # 매일 23시 (KST)
jobs:
  bookkeep:
    runs-on: ubuntu-latest
    steps:
      - name: Run Auto Bookkeeping
        run: |
          curl -X POST https://2cd7dbfe.exit-company-system-5je.pages.dev/api/telegram/auto-bookkeeping
```

## 🧪 테스트 방법

### 1. 파서 봇 테스트
```bash
# Parser Bot에게 직접 메시지 전송
# "입금 100,000원 테스트"

# 또는 API로 테스트
curl -X POST https://api.telegram.org/bot[PARSER_BOT_TOKEN]/sendMessage \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "[CHANNEL_ID]",
    "text": "입금 100,000원 홍길동"
  }'
```

### 2. 직원 기능 테스트
```
# Staff Bot에게 명령어 전송
/unconfirmed
```

### 3. 자동 정산 테스트
```bash
curl -X POST https://2cd7dbfe.exit-company-system-5je.pages.dev/api/telegram/auto-settlement
```

### 4. 장부 정리 테스트
```bash
curl -X POST https://2cd7dbfe.exit-company-system-5je.pages.dev/api/telegram/auto-bookkeeping
```

## ⚙️ GitHub Actions 자동화

### .github/workflows/daily-automation.yml
```yaml
name: Daily Automation

on:
  schedule:
    # 매일 자정 정산 (KST 00:00 = UTC 15:00)
    - cron: '0 15 * * *'
    # 매일 23시 장부 정리 (KST 23:00 = UTC 14:00)
    - cron: '0 14 * * *'
  workflow_dispatch:  # 수동 실행 가능

jobs:
  auto-settlement:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 15 * * *'
    steps:
      - name: Run Auto Settlement
        run: |
          curl -X POST https://2cd7dbfe.exit-company-system-5je.pages.dev/api/telegram/auto-settlement
          
  auto-bookkeeping:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 14 * * *'
    steps:
      - name: Run Auto Bookkeeping
        run: |
          curl -X POST https://2cd7dbfe.exit-company-system-5je.pages.dev/api/telegram/auto-bookkeeping
```

## 🔐 보안 고려사항

1. **직원 ID 검증**: Staff Bot은 TELEGRAM_STAFF_USER_IDS에 등록된 사용자만 사용 가능
2. **관리자 ID 검증**: Admin Bot의 승인 기능은 TELEGRAM_ADMIN_USER_ID만 사용 가능
3. **Private 채널**: 채널은 반드시 Private으로 설정
4. **토큰 보안**: 모든 봇 토큰은 Cloudflare 환경 변수에 저장

## 🆘 문제 해결

### 파서가 작동하지 않아요
1. Parser Bot이 채널에 관리자로 추가되었는지 확인
2. Webhook이 올바르게 설정되었는지 확인
3. 메시지 형식이 정규식 패턴과 일치하는지 확인

### 직원이 명령어를 사용할 수 없어요
1. TELEGRAM_STAFF_USER_IDS에 직원 ID가 추가되었는지 확인
2. ID 형식이 올바른지 확인 (쉼표로 구분, 공백 없음)
3. Staff Bot Webhook이 설정되었는지 확인

### 자동 정산이 작동하지 않아요
1. API 엔드포인트가 올바른지 확인
2. betting_folders 테이블에 settled = 0인 데이터가 있는지 확인
3. GitHub Actions가 활성화되었는지 확인

## 📊 장점

✅ **완전 자동화**: 입출금 파싱부터 정산, 장부 정리까지
✅ **실시간 알림**: 채널을 통한 즉시 피드백
✅ **출처 추적**: 출금 시 자동으로 출처 확인 요청
✅ **경비 관리**: 카테고리별 경비 자동 집계
✅ **배팅 정산**: 당첨금 자동 지급, 순수익 계산
✅ **일일 리포트**: 장부 정리 자동 생성

## 🎯 다음 단계

1. Staff Bot 및 Parser Bot 생성
2. 직원 ID 수집
3. Cloudflare 환경 변수 설정
4. Webhook 설정
5. GitHub Actions 활성화
6. 테스트 실행
7. 운영 시작!
