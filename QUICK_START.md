# 🚀 EXIT System - 빠른 시작 가이드

## 📥 프로젝트 다운로드

**백업 파일**: https://www.genspark.ai/api/files/s/DeDDWrnd

```bash
# 압축 해제
tar -xzf exit-system-v8.5-deploy.tar.gz
cd webapp
```

## ⚡ 5분 배포

```bash
# 1. 의존성 설치
npm install

# 2. 빌드
npm run build

# 3. Cloudflare 로그인
npx wrangler login

# 4. D1 데이터베이스 생성
npx wrangler d1 create exit-system-production
# ⚠️ 출력된 database_id를 wrangler.jsonc에 붙여넣기

# 5. 마이그레이션
npx wrangler d1 migrations apply exit-system-production

# 6. Pages 프로젝트 생성
npx wrangler pages project create exit-system --production-branch main

# 7. 배포
npx wrangler pages deploy dist --project-name exit-system
```

## ✅ 완료!

**접속 URL**: https://exit-system.pages.dev  
**데모 계정**: admin@prison-books.kr / admin123

⚠️ **보안**: 배포 후 즉시 비밀번호를 변경하세요!

---

📖 자세한 가이드: [DEPLOYMENT.md](./DEPLOYMENT.md)
