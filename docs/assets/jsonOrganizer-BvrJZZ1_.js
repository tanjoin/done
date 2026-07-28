import{a as e,c as t,d as n,f as r,i,n as a,o,r as s,s as c,t as l}from"./local-storage-manager-zRuN3Z8g.js";r((()=>{n(),o(),i(),a(),t();var r=class extends HTMLElement{_tasks=[];static get NAME(){return`done-json-organizer`}connectedCallback(){this.render(),this.loadTasks(),this.setupEvents()}render(){this.innerHTML=`
      <main>
        <h3 class="group-title">タスク JSON 編集</h3>
        <div class="data-box">
          <p class="setting-desc">
            done_tasks を読み込み、1タスクずつ JSON で直接編集できます。<br />
            保存前に JSON 整形で確認してください。
          </p>

          <div class="btn-group-wrap">
            <button id="jsonReloadTasksBtn" class="btn">再読込</button>
            <button id="jsonSaveAllTasksBtn" class="btn btn-action">done_tasks 全体を保存</button>
            <button id="jsonAddTaskBtn" class="btn">新規タスク追加</button>
            <button id="jsonDeleteTaskBtn" class="btn">選択タスク削除</button>
          </div>

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
    `}setupEvents(){this.getElement(`jsonReloadTasksBtn`).addEventListener(`click`,()=>{this.loadTasks(),this.setStatus(`done_tasks を再読込しました。`)}),this.getElement(`jsonSaveAllTasksBtn`).addEventListener(`click`,()=>{l.tasks=this._tasks.map(e=>new c(e)),this.setStatus(`done_tasks 全体を保存しました。`)}),this.getElement(`jsonAddTaskBtn`).addEventListener(`click`,()=>{let e=this.createEmptyTask();this._tasks.push(e),this.renderTaskSelectOptions(e.id),this.renderSelectedTaskJson(),this.setStatus(`新規タスクを追加しました。内容を編集して保存してください。`)}),this.getElement(`jsonDeleteTaskBtn`).addEventListener(`click`,()=>{let e=this.getSelectedTaskIndex();if(e<0||e>=this._tasks.length){this.setStatus(`削除対象タスクを選択してください。`,!0);return}let t=this._tasks[e];if(!t){this.setStatus(`削除対象タスクを選択してください。`,!0);return}confirm(`このタスクを削除しますか？\n[${t.group||`その他`}] ${t.text}`)&&(this._tasks.splice(e,1),this.renderTaskSelectOptions(),this.renderSelectedTaskJson(),this.setStatus(`選択タスクを削除しました。保存ボタンで確定してください。`))}),this.getElement(`jsonTaskSelect`).addEventListener(`change`,()=>{this.renderSelectedTaskJson()}),this.getElement(`jsonPrettyBtn`).addEventListener(`click`,()=>{let e=this.readTaskEditorJson();e&&(this.setTaskEditorJson(e),this.setStatus(`整形しました。`))}),this.getElement(`jsonApplyTaskBtn`).addEventListener(`click`,()=>{let e=this.getSelectedTaskIndex();if(e<0||e>=this._tasks.length){this.setStatus(`編集対象タスクを選択してください。`,!0);return}let t=this.readTaskEditorJson();if(!t)return;if(!this.isDoneTaskLike(t)){this.setStatus(`タスク形式ではありません（id, text, history は必須）。`,!0);return}let n=this._tasks[e]?.id||``;this._tasks[e]=t,this.renderTaskSelectOptions(t.id||n),this.setTaskEditorJson(this._tasks[e]),this.setStatus(`選択タスクに反映しました。保存ボタンで確定してください。`)})}loadTasks(){this._tasks=l.tasks,this.renderTaskSelectOptions(),this.renderSelectedTaskJson()}renderTaskSelectOptions(e=``){let t=this.getElement(`jsonTaskSelect`),n=t.value;if(t.innerHTML=``,this._tasks.forEach((e,n)=>{let r=document.createElement(`option`);r.value=String(n);let i=(e.group||`その他`).trim()||`その他`;r.textContent=`${n+1}. [${i}] ${e.text}`,r.dataset.taskId=e.id,t.appendChild(r)}),this._tasks.length===0){let e=document.createElement(`option`);e.value=`-1`,e.textContent=`タスクがありません`,t.appendChild(e),t.value=`-1`;return}let r=e?this._tasks.findIndex(t=>t.id===e):-1;if(r>=0){t.value=String(r);return}if(n&&Number(n)>=0&&Number(n)<this._tasks.length){t.value=n;return}t.value=`0`}renderSelectedTaskJson(){let e=this.getSelectedTaskIndex(),t=this.getElement(`jsonTaskEditor`);if(e<0||e>=this._tasks.length){t.value=``,this.setStatus(`編集対象タスクを選択してください。`,!0);return}this.setTaskEditorJson(this._tasks[e])}setTaskEditorJson(e){let t=this.getElement(`jsonTaskEditor`);t.value=JSON.stringify(e,null,2)}createEmptyTask(){return{id:`task_${Date.now()}`,text:`新規タスク`,group:`その他`,description:``,link:``,daysOfWeek:[],daysOfMonth:[],startTime:``,endTime:``,history:{},notifiedDate:``,remindMinutesBefore:null,skipCalendarOnComplete:!1,strictMode:!1,specificDate:``,endDate:``}}readTaskEditorJson(){let e=this.getElement(`jsonTaskEditor`).value.trim();if(!e)return this.setStatus(`タスク JSON が空です。`,!0),null;try{let t=JSON.parse(e);return this.isDoneTaskLike(t)?t:(this.setStatus(`タスク形式ではありません（id, text, history は必須）。`,!0),null)}catch{return this.setStatus(`タスク JSON の形式が不正です。`,!0),null}}isDoneTaskLike(e){if(!e||typeof e!=`object`)return!1;let t=e;return typeof t.id==`string`&&typeof t.text==`string`&&!!t.history&&typeof t.history==`object`}setStatus(e,t=!1){let n=this.getElement(`jsonStatus`);n.textContent=e,n.classList.toggle(`json-status-msg--error`,t)}getElement(e){let t=this.querySelector(`#${e}`);if(!t)throw Error(`Element not found: ${e}`);return t}getSelectedTaskIndex(){let e=this.getElement(`jsonTaskSelect`),t=Number(e.value);return Number.isInteger(t)?t:-1}};customElements.get(r.NAME)||customElements.define(r.NAME,r),document.addEventListener(`DOMContentLoaded`,()=>{let t=document.querySelector(`.container`);if(!t)return;let n=document.createElement(s.NAME);n.active=`json-organizer`,t.appendChild(n);let i=document.createElement(r.NAME);t.appendChild(i);let a=document.createElement(e.NAME);t.appendChild(a)})}))();