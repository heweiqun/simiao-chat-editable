import { readFile } from 'node:fs/promises';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
export default defineConfig({
  plugins: [
    react(),
    viteSingleFile(),
    {
      name: 'offline-html-download',
      configureServer(server) {
        server.middlewares.use('/__offline-download', async (_req, res) => {
          try {
            const html = await readFile(
              new URL('./dist/index.html', import.meta.url),
            );
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            res.end(html);
          } catch {
            res.statusCode = 404;
            res.end('请先执行 npm run build 生成离线版');
          }
        });
      },
    },
  ],
  base: './',
  publicDir: false,
});
