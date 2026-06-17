import { NextRequest } from "next/server";

// Helper to decode JWT payload (non-verifying extraction for UID/exp)
function decodeJwt(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    return payload;
  } catch {
    return null;
  }
}

// Parse Firestore REST API document field formats
function parseFirestoreValue(value: any): any {
  if (!value) return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return parseInt(value.integerValue, 10);
  if ('mapValue' in value) {
    const obj: any = {};
    const fields = value.mapValue.fields || {};
    for (const key in fields) {
      obj[key] = parseFirestoreValue(fields[key]);
    }
    return obj;
  }
  return undefined;
}

export interface VerificationResult {
  uid: string;
  plan: string;
}

export async function verifyUserAndEnforceLimit(
  req: NextRequest,
  type: "generate" | "evaluate"
): Promise<VerificationResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const authErr = new Error("Missing or invalid Authorization header");
    (authErr as any).statusCode = 401;
    throw authErr;
  }

  const idToken = authHeader.substring(7);
  const payload = decodeJwt(idToken);
  if (!payload || !payload.sub) {
    const malformedErr = new Error("Invalid or malformed ID token");
    (malformedErr as any).statusCode = 401;
    throw malformedErr;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    const expErr = new Error("ID token has expired");
    (expErr as any).statusCode = 401;
    throw expErr;
  }

  const uid = payload.sub;

  // Verify token and fetch document from Firestore REST API
  // Using user's authorization token to validate the request
  const firestoreRes = await fetch(
    `https://firestore.googleapis.com/v1/projects/cs-prep-dashboard-v1/databases/(default)/documents/users/${uid}`,
    {
      headers: {
        Authorization: `Bearer ${idToken}`
      }
    }
  );

  if (!firestoreRes.ok) {
    const errText = await firestoreRes.text();
    console.error("Firestore verification failed:", errText);
    const verifyErr = new Error("Failed to verify user profile with authentication provider");
    (verifyErr as any).statusCode = firestoreRes.status === 401 || firestoreRes.status === 403 ? 401 : 500;
    throw verifyErr;
  }

  const docData = await firestoreRes.json();
  const fields = docData.fields || {};
  
  const plan = fields.plan ? parseFirestoreValue(fields.plan) : "free";
  
  if (plan !== "free") {
    return { uid, plan };
  }

  // Handle free tier rate limiting
  // Compute today's date in Indian Standard Time (IST)
  const today = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(today.getTime() + istOffset);
  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(istTime.getUTCDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;

  const rawUsage = fields.usage ? parseFirestoreValue(fields.usage) : null;
  let usage = {
    date: dateStr,
    generateCount: 0,
    evaluateCount: 0
  };

  if (rawUsage && rawUsage.date === dateStr) {
    usage = {
      date: dateStr,
      generateCount: rawUsage.generateCount || 0,
      evaluateCount: rawUsage.evaluateCount || 0
    };
  }

  if (type === "generate") {
    if (usage.generateCount >= 1) {
      const limitErr = new Error("Usage limit reached. Free Tier is limited to 1 question paper generation per day. Please upgrade to unlock unlimited access.");
      (limitErr as any).statusCode = 403;
      throw limitErr;
    }
    usage.generateCount++;
  } else {
    if (usage.evaluateCount >= 1) {
      const limitErr = new Error("Usage limit reached. Free Tier is limited to 1 answer sheet evaluation per day. Please upgrade to unlock unlimited access.");
      (limitErr as any).statusCode = 403;
      throw limitErr;
    }
    usage.evaluateCount++;
  }

  // Update the count in Firestore using PATCH REST API
  const patchUrl = `https://firestore.googleapis.com/v1/projects/cs-prep-dashboard-v1/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=usage`;
  const patchBody = {
    fields: {
      usage: {
        mapValue: {
          fields: {
            date: { stringValue: dateStr },
            generateCount: { integerValue: String(usage.generateCount) },
            evaluateCount: { integerValue: String(usage.evaluateCount) }
          }
        }
      }
    }
  };

  const patchRes = await fetch(patchUrl, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(patchBody)
  });

  if (!patchRes.ok) {
    const patchErr = await patchRes.text();
    console.error("Firestore PATCH failed:", patchErr);
    const patchErrObj = new Error("Failed to record daily usage details in your profile");
    (patchErrObj as any).statusCode = 500;
    throw patchErrObj;
  }

  return { uid, plan };
}
