const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables from .env
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    }
  }
}
loadEnv();

// Key rotation helper
let keyIndex = 0;
function getGenAI() {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY1,
    process.env.gemini_api_key1,
    process.env.GEMINI_API_KEY2,
    process.env.gemini_api_key2,
    process.env.GEMINI_API_KEY3,
    process.env.gemini_api_key3,
    process.env.GEMINI_API_KEY4,
    process.env.gemini_api_key4
  ].filter(Boolean);

  if (keys.length === 0) {
    throw new Error("No Gemini API keys found in environment.");
  }
  const apiKey = keys[keyIndex % keys.length];
  keyIndex++;
  return new GoogleGenerativeAI(apiKey);
}

// Subject Code, Name and Slug maps
const SUBJECT_MAP = {
  jigl: {
    name: "Jurisprudence, Interpretation & General Laws",
    code: "JIGL",
    slug: "jurisprudence-interpretation-general-laws"
  },
  "company law": {
    name: "Company Law",
    code: "CL",
    slug: "company-law"
  },
  "setting up business": {
    name: "Industrial, Labour & General Laws",
    code: "ILGL",
    slug: "setting-up-of-business"
  },
  "accounting": {
    name: "Company Accounts & Auditing Practices",
    code: "CAAP",
    slug: "corporate-accounting"
  },
  "capital market": {
    name: "Capital Markets & Securities Laws",
    code: "CMSL",
    slug: "securities-law"
  },
  "economic": {
    name: "Economic, Business & Commercial Laws",
    code: "EBCL",
    slug: "economic-commercial-laws"
  },
  "tax laws": {
    name: "Tax Laws",
    code: "TL",
    slug: "tax-laws"
  }
};

function parseFilename(filename) {
  const normalized = filename.toLowerCase();
  
  // Find subject details
  let matchedSubject = null;
  for (const [key, details] of Object.entries(SUBJECT_MAP)) {
    if (normalized.includes(key)) {
      matchedSubject = details;
      break;
    }
  }

  if (!matchedSubject) {
    throw new Error(`Could not map subject for filename: ${filename}`);
  }

  // Find Year
  let year = null;
  const yearMatch = normalized.match(/(20\d{2})/) || normalized.match(/dec\s*(\d{2})/) || normalized.match(/june\s*(\d{2})/);
  if (yearMatch) {
    const val = yearMatch[1];
    if (val.length === 4) {
      year = parseInt(val, 10);
    } else {
      year = parseInt("20" + val, 10);
    }
  }
  
  // Find Session
  let session = null;
  if (normalized.includes("june")) {
    session = "June";
  } else if (normalized.includes("dec")) {
    session = "December";
  }

  if (!year || !session) {
    throw new Error(`Could not determine Year or Session from filename: ${filename} (Year: ${year}, Session: ${session})`);
  }

  return {
    subjectName: matchedSubject.name,
    subjectCode: matchedSubject.code,
    subjectSlug: matchedSubject.slug,
    year,
    session
  };
}

async function extractTextFromPdf(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }
  const buffer = fs.readFileSync(filePath);
  const uint8Array = new Uint8Array(buffer);
  const parser = new PDFParse(uint8Array);
  const textData = await parser.getText();
  return textData.text;
}

async function parseQuestionsWithGemini(pdfText, info) {
  let attempts = 0;
  const maxAttempts = 5;
  while (attempts < maxAttempts) {
    try {
      const genAI = getGenAI();
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json"
        }
      });

      const prompt = `You are an expert ICSI exam coordinator.
You will be given the full text extracted from a Previous Year Question Paper (PYQ) PDF.
Your task is to parse this text and extract all questions.

You must output a single JSON object matching the following structure:
{
  "subject": "${info.subjectName}",
  "year": ${info.year},
  "session": "${info.session}",
  "questions": [
    {
      "questionId": "Unique ID following the pattern: ${info.subjectCode}_${info.year}_${info.session.toUpperCase()}_Q<Number><SubQuestionLetter> (e.g. ${info.subjectCode}_${info.year}_${info.session.toUpperCase()}_Q1A)",
      "questionNumber": "e.g. 1(a), 2, 3(b)(i)",
      "marks": <integer representing marks, or null if cannot be determined>,
      "questionText": "the exact original text of the question, preserving original wording completely",
      "questionType": "Descriptive | Short Notes | Case Study | Practical",
      "topic": null,
      "subTopic": null,
      "sectionNumber": "e.g., Section 134(1) or null if no section is specifically mentioned in the question text",
      "isCaseStudy": <boolean, set to true if the question presents a scenario, dispute, or case where legal advice or decision is requested>,
      "isPractical": <boolean, set to true if the question requires mathematical/accounting calculations or journal entries>
    }
  ]
}

Important Rules:
1. Extract ALL questions and sub-questions from the text.
2. Do not rewrite, summarize, or edit the question text. Keep the exact original text.
3. Be careful to extract the correct marks (marks are usually listed in parentheses like (5 marks) or (8 marks) or [8] or similar).
4. For topic and subTopic, attempt to classify based on syllabus context. If uncertain, set them to null. Do not hallucinate.

PDF Text:
${pdfText}
`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Clean JSON response
      let cleanJson = responseText.trim();
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```(json)?/, "").trim();
        cleanJson = cleanJson.replace(/```$/, "").trim();
      }

      const data = JSON.parse(cleanJson);
      return data;
    } catch (err) {
      attempts++;
      console.warn(`Attempt ${attempts}/${maxAttempts} failed for ${info.subjectSlug} (${info.year}-${info.session.toLowerCase()}):`, err.message || err);
      if (attempts >= maxAttempts) {
        throw err;
      }
      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, attempts) * 1000;
      console.log(`Waiting ${delay / 1000}s before retrying...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function processFile(filename, sourceDir, destDir) {
  console.log(`\n----------------------------------------`);
  console.log(`Processing file: ${filename}`);
  const info = parseFilename(filename);
  console.log(`Mapped Info: Subject: ${info.subjectName} (${info.subjectCode}), Year: ${info.year}, Session: ${info.session}`);

  const filePath = path.join(sourceDir, filename);
  console.log(`Extracting text from PDF...`);
  const text = await extractTextFromPdf(filePath);
  console.log(`Extracted ${text.length} characters of text.`);

  console.log(`Parsing and structuring questions with Gemini API...`);
  const resultData = await parseQuestionsWithGemini(text, info);
  console.log(`Successfully extracted ${resultData.questions ? resultData.questions.length : 0} questions.`);

  const subjectFolder = path.join(destDir, info.subjectSlug);
  if (!fs.existsSync(subjectFolder)) {
    fs.mkdirSync(subjectFolder, { recursive: true });
  }

  const destFile = path.join(subjectFolder, `${info.year}-${info.session.toLowerCase()}.json`);
  fs.writeFileSync(destFile, JSON.stringify(resultData, null, 2), 'utf8');
  console.log(`Saved output to: ${destFile}`);
}

async function main() {
  const sourceDir = path.join(__dirname, '..', 'public', 'previous year question paper');
  const destDir = path.join(__dirname, '..', 'evaluation');

  const args = process.argv.slice(2);
  const targetFilename = args[0]; // Optional: run for a single file

  if (targetFilename) {
    await processFile(targetFilename, sourceDir, destDir);
  } else {
    if (!fs.existsSync(sourceDir)) {
      console.error(`Source directory does not exist: ${sourceDir}`);
      return;
    }
    const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.pdf'));
    console.log(`Found ${files.length} PDF files in source directory.`);
    
    for (const file of files) {
      try {
        await processFile(file, sourceDir, destDir);
      } catch (err) {
        console.error(`Error processing file ${file}:`, err);
      }
    }
  }
}

if (require.main === module) {
  main().catch(err => console.error("Fatal error:", err));
}

module.exports = { parseFilename, extractTextFromPdf, parseQuestionsWithGemini };
