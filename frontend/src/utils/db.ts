import Dexie, { Table } from 'dexie';

export interface IWorklog {
  id?: string;
  date: string;
  userId: string;
  hours: number;
  helpdeskSupport: {
    incidents: Array<{
      number: string;
      description: string;
    }>;
  };
  projects: Array<{
    number: string;
    description: string;
  }>;
  administration: {
    meetings: Array<{
      title: string;
      notes: Array<string>;
    }>;
  };
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