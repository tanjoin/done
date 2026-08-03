"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeTasksFromGoogleDrive = mergeTasksFromGoogleDrive;
function mergeTasksFromGoogleDrive(localTasks, driveTasks) {
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
