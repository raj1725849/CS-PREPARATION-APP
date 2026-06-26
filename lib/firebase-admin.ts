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
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || "cs-prep-dashboard-v1";

    if (!clientEmail || !privateKey) {
      throw new Error(
        "Firebase Admin service account env vars are missing. Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in the production environment."
      );
    }

    const app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: normalizePrivateKey(privateKey),
      }),
    });
    console.log("[FIREBASE_ADMIN] Initialized with service account cert.");
    return app;
  } catch (err) {
    console.error("[FIREBASE_ADMIN] Initialization failed:", err);
    throw err;
  }
}

export function getAdminDb() {
  return getFirestore(getFirebaseAdminApp());
}
