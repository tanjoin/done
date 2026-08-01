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
  'Google認証の有効期限が切れました。設定画面で再ログインしてください。';
const GOOGLE_RELOGIN_REQUIRED_ERRORS = new Set([
  'interaction_required',
  'login_required',
  'consent_required',
  'immediate_failed',
]);

type TokenClient = {
  requestAccessToken: (options?: {
    prompt?: string;
  }) => void;
};

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

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  expires_in?: number;
};

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

export function isGoogleTokenExpiringSoon(): boolean {
  if (!hasValidGoogleToken()) {
    return false;
  }
  return tokenExpiry - Date.now() <= GOOGLE_TOKEN_REFRESH_BUFFER_MS;
}

export function clearGoogleToken(): void {
  accessToken = '';
  tokenExpiry = 0;
  localStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
  localStorage.removeItem(GOOGLE_ACCESS_TOKEN_EXPIRY_KEY);
}

function setGoogleToken(token: string, expiresInSec = 3000): void {
  accessToken = token;
  tokenExpiry = Date.now() + expiresInSec * 1000;
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

export async function getGoogleAccessToken(
  scopes: string[],
  forcePrompt = false,
  refreshIfExpiringSoon = false,
): Promise<string> {
  await ensureGoogleSdkLoaded();
  if (
    !forcePrompt &&
    hasValidGoogleToken() &&
    !(refreshIfExpiringSoon && isGoogleTokenExpiringSoon())
  ) {
    return accessToken;
  }

  const clientId = (await resolveClientId()).trim();
  if (!clientId) {
    throw new Error('Google OAuth Client ID が未設定です。');
  }

  const oauth = window.google?.accounts?.oauth2;
  if (!oauth?.initTokenClient) {
    throw new Error('Google認証ライブラリの読み込みに失敗しました。');
  }

  return new Promise((resolve, reject) => {
    const tokenClient: TokenClient = oauth.initTokenClient({
      client_id: clientId,
      scope: scopes.join(' '),
      prompt: forcePrompt ? 'consent' : '',
      callback: (response: GoogleTokenResponse) => {
        if (response.error) {
          clearGoogleToken();
          if (GOOGLE_RELOGIN_REQUIRED_ERRORS.has(response.error)) {
            reject(createGoogleReloginRequiredError());
            return;
          }
          reject(new Error(response.error));
          return;
        }
        if (!response.access_token) {
          clearGoogleToken();
          reject(new Error('アクセストークン取得に失敗しました。'));
          return;
        }
        setGoogleToken(
          response.access_token,
          response.expires_in || 3000,
        );
        resolve(response.access_token);
      },
    });

    tokenClient.requestAccessToken({
      prompt: forcePrompt ? 'consent' : '',
    });
  });
}
