class TableManager {
  static createTableWrapperDiv() {
    const tableWrapper = document.createElement("div");
    tableWrapper.className = "table-wrapper";
    return tableWrapper;
  }

  static createTableTag() {
    const table = document.createElement("table");
    table.className = "task-table";
    return table;
  }

  static get headers() {
    return [
      {
        group: "グループ",
        task: "タスク",
        time: "時間",
        date: "日付",
        status: "ステータス",
      },
    ];
  }

  static createTHeadTag() {
    const thead = document.createElement("thead");
    const tr = document.createElement("tr");

    TableManager.headers.forEach((header) => {
      for (const key in header) {
        const th = document.createElement("th");

        th.textContent = header[key];
        th.setAttribute("data-sort-col", key);
        th.style.cursor = "pointer";
        th.style.userSelect = "none";

        const sortIndicator = document.createElement("span");
        sortIndicator.className = "sort-indicator";
        th.appendChild(sortIndicator);

        tr.appendChild(th);
      }
    });

    const operationHeader = document.createElement("th");
    operationHeader.textContent = "操作";
    tr.appendChild(operationHeader);

    thead.appendChild(tr);
    return thead;
  }

  static createTBodyTag() {
    const tbody = document.createElement("tbody");
    return tbody;
  }

  static createTableWrapper(tasks) {
    const tableWrapper = TableManager.createTableWrapperDiv();
    const table = TableManager.createTableTag();
    const thead = TableManager.createTHeadTag();
    table.appendChild(thead);

    const tbody = TableManager.createTBodyTag();
    table.appendChild(tbody);

    TableManager.insertTasks(
      tasks,
      tbody,
      DateHelper.today,
      DateHelper.yesterday,
    );

    tableWrapper.appendChild(table);
    return tableWrapper;
  }

  static insertTasks(tasks, tbody, today, yesterday) {
    tasks.forEach((task, idx) => {
      const row = document.createElement("tr");
      const taskObject = new Task(task);
      const taskIndex = tasks.findIndex((t) => t.id === task.id);
      taskObject.insertRowElements(row, taskIndex);
      tbody.appendChild(row);
    });
  }

  static renderTableView(container, filteredTasks, today, targetDayMap) {
    container.appendChild(TableManager.createTableWrapper(filteredTasks));
  }
}

export default TableManager;
