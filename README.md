# EXIT COMPANY - 교정시설 업무 대행 시스템 v61.1

## ✅ 최신 업데이트 (v61.2 - 2026-02-23)

### 🎨 티켓 상세 모달 레이아웃 재설계 (v61.2)
**더 직관적이고 효율적인 2열 레이아웃으로 변경!**

- **📊 새로운 2열 구조**:
  ```
  우편물 이미지  |  좌측 (OCR 원문, 요약)  |  우측 (회원 정보, 기본 정보)
                |  답변 목록 (전체 너비)
                |  답변 작성 (전체 너비)
                |  상태 변경 (하단)
  ```
  
- **💬 직원 소통 위젯 수정**:
  - 메시지 렌더링 버그 수정 (comment_type=internal 필터링)
  - 메시지 자동 스크롤 개선
  - 메시지 버블 스타일 개선 (경계선 강조)
  - 디버깅 로그 추가

- **✨ UI/UX 개선**:
  - OCR 원문과 요약을 좌측에 배치 (읽기 편한 흐름)
  - 회원 정보와 기본 정보를 우측에 배치 (한눈에 확인)
  - 답변 섹션을 전체 너비로 확장 (더 넓은 작성 공간)
  - 중복된 회원 정보 섹션 제거

### 📦 배포 정보 (v61.2)
- **Production URL**: https://exit-company-system-5je.pages.dev
- **Latest Deploy**: https://c64b75ce.exit-company-system-5je.pages.dev
- **Git 커밋**: bb3246b (Layout redesign)
- **빌드 크기**: 221.23 kB (+0.02 kB)
- **최종 업데이트**: 2026-02-23 16:00 KST
- **상태**: ⚠️ 환경 변수 확인 필요

---

## ✅ 이전 업데이트 (v61.1 - 2026-02-23)

### 📱 텔레그램 채널 중심 운영 시스템 (v61.1)
**모든 기능이 텔레그램 채널에서 직접 작동합니다!**

- **🎯 채널 기반 명령어 시스템**:
  - 채널에서 직접 명령어 입력으로 모든 정보 조회 가능
  - `/status` - 전체 티켓 현황
  - `/pending` - 승인 대기 목록
  - `/transactions` - 오늘의 입출금
  - `/unconfirmed` - 미확인 입금
  - `/settle` - 자동 정산 실행
  - `/bookkeep` - 자동 장부 정리
  - `/help` - 명령어 도움말
  
- **🤖 3개 봇 통합 시스템**:
  - **Admin Bot** (@ExitSystem_bot): `8482830575:AAGsth2J04_JWafIpPJOHPrCvvMc6aF2A6A`
    - 채널 명령어 처리
    - 승인/거절 인라인 버튼 (관리자 전용)
  - **Staff Bot** (@ExitStaff_bot): `8492223729:AAGGbXgRr-Iip_s7utWnF5N_P2UncASa_No`
    - 직원 정보 조회
    - 미확인 입금 출처 확인 버튼
  - **Parser Bot**: `8257328345:AAFggBQxqlaQ8jDTTrhD0kYOVr-1p2sxAK0`
    - 입출금 메시지 자동 파싱
    - DB 저장 및 채널 알림

- **📊 자동화 기능**:
  - 입출금 메시지 실시간 파싱
  - 자동 정산 (`/settle`)
  - 자동 장부 정리 (`/bookkeep`)
  - 미확인 입금 알림 및 출처 확인 버튼

- **🔐 권한 관리**:
  - 채널 ID: `-1003833345597`
  - 관리자 ID: `8565387378` (승인/거절 권한)
  - 직원 ID: `8534363302` (조회 권한)

### 🛠️ 기술적 구현 (v61.1)
- **채널 포스트 처리**: `update.channel_post` 핸들링
- **명령어 필터**: `/`로 시작하는 메시지만 처리
- **OCR 모델 변경**: gpt-4o → gpt-4o-mini (비용 절감, 속도 향상)
- **환경 변수 (6개)**:
  ```
  TELEGRAM_ADMIN_BOT_TOKEN=8482830575:AAGsth2J04_JWafIpPJOHPrCvvMc6aF2A6A
  TELEGRAM_STAFF_BOT_TOKEN=8492223729:AAGGbXgRr-Iip_s7utWnF5N_P2UncASa_No
  TELEGRAM_PARSER_BOT_TOKEN=8257328345:AAFggBQxqlaQ8jDTTrhD0kYOVr-1p2sxAK0
  TELEGRAM_CHANNEL_ID=-1003833345597
  TELEGRAM_ADMIN_USER_ID=8565387378
  TELEGRAM_STAFF_USER_IDS=8534363302
  ```

### 📋 설정 가이드
**중요**: Cloudflare Pages 환경 변수 설정이 필수입니다!
- **CLOUDFLARE_ENV_SETUP.md** 참조 (단계별 설정 가이드)
- **TELEGRAM_AUTOMATION_GUIDE.md** 참조 (자동화 시스템 상세)
- **CHANNEL_GUIDE.md** 참조 (채널 운영 가이드)

### 🚀 빠른 시작
1. **Cloudflare Pages 환경 변수 설정** (위 6개 변수)
2. **Admin Bot을 채널에 관리자로 추가**
3. **웹훅 설정**:
   ```bash
   curl -X POST https://api.telegram.org/bot8482830575:AAGsth2J04_JWafIpPJOHPrCvvMc6aF2A6A/setWebhook \
     -H "Content-Type: application/json" \
     -d '{"url":"https://exit-company-system-5je.pages.dev/api/telegram/webhook/admin"}'
   ```
4. **채널에서 테스트**: `/help` 입력

### 📦 배포 정보 (v61.1)
- **Production URL**: https://exit-company-system-5je.pages.dev
- **Latest Deploy**: https://df69ac6d.exit-company-system-5je.pages.dev
- **Git 커밋**: da8bbfb (Cloudflare env guide)
- **빌드 크기**: 221.21 kB
- **최종 업데이트**: 2026-02-23 15:30 KST
- **상태**: ⚠️ 환경 변수 설정 필요

---

## ✅ 이전 업데이트 (v61.0 - 2026-02-23)

### 📱 텔레그램 자동화 시스템 구축 (v61.0)
- **💼 직원 기능 강화**:
  - `/unconfirmed` 명령어: 미확인 입금 조회
  - 출처 확인 인라인 버튼 (업무경비, 회원출금, 물품구매, 기타)
  - 직원 ID 검증 (`TELEGRAM_STAFF_USER_IDS`)
  
- **🔄 Parser Bot 통합**:
  - 입출금 메시지 자동 파싱 (정규식)
  - 예: "입금 1,000,000원 홍길동" → DB 저장
  - 실시간 채널 알림
  - 미확인 입금 자동 감지 및 출처 확인 버튼
  
- **💰 자동 정산 시스템**:
  - `/api/telegram/auto-settlement` 엔드포인트
  - 당일 배팅 결과 자동 처리
  - 당첨금 자동 지급 (포인트 업데이트)
  - 손실 합산 및 순이익 계산
  - 채널 알림 (예: 25건 정산, 5,000,000P 지급, 3,000,000P 순이익)
  
- **📚 자동 장부 시스템**:
  - `/api/telegram/auto-bookkeeping` 엔드포인트
  - 당일 입출금 요약
  - 카테고리별 경비 집계
  - 미확인 입금 알림
  - 순현금 흐름 계산
  - 채널 리포트 (예: 10,000,000원 입금, 3,500,000원 출금, 6,500,000원 순증)

### 🐛 버그 수정 (v61.0)
- **JavaScript 오류 수정**:
  - `toggleAiWidget is not defined` 해결
  - `Illegal return statement` 수정
  - 인라인 onclick 제거, DOMContentLoaded 리스너 추가
  - `saveAllMatchesBulk` 함수 구조 개선

### 📦 빌드 정보 (v61.0)
- **배포 URL**: https://1b7e5e34.exit-company-system-5je.pages.dev
- **Git 커밋**: 9942f8c (JS 오류 수정)
- **빌드 크기**: 218.11 kB (+7.14 kB from v60.3)

---

## ✅ 이전 업데이트 (v60.3 - 2026-02-23)

### 📱 텔레그램 2봇 1채널 시스템 구현 (v60.3)
- **Admin Bot**: 승인 기능 (인라인 버튼)
- **Staff Bot**: 조회 전용
- **공유 채널**: 모든 알림 집중
- **문서**: TELEGRAM_2BOT_SETUP.md 생성

---

## 🎯 주요 기능 (완료)

### ✅ 텔레그램 통합 시스템
- **채널 기반 운영**: 모든 명령어를 채널에서 실행
- **3개 봇 시스템**: Admin, Staff, Parser Bot
- **자동화**: 입출금 파싱, 정산, 장부 정리
- **권한 관리**: 관리자/직원 역할 분리
- **실시간 알림**: 티켓, 승인, 배팅, 정산 알림

### ✅ AI 시스템
- **GPT-4o-mini 챗봇**: 실시간 데이터 조회 (Function Calling)
- **AI 메모리**: 가격표, 배당률, 규정 학습
- **OCR**: 우편물 이미지 자동 인식 (gpt-4o-mini)

### ✅ 티켓 관리
- **티켓 생성**: ORDER, INQUIRY, PURCHASE_ORDER, POINT_ADJUSTMENT, MEMBER, MAIL_INSPECTION, BETTING
- **티켓 상세**: 댓글, 이미지, 상태 변경, 담당자 배정
- **티켓 삭제**: 관리자 전용, CASCADE 삭제

### ✅ 회원 관리
- **회원 등록/수정**: 성명, 수용번호, 교정시설, 사서함 주소, 입금자명
- **포인트 관리**: 일반 포인트, 배팅 포인트 조정
- **회원 삭제**: 관리자 전용

### ✅ 배팅 시스템
- **경기 관리**: 경기 일정, 배당률 설정 (자동 수집)
- **배팅 폴더**: 단폴더/조합폴더 생성
- **포인트 관리**: 배팅 포인트 충전/차감
- **자동 정산**: 배팅 결과 자동 처리

### ✅ 입출금 관리
- **자동 파싱**: 텔레그램 메시지 자동 분석
- **회원 매칭**: 자동/수동 매칭 (신뢰도 점수)
- **승인 워크플로우**: pending → approved/rejected
- **장부 정리**: 카테고리별 경비 관리

### ✅ 관리자 기능
- **직원 관리**: 직원 등록/수정/삭제, 역할 관리
- **승인 관리**: 회원 정보 수정 승인
- **통계 리포트**: 대시보드, 일일 마감 리포트
- **시스템 설정**: API 키, 정산 파라미터, 알림 설정

## 🔐 권한 매트릭스

| 기능 | Viewer | Staff | Admin |
|------|--------|-------|-------|
| 티켓 조회 | ✅ | ✅ | ✅ |
| 티켓 생성 | ❌ | ✅ | ✅ |
| 티켓 수정 | ❌ | ✅ | ✅ |
| 티켓 삭제 | ❌ | ❌ | ✅ |
| 회원 조회 | ✅ | ✅ | ✅ |
| 회원 등록 | ❌ | ✅ (승인) | ✅ |
| 회원 수정 | ❌ | ✅ (승인) | ✅ |
| 회원 삭제 | ❌ | ❌ | ✅ |
| 우편물 관리 | ✅ | ✅ | ✅ |
| 답변 작성 | ❌ | ✅ | ✅ |
| 배팅 관리 | ❌ | ✅ | ✅ |
| 직원 관리 | ❌ | ❌ | ✅ |
| 승인 관리 | ❌ | ❌ | ✅ |
| 텔레그램 승인 | ❌ | ❌ | ✅ |
| API 토큰 생성 | ❌ | ❌ | ✅ |

## 🏗️ 기술 스택
- **Backend**: Hono + TypeScript
- **Frontend**: Vanilla JS + TailwindCSS
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **Deployment**: Cloudflare Pages
- **Automation**: GitHub Actions (경기 일정 자동 등록)
- **AI**: OpenAI GPT-4o-mini
- **Bot**: Telegram Bot API (3개 봇)
- **Authentication**: JWT (API 토큰 기반)
- **Dev Tools**: Wrangler, Vite, PM2

## 📊 주요 데이터베이스 테이블
- `members`: 회원 정보
- `tickets`: 티켓 정보
- `ticket_comments`: 티켓 댓글
- `mail_items`: 우편물 정보
- `responses`: 답변 정보
- `staff`: 직원 정보
- `point_transactions`: 포인트 거래 내역
- `betting_matches`: 배팅 경기
- `bet_folders`: 배팅 폴더
- `bets`: 배팅 내역
- `transactions`: 입출금/경비 거래
- `pending_deposits`: 미확인 입금 대기 큐
- `ai_memory`: AI 챗봇 메모리
- `settings`: 시스템 설정

## 🚀 로컬 개발

```bash
# 환경 변수 설정
cp .dev.vars.example .dev.vars
# .dev.vars 파일 편집

# 개발 서버 시작 (PM2)
npm run build
pm2 start ecosystem.config.cjs

# 서비스 확인
pm2 logs --nostream
curl http://localhost:3000

# D1 데이터베이스 마이그레이션
npm run db:migrate:local

# D1 데이터베이스 초기화
npm run db:reset
```

## 📦 배포

```bash
# Cloudflare Pages 배포
npm run build
npx wrangler pages deploy dist

# D1 프로덕션 마이그레이션
npm run db:migrate:prod
```

## 🐛 알려진 이슈

### ⚠️ 환경 변수 미설정 (v61.1)
**증상**: Admin Bot이 채널에서 응답하지 않음 (500 에러)

**원인**: Cloudflare Pages 환경 변수 미설정

**해결 방법**:
1. Cloudflare Pages 대시보드 접속
2. exit-company-system 프로젝트 선택
3. Settings → Environment variables
4. 다음 6개 변수를 Production 환경에 추가:
   ```
   TELEGRAM_ADMIN_BOT_TOKEN=8482830575:AAGsth2J04_JWafIpPJOHPrCvvMc6aF2A6A
   TELEGRAM_STAFF_BOT_TOKEN=8492223729:AAGGbXgRr-Iip_s7utWnF5N_P2UncASa_No
   TELEGRAM_PARSER_BOT_TOKEN=8257328345:AAFggBQxqlaQ8jDTTrhD0kYOVr-1p2sxAK0
   TELEGRAM_CHANNEL_ID=-1003833345597
   TELEGRAM_ADMIN_USER_ID=8565387378
   TELEGRAM_STAFF_USER_IDS=8534363302
   ```
5. Retry deployment 또는 재배포
6. 채널에서 `/help` 테스트

**상세 가이드**: `CLOUDFLARE_ENV_SETUP.md` 참조

## 📝 다음 단계 권장사항

1. **✅ 환경 변수 설정**: Cloudflare Pages 환경 변수 추가 (최우선)
2. **텔레그램 봇 테스트**: 채널에서 모든 명령어 테스트
3. **자동화 스케줄**: GitHub Actions로 정산/장부 자동 실행
4. **모바일 UX 최적화**: 반응형 디자인 개선
5. **알림 확장**: 더 많은 이벤트에 대한 알림 추가

## 📚 문서

- **CLOUDFLARE_ENV_SETUP.md**: 환경 변수 설정 가이드 ⭐
- **TELEGRAM_AUTOMATION_GUIDE.md**: 자동화 시스템 상세
- **CHANNEL_GUIDE.md**: 채널 운영 가이드
- **TELEGRAM_2BOT_SETUP.md**: 2봇 설정 가이드

## 📞 지원

- **GitHub**: https://github.com/wodnr990921-cloud/exit_company_system
- **Issues**: GitHub Issues 탭 활용

---

**Last Updated**: 2026-02-23  
**Version**: v61.1  
**Status**: ⚠️ 환경 변수 설정 필요 (CLOUDFLARE_ENV_SETUP.md 참조)
