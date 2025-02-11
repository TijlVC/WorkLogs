import Dexie, { Table } from 'dexie';

export interface IWorklog {
  id?: string;
  date: string;
  userId: string;
  hours: number;
  projectTitle: string;
  phase: string;
  plannedTasks: Array<string>;
  completedTasks: Array<string>;
  administrativeTasks: Array<string>;
  other: Array<{
    task: string;
    description: string;
  }>;
  syncStatus?: 'pending' | 'synced' | 'error';
}

export class WorklogDB extends Dexie {
  worklogs!: Table<IWorklog>;

  constructor() {
    super('worklogDB');
    this.version(1).stores({
      worklogs: '++id, date, userId, syncStatus'
    });
  }
}

export const db = new WorklogDB(); 