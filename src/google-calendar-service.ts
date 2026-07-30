import type DoneTask from './done-task';
import type {DoneTaskData, DoneTaskSourceType} from './types';
import LocalStorageManager from './local-storage-manager';
import {decryptText, encryptText} from './google-crypto';
import {
  clearGoogleToken,
  createGoogleReloginRequiredError,
  getGoogleAccessToken,
  isGoogleReloginRequiredError,
} from './google-auth';
import DateHelper from './date-helper';

export type GoogleCalendarSummary = {
  id: string;
  summary: string;
};

type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  colorId?: string;
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
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
  retried = false,
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
    if ((response.status === 401 || response.status === 403) && !retried) {
      clearGoogleToken();
      try {
        return await fetchCalendarApi<T>(path, init, true);
      } catch (error) {
        if (!isGoogleReloginRequiredError(error)) {
          throw error;
        }
        throw createGoogleReloginRequiredError();
      }
    }
    if (response.status === 401 || response.status === 403) {
      clearGoogleToken();
      throw createGoogleReloginRequiredError();
    }
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
  const schedule = resolveEventSchedule(event);
  const time = resolveEventTimeRange(event);
  const history: DoneTaskData['history'] = {};
  const statusFromColor = resolveTodoStatusFromColor(event.colorId);
  if (schedule.specificDate && statusFromColor) {
    history[schedule.specificDate] = statusFromColor;
  }

  return {
    id: `google-${calendarId}-${event.id}`,
    text: event.summary || '(タイトルなし)',
    description: event.description || '',
    location: event.location || '',
    link: event.htmlLink || '',
    group: 'カレンダー',
    history,
    startTime: time.startTime,
    endTime: time.endTime,
    skipCalendarOnComplete: true,
    strictMode: false,
    createTaskViaUrl: false,
    sourceType,
    externalCalendarId: calendarId,
    externalEventId: event.id,
    specificDate: schedule.specificDate,
    endDate: schedule.endDate,
  };
}

function resolveTodoStatusFromColor(
  colorId?: string,
): 'completed' | 'cancelled' | null {
  if (colorId === '8') {
    return 'completed';
  }
  if (colorId === '4' || colorId === '11') {
    return 'cancelled';
  }
  return null;
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseCalendarDateKey(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  return value;
}

function toLocalDateKeyFromDateTime(dateTime: string): string | null {
  const directDate = dateTime.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (directDate && directDate[1]) {
    return directDate[1];
  }

  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return formatDateKey(date);
}

function normalizeTimePart(value: string): string | null {
  if (!/^\d{1,2}:\d{2}$/.test(value)) {
    return null;
  }
  const [rawHour, rawMinute] = value.split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function toLocalTimeFromDateTime(dateTime: string): string | null {
  const directTime = dateTime.match(/^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})/);
  if (directTime && directTime[1]) {
    return normalizeTimePart(directTime[1]);
  }

  const parsed = new Date(dateTime);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
}

function resolveEventTimeRange(event: GoogleCalendarEvent): {
  startTime: string | null;
  endTime: string | null;
} {
  const startTime = event.start?.dateTime
    ? toLocalTimeFromDateTime(event.start.dateTime)
    : null;
  const endTime = event.end?.dateTime
    ? toLocalTimeFromDateTime(event.end.dateTime)
    : null;

  if (!startTime && !endTime) {
    return {
      startTime: null,
      endTime: null,
    };
  }

  return {
    startTime,
    endTime,
  };
}

function previousDateKey(dateKey: string): string {
  const base = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(base.getTime())) {
    return dateKey;
  }
  base.setDate(base.getDate() - 1);
  return formatDateKey(base);
}

function resolveEventSchedule(event: GoogleCalendarEvent): {
  specificDate: string | null;
  endDate: string | null;
} {
  const startDate = parseCalendarDateKey(event.start?.date || '');
  const endDateExclusive = parseCalendarDateKey(event.end?.date || '');

  if (startDate) {
    if (endDateExclusive && endDateExclusive > startDate) {
      const inclusiveEnd = previousDateKey(endDateExclusive);
      if (inclusiveEnd >= startDate) {
        return {
          specificDate: startDate,
          endDate: inclusiveEnd === startDate ? null : inclusiveEnd,
        };
      }
    }
    return {
      specificDate: startDate,
      endDate: null,
    };
  }

  const startDateTime = toLocalDateKeyFromDateTime(event.start?.dateTime || '');
  if (!startDateTime) {
    return {
      specificDate: null,
      endDate: null,
    };
  }

  const endDateTime = toLocalDateKeyFromDateTime(event.end?.dateTime || '');
  if (endDateTime && endDateTime > startDateTime) {
    return {
      specificDate: startDateTime,
      endDate: endDateTime,
    };
  }

  return {
    specificDate: startDateTime,
    endDate: null,
  };
}

function buildTodoFetchWindow(): {timeMin: string; timeMax: string} {
  const today = new Date(DateHelper.todayDate);
  today.setHours(0, 0, 0, 0);

  const configuredStart = new Date(
    `${LocalStorageManager.overdueReferenceDate}T00:00:00`,
  );
  const start = Number.isNaN(configuredStart.getTime())
    ? new Date(today)
    : configuredStart > today
      ? new Date(today)
      : configuredStart;

  // 取得終了は常に翌日末に固定して、当日タスクを取りこぼさない。
  const end = new Date(DateHelper.tomorrowDate);
  end.setHours(23, 59, 59, 999);

  return {
    timeMin: encodeURIComponent(start.toISOString()),
    timeMax: encodeURIComponent(end.toISOString()),
  };
}

export async function fetchTodoTasksFromGoogleCalendar(): Promise<DoneTaskData[]> {
  const calendarId = await resolveCalendarId(
    LocalStorageManager.googleTodoCalendarIdEncrypted,
  );
  if (!calendarId) {
    return [];
  }
  const {timeMin, timeMax} = buildTodoFetchWindow();
  const maxResults = 2500;

  try {
    const payload = await fetchCalendarApi<{items?: GoogleCalendarEvent[]}>(
      `/calendars/${encodeURIComponent(calendarId)}/events?singleEvents=true&orderBy=startTime&timeMin=${timeMin}&timeMax=${timeMax}&maxResults=${maxResults}`,
    );

    return (payload.items || [])
      .filter(event => Boolean(event.id))
      .map(event => toTaskDataFromEvent(event, 'google-todo', calendarId));
  } catch (error) {
    if (isGoogleReloginRequiredError(error)) {
      throw error;
    }
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
  const end = start;

  await fetchCalendarApi(
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      body: JSON.stringify({
        summary: task.text,
        description: descriptionLines.join('\n'),
        start: {dateTime: start},
        end: {dateTime: end},
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

export async function updateTodoEventDescription(
  task: DoneTask,
  description: string,
): Promise<void> {
  if (!task.externalCalendarId || !task.externalEventId) {
    return;
  }

  await fetchCalendarApi(
    `/calendars/${encodeURIComponent(task.externalCalendarId)}/events/${encodeURIComponent(task.externalEventId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        description,
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
