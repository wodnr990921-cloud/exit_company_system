# Exit Company System - 배포 정보

## 고정 프로덕션 URL
**https://exit-company-system-5je.pages.dev**

이 URL은 변경되지 않으며 항상 최신 배포를 가리킵니다.

## 커밋별 배포 URL
각 커밋은 고유한 미리보기 URL을 생성하지만, 프로덕션 URL은 자동으로 최신 버전을 가리킵니다.

## Telegram Webhook 설정
항상 **고정 프로덕션 URL**을 사용하세요:
```bash
# Admin Bot
curl -X POST "https://api.telegram.org/bot8482830575:AAGsth2J04_JWafIpPJOHPrCvvMc6aF2A6A/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://exit-company-system-5je.pages.dev/api/telegram/webhook/admin"}'

# Staff Bot
curl -X POST "https://api.telegram.org/bot8492223729:AAGGbXgRr-Iip_s7utWnF5N_P2UncASa_No/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://exit-company-system-5je.pages.dev/api/telegram/webhook/staff"}'
```

## 현재 버전
- **v62.4.1** - Settings 로딩 + Webhook 수정 + 입금자명 매칭

## 문서
- GitHub: https://github.com/wodnr990921-cloud/exit_company_system
- 최신 커밋: `401e87c`
