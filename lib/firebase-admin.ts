import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function normalizePrivateKey(privateKey: string) {
  let key = privateKey.trim();

  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  return key.replace(/\\n/g, "\n");
}

function getFirebaseAdminApp() {
  const existingApp = getApps()[0];
  if (existingApp) {
    return existingApp;
  }

  try {
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      const app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID || "cs-prep-dashboard-v1",
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL.trim(),
          privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
        }),
      });
      console.log("[FIREBASE_ADMIN] Initialized with service account cert.");
      return app;
    }

    const app = initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "cs-prep-dashboard-v1",
    });
    console.log("[FIREBASE_ADMIN] Initialized with Application Default Credentials.");
    return app;
  } catch (err) {
    console.error("[FIREBASE_ADMIN] Initialization failed:", err);
    throw err;
  }
}

export function getAdminDb() {
  return getFirestore(getFirebaseAdminApp());
}
