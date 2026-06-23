"use client"

import {
  Session,
  GenerateSession,
  EvaluateSession,
  DashboardStats,
  SubjectPerformance,
  MistakePattern,
  SubjectName,
  UserProfile,
  BillingPlan
} from "./types"
import { ALL_SUBJECTS } from "./subject-map"
import { auth, db } from "./firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"

function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export async function getAllSessions(): Promise<Session[]> {
  const user = auth.currentUser;
  if (!user) return [];
  
  try {
    const docRef = doc(db, "users", user.uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return (snap.data().sessions || []) as Session[];
    }
    return [];
  } catch (err) {
    console.error("Failed to fetch sessions from Firestore:", err);
    return [];
  }
}

export async function saveSession(session: Session): Promise<void> {
  const sessions = await getAllSessions()
  sessions.unshift(session)
  const trimmed = sessions.slice(0, 100)
  
  // Strip originalImages from all sessions to prevent Firestore 1MB document limit
  const cleaned = trimmed.map(s => {
    if (s.type === "evaluate" && (s as EvaluateSession).originalImages) {
      const { originalImages, ...rest } = s as EvaluateSession;
      return rest as Session;
    }
    return s;
  });
  
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    const docRef = doc(db, "users", user.uid);
    await setDoc(docRef, sanitizeForFirestore({ sessions: cleaned }), { merge: true });
  } catch (err) {
    console.error("Failed to save session to Firestore:", err);
  }
}

export async function updateSession(updatedSession: Session): Promise<void> {
  const sessions = await getAllSessions();
  const idx = sessions.findIndex(s => s.id === updatedSession.id);
  if (idx !== -1) {
    sessions[idx] = updatedSession;
    const user = auth.currentUser;
    if (!user) return;
    try {
      const docRef = doc(db, "users", user.uid);
      await setDoc(docRef, sanitizeForFirestore({ sessions }), { merge: true });
    } catch (err) {
      console.error("Failed to update session in Firestore:", err);
    }
  }
}

export async function getSessionById(id: string): Promise<Session | null> {
  const sessions = await getAllSessions();
  return sessions.find(s => s.id === id) || null
}

export async function deleteSession(id: string): Promise<void> {
  const sessions = await getAllSessions();
  const newSessions = sessions.filter(s => s.id !== id)
  
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    const docRef = doc(db, "users", user.uid);
    await setDoc(docRef, sanitizeForFirestore({ sessions: newSessions }), { merge: true });
  } catch (err) {
    console.error("Failed to delete session:", err);
  }
}

export async function clearAllHistory(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    const docRef = doc(db, "users", user.uid);
    await setDoc(docRef, sanitizeForFirestore({ sessions: [] }), { merge: true });
  } catch (err) {
    console.error("Failed to clear history:", err);
  }
}

export async function getEvaluateSessions(): Promise<EvaluateSession[]> {
  const sessions = await getAllSessions();
  return sessions.filter(s => s.type === "evaluate") as EvaluateSession[]
}

export async function getGenerateSessions(): Promise<GenerateSession[]> {
  const sessions = await getAllSessions();
  return sessions.filter(s => s.type === "generate") as GenerateSession[]
}

export async function getSessionsThisWeek(type?: "generate" | "evaluate"): Promise<Session[]> {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  
  const allSessions = await getAllSessions();
  const sessions = type
    ? allSessions.filter(s => s.type === type)
    : allSessions
  return sessions.filter(s => new Date(s.date) >= oneWeekAgo)
}

export async function getSessionsLastWeek(type?: "generate" | "evaluate"): Promise<Session[]> {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  
  const allSessions = await getAllSessions();
  const sessions = type
    ? allSessions.filter(s => s.type === type)
    : allSessions
  return sessions.filter(s => {
    const d = new Date(s.date)
    return d >= twoWeeksAgo && d < oneWeekAgo
  })
}

export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export async function computeDashboardStats(): Promise<DashboardStats> {
  const allSessions = await getAllSessions()
  const evaluations = await getEvaluateSessions()
  const generates = await getGenerateSessions()

  const thisWeekEvals = await getSessionsThisWeek("evaluate") as EvaluateSession[]
  const lastWeekEvals = await getSessionsLastWeek("evaluate") as EvaluateSession[]

  const avgScore = evaluations.length > 0
    ? evaluations.reduce((sum, s) => sum + s.score_percentage, 0) / evaluations.length
    : 0

  const avgThisWeek = thisWeekEvals.length > 0
    ? thisWeekEvals.reduce((sum, s) => sum + s.score_percentage, 0) / thisWeekEvals.length
    : 0

  const avgLastWeek = lastWeekEvals.length > 0
    ? lastWeekEvals.reduce((sum, s) => sum + s.score_percentage, 0) / lastWeekEvals.length
    : 0

  const subjectPerformance: SubjectPerformance[] = ALL_SUBJECTS.map(subject => {
    const subjectEvals = evaluations.filter(s => s.subject === subject)
    if (subjectEvals.length === 0) {
      return {
        subject,
        avgScore: 0,
        attemptCount: 0,
        trend: "stable" as const,
        lastAttemptScore: 0
      }
    }

    const avg = subjectEvals.reduce((sum, s) => sum + s.score_percentage, 0) / subjectEvals.length
    const lastScore = subjectEvals[0].score_percentage
    const prevScore = subjectEvals.length > 1 ? subjectEvals[1].score_percentage : lastScore
    const trend = lastScore > prevScore + 2
      ? "up" as const
      : lastScore < prevScore - 2
      ? "down" as const
      : "stable" as const

    return {
      subject,
      avgScore: Math.round(avg * 10) / 10,
      attemptCount: subjectEvals.length,
      trend,
      lastAttemptScore: lastScore
    }
  }).filter(s => s.attemptCount > 0)

  const weakestSubject = subjectPerformance.length > 0
    ? subjectPerformance.reduce((a, b) => a.avgScore < b.avgScore ? a : b)
    : null

  const allDeductions = evaluations.flatMap(s => s.deductions || [])
  const mistakeMap: Record<string, { type: string; frequency: number }> = {}

  allDeductions.forEach(d => {
    const text = d.text || d.what_was_expected || d.check_type || ""
    const key = d.type + "_" + text.slice(0, 60).toLowerCase()
    if (mistakeMap[key]) {
      mistakeMap[key].frequency++
    } else {
      mistakeMap[key] = { type: d.type, frequency: 1 }
    }
  })

  const missingCount = allDeductions.filter(d => d.type === "missing").length
  const wrongCount = allDeductions.filter(d => d.type === "wrong").length
  const incompleteCount = allDeductions.filter(d => d.type === "incomplete").length

  const mistakePatterns: MistakePattern[] = [
    { type: "missing" as const, description: "Missing specific section numbers", frequency: missingCount },
    { type: "missing" as const, description: "Not citing relevant case laws", frequency: Math.floor(missingCount * 0.7) },
    { type: "wrong" as const, description: "Wrong statutory thresholds or limits", frequency: wrongCount },
    { type: "incomplete" as const, description: "Vague legal language used", frequency: incompleteCount },
    { type: "incomplete" as const, description: "Incomplete procedural steps", frequency: Math.floor(incompleteCount * 0.8) },
  ]
    .filter(m => m.frequency > 0)
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 6)

  const scoreTrend = evaluations
    .slice(0, 20)
    .reverse()
    .map(s => s.score_percentage)

  return {
    totalPapersGenerated: generates.length,
    totalEvaluations: evaluations.length,
    avgScorePercent: Math.round(avgScore * 10) / 10,
    avgScoreThisWeek: Math.round(avgThisWeek * 10) / 10,
    avgScoreLastWeek: Math.round(avgLastWeek * 10) / 10,
    weakestSubject: weakestSubject?.subject || null,
    weakestSubjectAvg: weakestSubject?.avgScore || 0,
    subjectPerformance,
    mistakePatterns,
    scoreTrend,
    recentSessions: allSessions.slice(0, 10)
  }
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const docRef = doc(db, "users", user.uid);
    const snap = await getDoc(docRef);
    let dbProfile: UserProfile | null = null;
    if (snap.exists()) {
      const data = snap.data();
      const plan = data.plan || "free";
      const expiresAt = data.expiresAt || null;

      let activePlan = plan;
      if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
        activePlan = "free";
      }

      dbProfile = {
        uid: user.uid,
        email: user.email || data.email || null,
        displayName: user.displayName || data.displayName || null,
        plan: activePlan as BillingPlan,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        usage: data.usage,
        expiresAt: data.expiresAt || null,
        subscriptionStatus: data.subscriptionStatus || null,
        razorpayPaymentId: data.razorpayPaymentId || null,
        razorpayOrderId: data.razorpayOrderId || null,
        upgradedAt: data.upgradedAt || null
      };
    } else {
      // Default profile if user doc doesn't exist yet but user is logged in
      dbProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        plan: "free",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    // Merge with local storage subscription if running on localhost (for dev checkout testing)
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      const localSubStr = localStorage.getItem("cs_prep_local_subscription");
      if (localSubStr) {
        try {
          const localSub = JSON.parse(localSubStr);
          if (localSub.uid === user.uid) {
            dbProfile = {
              ...dbProfile,
              plan: localSub.plan || dbProfile.plan,
              subscriptionStatus: localSub.subscriptionStatus || dbProfile.subscriptionStatus,
              expiresAt: localSub.expiresAt || dbProfile.expiresAt,
              razorpayPaymentId: localSub.razorpayPaymentId || dbProfile.razorpayPaymentId,
              razorpayOrderId: localSub.razorpayOrderId || dbProfile.razorpayOrderId,
              upgradedAt: localSub.upgradedAt || dbProfile.upgradedAt
            };
          }
        } catch (e) {
          console.error("Error merging local subscription:", e);
        }
      }
    }

    return dbProfile;
  } catch (err) {
    console.error("Failed to fetch user profile from Firestore:", err);
    return null;
  }
}

export async function updateUserProfile(data: Partial<UserProfile>): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const subscriptionKeys = ["plan", "subscriptionStatus", "expiresAt", "razorpayPaymentId", "razorpayOrderId", "upgradedAt"];

  // If in localhost and updating subscription keys, save to localStorage
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    const hasSubKeys = Object.keys(data).some(key => subscriptionKeys.includes(key));
    if (hasSubKeys) {
      try {
        const localSubStr = localStorage.getItem("cs_prep_local_subscription");
        let currentSub = localSubStr ? JSON.parse(localSubStr) : {};
        currentSub = {
          ...currentSub,
          uid: user.uid,
          ...Object.fromEntries(Object.entries(data).filter(([k]) => subscriptionKeys.includes(k)))
        };
        localStorage.setItem("cs_prep_local_subscription", JSON.stringify(currentSub));
        console.log("[STORAGE] Saved subscription info locally:", currentSub);
      } catch (e) {
        console.error("Error updating local subscription:", e);
      }
    }
  }

  // Filter out subscription keys from the payload to avoid firestore rules error on localhost
  const firestoreData = { ...data };
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    subscriptionKeys.forEach(k => delete (firestoreData as any)[k]);
  }

  if (Object.keys(firestoreData).length === 0) {
    return;
  }

  try {
    const docRef = doc(db, "users", user.uid);
    await setDoc(docRef, sanitizeForFirestore({ ...firestoreData, updatedAt: new Date().toISOString() }), { merge: true });
  } catch (err) {
    console.error("Failed to update user profile in Firestore:", err);
  }
}

export async function checkAndIncrementUsage(
  type: "generate" | "evaluate"
): Promise<{ allowed: boolean; limitReached: boolean }> {
  const user = auth.currentUser;
  if (!user) return { allowed: false, limitReached: false };

  try {
    const profile = await getUserProfile();
    if (!profile) return { allowed: false, limitReached: false };

    // Premium users have unlimited access
    if (profile.plan !== "free") {
      return { allowed: true, limitReached: false };
    }

    // Get current local date in YYYY-MM-DD
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    let usage = profile.usage;
    if (!usage || usage.date !== dateStr) {
      // Reset daily counts for today
      usage = {
        date: dateStr,
        generateCount: 0,
        evaluateCount: 0
      };
    }

    if (type === "generate") {
      if (usage.generateCount >= 1) {
        return { allowed: false, limitReached: true };
      }
      usage.generateCount++;
    } else {
      if (usage.evaluateCount >= 1) {
        return { allowed: false, limitReached: true };
      }
      usage.evaluateCount++;
    }

    // Save back to Firestore
    const docRef = doc(db, "users", user.uid);
    await setDoc(docRef, sanitizeForFirestore({ usage, updatedAt: new Date().toISOString() }), { merge: true });

    return { allowed: true, limitReached: false };
  } catch (err) {
    console.error("Failed to check or increment usage in Firestore:", err);
    // Allow as a fallback in case of db issues
    return { allowed: true, limitReached: false };
  }
}

