import Dexie, { Table } from 'dexie';

export interface IWorklog {
  id?: string;
  date: string;
  userId: string;
  hours: number;
  projectTitle: string;
  phase: string;
  plannedTasks: Array<{
    task: string;
    completed: boolean;
  }>;
  administrativeTasks: Array<{
    task: string;
    completed: boolean;
  }>;
  syncStatus?: 'pending' | 'synced' | 'error';
}

export class WorklogDB extends Dexie {
  worklogs!: Table<IWorklog>;

  constructor() {
    super('worklogDB');
    this.version(3).stores({
      worklogs: '++id, date, userId, syncStatus'
    });
  }
}

export const db = new WorklogDB(); 