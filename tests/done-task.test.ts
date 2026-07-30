import test from 'node:test';
import assert from 'node:assert/strict';
import DoneTask from '../src/done-task';
import type {DoneTaskData} from '../src/types';

function withMockedNow(nowIso: string, run: () => void): void {
  const RealDate = Date;

  class MockDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) {
        super(nowIso);
        return;
      }
      super(...(args as [string | number | Date]));
    }

    static now(): number {
      return new RealDate(nowIso).getTime();
    }
  }

  // global Date をテスト実行中のみ差し替える。
  (globalThis as {Date: DateConstructor}).Date =
    MockDate as unknown as DateConstructor;
  try {
    run();
  } finally {
    (globalThis as {Date: DateConstructor}).Date = RealDate;
  }
}

function createDailyTask(startTime: string, endTime: string): DoneTask {
  const task: DoneTaskData = {
    id: 'task-1',
    text: '朝食',
    group: '健康・ルーティン',
    startTime,
    endTime,
    history: {},
  };
  return new DoneTask(task);
}

test('当日の終了時刻を過ぎたタスクは未実施になる', () => {
  withMockedNow('2026-07-28T12:00:00+09:00', () => {
    const task = createDailyTask('07:00', '11:00');
    assert.equal(task.statusInfo.label, '未実施');
  });
});

test('当日の開始前は未実施ではなく時間外のまま', () => {
  withMockedNow('2026-07-28T06:30:00+09:00', () => {
    const task = createDailyTask('07:00', '11:00');
    assert.equal(task.statusInfo.label, '時間外');
  });
});

test('実施可能時間内は実施可能になる', () => {
  withMockedNow('2026-07-28T09:00:00+09:00', () => {
    const task = createDailyTask('07:00', '11:00');
    assert.equal(task.statusInfo.label, '実施可能');
  });
});

test('日跨ぎタスクの開始前帯は未実施にならない', () => {
  withMockedNow('2026-07-28T03:00:00+09:00', () => {
    const task = createDailyTask('22:00', '02:00');
    assert.notEqual(task.statusInfo.label, '未実施');
  });
});

test('終了後は対象日外フラグより未実施が優先される', () => {
  withMockedNow('2026-07-28T12:00:00+09:00', () => {
    const task = createDailyTask('07:00', '11:00');
    const info = task.getTaskStatusInfo(undefined, task.timeCheck(), false);
    assert.equal(info.label, '未実施');
  });
});

test('過去日付の一時タスクは未実施ではなく対象日外になる', () => {
  withMockedNow('2026-07-28T12:00:00+09:00', () => {
    const task = new DoneTask({
      id: 'temp-1',
      text: '一時タスク',
      group: '公式戦',
      startTime: '08:00',
      endTime: '08:59',
      specificDate: '2026-06-19',
      history: {},
    });
    assert.equal(task.statusInfo.label, '対象日外');
  });
});

test('当日開始前の日付指定タスクは表示対象にならない', () => {
  withMockedNow('2026-07-28T12:00:00+09:00', () => {
    const task = new DoneTask({
      id: 'temp-2',
      text: 'ナイター',
      group: '野球',
      startTime: '18:30',
      endTime: '23:59',
      specificDate: '2026-07-28',
      history: {},
    });
    assert.equal(task.shouldShowTask(), false);
  });
});

test('当日開始後の日付指定タスクは表示対象になる', () => {
  withMockedNow('2026-07-28T18:31:00+09:00', () => {
    const task = new DoneTask({
      id: 'temp-3',
      text: 'ナイター',
      group: '野球',
      startTime: '18:30',
      endTime: '23:59',
      specificDate: '2026-07-28',
      history: {},
    });
    assert.equal(task.shouldShowTask(), true);
  });
});

test('日跨ぎタスクは前日履歴があると3時まで非表示になる', () => {
  withMockedNow('2026-07-31T02:30:00+09:00', () => {
    const task = new DoneTask({
      id: 'overnight-1',
      text: 'ログイン',
      group: 'ゲーム',
      startTime: '03:00',
      endTime: '02:59',
      history: {
        '2026-07-30': 'completed',
      },
    });

    assert.equal(task.shouldShowTask(), false);
  });
});

test('日跨ぎタスクは3時を過ぎると表示対象に戻る', () => {
  withMockedNow('2026-07-31T03:00:00+09:00', () => {
    const task = new DoneTask({
      id: 'overnight-2',
      text: 'ログイン',
      group: 'ゲーム',
      startTime: '03:00',
      endTime: '02:59',
      history: {
        '2026-07-30': 'completed',
      },
    });

    assert.equal(task.shouldShowTask(), true);
  });
});

test('リマインド時間帯の判定は開始前の限定時間だけ true になる', () => {
  const task = new DoneTask({
    id: 'task-reminder',
    text: '深夜ラジオ',
    group: '声優',
    specificDate: '2026-07-29',
    startTime: '02:00',
    endTime: '02:30',
    remindMinutesBefore: 5,
    history: {},
  });

  withMockedNow('2026-07-29T01:30:00+09:00', () => {
    assert.equal(task.isReminderWindowActive(), false);
  });

  withMockedNow('2026-07-29T01:56:00+09:00', () => {
    assert.equal(task.isReminderWindowActive(), true);
  });

  withMockedNow('2026-07-29T02:01:00+09:00', () => {
    assert.equal(task.isReminderWindowActive(), false);
  });
});
