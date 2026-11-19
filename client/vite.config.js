import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages는 https://<사용자>.github.io/<저장소>/ 아래에서 열리므로
  // 배포 워크플로가 BASE_PATH=/<저장소>/ 를 넘겨준다. 로컬에서는 '/'.
  base: process.env.BASE_PATH || '/',
  server: {
    port: 5173
    // 서버를 만들면 API 요청을 백엔드로 넘긴다. 예:
    // proxy: { '/api': 'http://localhost:3000' }
  },
  test: {
    environment: 'node'
  }
});
