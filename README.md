# EXIT COMPANY - 교정시설 업무 대행 시스템 v55.1

## ✅ 최근 업데이트 (v55.1 - 2026-02-19)

### 🐛 버그 수정
- **삭제 권한 문제 해결**: `ROLE_HIERARCHY`에 `delete` 권한 추가 (admin 레벨 3)
- **티켓 생성 500 오류 해결**: `metadata` 컬럼이 DB 스키마에 없어 발생한 SQLITE_ERROR 수정
- **오류 메시지 개선**: 서버 오류 발생 시 `details`와 `stack trace`를 콘솔과 Toast로 표시
- **에러 핸들링 강화**: `error.response.data.details` 상세 정보를 UI에 표시

### 🔍 디버깅 개선
- 티켓 생성 시 입력값, currentStaff, 전송 데이터를 콘솔에 로깅
- 서버 오류 응답의 `error`, `details`, `stack` 정보를 모두 표시
- Toast 메시지에 상세 오류 정보 포함 (5초 표시)

## 🌐 배포 정보
- **Production URL**: https://exit-company-system.pages.dev/
- **Latest Preview**: https://f5ebb8c8.exit-company-system-5je.pages.dev/
- **Build Size**: 150.87 kB
- **Build Time**: 854 ms
- **Deploy Time**: 10.2 sec
- **Last Updated**: 2026-02-19 04:45 UTC

## 🎯 주요 기능 (완료)

### ✅ v54.0 - 삭제 기능 (관리자 전용)
- **티켓 삭제**: 관리자만 티켓 및 관련 댓글·아이템 CASCADE 삭제 가능
- **회원 삭제**: 관리자만 회원 삭제 가능 (단, 관련 티켓이 없을 때만)
- **권한 확인**: `hasPermission('delete')` 함수로 권한 검증
- **UI 표시**: Admin 역할일 때만 빨간 휴지통 버튼 표시

### ✅ v53.0 - 답변 상세 모달 (경량화)
- **답변 목록 클릭**: 클릭 시 상세 내용을 모달로 표시
- **티켓 열기 버튼**: 답변과 연결된 티켓을 바로 열 수 있는 버튼 추가
- **레터헤드 적용**: 답변 출력 시 로컬 이미지 사용 (`/exit-letterhead-response.png`)
- **템플릿 자동 적용**: 
  ```
  (사서함주소)-(수용번호) (회원 성명)님 귀하
  ex) 남인천 사서함 343-1111 김테스트님 귀하
  
  [답변 내용]
  ```

### ✅ 티켓 관리
- **티켓 생성**: ORDER, INQUIRY, PURCHASE_ORDER, POINT_ADJUSTMENT, MEMBER, MAIL_INSPECTION, BETTING
- **티켓 상세**: 댓글, 이미지, 상태 변경, 담당자 배정
- **티켓 삭제**: 관리자 전용, CASCADE 삭제 (댓글·아이템 포함)

### ✅ 회원 관리
- **회원 등록/수정**: 성명, 수용번호, 교정시설, 사서함 주소, 입금자명
- **포인트 관리**: 일반 포인트, 배팅 포인트 조정
- **회원 삭제**: 관리자 전용 (관련 티켓 없을 때만)

### ✅ 우편물 관리
- **우편 등록/검수**: 이미지 업로드, 검수 상태 관리
- **일괄 배당**: 여러 우편물을 한 번에 직원에게 배당
- **티켓 자동 생성**: 우편물 검수 후 티켓 자동 생성

### ✅ 답변 관리
- **답변 입력**: 회원별 답변 작성
- **답변 출력**: 레터헤드 포함 인쇄용 템플릿
- **답변 통계**: 일별, 주별, 월별 통계

### ✅ 배팅 시스템
- **경기 관리**: 경기 일정, 배당률 설정
- **배팅 폴더**: 단폴더/조합폴더 생성
- **포인트 관리**: 배팅 포인트 충전/차감

### ✅ 관리자 기능
- **직원 관리**: 직원 등록/수정/삭제, 역할 관리
- **승인 관리**: 회원 정보 수정 승인
- **통계 리포트**: 대시보드, 일일 마감 리포트
- **활동 로그**: 시스템 활동 기록 조회

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
| 통계 리포트 | ✅ (제한) | ✅ | ✅ |

## 🏗️ 기술 스택
- **Backend**: Hono + TypeScript
- **Frontend**: Vanilla JS + TailwindCSS
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **Deployment**: Cloudflare Pages
- **Dev Tools**: Wrangler, Vite, PM2

## 📊 데이터베이스 스키마

### 주요 테이블
- `members`: 회원 정보
- `tickets`: 티켓 정보
- `ticket_comments`: 티켓 댓글
- `ticket_items`: 티켓 아이템 (도서 등)
- `mail_items`: 우편물 정보
- `responses`: 답변 정보
- `staff`: 직원 정보
- `point_transactions`: 포인트 거래 내역
- `betting_matches`: 배팅 경기
- `bet_folders`: 배팅 폴더
- `bets`: 배팅 내역

## 🚀 로컬 개발

```bash
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
npx wrangler pages deploy dist --project-name exit-company-system

# D1 프로덕션 마이그레이션
npm run db:migrate:prod
```

## 🐛 알려진 이슈

없음 (v55.1 기준)

## 📝 다음 단계 권장사항

1. **모바일 UX 최적화**: 반응형 디자인 개선
2. **고급 검색/필터**: 다중 조건 검색 기능
3. **알림 시스템**: 실시간 알림 (Cloudflare Durable Objects)
4. **엑셀 내보내기**: 통계/리포트 엑셀 다운로드
5. **권한 세분화**: 더 상세한 권한 관리 (RBAC)

## 📞 지원

- **GitHub**: https://github.com/wodnr990921-cloud/exit_company_system
- **Issues**: GitHub Issues 탭 활용

---

**Last Updated**: 2026-02-19  
**Version**: v55.1  
**Status**: ✅ Production Ready
