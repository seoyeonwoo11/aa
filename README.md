# 하루수능

수능 D-Day와 공부 시간, 하루 계획을 관리하는 수험생용 웹앱입니다.

하단 탭 4개로 구성됩니다.

- **홈**: 수능 D-Day, 1교시 시작까지 카운트다운, 오늘 계획(기간 계획·할 일 체크와 추가), 남은 주·주말·개월, 지난 수능 이후 진행률
- **공부 모드**: 과목별 공부 타이머(일시정지·이어하기, 앱을 나가면 자동 일시정지), 오늘 공부량과 목표 달성률, 최근 7일 그래프. 타이머가 도는 동안 화면이 꺼지지 않음(지원 브라우저)
- **계획**: 월 달력에 기간 계획(시작~종료)을 막대로 표시, 날짜 칸을 눌러 그날의 기간 계획과 할 일 관리, 수능 날짜 표시
- **설정**: 목표 수능 학년도(기본: 다음 수능, 시험 당일엔 내년 수능) 또는 날짜 직접 입력, 하루 목표 공부 시간, 로그아웃

아이디·비밀번호로 로그인하며, 데이터는 사용자별로 저장됩니다. (지금은 브라우저 localStorage, 나중에 서버로 교체 예정)

## 실행

Node.js 20.19 이상이 필요합니다.

```bash
npm install      # 처음 한 번
npm run dev      # 개발 서버 http://localhost:5173
npm test         # 단위 테스트
npm run build    # 배포용 빌드 → client/dist/
```

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
│   │   ├── exam/              # 수능 날짜·D-Day 계산 (화면과 무관한 순수 로직)
│   │   ├── study/             # 공부 타이머·기록 계산
│   │   ├── plan/              # 기간 계획·할 일, 달력 배치 계산
│   │   ├── settings/          # 설정 기본값
│   │   ├── services/          # 데이터 접근 계층 ← 서버가 생기면 여기만 바꾼다
│   │   │   ├── authService.js #   회원가입·로그인·로그아웃·현재 사용자
│   │   │   ├── settingsService.js
│   │   │   ├── studyService.js
│   │   │   └── planService.js
│   │   ├── storage/           # localStorage 래퍼
│   │   ├── ui/                # 탭별 화면 (tabs, ddayView, studyView, planView, settingsView, authView)
│   │   ├── utils/date.js      # 날짜 유틸
│   │   └── styles/            # 화면별 스타일
│   ├── tests/                 # Vitest 단위 테스트
│   └── vite.config.js
├── .github/workflows/       # 자동 테스트·배포
├── server/                    # 백엔드 (예정) — server/README.md 참고
└── package.json               # npm workspaces 루트
```

## 규칙

- **계산 로직은 `exam/`, `study/`, `plan/`, `utils/`에** 두고 DOM에 접근하지 않습니다. 그래야 테스트하기 쉽고 서버에서도 재사용할 수 있습니다.
- **UI는 `services/`를 통해서만 데이터에 접근**합니다. 서비스 함수는 모두 Promise를 반환하므로, 서버 API로 바꿔도 UI 코드는 그대로입니다.
- 새 수능 날짜가 공식 발표되면 `client/src/exam/examDates.js`의 `OFFICIAL_DATES`에 추가합니다.
