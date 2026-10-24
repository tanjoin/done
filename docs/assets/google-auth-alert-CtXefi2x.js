import{z as e}from"./google-drive-service-BG6YhD5w.js";function t(e){return`
    <div id="${e.statusId}" class="google-relogin-alert" role="alert" hidden>
      <span id="${e.messageId}"></span>
      <div class="google-relogin-alert-actions">
        <button id="${e.actionButtonId}" class="btn btn-action" type="button">${e.actionLabel}</button>
        <button id="${e.dismissButtonId}" class="google-relogin-dismiss-btn" type="button" aria-label="${e.dismissAriaLabel}">×</button>
      </div>
    </div>
  `}var n,r=e((()=>{n=class{_root;_ids;_onAction;_dismissed=!1;constructor(e){this._root=e.root,this._ids=e.ids,this._onAction=e.onAction}setup(){let e=this.query(this._ids.actionButtonId);e&&e.addEventListener(`click`,()=>{this._onAction?.()});let t=this.query(this._ids.dismissButtonId);t&&t.addEventListener(`click`,()=>{this._dismissed=!0,this.hide()})}show(e,t=!1){let n=this.query(this._ids.statusId),r=this.query(this._ids.messageId);n&&r&&(t&&this._dismissed||(r.textContent=e,n.hidden=!1))}hide(){let e=this.query(this._ids.statusId);e&&(e.hidden=!0)}query(e){return this._root.querySelector(`#${e}`)}}}));export{r as n,t as r,n as t};