#!/bin/bash

BOT_TOKEN="8482830575:AAGsth2J04_JWafIpPJOHPrCvvMc6aF2A6A"
WEBHOOK_URL="https://exit-company-system-5je.pages.dev/api/telegram/webhook"

echo "텔레그램 봇 설정 중..."
echo "봇 토큰: $BOT_TOKEN"
echo "Webhook URL: $WEBHOOK_URL"

# Webhook 설정
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${WEBHOOK_URL}\"}"

echo ""
echo "Webhook 정보 확인:"
curl "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"

echo ""
echo "봇 정보:"
curl "https://api.telegram.org/bot${BOT_TOKEN}/getMe"
