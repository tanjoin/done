import{a as e,c as t,d as n,f as r,i,n as a,o,p as s,r as c,s as l,t as u}from"./local-storage-manager-VjQ1oaMY.js";import{a as d,i as f,n as p,o as m,r as h,t as g}from"./task-repository-P37486Ui.js";var _,v=s((()=>{a(),_=class{static render(){return`
      <div class="data-box" id="calendarSection">
        <h3 class="group-title">カレンダー連携設定</h3>
        <p class="setting-desc">
          特定のカレンダーに登録したい場合は、Googleカレンダーの設定と共有から確認できるカレンダーIDを入力してください。
        </p>
        <form id="calendarIdForm" class="setting-form">
          <input
            type="text"
            id="calendarIdInput"
            placeholder="カレンダーIDを入力（例: xxx@group.calendar.google.com）"
            class="setting-input"
          />
          <div class="form-actions-row">
            <button type="submit" class="btn btn-action">設定を保存する</button>
            <span id="saveStatus" class="save-status-msg">保存しました</span>
          </div>
        </form>
      </div>
    `}static setup(e){let t=e.querySelector(`#calendarSection`),n=e.querySelector(`#calendarIdInput`),r=e.querySelector(`#calendarIdForm`),i=e.querySelector(`#saveStatus`);if(!u.supportsLocalStorage()){t&&(t.style.display=`none`);return}!n||!r||(n.value=u.calendarTargetId,r.addEventListener(`submit`,e=>{e.preventDefault(),u.calendarTargetId=n.value.trim(),i&&(i.style.display=`inline`,setTimeout(()=>{i.style.display=`none`},2500))}))}}})),y,b=s((()=>{t(),y=class e{static render(){return`
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
    `}static setup(t,n){let r=t.querySelector(`#fileInput`),i=t.querySelector(`#exportJSONBtn`),a=t.querySelector(`#importJSONBtn`),o=t.querySelector(`#copyJSONBtn`),s=t.querySelector(`#pasteJSONBtn`),c=t.querySelector(`#resetBtn`);!r||!i||!a||!o||!s||!c||(i.addEventListener(`click`,()=>{e.exportJSON(n)}),a.addEventListener(`click`,()=>{r.click()}),r.addEventListener(`change`,t=>{e.importJSONFromFile(t,n)}),o.addEventListener(`click`,async()=>{await e.copyJSONToClipboard(n)}),s.addEventListener(`click`,async()=>{await e.importJSONFromClipboard(n)}),c.addEventListener(`click`,async()=>{await e.resetToDefault(n)}))}static updateTasksFromRawArray(e,t){return Array.isArray(e)?(t.tasks=e.map(e=>new l(e)),t.saveTasks(),!0):!1}static importJSONFromFile(t,n){let r=t.target,i=r.files?.[0];if(!i)return;let a=new FileReader;a.onload=t=>{try{let r=String(t.target?.result||``),i=JSON.parse(r);if(!e.updateTasksFromRawArray(i,n)){alert(`無効なJSONフォーマットです。`);return}alert(`インポートが完了しました。`)}catch{alert(`JSONの解析に失敗しました。`)}},a.readAsText(i),r.value=``}static async importJSONFromClipboard(t){if(!navigator.clipboard||!window.isSecureContext){alert(`この環境ではクリップボード操作が利用できません。`);return}try{let n=await navigator.clipboard.readText(),r=JSON.parse(n);if(!e.updateTasksFromRawArray(r,t)){alert(`無効なJSONフォーマットです。`);return}alert(`クリップボードからインポートしました。`)}catch{alert(`クリップボードの読み込みまたはJSON解析に失敗しました。`)}}static async copyJSONToClipboard(e){if(!navigator.clipboard||!window.isSecureContext){alert(`この環境ではクリップボード操作が利用できません。`);return}try{await navigator.clipboard.writeText(JSON.stringify(e.tasks,null,2)),alert(`JSONをクリップボードにコピーしました。`)}catch{alert(`クリップボードへのコピーに失敗しました。`)}}static exportJSON(e){let t=JSON.stringify(e.tasks,null,2),n=`data:text/json;charset=utf-8,`+encodeURIComponent(t),r=document.createElement(`a`);r.setAttribute(`href`,n),r.setAttribute(`download`,`task_settings_and_history.json`),document.body.appendChild(r),r.click(),r.remove()}static async resetToDefault(e){if(confirm(`すべてのカスタム設定と履歴を削除し、デフォルトのtasks.jsonから再読み込みしますか？`))try{await e.resetToDefault(),alert(`初期設定に戻しました。`)}catch{alert(`初期設定への復元に失敗しました。`)}}}})),x,S=s((()=>{a(),x=class{static render(){return`
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
    `}static setup(e){let t=e.querySelector(`#overdueReferenceDateInput`),n=e.querySelector(`#overdueReferenceDateForm`),r=e.querySelector(`#displaySaveStatus`);!t||!n||(t.value=u.overdueReferenceDate,n.addEventListener(`submit`,e=>{e.preventDefault(),t.value&&(u.overdueReferenceDate=t.value,r&&(r.style.display=`inline`,setTimeout(()=>{r.style.display=`none`},2500)))}))}}})),C,w=s((()=>{a(),f(),m(),C=class e{static render(){return`
      ${e.renderSound()}
      ${e.renderNotification()}
    `}static renderSound(){return`
      <div class="data-box" id="soundSection">
        <h3 class="group-title">通知音設定</h3>
        <p class="setting-desc">通知で使うサウンドを選択します。</p>
        <div class="setting-row">
          <label for="notificationSoundSelect">通知音</label>
          <select id="notificationSoundSelect" class="setting-input">
            ${d.options.map(e=>`<option value="${e.value}">${e.label}</option>`).join(``)}
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
    `}static setup(t){e.setupSound(t),e.setupNotification(t)}static setupSound(e){let t=e.querySelector(`#notificationSoundSelect`),n=e.querySelector(`#playSoundTestBtn`);t&&(t.value=u.notificationSound,t.addEventListener(`change`,()=>{u.notificationSound=t.value})),n&&n.addEventListener(`click`,()=>{d.playSelected()})}static setupNotification(e){let t=e.querySelector(`#notificationSection`),n=e.querySelector(`#notificationEnableBtn`),r=e.querySelector(`#sendTestNotificationBtn`);if(!h.isSupported()){t&&(t.style.display=`none`);return}h.syncTestButtons(n,r),n&&n.addEventListener(`click`,async()=>{let e=await h.requestPermission();h.syncTestButtons(n,r),e===`granted`&&alert(`通知を有効にしました。`)}),r&&r.addEventListener(`click`,()=>{h.sendTestNotification()||alert(`先に通知を有効にしてください。`)})}}})),T,E=s((()=>{a(),T=class e{static render(){return`
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
    `}static applyTheme(e){let t=document.documentElement;if(e===`system`){t.removeAttribute(`data-theme`);return}t.setAttribute(`data-theme`,e)}static setup(t){let n=u.appTheme;e.applyTheme(n);let r=t.querySelector(`input[name="theme"][value="${n}"]`);r&&(r.checked=!0),t.querySelectorAll(`input[name="theme"]`).forEach(t=>{t.addEventListener(`change`,()=>{let n=t.value;u.appTheme=n,e.applyTheme(n)})})}}}));r((()=>{n(),o(),i(),p(),v(),b(),S(),w(),E();var t=class extends HTMLElement{_taskRepository=new g;static get NAME(){return`done-settings`}connectedCallback(){this.render(),this.setup()}render(){this.innerHTML=`
      <main>
        ${_.render()}
        ${T.render()}
        ${x.render()}
        ${C.render()}
        ${y.render()}
      </main>
    `}async setup(){await this._taskRepository.loadTasks(),T.setup(this),_.setup(this),x.setup(this),C.setup(this),y.setup(this,this._taskRepository)}};customElements.get(t.NAME)||customElements.define(t.NAME,t),document.addEventListener(`DOMContentLoaded`,async()=>{let n=document.querySelector(`.container`);if(!n)return;let r=document.createElement(c.NAME);r.active=`settings`,n.appendChild(r);let i=document.createElement(t.NAME);n.appendChild(i);let a=document.createElement(e.NAME);n.appendChild(a)})}))();