"use client"

import {
  Session,
  GenerateSession,
  EvaluateSession,
  DashboardStats,
  SubjectPerformance,
  MistakePattern,
  SubjectName
} from "./types"
import { ALL_SUBJECTS } from "./subject-map"
import { auth, db } from "./firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"

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
  const trimmed = sessions.slice(0, 200)
  
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    const docRef = doc(db, "users", user.uid);
    await setDoc(docRef, { sessions: trimmed }, { merge: true });
  } catch (err) {
    console.error("Failed to save session to Firestore:", err);
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
    await setDoc(docRef, { sessions: newSessions }, { merge: true });
  } catch (err) {
    console.error("Failed to delete session:", err);
  }
}

export async function clearAllHistory(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    const docRef = doc(db, "users", user.uid);
    await setDoc(docRef, { sessions: [] }, { merge: true });
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

  const allDeductions = evaluations.flatMap(s => s.deductions)
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
