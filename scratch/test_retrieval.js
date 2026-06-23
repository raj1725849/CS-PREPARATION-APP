const { extractQuestionNumber, retrieveRubric } = require("../lib/rubric-retriever");

function testExtractor() {
  const tests = [
    { input: "1(a)", expected: "1(a)" },
    { input: "Question 1(b)", expected: "1(b)" },
    { input: "q2(c)", expected: "2(c)" },
    { input: "1a", expected: "1(a)" },
    { input: "Question 1b", expected: "1(b)" },
    { input: "1(a) Whether the contention of the bank...", expected: "1(a)" },
    { input: "no question number here", expected: null }
  ];

  console.log("=== Testing Question Number Extractor ===");
  for (const t of tests) {
    const result = extractQuestionNumber(t.input);
    const passed = result === t.expected;
    console.log(`Input: "${t.input}" -> Extracted: ${result} (Expected: ${t.expected}) [${passed ? "PASSED" : "FAILED"}]`);
    if (!passed) {
      process.exit(1);
    }
  }
  console.log("All extractor tests passed!\n");
}

function testRetrieval() {
  console.log("=== Testing Rubric Retrieval ===");
  
  // Test matching by question number 1(b)
  const result1 = retrieveRubric("Company Law", "Question 1(b)");
  console.log("1(b) Match Result:");
  console.log(`Matched: ${result1.matched}`);
  console.log(`Question Number: ${result1.sub_question}`);
  console.log(`Similarity: ${result1.similarity}`);
  console.log(`Question ID: ${result1.question_id}`);
  console.log(`Keywords found: ${result1.expected_answer?.keywords ? result1.expected_answer.keywords.length : 0}`);
  
  if (!result1.matched || result1.similarity !== 1.0) {
    console.error("Failed to match 1(b) by question number!");
    process.exit(1);
  }

  // Test matching by Jaccard similarity
  const result2 = retrieveRubric("Company Law", "Whether the contention of the financial institution is valid?");
  console.log("\nJaccard Match Result (contention):");
  console.log(`Matched: ${result2.matched}`);
  console.log(`Question Number: ${result2.sub_question}`);
  console.log(`Similarity: ${result2.similarity}`);
  
  if (!result2.matched || result2.similarity === 0) {
    console.error("Failed to match by Jaccard text similarity!");
    process.exit(1);
  }

  console.log("\nAll retrieval matching tests passed!");
}

testExtractor();
testRetrieval();
