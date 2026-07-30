"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const done_task_1 = __importDefault(require("../src/done-task"));
function withMockedNow(nowIso, run) {
    const RealDate = Date;
    class MockDate extends RealDate {
        constructor(...args) {
            if (args.length === 0) {
                super(nowIso);
                return;
            }
            super(...args);
        }
        static now() {
            return new RealDate(nowIso).getTime();
        }
    }
    // global Date をテスト実行中のみ差し替える。
    globalThis.Date =
        MockDate;
    try {
        run();
    }
    finally {
        globalThis.Date = RealDate;
    }
}
function createDailyTask(startTime, endTime) {
    const task = {
        id: 'task-1',
        text: '朝食',
        group: '健康・ルーティン',
        startTime,
        endTime,
        history: {},
    };
    return new done_task_1.default(task);
}
(0, node_test_1.default)('当日の終了時刻を過ぎたタスクは未実施になる', () => {
    withMockedNow('2026-07-28T12:00:00+09:00', () => {
        const task = createDailyTask('07:00', '11:00');
        strict_1.default.equal(task.statusInfo.label, '未実施');
    });
});
(0, node_test_1.default)('当日の開始前は未実施ではなく時間外のまま', () => {
    withMockedNow('2026-07-28T06:30:00+09:00', () => {
        const task = createDailyTask('07:00', '11:00');
        strict_1.default.equal(task.statusInfo.label, '時間外');
    });
});
(0, node_test_1.default)('実施可能時間内は実施可能になる', () => {
    withMockedNow('2026-07-28T09:00:00+09:00', () => {
        const task = createDailyTask('07:00', '11:00');
        strict_1.default.equal(task.statusInfo.label, '実施可能');
    });
});
(0, node_test_1.default)('日跨ぎタスクの開始前帯は未実施にならない', () => {
    withMockedNow('2026-07-28T03:00:00+09:00', () => {
        const task = createDailyTask('22:00', '02:00');
        strict_1.default.notEqual(task.statusInfo.label, '未実施');
    });
});
(0, node_test_1.default)('終了後は対象日外フラグより未実施が優先される', () => {
    withMockedNow('2026-07-28T12:00:00+09:00', () => {
        const task = createDailyTask('07:00', '11:00');
        const info = task.getTaskStatusInfo(undefined, task.timeCheck(), false);
        strict_1.default.equal(info.label, '未実施');
    });
});
(0, node_test_1.default)('過去日付の一時タスクは未実施ではなく対象日外になる', () => {
    withMockedNow('2026-07-28T12:00:00+09:00', () => {
        const task = new done_task_1.default({
            id: 'temp-1',
            text: '一時タスク',
            group: '公式戦',
            startTime: '08:00',
            endTime: '08:59',
            specificDate: '2026-06-19',
            history: {},
        });
        strict_1.default.equal(task.statusInfo.label, '対象日外');
    });
});
(0, node_test_1.default)('当日開始前の日付指定タスクは表示対象にならない', () => {
    withMockedNow('2026-07-28T12:00:00+09:00', () => {
        const task = new done_task_1.default({
            id: 'temp-2',
            text: 'ナイター',
            group: '野球',
            startTime: '18:30',
            endTime: '23:59',
            specificDate: '2026-07-28',
            history: {},
        });
        strict_1.default.equal(task.shouldShowTask(), false);
    });
});
(0, node_test_1.default)('当日開始後の日付指定タスクは表示対象になる', () => {
    withMockedNow('2026-07-28T18:31:00+09:00', () => {
        const task = new done_task_1.default({
            id: 'temp-3',
            text: 'ナイター',
            group: '野球',
            startTime: '18:30',
            endTime: '23:59',
            specificDate: '2026-07-28',
            history: {},
        });
        strict_1.default.equal(task.shouldShowTask(), true);
    });
});
(0, node_test_1.default)('日跨ぎタスクは前日履歴があると3時まで非表示になる', () => {
    withMockedNow('2026-07-31T02:30:00+09:00', () => {
        const task = new done_task_1.default({
            id: 'overnight-1',
            text: 'ログイン',
            group: 'ゲーム',
            startTime: '03:00',
            endTime: '02:59',
            history: {
                '2026-07-30': 'completed',
            },
        });
        strict_1.default.equal(task.shouldShowTask(), false);
    });
});
(0, node_test_1.default)('日跨ぎタスクは3時を過ぎると表示対象に戻る', () => {
    withMockedNow('2026-07-31T03:00:00+09:00', () => {
        const task = new done_task_1.default({
            id: 'overnight-2',
            text: 'ログイン',
            group: 'ゲーム',
            startTime: '03:00',
            endTime: '02:59',
            history: {
                '2026-07-30': 'completed',
            },
        });
        strict_1.default.equal(task.shouldShowTask(), true);
    });
});
(0, node_test_1.default)('日跨ぎタスクは前日履歴で非表示中でもステータスは時間外になる', () => {
    withMockedNow('2026-07-31T02:30:00+09:00', () => {
        const task = new done_task_1.default({
            id: 'overnight-3',
            text: 'ログイン',
            group: 'ゲーム',
            startTime: '03:00',
            endTime: '02:59',
            history: {
                '2026-07-30': 'completed',
            },
        });
        strict_1.default.equal(task.shouldShowTask(), false);
        strict_1.default.equal(task.statusInfo.label, '時間外');
    });
});
(0, node_test_1.default)('日跨ぎタスクの翌日帯は前日が対象日でないと表示されない', () => {
    withMockedNow('2026-07-31T01:00:00+09:00', () => {
        const task = new done_task_1.default({
            id: 'overnight-4',
            text: '週次ログイン',
            group: 'ゲーム',
            daysOfWeek: [3],
            startTime: '03:00',
            endTime: '02:59',
            history: {},
        });
        strict_1.default.equal(task.shouldShowTask(), false);
        strict_1.default.equal(task.statusInfo.label, '対象日外');
    });
});
(0, node_test_1.default)('リマインド時間帯の判定は開始前の限定時間だけ true になる', () => {
    const task = new done_task_1.default({
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
        strict_1.default.equal(task.isReminderWindowActive(), false);
    });
    withMockedNow('2026-07-29T01:56:00+09:00', () => {
        strict_1.default.equal(task.isReminderWindowActive(), true);
    });
    withMockedNow('2026-07-29T02:01:00+09:00', () => {
        strict_1.default.equal(task.isReminderWindowActive(), false);
    });
});
