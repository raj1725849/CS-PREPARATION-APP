import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDM8_Crsi0BneFuMNmbD4WorwDEL7djvv4",
  authDomain: "cs-prep-dashboard-v1.firebaseapp.com",
  projectId: "cs-prep-dashboard-v1",
  storageBucket: "cs-prep-dashboard-v1.firebasestorage.app",
  messagingSenderId: "204081024292",
  appId: "1:204081024292:web:475f8aa886874784acf7b1"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
