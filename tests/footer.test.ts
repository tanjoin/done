import test from 'node:test';
import assert from 'node:assert/strict';

test('Footer はコミットハッシュを最下部に表示する', () => {
  const originalCustomElementsDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'customElements',
  );

  try {
    Object.defineProperty(globalThis, 'HTMLElement', {
      value: class HTMLElement {
        innerHTML = '';
        connectedCallback(): void {
          return;
        }
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, 'customElements', {
      value: {
        get: () => undefined,
        define: () => undefined,
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, '__APP_GIT_COMMIT_SHA__', {
      value: 'abcdef1',
      configurable: true,
    });

    const {default: Footer} = require('../src/footer');
    const footer = new Footer();
    footer.connectedCallback();

    assert.doesNotMatch(footer.innerHTML, /v\d+\.\d+\.\d+/);
    assert.match(footer.innerHTML, /commit\s+abcdef1/i);
  } finally {
    if (originalCustomElementsDescriptor) {
      Object.defineProperty(
        globalThis,
        'customElements',
        originalCustomElementsDescriptor,
      );
    } else {
      Reflect.deleteProperty(globalThis as Record<string, unknown>, 'customElements');
    }
  }
});
