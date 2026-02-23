# 📱 텔레그램 2봇 1채널 시스템 설정 가이드

## 🎯 시스템 구조

```
┌─────────────────┐
│  관리자 (사장)   │
│  @ExitSystem_bot │ ← Admin Bot (승인 기능)
└─────────────────┘
         │
         ↓
┌─────────────────┐
│   공유 채널      │ ← 알림 수신
│   (브로드캐스트)  │
└─────────────────┘
         │
         ↓
┌─────────────────┐
│  직원들          │
│  @Staff_bot      │ ← Staff Bot (정보 조회)
└─────────────────┘
```

## 📋 설정 단계

### 1️⃣ Admin Bot 설정 (현재 완료)

**봇 이름**: `ExitSystem_bot`
**토큰**: `8482830575:AAGsth2J04_JWafIpPJOHPrCvvMc6aF2A6A`

✅ 이미 생성됨

### 2️⃣ Staff Bot 생성 (새로 생성 필요)

1. @BotFather에게 메시지 보내기
2. `/newbot` 명령어 입력
3. 봇 이름 입력 (예: `EXIT 직원 봇`)
4. 봇 사용자명 입력 (예: `ExitStaff_bot`)
5. 생성된 토큰 저장

**예시**:
```
@BotFather: Alright, a new bot. How are we going to call it?
You: EXIT 직원 봇

@BotFather: Good. Now let's choose a username for your bot.
You: ExitStaff_bot

@BotFather: Done! ... Use this token to access the HTTP API:
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

### 3️⃣ 채널 생성

1. 텔레그램에서 새 채널 생성
   - 채널 이름: `EXIT COMPANY 알림`
   - 채널 유형: **Private** 선택
   
2. 두 봇을 채널에 관리자로 추가
   - @ExitSystem_bot 추가 (관리자 권한: 메시지 전송)
   - @ExitStaff_bot 추가 (관리자 권한: 메시지 전송)

3. 채널 ID 확인
   ```bash
   # 채널에 메시지 전송 후
   curl https://api.telegram.org/bot8482830575:AAGsth2J04_JWafIpPJOHPrCvvMc6aF2A6A/getUpdates | jq
   ```
   
   **채널 ID는 `-100`으로 시작** (예: `-1001234567890`)

### 4️⃣ 관리자 사용자 ID 확인

1. @ExitSystem_bot에게 `/start` 메시지 보내기
2. Chat ID 확인:
   ```bash
   curl https://api.telegram.org/bot8482830575:AAGsth2J04_JWafIpPJOHPrCvvMc6aF2A6A/getUpdates | jq '.result[-1].message.from.id'
   ```
   
   **사용자 ID는 숫자** (예: `123456789`)

### 5️⃣ Cloudflare 환경 변수 설정

Cloudflare Pages → Settings → Environment variables에 다음 추가:

```
TELEGRAM_ADMIN_BOT_TOKEN=8482830575:AAGsth2J04_JWafIpPJOHPrCvvMc6aF2A6A
TELEGRAM_STAFF_BOT_TOKEN=[2단계에서 생성한 Staff Bot 토큰]
TELEGRAM_CHANNEL_ID=[3단계에서 확인한 채널 ID, -100으로 시작]
TELEGRAM_ADMIN_USER_ID=[4단계에서 확인한 사용자 ID]
```

### 6️⃣ Webhook 설정

```bash
# Admin Bot Webhook
curl -X POST https://api.telegram.org/bot8482830575:AAGsth2J04_JWafIpPJOHPrCvvMc6aF2A6A/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://exit-company-system-5je.pages.dev/api/telegram/webhook/admin"}'

# Staff Bot Webhook (Staff Bot 토큰으로 변경)
curl -X POST https://api.telegram.org/bot[STAFF_BOT_TOKEN]/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://exit-company-system-5je.pages.dev/api/telegram/webhook/staff"}'
```

## 🎮 사용 방법

### 관리자 (Admin Bot)

**명령어**:
- `/start` - 봇 시작
- `/status` - 전체 현황 조회
- `/pending` - 대기중인 승인 조회
- `/transactions` - 오늘 입출금 조회
- `/help` - 도움말

**승인 기능**:
- 채널에서 승인 요청 메시지 수신
- ✅ 승인 또는 ❌ 거절 버튼 클릭
- 승인/거절은 관리자만 가능

### 직원 (Staff Bot)

**명령어**:
- `/start` - 봇 시작
- `/mytickets` - 내 담당 티켓 조회
- `/price` - 가격표 조회
- `/help` - 도움말

**정보 조회**:
- 직원은 정보 조회만 가능
- 승인 권한 없음

### 채널 (알림 수신)

**자동 알림**:
- 🎫 신규 티켓 생성
- 👤 티켓 배정
- ⚠️ 승인 요청 (관리자만 버튼 사용 가능)
- 🏆 배팅 결과
- 💰 정산 완료

## 🔐 보안 기능

1. **승인 권한 제한**: `TELEGRAM_ADMIN_USER_ID`에 등록된 사용자만 승인 가능
2. **채널 권한**: Private 채널로 초대된 사람만 접근 가능
3. **봇 분리**: 관리자 봇과 직원 봇 분리로 권한 관리
4. **Callback 검증**: 승인 버튼 클릭 시 사용자 ID 검증

## 🧪 테스트 방법

### 1. 채널 알림 테스트
```bash
curl -X POST https://exit-company-system-5je.pages.dev/api/telegram/notify \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ticket_created",
    "data": {
      "ticket_number": "T-2024-001",
      "title": "테스트 티켓",
      "member_name": "홍길동",
      "ticket_type": "입금"
    }
  }'
```

### 2. 승인 요청 테스트
```bash
curl -X POST https://exit-company-system-5je.pages.dev/api/telegram/notify \
  -H "Content-Type: application/json" \
  -d '{
    "type": "approval_request",
    "data": {
      "id": 1,
      "type": "deposit",
      "member_name": "홍길동",
      "amount": 100000,
      "reason": "테스트 입금"
    }
  }'
```

### 3. 명령어 테스트
- Admin Bot에게 `/status` 전송
- Staff Bot에게 `/price` 전송

## 📊 장점

✅ **관리자 전용 승인**: 승인은 관리자만, 직원은 조회만
✅ **중앙 알림**: 모든 알림이 채널에 집중
✅ **권한 분리**: 봇별로 권한 명확히 구분
✅ **확장성**: 나중에 직원별 개인 알림 추가 가능

## ⚠️ 주의사항

1. **채널 ID는 `-100`으로 시작**하는 음수입니다
2. **사용자 ID는 양수**입니다
3. **Staff Bot 토큰은 새로 생성**해야 합니다
4. **채널은 Private**으로 만들어야 합니다
5. **두 봇 모두 채널 관리자**로 추가해야 합니다

## 🆘 문제 해결

### 채널 ID를 찾을 수 없어요
1. 봇을 채널 관리자로 추가했는지 확인
2. 채널에 테스트 메시지 전송
3. `getUpdates` API 호출
4. `channel_post` 항목에서 `chat.id` 확인

### 승인 버튼이 작동하지 않아요
1. `TELEGRAM_ADMIN_USER_ID`가 올바르게 설정되었는지 확인
2. Admin Bot의 Webhook이 `/webhook/admin`으로 설정되었는지 확인
3. Cloudflare 환경 변수가 올바르게 설정되었는지 확인

### Staff Bot이 응답하지 않아요
1. Staff Bot 토큰이 올바른지 확인
2. Webhook이 `/webhook/staff`로 설정되었는지 확인
3. Staff Bot이 채널에 추가되었는지 확인
