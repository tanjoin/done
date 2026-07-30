import type DoneTask from './done-task';
import type {DoneTaskData, DoneTaskSourceType} from './types';
import LocalStorageManager from './local-storage-manager';
import {decryptText, encryptText} from './google-crypto';
import {getGoogleAccessToken} from './google-auth';
import DateHelper from './date-helper';

export type GoogleCalendarSummary = {
  id: string;
  summary: string;
};

type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  htmlLink?: string;
  colorId?: string;
};

const GOOGLE_CALENDAR_SCOPE = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

function calendarApiUrl(path: string): string {
  return `https://www.googleapis.com/calendar/v3${path}`;
}

async function fetchCalendarApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = await getGoogleAccessToken(GOOGLE_CALENDAR_SCOPE);
  const response = await fetch(calendarApiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Calendar API error (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}

async function resolveCalendarId(encryptedValue: string): Promise<string> {
  if (!encryptedValue) {
    return '';
  }
  return decryptText(encryptedValue);
}

export async function listGoogleCalendars(): Promise<GoogleCalendarSummary[]> {
  const payload = await fetchCalendarApi<{
    items?: Array<{id?: string; summary?: string}>;
  }>('/users/me/calendarList');

  return (payload.items || [])
    .filter(item => Boolean(item.id))
    .map(item => ({
      id: item.id || '',
      summary: item.summary || item.id || 'Unnamed Calendar',
    }));
}

function toTaskDataFromEvent(
  event: GoogleCalendarEvent,
  sourceType: DoneTaskSourceType,
  calendarId: string,
): DoneTaskData {
  const isDone = sourceType === 'google-done';
  return {
    id: `google-${calendarId}-${event.id}`,
    text: event.summary || '(タイトルなし)',
    description: event.description || '',
    link: event.htmlLink || '',
    group: 'カレンダー',
    history: {},
    skipCalendarOnComplete: true,
    strictMode: false,
    createTaskViaUrl: false,
    sourceType,
    externalCalendarId: calendarId,
    externalEventId: event.id,
  };
}

export async function fetchTodoTasksFromGoogleCalendar(): Promise<DoneTaskData[]> {
  const calendarId = await resolveCalendarId(
    LocalStorageManager.googleTodoCalendarIdEncrypted,
  );
  if (!calendarId) {
    return [];
  }

  const tomorrow = new Date(DateHelper.tomorrowDate);
  tomorrow.setHours(23, 59, 59, 999);
  const timeMax = encodeURIComponent(tomorrow.toISOString());

  try {
    const payload = await fetchCalendarApi<{items?: GoogleCalendarEvent[]}>(
      `/calendars/${encodeURIComponent(calendarId)}/events?singleEvents=true&orderBy=startTime&timeMax=${timeMax}&maxResults=2500`,
    );

    return (payload.items || [])
      .filter(event => Boolean(event.id))
      .map(event => toTaskDataFromEvent(event, 'google-todo', calendarId));
  } catch {
    return [];
  }
}

export async function addEventToDoneCalendarFromTask(task: DoneTask): Promise<void> {
  const calendarId = await resolveCalendarId(
    LocalStorageManager.googleDoneCalendarIdEncrypted,
  );
  if (!calendarId) {
    return;
  }

  const descriptionLines: string[] = [];
  if (task.description) {
    descriptionLines.push(task.description);
  }
  if (task.link) {
    descriptionLines.push(task.link);
  }
  descriptionLines.push('追加元: Done アプリ');

  const now = new Date();
  const start = now.toISOString();
  const end = new Date(now.getTime() + 60 * 1000).toISOString();

  await fetchCalendarApi(
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      body: JSON.stringify({
        summary: task.text,
        description: descriptionLines.join('\n'),
        start: {dateTime: start},
        end: {dateTime: end},
        colorId: '10',
      }),
    },
  );
}

export async function updateTodoEventColor(
  task: DoneTask,
  colorId: string,
): Promise<void> {
  if (!task.externalCalendarId || !task.externalEventId) {
    return;
  }

  await fetchCalendarApi(
    `/calendars/${encodeURIComponent(task.externalCalendarId)}/events/${encodeURIComponent(task.externalEventId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        colorId,
      }),
    },
  );
}

export async function saveCalendarSettings(options: {
  clientId: string;
  todoCalendarId: string;
  doneCalendarId: string;
}): Promise<void> {
  const clientId = options.clientId.trim();
  const todoCalendarId = options.todoCalendarId.trim();
  const doneCalendarId = options.doneCalendarId.trim();

  LocalStorageManager.googleClientIdEncrypted = clientId
    ? await encryptText(clientId)
    : '';
  LocalStorageManager.googleTodoCalendarIdEncrypted = todoCalendarId
    ? await encryptText(todoCalendarId)
    : '';
  LocalStorageManager.googleDoneCalendarIdEncrypted = doneCalendarId
    ? await encryptText(doneCalendarId)
    : '';
  LocalStorageManager.calendarTargetId = doneCalendarId;
}

export async function isGoogleOAuthClientConfigured(): Promise<boolean> {
  const settings = await loadCalendarSettings();
  return settings.clientId.trim().length > 0;
}

export async function loadCalendarSettings(): Promise<{
  clientId: string;
  todoCalendarId: string;
  doneCalendarId: string;
}> {
  const [clientId, todoCalendarId, doneCalendarIdEncrypted] =
    await Promise.all([
      resolveCalendarId(LocalStorageManager.googleClientIdEncrypted),
      resolveCalendarId(LocalStorageManager.googleTodoCalendarIdEncrypted),
      resolveCalendarId(LocalStorageManager.googleDoneCalendarIdEncrypted),
    ]);
  const doneCalendarId =
    doneCalendarIdEncrypted.trim() || LocalStorageManager.calendarTargetId;

  return {
    clientId,
    todoCalendarId,
    doneCalendarId,
  };
}
