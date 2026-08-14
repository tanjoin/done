import LocalStorageManager from './local-storage-manager';
import {
  clearGoogleToken,
  getGoogleAccessToken,
  GOOGLE_APP_SCOPES,
  hasValidGoogleToken,
  isGoogleReloginRequiredError,
} from './google-auth';
import {
  getGoogleDriveBackupFileLink,
  loadTasksFromGoogleDrive,
} from './google-drive-service';
import {
  listGoogleCalendars,
  loadCalendarSettings,
  saveCalendarSettings,
} from './google-calendar-service';
import GoogleAuthAlertController from './google-auth-alert';
import SessionManager from './session-manager';

export default class SettingsCalendarSection {
  static render(): string {
    return `
      <div class="data-box" id="calendarSection">
        <h3 class="group-title">設定・データ管理</h3>
        <p class="setting-desc">
          Google連携設定を保存します。OAuth Client ID と連携カレンダーは暗号化して保存されます。<br />
          OAuth Client ID は
          <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">Google Cloud Console</a>
          で作成してください。
        </p>
        <form id="calendarSettingForm" class="setting-form">
          <input
            type="text"
            id="googleClientIdInput"
            placeholder="OAuth 2.0 Client ID"
            class="setting-input"
          />
          <div class="form-actions-row">
            <button type="button" class="btn btn-action" id="googleLoginBtn">Googleにログイン</button>
            <span id="googleLoginStatus" class="save-status-msg" style="display: inline;">未ログイン</span>
          </div>
          <div class="form-actions-row">
            <button type="button" class="btn" id="loadCalendarListBtn">カレンダー一覧を取得</button>
          </div>
          <select id="todoCalendarSelect" class="setting-input">
            <option value="">TODOカレンダーを選択</option>
          </select>
          <select id="doneCalendarSelect" class="setting-input">
            <option value="">DONEカレンダーを選択</option>
          </select>
          <input
            type="text"
            id="doneCalendarManualInput"
            placeholder="DONEカレンダーIDを手入力（OAuth未設定でも可）"
            class="setting-input"
          />
          <label class="checkbox-option" for="googleDriveSyncToggle">
            <input type="checkbox" id="googleDriveSyncToggle" />
            Google Drive 同期を有効にする
          </label>
          <p class="setting-desc">
            同期を有効にすると、タスクJSONは Google Drive 上の
            <strong>tanjoin_done_task_sync_backup_v1.json</strong> に保存されます。<br />
            保存タイミングはタスク操作後とインポート後です。既存ファイルがあれば更新し、
            なければ作成します。他のファイルは変更しません。
          </p>
          <p id="googleDriveLinkStatus" class="setting-desc" style="display: none;"></p>
          <div class="form-actions-row">
            <button type="submit" class="btn btn-action">設定を保存する</button>
            <span id="googleSaveStatus" class="save-status-msg">保存しました</span>
          </div>
        </form>
      </div>
    `;
  }

  static setup(
    root: ParentNode,
    googleAuthAlertController: GoogleAuthAlertController,
  ): void {
    const section = root.querySelector(
      '#calendarSection',
    ) as HTMLElement | null;
    const clientIdInput = root.querySelector(
      '#googleClientIdInput',
    ) as HTMLInputElement | null;
    const form = root.querySelector(
      '#calendarSettingForm',
    ) as HTMLFormElement | null;
    const todoSelect = root.querySelector(
      '#todoCalendarSelect',
    ) as HTMLSelectElement | null;
    const doneSelect = root.querySelector(
      '#doneCalendarSelect',
    ) as HTMLSelectElement | null;
    const loadListButton = root.querySelector(
      '#loadCalendarListBtn',
    ) as HTMLButtonElement | null;
    const doneManualInput = root.querySelector(
      '#doneCalendarManualInput',
    ) as HTMLInputElement | null;
    const googleLoginButton = root.querySelector(
      '#googleLoginBtn',
    ) as HTMLButtonElement | null;
    const googleLoginStatus = root.querySelector(
      '#googleLoginStatus',
    ) as HTMLElement | null;
    const driveToggle = root.querySelector(
      '#googleDriveSyncToggle',
    ) as HTMLInputElement | null;
    const saveStatus = root.querySelector(
      '#googleSaveStatus',
    ) as HTMLElement | null;
    const driveLinkStatus = root.querySelector(
      '#googleDriveLinkStatus',
    ) as HTMLElement | null;
    let doneSelectEditedByUser = false;

    const supportsStorage = LocalStorageManager.supportsLocalStorage();

    if (!supportsStorage) {
      if (section) {
        section.style.display = 'none';
      }
      return;
    }

    if (
      !clientIdInput ||
      !form ||
      !todoSelect ||
      !doneSelect ||
      !doneManualInput ||
      !googleLoginButton ||
      !googleLoginStatus ||
      !driveLinkStatus ||
      !driveToggle
    ) {
      return;
    }

    void loadCalendarSettings().then(settings => {
      clientIdInput.value = settings.clientId;
      if (settings.todoCalendarId) {
        todoSelect.innerHTML = `<option value="${settings.todoCalendarId}">${settings.todoCalendarId}</option>`;
      }
      doneManualInput.value = settings.doneCalendarId;
    });

    driveToggle.checked = LocalStorageManager.googleDriveSyncEnabled;
    doneManualInput.value = LocalStorageManager.calendarTargetId;

    const updateLoginStatus = () => {
      if (!googleLoginStatus) {
        return;
      }
      const loggedIn = hasValidGoogleToken();
      googleLoginStatus.textContent = loggedIn ? 'ログイン済み' : '未ログイン';
      googleLoginButton.textContent = loggedIn
        ? 'Googleからログアウト'
        : 'Googleにログイン';
    };

    const refreshDriveLink = async () => {
      if (!driveToggle.checked) {
        driveLinkStatus.style.display = 'none';
        driveLinkStatus.innerHTML = '';
        return;
      }

      driveLinkStatus.style.display = 'block';
      if (!hasValidGoogleToken()) {
        driveLinkStatus.textContent =
          'Google Drive 保存先リンクはログイン後に表示されます。';
        return;
      }

      try {
        const link = await getGoogleDriveBackupFileLink();
        if (!link) {
          driveLinkStatus.textContent =
            'Google Drive 保存先ファイルはまだ作成されていません。';
          return;
        }
        driveLinkStatus.innerHTML = `Google Drive 保存先: <a href="${link}" target="_blank" rel="noopener noreferrer">バックアップファイルを開く</a>`;
      } catch {
        driveLinkStatus.textContent =
          'Google Drive 保存先リンクの取得に失敗しました。';
      }
    };

    updateLoginStatus();
    void refreshDriveLink();

    googleLoginButton.addEventListener('click', async () => {
      if (hasValidGoogleToken()) {
        clearGoogleToken();
        updateLoginStatus();
        SessionManager.notifyGoogleSessionStateChanged();
        await refreshDriveLink();
        googleAuthAlertController.hide();
        return;
      }

      const clientId = clientIdInput.value.trim();
      if (!clientId) {
        googleAuthAlertController.show(
          '先に OAuth 2.0 Client ID を入力してからログインしてください。',
        );
        return;
      }

      try {
        const current = await loadCalendarSettings();
        await saveCalendarSettings({
          clientId,
          todoCalendarId: current.todoCalendarId,
          doneCalendarId:
            doneManualInput.value.trim() || current.doneCalendarId,
        });
        await getGoogleAccessToken(GOOGLE_APP_SCOPES, true);

        updateLoginStatus();
        SessionManager.notifyGoogleSessionStateChanged();
        if (driveToggle.checked) {
          const driveSnapshot = await loadTasksFromGoogleDrive();
          if (driveSnapshot !== null && !LocalStorageManager.taskSyncDirty) {
            LocalStorageManager.tasks = driveSnapshot.tasks;
            if (driveSnapshot.updatedAt) {
              LocalStorageManager.tasksLastUpdatedAt = driveSnapshot.updatedAt;
            }
            LocalStorageManager.taskSyncState = {
              baseRevision: driveSnapshot.revision,
              baseDriveVersion: driveSnapshot.version,
              fileId: driveSnapshot.fileId,
              dirty: false,
              baseTasks: driveSnapshot.tasks,
            };
          }
        }
        SessionManager.notifyGoogleLoginSucceeded();
        await refreshDriveLink();
        googleAuthAlertController.hide();
      } catch (error) {
        updateLoginStatus();
        SessionManager.notifyGoogleSessionStateChanged();
        await refreshDriveLink();
        const message =
          error instanceof Error
            ? error.message
            : 'Googleログインに失敗しました。';
        googleAuthAlertController.show(message);
      }
    });

    loadListButton?.addEventListener('click', async () => {
      if (!clientIdInput.value.trim()) {
        googleAuthAlertController.show(
          'OAuth 2.0 Client ID を入力してからカレンダー一覧を取得してください。',
        );
        return;
      }

      try {
        const current = await loadCalendarSettings();
        await saveCalendarSettings({
          clientId: clientIdInput.value,
          todoCalendarId: current.todoCalendarId,
          doneCalendarId: current.doneCalendarId,
        });

        const calendars = await listGoogleCalendars();
        const options = ['<option value="">選択してください</option>']
          .concat(
            calendars.map(
              cal =>
                `<option value="${cal.id}">${cal.summary} (${cal.id})</option>`,
            ),
          )
          .join('');
        todoSelect.innerHTML = options;
        doneSelect.innerHTML = options;
        todoSelect.value = current.todoCalendarId;
        doneSelect.value = current.doneCalendarId;
        googleAuthAlertController.hide();
      } catch (error) {
        const isAuthError = isGoogleReloginRequiredError(error);
        const message =
          error instanceof Error ? error.message : '一覧取得に失敗しました。';
        if (isAuthError) {
          googleAuthAlertController.show(message);
          return;
        }
        alert(message);
      }
    });

    doneSelect.addEventListener('change', () => {
      doneSelectEditedByUser = true;
    });

    driveToggle.addEventListener('change', () => {
      void refreshDriveLink();
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      try {
        const manualDoneCalendarId = doneManualInput.value.trim();
        const doneCalendarId = manualDoneCalendarId
          ? manualDoneCalendarId
          : doneSelectEditedByUser
            ? doneSelect.value.trim()
            : '';
        await saveCalendarSettings({
          clientId: clientIdInput.value,
          todoCalendarId: todoSelect.value,
          doneCalendarId,
        });
        doneManualInput.value = doneCalendarId;
        LocalStorageManager.googleDriveSyncEnabled = driveToggle.checked;
        if (saveStatus) {
          saveStatus.style.display = 'inline';
          setTimeout(() => {
            saveStatus.style.display = 'none';
          }, 2500);
        }
        updateLoginStatus();
        await refreshDriveLink();
      } catch {
        alert('設定保存に失敗しました。');
      }
    });
  }
}
