import type {DoneTaskData} from './types';

export function isTaskExpired(
  task: Pick<DoneTaskData, 'displayEndDate'>,
  now = new Date(),
): boolean {
  const endDate = task.displayEndDate;
  if (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return false;
  }

  const today = [
    String(now.getFullYear()).padStart(4, '0'),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  return today >= endDate;
}