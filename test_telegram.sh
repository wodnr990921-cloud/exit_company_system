#!/bin/bash

BOT_TOKEN="8482830575:AAGsth2J04_JWafIpPJOHPrCvvMc6aF2A6A"

echo "=== 텔레그램 Chat ID 확인 ==="
echo ""
echo "1. Telegram에서 @ExitSystem_bot 찾기"
echo "2. /start 명령어 보내기"
echo "3. 아래 명령어 실행하여 Chat ID 확인:"
echo ""
echo "curl \"https://api.telegram.org/bot${BOT_TOKEN}/getUpdates\" | jq '.result[-1].message.chat'"
echo ""
echo "=== 최근 메시지 확인 ==="
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getUpdates" | jq '.result[-3:] | .[] | {update_id, message: {chat: .message.chat, text: .message.text, date: .message.date}}'

echo ""
echo ""
echo "=== Chat ID가 확인되면 아래 명령어로 테스트 메시지 전송 ==="
echo "curl -X POST \"https://api.telegram.org/bot${BOT_TOKEN}/sendMessage\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"chat_id\": YOUR_CHAT_ID, \"text\": \"✅ EXIT System 연결 성공!\"}'"
