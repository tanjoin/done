import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeTasksFromGoogleDrive} from '../src/task-merge';
import type {DoneTaskData} from '../src/types';

function createTask(
  id: string,
  text: string,
  history: DoneTaskData['history'] = {},
): DoneTaskData {
  return {id, text, history};
}

void test('Drive再ログイン時はローカルとDriveのタスクおよび履歴をマージする', () => {
  const merged = mergeTasksFromGoogleDrive(
    [
      createTask('shared', 'ローカルで編集したタスク', {
        '2026-08-03': 'completed',
        '2026-08-04': 'cancelled',
      }),
      createTask('local-only', '非同期期間に追加したタスク'),
    ],
    [
      createTask('shared', 'Drive上の古いタスク', {
        '2026-08-02': 'completed',
        '2026-08-04': 'completed',
      }),
      createTask('drive-only', '別端末で追加したタスク'),
    ],
  );

  assert.deepEqual(merged, [
    createTask('shared', 'ローカルで編集したタスク', {
      '2026-08-02': 'completed',
      '2026-08-03': 'completed',
      '2026-08-04': 'cancelled',
    }),
    createTask('local-only', '非同期期間に追加したタスク'),
    createTask('drive-only', '別端末で追加したタスク'),
  ]);
});