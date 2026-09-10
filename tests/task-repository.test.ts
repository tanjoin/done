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

test('Footer はバージョン情報を控えめに表示する', () => {
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

    const {default: Footer} = require('../src/footer');
    const footer = new Footer();
    footer.connectedCallback();

    assert.match(footer.innerHTML, /v?2026\.09\.11|2026\.09\.11/);
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

test('複数の表示カレンダーを保存して取得できる', async () => {
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

  try {
    Object.defineProperty(globalThis, 'window', {
      value: {
        setTimeout: () => 0,
        clearTimeout: () => undefined,
        location: {origin: 'http://localhost', href: 'http://localhost/'},
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, 'document', {
      value: {
        createElement: () => ({addEventListener: () => undefined}),
        head: {appendChild: () => undefined},
        getElementById: () => null,
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorage(),
      configurable: true,
    });
    Object.defineProperty(globalThis, 'fetch', {
      value: async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes('calendar1')) {
          return {
            ok: true,
            json: async () => ({items: [{id: 'event-1', summary: 'A'}]}),
          } as Response;
        }
        if (url.includes('calendar2')) {
          return {
            ok: true,
            json: async () => ({items: [{id: 'event-2', summary: 'B'}]}),
          } as Response;
        }
        throw new Error(`unexpected url: ${url}`);
      },
      configurable: true,
    });

    const {default: LocalStorageManager} = require('../src/local-storage-manager');
    const {
      saveCalendarSettings,
      loadCalendarSettings,
      fetchTodoTasksFromGoogleCalendar,
    } = require('../src/google-calendar-service');

    const future = Date.now() + 60_000;
    LocalStorageManager.googleClientIdEncrypted = 'xxx';
    localStorage.setItem('done_google_access_token_v1', 'token');
    localStorage.setItem('done_google_access_token_expiry_v1', String(future));

    await saveCalendarSettings({
      clientId: 'client-id',
      todoCalendarIds: ['calendar1', 'calendar2'],
      doneCalendarId: 'done-calendar',
    });

    const settings = await loadCalendarSettings();
    assert.deepEqual(settings.todoCalendarIds, ['calendar1', 'calendar2']);
    const tasks = await fetchTodoTasksFromGoogleCalendar();
    assert.equal(tasks.length, 2);
    assert.deepEqual(
      tasks.map((task: {text: string}) => task.text).sort(),
      ['A', 'B'],
    );
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
    if (originalFetchDescriptor) {
      Object.defineProperty(globalThis, 'fetch', originalFetchDescriptor);
    } else {
      Reflect.deleteProperty(globalThis as Record<string, unknown>, 'fetch');
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
  }
});

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
