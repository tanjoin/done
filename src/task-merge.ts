import type {DoneTaskData} from './types';

export function mergeTasksFromGoogleDrive(
  localTasks: DoneTaskData[],
  driveTasks: DoneTaskData[],
): DoneTaskData[] {
  const driveTasksById = new Map(driveTasks.map(task => [task.id, task]));
  const mergedLocalTasks = localTasks.map(localTask => {
    const driveTask = driveTasksById.get(localTask.id);
    if (!driveTask) {
      return localTask;
    }

    driveTasksById.delete(localTask.id);
    return {
      ...driveTask,
      ...localTask,
      history: {
        ...(driveTask.history || {}),
        ...(localTask.history || {}),
      },
    };
  });

  return [...mergedLocalTasks, ...driveTasksById.values()];
}