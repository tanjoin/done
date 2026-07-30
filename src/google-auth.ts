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
            callback: (response: {
              access_token?: string;
              error?: string;
              expires_in?: number;
            }) => void;
          }) => {
            requestAccessToken: (options?: {prompt?: string}) => void;
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

type TokenClient = {
  requestAccessToken: (options?: {prompt?: string}) => void;
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

function hydrateTokenFromStorage(): void {
  const savedToken = localStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY) || '';
  const savedExpiry = Number(
    localStorage.getItem(GOOGLE_ACCESS_TOKEN_EXPIRY_KEY) || 0,
  );

  if (!savedToken || !Number.isFinite(savedExpiry) || savedExpiry <= Date.now()) {
    localStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
    localStorage.removeItem(GOOGLE_ACCESS_TOKEN_EXPIRY_KEY);
    accessToken = '';
    tokenExpiry = 0;
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

export async function getGoogleAccessToken(
  scopes: string[],
  forcePrompt = false,
): Promise<string> {
  await ensureGoogleSdkLoaded();
  if (!forcePrompt && hasValidGoogleToken()) {
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
    let tokenClient: TokenClient;
    tokenClient = oauth.initTokenClient({
      client_id: clientId,
      scope: scopes.join(' '),
      callback: response => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error || 'アクセストークン取得に失敗しました。'));
          return;
        }
        setGoogleToken(response.access_token, response.expires_in || 3000);
        resolve(response.access_token);
      },
    });

    tokenClient.requestAccessToken({
      prompt: forcePrompt ? 'consent' : '',
    });
  });
}
