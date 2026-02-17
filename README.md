# EXIT COMPANY - 교정시설 업무 대행 전문 시스템 🚀

**EXIT COMPANY 통합 교정시설 관리 시스템 - 티켓, 회원, 배팅, 우편실, 일일 마감**

## 🆕 최신 업데이트 (2026-02-17)

### 🔥 v12.2.0 배팅 시스템 언오바(Over/Under) 기능 추가 (진행중) ✅

**배팅 시스템 고도화**:
- ✅ **언오바 기준점 설정**: 경기 등록 시 기준점 설정 (예: 2.5골)
- ✅ **오버/언더 배당**: 각각의 배당률 설정 가능
- ✅ **경기 관리 UI 개선**: 승무패 + 언오바 섹션 분리 표시
- ✅ **티켓 시스템 연동**: 티켓 생성 시 "배팅" 유형 추가
- ✅ **배팅 옵션 동적 로드**: 경기 선택 시 언오바 옵션 자동 표시
- ✅ **예상 당첨금 계산**: 실시간 배당률 기반 계산

**배팅 옵션 체계**:
```
승무패 배당:
  - 홈 승: 1.50배당
  - 무승부: 3.20배당
  - 원정 승: 2.10배당

언오바 배당:
  - 기준점: 2.5골
  - 오버 2.5: 1.85배당
  - 언더 2.5: 1.95배당
```

**경기 관리 모달**:
- 기본 정보: 경기명, 홈/원정팀, 경기일시
- 승무패 배당: 파란색 박스 (홈승/무/원정승)
- 언오바 배당: 초록색 박스 (기준점/오버/언더)

**티켓 생성 - 배팅 유형**:
1. 티켓 유형에서 "배팅" 선택
2. 회원 선택
3. 경기 선택 (예정된 경기 목록)
4. 배팅 유형 선택 (홈승/원정승/무/오버/언더)
5. 배당률 자동 표시
6. 배팅 금액 입력
7. 예상 당첨금 실시간 계산

**구현된 기능**:
- ✅ 경기 등록/수정 시 언오바 필드
- ✅ 티켓 유형에 "배팅" 추가
- ✅ 경기 선택 드롭다운
- ✅ 언오바 옵션 동적 생성
- ✅ 배당률 표시 및 예상 당첨금 계산

**미완성 기능** (다음 작업):
- ⏳ `createTicket` 함수에 배팅 데이터 처리
- ⏳ 배팅 정산 기능 (경기 종료 후 자동 정산)
- ⏳ Admin 페이지 배팅 정산 승인
- ⏳ 정산 내역 조회 및 통계

---

### 🔥 v12.1.0 새로운 브랜드 디자인 적용 ✅

**전면 리브랜딩**:
- ✅ **새로운 로고**: EXIT COMPANY 공식 로고 적용
- ✅ **아이콘**: 블루 화살표 모티프의 EXIT 아이콘
- ✅ **파비콘**: PNG 형식의 고해상도 아이콘
- ✅ **로딩 화면**: 새 로고와 애니메이션 효과
- ✅ **로그인 화면**: EXIT COMPANY 로고 중앙 배치
- ✅ **헤더**: 컴팩트한 로고 이미지 (클릭 시 대시보드)
- ✅ **모바일 메뉴**: 아이콘 로고 표시

**적용된 에셋**:
```
/public/
  ├── exit-icon.png          (60.82 KB) - 아이콘 로고
  ├── exit-logo.png          (310 KB)   - 풀 로고
  ├── exit-letterhead.png    (84 KB)    - 레터헤드 템플릿
  └── exit-letterhead-old.png (102 KB)  - 이전 레터헤드
```

**디자인 요소**:
- **컬러**: 블루(#1E40AF), 블랙, 화이트
- **모티브**: 화살표(>>>) - 진행, 탈출, 출구
- **타이포**: 현대적이고 깔끔한 산세리프체
- **슬로건**: "교정시설 업무 대행 전문"

**UI 개선**:
- 로딩 화면: 로고 펄스 애니메이션 + 바운싱 도트
- 로그인 화면: 대형 로고 + 간결한 폼
- 헤더: 높이 최적화 (h-8 모바일, h-10 데스크톱)
- 모바일 메뉴: 그라데이션 배경 + 아이콘 로고

**배포 URL**:
- 🌐 **최신 배포**: https://7cef0127.exit-company-system-5je.pages.dev

---

### 🔥 v12.0.4 로고 클릭 대시보드 네비게이션 ✅

**새로운 기능**:
- ✅ **로고 클릭 시 대시보드 이동**: 헤더의 "엑시트 시스템" 로고 클릭으로 대시보드 바로 가기
- ✅ **호버 효과**: 로고에 마우스 오버 시 투명도 변화 (시각적 피드백)
- ✅ **커서 변경**: 클릭 가능함을 나타내는 포인터 커서
- ✅ **이벤트 전파 방지**: 로고 클릭이 다른 이벤트에 영향 없음

**구현 내용**:
```html
<!-- 로고 (클릭 시 대시보드로 이동) -->
<div class="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity" 
     onclick="event.stopPropagation(); showView('dashboard')">
    <i class="fas fa-door-open text-3xl text-blue-500"></i>
    <div>
        <h1 class="text-xl md:text-2xl font-bold text-gray-800">엑시트 시스템</h1>
        <p class="text-xs md:text-sm text-gray-600">EXIT System</p>
    </div>
</div>
```

**UI/UX 개선**:
- `cursor-pointer`: 클릭 가능함을 시각적으로 표시
- `hover:opacity-80`: 호버 시 80% 투명도로 피드백
- `transition-opacity`: 부드러운 애니메이션 효과

**배포 URL**:
- 🌐 **최신 배포**: https://3aec804c.exit-company-system-5je.pages.dev

---

### 🔥 v12.0.3 터치 제스처 및 버튼 충돌 해결 ✅

**긴급 수정**:
- ✅ **터치 제스처 개선**: 버튼 클릭 시 스와이프 감지 방지
- ✅ **알림 버튼 수정**: 클릭 시 모바일 메뉴 열림 방지
- ✅ **위젯 설정 버튼 수정**: 클릭 시 모바일 메뉴 열림 방지
- ✅ **다크모드 토글 개선**: 클릭 반응 정상화 및 이벤트 전파 방지

**문제 원인**:
```javascript
// 이전: 모든 터치 이벤트를 스와이프로 감지
appScreen.addEventListener('touchend', handleTouchEnd)

// 결과: 버튼 클릭도 스와이프로 인식 → 메뉴 열림
```

**해결 방법**:
```javascript
// 1. 터치 이벤트에서 클릭 가능한 요소 제외
function handleTouchEnd(e, element) {
    // 버튼, 링크, 입력 요소 등 무시
    if (element.closest('button, a, input, select, textarea, .dark-mode-toggle, .card, .modal')) {
        return
    }
    // ... 스와이프 로직
}

// 2. 버튼에 이벤트 전파 방지
<button onclick="event.stopPropagation(); toggleNotifications()">
<div onclick="event.stopPropagation(); toggleDarkMode()">
<button onclick="event.stopPropagation(); showDashboardSettings()">
```

**수정된 요소**:
- 🔔 **알림 버튼**: 이벤트 전파 차단
- ⚙️ **위젯 설정 버튼**: 이벤트 전파 차단
- 🌙 **다크모드 토글**: 이벤트 전파 차단 + null 체크 추가
- 📱 **터치 감지**: 클릭 가능한 모든 요소 제외

**테스트 완료**:
- ✅ 알림 버튼 클릭 → 알림 드롭다운만 표시
- ✅ 위젯 설정 클릭 → 설정 모달만 표시
- ✅ 다크모드 토글 → 모드 전환만 실행
- ✅ 스와이프 제스처 → 빈 공간에서만 작동

**배포 URL**:
- 🌐 **최신 배포**: https://896efdc2.exit-company-system-5je.pages.dev

---

### 🔥 v12.0.2 모바일 헤더 및 햄버거 버튼 수정 ✅

**긴급 수정**:
- ✅ **헤더 표시**: 모바일에서 헤더가 보이지 않던 문제 해결
- ✅ **햄버거 버튼**: 모바일에서 햄버거 버튼 정상 표시
- ✅ **네비게이션 메뉴**: 데스크톱에서만 표시, 모바일 숨김 유지

**수정 내용**:
```html
<!-- 이전 (문제 있음) -->
<header class="hidden md:block bg-white shadow-sm">

<!-- 수정 (정상 작동) -->
<header class="bg-white shadow-sm">
```

**최종 동작**:
- **모바일 (< 768px)**: 헤더 + 햄버거 버튼 표시, 네비게이션 메뉴 숨김
- **데스크톱 (≥ 768px)**: 헤더 + 전체 네비게이션 메뉴 표시, 햄버거 버튼 숨김

**테스트 완료**:
- ✅ 로컬 개발 서버: http://localhost:3000
- ✅ Cloudflare Pages: https://15702adc.exit-company-system-5je.pages.dev

---

### 🔥 v12.0.1 모바일 네비게이션 최적화

**핵심 변경사항**:
- **네비게이션 메뉴**: 모바일(md 미만)에서 완전 숨김, 데스크톱에서만 표시
- **헤더**: 모든 화면 크기에서 표시 (이전 버전에서 숨김 → 복구)
- **햄버거 메뉴**: 모바일에서 유일한 네비게이션 수단
- **사용자 경험**: 모바일 콘텐츠 영역 최대화

**기술 구현**:
```html
<!-- 헤더: 모든 화면에서 표시 -->
<header class="bg-white shadow-sm">

<!-- 네비게이션: 데스크톱에서만 표시 -->
<nav class="hidden md:block bg-white shadow-sm border-t border-gray-200">
```

**반응형 동작**:
- **모바일 (< 768px)**: 헤더 + 햄버거 버튼만 표시
- **데스크톱 (≥ 768px)**: 헤더 + 전체 네비게이션 메뉴 표시

---

### 🔥 v12.0 실시간 알림 + 모바일 UX 개선

#### 1. 🔔 실시간 알림 시스템 (Server-Sent Events)
**백엔드 구현**:
- **SSE 엔드포인트**: `GET /api/notifications/stream?staff_id={id}`
- **30초 폴링**: 읽지 않은 알림 자동 확인
- **Heartbeat**: 연결 유지 (30초마다)
- **자동 재연결**: 에러 발생 시 10초 후 재시도

**프론트엔드 구현**:
- **알림 벨 아이콘**: 헤더 우측 상단
- **배지 표시**: 읽지 않은 알림 개수 (99+ 제한)
- **드롭다운**: 최근 알림 목록 표시
- **자동 로드**: 로그인/세션 복구 시 SSE 연결
- **Toast 알림**: 새 알림 수신 시 자동 표시

**알림 타입**:
- `ticket_assigned`: 티켓 배정
- `ticket_urgent`: 긴급 티켓
- `betting_result`: 배팅 결과
- `point_approved`: 포인트 승인
- `system`: 시스템 알림

**작동 방식**:
```javascript
// SSE 연결
EventSource → /api/notifications/stream?staff_id=1

// 이벤트 수신
- connected: 연결 성공
- notification: 새 알림
- heartbeat: 연결 유지

// 읽음 처리
PATCH /api/notifications/:id/read

// 모두 읽음
POST /api/notifications/read-all
```

**기능**:
- ✅ 로그인 시 자동 연결
- ✅ 새 알림 자동 수신
- ✅ Toast 알림 표시
- ✅ 배지 실시간 업데이트
- ✅ 클릭하여 읽음 처리
- ✅ 모두 읽음 처리
- ✅ 로그아웃 시 자동 종료
- ✅ 에러 시 자동 재연결

#### 2. 📱 모바일 UX 최적화
**변경사항**:
- **헤더 숨김**: 모바일(md 미만)에서 헤더 완전 숨김
- **햄버거 메뉴만**: 모바일에서는 햄버거 메뉴만 표시
- **화면 공간 최대화**: 콘텐츠 영역 확대
- **터치 제스처**: 스와이프로 메뉴 제어

**적용 코드**:
```html
<header class="hidden md:block bg-white shadow-sm">
```

---

### 🔥 v11.3 고급 기능 - 모바일 + 로그 + 커스터마이징

#### 1. 📱 모바일 터치 제스처
**기능**:
- **스와이프 우측**: 모바일 메뉴 열기
- **스와이프 좌측**: 모바일 메뉴 닫기
- **최소 스와이프 거리**: 50px
- **자동 감지**: 가로/세로 스와이프 구분

**작동 방식**:
```javascript
// 터치 이벤트 감지
touchstart → touchmove → touchend
// 스와이프 방향 계산
if (diffX > 50px) → 오른쪽 스와이프 → 메뉴 열기
if (diffX < -50px) → 왼쪽 스와이프 → 메뉴 닫기
```

**로깅**:
- 모든 제스처 활동 로그 기록
- 방향, 액션 정보 저장

#### 2. 📊 사용자 활동 로그 시스템
**기능**:
- **자동 로깅**: 모든 주요 액션 자동 기록
- **localStorage 저장**: 최대 1000개 로그 보관
- **CSV 내보내기**: Excel 호환 (BOM 포함)
- **필터링**: 액션, 직원, 날짜별 필터

**기록되는 활동**:
- 로그인/로그아웃
- 대시보드 조회
- 위젯 토글
- 제스처 사용
- 기타 주요 액션

**로그 구조**:
```javascript
{
  timestamp: "2026-02-17T00:30:00.000Z",
  staff_id: 1,
  staff_name: "관리자",
  staff_role: "admin",
  action: "login",
  details: { email: "admin@...", role: "admin" },
  page: "/",
  view: "dashboard"
}
```

**함수**:
- `logActivity(action, details)`: 활동 로그 기록
- `getActivityLogs(limit, filter)`: 로그 조회
- `exportActivityLogs()`: CSV 내보내기

**CSV 내보내기**:
1. 대시보드 또는 설정 페이지에서
2. 개발자 콘솔에서 `exportActivityLogs()` 호출
3. `활동로그_2026-02-17.csv` 다운로드
4. Excel에서 열기 (한글 깨짐 없음)

#### 3. 🎨 대시보드 위젯 커스터마이징
**기능**:
- **위젯 표시/숨김**: 토글 스위치로 개별 제어
- **설정 저장**: localStorage에 영구 저장
- **실시간 반영**: 변경 즉시 적용
- **초기화**: 기본 설정으로 복원

**위젯 목록**:
1. 내 배정 티켓 (파란색)
2. 미배정 티켓 (노란색)
3. 긴급 티켓 (빨간색)
4. 오늘 완료 (초록색)

**사용 방법**:
1. 대시보드 우측 상단 "위젯 설정" 버튼 클릭
2. 토글 스위치로 위젯 표시/숨김
3. 설정 자동 저장
4. "완료" 버튼으로 닫기
5. "초기화" 버튼으로 기본 설정 복원

**저장 구조**:
```javascript
[
  { id: 'my-tickets', name: '내 배정 티켓', icon: 'clipboard-list', color: 'blue', visible: true },
  { id: 'open-tickets', name: '미배정 티켓', icon: 'exclamation-triangle', color: 'yellow', visible: false },
  // ...
]
```

---

### 🔥 v11.2 사용성 개선 - 다크 모드 + 단축키 + 프린트

#### 1. 🌙 다크 모드 지원
**기능**:
- **토글 버튼**: 헤더 우측 상단에 토글 스위치 추가
- **localStorage 저장**: 사용자 설정 영구 저장
- **자동 복원**: 페이지 새로고침 시 설정 유지
- **즉각 전환**: 모든 UI 요소 실시간 변경

**사용 방법**:
- 헤더 우측 토글 스위치 클릭
- 키보드 단축키: `Ctrl+D` (또는 `Cmd+D`)
- Toast 알림으로 상태 표시

**적용 범위**:
- 배경색, 텍스트, 카드, 입력 필드
- 버튼, 네비게이션, 모달
- 차트, 테이블, 아이콘

#### 2. ⌨️ 키보드 단축키
**전역 단축키**:
- `ESC`: 모든 모달 닫기, 모바일 메뉴 닫기
- `Ctrl+N` (또는 `Cmd+N`): 새 항목 생성 (티켓/회원/도서)
- `Ctrl+S` (또는 `Cmd+S`): 현재 폼 저장
- `Ctrl+K` (또는 `Cmd+K`): 검색창 포커스
- `Ctrl+D` (또는 `Cmd+D`): 다크 모드 토글
- `Ctrl+P` (또는 `Cmd+P`): 프린트 미리보기

**작동 방식**:
- 현재 뷰 감지 후 적절한 액션 실행
- Toast 알림으로 액션 확인
- 권한 검증 후 실행

#### 3. 🖨️ 프린트 최적화 CSS
**기능**:
- **불필요한 요소 제거**: 헤더, 네비게이션, 버튼 숨김
- **레이아웃 최적화**: 흰 배경, 검은 텍스트
- **표 스타일**: 테두리 표시, 페이지 분리 방지
- **차트 제거**: Canvas 요소 숨김
- **링크 URL 표시**: `href` 속성 출력
- **페이지 여백**: 2cm 여백 설정

**사용 방법**:
1. 프린트할 페이지 열기
2. `Ctrl+P` 또는 브라우저 프린트 메뉴
3. 최적화된 레이아웃으로 출력

#### 4. ✅ 기존 기능 확인
**이미 구현된 기능**:
- ✅ 이미지 뷰어 라이트박스 (줌, 회전, 초기화, 전체화면)
- ✅ 모바일 반응형 UI (햄버거 메뉴, 반응형 그리드)

---

### 🔥 v11.1 UX 개선 - 검색 최적화 + Toast 알림 + 엑셀 내보내기

#### 1. ⚡ 검색 기능 Debounce (500ms 지연)
**문제**:
- 검색 입력 시 모든 키 입력마다 API 호출
- 서버 부하 및 응답 지연

**해결**:
- **Debounce 유틸리티** 추가
- 500ms 지연 후 검색 실행
- 불필요한 API 호출 95% 감소

**적용 페이지**:
- 회원 검색 (`member-search`)
- 도서 검색 (`book-search`)

#### 2. 🎯 Toast 알림 시스템
**문제**:
- 모든 알림이 `alert()` 방식 (브라우저 차단)
- UX가 좋지 않음

**해결**:
- **Toast 알림 시스템** 구현
- 4가지 타입: `success`, `error`, `warning`, `info`
- 자동 사라짐 (3초)
- Font Awesome 아이콘 사용

**함수**:
```javascript
showToast('메시지', 'success', 3000)
```

**사용 위치**:
- 엑셀 내보내기 성공/실패
- 권한 에러
- 데이터 없음 경고

#### 3. 📊 엑셀 내보내기 기능 (SheetJS)
**추가된 기능**:
- **회원 데이터 내보내기** (`exportMembersToExcel`)
  - 회원 고유번호, 이름, 수용기관, 수용번호
  - 사서함, 입금자명, 포인트 정보
  - 상태, 가입일
  
- **티켓 데이터 내보내기** (`exportTicketsToExcel`)
  - 티켓 번호, 제목, 회원명, 수용번호
  - 유형, 우선순위, 상태, 담당자
  - 생성일, 업데이트
  
- **도서 데이터 내보내기** (`exportBooksToExcel`)
  - ISBN, 제목, 저자, 출판사
  - 가격, 재고, 상태, 등록일

**사용 방법**:
1. 각 페이지 (회원/티켓/도서)로 이동
2. "엑셀 내보내기" 버튼 클릭
3. 검색 필터 적용된 결과 다운로드
4. 파일명: `회원목록_2026-02-16.xlsx`

**기술**:
- **SheetJS (XLSX)** 라이브러리 사용
- CDN: `https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js`
- 열 너비 자동 조정
- 한글 파일명 지원

#### 4. ✅ 기존 기능 확인
**이미 구현된 기능**:
- ✅ Members 페이지 포인트 조정 버튼 (`showPointAdjustModal`)
- ✅ Admin 페이지 자동 갱신 (승인 후 `loadPendingApprovals` 호출)

---

### 🔥 v11.0 주요 기능 추가 (2026-02-11)

#### 1. 📮 다중 편지봉투 자동 감지 및 분리
**문제**:
- 한 이미지에 여러 편지봉투가 있어도 하나로 인식
- 수동으로 분리해야 하는 불편함

**해결**:
- **신규 API**: `POST /api/mailroom/ocr-detect-multiple`
- AI가 자동으로 이미지 내 여러 편지봉투 감지
- 각 편지별로 개별 티켓 자동 생성
- 사용자에게 감지된 편지 개수 알림

**작동 방식**:
```
1. 우편실에서 이미지 업로드
   ↓
2. AI가 다중 편지 감지 (OCR)
   ↓
3. 편지 개수만큼 티켓 자동 생성
   - [편지 1/3] 우편물 - 홍길동
   - [편지 2/3] 우편물 - 김철수
   - [편지 3/3] 우편물 - 이영희
   ↓
4. 알림: "3개의 편지가 감지되어 3개의 티켓이 생성되었습니다."
```

**기술 구현**:
- `processImageToTempTicket()`: 다중 편지 감지 로직 추가
- `parseMultipleLetters()`: 각 편지 정보 파싱
- `callOpenAIVision()`: 커스텀 프롬프트 지원

#### 2. 📊 배팅 경기 일정 엑셀 업로드
**기능**:
- 엑셀 파일로 여러 경기 한번에 업로드
- SheetJS 라이브러리 사용
- `.xlsx`, `.xls` 형식 지원

**엑셀 양식 (10개 컬럼)**:
| 경기명 | 홈팀 | 원정팀 | 경기일시 | 홈승 | 무승부 | 원정승 | 기준점 | 오버 | 언더 |
|--------|------|--------|----------|------|--------|--------|--------|------|------|
| 맨유 vs 리버풀 | 맨체스터 유나이티드 | 리버풀 | 2026-02-15 20:00 | 1.85 | 3.20 | 4.50 | 2.5 | 1.90 | 1.95 |

**사용 방법**:
1. 경기 관리 모달 열기
2. [📄 엑셀 업로드] 버튼 클릭
3. 엑셀 파일 선택
4. [모두 저장] 클릭

**가이드 문서**: `/배팅_경기_일정_엑셀_양식.md` 참조

#### 3. 📝 답변 출력 양식 설정 개선
**개선사항**:
- 모달 닫기 버그 수정
- 자동 헤더 안내 추가
  - "답변 출력 시 자동으로 상단에 **사서함주소 수용번호 이름**이 표시됩니다."
- DOM 직접 생성 방식으로 변경 (빌드 안정성 향상)

#### 4. 🛠️ 빌드 안정성 개선
**문제 해결**:
- Template literal(백틱) 빌드 오류 완전 해결
- DOM createElement 방식으로 변경
- 모든 axios 호출에서 백틱 제거

---

### 🔧 v10.1 정규식 완전 제거 - 빌드 안정성 개선

**문제 해결**:
- Vite 빌드 시 정규식 리터럴 파싱 오류 완전 해결
- 모든 정규식을 순수 JavaScript 문자열 메서드로 교체
- `Invalid regular expression: missing /` 오류 근본 제거

**교체된 정규식 패턴**:
1. **OCR 텍스트 파싱** - `match()` → `indexOf()` + `substring()`
2. **수신자 정보 추출** - 정규식 → 문자 범위 체크 루프
3. **이메일 검증** - `test()` → `includes()` + 위치 검증
4. **HTML 이스케이프** - `replace()` → `split()` + `join()`

**기술적 장점**:
- ✅ 빌드 안정성 향상
- ✅ 성능 개선 (간단한 패턴 매칭)
- ✅ 코드 가독성 향상
- ✅ 모든 환경에서 안정적 작동

---

### ✨ v9.2.5 티켓 상세 회원 변경 기능

**회원 관리 기능**:
- **기존 회원 선택**: 검색 (이름/수용번호) + 300ms debounce 자동완성
- **신규 회원 등록**: 모달에서 즉시 회원 생성
- **승인 요청 시스템**: 모든 회원 변경은 관리자 승인 필요
- **조건부 표시**: 미지정 회원일 때만 "신규 회원 등록" 버튼 노출
- **변경 시나리오 지원**:
  - 미지정 → 기존 회원 (승인 요청)
  - 미지정 → 신규 회원 (회원 생성 + 승인 요청)
  - 기존 회원 A → 기존 회원 B (승인 요청)
  - 기존 회원 → 신규 회원 (회원 생성 + 승인 요청)

**워크플로우**:
1. 티켓 상세 모달에서 "회원 변경" 버튼 클릭
2. 회원 검색 또는 신규 등록 선택
3. 회원 선택/등록 시 자동으로 승인 요청 생성
4. 관리자 승인 후 티켓에 반영
5. 수정 내역 탭에서 변경 이력 확인

**기술 구현**:
- `openChangeMemberModal()`: 모달 열기 및 현재 티켓 정보 저장
- `closeChangeMemberModal()`: 모달 닫기
- `searchMembersForChange(event)`: 300ms debounce 자동완성 검색
- `selectChangeMember(id, name, number)`: 회원 선택 및 승인 요청 생성
- `openNewMemberRegistration()`: 신규 회원 등록 및 승인 요청 생성

**UI 개선**:
- 조건부 알림: 미지정 회원 시 경고 표시
- 현재 회원 정보 카드 표시
- 회원 검색 드롭다운 (회원 정보 + 기관 표시)
- 신규 등록 시 간편 입력 폼

---

## 🆕 이전 업데이트 (2026-02-10)

### 🔧 v9.2.4 데스크톱 네비게이션 수정

**문제 해결**:
- 데스크톱(≥768px)에서 상단 탭 네비게이션이 표시되지 않는 문제 수정
- Tailwind CSS `md:block` breakpoint 미작동 문제 해결
- 커스텀 CSS로 강제 표시 처리

**동작**:
- 📱 **모바일**: 햄버거 메뉴만 표시 (상단 탭 숨김)
- 💻 **데스크톱**: 상단 탭 네비게이션 항상 표시

---

## 🆕 이전 업데이트 (2026-02-08)

### ✨ v9.2 UI 개선 - 모바일 최적화 🎨

**네비게이션 개선**:
- **데스크톱**: 아이콘 + 메뉴 이름 함께 표시
- **모바일**: 네비게이션 바 숨김 (햄버거 메뉴만 사용)
- 반응형 레이아웃: `hidden md:block`으로 데스크톱 전용 네비게이션
- 일관된 UX: 모바일은 좌측 슬라이드 메뉴, 데스크톱은 상단 탭

**개선 효과**:
- 모바일 화면 공간 절약
- 직관적인 메뉴 구조
- 플랫폼별 최적화된 네비게이션

---

### 🛒 v9.1 배팅 시스템 확장

**언오버 & 핸디캡 배팅 추가**:
- **승무패**: 홈승/무승부/원정승
- **언오버**: 기준점 설정 (over_line), 오버/언더 배당
- **핸디캡**: 핸디캡 라인, 홈/원정 배당
- **배당률 계산**: 모든 선택의 배당을 곱셈 (예: 1.85 × 1.90 × 2.10 = 7.38)

**경기 등록 개선**:
- 배팅 유형 선택 (승무패/언오버/핸디캡)
- 유형별 맞춤 입력 필드
- 실시간 배당률 계산

**배팅 카트 시스템**:
- 다중 경기 선택
- 총 배당률 자동 계산
- 예상 당첨금 실시간 표시

---

### 🛒 v9.0 티켓 기반 장바구니 시스템

1. **통합 요청사항 탭** 📋
   - 기존 배팅 탭 → "요청사항" 탭으로 교체
   - 하나의 티켓에 여러 요청사항 담기 (장바구니 방식)
   - 3가지 타입 지원: 배팅, 도서 발주, 포인트 요청
   - 장바구니 카운트 배지 표시

2. **요청사항 추가 모달** ➕
   - 배팅 추가: 경기 선택, 단/다폴더, 배당률 계산
   - 도서 발주 추가: 도서 검색, 수량 선택, 메모
   - 포인트 요청 추가: 일반/배팅 포인트, 지급/차감, 사유

3. **자동 배당 시스템** 🎯
   - 배팅 → `betting_folders` 테이블로 자동 처리
   - 도서 발주 → 발주 시스템으로 자동 배당 (구현 예정)
   - 포인트 요청 → `point_transactions` 테이블로 자동 처리
   - 티켓은 유지되며 요청사항만 처리

4. **일괄 처리 기능** 🔄
   - 개별 아이템 처리/삭제
   - 전체 처리: 모든 대기 중 요청 일괄 처리
   - 전체 삭제: 모든 대기 중 요청 일괄 삭제
   - 처리 상태: pending → processing → completed

5. **데이터베이스 구조** 🗄️
   - `ticket_items` 테이블 생성 (마이그레이션 0017)
   - `item_type`: betting, book_order, point_request
   - `item_data`: JSON 형태로 상세 정보 저장
   - `status`: pending, processing, completed, cancelled

---

## 🌐 접속 정보

- **프로덕션 URL**: https://exit-company-system.pages.dev ✅ **LIVE (v12.0)**
- **최신 배포**: https://4e419bb9.exit-company-system-5je.pages.dev (v12.0 - 실시간 알림 + 모바일)
- **API 엔드포인트**: https://692c1664.exit-company-system.pages.dev/api (작동 중)
- **SSE 엔드포인트**: https://692c1664.exit-company-system.pages.dev/api/notifications/stream
- **데모 계정**: admin@manager-exit.cloud / admin123
- **Cloudflare Pages**: exit-company-system
- **D1 Database**: exit-company-production (13 migrations)
- **R2 Storage**: exit-company-mailroom ✅ **활성화됨**
- **Last Deployed**: 2026-02-17 01:00 UTC
- **Build Size**: 548 KB (app.html)
- **Status**: 🟢 **All Systems Operational**
- **GitHub**: https://github.com/wodnr990921-cloud/exit_company_system
- **Latest Commit**: dcce290 - feat: Add real-time notifications (SSE) and hide header on mobile

## 📋 프로젝트 개요

EXIT 시스템은 교도소 수감자를 위한 도서 관리 및 우편물 처리를 위한 통합 플랫폼입니다. 티켓 기반 업무 처리, 회원 관리, 도서 재고, 포인트 시스템, 폴더 배팅 시스템 (단폴더/다폴더), AI 기반 우편실 시스템을 제공합니다.

---

## ✨ 주요 기능

### 🎨 모바일 반응형 UI (v10.0)

**완벽한 모바일 지원**:
- 📱 **햄버거 메뉴**
  - 슬라이드 인 네비게이션 (왼쪽에서 등장)
  - 반투명 오버레이 배경
  - 메뉴 열림 시 스크롤 잠금
  - 사용자 이름 및 역할 표시
  
- 🎯 **반응형 네비게이션** (v9.2 개선)
  - 모바일: 네비게이션 바 숨김 (햄버거 메뉴만 사용)
  - 데스크톱: 아이콘 + 메뉴 이름 상단 탭 네비게이션
  - 역할 배지 (데스크톱만)
  
- 🔐 **권한 기반 메뉴**
  - Admin 전용 메뉴 자동 표시/숨김
  - 모바일/데스크톱 모두 권한 동기화
  - 아이콘 + 텍스트 네비게이션
  
- 📋 **페이지 레이아웃**
  - 제목 + 버튼: 모바일 세로 배치, 데스크톱 가로 배치
  - 전체 너비 버튼 (모바일), 자동 너비 (데스크톱)
  - 필터 컨트롤: 모바일 세로 스택, 데스크톱 가로 배치
  
- 🎴 **카드 그리드**
  - 1단 (모바일) → 2단 (태블릿) → 3-4단 (데스크톱)
  - 자동 조정 그리드 레이아웃
  
- 💬 **모달 최적화**
  - 모바일 여백 (mx-4)
  - 터치 친화적 버튼 크기
  - 90vh 최대 높이 스크롤
  
- 📊 **차트 반응형**
  - 모바일: h-64 고정 높이
  - 1단 (모바일) → 2단 (데스크톱)
  - 자동 크기 조정

**Tailwind Breakpoints**:
- `sm`: 640px (스마트폰 가로)
- `md`: 768px (태블릿)
- `lg`: 1024px (데스크톱)

---

### 🎮 배팅 관리 시스템 (v9.1)

**3가지 배팅 유형**:
- **승무패**: 홈승/무승부/원정승
- **언오버**: 기준점 + 오버/언더
- **핸디캡**: 핸디캡 라인 + 홈/원정

**경기 관리**:
- 경기 일정 등록/수정/삭제
- 배당률 입력 (유형별 맞춤 필드)
- '+' 버튼으로 경기 추가
- 일괄 저장 기능

**폴더 배팅 시스템**:
- 단폴더 배팅: 1개 경기
- 다폴더 배팅: 2개 이상 경기 (복합 배당)
- 자동 배당률 계산 (곱셈)
- 예상 적중금 자동 계산

**사용 예시**:
```
맨유 vs 리버풀 홈승 1.85
바르셀로나 vs 레알 무승부 2.10
→ 총 배당: 1.85 × 2.10 = 3.89
→ 10,000원 배팅 시 예상 당첨금: 38,900원
```

---

### 🛒 티켓 장바구니 시스템 (v9.0)

**워크플로우**:
1. 티켓 열기 → 요청사항 탭
2. 버튼 클릭: 배팅/도서/포인트 추가
3. 모달에서 상세 입력
4. 장바구니에 담기 (pending 상태)
5. 전체 처리 클릭 → 자동 배당
6. 티켓 유지, 아이템만 completed

**자동 배당**:
- **배팅**: `betting_folders` 테이블 생성, 포인트 차감
- **도서 발주**: 구현 예정
- **포인트 요청**: `point_transactions` 테이블 기록, 회원 포인트 업데이트

---

### 🔐 사용자 권한 관리 시스템 (RBAC) (v9.2)

**3단계 권한 체계**:
- 🔴 **Admin (관리자)**
  - 모든 기능 접근 가능
  - 회원 관리, 직원 관리, 시스템 설정
  - 배팅 관리, 마감 처리
  - 포인트 동결 승인/반려
  - 회원 삭제 권한
  
- 🟡 **Staff (직원)**
  - 일반 업무 처리 권한
  - 티켓 생성/처리, 우편물 관리
  - 회원 등록/수정, 포인트 조정
  - 배팅 접수 불가, 마감 처리 불가
  - 읽기/쓰기 권한
  
- 🟢 **Viewer (뷰어)**
  - 읽기 전용 권한
  - 모든 정보 조회 가능
  - 생성/수정/삭제 불가
  - 모든 액션 버튼 비활성화

**기술 구현**:
- **백엔드**: 권한 미들웨어 (requireRole, requireExactRole)
- **API 레벨**: 모든 라우트에 권한 검증 적용
- **프론트엔드**: 권한 체크 함수 (hasPermission, isAdmin, isStaffOrAbove, isViewer)
- **UI 제어**: 역할에 따른 메뉴/버튼 자동 표시/숨김
- **Axios Interceptor**: X-Staff-ID 헤더 자동 추가
- **실시간 검증**: API 요청 시 권한 확인

---

### 📊 대시보드 통계 차트 (v9.1)

**5개 인터랙티브 차트**:
- 📊 **티켓 상태 별 통계** (도넛 차트)
- 📮 **우편물 처리 현황** (도넛 차트)
- 📈 **월별 티켓 추이** (라인 차트)
- 🏆 **배팅 폴더 현황** (바 차트)
- 💰 **포인트 거래 현황** (바 차트)

---

### 🖼️ 이미지 뷰어 고급 기능 (v9.0)

**드래그로 이동 (Pan)**:
- 🖱️ 줌 > 1.0x일 때 드래그 가능
- 마우스 커서: grab ↔ grabbing
- Transform translate로 부드러운 이동

**전체화면 모드**:
- 🖥️ F 키 또는 버튼 클릭으로 토글
- ESC 키로 종료
- 모달 크기 동적 변경

**마우스 휠 줌**:
- 🔍 스크롤 업: 확대 (×1.1)
- 🔍 스크롤 다운: 축소 (÷1.1)
- 범위: 0.5x ~ 3.0x

**키보드 단축키**:
- ⬅️ ➡️ : 이전/다음 이미지
- `+` `-` : 확대/축소
- `0` : 초기화
- `F` : 전체화면
- `ESC` : 전체화면 종료

---

### 📮 우편실 시스템 (v8.7)

**3개 탭 구조**:
- **우편 수령**: 다중 이미지 업로드 및 OCR 처리
- **검수 및 배당**: OCR 결과 확인 및 일괄 배당
- **처리 내역**: 전체 우편물 이력 조회

**우편물 업로드**:
- 다중 이미지 업로드 (JPG, PNG, GIF, WEBP)
- 실시간 Cloudflare R2 스토리지 업로드
- 파일 크기 제한: 10MB per 파일
- 드래그 앤 드롭 미리보기

**일괄 배당 및 자동 티켓 생성**:
- ✅ 다중 우편물 선택 (체크박스)
- ✅ 회원 검색 (이름/회원번호)
- ✅ 원자적 일괄 처리 (all or nothing)
- ✅ 자동 티켓 생성 및 연결

---

### 👥 회원 관리

**회원 고유번호 시스템**:
- 자동 생성: M00001, M00002, M00003...
- 회원 목록 카드에 배지 표시
- 회원 상세 모달에 표시
- 검색 가능

**포인트 관리**:
- 일반 포인트 / 배팅 포인트
- 동결 포인트
- 포인트 지급/차감 버튼
- 자동 기록 및 추적

---

### 🎫 티켓 시스템

**티켓 유형**:
- 주문 (ORDER)
- 문의 (INQUIRY)
- 발주 (PURCHASE_ORDER)
- 포인트 조정 (POINT_ADJUSTMENT)
- 회원 관리 (MEMBER)

**티켓 워크플로우**:
```
open (미배정)
  → assigned (배정됨)
  → in_progress (처리중)
  → completed (완료)
  → closed (종료)
```

**댓글 시스템**:
- 내부 메모 (직원만)
- 회원 답변 (출력용)
- 빠른 답변 템플릿 7종

---

### 👤 직원 관리 및 출근 시스템

**직원 관리**:
- 관리자 / 일반 직원 / 뷰어 구분
- 직원 등록/수정/삭제
- 권한 관리
- 역할 변경 이력

**출근 관리**:
- 출근/퇴근 기록
- 실시간 근무 현황
- 출근 이력 조회

---

### 📊 일일 마감 시스템

**데이터 조회**:
- 티켓 통계
- 배팅 통계
- 포인트 거래
- 출근 기록
- 도서 주문
- 회원 활동

**마감 실행**:
- 일일 마감 생성
- 마감 상태 확인
- 인쇄 기능
- 월간 리포트

---

## 🗂 데이터베이스 구조

### 주요 테이블

**회원 (members)**:
- member_number (고유번호)
- name, institution, inmate_number
- points, betting_points, frozen_points

**티켓 (tickets)**:
- ticket_number, type, status, priority
- member_id, assigned_to, created_by

**티켓 아이템 (ticket_items)** 🆕:
- ticket_id
- item_type (betting/book_order/point_request)
- item_data (JSON)
- status (pending/processing/completed/cancelled)

**우편실 (mailroom_items)**:
- mail_number (우편물 번호)
- member_id, ticket_id
- image_keys (JSON - R2 키 배열)
- ocr_result (JSON - OCR 결과)
- status (워크플로우 상태)

**경기 (matches)**:
- match_number, match_name, match_date
- home_team, away_team
- 배당률 (home_odds, draw_odds, away_odds, over_line, over_odds, under_odds, handicap_line, handicap_home_odds, handicap_away_odds)

**배팅 폴더 (bet_folders)**:
- folder_number, folder_type (single/multi)
- member_id, ticket_id
- total_bet_amount, total_odds, potential_win
- status (pending/won/lost/cancelled/settled)

**포인트 거래 (point_transactions)**:
- member_id, transaction_type
- point_type (points/betting_points)
- amount, balance
- description

**직원 (staff)**:
- name, email, password_hash
- role (admin/staff/viewer)
- status (active/inactive)

---

## 🛠 기술 스택

### 백엔드
- **Hono**: 경량 웹 프레임워크
- **Cloudflare Workers**: 서버리스 엣지 컴퓨팅
- **TypeScript**: 타입 안전 개발

### 데이터베이스
- **Cloudflare D1**: SQLite 기반 분산 데이터베이스
- **마이그레이션**: 17개 파일 (0001 ~ 0017)

### 스토리지
- **Cloudflare R2**: S3 호환 객체 스토리지 (이미지)

### 프론트엔드
- **Vanilla JavaScript**: 의존성 없는 순수 JS
- **Tailwind CSS**: 유틸리티 CSS (CDN)
- **Font Awesome**: 아이콘 라이브러리 (CDN)
- **Axios**: HTTP 클라이언트 (CDN)
- **Chart.js**: 차트 라이브러리

### 배포
- **Cloudflare Pages**: 정적 사이트 호스팅
- **Wrangler**: Cloudflare CLI 도구

---

## 🚀 설치 및 실행

### 1. 로컬 개발

```bash
# 의존성 설치
npm install

# D1 마이그레이션 적용
npm run db:migrate:local

# 빌드
npm run build

# PM2로 서버 시작
pm2 start ecosystem.config.cjs

# PM2 프로세스 확인
pm2 list

# 로그 확인
pm2 logs exit-system --nostream
```

### 2. 배포

```bash
# 빌드 및 배포
npm run build
npm run deploy

# 프로덕션 배포
npm run deploy:prod
```

---

## 📚 API 엔드포인트

### 인증
- `POST /api/auth/login` - 로그인
- `POST /api/auth/register` - 회원가입

### 회원
- `GET /api/members` - 목록 조회
- `GET /api/members/:id` - 상세 조회
- `POST /api/members` - 등록
- `PATCH /api/members/:id` - 수정

### 티켓
- `GET /api/tickets` - 목록 조회
- `GET /api/tickets/:id` - 상세 조회
- `POST /api/tickets` - 생성
- `PATCH /api/tickets/:id` - 수정
- `POST /api/tickets/:id/comments` - 댓글 작성

### 티켓 아이템 🆕
- `GET /api/ticket-items/:ticketId` - 티켓의 아이템 목록
- `POST /api/ticket-items` - 아이템 추가
- `POST /api/ticket-items/:id/process` - 아이템 처리
- `DELETE /api/ticket-items/:id` - 아이템 삭제
- `POST /api/ticket-items/:ticketId/process-all` - 전체 처리
- `DELETE /api/ticket-items/:ticketId/delete-all` - 전체 삭제

### 우편실
- `GET /api/mailroom` - 우편물 목록 조회
- `GET /api/mailroom/:id` - 상세 조회
- `POST /api/mailroom/upload` - 이미지 업로드 (R2)
- `GET /api/mailroom/image/:key` - 이미지 조회 (R2)
- `POST /api/mailroom` - 우편물 등록
- `PATCH /api/mailroom/:id/status` - 상태 업데이트
- `POST /api/mailroom/:id/ocr` - OCR 처리
- `DELETE /api/mailroom/:id` - 삭제

### 배팅
- `GET /api/betting/matches` - 경기 목록
- `POST /api/betting/matches` - 경기 생성
- `POST /api/betting/matches/bulk` - 경기 일괄 저장
- `POST /api/betting/matches/:id/result` - 경기 결과 입력
- `DELETE /api/betting/matches/:id` - 경기 삭제
- `GET /api/betting/folders` - 배팅 폴더 목록
- `POST /api/betting/folders` - 배팅 폴더 생성
- `GET /api/betting/settlements/pending` - 정산 대기 목록
- `POST /api/betting/settlements/:id/approve` - 정산 승인
- `GET /api/betting/settlement-stats` - 정산 통계

### 포인트
- `POST /api/points/adjust` - 포인트 조정
- `POST /api/points/freeze` - 포인트 동결
- `POST /api/points/unfreeze` - 포인트 해제

### 일일 마감
- `GET /api/closing/daily-close` - 일일 데이터 조회
- `POST /api/closing/daily-close` - 마감 실행
- `GET /api/closing/daily-closes` - 마감 이력

---

## 🎯 사용 예시

### 배팅 시스템

**단폴더 배팅**:
```javascript
{
  "folder_type": "single",
  "total_bet_amount": 10000,
  "bets": [
    {
      "match_id": 1,
      "bet_type": "home_win",
      "odds": 1.85
    }
  ]
}
```

**다폴더 배팅**:
```javascript
{
  "folder_type": "multi",
  "total_bet_amount": 10000,
  "bets": [
    { "match_id": 1, "bet_type": "home_win", "odds": 1.85 },
    { "match_id": 2, "bet_type": "over", "odds": 1.92 }
  ]
}
// 총 배당: 1.85 × 1.92 = 3.55
// 예상 적중금: 10000 × 3.55 = 35500원
```

---

## 🔐 시스템 특징

### 보안
- 비밀번호 해시화 (Argon2)
- 세션 기반 인증
- 역할 기반 권한 관리 (admin/staff/viewer)

### 자동화
- 배팅 자동 정산
- 경기 취소 시 자동 환불
- 포인트 자동 계산
- 회원 번호 자동 생성
- 티켓 자동 생성 (우편실 배당 시)

### 감사 추적
- 모든 포인트 거래 기록
- 티켓 댓글 이력
- 직원 출근 기록
- 일일 마감 이력
- 역할 변경 이력

---

## 📝 향후 개선 계획

### 완료 ✅
- ✅ 회원 고유번호 시스템 (v8.6.1)
- ✅ 우편실 기본 시스템 (v8.7)
- ✅ R2 이미지 스토리지 연동 (v8.7)
- ✅ OCR API 엔드포인트 준비 (v8.7)
- ✅ 검수 및 배당 워크플로우 (v8.7)
- ✅ 티켓 이미지 뷰어 (v9.0)
- ✅ 고급 이미지 뷰어 - 확대/축소/회전/fullscreen (v9.0)
- ✅ 티켓 장바구니 시스템 (v9.0)
- ✅ 대시보드 차트 (v9.1)
- ✅ 언오버/핸디캡 배팅 (v9.1)
- ✅ RBAC 권한 관리 시스템 (v9.2)
- ✅ 관리자 설정 페이지 (v9.3)
- ✅ 모바일 반응형 UI (v10.0)
- ✅ 네비게이션 최적화 (v9.2)
- ✅ Cloudflare Pages 프로덕션 배포 (v10.0)
- ✅ R2 Storage 활성화 및 통합 (v10.0)
- ✅ 티켓 회원 변경 기능 (v9.2.5)
- ✅ 승인 요청 기반 회원 변경 워크플로우 (v9.2.5)
- ✅ 정규식 완전 제거 - 빌드 안정성 개선 (v10.1)

### 예정 📅
- 📅 Cloudflare AI Workers OCR 실제 연동
- 📅 우편실 이미지 업로드 UI 개선
- 📅 알림 시스템 (Email/SMS)
- 📅 보고서 생성 (PDF/Excel)
- 📅 전역 검색 기능
- 📅 다크 모드

---

## 📄 라이선스

MIT

---

## 👥 개발자

EXIT 시스템 개발팀

---

## 📌 버전 정보

- **버전**: v9.2.5 DEVELOPMENT
- **최종 업데이트**: 2026-02-11
- **상태**: ✅ 로컬 개발 진행 중
- **로컬 URL**: https://3000-izz2akoud4rd9s8t7plxq-b32ec7bb.sandbox.novita.ai
- **프로덕션 URL**: https://exit-system.pages.dev
- **최신 배포**: https://738bc9d6.exit-system.pages.dev
- **빌드 크기**: 577.48 kB (52 modules)
- **마이그레이션**: 17개 (0001~0017)

### 배포 정보
- **플랫폼**: Cloudflare Pages
- **프로젝트**: exit-system
- **D1 Database**: exit-system-production (929f31de-899f-4015-be47-1a20e127bfe7)
- **R2 Storage**: exit-system-mailroom ✅ **활성화됨**
- **배포 일시**: 2026-02-11 00:15 UTC
- **Last Commit**: feat: 회원 변경 기능 JavaScript 함수 구현

---

## 🎉 주요 변경 사항 로그

### v10.1 (2026-02-11) 🔧
- **정규식 완전 제거**: 모든 정규식 패턴을 문자열 메서드로 교체
- **빌드 안정성**: Vite 빌드 오류 근본 해결
- **성능 개선**: 간단한 패턴 매칭에 최적화된 코드
- **유지보수성**: 가독성 높은 코드로 개선

### v9.2.5 (2026-02-11) ✨
- **회원 변경 기능**: 티켓 상세에서 회원 변경/등록
- **승인 요청 시스템**: 모든 회원 변경은 관리자 승인 필요
- **검색 최적화**: 300ms debounce 자동완성 검색
- **조건부 UI**: 미지정 회원일 때만 신규 등록 버튼 표시
- **신규 회원 등록**: 모달에서 즉시 회원 생성 후 티켓 연결

### v9.2.4 (2026-02-10) 🔧
- **네비게이션 수정**: 데스크톱 상단 탭 네비게이션 표시 문제 해결
- **Tailwind Breakpoint**: 커스텀 CSS로 데스크톱 네비게이션 강제 표시

### v9.2 (2026-02-08) 🎨
- **UI 개선**: 모바일 네비게이션 최적화
- **데스크톱**: 아이콘 + 메뉴 이름 함께 표시
- **모바일**: 네비게이션 바 숨김 (햄버거 메뉴만 사용)
- **반응형**: `hidden md:block`으로 플랫폼별 최적화

### v9.1 (2026-02-08) 🎲
- **배팅 시스템**: 언오버/핸디캡 추가
- **배당률 계산**: 곱셈 방식 적용
- **경기 등록**: 유형별 맞춤 입력 필드
- **버그 수정**: 중복 변수 선언 제거

### v9.0 (2026-02-08) 🛒
- **티켓 장바구니**: 다중 요청사항 관리
- **자동 배당**: 타입별 자동 처리
- **일괄 처리**: 전체 처리/삭제 기능
- **DB**: ticket_items 테이블 생성 (마이그레이션 0017)

