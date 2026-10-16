export default function promptForCalendarMemo(
  taskTitle: string,
): Promise<string | null> {
  const dialog = document.createElement('dialog');
  dialog.className = 'task-type-dialog task-add-memo-dialog';
  dialog.innerHTML = `
    <form class="task-type-dialog__form">
      <h4 class="task-type-dialog__title">カレンダーにメモを追加</h4>
      <p class="task-type-dialog__desc"></p>
      <label class="task-add-memo-dialog__label">
        追記するメモ
        <textarea class="setting-input task-add-memo-dialog__input" rows="5"></textarea>
      </label>
      <div class="task-type-dialog__actions task-add-memo-dialog__actions">
        <button type="button" class="btn btn-cancel" data-cancel>キャンセル</button>
        <button type="submit" class="btn btn-action">登録</button>
      </div>
    </form>
  `;

  const form = dialog.querySelector('form');
  const description = dialog.querySelector('.task-type-dialog__desc');
  const memoInput = dialog.querySelector('textarea');
  const cancelButton = dialog.querySelector('[data-cancel]');
  if (!form || !description || !memoInput || !cancelButton) {
    return Promise.resolve(null);
  }

  description.textContent = `「${taskTitle}」の予定に追記する内容を入力してください。`;

  return new Promise(resolve => {
    const finish = (memo: string | null) => {
      if (dialog.open) {
        dialog.close();
      }
      dialog.remove();
      resolve(memo);
    };

    form.addEventListener('submit', event => {
      event.preventDefault();
      finish(memoInput.value.trim());
    });
    cancelButton.addEventListener('click', () => finish(null));
    dialog.addEventListener('cancel', () => finish(null), {once: true});
    document.body.appendChild(dialog);
    if (typeof dialog.showModal !== 'function') {
      finish(null);
      return;
    }
    dialog.showModal();
    memoInput.focus();
  });
}