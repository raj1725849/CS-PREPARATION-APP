# Design Document: Paginated ICSI Expected Answer Viewer

This document details the system design, API interfaces, database schema, prompt architecture, and user experience for the Paginated ICSI Expected Answer Viewer.

## 1. Goal Description

Provide CS students with a structured, exam-ready expected answer viewer after completing mock exam evaluations. The answers must strictly resemble a "high-scoring CS student's examination answer" rather than generic AI essays or overly complex drafting. The system will leverage official ICSI guideline answers where available, format them in the background immediately after paper evaluation completes, and serve them question-by-question to optimize loading speed and prevent response cut-offs.

## 2. Database Schema (`ideal_answers` collection)

We will store generated expected answers at the root collection `ideal_answers/`. Storing at the root level avoids duplicating answers for identical questions. The document ID will follow the pattern `${paperId}_${questionId}` (or `${questionId}` for manual practice questions).

```json
{
  "paperId": "string (references generated_papers.paperId)",
  "questionId": "string (references questions.questionId)",
  "userId": "string (references users.uid)",
  "expectedAnswer": "string (Markdown format of the formatted exam-ready answer)",
  "generatedAt": "string (ISO timestamp)"
}
```

### Firestore Security Rules
We will update `firestore.rules` to allow read/write access to `ideal_answers` for authenticated users:

```javascript
match /ideal_answers/{answerId} {
  allow read, write: if request.auth != null;
}
```

## 3. Prompt Architecture (`lib/prompts.ts`)

Two new prompt builders will be added to ensure the generated answers strictly match the CS examination requirements.

### System Prompt (`buildCSExamReadyAnswerSystemPrompt`)
```typescript
export function buildCSExamReadyAnswerSystemPrompt(): string {
  return `You are an experienced, strict ICSI (Institute of Company Secretaries of India) Senior Examiner.
Your task is to convert the provided raw guideline/reference answer into a clean, exam-ready expected answer.

STYLE RULES:
- Write exactly what a high-scoring CS student would write in the examination.
- Use clear, professional, yet student-friendly language. Easy to understand and memorize.
- Use proper CS legal and financial terminology.
- Cite the relevant legal acts (e.g. Companies Act, 2013) and sections correctly.
- Do NOT write AI essays, academic papers, overly professional legal drafts, or generic chatbot answers.
- Avoid large walls of text or long unstructured paragraphs.

PREFERRED FORMAT:
The answer must follow this structure, with bold headers for each section:

1. **Introduction**: A brief 1-2 sentence conceptual introduction.
2. **Relevant Section / Provision**: Cite the specific section(s) and act name (e.g., "Section 123 of the Companies Act, 2013").
3. **Explanation**: Break down the core provisions, limits, and rules in simple, structured sentences.
4. **Main Points**: Present the crucial points or checklist of requirements using a numbered or bulleted list.
5. **Conclusion**: Provide a definitive 1-2 sentence final verdict/conclusion answering the question's prompt.

OUTPUT FORMAT:
Respond ONLY with a valid JSON object. No markdown. No backticks. Start with { and end with }.

{
  "expectedAnswer": "Exam-ready version of the answer. Use clear headings, numbered lists, and bullet points. Format with \\n for line breaks. Max 500 words."
}

STRICT JSON CONFIGURATION:
- No unescaped newline characters inside string values. Use \\n to represent line breaks.
- No raw double quotes inside string values. Use single quotes or escape them.
- Do not add any preamble or markdown formatting like \`\`\`json. Return pure JSON string.`;
}
```

### User Prompt (`buildCSExamReadyAnswerUserPrompt`)
```typescript
export function buildCSExamReadyAnswerUserPrompt(params: {
  subject: string;
  question: string;
  marks: number;
  sourceMaterial: string;
}): string {
  return `EXAMINATION DETAILS:
Subject: ${params.subject}
Marks: ${params.marks}

QUESTION:
"${params.question}"

SOURCE MATERIAL / RAW GUIDELINE ANSWER:
"${params.sourceMaterial}"

TASK:
Convert the source material into the requested exam-ready expected answer format. Ensure the source material is treated as the absolute source of truth.`;
}
```

## 4. Backend Preheat & Caching (`app/api/evaluate-paper/route.ts`)

Concurrently with completing the paper evaluation, the system preheats the expected answer cache.

### Background Preheat Logic
Inside `app/api/evaluate-paper/route.ts`, after the paper is successfully evaluated (`paper.status = "completed"`):
1. Spawn an asynchronous preheating process.
2. Iterate through `paper.questions`.
3. Check Firestore `ideal_answers/${paper.paperId}_${q.questionId}`.
4. If cached answer is missing:
   * Try to retrieve the guideline answer using `retrieveRubric(paper.subject, q.questionText)`.
   * If a rubric is matched, extract `rubric.expected_answer.full_answer_summary`.
   * If no rubric is matched (e.g., AI-generated question), fall back to `q.idealAnswerCode` generated during paper creation.
   * Call Gemini with the formatting prompts.
   * Save the formatted expected answer in Firestore under `ideal_answers/${paper.paperId}_${q.questionId}`.

### Dedicated Expected Answer Endpoint (`app/api/evaluate/expected-answer/route.ts`)
Creates a endpoint that accepts `{ paperId, questionId, questionNumber }` to serve individual expected answers:
*   Checks Firestore `ideal_answers/${paperId}_${questionId}` first.
*   If found, returns it immediately (Cache Hit).
*   If missing (fallback), performs the on-demand generation, saves it to Firestore, and returns it.

## 5. UI/UX Paginated expected Answer Viewer

### Entry Point
A high-end CTA button **"View Expected Answers"** is displayed in the summary banner of the evaluated paper detail page (`app/(main)/papers/[paperId]/page.tsx`).

### Viewer Component (`app/(main)/papers/[paperId]/expected-answers/page.tsx`)
A dedicated page displaying a single question's expected answer at a time:
*   **Progress Indicator:** E.g., "Question 2 of 6" with a premium progress bar.
*   **Question Card:** Displays the question, marks, and topic.
*   **Marks Obtained Badge:** "Scored: 3.5 / 5 Marks" colored green, amber, or red.
*   **Gaps Card:** Displays "What You Missed" and "Keywords Missed" from the evaluation details.
*   **Model Expected Answer Card:** Shows the generated expected answer in the preferred CS student style.
*   **ICSI Guideline Reference Card:** Shows the official raw guideline points for reference.
*   **Navigation Bar:** Sticky footer with **"Previous Question"** and **"Next Question"** buttons.

## 6. Verification Plan

### Automated Verification
*   Verify that `/api/evaluate-paper` completes successfully and triggers preheating.
*   Verify that `/api/evaluate/expected-answer` returns correct JSON output.
*   Verify that cache retrieval works and Gemini is NOT called for cached answers.

### Manual Verification
*   Review generated answers against the style guide (Intro, Provision, Points, Explanation, Conclusion).
*   Test pagination controls in the browser (Prev/Next buttons).
*   Verify that loading states are instant for preheated questions.
