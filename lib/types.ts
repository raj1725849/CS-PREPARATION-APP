export type SubjectName =
  | "Company Law"
  | "Economic, Business & Commercial Laws"
  | "Tax Laws"
  | "Company Accounts & Auditing Practices"
  | "Capital Markets & Securities Laws"
  | "Industrial, Labour & General Laws"
  | "Jurisprudence, Interpretation & General Laws"

export type ModuleNumber = "Module 1" | "Module 2"

export type QuestionType = "descriptive" | "shortnotes" | "casestudy"

export type DifficultyLevel =
  | "Standard (ICSI Level)"
  | "Hard (Twisted Facts)"
  | "Mixed"

export type MarksTotal = 50 | 70 | 100

export type EvaluationScope = "full" | "topic"

export interface SubjectInfo {
  name: SubjectName
  filename: string
  module: ModuleNumber
  sizeKB: number
  indexed: boolean
}

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
  questionNumber?: string         // e.g. "Q3" or "Q3(b)" — optional
  marks: number                   // 5 | 7 | 10 | 15 | 20
  studentAnswer: string           // Verified student answer text
}

export interface Deduction {
  type: "missing" | "wrong" | "incomplete"
  text: string                    // detailed explanation
  marks_deducted: number
}

export interface QuestionAnalysis {
  question_type: string
  relevant_acts: string[]
  mandatory_sections: string[]
  mandatory_keywords: string[]
  expected_case_laws: string[]
  expected_structure: string
}

export interface EnhancedDeduction {
  check_type: string
  type: "missing" | "wrong" | "incomplete"
  what_student_wrote: string
  what_was_expected: string
  marks_deducted: number
  severity: "critical" | "major" | "minor"
  text?: string // Fallback for older code
}

export interface EvaluateResponse {
  marks_awarded: number
  total_marks: number
  verdict: "Pass" | "Borderline Pass" | "Fail"
  score_percentage: number
  deductions: EnhancedDeduction[]
  model_answer: string
  evaluated_at: string            // ISO timestamp
  question_analysis: QuestionAnalysis
  answer_found: boolean
  answer_identification_note: string
  keywords_found: string[]
  keywords_missing: string[]
  sections_found: string[]
  sections_missing: string[]
  acts_found: string[]
  acts_missing: string[]
  examiner_note: string
  evaluation_summary: string
  correctly_covered_points: string[]
  missing_points: string[]
  missing_keywords: string[]
  irrelevant_content: string[]
  mark_deduction_analysis: string[]
  icsi_examiner_feedback: string[]
  what_you_should_add: string[]
  what_you_should_remove: string[]
  writing_analysis: {
    structure: string
    presentation: string
    relevance: string
    legal_language: string
    use_of_keywords: string
    completeness: string
  }
  strengths: string[]
  weaknesses: string[]
  improvement_plan: string[]
}

export interface EvaluateError {
  error: string
  code: "INVALID_REQUEST" | "NO_IMAGES" | "PARSE_ERROR" | "GEMINI_ERROR" | "TRUNCATED_RESPONSE" | "UNKNOWN"
}

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
  deductions: EnhancedDeduction[]
  model_answer: string
  question_analysis?: QuestionAnalysis
  answer_found?: boolean
  answer_identification_note?: string
  keywords_found?: string[]
  keywords_missing?: string[]
  sections_found?: string[]
  sections_missing?: string[]
  acts_found?: string[]
  acts_missing?: string[]
  examiner_note?: string
  originalImages?: string[]       // Compressed thumbnails for auditing
  originalExtractedText?: string
  studentCorrectedText?: string
  evaluation_summary?: string
  correctly_covered_points?: string[]
  missing_points?: string[]
  missing_keywords?: string[]
  irrelevant_content?: string[]
  mark_deduction_analysis?: string[]
  icsi_examiner_feedback?: string[]
  what_you_should_add?: string[]
  what_you_should_remove?: string[]
  writing_analysis?: {
    structure: string
    presentation: string
    relevance: string
    legal_language: string
    use_of_keywords: string
    completeness: string
  }
  strengths?: string[]
  weaknesses?: string[]
  improvement_plan?: string[]
}

export type Session = GenerateSession | EvaluateSession

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

export type BillingPlan = "free" | "monthly" | "quarterly" | "yearly"

export interface UserUsage {
  date: string // YYYY-MM-DD
  generateCount: number
  evaluateCount: number
}

export interface UserProfile {
  uid: string
  email: string | null
  displayName: string | null
  plan: BillingPlan
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  usage?: UserUsage
}

