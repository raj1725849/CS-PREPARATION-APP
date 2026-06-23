const path = require("path");
const fs = require("fs");

try {
  const promptsFile = fs.readFileSync(path.join(__dirname, "../lib/prompts.ts"), "utf8");
  
  if (promptsFile.includes("buildCSExamReadyAnswerSystemPrompt") && promptsFile.includes("buildCSExamReadyAnswerUserPrompt")) {
    console.log("Formatting prompts successfully defined in lib/prompts.ts!");
  } else {
    console.error("Missing formatting prompts in lib/prompts.ts.");
  }
} catch (err) {
  console.error("Failed to run prompts check:", err);
}
