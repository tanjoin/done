import{A as e,D as t,L as n,M as r,O as i,R as a,_ as o,b as s,d as c,f as l,g as u,i as d,j as f,k as p,l as m,m as h,n as g,p as _,r as v,t as y,u as b,v as x,y as S,z as C}from"./google-drive-service-IrLJWyjK.js";import{a as w,i as T,n as E,o as D,s as O,t as k}from"./task-repository-BsxEEtYt.js";import{i as A,n as j,r as M,t as N}from"./notification-manager-DE5e7mnY.js";import{n as P,r as F,t as I}from"./google-auth-alert-Df606iWU.js";var L,R=C((()=>{i(),S(),v(),T(),l(),L=class{static render(){return`
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
            <option value="">表示カレンダー1を選択</option>
          </select>
          <select id="todoCalendarSelect2" class="setting-input">
            <option value="">表示カレンダー2を選択</option>
          </select>
          <label class="checkbox-option">
            <input type="checkbox" id="skipSecondCalendarPeacockToggle" />
            <span>表示カレンダー2のピーコック色タスクをスルーする</span>
          </label>
          <label class="checkbox-option">
            <input type="checkbox" id="treatSecondCalendarAsLongTermToggle" />
            <span>表示カレンダー2を長期タスクとして表示する</span>
          </label>
          <select id="doneCalendarSelect" class="setting-input">
            <option value="">DONEカレンダーを選択</option>
          </select>
          <input
            type="text"
            id="doneCalendarManualInput"
            placeholder="DONEカレンダーIDを手入力（OAuth未設定でも可）"
            class="setting-input"
          />
          <p class="setting-desc">
            タスクJSONは Google Drive 上の
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
    `}static setup(e,n){let r=e.querySelector(`#calendarSection`),i=e.querySelector(`#googleClientIdInput`),a=e.querySelector(`#calendarSettingForm`),o=e.querySelector(`#todoCalendarSelect`),l=e.querySelector(`#todoCalendarSelect2`),f=e.querySelector(`#doneCalendarSelect`),p=e.querySelector(`#skipSecondCalendarPeacockToggle`),m=e.querySelector(`#treatSecondCalendarAsLongTermToggle`),v=e.querySelector(`#loadCalendarListBtn`),y=e.querySelector(`#doneCalendarManualInput`),b=e.querySelector(`#googleLoginBtn`),S=e.querySelector(`#googleLoginStatus`),C=e.querySelector(`#googleSaveStatus`),T=e.querySelector(`#googleDriveLinkStatus`),E=!1;if(!t.supportsLocalStorage()){r&&(r.style.display=`none`);return}if(!i||!a||!o||!l||!f||!y||!b||!S||!T)return;D().then(e=>{i.value=e.clientId;let t=e.todoCalendarIds.length?e.todoCalendarIds:e.todoCalendarId?[e.todoCalendarId]:[],n=[`<option value="">選択してください</option>`];o.innerHTML=n.join(``),l.innerHTML=n.join(``),t[0]&&(o.innerHTML=`<option value="${t[0]}">${t[0]}</option>`),t[1]&&(l.innerHTML=`<option value="${t[1]}">${t[1]}</option>`),o.value=t[0]||``,l.value=t[1]||``,y.value=e.doneCalendarId}),y.value=t.calendarTargetId,p&&(p.checked=t.skipSecondCalendarPeacock,p.addEventListener(`change`,()=>{t.skipSecondCalendarPeacock=p.checked})),m&&(m.checked=t.treatSecondCalendarAsLongTerm,m.addEventListener(`change`,()=>{t.treatSecondCalendarAsLongTerm=m.checked}));let k=()=>{if(!S)return;let e=x();S.textContent=e?`ログイン済み`:`未ログイン`,b.textContent=e?`Googleからログアウト`:`Googleにログイン`},A=async()=>{if(T.style.display=`block`,!x())T.textContent=`Google Drive 保存先リンクはログイン後に表示されます。`;else try{let e=await g();if(!e){T.textContent=`Google Drive 保存先ファイルはまだ作成されていません。`;return}T.innerHTML=`Google Drive 保存先: <a href="${e}" target="_blank" rel="noopener noreferrer">バックアップファイルを開く</a>`}catch{T.textContent=`Google Drive 保存先リンクの取得に失敗しました。`}};k(),A(),b.addEventListener(`click`,async()=>{if(x()){h(),k(),c.notifyGoogleSessionStateChanged(),await A(),n.hide();return}let e=i.value.trim();if(!e)n.show(`先に OAuth 2.0 Client ID を入力してからログインしてください。`);else try{let r=await D();await O({clientId:e,todoCalendarIds:r.todoCalendarIds,doneCalendarId:y.value.trim()||r.doneCalendarId}),await u(_,!0),k(),c.notifyGoogleSessionStateChanged();let i=await d();i!==null&&!t.taskSyncDirty&&(t.tasks=i.tasks,i.updatedAt&&(t.tasksLastUpdatedAt=i.updatedAt),t.taskSyncState={baseRevision:i.revision,baseDriveVersion:i.version,fileId:i.fileId,dirty:!1,baseTasks:i.tasks}),c.notifyGoogleLoginSucceeded(),await A(),n.hide()}catch(e){k(),c.notifyGoogleSessionStateChanged(),await A();let t=e instanceof Error?e.message:`Googleログインに失敗しました。`;n.show(t)}}),v?.addEventListener(`click`,async()=>{if(!i.value.trim())n.show(`OAuth 2.0 Client ID を入力してからカレンダー一覧を取得してください。`);else try{let e=await D();await O({clientId:i.value,todoCalendarIds:e.todoCalendarIds,doneCalendarId:e.doneCalendarId});let t=await w(),r=[`<option value="">選択してください</option>`].concat(t.map(e=>`<option value="${e.id}">${e.summary} (${e.id})</option>`)).join(``);o.innerHTML=r,l.innerHTML=r,f.innerHTML=r;let a=e.todoCalendarIds.length?e.todoCalendarIds:e.todoCalendarId?[e.todoCalendarId]:[];o.value=a[0]||``,l.value=a[1]||``,f.value=e.doneCalendarId,n.hide()}catch(e){let t=s(e),r=e instanceof Error?e.message:`一覧取得に失敗しました。`;if(t){n.show(r);return}alert(r)}}),f.addEventListener(`change`,()=>{E=!0}),a.addEventListener(`submit`,async e=>{e.preventDefault();try{let e=y.value.trim()||(E?f.value.trim():``),t=[o.value,l.value].map(e=>e.trim()).filter(Boolean);await O({clientId:i.value,todoCalendarIds:t,doneCalendarId:e}),y.value=e,C&&(C.style.display=`inline`,setTimeout(()=>{C.style.display=`none`},2500)),k(),await A()}catch{alert(`設定保存に失敗しました。`)}})}}})),z,B=C((()=>{r(),v(),z=class e{static excludeGoogleTodoTasks(e){return e.filter(e=>e.sourceType!==`google-todo`)}static render(){return`
      <div class="data-box">
        <h3 class="group-title">データ管理</h3>
        <p class="setting-desc">
          タスク設定や履歴をJSONとしてエクスポート/インポートできます。
        </p>
        <div class="view-mode-switch" role="group" aria-label="JSON形式の切り替え">
          <span class="view-mode-label">JSON形式</span>
          <label class="switch-pill" for="jsonExportFormatToggle">
            <input type="checkbox" id="jsonExportFormatToggle" />
            <span class="switch-track">
              <span class="switch-text-left">配列</span>
              <span class="switch-text-right">Drive</span>
              <span class="switch-thumb"></span>
            </span>
          </label>
        </div>
        <div class="btn-group-wrap btn-group-vertical">
          <button id="exportJSONBtn" class="btn btn-cancel">データエクスポート</button>
          <button id="importJSONBtn" class="btn btn-cancel">データインポート</button>
          <button id="copyJSONBtn" class="btn btn-cancel">クリップボードへコピー</button>
          <button id="pasteJSONBtn" class="btn btn-cancel">クリップボードから読み込み</button>
          <button id="resetBtn" class="btn btn-action" style="background-color: #ef4444;">全て初期状態に戻す</button>
        </div>
        <input type="file" id="fileInput" accept=".json" />
      </div>
    `}static setup(t,n){let r=t.querySelector(`#fileInput`),i=t.querySelector(`#exportJSONBtn`),a=t.querySelector(`#jsonExportFormatToggle`),o=t.querySelector(`#importJSONBtn`),s=t.querySelector(`#copyJSONBtn`),c=t.querySelector(`#pasteJSONBtn`),l=t.querySelector(`#resetBtn`);r&&i&&a&&o&&s&&c&&l&&(i.addEventListener(`click`,()=>{e.exportJSON(n,e.getExportFormat(a))}),o.addEventListener(`click`,()=>{r.click()}),r.addEventListener(`change`,t=>{e.importJSONFromFile(t,n)}),s.addEventListener(`click`,async()=>{await e.copyJSONToClipboard(n,e.getExportFormat(a))}),c.addEventListener(`click`,async()=>{await e.importJSONFromClipboard(n)}),l.addEventListener(`click`,async()=>{await e.resetToDefault(n)}))}static getExportFormat(e){return e.checked?`drive`:`array`}static extractTasksFromJson(e){if(Array.isArray(e))return e;if(!e||typeof e!=`object`)return null;let t=e;return Array.isArray(t.tasks)?t.tasks:null}static async updateTasksFromJson(t,n){let r=e.extractTasksFromJson(t);return r?(n.tasks=e.excludeGoogleTodoTasks(r).map(e=>new f(e)),await n.saveTasksWithSync(!0),!0):!1}static importJSONFromFile(t,n){let r=t.target,i=r.files?.[0];if(!i)return;let a=new FileReader;a.onload=async t=>{try{let r=String(t.target?.result||``),i=JSON.parse(r);if(!await e.updateTasksFromJson(i,n)){alert(`無効なJSONフォーマットです。`);return}alert(`インポートが完了しました。`)}catch{alert(`JSONの解析に失敗しました。`)}},a.readAsText(i),r.value=``}static async importJSONFromClipboard(t){if(!navigator.clipboard||!window.isSecureContext)alert(`この環境ではクリップボード操作が利用できません。`);else try{let n=await navigator.clipboard.readText(),r=JSON.parse(n);if(!await e.updateTasksFromJson(r,t)){alert(`無効なJSONフォーマットです。`);return}alert(`クリップボードからインポートしました。`)}catch{alert(`クリップボードの読み込みまたはJSON解析に失敗しました。`)}}static async copyJSONToClipboard(t,n){if(!navigator.clipboard||!window.isSecureContext)alert(`この環境ではクリップボード操作が利用できません。`);else try{await navigator.clipboard.writeText(JSON.stringify(e.createExportPayload(t,n),null,2)),alert(`JSONをクリップボードにコピーしました。`)}catch{alert(`クリップボードへのコピーに失敗しました。`)}}static createExportPayload(t,n){let r=e.excludeGoogleTodoTasks(t.tasks);return n===`array`?r:y(r)}static exportJSON(t,n){let r=JSON.stringify(e.createExportPayload(t,n),null,2),i=`data:text/json;charset=utf-8,`+encodeURIComponent(r),a=document.createElement(`a`);a.setAttribute(`href`,i),a.setAttribute(`download`,n===`drive`?`tanjoin_done_task_sync_backup_v1.json`:`task_settings_and_history.json`),document.body.appendChild(a),a.click(),a.remove()}static async resetToDefault(e){if(confirm(`すべてのカスタム設定と履歴を削除し、デフォルトのtasks.jsonから再読み込みしますか？
ログイン中かつ Drive 同期ON の場合、Drive の最新データで上書きされます。`))try{await e.resetToDefault(),alert(`初期設定に戻しました。`)}catch{alert(`初期設定への復元に失敗しました。`)}}}})),V,H=C((()=>{i(),V=class{static render(){return`
      <div class="data-box" id="displaySection">
        <h3 class="group-title">表示設定</h3>
        <p class="setting-desc">
          前日以前の未完了タスクを表示する開始日を設定します。
        </p>
        <form id="overdueReferenceDateForm" class="setting-form">
          <input type="date" id="overdueReferenceDateInput" class="setting-input" />
          <div class="form-actions-row">
            <button type="submit" class="btn btn-action">表示基準日を保存する</button>
            <span id="displaySaveStatus" class="save-status-msg">保存しました</span>
          </div>
        </form>
      </div>
    `}static setup(e){let n=e.querySelector(`#overdueReferenceDateInput`),r=e.querySelector(`#overdueReferenceDateForm`),i=e.querySelector(`#displaySaveStatus`);n&&r&&(n.value=t.overdueReferenceDate,r.addEventListener(`submit`,e=>{e.preventDefault(),n.value&&(t.overdueReferenceDate=n.value,i&&(i.style.display=`inline`,setTimeout(()=>{i.style.display=`none`},2500)))}))}}})),U,W=C((()=>{i(),j(),A(),U=class e{static render(){return`
      ${e.renderSound()}
      ${e.renderNotification()}
    `}static renderSound(){return`
      <div class="data-box" id="soundSection">
        <h3 class="group-title">通知音設定</h3>
        <p class="setting-desc">通知で使うサウンドを選択します。</p>
        <div class="setting-row">
          <label for="notificationSoundSelect">通知音</label>
          <select id="notificationSoundSelect" class="setting-input">
            ${M.options.map(e=>`<option value="${e.value}">${e.label}</option>`).join(``)}
          </select>
        </div>
        <div class="btn-group-wrap">
          <button id="playSoundTestBtn" class="btn btn-action">サウンドをテスト</button>
        </div>
      </div>
    `}static renderNotification(){return`
      <div class="data-box" id="notificationSection">
        <h3 class="group-title">通知テスト</h3>
        <p class="setting-desc">
          ブラウザ通知が届くか確認できます。まず通知を有効にしてください。
        </p>
        <div class="btn-group-wrap">
          <button id="notificationEnableBtn" class="btn btn-cancel">通知を有効にする</button>
          <button id="sendTestNotificationBtn" class="btn btn-action">テスト通知を送信</button>
        </div>
      </div>
    `}static setup(t){e.setupSound(t),e.setupNotification(t)}static setupSound(e){let n=e.querySelector(`#notificationSoundSelect`),r=e.querySelector(`#playSoundTestBtn`);n&&(n.value=t.notificationSound,n.addEventListener(`change`,()=>{t.notificationSound=n.value})),r&&r.addEventListener(`click`,()=>{M.playSelected()})}static setupNotification(e){let t=e.querySelector(`#notificationSection`),n=e.querySelector(`#notificationEnableBtn`),r=e.querySelector(`#sendTestNotificationBtn`);N.isSupported()?(N.syncTestButtons(n,r),n&&n.addEventListener(`click`,async()=>{let e=await N.requestPermission();N.syncTestButtons(n,r),e===`granted`&&alert(`通知を有効にしました。`)}),r&&r.addEventListener(`click`,()=>{N.sendTestNotification()||alert(`先に通知を有効にしてください。`)})):t&&(t.style.display=`none`)}}})),G,K=C((()=>{i(),G=class e{static render(){return`
      <div class="data-box" id="themeSection">
        <h3 class="group-title">テーマ設定</h3>
        <form id="themeForm">
          <label class="theme-option">
            <input type="radio" name="theme" value="system" />
            <span>システム設定に従う</span>
          </label>
          <label class="theme-option">
            <input type="radio" name="theme" value="light" />
            <span>ライトモード</span>
          </label>
          <label class="theme-option">
            <input type="radio" name="theme" value="dark" />
            <span>ダークモード</span>
          </label>
        </form>
      </div>
    `}static applyTheme(e){let t=document.documentElement;e===`system`?t.removeAttribute(`data-theme`):t.setAttribute(`data-theme`,e)}static setup(n){let r=t.appTheme;e.applyTheme(r);let i=n.querySelector(`input[name="theme"][value="${r}"]`);i&&(i.checked=!0),n.querySelectorAll(`input[name="theme"]`).forEach(n=>{n.addEventListener(`change`,()=>{let r=n.value;t.appTheme=r,e.applyTheme(r)})})}}}));a((()=>{n(),S(),e(),b(),E(),R(),B(),H(),W(),K(),l(),P();var t=class extends HTMLElement{_taskRepository=new k;_googleAuthAlertController=null;static get NAME(){return`done-settings`}connectedCallback(){this.render(),this.setup()}render(){this.innerHTML=`
      <main>
        ${F({statusId:`googleAuthStatus`,messageId:`googleAuthStatusMessage`,actionButtonId:`googleAuthStatusActionBtn`,dismissButtonId:`googleAuthStatusDismissBtn`,actionLabel:`Google にログイン`,dismissAriaLabel:`Google認証通知を閉じる`})}
        ${L.render()}
        ${G.render()}
        ${V.render()}
        ${U.render()}
        ${z.render()}
      </main>
    `}async setup(){c.startGoogleSessionKeepAlive(),this._taskRepository.hydrateFromLocal(),this._googleAuthAlertController=new I({root:this,ids:{statusId:`googleAuthStatus`,messageId:`googleAuthStatusMessage`,actionButtonId:`googleAuthStatusActionBtn`,dismissButtonId:`googleAuthStatusDismissBtn`},onAction:()=>{let e=this.querySelector(`#googleLoginBtn`);e&&e.click()}}),this._googleAuthAlertController.setup(),G.setup(this),L.setup(this,this._googleAuthAlertController),V.setup(this),U.setup(this),z.setup(this,this._taskRepository),document.addEventListener(k.EVENT_GOOGLE_RELOGIN_NOTICE,e=>{let t=e;this._googleAuthAlertController?.show(t.detail.message)}),document.addEventListener(c.EVENT_GOOGLE_RELOGIN_REQUIRED,()=>{this._googleAuthAlertController?.show(`Google認証の有効期限が切れました。Google に再ログインしてください。`)}),document.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`a[href]`);n&&n.getAttribute(`href`)===`index.html`&&k.markNextIndexNavigationFromSettings()}),this._taskRepository.refreshFromCloudIfNeeded()}};customElements.get(t.NAME)||customElements.define(t.NAME,t),document.addEventListener(`DOMContentLoaded`,async()=>{o();let e=document.querySelector(`.container`);if(!e)return;let n=document.createElement(m.NAME);n.active=`settings`,e.appendChild(n);let r=document.createElement(t.NAME);e.appendChild(r);let i=document.createElement(p.NAME);e.appendChild(i)})}))();