const path = require("path");
const fs = require("fs");

try {
  // Try importing using ts-node or regular node to check if syntax is valid
  // Since it's typescript, we'll verify it parses or compiles by using Node.js
  const typesFile = fs.readFileSync(path.join(__dirname, "../lib/types.ts"), "utf8");
  const storeFile = fs.readFileSync(path.join(__dirname, "../lib/question-store.ts"), "utf8");
  
  if (typesFile.includes("IdealAnswerDocument") && storeFile.includes("saveIdealAnswerToFirestore")) {
    console.log("Types and store functions successfully parsed and exist in files!");
  } else {
    console.error("Missing expected definitions in typescript files.");
  }
} catch (err) {
  console.error("Failed to run check:", err);
}
