import { parseQuestionPaper } from "../lib/paper-parser";

// Standard test suite for the question paper parser engine
async function runTests() {
  console.log("====================================================");
  console.log("RUNNING QUESTION PAPER PARSER TESTS");
  console.log("====================================================");

  // Test Paper 1: Standard numbering + marks inside parenthesis + sequence gap (Q3 missing)
  const paperText1 = `
  Q1. Describe the principles of interpretation of statutes. (5 Marks)
  Q1(a). What is literal construction? (3 Marks)
  Q1(b). Explain the rule of reasonable construction. (2 Marks)
  Q2. Explain the doctrine of ultra vires. [10 Marks]
  Q4. What is an easement? (5 Marks)
  `;

  console.log("\n[TEST 1] Parsing Paper 1 (Standard Q1, Q2, Q4 with subparts and missing Q3)...");
  try {
    const result1 = await parseQuestionPaper(paperText1);
    console.log("Result 1:");
    console.log(`- Total Questions parsed: ${result1.totalQuestions} (Expected: 3 main questions)`);
    console.log(`- Total Marks: ${result1.totalMarks} (Expected: 20 marks)`);
    console.log(`- Missing Questions Detected:`, result1.missingQuestions, "(Expected: ['Q3'])");
    console.log(`- Warnings:`, result1.warnings);
    console.log(`- Full Structure:`, JSON.stringify(result1.questions, null, 2));

    // Assertions
    if (result1.questions.length !== 3) {
      throw new Error(`Test 1 Failed: Expected 3 main questions, got ${result1.questions.length}`);
    }
    if (result1.totalMarks !== 20) {
      throw new Error(`Test 1 Failed: Expected 20 total marks, got ${result1.totalMarks}`);
    }
    if (!result1.missingQuestions.includes("Q3")) {
      throw new Error(`Test 1 Failed: Expected gap detection to identify Q3 as missing, got ${JSON.stringify(result1.missingQuestions)}`);
    }
    
    // Check subparts
    const q1 = result1.questions.find(q => q.questionNumber === "Q1" || q.questionNumber === "1");
    if (!q1) {
      throw new Error("Test 1 Failed: Question 1 not found");
    }
    if (!q1.subparts || q1.subparts.length !== 2) {
      throw new Error(`Test 1 Failed: Expected 2 subparts for Q1, got ${q1.subparts?.length}`);
    }
    console.log("✓ TEST 1 PASSED");
  } catch (err: any) {
    console.error("✗ TEST 1 FAILED:", err.message);
    process.exit(1);
  }

  // Test Paper 2: Alternate numbering prefix and marks formatting
  const paperText2 = `
  1. Discuss residential status under Income Tax Act. Marks: 5
  2. What is transfer pricing? M = 10
  3. Explain GST input tax credit. 5 Marks
  `;

  console.log("\n[TEST 2] Parsing Paper 2 (Numbered 1., 2., 3. with alternate marks format)...");
  try {
    const result2 = await parseQuestionPaper(paperText2);
    console.log("Result 2:");
    console.log(`- Total Questions parsed: ${result2.totalQuestions} (Expected: 3 main questions)`);
    console.log(`- Total Marks: ${result2.totalMarks} (Expected: 20 marks)`);
    console.log(`- Missing Questions:`, result2.missingQuestions);
    console.log(`- Warnings:`, result2.warnings);
    console.log(`- Full Structure 2:`, JSON.stringify(result2.questions, null, 2));

    // Assertions
    if (result2.questions.length !== 3) {
      throw new Error(`Test 2 Failed: Expected 3 main questions, got ${result2.questions.length}`);
    }
    if (result2.totalMarks !== 20) {
      throw new Error(`Test 2 Failed: Expected 20 total marks, got ${result2.totalMarks}`);
    }
    console.log("✓ TEST 2 PASSED");
  } catch (err: any) {
    console.error("✗ TEST 2 FAILED:", err.message);
    process.exit(1);
  }

  // Test Paper 3: Hierarchy grouping with standalone line subparts
  const paperText3 = `
  Q1
  (a) Explain AGM (5 Marks)
  (b) Explain EGM (5 Marks)
  (c) Explain Quorum (5 Marks)
  Q2
  (a) Explain Proxy (5 Marks)
  (b) Explain Poll (5 Marks)
  `;

  console.log("\n[TEST 3] Parsing Paper 3 (Standalone line subparts hierarchical grouping)...");
  try {
    const result3 = await parseQuestionPaper(paperText3);
    console.log("Result 3:");
    console.log(`- Total Questions parsed: ${result3.totalQuestions} (Expected: 2 main questions)`);
    console.log(`- Total Marks: ${result3.totalMarks} (Expected: 25 marks)`);
    console.log(`- Warnings:`, result3.warnings);
    console.log(`- Full Structure 3:`, JSON.stringify(result3.questions, null, 2));

    if (result3.questions.length !== 2) {
      throw new Error(`Test 3 Failed: Expected 2 main questions, got ${result3.questions.length}`);
    }
    if (result3.totalMarks !== 25) {
      throw new Error(`Test 3 Failed: Expected 25 total marks, got ${result3.totalMarks}`);
    }
    const q1 = result3.questions.find(q => q.questionNumber === "Q1" || q.questionNumber === "Q01" || q.questionNumber === "1" || q.questionNumber.includes("1"));
    if (!q1 || !q1.subparts || q1.subparts.length !== 3) {
      throw new Error(`Test 3 Failed: Q1 should have 3 subparts`);
    }
    const q2 = result3.questions.find(q => q.questionNumber === "Q2" || q.questionNumber === "Q02" || q.questionNumber === "2" || q.questionNumber.includes("2"));
    if (!q2 || !q2.subparts || q2.subparts.length !== 2) {
      throw new Error(`Test 3 Failed: Q2 should have 2 subparts`);
    }
    // Verify subpart keys
    const sub1a = q1.subparts[0];
    if (sub1a.subpartId !== "a" || sub1a.text !== "Explain AGM (5 Marks)") {
      throw new Error(`Test 3 Failed: Subpart format mismatch: ${JSON.stringify(sub1a)}`);
    }
    console.log("✓ TEST 3 PASSED");
  } catch (err: any) {
    console.error("✗ TEST 3 FAILED:", err.message);
    process.exit(1);
  }

  // Test Paper 4: Orphan subparts validation error
  const paperText4 = `
  (a) Explain AGM (5 Marks)
  (b) Explain EGM (5 Marks)
  `;

  console.log("\n[TEST 4] Parsing Paper 4 (Orphan subparts validation error)...");
  try {
    const result4 = await parseQuestionPaper(paperText4);
    console.log("Result 4:");
    console.log(`- Total Questions parsed: ${result4.totalQuestions} (Expected: 0 main questions)`);
    console.log(`- Warnings:`, result4.warnings);

    if (result4.questions.length !== 0) {
      throw new Error(`Test 4 Failed: Expected 0 main questions for orphan subparts, got ${result4.questions.length}`);
    }
    const hasOrphanWarning = result4.warnings.some(w => w.toLowerCase().includes("without a parent question"));
    if (!hasOrphanWarning) {
      throw new Error(`Test 4 Failed: Expected warning about missing parent question, warnings: ${JSON.stringify(result4.warnings)}`);
    }
    console.log("✓ TEST 4 PASSED");
  } catch (err: any) {
    console.error("✗ TEST 4 FAILED:", err.message);
    process.exit(1);
  }

  console.log("\n====================================================");
  console.log("ALL TESTS COMPLETED SUCCESSFULLY!");
  console.log("====================================================");
}

runTests();
