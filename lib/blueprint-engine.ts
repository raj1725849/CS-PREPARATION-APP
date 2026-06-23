import fs from "fs"
import path from "path"
import {
  SubjectName,
  QuestionType,
  DifficultyLevel,
  MarksTotal,
  EvaluationScope,
  BlueprintSlot,
  PaperBlueprint
} from "./types"

export const SUBJECT_FOLDER_MAP: Record<string, string> = {
  "Company Law": "company-law",
  "Economic, Business & Commercial Laws": "economic-commercial-laws",
  "Tax Laws": "tax-laws",
  "Company Accounts & Auditing Practices": "corporate-accounting",
  "Capital Markets & Securities Laws": "securities-law",
  "Industrial, Labour & General Laws": "setting-up-of-business",
  "Jurisprudence, Interpretation & General Laws": "jurisprudence-interpretation-general-laws",
}

// Topic name normalization — merges variant names from PYQs into canonical topics
const TOPIC_ALIASES: Record<string, string> = {
  "Dividend": "Dividends",
  "Registers & Records / Shares": "Registers & Records",
  "Members / Articles of Association": "Members & Articles of Association",
  "Share Capital / General Meetings": "Share Capital",
  "Related Party Transactions / Types of Companies": "Related Party Transactions",
  "Company Law Principles / Liabilities": "Company Law Principles",
  "Corporate Governance / Legal Remedies": "Corporate Governance",
}

function normalizeTopic(topic: string): string {
  if (!topic) return "General"
  return TOPIC_ALIASES[topic] || topic
}

interface PYQQuestion {
  questionId: string
  questionNumber: string
  marks: number | null
  questionText: string
  questionType?: string
  topic: string
  subTopic: string
  sectionNumber?: string | null
  isCaseStudy?: boolean
  isPractical?: boolean
  year?: number
  session?: string
}

/**
 * Loads all PYQ questions for a given subject.
 */
export function loadQuestionBank(subject: string): PYQQuestion[] {
  const folderName = SUBJECT_FOLDER_MAP[subject]
  if (!folderName) {
    console.warn(`[BLUEPRINT] Subject folder not found for: ${subject}`)
    return []
  }

  const folderPath = path.join(process.cwd(), "question-banks", folderName)
  if (!fs.existsSync(folderPath)) {
    console.warn(`[BLUEPRINT] Folder does not exist: ${folderPath}`)
    return []
  }

  try {
    const jsonFiles = fs.readdirSync(folderPath).filter(f => f.endsWith(".json"))
    const allQuestions: PYQQuestion[] = []

    for (const file of jsonFiles) {
      const filePath = path.join(folderPath, file)
      const content = fs.readFileSync(filePath, "utf8")
      const data = JSON.parse(content)
      const questions = data.questions || []
      
      for (const q of questions) {
        allQuestions.push({
          ...q,
          year: data.year,
          session: data.session,
          topic: normalizeTopic(q.topic),
          subTopic: q.subTopic ? q.subTopic.trim() : "General"
        })
      }
    }

    return allQuestions
  } catch (err) {
    console.error(`[BLUEPRINT] Failed to load question bank for ${subject}:`, err)
    return []
  }
}

interface BlueprintParams {
  subject: SubjectName
  scope: EvaluationScope
  topic?: string
  questionTypes: QuestionType[]
  marks: MarksTotal
  difficulty: DifficultyLevel
}

/**
 * Generates a structured paper blueprint deterministically.
 */
export async function buildPaperBlueprint(params: BlueprintParams): Promise<PaperBlueprint> {
  const { subject, scope, topic, questionTypes, marks, difficulty } = params
  
  // 1. Load PYQ questions
  const pyqQuestions = loadQuestionBank(subject)
  
  // 2. Build Topic and Subtopic Frequency Data
  const topicFreq: Record<string, { count: number; marks: number; questions: PYQQuestion[] }> = {}
  const subtopicMap: Record<string, Record<string, PYQQuestion[]>> = {}
  
  for (const q of pyqQuestions) {
    const tName = q.topic
    const sName = q.subTopic
    
    if (!topicFreq[tName]) {
      topicFreq[tName] = { count: 0, marks: 0, questions: [] }
    }
    topicFreq[tName].count++
    topicFreq[tName].marks += (q.marks || 0)
    topicFreq[tName].questions.push(q)
    
    if (!subtopicMap[tName]) {
      subtopicMap[tName] = {}
    }
    if (!subtopicMap[tName][sName]) {
      subtopicMap[tName][sName] = []
    }
    subtopicMap[tName][sName].push(q)
  }
  
  // Total unique topics in this subject's PYQ
  const allKnownTopics = Object.keys(topicFreq)
  
  // 3. Determine paper structure / slots
  let slots: { marks: number; questionType: QuestionType }[] = []
  
  // If "casestudy" is requested, allocate a dedicated Section 1 with 5 slots of 3 marks each
  const hasCaseStudy = questionTypes.includes("casestudy")
  const nonCaseStudyTypes = questionTypes.filter(t => t !== "casestudy")
  const primaryTypes = nonCaseStudyTypes.length > 0 ? nonCaseStudyTypes : ["descriptive" as QuestionType]
  
  if (hasCaseStudy && marks >= 50) {
    // Q1: 5 slots of 3 marks (15 marks total)
    for (let i = 0; i < 5; i++) {
      slots.push({ marks: 3, questionType: "casestudy" })
    }
    
    const remainingMarks = marks - 15
    const remainingSlotsCount = Math.floor(remainingMarks / 5)
    
    for (let i = 0; i < remainingSlotsCount; i++) {
      // Alternate between other requested question types
      const qType = primaryTypes[i % primaryTypes.length]
      slots.push({ marks: 5, questionType: qType })
    }
    
    // If there is any remainder (e.g. due to division), add to last slot
    const allocatedSum = 15 + remainingSlotsCount * 5
    if (allocatedSum < marks && slots.length > 0) {
      slots[slots.length - 1].marks += (marks - allocatedSum)
    }
  } else {
    // Standard 5-mark slots
    const slotCount = Math.floor(marks / 5)
    for (let i = 0; i < slotCount; i++) {
      const qType = questionTypes[i % questionTypes.length]
      slots.push({ marks: 5, questionType: qType })
    }
    
    const allocatedSum = slotCount * 5
    if (allocatedSum < marks && slots.length > 0) {
      slots[slots.length - 1].marks += (marks - allocatedSum)
    }
  }
  
  // 4. Distribute topics to slots
  const blueprintSlots: BlueprintSlot[] = []
  const topicAllocatedCounts: Record<string, number> = {}
  
  // Topic selection helper for full scope
  const getNextTopicForFullScope = (slotIndex: number): string => {
    if (allKnownTopics.length === 0) return "General"
    
    // Proportional D'Hondt method: select topic with max priority score
    let bestTopic = allKnownTopics[0]
    let bestScore = -1
    
    for (const t of allKnownTopics) {
      const freq = topicFreq[t].count
      const allocated = topicAllocatedCounts[t] || 0
      
      // Webster/Sainte-Laguë scoring formula: freq / (2 * allocated + 1)
      const score = freq / (2 * allocated + 1)
      if (score > bestScore) {
        bestScore = score
        bestTopic = t
      }
    }
    
    topicAllocatedCounts[bestTopic] = (topicAllocatedCounts[bestTopic] || 0) + 1
    return bestTopic
  }
  
  // Keep track of used subtopics per topic to avoid repeats
  const usedSubtopicsPerTopic: Record<string, Set<string>> = {}
  
  for (let idx = 0; idx < slots.length; idx++) {
    const slotNum = idx + 1
    const slotConfig = slots[idx]
    
    let selectedTopic = "General"
    if (scope === "topic" && topic) {
      selectedTopic = normalizeTopic(topic)
    } else {
      selectedTopic = getNextTopicForFullScope(idx)
    }
    
    if (!usedSubtopicsPerTopic[selectedTopic]) {
      usedSubtopicsPerTopic[selectedTopic] = new Set<string>()
    }
    
    // Find all subtopics for this topic
    const availableSubtopics = subtopicMap[selectedTopic] 
      ? Object.keys(subtopicMap[selectedTopic])
      : ["General"]
      
    // Filter out already used subtopics in this generation
    let remainingSubtopics = availableSubtopics.filter(st => !usedSubtopicsPerTopic[selectedTopic].has(st))
    
    // If we ran out of subtopics, reset the used set for this topic
    if (remainingSubtopics.length === 0) {
      usedSubtopicsPerTopic[selectedTopic].clear()
      remainingSubtopics = availableSubtopics
    }
    
    // Select subtopic
    // Prefer subtopics that have matching question type or marks in PYQ
    let selectedSubtopic = remainingSubtopics[0] || "General"
    let bestScore = -1
    
    for (const st of remainingSubtopics) {
      const questionsInSub = subtopicMap[selectedTopic]?.[st] || []
      let score = 0
      
      for (const q of questionsInSub) {
        // If type matches, add points
        if (slotConfig.questionType === "casestudy" && q.isCaseStudy) score += 5
        if (slotConfig.questionType === "descriptive" && !q.isCaseStudy && !q.isPractical) score += 3
        if (q.marks === slotConfig.marks) score += 2
      }
      
      if (score > bestScore) {
        bestScore = score
        selectedSubtopic = st
      }
    }
    
    usedSubtopicsPerTopic[selectedTopic].add(selectedSubtopic)
    
    // Select a sample PYQ question text for this subtopic
    const subtopicQuestions = subtopicMap[selectedTopic]?.[selectedSubtopic] || []
    let sampleQuestion: PYQQuestion | undefined = undefined
    
    if (subtopicQuestions.length > 0) {
      // Find a question in this subtopic that matches type if possible
      const matchingTypeQ = subtopicQuestions.find(q => {
        if (slotConfig.questionType === "casestudy" && q.isCaseStudy) return true
        if (slotConfig.questionType === "descriptive" && !q.isCaseStudy) return true
        return false
      })
      sampleQuestion = matchingTypeQ || subtopicQuestions[0]
    }
    
    blueprintSlots.push({
      slotNumber: slotNum,
      topic: selectedTopic,
      subTopic: selectedSubtopic,
      marks: slotConfig.marks,
      questionType: slotConfig.questionType,
      samplePYQText: sampleQuestion?.questionText || undefined,
      isCaseStudy: slotConfig.questionType === "casestudy" || !!sampleQuestion?.isCaseStudy,
      isPractical: !!sampleQuestion?.isPractical,
      sectionNumber: sampleQuestion?.sectionNumber || undefined
    })
  }
  
  // 5. Calculate final stats
  const finalTopicCoverage: Record<string, number> = {}
  let coveredTopicsCount = 0
  
  for (const slot of blueprintSlots) {
    finalTopicCoverage[slot.topic] = (finalTopicCoverage[slot.topic] || 0) + slot.marks
  }
  
  for (const t of allKnownTopics) {
    if (finalTopicCoverage[t] > 0) {
      coveredTopicsCount++
    }
  }
  
  const coveragePercentage = allKnownTopics.length > 0
    ? Math.round((coveredTopicsCount / allKnownTopics.length) * 100)
    : 100
    
  return {
    subject,
    totalMarks: marks,
    difficulty,
    slots: blueprintSlots,
    topicCoverage: finalTopicCoverage,
    coveragePercentage,
    generatedAt: new Date().toISOString()
  }
}
