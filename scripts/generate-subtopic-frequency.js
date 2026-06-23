/**
 * generate-subtopic-frequency.js
 * 
 * Reads all PYQ JSON files from /question-banks/<subject>/ directories
 * and generates a comprehensive subtopic-frequency.json file.
 * 
 * Output structure:
 * {
 *   "Company Law": {
 *     "Directors": {
 *       "totalCount": 9,
 *       "totalMarks": 35,
 *       "subtopics": {
 *         "Casual Vacancy, Appointment of Director": {
 *           "count": 1, "marks": [5], "questionTypes": ["Case Study"], "sessions": ["2026-June"]
 *         }
 *       }
 *     }
 *   }
 * }
 * 
 * Usage: node scripts/generate-subtopic-frequency.js
 */

const fs = require("fs");
const path = require("path");

const QUESTION_BANKS_DIR = path.join(__dirname, "..", "question-banks");
const OUTPUT_PATH = path.join(QUESTION_BANKS_DIR, "analysis", "subtopic-frequency.json");

// All subject folders in question-banks
const SUBJECT_FOLDERS = [
  "company-law",
  "corporate-accounting",
  "economic-commercial-laws",
  "jurisprudence-interpretation-general-laws",
  "securities-law",
  "setting-up-of-business",
  "tax-laws",
];

// Topic name normalization — merges variant names from PYQs into canonical topics
const TOPIC_ALIASES = {
  // Company Law
  "Dividend": "Dividends",
  "Registers & Records / Shares": "Registers & Records",
  "Members / Articles of Association": "Members & Articles of Association",
  "Share Capital / General Meetings": "Share Capital",
  "Related Party Transactions / Types of Companies": "Related Party Transactions",
  "Company Law Principles / Liabilities": "Company Law Principles",
  "Corporate Governance / Legal Remedies": "Corporate Governance",
};

function normalizeTopic(topic) {
  if (!topic) return "General";
  return TOPIC_ALIASES[topic] || topic;
}

function normalizeSubTopic(subTopic) {
  if (!subTopic) return "General";
  return subTopic.trim();
}

function main() {
  const result = {};
  let totalQuestionsProcessed = 0;
  let totalFilesProcessed = 0;

  for (const folder of SUBJECT_FOLDERS) {
    const folderPath = path.join(QUESTION_BANKS_DIR, folder);
    if (!fs.existsSync(folderPath)) {
      console.warn(`[SKIP] Folder not found: ${folderPath}`);
      continue;
    }

    const jsonFiles = fs.readdirSync(folderPath).filter(f => f.endsWith(".json"));

    for (const jsonFile of jsonFiles) {
      const filePath = path.join(folderPath, jsonFile);
      const raw = fs.readFileSync(filePath, "utf8");
      let data;
      try {
        data = JSON.parse(raw);
      } catch (err) {
        console.warn(`[SKIP] Failed to parse ${filePath}:`, err.message);
        continue;
      }

      const subjectName = data.subject;
      if (!subjectName) {
        console.warn(`[SKIP] No subject field in ${filePath}`);
        continue;
      }

      // Derive session string
      const session = `${data.year}-${data.session}`;
      totalFilesProcessed++;

      if (!result[subjectName]) {
        result[subjectName] = {};
      }

      const questions = data.questions || [];
      for (const q of questions) {
        totalQuestionsProcessed++;
        const topic = normalizeTopic(q.topic);
        const subTopic = normalizeSubTopic(q.subTopic);
        const marks = q.marks;
        const questionType = q.questionType || "Unknown";

        // Ensure topic entry exists
        if (!result[subjectName][topic]) {
          result[subjectName][topic] = {
            totalCount: 0,
            totalMarks: 0,
            subtopics: {},
          };
        }

        const topicEntry = result[subjectName][topic];
        topicEntry.totalCount++;
        topicEntry.totalMarks += (marks || 0);

        // Ensure subtopic entry exists
        if (!topicEntry.subtopics[subTopic]) {
          topicEntry.subtopics[subTopic] = {
            count: 0,
            marks: [],
            questionTypes: [],
            sessions: [],
            isCaseStudy: false,
            isPractical: false,
            sampleQuestionTexts: [],
          };
        }

        const subEntry = topicEntry.subtopics[subTopic];
        subEntry.count++;
        if (marks !== null && marks !== undefined) {
          subEntry.marks.push(marks);
        }
        if (!subEntry.questionTypes.includes(questionType)) {
          subEntry.questionTypes.push(questionType);
        }
        if (!subEntry.sessions.includes(session)) {
          subEntry.sessions.push(session);
        }
        if (q.isCaseStudy) subEntry.isCaseStudy = true;
        if (q.isPractical) subEntry.isPractical = true;

        // Store up to 2 sample question texts per subtopic for AI reference
        if (subEntry.sampleQuestionTexts.length < 2 && q.questionText) {
          // Truncate to 300 chars for storage efficiency
          const truncated = q.questionText.length > 300
            ? q.questionText.slice(0, 297) + "..."
            : q.questionText;
          subEntry.sampleQuestionTexts.push(truncated);
        }
      }
    }
  }

  // Sort topics within each subject by totalCount descending
  const sortedResult = {};
  for (const [subject, topics] of Object.entries(result)) {
    const sortedTopics = Object.entries(topics)
      .sort(([, a], [, b]) => b.totalCount - a.totalCount);
    
    sortedResult[subject] = {};
    for (const [topicName, topicData] of sortedTopics) {
      sortedResult[subject][topicName] = topicData;
    }
  }

  // Write output
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(sortedResult, null, 2), "utf8");

  console.log(`\n✅ Subtopic frequency analysis complete!`);
  console.log(`   Files processed: ${totalFilesProcessed}`);
  console.log(`   Questions processed: ${totalQuestionsProcessed}`);
  console.log(`   Subjects found: ${Object.keys(sortedResult).length}`);
  console.log(`   Output: ${OUTPUT_PATH}`);

  // Print summary per subject
  for (const [subject, topics] of Object.entries(sortedResult)) {
    const topicCount = Object.keys(topics).length;
    let subtopicCount = 0;
    for (const t of Object.values(topics)) {
      subtopicCount += Object.keys(t.subtopics).length;
    }
    console.log(`   ${subject}: ${topicCount} topics, ${subtopicCount} subtopics`);
  }
}

main();
