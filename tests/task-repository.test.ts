import test from 'node:test';
import assert from 'node:assert/strict';
import type {DoneOverdueTask, DoneTaskData} from '../src/types';

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

void test('表示モード未保存時は一覧、カード選択時はカードを維持する', () => {
  const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage',
  );

  try {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorage(),
      configurable: true,
    });
    const {
      default: LocalStorageManager,
    } = require('../src/local-storage-manager');

    assert.equal(LocalStorageManager.taskViewMode, 'table');
    LocalStorageManager.taskViewMode = 'card';
    assert.equal(LocalStorageManager.taskViewMode, 'card');
  } finally {
    if (originalLocalStorageDescriptor) {
      Object.defineProperty(
        globalThis,
        'localStorage',
        originalLocalStorageDescriptor,
      );
    } else {
      Reflect.deleteProperty(
        globalThis as Record<string, unknown>,
        'localStorage',
      );
    }
  }
});

void test('Drive本文取得後の空versionでも同期基準を保持する', () => {
  const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage',
  );

  try {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorage(),
      configurable: true,
    });
    const {
      default: LocalStorageManager,
    } = require('../src/local-storage-manager');
    const state = {
      baseRevision: 'remote-revision',
      baseDriveVersion: '',
      fileId: 'drive-file-id',
      dirty: true,
      baseTasks: [],
    };

    LocalStorageManager.taskSyncState = state;

    assert.deepEqual(LocalStorageManager.taskSyncState, state);
    assert.equal(LocalStorageManager.taskSyncDirty, true);
  } finally {
    if (originalLocalStorageDescriptor) {
      Object.defineProperty(
        globalThis,
        'localStorage',
        originalLocalStorageDescriptor,
      );
    } else {
      Reflect.deleteProperty(
        globalThis as Record<string, unknown>,
        'localStorage',
      );
    }
  }
});

void test('操作中に完了したタスクを進行中のDrive読込で巻き戻さない', async () => {
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
  const originalSessionStorageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'sessionStorage',
  );
  const originalCustomEventDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'CustomEvent',
  );

  try {
    Object.defineProperty(globalThis, 'window', {
      value: {setTimeout: () => 0, clearTimeout: () => undefined},
      configurable: true,
    });
    Object.defineProperty(globalThis, 'document', {
      value: {dispatchEvent: () => undefined},
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorage(),
      configurable: true,
    });
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: createLocalStorage(),
      configurable: true,
    });
    Object.defineProperty(globalThis, 'CustomEvent', {
      value: class {
        constructor(
          public type: string,
          public init: {detail?: unknown} = {},
        ) {}
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, 'fetch', {
      value: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          schemaVersion: 2,
          revision: 'remote-revision',
          updatedAt: '2026-09-26T00:00:00.000Z',
          tasks: [{id: 'task-1', text: 'タスク', history: {}}],
        }),
      }),
      configurable: true,
    });

    const {
      default: LocalStorageManager,
    } = require('../src/local-storage-manager');
    const {default: TaskRepository} = require('../src/task-repository');
    const localTask = {id: 'task-1', text: 'タスク', history: {}};
    LocalStorageManager.tasks = [localTask];
    LocalStorageManager.taskSyncState = {
      baseRevision: 'remote-revision',
      baseDriveVersion: '1',
      fileId: 'drive-file-id',
      dirty: false,
      baseTasks: [localTask],
    };
    localStorage.setItem('done_google_access_token_v1', 'token');
    localStorage.setItem(
      'done_google_access_token_expiry_v1',
      String(Date.now() + 60_000),
    );

    const repository = new TaskRepository();
    repository.hydrateFromLocal();
    const refresh = repository.refreshFromCloudIfNeeded(true, 'drive');
    repository.tasks[0]!.history['2026-09-26'] = 'completed';
    repository.recordTaskMutation();

    assert.equal(await refresh, false);
    assert.equal(repository.tasks[0]!.history['2026-09-26'], 'completed');
  } finally {
    for (const [name, descriptor] of [
      ['window', originalWindowDescriptor],
      ['document', originalDocumentDescriptor],
      ['fetch', originalFetchDescriptor],
      ['localStorage', originalLocalStorageDescriptor],
      ['sessionStorage', originalSessionStorageDescriptor],
      ['CustomEvent', originalCustomEventDescriptor],
    ] as const) {
      if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor);
      } else {
        Reflect.deleteProperty(globalThis as Record<string, unknown>, name);
      }
    }
  }
});

void test('Calendar と Drive の並行更新は到着順に関係なく両方残す', async () => {
  const originalLocalStorage = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage',
  );
  const originalSessionStorage = Object.getOwnPropertyDescriptor(
    globalThis,
    'sessionStorage',
  );
  const originalDocument = Object.getOwnPropertyDescriptor(
    globalThis,
    'document',
  );
  const originalCustomEvent = Object.getOwnPropertyDescriptor(
    globalThis,
    'CustomEvent',
  );

  try {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorage(),
      configurable: true,
    });
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: createLocalStorage(),
      configurable: true,
    });
    Object.defineProperty(globalThis, 'document', {
      value: {dispatchEvent: () => undefined},
      configurable: true,
    });
    Object.defineProperty(globalThis, 'CustomEvent', {
      value: class {
        constructor(
          public type: string,
          public init: {detail?: unknown} = {},
        ) {}
      },
      configurable: true,
    });
    const {
      default: LocalStorageManager,
    } = require('../src/local-storage-manager');
    const {default: TaskRepository} = require('../src/task-repository');
    localStorage.setItem('done_google_access_token_v1', 'test-token');
    localStorage.setItem(
      'done_google_access_token_expiry_v1',
      String(Date.now() + 60_000),
    );

    const localTask: DoneTaskData = {
      id: 'local-one',
      text: 'Local',
      history: {},
    };
    const driveTask: DoneTaskData = {
      id: 'drive-one',
      text: 'Drive',
      history: {},
    };
    const calendarTask: DoneTaskData = {
      id: 'todo-one',
      text: 'Calendar',
      history: {},
      sourceType: 'google-todo',
    };
    const fetched = {
      mergedTasks: [] as DoneTaskData[],
      todoCount: 1,
      todoFetchFailed: false,
      todoFetchAuthExpired: false,
      driveLoadFailed: false,
      driveLoadAuthExpired: false,
      driveUpdatedAt: '',
      driveRevision: '',
      driveVersion: '',
      driveFileId: '',
    };

    for (const order of [
      ['calendar', 'drive'],
      ['drive', 'calendar'],
      ['drive', 'all'],
    ] as const) {
      LocalStorageManager.tasks = [localTask];
      LocalStorageManager.taskSyncState = null;
      const repository = new TaskRepository();
      repository.hydrateFromLocal();
      const pending = new Map<string, (value: typeof fetched) => void>();
      Reflect.set(
        repository,
        'fetchCloudMergedTasks',
        (_tasks: DoneTaskData[], target: string) =>
          new Promise<typeof fetched>(resolve => pending.set(target, resolve)),
      );
      const calendarTarget = order[1] === 'all' ? 'all' : 'calendar';
      const calendarRefresh = repository.refreshFromCloudIfNeeded(
        true,
        calendarTarget,
      );
      const driveRefresh = repository.refreshFromCloudIfNeeded(true, 'drive');

      for (const target of order) {
        pending.get(target)!({
          ...fetched,
          mergedTasks:
            target === 'drive' ? [driveTask] : [localTask, calendarTask],
        });
        await (target === 'drive' ? driveRefresh : calendarRefresh);
      }
      assert.deepEqual(
        repository.tasks.map((task: DoneTaskData) => task.id),
        [driveTask.id, calendarTask.id],
      );
    }
  } finally {
    for (const [name, descriptor] of [
      ['localStorage', originalLocalStorage],
      ['sessionStorage', originalSessionStorage],
      ['document', originalDocument],
      ['CustomEvent', originalCustomEvent],
    ] as const) {
      if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor);
      } else {
        Reflect.deleteProperty(globalThis as Record<string, unknown>, name);
      }
    }
  }
});

test('表示カレンダー2のピーコック色タスクをスルー設定できる', async () => {
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
            json: async () => ({
              items: [{id: 'event-1', summary: 'A', colorId: '1'}],
            }),
          } as Response;
        }
        if (url.includes('calendar2')) {
          return {
            ok: true,
            json: async () => ({
              items: [{id: 'event-2', summary: 'B', colorId: '7'}],
            }),
          } as Response;
        }
        throw new Error(`unexpected url: ${url}`);
      },
      configurable: true,
    });

    const {
      default: LocalStorageManager,
    } = require('../src/local-storage-manager');
    const {
      saveCalendarSettings,
      fetchTodoTasksFromGoogleCalendar,
    } = require('../src/google-calendar-service');

    const future = Date.now() + 60_000;
    LocalStorageManager.googleClientIdEncrypted = 'xxx';
    localStorage.setItem('done_google_access_token_v1', 'token');
    localStorage.setItem('done_google_access_token_expiry_v1', String(future));
    localStorage.setItem('skip_second_calendar_peacock', 'true');

    await saveCalendarSettings({
      clientId: 'client-id',
      todoCalendarIds: ['calendar1', 'calendar2'],
      doneCalendarId: 'done-calendar',
    });

    const tasks = await fetchTodoTasksFromGoogleCalendar();
    assert.deepEqual(
      tasks.map((task: {text: string}) => task.text),
      ['A'],
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
      Reflect.deleteProperty(
        globalThis as Record<string, unknown>,
        'localStorage',
      );
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

    const {
      default: LocalStorageManager,
    } = require('../src/local-storage-manager');
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
    assert.deepEqual(tasks.map((task: {text: string}) => task.text).sort(), [
      'A',
      'B',
    ]);
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
      Reflect.deleteProperty(
        globalThis as Record<string, unknown>,
        'localStorage',
      );
    }
  }
});

test('終了済みの表示カレンダー2長期タスクは未完了一覧に1件だけ表示する', () => {
  const {default: DoneTask} = require('../src/done-task');
  const {default: TaskRepository} = require('../src/task-repository');
  const task = new DoneTask({
    id: 'second-calendar-long-term-1',
    text: '長期予定',
    specificDate: '2025-10-25',
    endDate: '2026-01-31',
    sourceType: 'google-todo',
    isSecondCalendarTodo: true,
    treatAsLongTermTask: true,
    history: {},
  });

  const overdueTasks = new TaskRepository().collectOverdueTasks(task);

  assert.equal(overdueTasks.length, 1);
  assert.equal(overdueTasks[0]?.dateKey, '2026-01-31');
});

test('過去履歴がある表示カレンダー2長期タスクも未完了なら表示する', () => {
  const {default: DoneTask} = require('../src/done-task');
  const {default: TaskRepository} = require('../src/task-repository');
  const task = new DoneTask({
    id: 'second-calendar-long-term-2',
    text: '長期予定',
    specificDate: '2025-10-25',
    endDate: '2026-01-31',
    sourceType: 'google-todo',
    isSecondCalendarTodo: true,
    treatAsLongTermTask: true,
    history: {'2025-12-01': 'completed'},
  });

  const overdueTasks = new TaskRepository().collectOverdueTasks(task);

  assert.equal(overdueTasks.length, 1);
});

test('表示カレンダー2の単発予定は未完了一覧に表示する', () => {
  const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage',
  );

  try {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorage(),
      configurable: true,
    });
    localStorage.setItem('overdue_reference_date', '2025-01-01');

    const {default: DoneTask} = require('../src/done-task');
    const {default: TaskRepository} = require('../src/task-repository');
    const task = new DoneTask({
      id: 'second-calendar-single-event-1',
      text: '単発予定',
      specificDate: '2025-10-25',
      sourceType: 'google-todo',
      isSecondCalendarTodo: true,
      treatAsLongTermTask: true,
      history: {},
    });

    const overdueTasks = new TaskRepository().collectOverdueTasks(task);

    assert.deepEqual(
      overdueTasks.map((overdueTask: {dateKey: string}) => overdueTask.dateKey),
      ['2025-10-25'],
    );
  } finally {
    if (originalLocalStorageDescriptor) {
      Object.defineProperty(
        globalThis,
        'localStorage',
        originalLocalStorageDescriptor,
      );
    } else {
      Reflect.deleteProperty(
        globalThis as Record<string, unknown>,
        'localStorage',
      );
    }
  }
});

test('overdueTasks もソートされる', () => {
  const originalWindowDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'window',
  );
  const originalDocumentDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'document',
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
        addEventListener: () => undefined,
      },
      configurable: true,
    });

    const {default: SortManager} = require('../src/sort-manager');
    const sortManager = new SortManager();
    sortManager.updateSortState('task');

    const overdueTasks = [
      {
        task: {
          text: 'zzz',
          group: 'A',
          history: {},
          startTime: '',
          endTime: '',
        },
        dateKey: '2026-09-11',
      },
      {
        task: {
          text: 'aaa',
          group: 'A',
          history: {},
          startTime: '',
          endTime: '',
        },
        dateKey: '2026-09-10',
      },
    ];

    sortManager.sortOverdueTasks(overdueTasks as DoneOverdueTask[]);
    assert.deepEqual(
      overdueTasks.map(({task}) => task.text),
      ['aaa', 'zzz'],
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

    const {
      default: LocalStorageManager,
    } = require('../src/local-storage-manager');
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
      Reflect.deleteProperty(
        globalThis as Record<string, unknown>,
        'localStorage',
      );
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
      Reflect.deleteProperty(
        globalThis as Record<string, unknown>,
        'CustomEvent',
      );
    }
  }
});
