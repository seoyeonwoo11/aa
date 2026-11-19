# server (예정)

백엔드를 만들면 이 폴더에 둡니다. 루트 `package.json`의 `workspaces`에 `"server"`를 추가하세요.

## 클라이언트가 기대하는 API

`client/src/services/`의 함수와 1:1로 대응합니다.

| 서비스 함수 | 메서드 · 경로 | 요청 | 응답 |
| --- | --- | --- | --- |
| `signUp(id, password)` | `POST /api/auth/signup` | `{ id, password }` | `{ id }` |
| `logIn(id, password)` | `POST /api/auth/login` | `{ id, password }` | `{ id }` |
| `logOut()` | `POST /api/auth/logout` | – | – |
| `getCurrentUser()` | `GET /api/auth/me` | – | `{ id }` 또는 401 |
| `loadSettings(userId)` | `GET /api/settings` | – | `{ academicYear, customDate, dailyGoalMinutes }` |
| `saveSettings(userId, settings)` | `PUT /api/settings` | `{ academicYear, customDate, dailyGoalMinutes }` | – |
| `loadStudy(userId)` | `GET /api/study` | – | `{ sessions: [{ date, subject, seconds }], running }` |
| `saveStudy(userId, data)` | `PUT /api/study` | `{ sessions, running }` | – |
| `loadPlans(userId)` | `GET /api/plans` | – | `{ 'YYYY-MM-DD': [{ id, text, done }] }` |
| `savePlans(userId, plans)` | `PUT /api/plans` | 위와 같은 형태 | – |

- 세션은 httpOnly 쿠키를 권장합니다.
- 지금은 공부 기록·계획을 통째로 저장(PUT)합니다. 데이터가 커지면 항목 단위 API(`POST /api/study/sessions` 등)로 나누세요.
- 비밀번호는 서버에서 bcrypt/argon2로 해시합니다. (지금 클라이언트의 SHA-256 해시는 로컬 전용입니다.)
- 개발 중에는 `client/vite.config.js`의 `server.proxy`로 `/api` 요청을 백엔드로 넘깁니다.
