export interface Task {
  id: number;
  text: string;
  done: boolean;
  secs: number;
}

interface User {
  name: string;
  email: string;
}

export interface AppState {
  tasks: Task[];
  user: User;
  save(): void;
}

const STORAGE_KEY = 'zento_temp_str';

function loadState(): Omit<AppState, 'save'> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);

  return {
    tasks: [],
    user: { name: '', email: '' },
  };
}

export function createState(): AppState {
  const data = loadState();
  const state: AppState = {
    ...data,
    save() {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { save: _, ...rest } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
    },
  };
  return state;
}
