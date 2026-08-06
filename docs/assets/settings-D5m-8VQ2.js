import{A as e,C as t,E as n,S as r,T as i,a,b as o,c as s,f as c,h as l,i as u,j as d,k as f,l as p,m,n as h,o as g,p as _,r as v,s as y,t as b,u as x,w as S,x as C,y as w}from"./google-auth-alert-Cc1dCsWa.js";import{a as T,c as E,d as D,i as O,l as k,n as A,o as j,r as M,t as N,u as P}from"./task-repository-ByFxA0O9.js";function F(e,t){let n=new Map(t.map(e=>[e.id,e]));return[...e.map(e=>{let t=n.get(e.id);return t?(n.delete(e.id),{...t,...e,history:{...t.history||{},...e.history||{}}}):e}),...n.values()]}var I=d((()=>{})),L,R,z=d((()=>{o(),m(),y(),I(),E(),L=[`https://www.googleapis.com/auth/calendar`,`https://www.googleapis.com/auth/calendar.events`,`https://www.googleapis.com/auth/drive.file`],R=class{static render(){return`
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
    `}static setup(e,t){let n=e.querySelector(`#calendarSection`),r=e.querySelector(`#googleClientIdInput`),i=e.querySelector(`#calendarSettingForm`),a=e.querySelector(`#todoCalendarSelect`),o=e.querySelector(`#doneCalendarSelect`),u=e.querySelector(`#loadCalendarListBtn`),d=e.querySelector(`#doneCalendarManualInput`),f=e.querySelector(`#googleLoginBtn`),m=e.querySelector(`#googleLoginStatus`),h=e.querySelector(`#googleDriveSyncToggle`),v=e.querySelector(`#googleSaveStatus`),y=e.querySelector(`#googleDriveLinkStatus`),b=!1;if(!w.supportsLocalStorage()){n&&(n.style.display=`none`);return}if(!r||!i||!a||!o||!d||!f||!m||!y||!h)return;P().then(e=>{r.value=e.clientId,e.todoCalendarId&&(a.innerHTML=`<option value="${e.todoCalendarId}">${e.todoCalendarId}</option>`),d.value=e.doneCalendarId}),h.checked=w.googleDriveSyncEnabled,d.value=w.calendarTargetId;let S=()=>{if(!m)return;let e=_();m.textContent=e?`ログイン済み`:`未ログイン`,f.textContent=e?`Googleからログアウト`:`Googleにログイン`},C=async()=>{if(!h.checked){y.style.display=`none`,y.innerHTML=``;return}if(y.style.display=`block`,!_()){y.textContent=`Google Drive 保存先リンクはログイン後に表示されます。`;return}try{let e=await g();if(!e){y.textContent=`Google Drive 保存先ファイルはまだ作成されていません。`;return}y.innerHTML=`Google Drive 保存先: <a href="${e}" target="_blank" rel="noopener noreferrer">バックアップファイルを開く</a>`}catch{y.textContent=`Google Drive 保存先リンクの取得に失敗しました。`}};S(),C(),f.addEventListener(`click`,async()=>{if(_()){x(),S(),await C(),t.hide();return}let e=r.value.trim();if(!e){t.show(`先に OAuth 2.0 Client ID を入力してからログインしてください。`);return}try{await c(L,!0);let n=await P();if(await D({clientId:e,todoCalendarId:n.todoCalendarId,doneCalendarId:d.value.trim()||n.doneCalendarId}),S(),h.checked){let e=await s();if(e!==null){let t=F(w.tasks,e.tasks);w.tasks=t,await p(t,{forceOverwrite:!0})}else await p(w.tasks)}await C(),t.hide()}catch(e){S(),await C();let n=e instanceof Error?e.message:`Googleログインに失敗しました。`;t.show(n)}}),u?.addEventListener(`click`,async()=>{if(!r.value.trim()){t.show(`OAuth 2.0 Client ID を入力してからカレンダー一覧を取得してください。`);return}try{let e=await P();await D({clientId:r.value,todoCalendarId:e.todoCalendarId,doneCalendarId:e.doneCalendarId});let n=await k(),i=[`<option value="">選択してください</option>`].concat(n.map(e=>`<option value="${e.id}">${e.summary} (${e.id})</option>`)).join(``);a.innerHTML=i,o.innerHTML=i,a.value=e.todoCalendarId,o.value=e.doneCalendarId,t.hide()}catch(e){let n=l(e),r=e instanceof Error?e.message:`一覧取得に失敗しました。`;if(n){t.show(r);return}alert(r)}}),o.addEventListener(`change`,()=>{b=!0}),h.addEventListener(`change`,()=>{C()}),i.addEventListener(`submit`,async e=>{e.preventDefault();try{let e=d.value.trim()||(b?o.value.trim():``);await D({clientId:r.value,todoCalendarId:a.value,doneCalendarId:e}),d.value=e,w.googleDriveSyncEnabled=h.checked,v&&(v.style.display=`inline`,setTimeout(()=>{v.style.display=`none`},2500)),S(),await C()}catch{alert(`設定保存に失敗しました。`)}})}}})),B,V=d((()=>{n(),B=class e{static excludeGoogleTodoTasks(e){return e.filter(e=>e.sourceType!==`google-todo`)}static render(){return`
      <div class="data-box">
        <h3 class="group-title">データ管理</h3>
        <p class="setting-desc">
          タスク設定や履歴をJSONとしてエクスポート/インポートできます。
        </p>
        <div class="btn-group-wrap btn-group-vertical">
          <button id="exportJSONBtn" class="btn btn-cancel">データエクスポート</button>
          <button id="importJSONBtn" class="btn btn-cancel">データインポート</button>
          <button id="copyJSONBtn" class="btn btn-cancel">クリップボードへコピー</button>
          <button id="pasteJSONBtn" class="btn btn-cancel">クリップボードから読み込み</button>
          <button id="resetBtn" class="btn btn-action" style="background-color: #ef4444;">全て初期状態に戻す</button>
        </div>
        <input type="file" id="fileInput" accept=".json" />
      </div>
    `}static setup(t,n){let r=t.querySelector(`#fileInput`),i=t.querySelector(`#exportJSONBtn`),a=t.querySelector(`#importJSONBtn`),o=t.querySelector(`#copyJSONBtn`),s=t.querySelector(`#pasteJSONBtn`),c=t.querySelector(`#resetBtn`);!r||!i||!a||!o||!s||!c||(i.addEventListener(`click`,()=>{e.exportJSON(n)}),a.addEventListener(`click`,()=>{r.click()}),r.addEventListener(`change`,t=>{e.importJSONFromFile(t,n)}),o.addEventListener(`click`,async()=>{await e.copyJSONToClipboard(n)}),s.addEventListener(`click`,async()=>{await e.importJSONFromClipboard(n)}),c.addEventListener(`click`,async()=>{await e.resetToDefault(n)}))}static async updateTasksFromRawArray(t,n){return Array.isArray(t)?(n.tasks=e.excludeGoogleTodoTasks(t).map(e=>new i(e)),await n.saveTasksWithSync(!0),!0):!1}static importJSONFromFile(t,n){let r=t.target,i=r.files?.[0];if(!i)return;let a=new FileReader;a.onload=async t=>{try{let r=String(t.target?.result||``),i=JSON.parse(r);if(!await e.updateTasksFromRawArray(i,n)){alert(`無効なJSONフォーマットです。`);return}alert(`インポートが完了しました。`)}catch{alert(`JSONの解析に失敗しました。`)}},a.readAsText(i),r.value=``}static async importJSONFromClipboard(t){if(!navigator.clipboard||!window.isSecureContext){alert(`この環境ではクリップボード操作が利用できません。`);return}try{let n=await navigator.clipboard.readText(),r=JSON.parse(n);if(!await e.updateTasksFromRawArray(r,t)){alert(`無効なJSONフォーマットです。`);return}alert(`クリップボードからインポートしました。`)}catch{alert(`クリップボードの読み込みまたはJSON解析に失敗しました。`)}}static async copyJSONToClipboard(t){if(!navigator.clipboard||!window.isSecureContext){alert(`この環境ではクリップボード操作が利用できません。`);return}try{let n=e.excludeGoogleTodoTasks(t.tasks);await navigator.clipboard.writeText(JSON.stringify(n,null,2)),alert(`JSONをクリップボードにコピーしました。`)}catch{alert(`クリップボードへのコピーに失敗しました。`)}}static exportJSON(t){let n=e.excludeGoogleTodoTasks(t.tasks),r=JSON.stringify(n,null,2),i=`data:text/json;charset=utf-8,`+encodeURIComponent(r),a=document.createElement(`a`);a.setAttribute(`href`,i),a.setAttribute(`download`,`task_settings_and_history.json`),document.body.appendChild(a),a.click(),a.remove()}static async resetToDefault(e){if(confirm(`すべてのカスタム設定と履歴を削除し、デフォルトのtasks.jsonから再読み込みしますか？`))try{await e.resetToDefault(),alert(`初期設定に戻しました。`)}catch{alert(`初期設定への復元に失敗しました。`)}}}})),H,U=d((()=>{o(),H=class{static render(){return`
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
    `}static setup(e){let t=e.querySelector(`#overdueReferenceDateInput`),n=e.querySelector(`#overdueReferenceDateForm`),r=e.querySelector(`#displaySaveStatus`);!t||!n||(t.value=w.overdueReferenceDate,n.addEventListener(`submit`,e=>{e.preventDefault(),t.value&&(w.overdueReferenceDate=t.value,r&&(r.style.display=`inline`,setTimeout(()=>{r.style.display=`none`},2500)))}))}}})),W,G=d((()=>{o(),O(),j(),W=class e{static render(){return`
      ${e.renderSound()}
      ${e.renderNotification()}
    `}static renderSound(){return`
      <div class="data-box" id="soundSection">
        <h3 class="group-title">通知音設定</h3>
        <p class="setting-desc">通知で使うサウンドを選択します。</p>
        <div class="setting-row">
          <label for="notificationSoundSelect">通知音</label>
          <select id="notificationSoundSelect" class="setting-input">
            ${T.options.map(e=>`<option value="${e.value}">${e.label}</option>`).join(``)}
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
    `}static setup(t){e.setupSound(t),e.setupNotification(t)}static setupSound(e){let t=e.querySelector(`#notificationSoundSelect`),n=e.querySelector(`#playSoundTestBtn`);t&&(t.value=w.notificationSound,t.addEventListener(`change`,()=>{w.notificationSound=t.value})),n&&n.addEventListener(`click`,()=>{T.playSelected()})}static setupNotification(e){let t=e.querySelector(`#notificationSection`),n=e.querySelector(`#notificationEnableBtn`),r=e.querySelector(`#sendTestNotificationBtn`);if(!M.isSupported()){t&&(t.style.display=`none`);return}M.syncTestButtons(n,r),n&&n.addEventListener(`click`,async()=>{let e=await M.requestPermission();M.syncTestButtons(n,r),e===`granted`&&alert(`通知を有効にしました。`)}),r&&r.addEventListener(`click`,()=>{M.sendTestNotification()||alert(`先に通知を有効にしてください。`)})}}})),K,q=d((()=>{o(),K=class e{static render(){return`
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
    `}static applyTheme(e){let t=document.documentElement;if(e===`system`){t.removeAttribute(`data-theme`);return}t.setAttribute(`data-theme`,e)}static setup(t){let n=w.appTheme;e.applyTheme(n);let r=t.querySelector(`input[name="theme"][value="${n}"]`);r&&(r.checked=!0),t.querySelectorAll(`input[name="theme"]`).forEach(t=>{t.addEventListener(`change`,()=>{let n=t.value;w.appTheme=n,e.applyTheme(n)})})}}}));e((()=>{f(),S(),r(),A(),z(),V(),U(),G(),q(),a(),h();var e=class extends HTMLElement{_taskRepository=new N;_googleAuthAlertController=null;static get NAME(){return`done-settings`}connectedCallback(){this.render(),this.setup()}render(){this.innerHTML=`
      <main>
        ${v({statusId:`googleAuthStatus`,messageId:`googleAuthStatusMessage`,actionButtonId:`googleAuthStatusActionBtn`,dismissButtonId:`googleAuthStatusDismissBtn`,actionLabel:`Google にログイン`,dismissAriaLabel:`Google認証通知を閉じる`})}
        ${R.render()}
        ${K.render()}
        ${H.render()}
        ${W.render()}
        ${B.render()}
      </main>
    `}async setup(){u.startGoogleSessionKeepAlive(),this._taskRepository.hydrateFromLocal(),this._googleAuthAlertController=new b({root:this,ids:{statusId:`googleAuthStatus`,messageId:`googleAuthStatusMessage`,actionButtonId:`googleAuthStatusActionBtn`,dismissButtonId:`googleAuthStatusDismissBtn`},onAction:()=>{let e=this.querySelector(`#googleLoginBtn`);e&&e.click()}}),this._googleAuthAlertController.setup(),K.setup(this),R.setup(this,this._googleAuthAlertController),H.setup(this),W.setup(this),B.setup(this,this._taskRepository),document.addEventListener(N.EVENT_GOOGLE_RELOGIN_NOTICE,e=>{let t=e;this._googleAuthAlertController?.show(t.detail.message)}),document.addEventListener(u.EVENT_GOOGLE_RELOGIN_REQUIRED,()=>{this._googleAuthAlertController?.show(`Google認証の有効期限が切れました。設定画面で再ログインしてください。`)}),document.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`a[href]`);n&&n.getAttribute(`href`)===`index.html`&&N.markNextIndexNavigationFromSettings()}),this._taskRepository.refreshFromCloudIfNeeded()}};customElements.get(e.NAME)||customElements.define(e.NAME,e),document.addEventListener(`DOMContentLoaded`,async()=>{let n=document.querySelector(`.container`);if(!n)return;let r=document.createElement(C.NAME);r.active=`settings`,n.appendChild(r);let i=document.createElement(e.NAME);n.appendChild(i);let a=document.createElement(t.NAME);n.appendChild(a)})}))();