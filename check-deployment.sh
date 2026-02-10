#!/bin/bash
echo "=== 최근 Git 커밋 ==="
git log --oneline -3

echo ""
echo "=== 최근 배포 확인 필요 ==="
echo "Cloudflare Dashboard에서 확인:"
echo "1. https://dash.cloudflare.com/"
echo "2. Workers & Pages"
echo "3. 프로젝트 이름 확인 (exit-system? exit-company-system?)"
echo "4. Deployments 탭 → 최신 배포 URL 복사"
