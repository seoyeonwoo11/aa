import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173
    // 서버를 만들면 API 요청을 백엔드로 넘긴다. 예:
    // proxy: { '/api': 'http://localhost:3000' }
  },
  test: {
    environment: 'node'
  }
});
