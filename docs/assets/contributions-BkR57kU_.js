import{A as e,D as t,L as n,O as r,R as i,_ as a,d as o,f as s,k as c,l,u,y as d,z as f}from"./google-drive-service-IrLJWyjK.js";import{n as p,t as m}from"./task-repository-BsxEEtYt.js";var h=f((()=>{})),g=i((()=>{n(),h(),e(),u(),r();function i(e){return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,`0`)}-${String(e.getDate()).padStart(2,`0`)}`}function a(e){if(!/^\d{4}-\d{2}-\d{2}$/.test(e))return!1;let t=new Date(`${e}T00:00:00`);return!Number.isNaN(t.getTime())&&i(t)===e}function o(e){return e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e]||e)}var s=class extends HTMLElement{year=new Date().getFullYear();selectedDate=i(new Date);tasks=[];static get NAME(){return`done-contributions`}connectedCallback(){document.body.classList.add(`contribution-view-mode`),document.documentElement.dataset.theme=t.appTheme,this.tasks=t.tasks,this.render(),this.addEventListener(`click`,e=>this.handleClick(e)),window.addEventListener(`storage`,()=>this.reload()),window.addEventListener(`focus`,()=>this.reload())}handleClick(e){let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`button[data-date], button[data-year-step]`);if(!n||n.disabled)return;if(n.dataset.date){this.selectedDate=n.dataset.date,this.render();return}let r=Number(n.dataset.yearStep),i=this.year+r;i<=new Date().getFullYear()&&i>=this.firstActivityYear()&&(this.year=i,this.selectedDate=`${i}-01-01`,this.render())}reload(){this.tasks=t.tasks;let e=new Date().getFullYear();this.year=Math.min(this.year,e),this.year=Math.max(this.year,this.firstActivityYear()),this.render()}completedActivities(){let e=new Map;return this.tasks.forEach(t=>{Object.entries(t.history||{}).forEach(([n,r])=>{if(r!==`completed`||!a(n))return;let i=e.get(n)||[];i.push(t),e.set(n,i)})}),e}firstActivityYear(){let e=Array.from(this.completedActivities().keys()).map(e=>Number(e.slice(0,4)));return e.length>0?Math.min(...e):new Date().getFullYear()}render(){let e=this.completedActivities(),t=new Map(Array.from(e.entries()).filter(([e])=>e.startsWith(`${this.year}-`))),n=Array.from(t.values()).reduce((e,t)=>e+t.length,0),r=t.size,i=this.longestStreak(t),a=new Date().getFullYear();this.innerHTML=`
      <main class="contributions-page">
        <section class="contributions-heading">
          <div>
            <p class="contributions-eyebrow">YOUR ACTIVITY</p>
            <h1>実施ログ</h1>
            <p class="contributions-description">完了したタスクの積み重ねを、日付ごとに振り返れます。</p>
          </div>
          <div class="year-selector" aria-label="表示する年">
            <button type="button" data-year-step="-1" aria-label="前年" ${this.year<=this.firstActivityYear()?`disabled`:``}>前年</button>
            <strong>${this.year}年</strong>
            <button type="button" data-year-step="1" aria-label="翌年" ${this.year>=a?`disabled`:``}>翌年</button>
          </div>
        </section>

        <section class="activity-summary" aria-label="${this.year}年の実績">
          <div class="summary-item summary-item--primary">
            <strong>${n.toLocaleString(`ja-JP`)}</strong>
            <span>タスク完了</span>
          </div>
          <div class="summary-item">
            <strong>${r.toLocaleString(`ja-JP`)}</strong>
            <span>実施した日</span>
          </div>
          <div class="summary-item">
            <strong>${i.toLocaleString(`ja-JP`)}</strong>
            <span>最長連続日数</span>
          </div>
        </section>

        <section class="activity-section" aria-label="${this.year}年の実施カレンダー">
          <div class="activity-section__topline">
            <h2>${this.year}年の記録</h2>
            <span>日付を選択してタスクを表示</span>
          </div>
          <div class="activity-scroll">
            ${this.renderGraph(t)}
          </div>
          <div class="activity-legend" aria-label="色の凡例">
            <span>少ない</span>
            <i class="activity-cell activity-cell--0"></i>
            <i class="activity-cell activity-cell--1"></i>
            <i class="activity-cell activity-cell--2"></i>
            <i class="activity-cell activity-cell--3"></i>
            <i class="activity-cell activity-cell--4"></i>
            <span>多い</span>
          </div>
        </section>

        <section class="selected-activity" aria-live="polite">
          ${this.renderSelectedDay(e)}
        </section>
      </main>
    `}renderGraph(e){let t=new Date(this.year,0,1);t.setDate(t.getDate()-t.getDay());let n=new Date(this.year,11,31);n.setDate(n.getDate()+(6-n.getDay()));let r=[],a=new Date(t);for(;a<=n;){let e=[];for(let t=0;t<7;t+=1)e.push(new Date(a)),a.setDate(a.getDate()+1);r.push(e)}let o=[];r.forEach((e,t)=>{let n=e.find(e=>e.getFullYear()===this.year&&e.getDate()===1);n&&o.push({label:new Intl.DateTimeFormat(`ja-JP`,{month:`short`}).format(n),week:t})});let s=o.map(e=>`<span class="month-label" style="grid-column:${e.week+2}">${e.label}</span>`).join(``),c=r.map((t,n)=>{let r=t.map(t=>{let n=i(t);if(t.getFullYear()!==this.year)return`<span class="activity-cell activity-cell--outside" aria-hidden="true"></span>`;let r=e.get(n)?.length||0,a=r===0?0:r===1?1:r<=3?2:r<=6?3:4,o=new Intl.DateTimeFormat(`ja-JP`,{year:`numeric`,month:`long`,day:`numeric`}).format(t);return`<button type="button" class="activity-cell activity-cell--${a}${n===i(new Date)?` is-today`:``}${n===this.selectedDate?` is-selected`:``}" data-date="${n}" aria-label="${o}: ${r}件完了" aria-pressed="${n===this.selectedDate}" title="${o}: ${r}件完了"></button>`}).join(``);return`<div class="activity-week" style="grid-column:${n+2}">${r}</div>`}).join(``);return`
      <div class="activity-graph" style="grid-template-columns:32px repeat(${r.length}, 12px)">
        <div class="activity-months" style="grid-template-columns:repeat(${r.length}, 12px)">${s}</div>
        <span class="weekday-label weekday-label--mon">月</span>
        <span class="weekday-label weekday-label--wed">水</span>
        <span class="weekday-label weekday-label--fri">金</span>
        ${c}
      </div>
    `}renderSelectedDay(e){let t=e.get(this.selectedDate)||[],n=new Date(`${this.selectedDate}T00:00:00`),r=new Intl.DateTimeFormat(`ja-JP`,{year:`numeric`,month:`long`,day:`numeric`,weekday:`long`}).format(n),i=t.length?`<ul class="activity-task-list">${t.map(e=>{let t=e.group?.trim(),n=e.sourceType===`google-todo`?`Google TODO`:e.sourceType===`google-done`?`Google DONE`:`ローカル`;return`<li><span class="activity-task-name">${o(e.text||`名称未設定`)}</span><span class="activity-task-meta">${t?`${o(t)} ・ `:``}${n}</span></li>`}).join(``)}</ul>`:`<p class="activity-empty">この日の完了タスクはありません。</p>`;return`
      <div class="selected-activity__heading">
        <div>
          <p class="contributions-eyebrow">SELECTED DAY</p>
          <h2>${r}</h2>
        </div>
        <strong>${t.length}件</strong>
      </div>
      ${i}
    `}longestStreak(e){let t=Array.from(e.keys()).sort().map(e=>Date.UTC(Number(e.slice(0,4)),Number(e.slice(5,7))-1,Number(e.slice(8,10)))),n=0,r=0,i=NaN;return t.forEach(e=>{r=e-i===864e5?r+1:1,n=Math.max(n,r),i=e}),n}};customElements.get(s.NAME)||customElements.define(s.NAME,s),document.addEventListener(`DOMContentLoaded`,()=>{let e=document.querySelector(`.container`);if(!e)return;let t=document.createElement(l.NAME);t.active=`contributions`,e.appendChild(t);let n=document.createElement(s.NAME);e.appendChild(n);let r=document.createElement(c.NAME);e.appendChild(r)})})),_=f((()=>{})),v=i((()=>{_(),d(),r(),s(),p(),a();function e(e){return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,`0`)}-${String(e.getDate()).padStart(2,`0`)}`}function n(t){if(!/^\d{4}-\d{2}-\d{2}$/.test(t))return!1;let n=new Date(`${t}T00:00:00`);return!Number.isNaN(n.getTime())&&e(n)===t}function i(e){return e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e]||e)}var c=class{page;repository=new m;dialog=document.createElement(`dialog`);content=document.createElement(`div`);observer;selectedTaskId=``;selectedDate=``;selectedLogDate=``;editDate=``;year=new Date().getFullYear();constructor(e){this.page=e,this.dialog.className=`task-history-dialog`,this.dialog.setAttribute(`aria-labelledby`,`taskHistoryTitle`),this.dialog.append(this.content),document.body.append(this.dialog),this.observer=new MutationObserver(()=>this.renderSelectedActivity()),this.observer.observe(e,{childList:!0,subtree:!0}),e.addEventListener(`click`,e=>this.handlePageClick(e)),this.dialog.addEventListener(`click`,e=>this.handleDialogClick(e)),this.dialog.addEventListener(`change`,e=>this.handleDialogChange(e)),this.dialog.addEventListener(`close`,()=>{this.selectedTaskId=``}),o.startGoogleSessionKeepAlive(),this.renderSelectedActivity()}renderSelectedActivity(e=!1){let n=this.page.querySelector(`.selected-activity`),r=this.page.querySelector(`button[data-date][aria-pressed="true"]`)?.dataset.date;r&&(this.selectedLogDate=r);let a=r||this.selectedLogDate;if(!n||!a||!e&&n.dataset.renderedDate===a)return;let o=t.tasks.filter(e=>{let t=e.history?.[a];return t===`completed`||t===`cancelled`}),s=o.filter(e=>e.history[a]===`completed`).length,c=o.length-s,l=o.length?`<ul class="activity-task-list">${o.map(e=>{let t=e.history[a],n=t===`completed`?`完了`:`キャンセル`,r=t===`completed`?`is-completed`:`is-cancelled`,o=e.group?.trim();return`<li data-history-task-id="${i(e.id)}">
              <div class="activity-task-main">
                <span class="activity-task-name">${i(e.text||`名称未設定`)}</span>
                ${o?`<span class="activity-task-meta">${i(o)}</span>`:``}
              </div>
              <div class="activity-task-controls">
                <span class="activity-task-status ${r}">${n}</span>
                <button type="button" class="task-history-open" data-task-history-open data-task-id="${i(e.id)}" data-date="${a}" aria-label="${i(e.text||`名称未設定`)}のステータスを変更">ステータスを変更</button>
              </div>
            </li>`}).join(``)}</ul>`:`<p class="activity-empty">この日の完了・キャンセル履歴はありません。</p>`;n.innerHTML=`
      <div class="selected-activity__heading">
        <div>
          <p class="contributions-eyebrow">SELECTED DAY</p>
          <h2>${new Intl.DateTimeFormat(`ja-JP`,{year:`numeric`,month:`long`,day:`numeric`,weekday:`long`}).format(new Date(`${a}T00:00:00`))}</h2>
        </div>
        <strong>${s}件完了 ・ ${c}件キャンセル</strong>
      </div>
      ${l}
    `,n.dataset.renderedDate=a}handlePageClick(t){let n=t.target;if(!(n instanceof Element))return;let r=n.closest(`button[data-task-history-open]`);r&&(this.selectedTaskId=r.dataset.taskId||``,this.selectedDate=r.dataset.date||e(new Date),this.editDate=this.selectedDate,this.year=Number(this.editDate.slice(0,4)),this.renderDialog(),this.dialog.showModal())}handleDialogClick(e){let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`button[data-action]`);if(!n||n.disabled)return;let r=n.dataset.action;if(r===`close`)this.dialog.close();else if(r===`year-step`){let e=this.year+Number(n.dataset.step);e>=this.firstHistoryYear()&&e<=new Date().getFullYear()&&(this.year=e,this.renderDialog())}else r===`history-date`?(this.editDate=n.dataset.date||this.editDate,this.renderDialog()):r===`save`&&this.saveStatus(n)}handleDialogChange(e){let t=e.target;t instanceof HTMLInputElement&&t.type===`date`&&n(t.value)&&(this.editDate=t.value,this.year=Number(this.editDate.slice(0,4)),this.renderDialog())}task(){return t.tasks.find(e=>e.id===this.selectedTaskId)}firstHistoryYear(){let e=this.task(),t=Object.keys(e?.history||{}).filter(n).map(e=>Number(e.slice(0,4)));return t.length>0?Math.min(...t):this.year}renderDialog(){let e=this.task();if(!e){this.content.innerHTML=`<p>タスクが見つかりません。</p>`;return}let t=e.history?.[this.editDate]||``,n=t===`completed`?`完了`:t===`cancelled`?`キャンセル`:`未実施`,r=this.firstHistoryYear(),a=new Date().getFullYear();this.content.innerHTML=`
      <header class="task-history-heading">
        <div>
          <p class="contributions-eyebrow">TASK HISTORY</p>
          <h2 id="taskHistoryTitle">${i(e.text||`名称未設定`)}</h2>
          <p>${i(e.group?.trim()||`グループなし`)} ・ ${this.year}年</p>
        </div>
        <button type="button" class="task-history-close" data-action="close" aria-label="閉じる">閉じる</button>
      </header>
      <div class="task-history-year">
        <button type="button" data-action="year-step" data-step="-1" aria-label="前年" ${this.year<=r?`disabled`:``}>前年</button>
        <strong>${this.year}年</strong>
        <button type="button" data-action="year-step" data-step="1" aria-label="翌年" ${this.year>=a?`disabled`:``}>翌年</button>
      </div>
      <div class="task-history-graph-wrap">${this.renderTaskGraph(e)}</div>
      <div class="task-history-legend" aria-label="ステータスの凡例">
        <span><i class="task-history-cell is-uncompleted"></i>未実施</span>
        <span><i class="task-history-cell is-completed"></i>完了</span>
        <span><i class="task-history-cell is-cancelled"></i>キャンセル</span>
      </div>
      <section class="task-history-editor" aria-label="ステータス編集">
        <h3>ステータスを編集</h3>
        <label>日付<input type="date" data-edit-date value="${this.editDate}" /></label>
        <label>ステータス
          <select data-edit-status>
            <option value="" ${t===``?`selected`:``}>未実施</option>
            <option value="completed" ${t===`completed`?`selected`:``}>完了</option>
            <option value="cancelled" ${t===`cancelled`?`selected`:``}>キャンセル</option>
          </select>
        </label>
        <button type="button" class="task-history-save" data-action="save">ステータス変更</button>
        <p class="task-history-message" aria-live="polite">${this.editDate} の状態: ${n}</p>
      </section>
    `}renderTaskGraph(t){let n=new Date(this.year,0,1);n.setDate(n.getDate()-n.getDay());let r=new Date(this.year,11,31);r.setDate(r.getDate()+(6-r.getDay()));let i=[],a=new Date(n);for(;a<=r;){let e=[];for(let t=0;t<7;t+=1)e.push(new Date(a)),a.setDate(a.getDate()+1);i.push(e)}let o=i.map((e,t)=>{let n=e.find(e=>e.getFullYear()===this.year&&e.getDate()===1);return n?`<span style="grid-column:${t+1}">${new Intl.DateTimeFormat(`ja-JP`,{month:`short`}).format(n)}</span>`:``}).join(``),s=i.map((n,r)=>{let i=n.map(n=>{let r=e(n);if(n.getFullYear()!==this.year)return`<span class="task-history-cell is-outside" aria-hidden="true"></span>`;let i=t.history?.[r],a=i===`completed`?` is-completed`:i===`cancelled`?` is-cancelled`:` is-uncompleted`,o=i===`completed`?`完了`:i===`cancelled`?`キャンセル`:`未実施`;return`<button type="button" class="task-history-cell${a}${r===this.editDate?` is-selected`:``}" data-action="history-date" data-date="${r}" aria-label="${r}: ${o}" title="${r}: ${o}"></button>`}).join(``);return`<div class="task-history-week" style="grid-column:${r+2}">${i}</div>`}).join(``);return`<div class="task-history-graph" style="grid-template-columns:32px repeat(${i.length}, 12px)">
      <div class="task-history-months" style="grid-template-columns:repeat(${i.length}, 12px)">${o}</div>
      <span class="task-history-weekday task-history-weekday--mon">月</span>
      <span class="task-history-weekday task-history-weekday--wed">水</span>
      <span class="task-history-weekday task-history-weekday--fri">金</span>
      ${s}
    </div>`}async saveStatus(e){let t=this.task(),r=this.dialog.querySelector(`[data-edit-status]`)?.value,i=this.dialog.querySelector(`.task-history-message`);if(!t||!i||!n(this.editDate))return;this.repository.hydrateFromLocal();let a=this.repository.tasks.find(e=>e.id===this.selectedTaskId);if(!a){i.textContent=`タスクが見つかりません。`;return}r===`completed`||r===`cancelled`?a.history[this.editDate]=r:delete a.history[this.editDate],this.repository.recordTaskMutation(),e.disabled=!0;let o=this.repository.saveTasksWithSync();window.dispatchEvent(new Event(`storage`)),this.renderDialog(),this.renderSelectedActivity(!0);let s=this.dialog.querySelector(`[data-action="save"]`);s&&(s.disabled=!0);try{await o,window.dispatchEvent(new Event(`storage`)),this.renderDialog(),this.renderSelectedActivity(!0);let e=this.dialog.querySelector(`.task-history-message`);e&&(e.textContent=`${this.editDate} の状態を保存しました。`)}catch{window.dispatchEvent(new Event(`storage`)),this.renderDialog(),this.renderSelectedActivity(!0);let e=this.dialog.querySelector(`.task-history-message`);e&&(e.textContent=`端末には保存済みですが、Drive 同期に失敗しました。`)}finally{let e=this.dialog.querySelector(`[data-action="save"]`);e&&(e.disabled=!1)}}};document.addEventListener(`DOMContentLoaded`,()=>{let e=document.querySelector(`done-contributions`);e&&new c(e)})}));g(),v();