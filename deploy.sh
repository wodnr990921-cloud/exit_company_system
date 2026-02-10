#!/bin/bash

# EXIT System 배포 스크립트 (Git 연동 전 임시 사용)
# 사용법: ./deploy.sh "커밋 메시지"

set -e  # 오류 발생 시 중단

echo "🚀 EXIT System 배포 시작..."
echo ""

# 커밋 메시지 확인
if [ -z "$1" ]; then
  echo "❌ 오류: 커밋 메시지를 입력하세요"
  echo "사용법: ./deploy.sh \"커밋 메시지\""
  exit 1
fi

COMMIT_MESSAGE="$1"
CLOUDFLARE_API_TOKEN="GmLjbrVQa6y7pupsPiS4plyhNqHAz1U6BliHpHpi"

# 1. Git 커밋 및 푸시
echo "📝 Step 1/4: Git 커밋 및 푸시..."
cd /home/user/webapp
git add .
git commit -m "$COMMIT_MESSAGE" || echo "변경사항 없음 (이미 커밋됨)"
git push origin main

echo ""
echo "✅ GitHub 푸시 완료!"
echo ""

# 2. 빌드
echo "🔨 Step 2/4: 프로젝트 빌드..."
npm run build

echo ""
echo "✅ 빌드 완료!"
echo ""

# 3. Cloudflare 배포
echo "☁️  Step 3/4: Cloudflare Pages 배포..."
CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" npx wrangler pages deploy dist --project-name exit-system

echo ""
echo "✅ Cloudflare 배포 완료!"
echo ""

# 4. 배포 URL 표시
echo "🎉 배포 성공!"
echo ""
echo "📍 프로덕션 URL: https://exit-system.pages.dev"
echo "📍 GitHub: https://github.com/wodnr990921-cloud/exit_company_system"
echo ""
echo "✨ 모든 작업 완료!"
