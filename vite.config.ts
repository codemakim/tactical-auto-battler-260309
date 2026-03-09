import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    minify: 'terser',
  },
  server: {
    host: true, // 모바일 테스트용 네트워크 접근 허용
    port: 5173,
  },
});
