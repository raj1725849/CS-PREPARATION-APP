/**
 * Server-side Firestore CRUD for questions and evaluations.
 * Uses the Firestore REST API with user idTokens, matching the
 * existing pattern in firebase-server.ts.
 */

import { QuestionDocument, EvaluationDocument, GeneratedPaperDocument, IdealAnswerDocument } from "./types";

const FIRESTORE_BASE = "https://firestore.googleapis.com/v1/projects/cs-prep-dashboard-v1/databases/(default)/documents";

// ─── ID Generation ───────────────────────────────────────────────

export function generateQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function generateEvaluationId(): string {
  return `eval_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Deterministic text hash for deduplication lookups.
 * Produces a stable string from question text so we can find
 * existing question documents without scanning all docs.
 */
export function computeTextHash(text: string): string {
  let hash = 0;
  const normalized = text.toLowerCase().replace(/[^\w]/g, "").trim();
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return "th_" + Math.abs(hash).toString(36);
}

// ─── Firestore REST Helpers ──────────────────────────────────────

function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "string") return { stringValue: val };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === "object") {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(val: any): any {
  if (!val) return undefined;
  if ("nullValue" in val) return null;
  if ("stringValue" in val) return val.stringValue;
  if ("integerValue" in val) return parseInt(val.integerValue, 10);
  if ("doubleValue" in val) return val.doubleValue;
  if ("booleanValue" in val) return val.booleanValue;
  if ("arrayValue" in val) {
    const values = val.arrayValue.values || [];
    return values.map(fromFirestoreValue);
  }
  if ("mapValue" in val) {
    const obj: Record<string, any> = {};
    const fields = val.mapValue.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      obj[k] = fromFirestoreValue(v);
    }
    return obj;
  }
  return undefined;
}

function toFirestoreFields(doc: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, value] of Object.entries(doc)) {
    if (value === undefined) continue;
    fields[key] = toFirestoreValue(value);
  }
  return fields;
}

function fromFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = fromFirestoreValue(value);
  }
  return result;
}

// ─── Question CRUD ───────────────────────────────────────────────

export async function saveQuestionToFirestore(
  idToken: string,
  uid: string,
  question: QuestionDocument
): Promise<boolean> {
  const url = `${FIRESTORE_BASE}/users/${uid}/questions/${question.questionId}`;
  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: toFirestoreFields(question) }),
    });
    if (res.ok) {
      console.log(`[QUESTION_STORE] Saved question ${question.questionId} for user ${uid}`);
      return true;
    } else {
      const errText = await res.text();
      console.error(`[QUESTION_STORE] Failed to save question ${question.questionId}:`, errText);
      return false;
    }
  } catch (err) {
    console.error(`[QUESTION_STORE] Error saving question ${question.questionId}:`, err);
    return false;
  }
}

export async function getQuestionFromFirestore(
  idToken: string,
  uid: string,
  questionId: string
): Promise<QuestionDocument | null> {
  const url = `${FIRESTORE_BASE}/users/${uid}/questions/${questionId}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (res.ok) {
      const docData = await res.json();
      if (docData.fields) {
        return fromFirestoreFields(docData.fields) as QuestionDocument;
      }
    }
    return null;
  } catch (err) {
    console.error(`[QUESTION_STORE] Error fetching question ${questionId}:`, err);
    return null;
  }
}

/**
 * Find an existing question document by its rubricQuestionId.
 * Uses a Firestore structured query with a field filter.
 */
export async function findQuestionByRubricId(
  idToken: string,
  uid: string,
  rubricQuestionId: string
): Promise<QuestionDocument | null> {
  const queryUrl = `${FIRESTORE_BASE}/users/${uid}/questions:runQuery`;
  const queryBody = {
    structuredQuery: {
      from: [{ collectionId: "questions" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "rubricQuestionId" },
          op: "EQUAL",
          value: { stringValue: rubricQuestionId },
        },
      },
      limit: 1,
    },
  };

  try {
    const res = await fetch(queryUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(queryBody),
    });
    if (res.ok) {
      const results = await res.json();
      if (Array.isArray(results) && results.length > 0 && results[0].document?.fields) {
        return fromFirestoreFields(results[0].document.fields) as QuestionDocument;
      }
    }
    return null;
  } catch (err) {
    console.error(`[QUESTION_STORE] Error querying by rubricId ${rubricQuestionId}:`, err);
    return null;
  }
}

// ─── Evaluation CRUD ─────────────────────────────────────────────

export async function saveEvaluationToFirestore(
  idToken: string,
  uid: string,
  evaluation: EvaluationDocument
): Promise<boolean> {
  const url = `${FIRESTORE_BASE}/users/${uid}/evaluations/${evaluation.evaluationId}`;
  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: toFirestoreFields(evaluation) }),
    });
    if (res.ok) {
      console.log(`[QUESTION_STORE] Saved evaluation ${evaluation.evaluationId} for user ${uid}, questionId=${evaluation.questionId}`);
      return true;
    } else {
      const errText = await res.text();
      console.error(`[QUESTION_STORE] Failed to save evaluation ${evaluation.evaluationId}:`, errText);
      return false;
    }
  } catch (err) {
    console.error(`[QUESTION_STORE] Error saving evaluation ${evaluation.evaluationId}:`, err);
    return false;
  }
}

export async function getEvaluationFromFirestore(
  idToken: string,
  uid: string,
  evaluationId: string
): Promise<EvaluationDocument | null> {
  const url = `${FIRESTORE_BASE}/users/${uid}/evaluations/${evaluationId}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (res.ok) {
      const docData = await res.json();
      if (docData.fields) {
        return fromFirestoreFields(docData.fields) as EvaluationDocument;
      }
    }
    return null;
  } catch (err) {
    console.error(`[QUESTION_STORE] Error fetching evaluation ${evaluationId}:`, err);
    return null;
  }
}

// ─── Generated Paper CRUD ────────────────────────────────────────

export async function savePaperToFirestore(
  idToken: string,
  paper: GeneratedPaperDocument
): Promise<boolean> {
  const url = `${FIRESTORE_BASE}/generated_papers/${paper.paperId}`;
  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: toFirestoreFields(paper) }),
    });
    if (res.ok) {
      console.log(`[QUESTION_STORE] Saved paper ${paper.paperId} for user ${paper.userId}`);
      return true;
    } else {
      const errText = await res.text();
      console.error(`[QUESTION_STORE] Failed to save paper ${paper.paperId}:`, errText);
      return false;
    }
  } catch (err) {
    console.error(`[QUESTION_STORE] Error saving paper ${paper.paperId}:`, err);
    return false;
  }
}

export async function getPaperFromFirestore(
  idToken: string,
  paperId: string
): Promise<GeneratedPaperDocument | null> {
  const url = `${FIRESTORE_BASE}/generated_papers/${paperId}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (res.ok) {
      const docData = await res.json();
      if (docData.fields) {
        return fromFirestoreFields(docData.fields) as GeneratedPaperDocument;
      }
    }
    return null;
  } catch (err) {
    console.error(`[QUESTION_STORE] Error fetching paper ${paperId}:`, err);
    return null;
  }
}

export async function listPapersFromFirestore(
  idToken: string,
  userId: string
): Promise<GeneratedPaperDocument[]> {
  const queryUrl = `${FIRESTORE_BASE}:runQuery`;
  const queryBody = {
    structuredQuery: {
      from: [{ collectionId: "generated_papers" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "userId" },
          op: "EQUAL",
          value: { stringValue: userId },
        },
      },
    },
  };

  try {
    const res = await fetch(queryUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(queryBody),
    });
    if (res.ok) {
      const results = await res.json();
      if (Array.isArray(results)) {
        const papers = results
          .filter((r: any) => r.document?.fields)
          .map((r: any) => fromFirestoreFields(r.document.fields) as GeneratedPaperDocument);
        // Sort by createdAt descending
        papers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return papers;
      }
    }
    return [];
  } catch (err) {
    console.error(`[QUESTION_STORE] Error querying papers for user ${userId}:`, err);
    return [];
  }
}

export async function saveIdealAnswerToFirestore(
  idToken: string,
  paperId: string,
  questionId: string,
  answer: IdealAnswerDocument
): Promise<boolean> {
  const url = `${FIRESTORE_BASE}/ideal_answers/${paperId}_${questionId}`;
  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: toFirestoreFields(answer) }),
    });
    if (res.ok) {
      console.log(`[QUESTION_STORE] Saved ideal answer for paper ${paperId}, question ${questionId}`);
      return true;
    } else {
      const errText = await res.text();
      console.error(`[QUESTION_STORE] Failed to save ideal answer:`, errText);
      return false;
    }
  } catch (err) {
    console.error(`[QUESTION_STORE] Error saving ideal answer:`, err);
    return false;
  }
}

export async function getIdealAnswerFromFirestore(
  idToken: string,
  paperId: string,
  questionId: string
): Promise<IdealAnswerDocument | null> {
  const url = `${FIRESTORE_BASE}/ideal_answers/${paperId}_${questionId}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (res.ok) {
      const docData = await res.json();
      if (docData.fields) {
        return fromFirestoreFields(docData.fields) as IdealAnswerDocument;
      }
    }
    return null;
  } catch (err) {
    console.error(`[QUESTION_STORE] Error fetching ideal answer:`, err);
    return null;
  }
}

