# Cloudflare Pages 환경 변수 설정 가이드

## 필수 환경 변수 설정

Cloudflare Pages 대시보드에서 다음 환경 변수를 **Production** 환경에 추가해주세요:

### 1. Cloudflare Pages 접속
- https://dash.cloudflare.com 접속
- **Workers & Pages** 선택
- **exit-company-system** 프로젝트 선택
- **Settings** → **Environment variables** 클릭

### 2. 다음 변수들을 추가/수정:

```
TELEGRAM_ADMIN_BOT_TOKEN=8482830575:AAGsth2J04_JWafIpPJOHPrCvvMc6aF2A6A
TELEGRAM_STAFF_BOT_TOKEN=8492223729:AAGGbXgRr-Iip_s7utWnF5N_P2UncASa_No
TELEGRAM_PARSER_BOT_TOKEN=8257328345:AAFggBQxqlaQ8jDTTrhD0kYOVr-1p2sxAK0
TELEGRAM_CHANNEL_ID=-1003833345597
TELEGRAM_ADMIN_USER_ID=8565387378
TELEGRAM_STAFF_USER_IDS=8534363302
```

### 3. 환경 변수 추가 방법:
1. **Add variable** 버튼 클릭
2. **Variable name** 입력 (예: TELEGRAM_ADMIN_BOT_TOKEN)
3. **Value** 입력 (예: 8482830575:AAGsth2J04_JWafIpPJOHPrCvvMc6aF2A6A)
4. **Environment** → **Production** 선택
5. **Save** 클릭
6. 나머지 5개 변수도 반복

### 4. 재배포
환경 변수 추가 후 **Deployments** 탭으로 이동하여 최신 배포를 **Retry deployment**하거나, 아래 명령어로 재배포:

```bash
cd /home/user/webapp && npx wrangler pages deploy dist
```

### 5. 확인
재배포 완료 후 채널에서 `/help` 명령어를 보내 정상 작동 확인

---

## 봇 정보 요약

- **채널 ID**: -1003833345597
- **Admin Bot** (@ExitSystem_bot): 8482830575:AAGsth2J04_JWafIpPJOHPrCvvMc6aF2A6A
- **Staff Bot** (@ExitStaff_bot): 8492223729:AAGGbXgRr-Iip_s7utWnF5N_P2UncASa_No
- **Parser Bot**: 8257328345:AAFggBQxqlaQ8jDTTrhD0kYOVr-1p2sxAK0
- **관리자 ID**: 8565387378
- **직원 ID**: 8534363302

---

## 테스트 방법

### 1. Admin Bot 테스트 (채널에서)
```
/help
/status
/pending
/transactions
```

### 2. Staff Bot 테스트 (DM에서)
```
/start
/mytickets
/price
/unconfirmed
```

### 3. Parser Bot 테스트
채널에 다음과 같은 메시지를 보내면 자동으로 파싱됩니다:
```
입금 1,000,000원 홍길동
출금 500,000원 김철수 업무경비
```

### 4. 자동화 명령어 (채널에서)
```
/settle    # 자동 정산
/bookkeep  # 자동 장부
```

---

## 웹훅 설정 확인

현재 설정된 웹훅:
- **Admin Bot**: https://df69ac6d.exit-company-system-5je.pages.dev/api/telegram/webhook/admin
- **Staff Bot**: https://df69ac6d.exit-company-system-5je.pages.dev/api/telegram/webhook/staff
- **Parser Bot**: https://df69ac6d.exit-company-system-5je.pages.dev/api/telegram/webhook/parser

웹훅 상태 확인:
```bash
curl https://api.telegram.org/bot8482830575:AAGsth2J04_JWafIpPJOHPrCvvMc6aF2A6A/getWebhookInfo
```

---

## 문제 해결

### 500 에러가 발생하는 경우:
1. Cloudflare Pages 환경 변수가 모두 설정되었는지 확인
2. 환경 변수 설정 후 재배포 (Retry deployment)
3. 웹훅 pending_update_count가 있으면 초기화:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/getUpdates?offset=999999999"
   ```

### 봇이 응답하지 않는 경우:
1. 봇이 채널에 관리자로 추가되었는지 확인
2. 웹훅이 올바르게 설정되었는지 확인
3. Cloudflare Pages 로그 확인

---

**중요**: 환경 변수 추가 후 반드시 **재배포**해야 적용됩니다!
