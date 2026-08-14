import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeTaskSyncData} from '../src/task-sync-merge';
import type {DoneTaskData} from '../src/types';

function task(overrides: Partial<DoneTaskData> = {}): DoneTaskData {
  return {
    id: 'task-1',
    text: '読書',
    history: {},
    ...overrides,
  };
}

test('異なるフィールドの変更は自動マージする', () => {
  const base = [task({group: '趣味'})];
  const local = [
    task({group: '趣味', history: {'2026-08-15': 'completed'}}),
  ];
  const remote = [task({group: '学習'})];

  const result = mergeTaskSyncData(base, local, remote);

  assert.equal(result.conflicts.length, 0);
  assert.deepEqual(result.tasks, [
    task({group: '学習', history: {'2026-08-15': 'completed'}}),
  ]);
});

test('同じ履歴日付への異なる変更だけを競合にする', () => {
  const base = [task()];
  const local = [task({history: {'2026-08-15': 'completed'}})];
  const remote = [task({history: {'2026-08-15': 'cancelled'}})];

  const result = mergeTaskSyncData(base, local, remote);

  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0]?.field, 'history.2026-08-15');
  assert.deepEqual(result.tasks[0]?.history, {'2026-08-15': 'completed'});
});

test('別々に追加したタスクはどちらも残す', () => {
  const result = mergeTaskSyncData(
    [],
    [task({id: 'local-task', text: 'ローカル追加'})],
    [task({id: 'remote-task', text: 'Drive追加'})],
  );

  assert.equal(result.conflicts.length, 0);
  assert.deepEqual(
    result.tasks.map(item => item.id).sort(),
    ['local-task', 'remote-task'],
  );
});
