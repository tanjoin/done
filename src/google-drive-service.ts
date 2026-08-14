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
  revision: string;
  fileId: string;
  version: string;
};

export type GoogleDriveSyncSkippedReason = 'conflict';

export type GoogleDriveSyncResult = {
  uploaded: boolean;
  skippedReason?: GoogleDriveSyncSkippedReason;
  remoteUpdatedAt?: string;
};

type SyncOptions = {
  forceOverwrite?: boolean;
};

type DriveFileInfo = {
  fileId: string;
  version: string;
};

function createRevision(): string {
  return crypto.randomUUID();
}

export function createDriveTaskSyncPayload(
  tasks: DoneTaskData[],
): DoneTaskSyncPayload {
  return {
    schemaVersion: 2,
    revision: createRevision(),
    updatedAt: new Date().toISOString(),
    tasks,
  };
}

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

function parseDrivePayload(
  parsed: unknown,
  fileInfo: DriveFileInfo,
): GoogleDriveTaskSnapshot | null {
  if (Array.isArray(parsed)) {
    return {
      tasks: parsed as DoneTaskData[],
      updatedAt: '',
      revision: 'legacy-array',
      fileId: fileInfo.fileId,
      version: fileInfo.version,
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
    revision:
      typeof payload.revision === 'string' && payload.revision.trim()
        ? payload.revision.trim()
        : `legacy:${updatedAt || 'unversioned'}`,
    fileId: fileInfo.fileId,
    version: fileInfo.version,
  };
}

async function loadFileInfo(fileId: string): Promise<DriveFileInfo> {
  const token = await getGoogleAccessToken(GOOGLE_DRIVE_SCOPE);
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,version`,
    {headers: {Authorization: `Bearer ${token}`}},
  );
  if (response.status === 401 || response.status === 403) {
    clearGoogleToken();
    throw createGoogleReloginRequiredError();
  }
  if (!response.ok) {
    throw new Error(`Google Drive file lookup failed (${response.status})`);
  }
  const payload = (await response.json()) as {version?: string};
  const version = typeof payload.version === 'string' ? payload.version : '';
  if (!version) {
    throw new Error('Google Drive file version is unavailable');
  }
  return {fileId, version};
}

async function loadSnapshotByFileId(
  fileId: string,
): Promise<GoogleDriveTaskSnapshot | null> {
  const fileInfo = await loadFileInfo(fileId);
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
  return parseDrivePayload(parsed, fileInfo);
}

async function uploadMultipart(
  metadata: Record<string, unknown>,
  content: string,
  fileId = '',
  retried = false,
): Promise<DriveFileInfo> {
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
    ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=multipart&fields=id,version`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,version';

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
        return await uploadMultipart(metadata, content, fileId, true);
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

  const payload = (await response.json()) as {id?: string; version?: string};
  const savedFileId = typeof payload.id === 'string' ? payload.id : fileId;
  const version = typeof payload.version === 'string' ? payload.version : '';
  if (!savedFileId || !version) {
    throw new Error('Google Drive upload response is missing file version');
  }
  return {fileId: savedFileId, version};
}

export async function syncTasksToGoogleDrive(
  tasks: DoneTaskData[],
  options: SyncOptions = {},
): Promise<GoogleDriveSyncResult> {
  if (!LocalStorageManager.googleDriveSyncEnabled) {
    return {uploaded: false};
  }

  const knownFileId = LocalStorageManager.taskSyncState?.fileId || '';
  const fileId = knownFileId || (await findBackupFileId());
  let remoteSnapshot: GoogleDriveTaskSnapshot | null = null;
  if (fileId) {
    remoteSnapshot = await loadSnapshotByFileId(fileId);
    const syncState = LocalStorageManager.taskSyncState;
    if (
      !options.forceOverwrite &&
      (!syncState ||
        syncState.fileId !== fileId ||
        syncState.baseRevision !== remoteSnapshot?.revision ||
        syncState.baseDriveVersion !== remoteSnapshot?.version)
    ) {
      return {
        uploaded: false,
        skippedReason: 'conflict',
        ...(remoteSnapshot?.updatedAt
          ? {remoteUpdatedAt: remoteSnapshot.updatedAt}
          : {}),
      };
    }
  }

  const payload = createDriveTaskSyncPayload(tasks);
  const content = JSON.stringify(payload, null, 2);
  const savedFile = await uploadMultipart(
    {name: FILE_NAME, mimeType: 'application/json'},
    content,
    fileId,
  );
  LocalStorageManager.taskSyncState = {
    baseRevision: payload.revision,
    baseDriveVersion: savedFile.version,
    fileId: savedFile.fileId,
    dirty: false,
    baseTasks: payload.tasks,
  };
  return {uploaded: true};
}

export async function loadTasksFromGoogleDrive(): Promise<GoogleDriveTaskSnapshot | null> {
  if (!LocalStorageManager.googleDriveSyncEnabled) {
    return null;
  }

  const fileId =
    LocalStorageManager.taskSyncState?.fileId || (await findBackupFileId());
  if (!fileId) {
    return null;
  }

  return loadSnapshotByFileId(fileId);
}

export async function getGoogleDriveBackupFileLink(): Promise<string> {
  if (!LocalStorageManager.googleDriveSyncEnabled) {
    return '';
  }

  const fileId =
    LocalStorageManager.taskSyncState?.fileId || (await findBackupFileId());
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
