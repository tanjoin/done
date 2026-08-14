import type {DoneTaskData} from './types';

export type TaskSyncConflict = {
  taskId: string;
  field: string;
  localValue: unknown;
  remoteValue: unknown;
};

export type TaskSyncMergeResult = {
  tasks: DoneTaskData[];
  conflicts: TaskSyncConflict[];
};

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function taskMap(tasks: DoneTaskData[]): Map<string, DoneTaskData> {
  return new Map(tasks.map(task => [task.id, task]));
}

function mergeValue(
  taskId: string,
  field: string,
  baseValue: unknown,
  localValue: unknown,
  remoteValue: unknown,
  conflicts: TaskSyncConflict[],
): unknown {
  if (equal(localValue, remoteValue)) {
    return localValue;
  }
  if (equal(localValue, baseValue)) {
    return remoteValue;
  }
  if (equal(remoteValue, baseValue)) {
    return localValue;
  }
  conflicts.push({taskId, field, localValue, remoteValue});
  return localValue;
}

function mergeTask(
  baseTask: DoneTaskData | undefined,
  localTask: DoneTaskData,
  remoteTask: DoneTaskData,
  conflicts: TaskSyncConflict[],
): DoneTaskData {
  const merged = {} as DoneTaskData;
  const fields = new Set([
    ...Object.keys(baseTask || {}),
    ...Object.keys(localTask),
    ...Object.keys(remoteTask),
  ]);

  fields.forEach(field => {
    if (field === 'history') {
      const baseHistory = baseTask?.history || {};
      const localHistory = localTask.history || {};
      const remoteHistory = remoteTask.history || {};
      const dates = new Set([
        ...Object.keys(baseHistory),
        ...Object.keys(localHistory),
        ...Object.keys(remoteHistory),
      ]);
      const history: DoneTaskData['history'] = {};
      dates.forEach(dateKey => {
        const value = mergeValue(
          localTask.id,
          `history.${dateKey}`,
          baseHistory[dateKey],
          localHistory[dateKey],
          remoteHistory[dateKey],
          conflicts,
        );
        if (value === 'completed' || value === 'cancelled') {
          history[dateKey] = value;
        }
      });
      merged.history = history;
      return;
    }
    (merged as Record<string, unknown>)[field] = mergeValue(
      localTask.id,
      field,
      (baseTask as Record<string, unknown> | undefined)?.[field],
      (localTask as Record<string, unknown>)[field],
      (remoteTask as Record<string, unknown>)[field],
      conflicts,
    );
  });
  return merged;
}

export function mergeTaskSyncData(
  baseTasks: DoneTaskData[],
  localTasks: DoneTaskData[],
  remoteTasks: DoneTaskData[],
): TaskSyncMergeResult {
  const base = taskMap(baseTasks);
  const local = taskMap(localTasks);
  const remote = taskMap(remoteTasks);
  const taskIds = new Set([...base.keys(), ...local.keys(), ...remote.keys()]);
  const conflicts: TaskSyncConflict[] = [];
  const tasks: DoneTaskData[] = [];

  taskIds.forEach(taskId => {
    const baseTask = base.get(taskId);
    const localTask = local.get(taskId);
    const remoteTask = remote.get(taskId);
    if (!localTask) {
      if (!baseTask) {
        tasks.push(remoteTask!);
        return;
      }
      if (equal(remoteTask, baseTask)) return;
      conflicts.push({taskId, field: 'task', localValue: null, remoteValue: remoteTask});
      tasks.push(remoteTask!);
      return;
    }
    if (!remoteTask) {
      if (!baseTask) {
        tasks.push(localTask);
        return;
      }
      if (equal(localTask, baseTask)) return;
      conflicts.push({taskId, field: 'task', localValue: localTask, remoteValue: null});
      tasks.push(localTask);
      return;
    }
    if (!baseTask) {
      if (!equal(localTask, remoteTask)) {
        conflicts.push({taskId, field: 'task', localValue: localTask, remoteValue: remoteTask});
      }
      tasks.push(localTask);
      return;
    }
    tasks.push(mergeTask(baseTask, localTask, remoteTask, conflicts));
  });

  return {tasks, conflicts};
}