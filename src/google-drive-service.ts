import type {DoneTaskData, DoneTaskSyncPayload} from './types';
import LocalStorageManager from './local-storage-manager';
import {
  clearGoogleToken,
  createGoogleReloginRequiredError,
  getGoogleAccessToken,
  isGoogleReloginRequiredError,
} from './google-auth';

const GOOGLE_DRIVE_SCOPE = ['https://www.googleapis.com/auth/drive.file'];
const FILE_NAME = 'tanjoin_done_task_sync_backup_v1.json';

export type GoogleDriveTaskSnapshot = {
  tasks: DoneTaskData[];
  updatedAt: string;
  hasTimestamp: boolean;
};

export type GoogleDriveSyncSkippedReason =
  | 'missing_local_updated_at'
  | 'local_is_older';

export type GoogleDriveSyncResult = {
  uploaded: boolean;
  skippedReason?: GoogleDriveSyncSkippedReason;
  remoteUpdatedAt?: string;
};

type SyncOptions = {
  forceOverwrite?: boolean;
};

function driveApi(path: string): string {
  return `https://www.googleapis.com/drive/v3${path}`;
}

async function fetchDriveApi<T>(
  path: string,
  init?: RequestInit,
  retried = false,
): Promise<T> {
  const token = await getGoogleAccessToken(GOOGLE_DRIVE_SCOPE);
  const response = await fetch(driveApi(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    if ((response.status === 401 || response.status === 403) && !retried) {
      clearGoogleToken();
      try {
        return await fetchDriveApi<T>(path, init, true);
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
    throw new Error(`Google Drive API error (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}

async function findBackupFileId(): Promise<string> {
  const query = encodeURIComponent(
    `name='${FILE_NAME}' and trashed=false and mimeType='application/json'`,
  );
  const payload = await fetchDriveApi<{files?: Array<{id?: string}>}>(
    `/files?q=${query}&spaces=drive&fields=files(id)&pageSize=1`,
  );
  return payload.files?.[0]?.id || '';
}

function parseDrivePayload(parsed: unknown): GoogleDriveTaskSnapshot | null {
  if (Array.isArray(parsed)) {
    return {
      tasks: parsed as DoneTaskData[],
      updatedAt: '',
      hasTimestamp: false,
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const payload = parsed as Partial<DoneTaskSyncPayload>;
  if (!Array.isArray(payload.tasks)) {
    return null;
  }

  const updatedAt =
    typeof payload.updatedAt === 'string' ? payload.updatedAt.trim() : '';
  return {
    tasks: payload.tasks,
    updatedAt,
    hasTimestamp: Boolean(updatedAt),
  };
}

async function loadSnapshotByFileId(
  fileId: string,
): Promise<GoogleDriveTaskSnapshot | null> {
  const token = await getGoogleAccessToken(GOOGLE_DRIVE_SCOPE);
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (response.status === 401 || response.status === 403) {
    clearGoogleToken();
    throw createGoogleReloginRequiredError();
  }

  if (!response.ok) {
    return null;
  }

  const parsed = (await response.json()) as unknown;
  return parseDrivePayload(parsed);
}

async function uploadMultipart(
  metadata: Record<string, unknown>,
  content: string,
  fileId = '',
  retried = false,
): Promise<void> {
  const boundary = 'done-boundary-' + Math.random().toString(36).slice(2);
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    `${content}\r\n` +
    `--${boundary}--`;

  const token = await getGoogleAccessToken(GOOGLE_DRIVE_SCOPE);
  const method = fileId ? 'PATCH' : 'POST';
  const endpoint = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const response = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    if ((response.status === 401 || response.status === 403) && !retried) {
      clearGoogleToken();
      try {
        await uploadMultipart(metadata, content, fileId, true);
        return;
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
    const text = await response.text();
    throw new Error(`Google Drive upload failed (${response.status}): ${text}`);
  }
}

export async function syncTasksToGoogleDrive(
  tasks: DoneTaskData[],
  options: SyncOptions = {},
): Promise<GoogleDriveSyncResult> {
  if (!LocalStorageManager.googleDriveSyncEnabled) {
    return {uploaded: false};
  }

  const localUpdatedAt = LocalStorageManager.tasksLastUpdatedAt;
  if (!options.forceOverwrite && !localUpdatedAt) {
    return {
      uploaded: false,
      skippedReason: 'missing_local_updated_at',
    };
  }

  const fileId = await findBackupFileId();
  if (fileId && !options.forceOverwrite) {
    const remoteSnapshot = await loadSnapshotByFileId(fileId);
    if (remoteSnapshot) {
      if (
        remoteSnapshot.hasTimestamp &&
        localUpdatedAt < remoteSnapshot.updatedAt
      ) {
        return {
          uploaded: false,
          skippedReason: 'local_is_older',
          remoteUpdatedAt: remoteSnapshot.updatedAt,
        };
      }
    }
  }

  const payload: DoneTaskSyncPayload = {
    updatedAt: localUpdatedAt || new Date().toISOString(),
    tasks,
  };
  const content = JSON.stringify(payload, null, 2);
  await uploadMultipart(
    {name: FILE_NAME, mimeType: 'application/json'},
    content,
    fileId,
  );
  return {uploaded: true};
}

export async function loadTasksFromGoogleDrive(): Promise<GoogleDriveTaskSnapshot | null> {
  if (!LocalStorageManager.googleDriveSyncEnabled) {
    return null;
  }

  const fileId = await findBackupFileId();
  if (!fileId) {
    return null;
  }

  return loadSnapshotByFileId(fileId);
}

export async function getGoogleDriveBackupFileLink(): Promise<string> {
  if (!LocalStorageManager.googleDriveSyncEnabled) {
    return '';
  }

  const fileId = await findBackupFileId();
  if (!fileId) {
    return '';
  }

  try {
    const payload = await fetchDriveApi<{webViewLink?: string}>(
      `/files/${encodeURIComponent(fileId)}?fields=webViewLink`,
    );
    if (payload.webViewLink) {
      return payload.webViewLink;
    }
  } catch {
    // webViewLink を取れない場合は既知のDrive URLへフォールバックする
  }

  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
}
