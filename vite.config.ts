import {defineConfig} from 'vite';
import {resolve} from 'path';

export default defineConfig({
  base: '/done/',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'docs',
    rollupOptions: {
      input: {
        // バニラ環境で複数のHTML（複数ページ）を管理する場合は、ここにファイルを並べます
        main: resolve(__dirname, 'index.html'),
        settings: resolve(__dirname, 'settings.html'),
        jsonOrganizer: resolve(__dirname, 'json-organizer.html'),
      },
    },
  },
});
