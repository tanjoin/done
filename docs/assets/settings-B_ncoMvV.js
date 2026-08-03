import{D as e,E as t,S as n,T as r,_ as i,a,b as o,d as s,g as c,i as l,l as u,n as d,o as f,r as p,s as m,t as h,u as g,v as _,w as v,x as y,y as b}from"./session-manager-BfTIGMqr.js";import{a as x,c as S,d as C,i as w,l as T,n as E,o as D,r as O,t as k,u as A}from"./task-repository-Bd5koB7h.js";var j=r((e=>{Object.defineProperty(e,"__esModule",{value:!0}),e.mergeTasksFromGoogleDrive=t;function t(e,t){let n=new Map(t.map(e=>[e.id,e]));return[...e.map(e=>{let t=n.get(e.id);return t?(n.delete(e.id),{...t,...e,history:{...t.history||{},...e.history||{}}}):e}),...n.values()]}})),M,N,P,F=t((()=>{i(),s(),l(),M=j(),S(),N=[`https://www.googleapis.com/auth/calendar`,`https://www.googleapis.com/auth/calendar.events`,`https://www.googleapis.com/auth/drive.file`],P=class{static render(){return`
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
    `}static setup(e){let t=e.querySelector(`#calendarSection`),n=e.querySelector(`#googleClientIdInput`),r=e.querySelector(`#calendarSettingForm`),i=e.querySelector(`#todoCalendarSelect`),o=e.querySelector(`#doneCalendarSelect`),s=e.querySelector(`#loadCalendarListBtn`),l=e.querySelector(`#doneCalendarManualInput`),d=e.querySelector(`#googleLoginBtn`),h=e.querySelector(`#googleLoginStatus`),_=e.querySelector(`#googleDriveSyncToggle`),v=e.querySelector(`#googleSaveStatus`),y=e.querySelector(`#googleDriveLinkStatus`),b=!1;if(!c.supportsLocalStorage()){t&&(t.style.display=`none`);return}if(!n||!r||!i||!o||!l||!d||!h||!y||!_)return;A().then(e=>{n.value=e.clientId,e.todoCalendarId&&(i.innerHTML=`<option value="${e.todoCalendarId}">${e.todoCalendarId}</option>`),l.value=e.doneCalendarId}),_.checked=c.googleDriveSyncEnabled,l.value=c.calendarTargetId;let x=()=>{if(!h)return;let e=g();h.textContent=e?`ログイン済み`:`未ログイン`,d.textContent=e?`Googleからログアウト`:`Googleにログイン`},S=async()=>{if(!_.checked){y.style.display=`none`,y.innerHTML=``;return}if(y.style.display=`block`,!g()){y.textContent=`Google Drive 保存先リンクはログイン後に表示されます。`;return}try{let e=await p();if(!e){y.textContent=`Google Drive 保存先ファイルはまだ作成されていません。`;return}y.innerHTML=`Google Drive 保存先: <a href="${e}" target="_blank" rel="noopener noreferrer">バックアップファイルを開く</a>`}catch{y.textContent=`Google Drive 保存先リンクの取得に失敗しました。`}};x(),S(),d.addEventListener(`click`,async()=>{if(g()){m(),x(),await S();return}let e=n.value.trim();if(!e){alert(`先に OAuth 2.0 Client ID を入力してください。`);return}try{await u(N,!0);let t=await A();if(await C({clientId:e,todoCalendarId:t.todoCalendarId,doneCalendarId:l.value.trim()||t.doneCalendarId}),x(),_.checked){let e=await a();if(e!==null){let t=(0,M.mergeTasksFromGoogleDrive)(c.tasks,e.tasks);c.tasks=t,await f(t,{forceOverwrite:!0})}else await f(c.tasks)}await S()}catch(e){x(),await S();let t=e instanceof Error?e.message:`Googleログインに失敗しました。`;alert(t)}}),s?.addEventListener(`click`,async()=>{if(!n.value.trim()){alert(`OAuth 2.0 Client ID を入力してください。`);return}try{let e=await A();await C({clientId:n.value,todoCalendarId:e.todoCalendarId,doneCalendarId:e.doneCalendarId});let t=await T(),r=[`<option value="">選択してください</option>`].concat(t.map(e=>`<option value="${e.id}">${e.summary} (${e.id})</option>`)).join(``);i.innerHTML=r,o.innerHTML=r,i.value=e.todoCalendarId,o.value=e.doneCalendarId}catch(e){let t=e instanceof Error?e.message:`一覧取得に失敗しました。`;alert(t)}}),o.addEventListener(`change`,()=>{b=!0}),_.addEventListener(`change`,()=>{S()}),r.addEventListener(`submit`,async e=>{e.preventDefault();try{let e=l.value.trim()||(b?o.value.trim():``);await C({clientId:n.value,todoCalendarId:i.value,doneCalendarId:e}),l.value=e,c.googleDriveSyncEnabled=_.checked,v&&(v.style.display=`inline`,setTimeout(()=>{v.style.display=`none`},2500)),x(),await S()}catch{alert(`設定保存に失敗しました。`)}})}}})),I,L,R=t((()=>{I=e(n()),L=class e{static excludeGoogleTodoTasks(e){return e.filter(e=>e.sourceType!==`google-todo`)}static render(){return`
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
    `}static setup(t,n){let r=t.querySelector(`#fileInput`),i=t.querySelector(`#exportJSONBtn`),a=t.querySelector(`#importJSONBtn`),o=t.querySelector(`#copyJSONBtn`),s=t.querySelector(`#pasteJSONBtn`),c=t.querySelector(`#resetBtn`);!r||!i||!a||!o||!s||!c||(i.addEventListener(`click`,()=>{e.exportJSON(n)}),a.addEventListener(`click`,()=>{r.click()}),r.addEventListener(`change`,t=>{e.importJSONFromFile(t,n)}),o.addEventListener(`click`,async()=>{await e.copyJSONToClipboard(n)}),s.addEventListener(`click`,async()=>{await e.importJSONFromClipboard(n)}),c.addEventListener(`click`,async()=>{await e.resetToDefault(n)}))}static async updateTasksFromRawArray(t,n){return Array.isArray(t)?(n.tasks=e.excludeGoogleTodoTasks(t).map(e=>new I.default(e)),await n.saveTasksWithSync(!0),!0):!1}static importJSONFromFile(t,n){let r=t.target,i=r.files?.[0];if(!i)return;let a=new FileReader;a.onload=async t=>{try{let r=String(t.target?.result||``),i=JSON.parse(r);if(!await e.updateTasksFromRawArray(i,n)){alert(`無効なJSONフォーマットです。`);return}alert(`インポートが完了しました。`)}catch{alert(`JSONの解析に失敗しました。`)}},a.readAsText(i),r.value=``}static async importJSONFromClipboard(t){if(!navigator.clipboard||!window.isSecureContext){alert(`この環境ではクリップボード操作が利用できません。`);return}try{let n=await navigator.clipboard.readText(),r=JSON.parse(n);if(!await e.updateTasksFromRawArray(r,t)){alert(`無効なJSONフォーマットです。`);return}alert(`クリップボードからインポートしました。`)}catch{alert(`クリップボードの読み込みまたはJSON解析に失敗しました。`)}}static async copyJSONToClipboard(t){if(!navigator.clipboard||!window.isSecureContext){alert(`この環境ではクリップボード操作が利用できません。`);return}try{let n=e.excludeGoogleTodoTasks(t.tasks);await navigator.clipboard.writeText(JSON.stringify(n,null,2)),alert(`JSONをクリップボードにコピーしました。`)}catch{alert(`クリップボードへのコピーに失敗しました。`)}}static exportJSON(t){let n=e.excludeGoogleTodoTasks(t.tasks),r=JSON.stringify(n,null,2),i=`data:text/json;charset=utf-8,`+encodeURIComponent(r),a=document.createElement(`a`);a.setAttribute(`href`,i),a.setAttribute(`download`,`task_settings_and_history.json`),document.body.appendChild(a),a.click(),a.remove()}static async resetToDefault(e){if(confirm(`すべてのカスタム設定と履歴を削除し、デフォルトのtasks.jsonから再読み込みしますか？`))try{await e.resetToDefault(),alert(`初期設定に戻しました。`)}catch{alert(`初期設定への復元に失敗しました。`)}}}})),z,B=t((()=>{i(),z=class{static render(){return`
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
    `}static setup(e){let t=e.querySelector(`#overdueReferenceDateInput`),n=e.querySelector(`#overdueReferenceDateForm`),r=e.querySelector(`#displaySaveStatus`);!t||!n||(t.value=c.overdueReferenceDate,n.addEventListener(`submit`,e=>{e.preventDefault(),t.value&&(c.overdueReferenceDate=t.value,r&&(r.style.display=`inline`,setTimeout(()=>{r.style.display=`none`},2500)))}))}}})),V,H=t((()=>{i(),w(),D(),V=class e{static render(){return`
      ${e.renderSound()}
      ${e.renderNotification()}
    `}static renderSound(){return`
      <div class="data-box" id="soundSection">
        <h3 class="group-title">通知音設定</h3>
        <p class="setting-desc">通知で使うサウンドを選択します。</p>
        <div class="setting-row">
          <label for="notificationSoundSelect">通知音</label>
          <select id="notificationSoundSelect" class="setting-input">
            ${x.options.map(e=>`<option value="${e.value}">${e.label}</option>`).join(``)}
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
    `}static setup(t){e.setupSound(t),e.setupNotification(t)}static setupSound(e){let t=e.querySelector(`#notificationSoundSelect`),n=e.querySelector(`#playSoundTestBtn`);t&&(t.value=c.notificationSound,t.addEventListener(`change`,()=>{c.notificationSound=t.value})),n&&n.addEventListener(`click`,()=>{x.playSelected()})}static setupNotification(e){let t=e.querySelector(`#notificationSection`),n=e.querySelector(`#notificationEnableBtn`),r=e.querySelector(`#sendTestNotificationBtn`);if(!O.isSupported()){t&&(t.style.display=`none`);return}O.syncTestButtons(n,r),n&&n.addEventListener(`click`,async()=>{let e=await O.requestPermission();O.syncTestButtons(n,r),e===`granted`&&alert(`通知を有効にしました。`)}),r&&r.addEventListener(`click`,()=>{O.sendTestNotification()||alert(`先に通知を有効にしてください。`)})}}})),U,W=t((()=>{i(),U=class e{static render(){return`
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
    `}static applyTheme(e){let t=document.documentElement;if(e===`system`){t.removeAttribute(`data-theme`);return}t.setAttribute(`data-theme`,e)}static setup(t){let n=c.appTheme;e.applyTheme(n);let r=t.querySelector(`input[name="theme"][value="${n}"]`);r&&(r.checked=!0),t.querySelectorAll(`input[name="theme"]`).forEach(t=>{t.addEventListener(`change`,()=>{let n=t.value;c.appTheme=n,e.applyTheme(n)})})}}}));r((()=>{v(),y(),b(),E(),F(),R(),B(),H(),W(),d();var e=class extends HTMLElement{_taskRepository=new k;static get NAME(){return`done-settings`}connectedCallback(){this.render(),this.setup()}render(){this.innerHTML=`
      <main>
        ${P.render()}
        ${U.render()}
        ${z.render()}
        ${V.render()}
        ${L.render()}
      </main>
    `}async setup(){h.startGoogleSessionKeepAlive(),this._taskRepository.hydrateFromLocal(),U.setup(this),P.setup(this),z.setup(this),V.setup(this),L.setup(this,this._taskRepository),document.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`a[href]`);n&&n.getAttribute(`href`)===`index.html`&&k.markNextIndexNavigationFromSettings()}),this._taskRepository.refreshFromCloudIfNeeded()}};customElements.get(e.NAME)||customElements.define(e.NAME,e),document.addEventListener(`DOMContentLoaded`,async()=>{let t=document.querySelector(`.container`);if(!t)return;let n=document.createElement(_.NAME);n.active=`settings`,t.appendChild(n);let r=document.createElement(e.NAME);t.appendChild(r);let i=document.createElement(o.NAME);t.appendChild(i)})}))();