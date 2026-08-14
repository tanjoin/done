import{D as e,E as t,M as n,N as r,O as i,P as a,T as o,_ as s,a as c,b as l,d as u,f as d,g as f,i as p,k as m,l as h,m as g,n as _,o as v,p as y,r as b,s as x,t as S,u as C,v as w,w as T,y as E}from"./google-auth-alert-BWVGOWhr.js";import{a as D,c as O,d as k,i as A,l as j,n as M,o as N,r as P,t as F,u as I}from"./task-repository-Mnvqdvzb.js";var L,R=a((()=>{o(),E(),v(),O(),d(),L=class{static render(){return`
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
    `}static setup(e,t){let n=e.querySelector(`#calendarSection`),r=e.querySelector(`#googleClientIdInput`),i=e.querySelector(`#calendarSettingForm`),a=e.querySelector(`#todoCalendarSelect`),o=e.querySelector(`#doneCalendarSelect`),s=e.querySelector(`#loadCalendarListBtn`),d=e.querySelector(`#doneCalendarManualInput`),p=e.querySelector(`#googleLoginBtn`),m=e.querySelector(`#googleLoginStatus`),h=e.querySelector(`#googleDriveSyncToggle`),_=e.querySelector(`#googleSaveStatus`),v=e.querySelector(`#googleDriveLinkStatus`),b=!1;if(!T.supportsLocalStorage()){n&&(n.style.display=`none`);return}if(!r||!i||!a||!o||!d||!p||!m||!v||!h)return;I().then(e=>{r.value=e.clientId,e.todoCalendarId&&(a.innerHTML=`<option value="${e.todoCalendarId}">${e.todoCalendarId}</option>`),d.value=e.doneCalendarId}),h.checked=T.googleDriveSyncEnabled,d.value=T.calendarTargetId;let S=()=>{if(!m)return;let e=w();m.textContent=e?`ログイン済み`:`未ログイン`,p.textContent=e?`Googleからログアウト`:`Googleにログイン`},C=async()=>{if(!h.checked){v.style.display=`none`,v.innerHTML=``;return}if(v.style.display=`block`,!w()){v.textContent=`Google Drive 保存先リンクはログイン後に表示されます。`;return}try{let e=await c();if(!e){v.textContent=`Google Drive 保存先ファイルはまだ作成されていません。`;return}v.innerHTML=`Google Drive 保存先: <a href="${e}" target="_blank" rel="noopener noreferrer">バックアップファイルを開く</a>`}catch{v.textContent=`Google Drive 保存先リンクの取得に失敗しました。`}};S(),C(),p.addEventListener(`click`,async()=>{if(w()){g(),S(),u.notifyGoogleSessionStateChanged(),await C(),t.hide();return}let e=r.value.trim();if(!e){t.show(`先に OAuth 2.0 Client ID を入力してからログインしてください。`);return}try{let n=await I();if(await k({clientId:e,todoCalendarId:n.todoCalendarId,doneCalendarId:d.value.trim()||n.doneCalendarId}),await f(y,!0),S(),u.notifyGoogleSessionStateChanged(),h.checked){let e=await x();e!==null&&!T.taskSyncDirty&&(T.tasks=e.tasks,e.updatedAt&&(T.tasksLastUpdatedAt=e.updatedAt),T.taskSyncState={baseRevision:e.revision,baseDriveVersion:e.version,fileId:e.fileId,dirty:!1,baseTasks:e.tasks})}u.notifyGoogleLoginSucceeded(),await C(),t.hide()}catch(e){S(),u.notifyGoogleSessionStateChanged(),await C();let n=e instanceof Error?e.message:`Googleログインに失敗しました。`;t.show(n)}}),s?.addEventListener(`click`,async()=>{if(!r.value.trim()){t.show(`OAuth 2.0 Client ID を入力してからカレンダー一覧を取得してください。`);return}try{let e=await I();await k({clientId:r.value,todoCalendarId:e.todoCalendarId,doneCalendarId:e.doneCalendarId});let n=await j(),i=[`<option value="">選択してください</option>`].concat(n.map(e=>`<option value="${e.id}">${e.summary} (${e.id})</option>`)).join(``);a.innerHTML=i,o.innerHTML=i,a.value=e.todoCalendarId,o.value=e.doneCalendarId,t.hide()}catch(e){let n=l(e),r=e instanceof Error?e.message:`一覧取得に失敗しました。`;if(n){t.show(r);return}alert(r)}}),o.addEventListener(`change`,()=>{b=!0}),h.addEventListener(`change`,()=>{C()}),i.addEventListener(`submit`,async e=>{e.preventDefault();try{let e=d.value.trim()||(b?o.value.trim():``);await k({clientId:r.value,todoCalendarId:a.value,doneCalendarId:e}),d.value=e,T.googleDriveSyncEnabled=h.checked,_&&(_.style.display=`inline`,setTimeout(()=>{_.style.display=`none`},2500)),S(),await C()}catch{alert(`設定保存に失敗しました。`)}})}}})),z,B=a((()=>{m(),v(),z=class e{static excludeGoogleTodoTasks(e){return e.filter(e=>e.sourceType!==`google-todo`)}static render(){return`
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
    `}static setup(t,n){let r=t.querySelector(`#fileInput`),i=t.querySelector(`#exportJSONBtn`),a=t.querySelector(`#jsonExportFormatToggle`),o=t.querySelector(`#importJSONBtn`),s=t.querySelector(`#copyJSONBtn`),c=t.querySelector(`#pasteJSONBtn`),l=t.querySelector(`#resetBtn`);!r||!i||!a||!o||!s||!c||!l||(i.addEventListener(`click`,()=>{e.exportJSON(n,e.getExportFormat(a))}),o.addEventListener(`click`,()=>{r.click()}),r.addEventListener(`change`,t=>{e.importJSONFromFile(t,n)}),s.addEventListener(`click`,async()=>{await e.copyJSONToClipboard(n,e.getExportFormat(a))}),c.addEventListener(`click`,async()=>{await e.importJSONFromClipboard(n)}),l.addEventListener(`click`,async()=>{await e.resetToDefault(n)}))}static getExportFormat(e){return e.checked?`drive`:`array`}static extractTasksFromJson(e){if(Array.isArray(e))return e;if(!e||typeof e!=`object`)return null;let t=e;return Array.isArray(t.tasks)?t.tasks:null}static async updateTasksFromJson(t,n){let r=e.extractTasksFromJson(t);return r?(n.tasks=e.excludeGoogleTodoTasks(r).map(e=>new i(e)),await n.saveTasksWithSync(!0),!0):!1}static importJSONFromFile(t,n){let r=t.target,i=r.files?.[0];if(!i)return;let a=new FileReader;a.onload=async t=>{try{let r=String(t.target?.result||``),i=JSON.parse(r);if(!await e.updateTasksFromJson(i,n)){alert(`無効なJSONフォーマットです。`);return}alert(`インポートが完了しました。`)}catch{alert(`JSONの解析に失敗しました。`)}},a.readAsText(i),r.value=``}static async importJSONFromClipboard(t){if(!navigator.clipboard||!window.isSecureContext){alert(`この環境ではクリップボード操作が利用できません。`);return}try{let n=await navigator.clipboard.readText(),r=JSON.parse(n);if(!await e.updateTasksFromJson(r,t)){alert(`無効なJSONフォーマットです。`);return}alert(`クリップボードからインポートしました。`)}catch{alert(`クリップボードの読み込みまたはJSON解析に失敗しました。`)}}static async copyJSONToClipboard(t,n){if(!navigator.clipboard||!window.isSecureContext){alert(`この環境ではクリップボード操作が利用できません。`);return}try{await navigator.clipboard.writeText(JSON.stringify(e.createExportPayload(t,n),null,2)),alert(`JSONをクリップボードにコピーしました。`)}catch{alert(`クリップボードへのコピーに失敗しました。`)}}static createExportPayload(t,n){let r=e.excludeGoogleTodoTasks(t.tasks);return n===`array`?r:p(r)}static exportJSON(t,n){let r=JSON.stringify(e.createExportPayload(t,n),null,2),i=`data:text/json;charset=utf-8,`+encodeURIComponent(r),a=document.createElement(`a`);a.setAttribute(`href`,i),a.setAttribute(`download`,n===`drive`?`tanjoin_done_task_sync_backup_v1.json`:`task_settings_and_history.json`),document.body.appendChild(a),a.click(),a.remove()}static async resetToDefault(e){if(confirm(`すべてのカスタム設定と履歴を削除し、デフォルトのtasks.jsonから再読み込みしますか？`))try{await e.resetToDefault(),alert(`初期設定に戻しました。`)}catch{alert(`初期設定への復元に失敗しました。`)}}}})),V,H=a((()=>{o(),V=class{static render(){return`
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
    `}static setup(e){let t=e.querySelector(`#overdueReferenceDateInput`),n=e.querySelector(`#overdueReferenceDateForm`),r=e.querySelector(`#displaySaveStatus`);!t||!n||(t.value=T.overdueReferenceDate,n.addEventListener(`submit`,e=>{e.preventDefault(),t.value&&(T.overdueReferenceDate=t.value,r&&(r.style.display=`inline`,setTimeout(()=>{r.style.display=`none`},2500)))}))}}})),U,W=a((()=>{o(),A(),N(),U=class e{static render(){return`
      ${e.renderSound()}
      ${e.renderNotification()}
    `}static renderSound(){return`
      <div class="data-box" id="soundSection">
        <h3 class="group-title">通知音設定</h3>
        <p class="setting-desc">通知で使うサウンドを選択します。</p>
        <div class="setting-row">
          <label for="notificationSoundSelect">通知音</label>
          <select id="notificationSoundSelect" class="setting-input">
            ${D.options.map(e=>`<option value="${e.value}">${e.label}</option>`).join(``)}
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
    `}static setup(t){e.setupSound(t),e.setupNotification(t)}static setupSound(e){let t=e.querySelector(`#notificationSoundSelect`),n=e.querySelector(`#playSoundTestBtn`);t&&(t.value=T.notificationSound,t.addEventListener(`change`,()=>{T.notificationSound=t.value})),n&&n.addEventListener(`click`,()=>{D.playSelected()})}static setupNotification(e){let t=e.querySelector(`#notificationSection`),n=e.querySelector(`#notificationEnableBtn`),r=e.querySelector(`#sendTestNotificationBtn`);if(!P.isSupported()){t&&(t.style.display=`none`);return}P.syncTestButtons(n,r),n&&n.addEventListener(`click`,async()=>{let e=await P.requestPermission();P.syncTestButtons(n,r),e===`granted`&&alert(`通知を有効にしました。`)}),r&&r.addEventListener(`click`,()=>{P.sendTestNotification()||alert(`先に通知を有効にしてください。`)})}}})),G,K=a((()=>{o(),G=class e{static render(){return`
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
    `}static applyTheme(e){let t=document.documentElement;if(e===`system`){t.removeAttribute(`data-theme`);return}t.setAttribute(`data-theme`,e)}static setup(t){let n=T.appTheme;e.applyTheme(n);let r=t.querySelector(`input[name="theme"][value="${n}"]`);r&&(r.checked=!0),t.querySelectorAll(`input[name="theme"]`).forEach(t=>{t.addEventListener(`change`,()=>{let n=t.value;T.appTheme=n,e.applyTheme(n)})})}}}));r((()=>{n(),E(),e(),C(),M(),R(),B(),H(),W(),K(),d(),_();var r=class extends HTMLElement{_taskRepository=new F;_googleAuthAlertController=null;static get NAME(){return`done-settings`}connectedCallback(){this.render(),this.setup()}render(){this.innerHTML=`
      <main>
        ${b({statusId:`googleAuthStatus`,messageId:`googleAuthStatusMessage`,actionButtonId:`googleAuthStatusActionBtn`,dismissButtonId:`googleAuthStatusDismissBtn`,actionLabel:`Google にログイン`,dismissAriaLabel:`Google認証通知を閉じる`})}
        ${L.render()}
        ${G.render()}
        ${V.render()}
        ${U.render()}
        ${z.render()}
      </main>
    `}async setup(){u.startGoogleSessionKeepAlive(),this._taskRepository.hydrateFromLocal(),this._googleAuthAlertController=new S({root:this,ids:{statusId:`googleAuthStatus`,messageId:`googleAuthStatusMessage`,actionButtonId:`googleAuthStatusActionBtn`,dismissButtonId:`googleAuthStatusDismissBtn`},onAction:()=>{let e=this.querySelector(`#googleLoginBtn`);e&&e.click()}}),this._googleAuthAlertController.setup(),G.setup(this),L.setup(this,this._googleAuthAlertController),V.setup(this),U.setup(this),z.setup(this,this._taskRepository),document.addEventListener(F.EVENT_GOOGLE_RELOGIN_NOTICE,e=>{let t=e;this._googleAuthAlertController?.show(t.detail.message)}),document.addEventListener(u.EVENT_GOOGLE_RELOGIN_REQUIRED,()=>{this._googleAuthAlertController?.show(`Google認証の有効期限が切れました。Google に再ログインしてください。`)}),document.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`a[href]`);n&&n.getAttribute(`href`)===`index.html`&&F.markNextIndexNavigationFromSettings()}),this._taskRepository.refreshFromCloudIfNeeded()}};customElements.get(r.NAME)||customElements.define(r.NAME,r),document.addEventListener(`DOMContentLoaded`,async()=>{s();let e=document.querySelector(`.container`);if(!e)return;let n=document.createElement(h.NAME);n.active=`settings`,e.appendChild(n);let i=document.createElement(r.NAME);e.appendChild(i);let a=document.createElement(t.NAME);e.appendChild(a)})}))();