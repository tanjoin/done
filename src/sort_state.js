class SortState {
  constructor() {
    if (SortState._instance) {
      return SortState._instance;
    }
    this._column = null;
    this._ascending = true;
    SortState._instance = this;
  }

  /**
   * ソート対象の列 ('group', 'task', 'time', 'date', 'status')
   */
  static get column() {
    return new SortState()._column;
  }

  /**
   * true: 昇順, false: 降順
   */
  static get ascending() {
    return new SortState()._ascending;
  }

  static updateSortState(columnName) {
    new SortState()._updateSortState(columnName);
  }

  _updateSortState(columnName) {
    if (this._column === columnName) {
      this._ascending = !this._ascending;
    } else {
      this._column = columnName;
      this._ascending = true;
    }
  }
}

export default SortState;
