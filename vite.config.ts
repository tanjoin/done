import {defineConfig} from 'vite';
import {resolve} from 'path';
import {execSync} from 'child_process';
import {fileURLToPath} from 'url';

const configDirectory = fileURLToPath(new URL('.', import.meta.url));

const gitCommitSha = (() => {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: configDirectory,
      encoding: 'utf8',
    }).trim();
  } catch (error) {
    console.warn('Failed to get git commit SHA:', error);
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
    'globalThis.__APP_GIT_COMMIT_SHA__': JSON.stringify(gitCommitSha),
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
