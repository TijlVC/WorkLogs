import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDbYDUa2MkEQT0sf9JAdlmfPBD5hSpz2XY",
  authDomain: "worklog-app-2025.firebaseapp.com",
  projectId: "worklog-app-2025",
  storageBucket: "worklog-app-2025.firebasestorage.app",
  messagingSenderId: "244096639002",
  appId: "1:244096639002:web:389a9629c06daa16d8b1a3"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); 