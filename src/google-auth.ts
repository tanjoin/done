import LocalStorageManager from './local-storage-manager';
import {decryptText} from './google-crypto';

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            prompt?: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              expires_in?: number;
            }) => void;
          }) => {
            requestAccessToken: (options?: {
              prompt?: string;
            }) => void;
          };
        };
      };
    };
  }
}

const GSI_SCRIPT_ID = 'done-google-gsi-script';
const GAPI_SCRIPT_ID = 'done-google-gapi-script';
const GOOGLE_ACCESS_TOKEN_KEY = 'done_google_access_token_v1';
const GOOGLE_ACCESS_TOKEN_EXPIRY_KEY = 'done_google_access_token_expiry_v1';
const LEGACY_GOOGLE_REFRESH_TOKEN_KEY = 'done_google_refresh_token_v1';
const GOOGLE_TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const GOOGLE_RELOGIN_REQUIRED_CODE = 'GOOGLE_RELOGIN_REQUIRED';
const GOOGLE_RELOGIN_REQUIRED_MESSAGE =
  'Google認証の有効期限が切れました。Google に再ログインしてください。';
const GOOGLE_RELOGIN_REQUIRED_ERRORS = new Set([
  'interaction_required',
  'login_required',
  'consent_required',
  'immediate_failed',
]);

export const GOOGLE_APP_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.file',
];

function ensureScript(id: string, src: string): Promise<void> {
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  if (existing) {
    if (existing.dataset.loaded === 'true') {
      return Promise.resolve();
    }
    return new Promise(resolve => {
      existing.addEventListener('load', () => resolve(), {once: true});
      existing.addEventListener('error', () => resolve(), {once: true});
    });
  }

  return new Promise(resolve => {
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true';
        resolve();
      },
      {once: true},
    );
    script.addEventListener('error', () => resolve(), {once: true});
    document.head.appendChild(script);
  });
}

export async function ensureGoogleSdkLoaded(): Promise<void> {
  await Promise.all([
    ensureScript(GSI_SCRIPT_ID, 'https://accounts.google.com/gsi/client'),
    ensureScript(GAPI_SCRIPT_ID, 'https://apis.google.com/js/api.js'),
  ]);
}

async function resolveClientId(): Promise<string> {
  const encrypted = LocalStorageManager.googleClientIdEncrypted;
  if (!encrypted) {
    return '';
  }
  return decryptText(encrypted);
}

let accessToken = '';
let tokenExpiry = 0;
let googleReloginRequired = false;
let tokenRequestInFlight: Promise<string> | null = null;

function hydrateTokenFromStorage(): void {
  const savedToken = localStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY) || '';
  const savedExpiry = Number(
    localStorage.getItem(GOOGLE_ACCESS_TOKEN_EXPIRY_KEY) || 0,
  );
  localStorage.removeItem(LEGACY_GOOGLE_REFRESH_TOKEN_KEY);

  if (
    !savedToken ||
    !Number.isFinite(savedExpiry) ||
    savedExpiry <= Date.now()
  ) {
    googleReloginRequired = Boolean(savedToken);
    accessToken = '';
    tokenExpiry = 0;
    localStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
    localStorage.removeItem(GOOGLE_ACCESS_TOKEN_EXPIRY_KEY);
    return;
  }

  accessToken = savedToken;
  tokenExpiry = savedExpiry;
}

hydrateTokenFromStorage();

export function hasValidGoogleToken(): boolean {
  if (!accessToken || tokenExpiry <= Date.now()) {
    hydrateTokenFromStorage();
  }
  return Boolean(accessToken) && Date.now() < tokenExpiry;
}

export function isGoogleReloginRequired(): boolean {
  if (!accessToken || tokenExpiry <= Date.now()) {
    hydrateTokenFromStorage();
  }
  return googleReloginRequired;
}

export function isGoogleTokenExpiringSoon(): boolean {
  if (!hasValidGoogleToken()) {
    return false;
  }
  return tokenExpiry - Date.now() <= GOOGLE_TOKEN_REFRESH_BUFFER_MS;
}

export function clearGoogleToken(): void {
  accessToken = '';
  tokenExpiry = 0;
  googleReloginRequired = false;
  localStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
  localStorage.removeItem(GOOGLE_ACCESS_TOKEN_EXPIRY_KEY);
}

function setGoogleToken(token: string, expiresInSec = 3600): void {
  accessToken = token;
  tokenExpiry = Date.now() + expiresInSec * 1000;
  googleReloginRequired = false;
  localStorage.setItem(GOOGLE_ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(GOOGLE_ACCESS_TOKEN_EXPIRY_KEY, String(tokenExpiry));
}

export function createGoogleReloginRequiredError(): Error {
  const error = new Error(GOOGLE_RELOGIN_REQUIRED_MESSAGE) as Error & {
    code?: string;
  };
  error.code = GOOGLE_RELOGIN_REQUIRED_CODE;
  return error;
}

export function isGoogleReloginRequiredError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const maybeCode = (error as Error & {code?: string}).code;
  return (
    maybeCode === GOOGLE_RELOGIN_REQUIRED_CODE ||
    GOOGLE_RELOGIN_REQUIRED_ERRORS.has(error.message) ||
    error.message === GOOGLE_RELOGIN_REQUIRED_MESSAGE
  );
}

/**
 * 新しいタブでGoogle認証画面を開き、アクセストークンを取得する
 */
export async function getGoogleAccessToken(
  scopes: string[],
  forcePrompt = false,
  refreshIfExpiringSoon = false,
): Promise<string> {
  const hadValidTokenAtStart = hasValidGoogleToken();

  if (
    !forcePrompt &&
    hadValidTokenAtStart &&
    !(refreshIfExpiringSoon && isGoogleTokenExpiringSoon())
  ) {
    return accessToken;
  }

  if (!forcePrompt && googleReloginRequired) {
    throw createGoogleReloginRequiredError();
  }

  if (tokenRequestInFlight) {
    return tokenRequestInFlight;
  }

  const tokenRequest = (async () => {
    const clientId = (await resolveClientId()).trim();
    if (!clientId) {
      throw new Error('Google OAuth Client ID が未設定です。');
    }

    return new Promise<string>((resolve, reject) => {
      // OAuth 認可エンドポイントのURL構築
      const redirectUri = window.location.origin + window.location.pathname;
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'token');
      authUrl.searchParams.set('scope', scopes.join(' '));
      if (forcePrompt) {
        authUrl.searchParams.set('prompt', 'consent');
      }

      // 新しいタブで認証ページを開く（第3引数を指定しないことでタブとして開く）
      const authTab = window.open(authUrl.toString(), '_blank');

      if (!authTab) {
        reject(new Error('新しいタブを開くことがブラウザにブロックされました。'));
        return;
      }

      // 新しいタブからのトークン通知メッセージを監視するイベントリスナー
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return;
        }

        const data = event.data as {
          type?: string;
          access_token?: string;
          error?: string;
          expires_in?: number;
        };

        if (data && data.type === 'GOOGLE_AUTH_RESPONSE') {
          window.removeEventListener('message', handleMessage);
          clearInterval(checkTabClosed);

          if (data.error) {
            clearGoogleToken();
            if (GOOGLE_RELOGIN_REQUIRED_ERRORS.has(data.error)) {
              googleReloginRequired = true;
              reject(createGoogleReloginRequiredError());
              return;
            }
            reject(new Error(data.error));
            return;
          }

          if (!data.access_token) {
            clearGoogleToken();
            reject(new Error('アクセストークン取得に失敗しました。'));
            return;
          }

          setGoogleToken(data.access_token, data.expires_in || 3600);
          resolve(data.access_token);
        }
      };

      window.addEventListener('message', handleMessage);

      // タブが認証途中で閉じられた場合のチェック
      const checkTabClosed = setInterval(() => {
        if (authTab.closed) {
          clearInterval(checkTabClosed);
          window.removeEventListener('message', handleMessage);
          reject(new Error('認証タブが閉じられました。'));
        }
      }, 1000);
    });
  })();

  tokenRequestInFlight = tokenRequest
    .catch(error => {
      if (forcePrompt) {
        throw error;
      }

      if (
        refreshIfExpiringSoon &&
        hadValidTokenAtStart &&
        hasValidGoogleToken()
      ) {
        return accessToken;
      }

      clearGoogleToken();
      googleReloginRequired = true;
      throw createGoogleReloginRequiredError();
    })
    .finally(() => {
      tokenRequestInFlight = null;
    });

  return tokenRequestInFlight;
}

/**
 * リダイレクト受け取り用スクリプト（アプリ起動時や初期化時に呼び出す）
 * 新しく開かれたタブ側でURLハッシュのトークンを解析し、親ウィンドウへ送信してタブを閉じます。
 */
export function handleGoogleAuthRedirect(): boolean {
  if (!window.location.hash) {
    return false;
  }

  const params = new URLSearchParams(window.location.hash.substring(1));
  const accessTokenParam = params.get('access_token');
  const errorParam = params.get('error');
  const expiresInParam = params.get('expires_in');

  if (accessTokenParam || errorParam) {
    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'GOOGLE_AUTH_RESPONSE',
          access_token: accessTokenParam || undefined,
          error: errorParam || undefined,
          expires_in: expiresInParam ? Number(expiresInParam) : undefined,
        },
        window.location.origin,
      );
      window.close();
      return true;
    }
  }

  return false;
}