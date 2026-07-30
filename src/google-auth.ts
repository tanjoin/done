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
            error_callback?: (error: {type?: string}) => void;
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

const GOOGLE_AUTH_STATE_KEY = 'done_google_auth_state_v1';

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

function decodeUrlFragmentValue(value: string | null): string {
  if (!value) {
    return '';
  }
  try {
    return decodeURIComponent(value.replace(/\+/g, '%20'));
  } catch {
    return value;
  }
}

function consumeRedirectTokenFromHash(): void {
  const hash = window.location.hash || '';
  if (!hash || !hash.includes('access_token=')) {
    return;
  }

  const fragment = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const state = decodeUrlFragmentValue(fragment.get('state'));
  const expectedState = localStorage.getItem(GOOGLE_AUTH_STATE_KEY) || '';
  if (expectedState && state && expectedState !== state) {
    return;
  }

  const token = decodeUrlFragmentValue(fragment.get('access_token'));
  const expiresIn = Number(fragment.get('expires_in') || 3000);
  if (token) {
    setGoogleToken(token, Number.isFinite(expiresIn) ? expiresIn : 3000);
  }

  localStorage.removeItem(GOOGLE_AUTH_STATE_KEY);

  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState({}, document.title, cleanUrl);
}

function isStandaloneMode(): boolean {
  const mediaStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches;
  const navigatorStandalone =
    'standalone' in navigator &&
    Boolean((navigator as Navigator & {standalone?: boolean}).standalone);
  return Boolean(mediaStandalone || navigatorStandalone);
}

function isLikelyIPhone(): boolean {
  return /iPhone/i.test(navigator.userAgent || '');
}

function shouldUseRedirectAuth(): boolean {
  return isStandaloneMode() && isLikelyIPhone();
}

function buildRedirectAuthUrl(clientId: string, scopes: string[], forcePrompt: boolean): string {
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  const state =
    Math.random().toString(36).slice(2) + Date.now().toString(36).slice(-6);
  localStorage.setItem(GOOGLE_AUTH_STATE_KEY, state);

  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', window.location.origin + window.location.pathname);
  authUrl.searchParams.set('response_type', 'token');
  authUrl.searchParams.set('scope', scopes.join(' '));
  authUrl.searchParams.set('include_granted_scopes', 'true');
  authUrl.searchParams.set('state', state);
  if (forcePrompt) {
    authUrl.searchParams.set('prompt', 'consent');
  }

  return authUrl.toString();
}

function startRedirectGoogleAuth(
  clientId: string,
  scopes: string[],
  forcePrompt: boolean,
): void {
  window.location.assign(buildRedirectAuthUrl(clientId, scopes, forcePrompt));
}

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
consumeRedirectTokenFromHash();

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

  if (shouldUseRedirectAuth()) {
    startRedirectGoogleAuth(clientId, scopes, forcePrompt);
    return new Promise(() => {
      // Redirect navigation will replace this page session.
    });
  }

  return new Promise((resolve, reject) => {
    let tokenClient: TokenClient;
    tokenClient = oauth.initTokenClient({
      client_id: clientId,
      scope: scopes.join(' '),
      error_callback: error => {
        const type = error?.type || '';
        if (type === 'popup_failed_to_open' || type === 'popup_closed') {
          if (shouldUseRedirectAuth()) {
            startRedirectGoogleAuth(clientId, scopes, forcePrompt);
            return;
          }
          reject(new Error('Googleログインのポップアップが閉じられました。'));
          return;
        }
        reject(new Error('Googleログインに失敗しました。'));
      },
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
