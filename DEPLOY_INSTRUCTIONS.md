# Cloudflare Pages 배포 가이드

## 🚀 빠른 배포 (Wrangler CLI)

### 1. Cloudflare API 토큰 설정 확인
```bash
echo $CLOUDFLARE_API_TOKEN
```

토큰이 없으면 Deploy 탭에서 설정 필요

### 2. 배포 실행
```bash
cd /home/user/webapp
npm run build
npx wrangler pages deploy dist --project-name exit-system
```

## 📝 수동 배포 (Cloudflare Dashboard)

### 1. Cloudflare Pages 대시보드 접속
https://dash.cloudflare.com/

### 2. Pages 프로젝트 선택
exit-system 프로젝트 클릭

### 3. 직접 업로드
- "Create deployment" 클릭
- `dist/` 폴더를 드래그 앤 드롭
- "Save and Deploy" 클릭

## ✅ 배포 확인

배포 후 다음 URL에서 확인:
- Production: https://exit-system.pages.dev
- Latest: https://[deployment-id].exit-system.pages.dev

## 🔍 네비게이션 확인

브라우저 콘솔에서:
```javascript
document.querySelectorAll('nav').forEach((nav, i) => {
    console.log(`Nav ${i}:`, 
                getComputedStyle(nav).display,
                nav.className)
})
```

**Nav 1**이 `block` (데스크톱) 또는 `none` (모바일)이어야 함
