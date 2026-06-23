const fs = require('fs');
const path = require('path');

// Normalization function to identify duplicate question text
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const destDir = path.join(__dirname, '..', 'evaluation');
  if (!fs.existsSync(destDir)) {
    console.error(`Evaluation directory does not exist: ${destDir}`);
    return;
  }

  // 1. Traverse and load all subject JSON files
  const subjects = fs.readdirSync(destDir).filter(f => {
    return fs.statSync(path.join(destDir, f)).isDirectory() && f !== 'analysis';
  });

  console.log(`Found subjects: ${subjects.join(', ')}`);

  const allFiles = [];
  for (const subject of subjects) {
    const subjectPath = path.join(destDir, subject);
    const files = fs.readdirSync(subjectPath).filter(f => f.endsWith('.json'));
    for (const file of files) {
      allFiles.push({
        subject,
        fileName: file,
        filePath: path.join(subjectPath, file)
      });
    }
  }

  console.log(`Loading ${allFiles.length} JSON files...`);

  // Load content
  const papers = [];
  for (const f of allFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(f.filePath, 'utf8'));
      papers.push({
        ...f,
        data
      });
    } catch (err) {
      console.error(`Error reading/parsing file ${f.filePath}:`, err);
    }
  }

  // 2. Index all questions by normalized text to find duplicates
  const questionGroups = {}; // normalizedText -> array of { paperIndex, questionIndex, year, session, text, marks, id }

  papers.forEach((paper, pIdx) => {
    if (!paper.data.questions) return;
    paper.data.questions.forEach((q, qIdx) => {
      const norm = normalizeText(q.questionText);
      if (!norm) return;
      if (!questionGroups[norm]) {
        questionGroups[norm] = [];
      }
      questionGroups[norm].push({
        paperIndex: pIdx,
        questionIndex: qIdx,
        year: paper.data.year,
        session: paper.data.session,
        text: q.questionText,
        marks: q.marks,
        id: q.questionId,
        subject: paper.data.subject
      });
    });
  });

  console.log(`Total unique question texts: ${Object.keys(questionGroups).length}`);

  // 3. Inject frequency metadata back into the question JSON files
  Object.values(questionGroups).forEach(group => {
    const frequencyCount = group.length;
    const yearsAppeared = Array.from(new Set(group.map(g => g.year))).sort((a, b) => a - b);
    
    group.forEach(occurrence => {
      const paper = papers[occurrence.paperIndex];
      const q = paper.data.questions[occurrence.questionIndex];
      
      q.frequencyMetadata = {
        appearsInPYQ: true,
        frequencyCount,
        yearsAppeared
      };
    });
  });

  // Save updated papers back to files
  papers.forEach(paper => {
    fs.writeFileSync(paper.filePath, JSON.stringify(paper.data, null, 2), 'utf8');
  });
  console.log("Updated all subject JSON files with frequency metadata.");

  // 4. Generate Reports
  const analysisDir = path.join(destDir, 'analysis');
  if (!fs.existsSync(analysisDir)) {
    fs.mkdirSync(analysisDir, { recursive: true });
  }

  // A. repeated-questions.json
  const repeatedQuestions = [];
  Object.entries(questionGroups).forEach(([norm, group]) => {
    if (group.length > 1) {
      repeatedQuestions.push({
        text: group[0].text,
        subject: group[0].subject,
        frequencyCount: group.length,
        occurrences: group.map(g => ({
          questionId: g.id,
          year: g.year,
          session: g.session,
          marks: g.marks
        }))
      });
    }
  });
  repeatedQuestions.sort((a, b) => b.frequencyCount - a.frequencyCount);
  fs.writeFileSync(
    path.join(analysisDir, 'repeated-questions.json'),
    JSON.stringify(repeatedQuestions, null, 2),
    'utf8'
  );
  console.log(`Saved repeated-questions.json (${repeatedQuestions.length} duplicates found).`);

  // B. topic-frequency.json
  const topicFreq = {}; // subject -> topic -> count
  papers.forEach(paper => {
    const sub = paper.data.subject;
    if (!topicFreq[sub]) topicFreq[sub] = {};
    
    if (!paper.data.questions) return;
    paper.data.questions.forEach(q => {
      const topic = q.topic || 'Unclassified';
      topicFreq[sub][topic] = (topicFreq[sub][topic] || 0) + 1;
    });
  });

  // Format topic frequency as sorted arrays
  const formattedTopicFreq = {};
  for (const [sub, topics] of Object.entries(topicFreq)) {
    formattedTopicFreq[sub] = Object.entries(topics)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);
  }
  fs.writeFileSync(
    path.join(analysisDir, 'topic-frequency.json'),
    JSON.stringify(formattedTopicFreq, null, 2),
    'utf8'
  );
  console.log("Saved topic-frequency.json.");

  // C. yearwise-frequency.json
  const yearwiseFreq = {}; // subject -> year-session -> count & totalMarks
  papers.forEach(paper => {
    const sub = paper.data.subject;
    if (!yearwiseFreq[sub]) yearwiseFreq[sub] = {};

    const key = `${paper.data.year}-${paper.data.session}`;
    let totalQuestions = 0;
    let totalMarks = 0;

    if (paper.data.questions) {
      totalQuestions = paper.data.questions.length;
      totalMarks = paper.data.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
    }

    yearwiseFreq[sub][key] = {
      totalQuestions,
      totalMarks
    };
  });
  fs.writeFileSync(
    path.join(analysisDir, 'yearwise-frequency.json'),
    JSON.stringify(yearwiseFreq, null, 2),
    'utf8'
  );
  console.log("Saved yearwise-frequency.json.");

  // D. Generate Validation and Summary Report
  const subjectsSummary = [];
  let grandTotalQuestions = 0;

  for (const subject of subjects) {
    const subPapers = papers.filter(p => p.subject === subject);
    let questionCount = 0;
    subPapers.forEach(p => {
      if (p.data.questions) questionCount += p.data.questions.length;
    });
    grandTotalQuestions += questionCount;

    subjectsSummary.push({
      subjectCode: subPapers[0] ? subPapers[0].data.questions?.[0]?.questionId?.split('_')[0] || subject.toUpperCase() : subject.toUpperCase(),
      subjectName: subPapers[0] ? subPapers[0].data.subject : subject,
      filesProcessedCount: subPapers.length,
      questionsExtracted: questionCount
    });
  }

  const summaryReport = {
    totalPdfFilesProcessed: allFiles.length,
    totalQuestionsExtracted: grandTotalQuestions,
    subjects: subjectsSummary,
    duplicateQuestionsCount: repeatedQuestions.length,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(analysisDir, 'summary-report.json'),
    JSON.stringify(summaryReport, null, 2),
    'utf8'
  );
  console.log("Saved summary-report.json.");

  console.log("\n================ SUMMARY ================");
  console.log(`Total PDF Files Processed: ${allFiles.length}`);
  console.log(`Total Questions Extracted: ${grandTotalQuestions}`);
  console.log(`Duplicate Questions Found: ${repeatedQuestions.length}`);
  console.log("=========================================");
}

if (require.main === module) {
  main().catch(err => console.error("Fatal error:", err));
}
