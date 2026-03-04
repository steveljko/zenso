import type { WindowManager } from '../../engine';
import { AppState } from '../../state';
import html from './index.html';

export function registerTasks(wm: WindowManager, state: AppState): void {
  wm.register({
    id: 'tasks',
    title: 'Tasks',
    accentColor: 'var(--red)',
    content: html,
    hidden: true,
  });

  initTasksLogic(state);
}

let activeTaskIdx = -1;
let taskTimerInterval: ReturnType<typeof setInterval> | null = null;

function formatTime(s: number): string {
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function calcTotalTime(state: AppState): string {
  const total = state.tasks.reduce((sum, t) => sum + (t.secs || 0), 0);
  return formatTime(total);
}

function initTasksLogic(state: AppState): void {
  const root = document.querySelector('.tasks')!;
  const els = {
    input: root.querySelector('input') as HTMLInputElement,
    add: root.querySelector('.task-add button') as HTMLButtonElement,
    ul: root.querySelector('ul') as HTMLUListElement,
    empty: root.querySelector('.task-empty') as HTMLElement,
    stats: root.querySelector('.task-stats') as HTMLElement,
    totalTime: root.querySelector('.task-total_time #time') as HTMLElement,
    clear: root.querySelector('.task-clear') as HTMLElement,
  };

  function stopTaskTimer(): void {
    if (taskTimerInterval) {
      clearInterval(taskTimerInterval);
      taskTimerInterval = null;
    }
    activeTaskIdx = -1;
    render();
  }

  function toggleTaskTimer(i: number): void {
    if (activeTaskIdx === i) {
      stopTaskTimer();
      return;
    }
    if (taskTimerInterval) clearInterval(taskTimerInterval);
    activeTaskIdx = i;
    taskTimerInterval = setInterval(() => {
      const task = state.tasks[activeTaskIdx];
      if (!task) return;
      task.secs++;
      state.save();

      const li = els.ul.querySelector<HTMLElement>(`[data-idx="${activeTaskIdx}"]`);
      if (li) li.querySelector('.ti-time')!.textContent = formatTime(task.secs);

      els.totalTime.textContent = calcTotalTime(state);
    }, 1000);
    render();
  }

  function render(): void {
    els.ul.innerHTML = '';
    els.empty.style.display = state.tasks.length === 0 ? 'block' : 'none';
    const done = state.tasks.filter((t) => t.done).length;
    els.stats.textContent = `${done} / ${state.tasks.length} done`;

    state.tasks.forEach((task, i) => {
      const li = document.createElement('li');
      li.className =
        'ti' + (task.done ? ' done' : '') + (i === activeTaskIdx ? ' active-task' : '');
      li.dataset.idx = String(i);

      const check = document.createElement('div');
      check.className = 'ti-check';

      const text = document.createElement('span');
      text.className = 'ti-text';
      text.textContent = task.text;

      const timeEl = document.createElement('span');
      timeEl.className = 'ti-time';
      timeEl.textContent = task.secs > 0 ? formatTime(task.secs) : '';

      const startBtn = document.createElement('button');
      startBtn.className = 'ti-start-btn';
      startBtn.textContent = i === activeTaskIdx ? '■ Stop' : '▶ Track';

      const del = document.createElement('button');
      del.className = 'ti-del';
      del.textContent = '×';

      li.append(check, text, timeEl, startBtn, del);
      els.ul.appendChild(li);
    });

    els.totalTime.textContent = calcTotalTime(state);
  }

  els.ul.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const li = target.closest<HTMLLIElement>('.ti');
    if (!li) return;
    const i = Number(li.dataset.idx);

    if (target.closest('.ti-del')) {
      if (i === activeTaskIdx) stopTaskTimer();
      state.tasks.splice(i, 1);
      state.save();
      render();
    } else if (target.closest('.ti-start-btn')) {
      toggleTaskTimer(i);
    } else if (target.closest('.ti-check')) {
      state.tasks[i]!.done = !state.tasks[i]!.done;
      state.save();
      render();
    }
  });

  function addTask(): void {
    const text = els.input.value.trim();
    if (!text) return;
    state.tasks.push({ text, done: false, id: Date.now(), secs: 0 });
    state.save();
    render();
    els.input.value = '';
    els.input.focus();
  }

  els.add.addEventListener('click', addTask);
  els.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTask();
  });

  els.clear.addEventListener('click', () => {
    if (activeTaskIdx >= 0 && state.tasks[activeTaskIdx]?.done) stopTaskTimer();
    state.tasks = state.tasks.filter((t) => !t.done);
    state.save();
    render();
  });

  render();
}
