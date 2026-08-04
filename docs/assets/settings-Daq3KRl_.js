import{C as e,D as t,O as n,S as r,_ as i,a,b as o,c as s,d as c,f as l,i as u,k as d,n as f,o as p,r as m,s as h,t as g,u as _,v,w as y,x as b,y as x}from"./session-manager-3jDclcSU.js";import{a as S,c as C,d as w,i as T,l as E,n as D,o as O,r as k,t as A,u as j}from"./task-repository-4LIgp3OW.js";function M(e,t){let n=new Map(t.map(e=>[e.id,e]));return[...e.map(e=>{let t=n.get(e.id);return t?(n.delete(e.id),{...t,...e,history:{...t.history||{},...e.history||{}}}):e}),...n.values()]}var N=d((()=>{})),P,F,I=d((()=>{v(),l(),u(),N(),C(),P=[`https://www.googleapis.com/auth/calendar`,`https://www.googleapis.com/auth/calendar.events`,`https://www.googleapis.com/auth/drive.file`],F=class{static render(){return`
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
    `}static setup(e){let t=e.querySelector(`#calendarSection`),n=e.querySelector(`#googleClientIdInput`),r=e.querySelector(`#calendarSettingForm`),o=e.querySelector(`#todoCalendarSelect`),l=e.querySelector(`#doneCalendarSelect`),u=e.querySelector(`#loadCalendarListBtn`),d=e.querySelector(`#doneCalendarManualInput`),f=e.querySelector(`#googleLoginBtn`),g=e.querySelector(`#googleLoginStatus`),v=e.querySelector(`#googleDriveSyncToggle`),y=e.querySelector(`#googleSaveStatus`),b=e.querySelector(`#googleDriveLinkStatus`),x=!1;if(!i.supportsLocalStorage()){t&&(t.style.display=`none`);return}if(!n||!r||!o||!l||!d||!f||!g||!b||!v)return;j().then(e=>{n.value=e.clientId,e.todoCalendarId&&(o.innerHTML=`<option value="${e.todoCalendarId}">${e.todoCalendarId}</option>`),d.value=e.doneCalendarId}),v.checked=i.googleDriveSyncEnabled,d.value=i.calendarTargetId;let S=()=>{if(!g)return;let e=c();g.textContent=e?`ログイン済み`:`未ログイン`,f.textContent=e?`Googleからログアウト`:`Googleにログイン`},C=async()=>{if(!v.checked){b.style.display=`none`,b.innerHTML=``;return}if(b.style.display=`block`,!c()){b.textContent=`Google Drive 保存先リンクはログイン後に表示されます。`;return}try{let e=await m();if(!e){b.textContent=`Google Drive 保存先ファイルはまだ作成されていません。`;return}b.innerHTML=`Google Drive 保存先: <a href="${e}" target="_blank" rel="noopener noreferrer">バックアップファイルを開く</a>`}catch{b.textContent=`Google Drive 保存先リンクの取得に失敗しました。`}};S(),C(),document.addEventListener(h,()=>{S(),C()}),f.addEventListener(`click`,async()=>{if(c()){s(),S(),await C();return}let e=n.value.trim();if(!e){alert(`先に OAuth 2.0 Client ID を入力してください。`);return}try{await _(P,!0);let t=await j();if(await w({clientId:e,todoCalendarId:t.todoCalendarId,doneCalendarId:d.value.trim()||t.doneCalendarId}),S(),v.checked){let e=await a();if(e!==null){let t=M(i.tasks,e.tasks);i.tasks=t,await p(t,{forceOverwrite:!0})}else await p(i.tasks)}await C()}catch(e){S(),await C();let t=e instanceof Error?e.message:`Googleログインに失敗しました。`;alert(t)}}),u?.addEventListener(`click`,async()=>{if(!n.value.trim()){alert(`OAuth 2.0 Client ID を入力してください。`);return}try{let e=await j();await w({clientId:n.value,todoCalendarId:e.todoCalendarId,doneCalendarId:e.doneCalendarId});let t=await E(),r=[`<option value="">選択してください</option>`].concat(t.map(e=>`<option value="${e.id}">${e.summary} (${e.id})</option>`)).join(``);o.innerHTML=r,l.innerHTML=r,o.value=e.todoCalendarId,l.value=e.doneCalendarId}catch(e){let t=e instanceof Error?e.message:`一覧取得に失敗しました。`;alert(t)}}),l.addEventListener(`change`,()=>{x=!0}),v.addEventListener(`change`,()=>{C()}),r.addEventListener(`submit`,async e=>{e.preventDefault();try{let e=d.value.trim()||(x?l.value.trim():``);await w({clientId:n.value,todoCalendarId:o.value,doneCalendarId:e}),d.value=e,i.googleDriveSyncEnabled=v.checked,y&&(y.style.display=`inline`,setTimeout(()=>{y.style.display=`none`},2500)),S(),await C()}catch{alert(`設定保存に失敗しました。`)}})}}})),L,R=d((()=>{y(),L=class t{static excludeGoogleTodoTasks(e){return e.filter(e=>e.sourceType!==`google-todo`)}static render(){return`
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
    `}static setup(e,n){let r=e.querySelector(`#fileInput`),i=e.querySelector(`#exportJSONBtn`),a=e.querySelector(`#importJSONBtn`),o=e.querySelector(`#copyJSONBtn`),s=e.querySelector(`#pasteJSONBtn`),c=e.querySelector(`#resetBtn`);!r||!i||!a||!o||!s||!c||(i.addEventListener(`click`,()=>{t.exportJSON(n)}),a.addEventListener(`click`,()=>{r.click()}),r.addEventListener(`change`,e=>{t.importJSONFromFile(e,n)}),o.addEventListener(`click`,async()=>{await t.copyJSONToClipboard(n)}),s.addEventListener(`click`,async()=>{await t.importJSONFromClipboard(n)}),c.addEventListener(`click`,async()=>{await t.resetToDefault(n)}))}static async updateTasksFromRawArray(n,r){return Array.isArray(n)?(r.tasks=t.excludeGoogleTodoTasks(n).map(t=>new e(t)),await r.saveTasksWithSync(!0),!0):!1}static importJSONFromFile(e,n){let r=e.target,i=r.files?.[0];if(!i)return;let a=new FileReader;a.onload=async e=>{try{let r=String(e.target?.result||``),i=JSON.parse(r);if(!await t.updateTasksFromRawArray(i,n)){alert(`無効なJSONフォーマットです。`);return}alert(`インポートが完了しました。`)}catch{alert(`JSONの解析に失敗しました。`)}},a.readAsText(i),r.value=``}static async importJSONFromClipboard(e){if(!navigator.clipboard||!window.isSecureContext){alert(`この環境ではクリップボード操作が利用できません。`);return}try{let n=await navigator.clipboard.readText(),r=JSON.parse(n);if(!await t.updateTasksFromRawArray(r,e)){alert(`無効なJSONフォーマットです。`);return}alert(`クリップボードからインポートしました。`)}catch{alert(`クリップボードの読み込みまたはJSON解析に失敗しました。`)}}static async copyJSONToClipboard(e){if(!navigator.clipboard||!window.isSecureContext){alert(`この環境ではクリップボード操作が利用できません。`);return}try{let n=t.excludeGoogleTodoTasks(e.tasks);await navigator.clipboard.writeText(JSON.stringify(n,null,2)),alert(`JSONをクリップボードにコピーしました。`)}catch{alert(`クリップボードへのコピーに失敗しました。`)}}static exportJSON(e){let n=t.excludeGoogleTodoTasks(e.tasks),r=JSON.stringify(n,null,2),i=`data:text/json;charset=utf-8,`+encodeURIComponent(r),a=document.createElement(`a`);a.setAttribute(`href`,i),a.setAttribute(`download`,`task_settings_and_history.json`),document.body.appendChild(a),a.click(),a.remove()}static async resetToDefault(e){if(confirm(`すべてのカスタム設定と履歴を削除し、デフォルトのtasks.jsonから再読み込みしますか？`))try{await e.resetToDefault(),alert(`初期設定に戻しました。`)}catch{alert(`初期設定への復元に失敗しました。`)}}}})),z,B=d((()=>{v(),z=class{static render(){return`
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
    `}static setup(e){let t=e.querySelector(`#overdueReferenceDateInput`),n=e.querySelector(`#overdueReferenceDateForm`),r=e.querySelector(`#displaySaveStatus`);!t||!n||(t.value=i.overdueReferenceDate,n.addEventListener(`submit`,e=>{e.preventDefault(),t.value&&(i.overdueReferenceDate=t.value,r&&(r.style.display=`inline`,setTimeout(()=>{r.style.display=`none`},2500)))}))}}})),V,H=d((()=>{v(),T(),O(),V=class e{static render(){return`
      ${e.renderSound()}
      ${e.renderNotification()}
    `}static renderSound(){return`
      <div class="data-box" id="soundSection">
        <h3 class="group-title">通知音設定</h3>
        <p class="setting-desc">通知で使うサウンドを選択します。</p>
        <div class="setting-row">
          <label for="notificationSoundSelect">通知音</label>
          <select id="notificationSoundSelect" class="setting-input">
            ${S.options.map(e=>`<option value="${e.value}">${e.label}</option>`).join(``)}
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
    `}static setup(t){e.setupSound(t),e.setupNotification(t)}static setupSound(e){let t=e.querySelector(`#notificationSoundSelect`),n=e.querySelector(`#playSoundTestBtn`);t&&(t.value=i.notificationSound,t.addEventListener(`change`,()=>{i.notificationSound=t.value})),n&&n.addEventListener(`click`,()=>{S.playSelected()})}static setupNotification(e){let t=e.querySelector(`#notificationSection`),n=e.querySelector(`#notificationEnableBtn`),r=e.querySelector(`#sendTestNotificationBtn`);if(!k.isSupported()){t&&(t.style.display=`none`);return}k.syncTestButtons(n,r),n&&n.addEventListener(`click`,async()=>{let e=await k.requestPermission();k.syncTestButtons(n,r),e===`granted`&&alert(`通知を有効にしました。`)}),r&&r.addEventListener(`click`,()=>{k.sendTestNotification()||alert(`先に通知を有効にしてください。`)})}}})),U,W=d((()=>{v(),U=class e{static render(){return`
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
    `}static applyTheme(e){let t=document.documentElement;if(e===`system`){t.removeAttribute(`data-theme`);return}t.setAttribute(`data-theme`,e)}static setup(t){let n=i.appTheme;e.applyTheme(n);let r=t.querySelector(`input[name="theme"][value="${n}"]`);r&&(r.checked=!0),t.querySelectorAll(`input[name="theme"]`).forEach(t=>{t.addEventListener(`change`,()=>{let n=t.value;i.appTheme=n,e.applyTheme(n)})})}}}));n((()=>{t(),r(),o(),D(),I(),R(),B(),H(),W(),f();var e=class extends HTMLElement{_taskRepository=new A;static get NAME(){return`done-settings`}connectedCallback(){this.render(),this.setup()}render(){this.innerHTML=`
      <main>
        ${F.render()}
        ${U.render()}
        ${z.render()}
        ${V.render()}
        ${L.render()}
      </main>
    `}async setup(){g.startGoogleSessionKeepAlive(),this._taskRepository.hydrateFromLocal(),U.setup(this),F.setup(this),z.setup(this),V.setup(this),L.setup(this,this._taskRepository),document.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`a[href]`);n&&n.getAttribute(`href`)===`index.html`&&A.markNextIndexNavigationFromSettings()}),this._taskRepository.refreshFromCloudIfNeeded()}};customElements.get(e.NAME)||customElements.define(e.NAME,e),document.addEventListener(`DOMContentLoaded`,async()=>{let t=document.querySelector(`.container`);if(!t)return;let n=document.createElement(x.NAME);n.active=`settings`,t.appendChild(n);let r=document.createElement(e.NAME);t.appendChild(r);let i=document.createElement(b.NAME);t.appendChild(i)})}))();