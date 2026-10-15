import{C as e,S as t,T as n,b as r,n as i,t as a,w as o,x as s,y as c}from"./header-B0Wvl9Fi.js";var l=n((()=>{}));o((()=>{e(),l(),t(),i(),r();function n(e){return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,`0`)}-${String(e.getDate()).padStart(2,`0`)}`}function o(e){if(!/^\d{4}-\d{2}-\d{2}$/.test(e))return!1;let t=new Date(`${e}T00:00:00`);return!Number.isNaN(t.getTime())&&n(t)===e}function u(e){return e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e]||e)}var d=class extends HTMLElement{year=new Date().getFullYear();selectedDate=n(new Date);tasks=[];static get NAME(){return`done-contributions`}connectedCallback(){document.body.classList.add(`contribution-view-mode`),document.documentElement.dataset.theme=c.appTheme,this.tasks=c.tasks,this.render(),this.addEventListener(`click`,e=>this.handleClick(e)),window.addEventListener(`storage`,()=>this.reload()),window.addEventListener(`focus`,()=>this.reload())}handleClick(e){let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`button[data-date], button[data-year-step]`);if(!n||n.disabled)return;if(n.dataset.date){this.selectedDate=n.dataset.date,this.render();return}let r=Number(n.dataset.yearStep),i=this.year+r;i<=new Date().getFullYear()&&i>=this.firstActivityYear()&&(this.year=i,this.selectedDate=`${i}-01-01`,this.render())}reload(){this.tasks=c.tasks;let e=new Date().getFullYear();this.year=Math.min(this.year,e),this.year=Math.max(this.year,this.firstActivityYear()),this.render()}completedActivities(){let e=new Map;return this.tasks.forEach(t=>{Object.entries(t.history||{}).forEach(([n,r])=>{if(r!==`completed`||!o(n))return;let i=e.get(n)||[];i.push(t),e.set(n,i)})}),e}firstActivityYear(){let e=Array.from(this.completedActivities().keys()).map(e=>Number(e.slice(0,4)));return e.length>0?Math.min(...e):new Date().getFullYear()}render(){let e=this.completedActivities(),t=new Map(Array.from(e.entries()).filter(([e])=>e.startsWith(`${this.year}-`))),n=Array.from(t.values()).reduce((e,t)=>e+t.length,0),r=t.size,i=this.longestStreak(t),a=new Date().getFullYear();this.innerHTML=`
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
    `}renderGraph(e){let t=new Date(this.year,0,1);t.setDate(t.getDate()-t.getDay());let r=new Date(this.year,11,31);r.setDate(r.getDate()+(6-r.getDay()));let i=[],a=new Date(t);for(;a<=r;){let e=[];for(let t=0;t<7;t+=1)e.push(new Date(a)),a.setDate(a.getDate()+1);i.push(e)}let o=[];i.forEach((e,t)=>{let n=e.find(e=>e.getFullYear()===this.year&&e.getDate()===1);n&&o.push({label:new Intl.DateTimeFormat(`ja-JP`,{month:`short`}).format(n),week:t})});let s=o.map(e=>`<span class="month-label" style="grid-column:${e.week+2}">${e.label}</span>`).join(``),c=i.map((t,r)=>{let i=t.map(t=>{let r=n(t);if(t.getFullYear()!==this.year)return`<span class="activity-cell activity-cell--outside" aria-hidden="true"></span>`;let i=e.get(r)?.length||0,a=i===0?0:i===1?1:i<=3?2:i<=6?3:4,o=new Intl.DateTimeFormat(`ja-JP`,{year:`numeric`,month:`long`,day:`numeric`}).format(t);return`<button type="button" class="activity-cell activity-cell--${a}${r===n(new Date)?` is-today`:``}${r===this.selectedDate?` is-selected`:``}" data-date="${r}" aria-label="${o}: ${i}件完了" aria-pressed="${r===this.selectedDate}" title="${o}: ${i}件完了"></button>`}).join(``);return`<div class="activity-week" style="grid-column:${r+2}">${i}</div>`}).join(``);return`
      <div class="activity-graph" style="grid-template-columns:32px repeat(${i.length}, 12px)">
        <div class="activity-months" style="grid-template-columns:repeat(${i.length}, 12px)">${s}</div>
        <span class="weekday-label weekday-label--mon">月</span>
        <span class="weekday-label weekday-label--wed">水</span>
        <span class="weekday-label weekday-label--fri">金</span>
        ${c}
      </div>
    `}renderSelectedDay(e){let t=e.get(this.selectedDate)||[],n=new Date(`${this.selectedDate}T00:00:00`),r=new Intl.DateTimeFormat(`ja-JP`,{year:`numeric`,month:`long`,day:`numeric`,weekday:`long`}).format(n),i=t.length?`<ul class="activity-task-list">${t.map(e=>{let t=e.group?.trim(),n=e.sourceType===`google-todo`?`Google TODO`:e.sourceType===`google-done`?`Google DONE`:`ローカル`;return`<li><span class="activity-task-name">${u(e.text||`名称未設定`)}</span><span class="activity-task-meta">${t?`${u(t)} ・ `:``}${n}</span></li>`}).join(``)}</ul>`:`<p class="activity-empty">この日の完了タスクはありません。</p>`;return`
      <div class="selected-activity__heading">
        <div>
          <p class="contributions-eyebrow">SELECTED DAY</p>
          <h2>${r}</h2>
        </div>
        <strong>${t.length}件</strong>
      </div>
      ${i}
    `}longestStreak(e){let t=Array.from(e.keys()).sort().map(e=>Date.UTC(Number(e.slice(0,4)),Number(e.slice(5,7))-1,Number(e.slice(8,10)))),n=0,r=0,i=NaN;return t.forEach(e=>{r=e-i===864e5?r+1:1,n=Math.max(n,r),i=e}),n}};customElements.get(d.NAME)||customElements.define(d.NAME,d),document.addEventListener(`DOMContentLoaded`,()=>{let e=document.querySelector(`.container`);if(!e)return;let t=document.createElement(a.NAME);t.active=`contributions`,e.appendChild(t);let n=document.createElement(d.NAME);e.appendChild(n);let r=document.createElement(s.NAME);e.appendChild(r)})}))();