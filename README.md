# 수능 D-Day 계산기

다가오는 수능까지 남은 날과 1교시 시작까지의 실시간 카운트다운을 보여주는 웹앱입니다.

- 다가오는 수능부터 10년 뒤 학년도까지 선택, 모의고사 등 날짜 직접 입력
- 남은 주 / 주말 / 개월 수, 지난 수능 이후 진행률
- 아이디·비밀번호 로그인, 사용자별 설정 저장 (지금은 브라우저 localStorage, 나중에 서버로 교체 예정)

## 실행

Node.js 20.19 이상이 필요합니다.

```bash
npm install      # 처음 한 번
npm run dev      # 개발 서버 http://localhost:5173
npm test         # 단위 테스트
npm run build    # 배포용 빌드 → client/dist/
```

## 폴더 구조

```
.
├── client/                    # 프론트엔드 (Vite)
│   ├── index.html             # 화면 마크업
│   ├── public/                # 그대로 복사되는 정적 파일 (favicon 등)
│   ├── src/
│   │   ├── main.js            # 진입점: 로그인 상태에 따라 화면 연결
│   │   ├── exam/              # 수능 날짜·D-Day 계산 (화면과 무관한 순수 로직)
│   │   │   ├── examDates.js   #   공식 날짜 표, 예상 날짜, 선택 가능한 학년도
│   │   │   └── dday.js        #   D-Day, 남은 기간, 카운트다운 계산
│   │   ├── services/          # 데이터 접근 계층 ← 서버가 생기면 여기만 바꾼다
│   │   │   ├── authService.js #   회원가입·로그인·로그아웃·현재 사용자
│   │   │   └── settingsService.js # 사용자별 설정 저장
│   │   ├── storage/           # localStorage 래퍼
│   │   ├── ui/                # 화면별 렌더링과 이벤트
│   │   │   ├── authView.js
│   │   │   ├── ddayView.js
│   │   │   └── dom.js
│   │   ├── utils/date.js      # 날짜 유틸
│   │   └── styles/            # base / auth / dday 스타일
│   ├── tests/                 # Vitest 단위 테스트
│   └── vite.config.js
├── server/                    # 백엔드 (예정) — server/README.md 참고
└── package.json               # npm workspaces 루트
```

## 규칙

- **계산 로직은 `exam/`, `utils/`에** 두고 DOM에 접근하지 않습니다. 그래야 테스트하기 쉽고 서버에서도 재사용할 수 있습니다.
- **UI는 `services/`를 통해서만 데이터에 접근**합니다. 서비스 함수는 모두 Promise를 반환하므로, 서버 API로 바꿔도 UI 코드는 그대로입니다.
- 새 수능 날짜가 공식 발표되면 `client/src/exam/examDates.js`의 `OFFICIAL_DATES`에 추가합니다.
