import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

if (getApps().length === 0) {
  try {
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID || "cs-prep-dashboard-v1",
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
      console.log("[FIREBASE_ADMIN] Initialized with service account cert.");
    } else {
      initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "cs-prep-dashboard-v1",
      });
      console.log("[FIREBASE_ADMIN] Initialized with Application Default Credentials.");
    }
  } catch (err) {
    console.error("[FIREBASE_ADMIN] Initialization failed:", err);
  }
}

export const adminDb = getFirestore();
export const adminAuth = getAuth();
