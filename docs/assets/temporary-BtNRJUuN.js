import{a as e,c as t,d as n,i as r,l as i,n as a,o,r as s,s as c,t as l,u}from"./local-storage-manager-C3sy-sdz.js";n(),o(),r(),a(),u();var d=`done-temporary-form`,f=`done-temporary-form-reset`,p=`done-temporary-form-group-suggestions-update`,m=class extends HTMLElement{static get NAME(){return d}connectedCallback(){let e=this.renderForm();this.renderDate(e),this.renderGroup(e),this.renderText(e),this.renderTime(e),this.renderRemindMinutesBefore(e),this.renderDescription(e),this.renderLink(e),this.renderSkipCalendarOnComplete(e),this.renderStrictMode(e),this.renderSubmitButton(e),this.setup()}setup(){this.setupTheme(),this.setupDefaultDate(),this.setupGroupSuggestions(),document.addEventListener(f,()=>{this.resetForm()}),document.addEventListener(p,()=>{this.setupGroupSuggestions()})}setupGroupSuggestions(){let e=document.getElementById(`groupSuggestions`);if(!e)return;e.innerHTML=``;let t=l.tasks;if(t)try{if(Array.isArray(t)){let n=new Set;t.forEach(e=>{e.group&&e.group.trim()!==``&&n.add(e.group.trim())}),n.forEach(t=>{let n=document.createElement(`option`);n.value=t,e.appendChild(n)})}}catch{}}resetForm(){document.getElementById(`group`).value=``,document.getElementById(`text`).value=``,document.getElementById(`endDate`).value=``,document.getElementById(`startTime`).value=``,document.getElementById(`endTime`).value=``,document.getElementById(`remindMinutesBefore`).value=``,document.getElementById(`description`).value=``,document.getElementById(`link`).value=``,document.getElementById(`skipCalendarOnComplete`).checked=!1,document.getElementById(`strictMode`).checked=!1}setupDefaultDate(){document.getElementById(`date`).value=i.today,document.getElementById(`endDate`).value=``}setupTheme(){try{let e=l.appTheme;e&&e!==`system`?document.documentElement.setAttribute(`data-theme`,e):document.documentElement.removeAttribute(`data-theme`)}catch{}}renderDate(e){let t=document.createElement(`div`);t.style.width=`100%`,t.style.display=`flex`,t.style.gap=`16px`,t.style.flexWrap=`wrap`,t.innerHTML=`
        <div style="flex: 1; min-width: 220px;">
            <label style="font-size: 13px; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">開始日 *</label>
            <input type="date" id="date" required class="setting-input">
        </div>
        <div style="flex: 1; min-width: 220px;">
            <label style="font-size: 13px; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">終了日（省略可）</label>
            <input type="date" id="endDate" class="setting-input">
        </div>
        <p style="margin-top: 10px; color: var(--text-secondary); font-size: 13px;">終了日を設定すると、開始日から終了日の間に1回だけ実施すればOKになります。</p>
    `,e.appendChild(t)}renderGroup(e){let t=document.createElement(`div`);t.style.width=`100%`,t.innerHTML=`
        <label style="font-size: 13px; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">グループ（カテゴリー）</label>
        <input type="text" id="group" placeholder="例: 突発、買い物、通院" list="groupSuggestions" class="setting-input">
        <datalist id="groupSuggestions"></datalist>
    `,e.appendChild(t)}renderText(e){let t=document.createElement(`div`);t.style.width=`100%`,t.innerHTML=`
        <label style="font-size: 13px; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">タイトル（タスク名）</label>
        <input type="text" id="text" required placeholder="例: 役所で書類の申請" class="setting-input">
    `,e.appendChild(t)}renderTime(e){let t=document.createElement(`div`);t.style.width=`100%`,t.style.display=`flex`,t.style.gap=`16px`,t.innerHTML=`
        <div style="flex: 1;">
            <label style="font-size: 13px; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">開始時刻（省略可）</label>
            <input type="time" id="startTime" class="setting-input">
        </div>
        <div style="flex: 1;">
            <label style="font-size: 13px; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">終了時刻（省略可）</label>
            <input type="time" id="endTime" class="setting-input">
        </div>
    `,e.appendChild(t)}renderRemindMinutesBefore(e){let t=document.createElement(`div`);t.style.width=`100%`,t.innerHTML=`
        <label style="font-size: 13px; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">通知猶予（分, 省略可）</label>
        <input type="number" id="remindMinutesBefore" min="0" step="1" placeholder="例: 10（空欄で開始時刻ジャスト通知）" class="setting-input">
    `,e.appendChild(t)}renderDescription(e){let t=document.createElement(`div`);t.style.width=`100%`,t.innerHTML=`
        <label style="font-size: 13px; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">説明（省略可）</label>
        <textarea id="description" rows="2" placeholder="持ち物やメモなど" class="setting-input" style="font-family: inherit; resize: vertical;"></textarea>
    `,e.appendChild(t)}renderLink(e){let t=document.createElement(`div`);t.style.width=`100%`,t.innerHTML=`
        <label style="font-size: 13px; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">関連リンク（省略可）</label>
        <input type="url" id="link" placeholder="https://..." class="setting-input">
    `,e.appendChild(t)}renderSkipCalendarOnComplete(e){let t=document.createElement(`div`);t.style.width=`100%`,t.style.marginTop=`4px`,t.style.marginBottom=`8px`,t.innerHTML=`
        <label class="theme-option" style="margin-bottom: 0;">
            <input type="checkbox" id="skipCalendarOnComplete">
            <span>完了時にGoogleカレンダーへ追加しない</span>
        </label>
    `,e.appendChild(t)}renderStrictMode(e){let t=document.createElement(`div`);t.style.width=`100%`,t.style.marginTop=`4px`,t.style.marginBottom=`8px`,t.innerHTML=`
        <label class="theme-option" style="margin-bottom: 0;">
            <input type="checkbox" id="strictMode">
            <span>時間外の操作を禁止する（厳格モード）</span>
        </label>
    `,e.appendChild(t)}renderSubmitButton(e){let t=document.createElement(`button`);t.type=`submit`,t.className=`btn btn-action`,t.style.width=`100%`,t.style.padding=`12px`,t.textContent=`本番リストに追加する`,e.appendChild(t)}renderForm(){let e=document.createElement(`form`);return e.id=`taskForm`,e.classList.add(`setting-form`),e.style.marginTop=`24px`,this.appendChild(e),e}};customElements.get(`done-temporary-form`)||customElements.define(d,m),a();var h=`done-temporary-history`,g=`done-temporary-history-add`,_=`done-temporary-history-render-history`,v=class extends HTMLElement{_tempHistory=[];static get NAME(){return h}handleCopyToFormEvent(e){if(e){let t=Object.keys(e);for(let n of t){let t=document.getElementById(n);t&&(n===`strictMode`?t.checked=e.strictMode||!1:n===`skipCalendarOnComplete`?t.checked=e.skipCalendarOnComplete||!1:t.value=String(e[n]??``))}}}connectedCallback(){this.render(),this.init()}init(){this.loadTempHistoryFromStorage(),this.renderHistory(),document.addEventListener(g,e=>{let t=e;this.addHistoryItem(t.detail)}),document.addEventListener(_,()=>{this.renderHistory()})}addHistoryItem(e){this._tempHistory.unshift(e),this._tempHistory.length>20&&this._tempHistory.pop(),l.temporaryInputHistory=this._tempHistory,alert(`一時的タスクの履歴に追加しました。`),this.renderHistory()}loadTempHistoryFromStorage(){this._tempHistory=l.temporaryInputHistory}render(){this.innerHTML=`
      <div style="margin-top: 40px; margin-bottom: 16px;">
          <h3 class="group-title">過去に追加した一時的タスク（クリックで内容をコピー）</h3>
          <div id="historyContainer" style="margin-top: 16px;"></div>
      </div>
    `}copyTemplateToForm(e,t){t.stopPropagation();let n=this._tempHistory.find(t=>t.id===e);n&&(this.handleCopyToFormEvent(n),window.scrollTo({top:0,behavior:`smooth`}))}deleteHistory(e,t){t.stopPropagation(),this._tempHistory=this._tempHistory.filter(t=>t.id!==e),l.temporaryInputHistory=this._tempHistory,this.renderHistory()}renderHistory(){let e=document.getElementById(`historyContainer`);if(e){if(e.innerHTML=``,this._tempHistory.length===0){e.innerHTML=`<p style="color: var(--text-muted); font-style: italic;">過去に追加したタスク履歴はありません。</p>`;return}this._tempHistory.forEach(t=>{let n=document.createElement(`div`);n.className=`history-item`;let r=t.startTime||t.endTime?` (${t.startTime||`00:00`}〜${t.endTime||`23:59`})`:``,i=t.remindMinutesBefore!==null&&t.remindMinutesBefore!==void 0?`<br><small>通知: ${t.remindMinutesBefore} 分前</small>`:``,a=t.group?`[${t.group}] `:``,o=t.endDate?`<br><small>終了日: ${t.endDate}</small>`:``,s=t.skipCalendarOnComplete?`<br><small>完了時カレンダー追加: しない</small>`:``;n.innerHTML=`
            <div class="history-info">
                <strong>${a}${t.text}</strong>${r}
                ${i}
                ${t.description?`<br><small>${t.description}</small>`:``}
                ${o}
                ${s}
            </div>
            <div>
                <button class="btn-reuse">再利用</button>
                <button class="btn-delete">削除</button>
            </div>
        `,n.querySelector(`.btn-reuse`)?.addEventListener(`click`,e=>{this.copyTemplateToForm(t.id,e)}),n.querySelector(`.btn-delete`)?.addEventListener(`click`,e=>{this.deleteHistory(t.id,e)}),e.appendChild(n)})}}};customElements.get(`done-temporary-history`)||customElements.define(h,v),a(),t();var y=class e extends HTMLElement{static get NAME(){return`done-temporary`}connectedCallback(){this.render()}render(){this.innerHTML=`
      <main>
        <div class="data-box">
          ${document.createElement(m.NAME).outerHTML}
          ${document.createElement(v.NAME).outerHTML}
        </div>
      </main>
    `}static publishTemporaryTask(t){t.preventDefault();let n=e.getInputElement(`date`).value,r=e.getInputElement(`endDate`).value,i=e.getInputElement(`group`).value.trim(),a=e.getInputElement(`text`).value.trim(),o=e.getInputElement(`startTime`).value,s=e.getInputElement(`endTime`).value,u=e.getInputElement(`remindMinutesBefore`).value,d=e.getInputElement(`description`).value.trim(),m=e.getInputElement(`link`).value.trim(),h=e.getInputElement(`skipCalendarOnComplete`).checked,v=e.getInputElement(`strictMode`).checked,y=null;if(u!==``){let e=Number(u);if(!Number.isFinite(e)||e<0){alert(`通知猶予は 0 以上の数値で入力してください。`);return}y=Math.floor(e)}let b=l.tasks;if(r&&r<n){alert(`終了日は開始日と同じかそれ以降の日付にしてください。`);return}let x=new c({id:`actual_temp_`+Date.now()+`_`+Math.random().toString(36).substring(2,7),group:i,text:a,startTime:o,endTime:s,remindMinutesBefore:y,description:d,link:m,skipCalendarOnComplete:h,strictMode:v,history:{},notifiedDate:``,specificDate:n,endDate:r});b.push(x),l.tasks=b;let S={id:`hist_`+Date.now(),group:i,text:a,endDate:r,startTime:o,endTime:s,remindMinutesBefore:y,description:d,link:m,skipCalendarOnComplete:h,strictMode:v};document.dispatchEvent(new CustomEvent(g,{detail:S,bubbles:!0})),document.dispatchEvent(new CustomEvent(f,{bubbles:!0})),document.dispatchEvent(new CustomEvent(_,{bubbles:!0})),document.dispatchEvent(new CustomEvent(p,{bubbles:!0}))}static getInputElement(e){return document.getElementById(e)}};customElements.get(y.NAME)||customElements.define(y.NAME,y),document.addEventListener(`DOMContentLoaded`,async()=>{let t=document.querySelector(`.container`);if(t){let n=document.createElement(s.NAME);n.active=`temporary`,t.appendChild(n);let r=document.createElement(`h3`);r.className=`group-title`,r.textContent=`一時的タスクを追加する`,t.appendChild(r);let i=document.createElement(y.NAME);t.appendChild(i),document.getElementById(`taskForm`).addEventListener(`submit`,y.publishTemporaryTask);let a=document.createElement(e.NAME);t.appendChild(a)}});