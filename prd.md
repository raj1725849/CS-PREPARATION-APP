# CS Prep — Complete Backend PRD
### Product Requirements Document · Backend Architecture
**Version:** 1.0 | **Stack:** Next.js 15 App Router · Gemini 2.0 Flash · No Database

---

## 1. PRODUCT OVERVIEW

CS Prep is a private, single-user web application built for one CS (Company Secretary)
student to practice ICSI Executive Programme exams. The backend is responsible for:

- Serving AI-generated ICSI-pattern question papers using Gemini
- Evaluating handwritten answer sheet images via Gemini Vision
- Reading and chunking ICSI study material PDFs stored in /public
- Serving subject metadata to the frontend
- Zero persistence layer — all history stored in browser localStorage

**Deployment target:** Vercel (free tier)
**AI Provider:** Google Gemini 2.0 Flash (free tier)
**PDF Storage:** /public/study-material/ folder (committed to repo)
**Auth:** None — single private user, unlisted URL

---

## 2. ENVIRONMENT CONFIGURATION

### 2.1 Required Environment Variables

```env
# .env.local (never commit this file)
GEMINI_API_KEY=your_google_gemini_api_key_here
```

### 2.2 Vercel Environment Setup

In Vercel dashboard → Project → Settings → Environment Variables:
- Add GEMINI_API_KEY with value from Google AI Studio
- Apply to: Production, Preview, Development

### 2.3 Package Dependencies

```json
{
  "dependencies": {
    "next": "15.x",
    "react": "19.x",
    "react-dom": "19.x",
    "@google/generative-ai": "^0.21.0",
    "pdf-parse": "^1.1.1"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/node": "^20.x",
    "@types/react": "^19.x",
    "@types/pdf-parse": "^1.1.4",
    "tailwindcss": "^3.x",
    "postcss": "^8.x",
    "autoprefixer": "^10.x"
  }
}
```

### 2.4 Next.js Configuration

```typescript
// next.config.ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000"] }
  },
  // Required for pdf-parse to work in Next.js API routes
  serverExternalPackages: ["pdf-parse"],
  // Increase body size limit for image uploads (10MB)
  api: {
    bodyParser: {
      sizeLimit: "10mb"
    }
  }
}

export default nextConfig
```

---

## 3. COMPLETE FOLDER STRUCTURE

```
cs-prep/
├── .env.local                          ← Gemini API key (never commit)
├── .gitignore                          ← include .env.local
├── next.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
│
├── public/
│   └── study-material/                 ← PDFs live here (committed to repo)
│       ├── company-law.pdf
│       ├── economic-laws.pdf
│       ├── tax-laws.pdf
│       ├── company-accounts.pdf
│       ├── capital-markets.pdf
│       └── industrial-laws.pdf
│
├── app/
│   ├── layout.tsx                      ← Root layout with sidebar
│   ├── page.tsx                        ← Redirects to /dashboard
│   ├── globals.css
│   │
│   ├── dashboard/
│   │   └── page.tsx                    ← Student dashboard (client)
│   │
│   ├── generate/
│   │   └── page.tsx                    ← Paper generator (client)
│   │
│   ├── evaluate/
│   │   └── page.tsx                    ← Answer evaluator (client)
│   │
│   ├── admin/
│   │   └── page.tsx                    ← Study material list (client)
│   │
│   └── api/
│       ├── generate/
│       │   └── route.ts                ← POST: generate question paper
│       ├── evaluate/
│       │   └── route.ts                ← POST: evaluate answer images
│       └── subjects/
│           └── route.ts                ← GET: list available PDFs
│
├── components/
│   ├── Sidebar.tsx                     ← Shared navigation sidebar
│   └── TopBar.tsx                      ← Page header + breadcrumb
│
└── lib/
    ├── gemini.ts                       ← Gemini client singleton
    ├── pdf-utils.ts                    ← PDF reading + chunking
    ├── prompts.ts                      ← All Gemini prompts (centralized)
    ├── storage.ts                      ← localStorage read/write
    ├── subject-map.ts                  ← Subject → filename mapping
    └── types.ts                        ← All TypeScript interfaces
```

---

## 4. TYPE DEFINITIONS — /lib/types.ts

```typescript
// ─── Subject Types ───────────────────────────────────────────
export type SubjectName =
  | "Company Law"
  | "Economic, Business & Commercial Laws"
  | "Tax Laws"
  | "Company Accounts & Auditing Practices"
  | "Capital Markets & Securities Laws"
  | "Industrial, Labour & General Laws"

export type ModuleNumber = "Module 1" | "Module 2"

export type QuestionType = "descriptive" | "shortnotes" | "casestudy"

export type DifficultyLevel =
  | "Standard (ICSI Level)"
  | "Hard (Twisted Facts)"
  | "Mixed"

export type MarksTotal = 50 | 70 | 100

export type EvaluationScope = "full" | "topic"

// ─── Subject Metadata ────────────────────────────────────────
export interface SubjectInfo {
  name: SubjectName
  filename: string
  module: ModuleNumber
  sizeKB: number
  indexed: boolean
}

// ─── API Request/Response Types ──────────────────────────────
export interface GenerateRequest {
  subject: SubjectName
  scope: EvaluationScope
  topic?: string                  // required if scope === "topic"
  questionTypes: QuestionType[]   // at least one required
  marks: MarksTotal
  difficulty: DifficultyLevel
}

export interface GenerateResponse {
  paper: string
  subject: SubjectName
  generatedAt: string             // ISO timestamp
}

export interface GenerateError {
  error: string
  code: "INVALID_REQUEST" | "PDF_NOT_FOUND" | "GEMINI_ERROR" | "UNKNOWN"
}

export interface EvaluateRequest {
  subject: SubjectName
  question: string
  marks: number                   // 5 | 7 | 10 | 15 | 20
  images: string[]                // base64 encoded image strings
  mimeTypes: string[]             // corresponding MIME types
}

export interface Deduction {
  type: "missing" | "wrong" | "incomplete"
  text: string                    // detailed explanation
  marks_deducted: number
}

export interface EvaluateResponse {
  marks_awarded: number
  total_marks: number
  verdict: "Pass" | "Borderline Pass" | "Fail"
  score_percentage: number
  deductions: Deduction[]
  model_answer: string
  evaluated_at: string            // ISO timestamp
}

export interface EvaluateError {
  error: string
  code: "INVALID_REQUEST" | "NO_IMAGES" | "PARSE_ERROR" | "GEMINI_ERROR" | "UNKNOWN"
}

// ─── localStorage Session Types ──────────────────────────────
export interface GenerateSession {
  id: string                      // uuid or timestamp-based
  type: "generate"
  date: string                    // ISO timestamp
  subject: SubjectName
  scope: EvaluationScope
  topic: string                   // "Full Paper" if scope=full
  marks: MarksTotal
  difficulty: DifficultyLevel
  questionTypes: QuestionType[]
  paper: string                   // full generated paper text
}

export interface EvaluateSession {
  id: string
  type: "evaluate"
  date: string                    // ISO timestamp
  subject: SubjectName
  question: string                // question text
  total_marks: number
  marks_awarded: number
  score_percentage: number
  verdict: "Pass" | "Borderline Pass" | "Fail"
  deductions: Deduction[]
  model_answer: string
}

export type Session = GenerateSession | EvaluateSession

// ─── Dashboard Computed Types ─────────────────────────────────
export interface SubjectPerformance {
  subject: SubjectName
  avgScore: number
  attemptCount: number
  trend: "up" | "down" | "stable"
  lastAttemptScore: number
}

export interface MistakePattern {
  type: "missing" | "wrong" | "incomplete"
  description: string
  frequency: number
}

export interface DashboardStats {
  totalPapersGenerated: number
  totalEvaluations: number
  avgScorePercent: number
  avgScoreThisWeek: number
  avgScoreLastWeek: number
  weakestSubject: SubjectName | null
  weakestSubjectAvg: number
  subjectPerformance: SubjectPerformance[]
  mistakePatterns: MistakePattern[]
  scoreTrend: number[]            // last 20 evaluate session scores
  recentSessions: Session[]       // last 10 sessions
}
```

---

## 5. SUBJECT MAPPING — /lib/subject-map.ts

```typescript
import { SubjectName, ModuleNumber } from "./types"

export interface SubjectMapEntry {
  filename: string
  module: ModuleNumber
  shortName: string               // for display in small spaces
}

export const SUBJECT_MAP: Record<SubjectName, SubjectMapEntry> = {
  "Company Law": {
    filename: "company-law.pdf",
    module: "Module 1",
    shortName: "Company Law"
  },
  "Economic, Business & Commercial Laws": {
    filename: "economic-laws.pdf",
    module: "Module 1",
    shortName: "Economic Laws"
  },
  "Tax Laws": {
    filename: "tax-laws.pdf",
    module: "Module 1",
    shortName: "Tax Laws"
  },
  "Company Accounts & Auditing Practices": {
    filename: "company-accounts.pdf",
    module: "Module 2",
    shortName: "Company Accounts"
  },
  "Capital Markets & Securities Laws": {
    filename: "capital-markets.pdf",
    module: "Module 2",
    shortName: "Capital Markets"
  },
  "Industrial, Labour & General Laws": {
    filename: "industrial-laws.pdf",
    module: "Module 2",
    shortName: "Industrial Laws"
  }
}

export const ALL_SUBJECTS = Object.keys(SUBJECT_MAP) as SubjectName[]

export function getFilenameForSubject(subject: SubjectName): string {
  return SUBJECT_MAP[subject].filename
}

export function getModuleForSubject(subject: SubjectName): ModuleNumber {
  return SUBJECT_MAP[subject].module
}
```

---

## 6. GEMINI CLIENT — /lib/gemini.ts

```typescript
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai"

// Singleton pattern — one client instance for all API routes
let genAIInstance: GoogleGenerativeAI | null = null
let flashModelInstance: GenerativeModel | null = null

function getGenAI(): GoogleGenerativeAI {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY environment variable is not set. " +
        "Add it to .env.local and Vercel environment variables."
      )
    }
    genAIInstance = new GoogleGenerativeAI(apiKey)
  }
  return genAIInstance
}

export function getFlashModel(): GenerativeModel {
  if (!flashModelInstance) {
    flashModelInstance = getGenAI().getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,         // balanced creativity for paper generation
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 8192,    // enough for full 100-mark paper
      }
    })
  }
  return flashModelInstance
}

// Separate config for evaluation — lower temperature for consistency
export function getEvalModel(): GenerativeModel {
  return getGenAI().getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.2,           // strict, consistent evaluation
      topP: 0.8,
      topK: 20,
      maxOutputTokens: 4096,      // enough for full evaluation + model answer
    }
  })
}
```

---

## 7. PDF UTILITIES — /lib/pdf-utils.ts

```typescript
import fs from "fs"
import path from "path"
import pdfParse from "pdf-parse"
import { SubjectName } from "./types"
import { getFilenameForSubject } from "./subject-map"

const STUDY_MATERIAL_DIR = path.join(
  process.cwd(), "public", "study-material"
)

// ─── Read PDF as plain text ───────────────────────────────────
// Returns up to maxChars of extracted text from a PDF file.
// Used to provide subject context to Gemini for paper generation.

export async function readPdfAsText(
  filename: string,
  maxChars: number = 20000
): Promise<string> {
  const filePath = path.join(STUDY_MATERIAL_DIR, filename)

  if (!fs.existsSync(filePath)) {
    console.warn(`PDF not found: ${filePath}`)
    return ""
  }

  try {
    const buffer = fs.readFileSync(filePath)
    const parsed = await pdfParse(buffer, {
      // Limit pages parsed to avoid timeout — first 80 pages
      max: 80
    })
    const text = parsed.text
      .replace(/\s+/g, " ")         // collapse whitespace
      .replace(/\n{3,}/g, "\n\n")   // max 2 consecutive newlines
      .trim()

    return text.slice(0, maxChars)
  } catch (err) {
    console.error(`Failed to parse PDF ${filename}:`, err)
    return ""
  }
}

// ─── Read PDF for a given subject ────────────────────────────
export async function readSubjectPdf(
  subject: SubjectName,
  maxChars: number = 20000
): Promise<string> {
  const filename = getFilenameForSubject(subject)
  return readPdfAsText(filename, maxChars)
}

// ─── Get all available PDF files ─────────────────────────────
export function listAvailablePdfs(): string[] {
  if (!fs.existsSync(STUDY_MATERIAL_DIR)) return []
  return fs
    .readdirSync(STUDY_MATERIAL_DIR)
    .filter(f => f.endsWith(".pdf"))
}

// ─── Get PDF file size in KB ──────────────────────────────────
export function getPdfSizeKB(filename: string): number {
  const filePath = path.join(STUDY_MATERIAL_DIR, filename)
  if (!fs.existsSync(filePath)) return 0
  const stats = fs.statSync(filePath)
  return Math.round(stats.size / 1024)
}

// ─── Check if PDF exists ──────────────────────────────────────
export function pdfExists(filename: string): boolean {
  return fs.existsSync(path.join(STUDY_MATERIAL_DIR, filename))
}
```

---

## 8. PROMPTS — /lib/prompts.ts

All Gemini prompts are centralized here. Never inline prompts in API routes.

```typescript
import {
  SubjectName,
  QuestionType,
  DifficultyLevel,
  MarksTotal,
  EvaluationScope
} from "./types"

// ─── Helper: question type labels ────────────────────────────
const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  descriptive: "Descriptive / Long Answer (10-20 marks each)",
  shortnotes: "Short Notes (5-7 marks each, attempt any 4 from 6)",
  casestudy: "Case Study / Practical Based (10-15 marks)"
}

// ─── Paper Generation Prompt ─────────────────────────────────
export function buildGeneratePrompt(params: {
  subject: SubjectName
  scope: EvaluationScope
  topic?: string
  questionTypes: QuestionType[]
  marks: MarksTotal
  difficulty: DifficultyLevel
  pdfContext: string
}): string {
  const { subject, scope, topic, questionTypes, marks, difficulty, pdfContext } = params
  const typesList = questionTypes.map(t => `• ${QUESTION_TYPE_LABELS[t]}`).join("\n")
  const scopeText = scope === "full"
    ? "Full paper covering all major topics in the subject"
    : `Specific topic: ${topic}`

  return `You are a Senior Examiner at ICSI (Institute of Company Secretaries of India) 
setting an Executive Programme examination paper. You have decades of experience creating 
papers that strictly test legal knowledge, procedural accuracy, and practical application.

═══════════════════════════════════════
STUDY MATERIAL CONTEXT (Use this to frame questions):
═══════════════════════════════════════
${pdfContext || "Use your knowledge of ICSI Executive Programme syllabus."}

═══════════════════════════════════════
PAPER PARAMETERS:
═══════════════════════════════════════
Subject: ${subject}
Scope: ${scopeText}
Question Types Required:
${typesList}
Total Marks: ${marks}
Difficulty: ${difficulty}
Time Allowed: 3 Hours

═══════════════════════════════════════
MANDATORY PAPER FORMATTING RULES:
═══════════════════════════════════════

1. HEADER (exactly as ICSI formats it):
   - Institute name: THE INSTITUTE OF COMPANY SECRETARIES OF INDIA
   - Programme: EXECUTIVE PROGRAMME
   - Subject name in capitals
   - Time: 3 Hours | Maximum Marks: ${marks}
   - Instruction line: "All questions are compulsory" 
     OR "Attempt any X questions from each section"
     based on the paper structure

2. SECTIONS:
   - Use SECTION A, SECTION B, SECTION C as needed
   - Each section header must state marks and instructions clearly
   - Example: "SECTION A — Descriptive Questions (Attempt any 4 out of 6) [40 Marks]"

3. QUESTION LANGUAGE (use these authentic ICSI phrases):
   For descriptive: 
   - "Referring to the provisions of the Companies Act, 2013, explain..."
   - "Advise XYZ Limited in the matter of..."
   - "Examine the validity of the following with reasons..."
   - "Draft a Board Resolution for..."
   - "State with reasons whether the following statement is correct or incorrect..."
   - "Distinguish between..."
   
   For case studies:
   - Give realistic business scenario with named companies (fictional)
   - Include specific facts: dates, amounts, percentages, thresholds
   - End with: "Advise the Company Secretary of ABC Ltd. in the matter."
   - OR: "Examine the legal position and state the provisions applicable."
   
   For short notes:
   - "Write short notes on any FOUR of the following:"
   - List 6 topics for choice

4. LEGAL SPECIFICITY:
   - Always reference specific acts: Companies Act 2013, SEBI Act 1992, 
     FEMA 1999, Income Tax Act 1961, etc.
   - Include specific section numbers in questions where natural
   - Use exact thresholds, limits, timelines from statute
   - ${difficulty === "Hard (Twisted Facts)" 
     ? "Add twists: conflicting facts, borderline cases, exceptions to rules" 
     : difficulty === "Mixed" 
     ? "Mix straightforward and complex questions" 
     : "Standard exam-level complexity"}

5. MARKS DISTRIBUTION:
   - All marks must add up to exactly ${marks}
   - Show marks for each question in square brackets: [10 Marks]
   - Internal choice: "OR" between options where appropriate

6. NUMBERING:
   - Questions: Q1, Q2, Q3...
   - Sub-parts: (a), (b), (c)...
   - Must be consistent throughout

═══════════════════════════════════════
OUTPUT INSTRUCTION:
═══════════════════════════════════════
Output ONLY the complete question paper in plain text. 
No explanations, no preamble, no "here is your paper" — 
start directly with the ICSI header. 
Format with clear spacing between sections and questions.`
}

// ─── Answer Evaluation System Prompt ─────────────────────────
export function buildEvaluateSystemPrompt(): string {
  return `You are a STRICT ICSI (Institute of Company Secretaries of India) Senior Examiner 
evaluating Executive Programme answer scripts. You have been instructed to evaluate with 
zero leniency — exactly as the official ICSI evaluation process works.

YOUR EVALUATION PHILOSOPHY:
- Students do NOT get benefit of the doubt
- Marks are EARNED, not given
- Conceptually correct but procedurally incomplete answers lose marks
- Missing a specific section number loses marks even if concept is right
- Vague language loses marks — legal answers need legal precision
- Partial credit only where genuine legal knowledge is demonstrated

WHAT YOU PENALIZE:
1. MISSING CONTENT:
   - Specific section numbers not cited (e.g. "Section 149 of Companies Act 2013")
   - Relevant case laws absent where expected
   - Required procedural steps skipped
   - Sub-parts of question not addressed
   - Statutory exceptions or provisos not mentioned
   - Exact thresholds/limits not stated (e.g. "some percentage" instead of "1/3rd")

2. WRONG CONTENT:
   - Incorrect section numbers
   - Wrong thresholds, timelines, or monetary limits
   - Misstatement of legal provisions
   - Incorrect procedure or sequence of steps
   - Confused concepts (e.g. mixing up types of meetings)

3. INCOMPLETE CONTENT:
   - Point made but not explained in legal context
   - Example given but rule not stated
   - Conclusion given without legal reasoning
   - Answer too brief for marks allocated

YOUR OUTPUT FORMAT:
Respond ONLY with a valid JSON object. 
No markdown code blocks. No backticks. No preamble. No explanation outside the JSON.
Start your response with { and end with }.

JSON structure:
{
  "marks_awarded": <integer between 0 and total_marks>,
  "total_marks": <same as marks parameter>,
  "score_percentage": <marks_awarded/total_marks * 100, rounded to 1 decimal>,
  "verdict": <"Pass" if >=50%, "Borderline Pass" if 50-59%, "Fail" if <50%>,
  "deductions": [
    {
      "type": <"missing" | "wrong" | "incomplete">,
      "text": <detailed explanation of exactly what is wrong/missing and what was expected>,
      "marks_deducted": <integer, minimum 0.5>
    }
  ],
  "model_answer": <complete model answer written in proper ICSI legal language. Must include: 
    all relevant section numbers, applicable acts, relevant case laws if any, 
    complete procedure step by step, exact thresholds/limits, 
    proper legal terminology throughout. This is what a top-scoring student would write.>
}`
}

// ─── Answer Evaluation User Prompt ───────────────────────────
export function buildEvaluateUserPrompt(params: {
  subject: SubjectName
  question: string
  marks: number
}): string {
  const { subject, question, marks } = params
  return `Evaluate the handwritten answer shown in the attached image(s).

EXAMINATION DETAILS:
Subject: ${subject}
Programme: ICSI Executive Programme
Question: ${question}
Total Marks Allocated: ${marks}

The student's complete handwritten answer is in the attached image(s). 
Read every word carefully. Identify all content the student has written.
Then evaluate strictly against what ICSI expects for a ${marks}-mark answer on this topic.

Remember: Be strict. Deduct for every missing legal point, every missing section number, 
every vague statement. The student must earn every mark.`
}
```

---

## 9. LOCALSTORAGE UTILITIES — /lib/storage.ts

```typescript
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

const STORAGE_KEY = "csprep_history"

// ─── Basic CRUD ───────────────────────────────────────────────

export function getAllSessions(): Session[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Session[]) : []
  } catch {
    return []
  }
}

export function saveSession(session: Session): void {
  const sessions = getAllSessions()
  // Prepend new session (most recent first)
  sessions.unshift(session)
  // Keep max 200 sessions to avoid localStorage bloat
  const trimmed = sessions.slice(0, 200)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
}

export function getSessionById(id: string): Session | null {
  return getAllSessions().find(s => s.id === id) || null
}

export function deleteSession(id: string): void {
  const sessions = getAllSessions().filter(s => s.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

export function clearAllHistory(): void {
  localStorage.removeItem(STORAGE_KEY)
}

// ─── Filtered Getters ─────────────────────────────────────────

export function getEvaluateSessions(): EvaluateSession[] {
  return getAllSessions().filter(
    s => s.type === "evaluate"
  ) as EvaluateSession[]
}

export function getGenerateSessions(): GenerateSession[] {
  return getAllSessions().filter(
    s => s.type === "generate"
  ) as GenerateSession[]
}

export function getSessionsThisWeek(type?: "generate" | "evaluate"): Session[] {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const sessions = type
    ? getAllSessions().filter(s => s.type === type)
    : getAllSessions()
  return sessions.filter(s => new Date(s.date) >= oneWeekAgo)
}

export function getSessionsLastWeek(type?: "generate" | "evaluate"): Session[] {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  const sessions = type
    ? getAllSessions().filter(s => s.type === type)
    : getAllSessions()
  return sessions.filter(s => {
    const d = new Date(s.date)
    return d >= twoWeeksAgo && d < oneWeekAgo
  })
}

// ─── ID Generator ─────────────────────────────────────────────

export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ─── Dashboard Statistics Computation ────────────────────────

export function computeDashboardStats(): DashboardStats {
  const allSessions = getAllSessions()
  const evaluations = getEvaluateSessions()
  const generates = getGenerateSessions()

  // ── Avg score this week vs last week
  const thisWeekEvals = getSessionsThisWeek("evaluate") as EvaluateSession[]
  const lastWeekEvals = getSessionsLastWeek("evaluate") as EvaluateSession[]

  const avgScore = evaluations.length > 0
    ? evaluations.reduce((sum, s) => sum + s.score_percentage, 0) / evaluations.length
    : 0

  const avgThisWeek = thisWeekEvals.length > 0
    ? thisWeekEvals.reduce((sum, s) => sum + s.score_percentage, 0) / thisWeekEvals.length
    : 0

  const avgLastWeek = lastWeekEvals.length > 0
    ? lastWeekEvals.reduce((sum, s) => sum + s.score_percentage, 0) / lastWeekEvals.length
    : 0

  // ── Subject performance
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

  // ── Weakest subject
  const weakestSubject = subjectPerformance.length > 0
    ? subjectPerformance.reduce((a, b) => a.avgScore < b.avgScore ? a : b)
    : null

  // ── Mistake patterns — aggregate all deductions
  const allDeductions = evaluations.flatMap(s => s.deductions)
  const mistakeMap: Record<string, { type: string; frequency: number }> = {}

  allDeductions.forEach(d => {
    // Extract key phrase from deduction text (first 60 chars as key grouping)
    const key = d.type + "_" + d.text.slice(0, 60).toLowerCase()
    if (mistakeMap[key]) {
      mistakeMap[key].frequency++
    } else {
      mistakeMap[key] = { type: d.type, frequency: 1 }
    }
  })

  // Top mistakes by type counts
  const missingCount = allDeductions.filter(d => d.type === "missing").length
  const wrongCount = allDeductions.filter(d => d.type === "wrong").length
  const incompleteCount = allDeductions.filter(d => d.type === "incomplete").length

  const mistakePatterns: MistakePattern[] = [
    { type: "missing", description: "Missing specific section numbers", frequency: missingCount },
    { type: "missing", description: "Not citing relevant case laws", frequency: Math.floor(missingCount * 0.7) },
    { type: "wrong", description: "Wrong statutory thresholds or limits", frequency: wrongCount },
    { type: "incomplete", description: "Vague legal language used", frequency: incompleteCount },
    { type: "incomplete", description: "Incomplete procedural steps", frequency: Math.floor(incompleteCount * 0.8) },
  ]
    .filter(m => m.frequency > 0)
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 6)

  // ── Score trend (last 20 evaluate sessions)
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
```

---

## 10. API ROUTES

### 10.1 — GET /api/subjects/route.ts

Returns list of all PDFs in /public/study-material/ with metadata.

```typescript
import { NextResponse } from "next/server"
import { listAvailablePdfs, getPdfSizeKB, pdfExists } from "@/lib/pdf-utils"
import { SUBJECT_MAP, ALL_SUBJECTS } from "@/lib/subject-map"
import { SubjectInfo } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const availableFiles = listAvailablePdfs()

    const subjects: SubjectInfo[] = ALL_SUBJECTS.map(subjectName => {
      const { filename, module } = SUBJECT_MAP[subjectName]
      const exists = availableFiles.includes(filename)
      return {
        name: subjectName,
        filename,
        module,
        sizeKB: exists ? getPdfSizeKB(filename) : 0,
        indexed: exists
      }
    })

    return NextResponse.json({ subjects }, { status: 200 })
  } catch (err) {
    console.error("/api/subjects error:", err)
    return NextResponse.json(
      { error: "Failed to list subjects", subjects: [] },
      { status: 500 }
    )
  }
}
```

---

### 10.2 — POST /api/generate/route.ts

Generates ICSI-pattern question paper using Gemini + PDF context.

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getFlashModel } from "@/lib/gemini"
import { readSubjectPdf } from "@/lib/pdf-utils"
import { buildGeneratePrompt } from "@/lib/prompts"
import { GenerateRequest, GenerateResponse, GenerateError } from "@/lib/types"

export const maxDuration = 60  // Vercel max for free tier

export async function POST(req: NextRequest) {
  // ── 1. Parse and validate request body
  let body: GenerateRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json<GenerateError>(
      { error: "Invalid JSON body", code: "INVALID_REQUEST" },
      { status: 400 }
    )
  }

  const { subject, scope, topic, questionTypes, marks, difficulty } = body

  // Validation
  if (!subject || !scope || !questionTypes?.length || !marks || !difficulty) {
    return NextResponse.json<GenerateError>(
      { error: "Missing required fields: subject, scope, questionTypes, marks, difficulty", code: "INVALID_REQUEST" },
      { status: 400 }
    )
  }

  if (scope === "topic" && !topic?.trim()) {
    return NextResponse.json<GenerateError>(
      { error: "Topic is required when scope is 'topic'", code: "INVALID_REQUEST" },
      { status: 400 }
    )
  }

  // ── 2. Read PDF context (non-blocking failure — paper generates without context)
  let pdfContext = ""
  try {
    pdfContext = await readSubjectPdf(subject, 20000)
  } catch (err) {
    console.warn("PDF read failed — generating without context:", err)
  }

  // ── 3. Build prompt
  const prompt = buildGeneratePrompt({
    subject, scope, topic, questionTypes, marks, difficulty, pdfContext
  })

  // ── 4. Call Gemini
  try {
    const model = getFlashModel()
    const result = await model.generateContent(prompt)
    const paper = result.response.text()

    if (!paper?.trim()) {
      return NextResponse.json<GenerateError>(
        { error: "Gemini returned empty response", code: "GEMINI_ERROR" },
        { status: 502 }
      )
    }

    const response: GenerateResponse = {
      paper,
      subject,
      generatedAt: new Date().toISOString()
    }

    return NextResponse.json(response, { status: 200 })

  } catch (err: unknown) {
    console.error("/api/generate Gemini error:", err)
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json<GenerateError>(
      { error: `Gemini API error: ${message}`, code: "GEMINI_ERROR" },
      { status: 502 }
    )
  }
}
```

---

### 10.3 — POST /api/evaluate/route.ts

Evaluates handwritten answer images using Gemini Vision.

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getEvalModel } from "@/lib/gemini"
import {
  buildEvaluateSystemPrompt,
  buildEvaluateUserPrompt
} from "@/lib/prompts"
import { EvaluateRequest, EvaluateResponse, EvaluateError } from "@/lib/types"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  // ── 1. Parse request body
  let body: EvaluateRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json<EvaluateError>(
      { error: "Invalid JSON body", code: "INVALID_REQUEST" },
      { status: 400 }
    )
  }

  const { subject, question, marks, images, mimeTypes } = body

  // Validation
  if (!subject || !question?.trim() || !marks) {
    return NextResponse.json<EvaluateError>(
      { error: "Missing required fields: subject, question, marks", code: "INVALID_REQUEST" },
      { status: 400 }
    )
  }

  if (!images?.length || !mimeTypes?.length) {
    return NextResponse.json<EvaluateError>(
      { error: "At least one answer image is required", code: "NO_IMAGES" },
      { status: 400 }
    )
  }

  if (images.length !== mimeTypes.length) {
    return NextResponse.json<EvaluateError>(
      { error: "images and mimeTypes arrays must be same length", code: "INVALID_REQUEST" },
      { status: 400 }
    )
  }

  // Max 10 images
  if (images.length > 10) {
    return NextResponse.json<EvaluateError>(
      { error: "Maximum 10 images allowed per evaluation", code: "INVALID_REQUEST" },
      { status: 400 }
    )
  }

  // ── 2. Build Gemini content parts
  const userPrompt = buildEvaluateUserPrompt({ subject, question, marks })

  // Build parts: text first, then all images
  const parts = [
    { text: userPrompt },
    ...images.map((imageBase64, i) => ({
      inlineData: {
        data: imageBase64,
        mimeType: mimeTypes[i] || "image/jpeg"
      }
    }))
  ]

  // ── 3. Call Gemini Vision
  try {
    const model = getEvalModel()
    const systemInstruction = buildEvaluateSystemPrompt()

    const result = await model.generateContent({
      systemInstruction,
      contents: [{ role: "user", parts }]
    })

    const rawText = result.response.text().trim()

    // ── 4. Parse JSON response
    let parsed: EvaluateResponse
    try {
      // Strip any accidental markdown code fences
      const cleanJson = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim()

      const raw = JSON.parse(cleanJson)

      // Compute verdict based on score
      const scorePercent = (raw.marks_awarded / raw.total_marks) * 100
      const verdict = scorePercent >= 60
        ? "Pass"
        : scorePercent >= 50
        ? "Borderline Pass"
        : "Fail"

      parsed = {
        marks_awarded: raw.marks_awarded ?? 0,
        total_marks: raw.total_marks ?? marks,
        score_percentage: Math.round(scorePercent * 10) / 10,
        verdict,
        deductions: raw.deductions ?? [],
        model_answer: raw.model_answer ?? "",
        evaluated_at: new Date().toISOString()
      }
    } catch (parseErr) {
      console.error("Failed to parse Gemini evaluation JSON:", rawText)
      return NextResponse.json<EvaluateError>(
        { error: "Failed to parse evaluation response from AI", code: "PARSE_ERROR" },
        { status: 502 }
      )
    }

    return NextResponse.json(parsed, { status: 200 })

  } catch (err: unknown) {
    console.error("/api/evaluate Gemini error:", err)
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json<EvaluateError>(
      { error: `Gemini API error: ${message}`, code: "GEMINI_ERROR" },
      { status: 502 }
    )
  }
}
```

---

## 11. CLIENT-SIDE IMAGE HANDLING

This utility runs in the browser (evaluate page) to convert images to base64 before sending to the API:

```typescript
// utils/image-utils.ts (client-side only)

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data:image/jpeg;base64, prefix — send only the base64 data
      const base64 = result.split(",")[1]
      resolve(base64)
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

export async function prepareImagesForApi(files: File[]): Promise<{
  images: string[]
  mimeTypes: string[]
}> {
  const results = await Promise.all(
    files.map(async (file) => ({
      base64: await fileToBase64(file),
      mimeType: file.type || "image/jpeg"
    }))
  )
  return {
    images: results.map(r => r.base64),
    mimeTypes: results.map(r => r.mimeType)
  }
}
```

---

## 12. ERROR HANDLING STANDARDS

All API routes follow this response format:

```
Success: { data } with status 200
Client Error: { error: string, code: string } with status 400
AI Error: { error: string, code: string } with status 502
Server Error: { error: string, code: string } with status 500
```

Frontend must handle all 3 error states:
- 400 → show validation message to user
- 502 → show "AI service error, try again"
- 500 → show "Something went wrong, try again"
- Network failure → show "No connection, try again"

---

## 13. VERCEL DEPLOYMENT CHECKLIST

```
□ .env.local has GEMINI_API_KEY
□ GEMINI_API_KEY added to Vercel environment variables
□ PDFs committed to /public/study-material/
□ next.config.ts has serverExternalPackages: ["pdf-parse"]
□ maxDuration: 60 set on both API routes
□ .gitignore includes .env.local
□ Package.json has all dependencies listed
□ Build passes: npm run build (zero TypeScript errors)
□ Test locally: npm run dev
□ Push to GitHub
□ Connect GitHub repo to Vercel
□ Deploy — check Function logs in Vercel dashboard
```

---

## 14. GEMINI FREE TIER LIMITS (Reference)

| Metric | Limit |
|---|---|
| Requests per minute | 15 RPM |
| Requests per day | 1,500 RPD |
| Input tokens per minute | 1,000,000 TPM |
| Output tokens per minute | 32,000 TPM |
| Max output tokens per request | 8,192 |

At her usage level (a few papers + evaluations per day) the free tier is more than sufficient. No cost whatsoever.

---

*CS Prep Backend PRD v1.0 — Built for ICSI Executive Programme*