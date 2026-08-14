import{D as e,E as t,M as n,N as r,O as i,T as a,_ as o,b as s,c,d as l,f as u,k as d,l as f,n as p,o as m,r as h,t as g,u as _,v,w as y,y as b}from"./google-auth-alert-BWVGOWhr.js";r((()=>{n(),e(),_(),a(),d(),b(),m(),u(),p();var r=class e extends HTMLElement{_tasks=[];_googleAuthAlertController=null;static excludeGoogleTodoTasks(e){return e.filter(e=>e.sourceType!==`google-todo`)}static get NAME(){return`done-json-organizer`}connectedCallback(){this.render(),this._googleAuthAlertController=new g({root:this,ids:{statusId:`googleAuthStatus`,messageId:`googleAuthStatusMessage`,actionButtonId:`googleAuthStatusBtn`,dismissButtonId:`googleAuthDismissBtn`},onAction:()=>{document.querySelector(`#googleHeaderLoginBtn`)?.click()}}),this._googleAuthAlertController.setup(),this.loadTasks(),this.setupEvents(),document.addEventListener(l.EVENT_GOOGLE_RELOGIN_REQUIRED,()=>{this._googleAuthAlertController?.show(`Google認証の有効期限が切れました。Google に再ログインしてください。`)})}render(){this.innerHTML=`
      <main>
        ${h({statusId:`googleAuthStatus`,messageId:`googleAuthStatusMessage`,actionButtonId:`googleAuthStatusBtn`,dismissButtonId:`googleAuthDismissBtn`,actionLabel:`Google にログイン`,dismissAriaLabel:`Google認証通知を閉じる`})}
        <h3 class="group-title">タスク JSON 編集</h3>
        <div class="data-box">
          <p class="setting-desc">
            done_tasks を読み込み、1タスクずつ JSON で直接編集できます。<br />
            一時タスクは specificDate を設定したタスクとして管理します。<br />
            保存前に JSON 整形で確認してください。
          </p>

          <div class="btn-group-wrap">
            <button id="jsonReloadTasksBtn" class="btn">再読込</button>
            <button id="jsonSaveAllTasksBtn" class="btn btn-action">done_tasks 全体を保存</button>
            <button id="jsonAddTaskBtn" class="btn">タスク追加</button>
            <button id="jsonDeleteTaskBtn" class="btn">選択タスク削除</button>
          </div>

          <dialog id="jsonAddTaskDialog" class="task-type-dialog">
            <form method="dialog" class="task-type-dialog__form">
              <h4 class="task-type-dialog__title">追加するタスク種別を選択</h4>
              <p class="task-type-dialog__desc">通常タスクか一時タスクを明示的に選んでください。</p>
              <div class="task-type-dialog__actions">
                <button value="normal" class="btn task-type-dialog__choice-btn">通常タスク</button>
                <button value="temporary" class="btn task-type-dialog__choice-btn">一時タスク</button>
              </div>
              <div class="task-type-dialog__actions task-type-dialog__actions--cancel">
                <button value="cancel" class="btn btn-cancel">キャンセル</button>
              </div>
            </form>
          </dialog>

          <div class="setting-row">
            <label for="jsonTaskSelect">編集対象タスク</label>
            <select id="jsonTaskSelect" class="setting-input"></select>
          </div>

          <div class="setting-row">
            <label for="jsonTaskEditor">タスク JSON</label>
            <textarea id="jsonTaskEditor" class="setting-input json-editor" spellcheck="false"></textarea>
          </div>

          <div class="btn-group-wrap">
            <button id="jsonPrettyBtn" class="btn">JSON 整形</button>
            <button id="jsonApplyTaskBtn" class="btn btn-action">このタスクに反映</button>
          </div>

          <p id="jsonStatus" class="json-status-msg" aria-live="polite"></p>
        </div>
      </main>
    `}setupEvents(){this.getElement(`jsonReloadTasksBtn`).addEventListener(`click`,()=>{this.loadTasks(),this.setStatus(`done_tasks を再読込しました。`)}),this.getElement(`jsonSaveAllTasksBtn`).addEventListener(`click`,()=>{this.saveAllTasks()}),this.getElement(`jsonSaveAllTasksBtn`).addEventListener(`keydown`,e=>{(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),this.saveAllTasks())}),this.getElement(`jsonAddTaskBtn`).addEventListener(`click`,async()=>{let e=await this.openAddTaskDialog();if(!e){this.setStatus(`タスク追加をキャンセルしました。`);return}let t=e===`temporary`,n=this.createTaskTemplate(t);this._tasks.push(n),this.renderTaskSelectOptions(n.id),this.renderSelectedTaskJson(),this.setStatus(t?`一時タスクを追加しました。specificDate や時刻を調整して保存してください。`:`通常タスクを追加しました。繰り返し条件などを編集して保存してください。`)}),this.getElement(`jsonDeleteTaskBtn`).addEventListener(`click`,()=>{let e=this.getSelectedTaskIndex();if(e<0||e>=this._tasks.length){this.setStatus(`削除対象タスクを選択してください。`,!0);return}let t=this._tasks[e];if(!t){this.setStatus(`削除対象タスクを選択してください。`,!0);return}confirm(`このタスクを削除しますか？\n[${t.group||`その他`}] ${t.text}`)&&(this._tasks.splice(e,1),this.renderTaskSelectOptions(),this.renderSelectedTaskJson(),this.setStatus(`選択タスクを削除しました。保存ボタンで確定してください。`))}),this.getElement(`jsonTaskSelect`).addEventListener(`change`,()=>{this.renderSelectedTaskJson()}),this.getElement(`jsonPrettyBtn`).addEventListener(`click`,()=>{let e=this.readTaskEditorJson();e&&(this.setTaskEditorJson(e),this.setStatus(`整形しました。`))}),this.getElement(`jsonApplyTaskBtn`).addEventListener(`click`,()=>{let e=this.getSelectedTaskIndex();if(e<0||e>=this._tasks.length){this.setStatus(`編集対象タスクを選択してください。`,!0);return}let t=this.readTaskEditorJson();if(!t)return;if(!this.isDoneTaskLike(t)){this.setStatus(`タスク形式ではありません（id, text, history は必須）。`,!0);return}let n=this._tasks[e]?.id||``;this._tasks[e]=t,this.renderTaskSelectOptions(t.id||n),this.setTaskEditorJson(this._tasks[e]),this.setStatus(`選択タスクに反映しました。保存ボタンで確定してください。`)})}async saveAllTasks(){let t=e.excludeGoogleTodoTasks(this._tasks).map(e=>new i(e));if(y.tasks=t,y.markTaskSyncDirty(),!y.googleDriveSyncEnabled||!v()){this.setStatus(`done_tasks 全体を保存しました。`);return}try{let e=await c(t);if(!e.uploaded&&e.skippedReason){this.setStatus(`done_tasks は保存しました。別の端末の更新を検出したため同期停止しました。`,!0);return}this.setStatus(`done_tasks 全体を保存し、Google Drive に同期しました。`)}catch(e){if(s(e)){this._googleAuthAlertController?.show(`Google認証が切れました。設定画面で再ログインしてください。`);return}this.setStatus(`done_tasks は保存しましたが、Google Drive同期に失敗しました。`,!0)}}loadTasks(){this._tasks=e.excludeGoogleTodoTasks(y.tasks),this.renderTaskSelectOptions(),this.renderSelectedTaskJson()}renderTaskSelectOptions(e=``){let t=this.getElement(`jsonTaskSelect`),n=t.value;if(t.innerHTML=``,this._tasks.forEach((e,n)=>{let r=document.createElement(`option`);r.value=String(n);let i=(e.group||`その他`).trim()||`その他`;r.textContent=`${n+1}. [${i}] ${e.text}`,r.dataset.taskId=e.id,t.appendChild(r)}),this._tasks.length===0){let e=document.createElement(`option`);e.value=`-1`,e.textContent=`タスクがありません`,t.appendChild(e),t.value=`-1`;return}let r=e?this._tasks.findIndex(t=>t.id===e):-1;if(r>=0){t.value=String(r);return}if(n&&Number(n)>=0&&Number(n)<this._tasks.length){t.value=n;return}t.value=`0`}renderSelectedTaskJson(){let e=this.getSelectedTaskIndex(),t=this.getElement(`jsonTaskEditor`);if(e<0||e>=this._tasks.length){t.value=``,this.setStatus(`編集対象タスクを選択してください。`,!0);return}this.setTaskEditorJson(this._tasks[e])}setTaskEditorJson(e){let t=this.getElement(`jsonTaskEditor`);t.value=JSON.stringify(e,null,2)}createTaskTemplate(e){let t=Date.now(),n=new Date().toISOString().slice(0,10);return{id:`${e?`temp`:`task`}_${t}`,text:e?`一時タスク`:`新規タスク`,group:e?`一時`:`その他`,description:``,link:``,daysOfWeek:[],daysOfMonth:[],startTime:``,endTime:``,history:{},notifiedDate:``,remindMinutesBefore:null,skipCalendarOnComplete:!1,strictMode:!1,createTaskViaUrl:!1,specificDate:e?n:``,endDate:``,sourceType:`google-done`}}openAddTaskDialog(){let e=this.getElement(`jsonAddTaskDialog`);return typeof e.showModal==`function`?(e.open||e.showModal(),new Promise(t=>{let n=()=>{if(e.removeEventListener(`close`,n),e.returnValue===`normal`||e.returnValue===`temporary`){t(e.returnValue);return}t(null)};e.addEventListener(`close`,n)})):Promise.resolve(null)}readTaskEditorJson(){let e=this.getElement(`jsonTaskEditor`).value.trim();if(!e)return this.setStatus(`タスク JSON が空です。`,!0),null;try{let t=JSON.parse(e);return this.isDoneTaskLike(t)?t:(this.setStatus(`タスク形式ではありません（id, text, history は必須）。`,!0),null)}catch{return this.setStatus(`タスク JSON の形式が不正です。`,!0),null}}isDoneTaskLike(e){if(!e||typeof e!=`object`)return!1;let t=e;return typeof t.id==`string`&&typeof t.text==`string`&&!!t.history&&typeof t.history==`object`}setStatus(e,t=!1){let n=this.getElement(`jsonStatus`);n.textContent=e,n.classList.toggle(`json-status-msg--error`,t)}getElement(e){let t=this.querySelector(`#${e}`);if(!t)throw Error(`Element not found: ${e}`);return t}getSelectedTaskIndex(){let e=this.getElement(`jsonTaskSelect`),t=Number(e.value);return Number.isInteger(t)?t:-1}};customElements.get(r.NAME)||customElements.define(r.NAME,r),document.addEventListener(`DOMContentLoaded`,()=>{o(),l.startGoogleSessionKeepAlive();let e=document.querySelector(`.container`);if(!e)return;let n=document.createElement(f.NAME);n.active=`json-organizer`,e.appendChild(n);let i=document.createElement(r.NAME);e.appendChild(i);let a=document.createElement(t.NAME);e.appendChild(a)})}))();