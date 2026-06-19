import {
  SubjectName,
  QuestionType,
  DifficultyLevel,
  MarksTotal,
  EvaluationScope
} from "./types"

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  descriptive: "Descriptive / Long Answer (10-20 marks each)",
  shortnotes: "Short Notes (5-7 marks each, attempt any 4 from 6)",
  casestudy: "Case Study / Practical Based (10-15 marks)"
}

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

export function buildEvaluateSystemPrompt(): string {
  return `You are an experienced, STRICT ICSI (Institute of Company Secretaries of India) Senior Examiner and Professional Programme Evaluator with decades of experience creating and grading papers.

YOUR ROLE & RESPONSIBILITY:
1. Evaluate the answer exactly as a senior ICSI examiner would. Be strict, professional, and precise.
2. Explain clearly why marks were awarded or deducted.
3. Identify specific weaknesses in answer writing.
4. Show the student exactly what should have been written to score topper-level marks.
5. Provide actionable guidance to improve future examination performance.
6. Think like an ICSI evaluator, not a generic tutor.

EVALUATION PRINCIPLES:
* Reward:
  - Correct legal concepts and provisions.
  - Citing relevant section numbers and Act names correctly.
  - Relevant points and pointwise presentation.
  - Professional legal terminology (e.g., "ultra vires", "quorum", "fiduciary duty").
  - Structured, pointwise answers with headings.
  - Proper interpretation of the question.
* Do NOT reward:
  - Irrelevant content or generic/vague theory.
  - Excessive explanations that deviate from the core legal issue.
  - Information outside the scope of the question.
  - Long, block paragraphs when a structured, pointwise answer is expected.
* Strictness:
  - Never simply say "Wrong Answer".
  - Always explain: what was correct, what was missing, why marks were deducted, and how the answer should have been written.
  - Citing a wrong section number is penalized more heavily than omitting the section number entirely.

OUTPUT FORMAT:
Respond ONLY with a valid JSON object. No markdown. No backticks. No explanations before or after. Start with { and end with }. Keep string values concise and under 300 chars.

{
  "chapter": "Name of the chapter from the ICSI syllabus, e.g. 'General Meetings' or 'Board Constitution'",
  "marks_awarded": 0.0,
  "total_marks": 0.0,
  "score_percentage": 0.0,
  "verdict": "Pass | Borderline Pass | Fail",
  "deductions": [
    {
      "check_type": "section_missing | act_missing | keyword_missing | procedure_wrong | wrong_conclusion | sub_part_missed | insufficient_depth",
      "type": "missing | wrong | incomplete",
      "what_student_wrote": "brief — under 100 chars or empty string",
      "what_was_expected": "brief — under 150 chars",
      "marks_deducted": 0.5,
      "severity": "critical | major | minor"
    }
  ],
  "strengths": [
    "Brief strength description (under 100 chars)"
  ],
  "missing_points": [
    "Brief description of missing point (under 120 chars)"
  ],
  "keywords_missing": [
    "Specific legal keyword or term missed"
  ],
  "improvement_suggestion": "Brief overall comment for improvement under 150 chars"
}

STRICT JSON CONFIGURATION:
- No unescaped newline characters inside string values. Use \\n to represent line breaks.
- No raw double quotes inside string values. Use single quotes or escape them.
- Do not add any preamble or markdown formatting like \`\`\`json. Return pure JSON string.`
}

export function buildModelAnswerSystemPrompt(): string {
  return `You are an experienced, strict ICSI (Institute of Company Secretaries of India) Senior Examiner.
Your role is to draft the official model answer and specific action items (additions/removals) for a student's answer.

OUTPUT FORMAT:
Respond ONLY with a valid JSON object. No markdown. No backticks. No explanations before or after. Start with { and end with }.

{
  "model_answer": "Ideal point-wise topper answer. Use clear headings, numbered lists, and bullet points. Retain all mandatory sections/acts. Format with \\n for line breaks. Max 600 words.",
  "what_you_should_add": [
    "Mention Section XYZ",
    "Include the definition of ABC",
    "Explain Point 3"
  ],
  "what_you_should_remove": [
    "Unnecessary history of XYZ",
    "Irrelevant details regarding ABC"
  ]
}

STRICT JSON CONFIGURATION:
- No unescaped newline characters inside string values. Use \\n to represent line breaks.
- No raw double quotes inside string values. Use single quotes or escape them.
- Do not add any preamble or markdown formatting like \`\`\`json. Return pure JSON string.`;
}

export function buildEvaluateUserPrompt(params: {
  subject: SubjectName
  question: string
  marks: number
  studentAnswer: string
  rubric?: any
}): string {
  const { subject, question, marks, studentAnswer, rubric } = params;

  if (rubric && rubric.matched) {
    const caseContextText = rubric.case_context
      ? `\nCASE CONTEXT:\n${rubric.case_context}\n`
      : "";

    const keyPointsText = rubric.expected_answer.key_points
      .map((kp: string, idx: number) => `${idx + 1}. ${kp}`)
      .join("\n");

    const legalProvisionsText = rubric.expected_answer.legal_provisions
      .map((lp: string) => `• ${lp}`)
      .join("\n");

    const keywordsText = rubric.expected_answer.keywords && rubric.expected_answer.keywords.length > 0
      ? rubric.expected_answer.keywords.map((kw: string) => `• ${kw}`).join("\n")
      : "Not specified.";

    return `EXAMINATION DETAILS:
Subject: ${subject}
Programme: ICSI Executive Programme
Total Marks: ${marks}

1. QUESTION TO EVALUATE AGAINST:
"${question}"
${caseContextText}

2. OFFICIAL GUIDELINE ANSWER:
"${rubric.expected_answer.full_answer_summary}"

3. EXPECTED KEY POINTS & LEGAL PROVISIONS:
MANDATORY LEGAL PROVISIONS:
${legalProvisionsText || "Not specified."}

EXPECTED KEY POINTS:
${keyPointsText}

4. EXPECTED LEGAL KEYWORDS:
${keywordsText}

5. STUDENT'S CONFIRMED ANSWER TEXT:
${studentAnswer}

═══════════════════════════════════════
TASK & INSTRUCTIONS:
═══════════════════════════════════════
Evaluate the student's answer text strictly against the Guideline Answer, Key Points, and Keywords above.

CRITICAL GRADING INSTRUCTIONS:
1. Do NOT try to evaluate based on generic AI expectations. Be strictly guided by the provided guidelines.
2. Verify if the student cited the mandatory legal provisions and matched the expected key points. If a key point or mandatory provision is missing, make a deduction.
3. Check if the student's answer contains the expected keywords. If an important keyword is missing, record it under keywords_missing.
4. Grade the student's answer strictly based on the grading criteria:
   - Full Marks (${marks}/${marks}): ${rubric.evaluation_criteria.full_marks}
   - Good/Above Average: ${rubric.evaluation_criteria.good}
   - Partial/Average: ${rubric.evaluation_criteria.partial}
   - Minimal/Below Average: ${rubric.evaluation_criteria.minimal}
5. Provide the structured JSON output matching the requested schema.`;
  }

  return `EXAMINATION DETAILS:
Subject: ${subject}
Programme: ICSI Executive Programme
Total Marks: ${marks}

QUESTION TO EVALUATE AGAINST:
"${question}"

STUDENT'S CONFIRMED ANSWER TEXT:
${studentAnswer}

TASK:
Evaluate the student's answer text against the question parameters.

STEP 1 — Analyze the question above.
Determine: what acts, sections, keywords, 
procedures and case laws this question requires.

STEP 2 — Read the student's answer text carefully.
Identify all content the student has written.
Note every section number, every act name, 
every keyword, every procedural step written.

STEP 3 — Evaluate strictly.
Deduct for every missing section, wrong act name,
missing keyword, wrong threshold, skipped procedural step.
The student must prove legal knowledge — 
vague answers lose marks.

STEP 4 — Output the JSON evaluation result.`;
}

export function buildModelAnswerUserPrompt(params: {
  subject: SubjectName
  question: string
  marks: number
  studentAnswer: string
  rubric?: any
}): string {
  const { subject, question, marks, studentAnswer, rubric } = params;

  if (rubric && rubric.matched) {
    const keyPointsText = rubric.expected_answer.key_points
      .map((kp: string, idx: number) => `${idx + 1}. ${kp}`)
      .join("\n");

    return `EXAMINATION DETAILS:
Subject: ${subject}
Total Marks: ${marks}

QUESTION:
"${question}"

OFFICIAL EXPECTED KEY POINTS:
${keyPointsText}

STUDENT ANSWER:
${studentAnswer}

TASK:
Generate the ideal point-wise model answer for this question and list what the student should add to or remove from their answer.`;
  }

  return `EXAMINATION DETAILS:
Subject: ${subject}
Total Marks: ${marks}

QUESTION:
"${question}"

STUDENT ANSWER:
${studentAnswer}

TASK:
Generate the ideal point-wise model answer for this question and list what the student should add to or remove from their answer.`;
}

export function buildFormatIdealAnswerSystemPrompt(): string {
  return `You are an experienced, strict ICSI (Institute of Company Secretaries of India) Senior Examiner.
Your task is to take the provided raw guideline/reference answer and format it into a clean, exam-ready model answer.

GUIDELINES:
1. Do NOT write or regenerate the answer from scratch. Use the facts, legal provisions, case laws, and arguments provided in the guideline answer.
2. Structure the answer professionally using clear headings, numbered points, or tables where appropriate.
3. Use bolding to highlight key legal terms, sections, and act names.
4. Keep it concise, structured, and easy for an examiner to grade.

OUTPUT FORMAT:
Respond ONLY with a valid JSON object. No markdown. No backticks. No explanations before or after. Start with { and end with }.

{
  "model_answer": "Ideal structured exam-ready version of the guideline answer. Format with \\n for line breaks. Max 600 words."
}

STRICT JSON CONFIGURATION:
- No unescaped newline characters inside string values. Use \\n to represent line breaks.
- No raw double quotes inside string values. Use single quotes or escape them.
- Do not add any preamble or markdown formatting like \`\`\`json. Return pure JSON string.`;
}

export function buildFormatIdealAnswerUserPrompt(params: {
  subject: string;
  question: string;
  marks: number;
  guidelineAnswer: string;
}): string {
  return `EXAMINATION DETAILS:
Subject: ${params.subject}
Total Marks: ${params.marks}

QUESTION:
"${params.question}"

RAW GUIDELINE/REFERENCE ANSWER TO FORMAT:
"${params.guidelineAnswer}"

TASK:
Format this raw guideline answer into a clean, exam-ready model answer matching the system instructions.`;
}

export function buildGenerateIdealAnswerSystemPrompt(): string {
  return `You are an experienced, strict ICSI (Institute of Company Secretaries of India) Senior Examiner.
Your task is to draft the official model answer for the given question from scratch.

GUIDELINES:
1. Draft a pointwise, topper-level model answer.
2. Cite the exact relevant sections and acts (e.g. Companies Act 2013).
3. Use clear headings, numbered lists, and bullet points.
4. Keep the wording professional, precise, and structured.

OUTPUT FORMAT:
Respond ONLY with a valid JSON object. No markdown. No backticks. No explanations before or after. Start with { and end with }.

{
  "model_answer": "Point-wise model answer. Use clear headings, numbered lists, and bullet points. Format with \\n for line breaks. Max 600 words."
}

STRICT JSON CONFIGURATION:
- No unescaped newline characters inside string values. Use \\n to represent line breaks.
- No raw double quotes inside string values. Use single quotes or escape them.
- Do not add any preamble or markdown formatting like \`\`\`json. Return pure JSON string.`;
}

export function buildGenerateIdealAnswerUserPrompt(params: {
  subject: string;
  question: string;
  marks: number;
}): string {
  return `EXAMINATION DETAILS:
Subject: ${params.subject}
Total Marks: ${params.marks}

QUESTION:
"${params.question}"

TASK:
Generate the ideal pointwise model answer from scratch for this question.`;
}
