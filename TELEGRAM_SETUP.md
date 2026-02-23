# 텔레그램 알림 시스템 설정 가이드

## 📱 Chat ID 확인 방법

### 방법 1: 봇에게 메시지 보내기 (가장 쉬움)

1. **봇 시작**:
   - Telegram에서 `@ExitSystem_bot` 검색
   - `/start` 명령어 입력

2. **Chat ID 확인**:
   ```bash
   # 터미널에서 실행
   curl "https://api.telegram.org/bot8482830575:AAGsth2J04_JWafIpPJOHPrCvvMc6aF2A6A/getUpdates"
   ```

3. **결과에서 chat.id 찾기**:
   ```json
   {
     "message": {
       "chat": {
         "id": 123456789,  ← 이 숫자가 Chat ID
         "first_name": "홍길동",
         "username": "user123"
       }
     }
   }
   ```

### 방법 2: @userinfobot 사용

1. Telegram에서 `@userinfobot` 검색
2. 봇 시작하면 자동으로 Chat ID 표시

---

## 🏢 텔레그램 알림 시스템 설계 방안

### **추천: 2개 봇 + 1개 채널 구조**

#### **구조**
```
┌─────────────────────────────────────┐
│      공지 채널 (읽기 전용)           │
│  - 모든 직원이 볼 수 있음            │
│  - 티켓 생성, 마감, 정산 알림        │
│  - 버튼 없음 (정보만 표시)           │
└─────────────────────────────────────┘
           ▲
           │ 알림 전송
           │
┌──────────┴──────────────────────────┐
│                                      │
│   사장 봇 (관리자)      직원 봇      │
│  @ExitSystem_bot    @ExitStaff_bot   │
│                                      │
│  ✅ 승인/거부 버튼      📝 답변 버튼  │
│  💰 정산 실행          ❓ 질문       │
│  📊 통계 조회          📋 내 할일    │
│  🔧 시스템 설정                      │
└─────────────────────────────────────┘
```

#### **장점**
- ✅ 권한 명확히 분리 (사장 vs 직원)
- ✅ 채널로 모든 직원이 실시간 현황 파악
- ✅ 개인 봇으로 개별 작업 처리
- ✅ 보안 강화 (승인 권한 = 사장 봇만)

#### **단점**
- ⚠️ 봇 2개 관리 필요
- ⚠️ 채널 생성 및 초대 필요

---

### **대안 1: 1개 봇 + 그룹 채팅**

#### **구조**
```
┌─────────────────────────────────────┐
│      그룹 채팅 (모두 참여)           │
│  - 사장 + 직원 모두 참여             │
│  - 봇이 그룹에 알림 전송             │
│  - 사장만 승인 버튼 표시             │
│  - 직원은 답변 버튼만 표시           │
└─────────────────────────────────────┘
```

#### **구현 방법**
```javascript
// 텔레그램 메시지 전송 시 버튼 구분
async function sendNotification(chatId, message, userId) {
  const isAdmin = userId === ADMIN_USER_ID
  
  const buttons = isAdmin 
    ? [
        [{ text: '✅ 승인', callback_data: 'approve_123' }],
        [{ text: '❌ 거부', callback_data: 'reject_123' }]
      ]
    : [
        [{ text: '📝 답변', callback_data: 'reply_123' }]
      ]
  
  await telegram.sendMessage(chatId, message, {
    reply_markup: { inline_keyboard: buttons }
  })
}
```

#### **장점**
- ✅ 설정 간단 (봇 1개, 그룹 1개)
- ✅ 모두가 대화 가능
- ✅ 실시간 소통

#### **단점**
- ⚠️ 권한 관리 복잡
- ⚠️ 버튼 클릭 시 권한 검증 필수
- ⚠️ 그룹에서 누구나 버튼 볼 수 있음 (클릭은 막을 수 있음)

---

### **대안 2: 1개 봇 + 개별 DM**

#### **구조**
```
봇 → 사장 DM: 승인/거부 버튼 + 전체 정보
봇 → 직원1 DM: 자기 담당 티켓만 + 답변 버튼
봇 → 직원2 DM: 자기 담당 티켓만 + 답변 버튼
```

#### **장점**
- ✅ 완벽한 권한 분리
- ✅ 개인별 맞춤 알림
- ✅ 보안 최고

#### **단점**
- ⚠️ 전체 현황 파악 어려움
- ⚠️ 직원 간 소통 불가

---

## ✨ 최종 추천: **2봇 + 1채널**

### **설정 순서**

#### 1. 채널 생성
```
1. Telegram에서 "새 채널" 생성
2. 채널 이름: "EXIT 시스템 알림"
3. 공개/비공개: 비공개 (링크로만 가입)
4. 관리자: 본인 추가
5. 구성원: 모든 직원 초대
```

#### 2. 채널 ID 확인
```bash
# 봇을 채널 관리자로 추가 후
curl "https://api.telegram.org/bot8482830575:AAGsth2J04_JWafIpPJOHPrCvvMc6aF2A6A/getUpdates"

# 결과에서 채널 ID 찾기 (보통 -100으로 시작)
# 예: -1001234567890
```

#### 3. 직원 봇 생성
```
1. @BotFather와 대화
2. /newbot 명령어
3. 봇 이름: EXIT Staff Bot
4. 봇 username: ExitStaff_bot
5. 토큰 저장
```

#### 4. Cloudflare 환경 변수 설정
```bash
# Dashboard → Pages → exit-company-system-5je → Settings → Environment variables

# 사장 봇
TELEGRAM_BOT_TOKEN=8482830575:AAGsth2J04_JWafIpPJOHPrCvvMc6aF2A6A
TELEGRAM_ADMIN_CHAT_ID=123456789  # 사장님 개인 Chat ID

# 직원 봇
TELEGRAM_STAFF_BOT_TOKEN=새로운_직원봇_토큰
TELEGRAM_CHANNEL_ID=-1001234567890  # 채널 ID

# 사장 User ID (버튼 권한 체크용)
TELEGRAM_ADMIN_USER_ID=123456789
```

#### 5. 알림 로직
```javascript
// 티켓 생성 시
await sendToChannel(`📬 새 티켓: ${ticket.title}`)  // 채널 (모두 봄)
await sendToAdmin(`✅ 승인 대기: ${ticket.title}`, buttons)  // 사장 봇 (승인 버튼)
await sendToStaff(`📋 새 할일: ${ticket.title}`, assignedStaff)  // 직원 봇

// 경비 요청 시
await sendToChannel(`💰 경비 요청: ${amount}원`)  // 채널
await sendToAdmin(`💰 경비 승인 요청`, approveButtons)  // 사장 봇
await sendToStaff(`❓ 출처 확인 필요`, questionButtons, staffId)  // 직원 봇
```

---

## 🚀 빠른 시작 (1봇 그룹 방식)

간단하게 시작하려면:

1. **그룹 생성**:
   - Telegram → "새 그룹"
   - 그룹 이름: "EXIT 시스템"
   - 구성원: 사장 + 직원들

2. **봇 추가**:
   - 그룹에 @ExitSystem_bot 추가
   - 봇을 관리자로 승격

3. **그룹 ID 확인**:
   ```bash
   curl "https://api.telegram.org/bot8482830575:AAGsth2J04_JWafIpPJOHPrCvvMc6aF2A6A/getUpdates"
   ```

4. **Cloudflare 설정**:
   ```
   TELEGRAM_CHAT_ID=-987654321  # 그룹 ID (음수)
   ```

5. **테스트**:
   - 그룹에서 `/start` 입력
   - 봇이 응답하면 성공!

---

## 📝 다음 단계

Chat ID 확인 후 알려주시면:
1. 해당 Chat ID로 테스트 메시지 전송
2. 알림 시스템 활성화
3. 티켓 생성/승인/정산 알림 자동화
