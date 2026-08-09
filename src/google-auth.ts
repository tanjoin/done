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

type TokenClient = {
  requestAccessToken: (options?: {
    prompt?: string;
  }) => void;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  expires_in?: number;
};

const GOOGLE_AUTH_STATE_KEY = 'done_google_auth_state_v1';
const GOOGLE_AUTH_RETURN_URL_KEY = 'done_google_auth_return_url_v1';

export function getGoogleAuthRedirectUri(): string {
  return window.location.origin + window.location.pathname;
}

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

    if (forcePrompt) {
      const state = crypto.randomUUID();
      sessionStorage.setItem(GOOGLE_AUTH_STATE_KEY, state);
      const returnUrl = new URL(window.location.href);
      returnUrl.hash = '';
      sessionStorage.setItem(GOOGLE_AUTH_RETURN_URL_KEY, returnUrl.toString());

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', getGoogleAuthRedirectUri());
      authUrl.searchParams.set('response_type', 'token');
      authUrl.searchParams.set('scope', scopes.join(' '));
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', state);

      window.location.assign(authUrl.toString());
      return new Promise<string>(() => {});
    }

    await ensureGoogleSdkLoaded();
    const oauth = window.google?.accounts?.oauth2;
    if (!oauth?.initTokenClient) {
      throw new Error('Google認証ライブラリの読み込みに失敗しました。');
    }

    return new Promise<string>((resolve, reject) => {
      const tokenClient: TokenClient = oauth.initTokenClient({
        client_id: clientId,
        scope: scopes.join(' '),
        prompt: 'none',
        callback: (response: GoogleTokenResponse) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          if (!response.access_token) {
            reject(new Error('アクセストークン取得に失敗しました。'));
            return;
          }

          setGoogleToken(response.access_token, response.expires_in || 3600);
          resolve(response.access_token);
        },
      });

      tokenClient.requestAccessToken({prompt: 'none'});
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

export function handleGoogleAuthRedirect(): boolean {
  if (!window.location.hash) {
    return false;
  }

  const params = new URLSearchParams(window.location.hash.substring(1));
  const accessTokenParam = params.get('access_token');
  const errorParam = params.get('error');
  const expiresInParam = params.get('expires_in');
  const stateParam = params.get('state');

  if (accessTokenParam || errorParam) {
    const expectedState = sessionStorage.getItem(GOOGLE_AUTH_STATE_KEY);
    sessionStorage.removeItem(GOOGLE_AUTH_STATE_KEY);
    history.replaceState(null, '', window.location.pathname + window.location.search);
    if (!expectedState || stateParam !== expectedState) {
      sessionStorage.removeItem(GOOGLE_AUTH_RETURN_URL_KEY);
      return false;
    }

    if (errorParam || !accessTokenParam) {
      sessionStorage.removeItem(GOOGLE_AUTH_RETURN_URL_KEY);
      clearGoogleToken();
      googleReloginRequired = true;
      return true;
    }

    setGoogleToken(
      accessTokenParam,
      expiresInParam ? Number(expiresInParam) : 3600,
    );
    const returnUrl = sessionStorage.getItem(GOOGLE_AUTH_RETURN_URL_KEY);
    sessionStorage.removeItem(GOOGLE_AUTH_RETURN_URL_KEY);
    if (returnUrl) {
      try {
        const destination = new URL(returnUrl);
        if (destination.origin === window.location.origin) {
          window.location.replace(destination.toString());
        }
      } catch {
        // 不正な復帰先は無視し、OAuthコールバックページを表示する。
      }
    }
    return true;
  }

  return false;
}