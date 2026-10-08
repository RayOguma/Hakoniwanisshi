import { defineConfig } from 'vite';

// base: './' で GitHub Pages などのサブパスにそのまま置ける
// 開発サーバーは 5174 番（save -a ~ が 5173 番を使うので）
export default defineConfig({
  base: './',
  server: { port: 5174, strictPort: true },
});
