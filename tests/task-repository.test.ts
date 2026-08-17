import test from 'node:test';
import assert from 'node:assert/strict';

function createLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem(key: string): string | null {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value));
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    clear(): void {
      store.clear();
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null;
    },
    get length(): number {
      return store.size;
    },
  };
}

test('resetToDefault は Drive 同期を OFF にしない', async () => {
  const originalWindowDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'window',
  );
  const originalDocumentDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'document',
  );
  const originalFetchDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'fetch',
  );
  const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage',
  );
  const originalCustomEventDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'CustomEvent',
  );

  try {
    Object.defineProperty(globalThis, 'window', {
      value: {
        setTimeout: () => 0,
        clearTimeout: () => undefined,
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, 'document', {
      value: {
        dispatchEvent: () => undefined,
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorage(),
      configurable: true,
    });
    Object.defineProperty(globalThis, 'CustomEvent', {
      value: class {
        type: string;
        detail: unknown;
        constructor(type: string, init: {detail?: unknown} = {}) {
          this.type = type;
          this.detail = init.detail;
        }
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, 'fetch', {
      value: async () => ({
        ok: true,
        json: async () => [{id: 'reset-task', text: '初期タスク'}],
      }),
      configurable: true,
    });

    const {default: LocalStorageManager} = require('../src/local-storage-manager');
    const {default: TaskRepository} = require('../src/task-repository');

    LocalStorageManager.googleDriveSyncEnabled = true;

    const repository = new TaskRepository();
    await repository.resetToDefault();

    assert.equal(LocalStorageManager.googleDriveSyncEnabled, true);
    assert.equal(repository.tasks[0]?.text, '初期タスク');
  } finally {
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
    } else {
      Reflect.deleteProperty(globalThis as Record<string, unknown>, 'window');
    }
    if (originalDocumentDescriptor) {
      Object.defineProperty(globalThis, 'document', originalDocumentDescriptor);
    } else {
      Reflect.deleteProperty(globalThis as Record<string, unknown>, 'document');
    }
    if (originalLocalStorageDescriptor) {
      Object.defineProperty(
        globalThis,
        'localStorage',
        originalLocalStorageDescriptor,
      );
    } else {
      Reflect.deleteProperty(globalThis as Record<string, unknown>, 'localStorage');
    }
    if (originalFetchDescriptor) {
      Object.defineProperty(globalThis, 'fetch', originalFetchDescriptor);
    } else {
      Reflect.deleteProperty(globalThis as Record<string, unknown>, 'fetch');
    }
    if (originalCustomEventDescriptor) {
      Object.defineProperty(
        globalThis,
        'CustomEvent',
        originalCustomEventDescriptor,
      );
    } else {
      Reflect.deleteProperty(globalThis as Record<string, unknown>, 'CustomEvent');
    }
  }
});
