const CRYPTO_KEY_STORAGE = 'done_google_crypto_key_v1';

function textEncoder(): TextEncoder {
  return new TextEncoder();
}

function textDecoder(): TextDecoder {
  return new TextDecoder();
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(b => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function importOrCreateKey(): Promise<CryptoKey | null> {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    return null;
  }

  const stored = localStorage.getItem(CRYPTO_KEY_STORAGE);
  if (stored) {
    const raw = base64ToArrayBuffer(stored);
    return cryptoObj.subtle.importKey('raw', raw, 'AES-GCM', true, [
      'encrypt',
      'decrypt',
    ]);
  }

  const key = await cryptoObj.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt'],
  );
  const exported = await cryptoObj.subtle.exportKey('raw', key);
  localStorage.setItem(CRYPTO_KEY_STORAGE, bytesToBase64(new Uint8Array(exported)));
  return key;
}

export async function encryptText(plainText: string): Promise<string> {
  const key = await importOrCreateKey();
  const cryptoObj = globalThis.crypto;
  if (!key || !cryptoObj || !cryptoObj.subtle) {
    return plainText;
  }

  const iv = cryptoObj.getRandomValues(new Uint8Array(12));
  const encrypted = await cryptoObj.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    textEncoder().encode(plainText),
  );

  const payload = {
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted)),
  };
  return JSON.stringify(payload);
}

export async function decryptText(payload: string): Promise<string> {
  const key = await importOrCreateKey();
  const cryptoObj = globalThis.crypto;
  if (!key || !cryptoObj || !cryptoObj.subtle) {
    return payload;
  }

  try {
    const parsed = JSON.parse(payload) as {iv: string; data: string};
    if (!parsed || !parsed.iv || !parsed.data) {
      return payload;
    }

    const decrypted = await cryptoObj.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(base64ToArrayBuffer(parsed.iv)),
      },
      key,
      base64ToArrayBuffer(parsed.data),
    );

    return textDecoder().decode(decrypted);
  } catch {
    return payload;
  }
}
