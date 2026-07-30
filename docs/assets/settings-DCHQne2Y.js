import{a as e,c as t,d as n,f as r,i,n as a,o,p as s,r as c,s as l,t as u}from"./local-storage-manager-3odDDci4.js";import{a as d,b as f,c as p,f as m,h,i as g,l as _,m as v,n as y,o as b,p as x,r as S,s as C,t as w,u as T,v as E,x as D,y as O}from"./task-repository-DROs3hIu.js";var k,A,j=s((()=>{a(),D(),g(),m(),k=[`https://www.googleapis.com/auth/calendar`,`https://www.googleapis.com/auth/calendar.events`,`https://www.googleapis.com/auth/drive.file`],A=class{static render(){return`
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
    `}static setup(e){let t=e.querySelector(`#calendarSection`),n=e.querySelector(`#googleClientIdInput`),r=e.querySelector(`#calendarSettingForm`),i=e.querySelector(`#todoCalendarSelect`),a=e.querySelector(`#doneCalendarSelect`),o=e.querySelector(`#loadCalendarListBtn`),s=e.querySelector(`#doneCalendarManualInput`),c=e.querySelector(`#googleLoginBtn`),l=e.querySelector(`#googleLoginStatus`),p=e.querySelector(`#googleDriveSyncToggle`),m=e.querySelector(`#googleSaveStatus`),g=e.querySelector(`#googleDriveLinkStatus`),_=!1;if(!u.supportsLocalStorage()){t&&(t.style.display=`none`);return}if(!n||!r||!i||!a||!s||!c||!l||!g||!p)return;v().then(e=>{n.value=e.clientId,e.todoCalendarId&&(i.innerHTML=`<option value="${e.todoCalendarId}">${e.todoCalendarId}</option>`),s.value=e.doneCalendarId}),p.checked=u.googleDriveSyncEnabled,s.value=u.calendarTargetId;let y=()=>{if(!l)return;let e=f();l.textContent=e?`ログイン済み`:`未ログイン`,c.textContent=e?`Googleからログアウト`:`Googleにログイン`},C=async()=>{if(!p.checked){g.style.display=`none`,g.innerHTML=``;return}if(g.style.display=`block`,!f()){g.textContent=`Google Drive 保存先リンクはログイン後に表示されます。`;return}try{let e=await S();if(!e){g.textContent=`Google Drive 保存先ファイルはまだ作成されていません。`;return}g.innerHTML=`Google Drive 保存先: <a href="${e}" target="_blank" rel="noopener noreferrer">バックアップファイルを開く</a>`}catch{g.textContent=`Google Drive 保存先リンクの取得に失敗しました。`}};y(),C(),c.addEventListener(`click`,async()=>{if(f()){E(),y(),await C();return}let e=n.value.trim();if(!e){alert(`先に OAuth 2.0 Client ID を入力してください。`);return}try{let t=await v();if(await h({clientId:e,todoCalendarId:t.todoCalendarId,doneCalendarId:s.value.trim()||t.doneCalendarId}),await O(k,!0),y(),p.checked){let e=await d();e===null?await b(u.tasks):u.tasks=e}await C()}catch(e){y(),await C();let t=e instanceof Error?e.message:`Googleログインに失敗しました。`;alert(t)}}),o?.addEventListener(`click`,async()=>{if(!n.value.trim()){alert(`OAuth 2.0 Client ID を入力してください。`);return}try{let e=await v();await h({clientId:n.value,todoCalendarId:e.todoCalendarId,doneCalendarId:e.doneCalendarId});let t=await x(),r=[`<option value="">選択してください</option>`].concat(t.map(e=>`<option value="${e.id}">${e.summary} (${e.id})</option>`)).join(``);i.innerHTML=r,a.innerHTML=r,i.value=e.todoCalendarId,a.value=e.doneCalendarId}catch(e){let t=e instanceof Error?e.message:`一覧取得に失敗しました。`;alert(t)}}),a.addEventListener(`change`,()=>{_=!0}),p.addEventListener(`change`,()=>{C()}),r.addEventListener(`submit`,async e=>{e.preventDefault();try{let e=s.value.trim()||(_?a.value.trim():``);await h({clientId:n.value,todoCalendarId:i.value,doneCalendarId:e}),s.value=e,u.googleDriveSyncEnabled=p.checked,p.checked&&f()&&await b(u.tasks),m&&(m.style.display=`inline`,setTimeout(()=>{m.style.display=`none`},2500)),y(),await C()}catch{alert(`設定保存に失敗しました。`)}})}}})),M,N=s((()=>{t(),M=class e{static excludeGoogleTodoTasks(e){return e.filter(e=>e.sourceType!==`google-todo`)}static render(){return`
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
    `}static setup(t,n){let r=t.querySelector(`#fileInput`),i=t.querySelector(`#exportJSONBtn`),a=t.querySelector(`#importJSONBtn`),o=t.querySelector(`#copyJSONBtn`),s=t.querySelector(`#pasteJSONBtn`),c=t.querySelector(`#resetBtn`);!r||!i||!a||!o||!s||!c||(i.addEventListener(`click`,()=>{e.exportJSON(n)}),a.addEventListener(`click`,()=>{r.click()}),r.addEventListener(`change`,t=>{e.importJSONFromFile(t,n)}),o.addEventListener(`click`,async()=>{await e.copyJSONToClipboard(n)}),s.addEventListener(`click`,async()=>{await e.importJSONFromClipboard(n)}),c.addEventListener(`click`,async()=>{await e.resetToDefault(n)}))}static updateTasksFromRawArray(t,n){return Array.isArray(t)?(n.tasks=e.excludeGoogleTodoTasks(t).map(e=>new l(e)),n.saveTasks(),!0):!1}static importJSONFromFile(t,n){let r=t.target,i=r.files?.[0];if(!i)return;let a=new FileReader;a.onload=t=>{try{let r=String(t.target?.result||``),i=JSON.parse(r);if(!e.updateTasksFromRawArray(i,n)){alert(`無効なJSONフォーマットです。`);return}alert(`インポートが完了しました。`)}catch{alert(`JSONの解析に失敗しました。`)}},a.readAsText(i),r.value=``}static async importJSONFromClipboard(t){if(!navigator.clipboard||!window.isSecureContext){alert(`この環境ではクリップボード操作が利用できません。`);return}try{let n=await navigator.clipboard.readText(),r=JSON.parse(n);if(!e.updateTasksFromRawArray(r,t)){alert(`無効なJSONフォーマットです。`);return}alert(`クリップボードからインポートしました。`)}catch{alert(`クリップボードの読み込みまたはJSON解析に失敗しました。`)}}static async copyJSONToClipboard(t){if(!navigator.clipboard||!window.isSecureContext){alert(`この環境ではクリップボード操作が利用できません。`);return}try{let n=e.excludeGoogleTodoTasks(t.tasks);await navigator.clipboard.writeText(JSON.stringify(n,null,2)),alert(`JSONをクリップボードにコピーしました。`)}catch{alert(`クリップボードへのコピーに失敗しました。`)}}static exportJSON(t){let n=e.excludeGoogleTodoTasks(t.tasks),r=JSON.stringify(n,null,2),i=`data:text/json;charset=utf-8,`+encodeURIComponent(r),a=document.createElement(`a`);a.setAttribute(`href`,i),a.setAttribute(`download`,`task_settings_and_history.json`),document.body.appendChild(a),a.click(),a.remove()}static async resetToDefault(e){if(confirm(`すべてのカスタム設定と履歴を削除し、デフォルトのtasks.jsonから再読み込みしますか？`))try{await e.resetToDefault(),alert(`初期設定に戻しました。`)}catch{alert(`初期設定への復元に失敗しました。`)}}}})),P,F=s((()=>{a(),P=class{static render(){return`
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
    `}static setup(e){let t=e.querySelector(`#overdueReferenceDateInput`),n=e.querySelector(`#overdueReferenceDateForm`),r=e.querySelector(`#displaySaveStatus`);!t||!n||(t.value=u.overdueReferenceDate,n.addEventListener(`submit`,e=>{e.preventDefault(),t.value&&(u.overdueReferenceDate=t.value,r&&(r.style.display=`inline`,setTimeout(()=>{r.style.display=`none`},2500)))}))}}})),I,L=s((()=>{a(),p(),T(),I=class e{static render(){return`
      ${e.renderSound()}
      ${e.renderNotification()}
    `}static renderSound(){return`
      <div class="data-box" id="soundSection">
        <h3 class="group-title">通知音設定</h3>
        <p class="setting-desc">通知で使うサウンドを選択します。</p>
        <div class="setting-row">
          <label for="notificationSoundSelect">通知音</label>
          <select id="notificationSoundSelect" class="setting-input">
            ${_.options.map(e=>`<option value="${e.value}">${e.label}</option>`).join(``)}
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
    `}static setup(t){e.setupSound(t),e.setupNotification(t)}static setupSound(e){let t=e.querySelector(`#notificationSoundSelect`),n=e.querySelector(`#playSoundTestBtn`);t&&(t.value=u.notificationSound,t.addEventListener(`change`,()=>{u.notificationSound=t.value})),n&&n.addEventListener(`click`,()=>{_.playSelected()})}static setupNotification(e){let t=e.querySelector(`#notificationSection`),n=e.querySelector(`#notificationEnableBtn`),r=e.querySelector(`#sendTestNotificationBtn`);if(!C.isSupported()){t&&(t.style.display=`none`);return}C.syncTestButtons(n,r),n&&n.addEventListener(`click`,async()=>{let e=await C.requestPermission();C.syncTestButtons(n,r),e===`granted`&&alert(`通知を有効にしました。`)}),r&&r.addEventListener(`click`,()=>{C.sendTestNotification()||alert(`先に通知を有効にしてください。`)})}}})),R,z=s((()=>{a(),R=class e{static render(){return`
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
    `}static applyTheme(e){let t=document.documentElement;if(e===`system`){t.removeAttribute(`data-theme`);return}t.setAttribute(`data-theme`,e)}static setup(t){let n=u.appTheme;e.applyTheme(n);let r=t.querySelector(`input[name="theme"][value="${n}"]`);r&&(r.checked=!0),t.querySelectorAll(`input[name="theme"]`).forEach(t=>{t.addEventListener(`change`,()=>{let n=t.value;u.appTheme=n,e.applyTheme(n)})})}}}));r((()=>{n(),o(),i(),y(),j(),N(),F(),L(),z();var t=class extends HTMLElement{_taskRepository=new w;static get NAME(){return`done-settings`}connectedCallback(){this.render(),this.setup()}render(){this.innerHTML=`
      <main>
        ${A.render()}
        ${R.render()}
        ${P.render()}
        ${I.render()}
        ${M.render()}
      </main>
    `}async setup(){this._taskRepository.hydrateFromLocal(),R.setup(this),A.setup(this),P.setup(this),I.setup(this),M.setup(this,this._taskRepository),document.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`a[href]`);n&&n.getAttribute(`href`)===`index.html`&&w.markNextIndexNavigationFromSettings()}),this._taskRepository.refreshFromCloudIfNeeded()}};customElements.get(t.NAME)||customElements.define(t.NAME,t),document.addEventListener(`DOMContentLoaded`,async()=>{let n=document.querySelector(`.container`);if(!n)return;let r=document.createElement(c.NAME);r.active=`settings`,n.appendChild(r);let i=document.createElement(t.NAME);n.appendChild(i);let a=document.createElement(e.NAME);n.appendChild(a)})}))();