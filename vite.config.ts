import {defineConfig} from 'vite';
import {resolve} from 'path';
import {execSync} from 'child_process';

const gitCommitSha = (() => {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: __dirname,
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'dev';
  }
})();

export default defineConfig({
  base: '/done/',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  define: {
    __APP_GIT_COMMIT_SHA__: JSON.stringify(gitCommitSha),
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
