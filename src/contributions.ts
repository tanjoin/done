import './style.css';
import './contributions.css';
import Footer from './footer';
import Header from './header';
import LocalStorageManager from './local-storage-manager';
import type {DoneTaskData} from './types';

type ActivityByDate = Map<string, DoneTaskData[]>;

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && toDateKey(date) === value;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character] || character;
  });
}

class DoneContributions extends HTMLElement {
  private year = new Date().getFullYear();
  private selectedDate = toDateKey(new Date());
  private tasks: DoneTaskData[] = [];

  static get NAME(): string {
    return 'done-contributions';
  }

  connectedCallback(): void {
    document.body.classList.add('contribution-view-mode');
    document.documentElement.dataset.theme = LocalStorageManager.appTheme;
    this.tasks = LocalStorageManager.tasks;
    this.render();
    this.addEventListener('click', event => this.handleClick(event));
    window.addEventListener('storage', () => this.reload());
    window.addEventListener('focus', () => this.reload());
  }

  private handleClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const button = target.closest<HTMLButtonElement>(
      'button[data-date], button[data-year-step]',
    );
    if (!button || button.disabled) {
      return;
    }

    if (button.dataset.date) {
      this.selectedDate = button.dataset.date;
      this.render();
      return;
    }

    const step = Number(button.dataset.yearStep);
    const year = this.year + step;
    if (year <= new Date().getFullYear() && year >= this.firstActivityYear()) {
      this.year = year;
      this.selectedDate = `${year}-01-01`;
      this.render();
    }
  }

  private reload(): void {
    this.tasks = LocalStorageManager.tasks;
    const currentYear = new Date().getFullYear();
    this.year = Math.min(this.year, currentYear);
    this.year = Math.max(this.year, this.firstActivityYear());
    this.render();
  }

  private completedActivities(): ActivityByDate {
    const activities: ActivityByDate = new Map();
    this.tasks.forEach(task => {
      Object.entries(task.history || {}).forEach(([dateKey, status]) => {
        if (status !== 'completed' || !isValidDateKey(dateKey)) {
          return;
        }
        const dateTasks = activities.get(dateKey) || [];
        dateTasks.push(task);
        activities.set(dateKey, dateTasks);
      });
    });
    return activities;
  }

  private firstActivityYear(): number {
    const years = Array.from(this.completedActivities().keys()).map(dateKey =>
      Number(dateKey.slice(0, 4)),
    );
    return years.length > 0 ? Math.min(...years) : new Date().getFullYear();
  }

  private render(): void {
    const activities = this.completedActivities();
    const yearActivities = new Map(
      Array.from(activities.entries()).filter(([dateKey]) =>
        dateKey.startsWith(`${this.year}-`),
      ),
    );
    const total = Array.from(yearActivities.values()).reduce(
      (sum, dateTasks) => sum + dateTasks.length,
      0,
    );
    const activeDays = yearActivities.size;
    const longestStreak = this.longestStreak(yearActivities);
    const currentYear = new Date().getFullYear();

    this.innerHTML = `
      <main class="contributions-page">
        <section class="contributions-heading">
          <div>
            <p class="contributions-eyebrow">YOUR ACTIVITY</p>
            <h1>実施ログ</h1>
            <p class="contributions-description">完了したタスクの積み重ねを、日付ごとに振り返れます。</p>
          </div>
          <div class="year-selector" aria-label="表示する年">
            <button type="button" data-year-step="-1" aria-label="前年" ${this.year <= this.firstActivityYear() ? 'disabled' : ''}>前年</button>
            <strong>${this.year}年</strong>
            <button type="button" data-year-step="1" aria-label="翌年" ${this.year >= currentYear ? 'disabled' : ''}>翌年</button>
          </div>
        </section>

        <section class="activity-summary" aria-label="${this.year}年の実績">
          <div class="summary-item summary-item--primary">
            <strong>${total.toLocaleString('ja-JP')}</strong>
            <span>タスク完了</span>
          </div>
          <div class="summary-item">
            <strong>${activeDays.toLocaleString('ja-JP')}</strong>
            <span>実施した日</span>
          </div>
          <div class="summary-item">
            <strong>${longestStreak.toLocaleString('ja-JP')}</strong>
            <span>最長連続日数</span>
          </div>
        </section>

        <section class="activity-section" aria-label="${this.year}年の実施カレンダー">
          <div class="activity-section__topline">
            <h2>${this.year}年の記録</h2>
            <span>日付を選択してタスクを表示</span>
          </div>
          <div class="activity-scroll">
            ${this.renderGraph(yearActivities)}
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
          ${this.renderSelectedDay(activities)}
        </section>
      </main>
    `;
  }

  private renderGraph(activities: ActivityByDate): string {
    const firstDay = new Date(this.year, 0, 1);
    firstDay.setDate(firstDay.getDate() - firstDay.getDay());
    const lastDay = new Date(this.year, 11, 31);
    lastDay.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
    const weeks: Date[][] = [];
    const cursor = new Date(firstDay);

    while (cursor <= lastDay) {
      const week: Date[] = [];
      for (let day = 0; day < 7; day += 1) {
        week.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }

    const months: Array<{label: string; week: number}> = [];
    weeks.forEach((week, weekIndex) => {
      const firstMonthDay = week.find(
        date => date.getFullYear() === this.year && date.getDate() === 1,
      );
      if (firstMonthDay) {
        months.push({
          label: new Intl.DateTimeFormat('ja-JP', {month: 'short'}).format(
            firstMonthDay,
          ),
          week: weekIndex,
        });
      }
    });

    const monthLabels = months
      .map(
        month =>
          `<span class="month-label" style="grid-column:${month.week + 2}">${month.label}</span>`,
      )
      .join('');
    const weekColumns = weeks
      .map((week, weekIndex) => {
        const cells = week
          .map(date => {
            const dateKey = toDateKey(date);
            if (date.getFullYear() !== this.year) {
              return '<span class="activity-cell activity-cell--outside" aria-hidden="true"></span>';
            }
            const count = activities.get(dateKey)?.length || 0;
            const level =
              count === 0
                ? 0
                : count === 1
                  ? 1
                  : count <= 3
                    ? 2
                    : count <= 6
                      ? 3
                      : 4;
            const labelDate = new Intl.DateTimeFormat('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }).format(date);
            const isToday = dateKey === toDateKey(new Date());
            return `<button type="button" class="activity-cell activity-cell--${level}${isToday ? ' is-today' : ''}${dateKey === this.selectedDate ? ' is-selected' : ''}" data-date="${dateKey}" aria-label="${labelDate}: ${count}件完了" aria-pressed="${dateKey === this.selectedDate}" title="${labelDate}: ${count}件完了"></button>`;
          })
          .join('');
        return `<div class="activity-week" style="grid-column:${weekIndex + 2}">${cells}</div>`;
      })
      .join('');

    return `
      <div class="activity-graph" style="grid-template-columns:32px repeat(${weeks.length}, 12px)">
        <div class="activity-months" style="grid-template-columns:repeat(${weeks.length}, 12px)">${monthLabels}</div>
        <span class="weekday-label weekday-label--mon">月</span>
        <span class="weekday-label weekday-label--wed">水</span>
        <span class="weekday-label weekday-label--fri">金</span>
        ${weekColumns}
      </div>
    `;
  }

  private renderSelectedDay(activities: ActivityByDate): string {
    const dateTasks = activities.get(this.selectedDate) || [];
    const date = new Date(`${this.selectedDate}T00:00:00`);
    const label = new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }).format(date);
    const taskList = dateTasks.length
      ? `<ul class="activity-task-list">${dateTasks
          .map(task => {
            const group = task.group?.trim();
            const source =
              task.sourceType === 'google-todo'
                ? 'Google TODO'
                : task.sourceType === 'google-done'
                  ? 'Google DONE'
                  : 'ローカル';
            return `<li><span class="activity-task-name">${escapeHtml(task.text || '名称未設定')}</span><span class="activity-task-meta">${group ? `${escapeHtml(group)} ・ ` : ''}${source}</span></li>`;
          })
          .join('')}</ul>`
      : '<p class="activity-empty">この日の完了タスクはありません。</p>';

    return `
      <div class="selected-activity__heading">
        <div>
          <p class="contributions-eyebrow">SELECTED DAY</p>
          <h2>${label}</h2>
        </div>
        <strong>${dateTasks.length}件</strong>
      </div>
      ${taskList}
    `;
  }

  private longestStreak(activities: ActivityByDate): number {
    const timestamps = Array.from(activities.keys())
      .sort()
      .map(dateKey =>
        Date.UTC(
          Number(dateKey.slice(0, 4)),
          Number(dateKey.slice(5, 7)) - 1,
          Number(dateKey.slice(8, 10)),
        ),
      );
    let longest = 0;
    let streak = 0;
    let previous = Number.NaN;

    timestamps.forEach(timestamp => {
      streak = timestamp - previous === 86400000 ? streak + 1 : 1;
      longest = Math.max(longest, streak);
      previous = timestamp;
    });
    return longest;
  }
}

if (!customElements.get(DoneContributions.NAME)) {
  customElements.define(DoneContributions.NAME, DoneContributions);
}

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.container');
  if (!container) {
    return;
  }

  const header = document.createElement(Header.NAME) as Header;
  header.active = 'contributions';
  container.appendChild(header);

  const page = document.createElement(DoneContributions.NAME);
  container.appendChild(page);

  const footer = document.createElement(Footer.NAME) as Footer;
  container.appendChild(footer);
});
