# 하루수능

수능 D-Day와 공부 시간, 하루 계획을 관리하는 수험생용 웹앱입니다.

하단 탭 5개로 구성됩니다. 태블릿·PC에서는 카드가 두 칸으로 나란히 놓이고, 폭 1024px 이상에서는 탭이 왼쪽 세로 메뉴로 바뀝니다.

- **홈**: 수능 D-Day와 1교시 시작까지 카운트다운, 다음 모의고사 D-Day, 남은 주·주말·개월, 오늘 계획(체크·추가)
- **공부 모드**: 과목별 공부 타이머(공부 도중 과목 바꾸기 가능, 바꾸기 전 시간은 원래 과목으로 기록) — 시작하면 하단 탭 없는 **집중 화면**(큰 타이머, 일시정지·계속·종료)으로 들어가고, 앱을 나가면 자동 일시정지. 오늘 공부량과 목표 달성률, 최근 7일 그래프
- **계획**: 월 달력에 기간 계획을 막대로 표시, 날짜를 눌러 그날의 할 일 관리, **반복 할 일**(매일·평일·주말·요일 선택), **날짜별 메모**(메모가 있는 날은 달력 칸 오른쪽 위에 노란 포스트잇 표시), 수능·모의고사 날짜 표시
- **통계**: 주간·월간 총 공부 시간, 하루 평균, 목표 달성 일수, 연속 공부 일수, 할 일 완료율, 날짜별 막대 그래프(목표선), 과목별 비율
- **설정**: 목표 수능 학년도(또는 날짜 직접 입력), 하루 목표 공부 시간, **모의고사 일정**(6월·9월 모의평가 예상 날짜 수정, 시험 추가), **화면 모드**(자동·밝게·어둡게, 기기마다 저장), 로그아웃

이메일로 로그인하고(비밀번호를 잊으면 재설정 메일로 바꿀 수 있습니다), 데이터는 [Supabase](https://supabase.com)에 저장되어 여러 기기에서 이어서 쓸 수 있습니다. 인터넷이 끊겨도 브라우저에 먼저 저장했다가 연결되면 올립니다.

## 앱으로 설치 (홈 화면)

휴대폰·태블릿 홈 화면에 아이콘으로 설치하면 주소창 없이 전체 화면으로 열리고, 인터넷이 없어도 열립니다.

- 안드로이드·PC 크롬: 설정 탭의 **앱으로 설치 → 설치**, 또는 브라우저 메뉴의 ‘앱 설치’
- iPhone·iPad Safari: 공유 버튼 → **홈 화면에 추가**
- iPhone·iPad에서는 설치한 앱과 Safari가 로그인 정보를 따로 보관하므로, 설치한 앱에서 한 번 더 로그인해야 합니다.

`client/public/manifest.webmanifest`(앱 정보·아이콘)와 `client/public/sw.js`(오프라인용 서비스 워커)가 담당합니다.
서비스 워커는 앱 화면 파일만 저장하고, Supabase 데이터 요청은 건드리지 않습니다.

## 실행

Node.js 20.19 이상이 필요합니다.

```bash
npm install      # 처음 한 번
npm run dev      # 개발 서버 http://localhost:5173
npm test         # 단위 테스트
npm run build    # 배포용 빌드 → client/dist/
```

## Supabase 설정 (처음 한 번)

1. Supabase 대시보드 → **SQL Editor**에 [`supabase/schema.sql`](supabase/schema.sql)을 붙여 넣고 **Run**
   (사용자별 데이터 테이블 `user_data`와, 본인 데이터만 읽고 쓰게 하는 보안 규칙(RLS)을 만듭니다)
2. **Authentication → URL Configuration**
   - Site URL: `https://seoyeonwoo11.github.io/aa/`
   - Redirect URLs에 추가: `https://seoyeonwoo11.github.io/aa/`, `http://localhost:5173/`
3. (선택) **Authentication → Sign In / Providers → Email**의 *Confirm email*을 끄면 가입 즉시 로그인됩니다.
   켜 두면 가입 확인 메일의 링크를 눌러야 로그인됩니다.

연결 정보는 `client/src/config.js`에 있습니다. 여기 들어가는 publishable 키는 공개용이라 코드에 있어도 되고,
**service_role / secret 키는 절대 넣지 마세요.**

## 배포

`main`에 머지되면 GitHub Actions(`.github/workflows/deploy.yml`)가 테스트 → 빌드 → GitHub Pages 배포를 자동으로 합니다.
PR에서는 테스트와 빌드만 확인합니다.

- 주소: https://seoyeonwoo11.github.io/aa/
- 처음 한 번: 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정
- 수동 배포: Actions 탭 → *Test and deploy* → *Run workflow*

## 폴더 구조

```
.
├── client/                    # 프론트엔드 (Vite)
│   ├── index.html             # 화면 마크업
│   ├── public/                # 그대로 복사되는 정적 파일 (favicon 등)
│   ├── src/
│   │   ├── main.js            # 진입점: 로그인 상태에 따라 화면 연결
│   │   ├── exam/              # 수능·모의고사 날짜, D-Day 계산 (화면과 무관한 순수 로직)
│   │   ├── study/             # 공부 타이머·기록 계산
│   │   ├── plan/              # 기간 계획·할 일·반복 할 일, 달력 배치 계산
│   │   ├── stats/             # 주간·월간 통계 계산
│   │   ├── settings/          # 설정 기본값
│   │   ├── services/          # 데이터 접근 계층 (Supabase)
│   │   │   ├── supabaseClient.js
│   │   │   ├── authService.js #   가입·로그인·로그아웃 (Supabase Auth)
│   │   │   ├── userDataStore.js # user_data 테이블 + 브라우저 캐시 동기화
│   │   │   ├── settingsService.js / studyService.js / planService.js
│   │   │   └── legacyImport.js  # 예전 브라우저 전용 계정 데이터 가져오기
│   │   ├── storage/           # localStorage 래퍼, 캐시·서버 중 최신 값 고르기
│   │   ├── ui/                # 탭별 화면 (tabs, ddayView, studyView, planView, statsView, settingsView, authView)
│   │   ├── utils/date.js      # 날짜 유틸
│   │   └── styles/            # 화면별 스타일
│   ├── tests/                 # Vitest 단위 테스트
│   └── vite.config.js
├── .github/workflows/       # 자동 테스트·배포
├── supabase/schema.sql        # 데이터베이스 테이블과 보안 규칙
└── package.json               # npm workspaces 루트
```

## 규칙

- **계산 로직은 `exam/`, `study/`, `plan/`, `utils/`에** 두고 DOM에 접근하지 않습니다. 그래야 테스트하기 쉽고 서버에서도 재사용할 수 있습니다.
- **UI는 `services/`를 통해서만 데이터에 접근**합니다. 서비스 함수는 모두 Promise를 반환합니다.
- 새 수능 날짜가 공식 발표되면 `client/src/exam/examDates.js`의 `OFFICIAL_DATES`에, 모의평가 날짜는 `client/src/exam/mockExams.js`의 `OFFICIAL_MOCK_DATES`에 추가합니다.
