import * as admin from 'firebase-admin';

admin.initializeApp();
export const db = admin.firestore();

// Collection references
export const usersCollection = db.collection('users');
export const worklogsCollection = db.collection('worklogs'); 