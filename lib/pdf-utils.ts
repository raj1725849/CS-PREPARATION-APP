import fs from "fs"
import path from "path"
import { SubjectName } from "./types"
import { getFilenameForSubject, SUBJECT_MAP } from "./subject-map"

const STUDY_MATERIAL_DIR = path.join(
  process.cwd(), "public", "study-material"
)

export async function readPdfAsText(
  filename: string,
  maxChars: number = 20000
): Promise<string> {
  console.log(`\n--- [PDF PROCESS START] ---`);
  console.log(`[${new Date().toISOString()}] Target File: ${filename}`);
  const startTime = Date.now();

  try {
    let buffer: Buffer;
    let source = "";

    // 1. Try local disk fallback (highly convenient for local dev)
    const filePath = path.join(STUDY_MATERIAL_DIR, filename);
    if (fs.existsSync(filePath)) {
      console.log(`[PDF] Found file locally: ${filePath}`);
      const diskStart = Date.now();
      buffer = fs.readFileSync(filePath);
      const diskDuration = Date.now() - diskStart;
      console.log(`[PDF] SUCCESS: Local file read completed (${(buffer.length / 1024 / 1024).toFixed(2)} MB) in ${diskDuration}ms`);
      source = "Local Filesystem";
    } else {
      // 2. Fetch from Supabase Storage
      const baseUrl = process.env.PDF_ASSETS_URL || "https://giwhobpuaexxtvwvuykf.supabase.co/storage/v1/object/public/cs%20prep%20study%20material";
      const fileUrl = `${baseUrl}/${encodeURIComponent(filename)}`;
      
      console.log(`[PDF] Local file not found. Fetching from external URL: ${fileUrl}`);
      const fetchStart = Date.now();
      const response = await fetch(fileUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: Failed to download PDF from ${fileUrl}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      const fetchDuration = Date.now() - fetchStart;
      console.log(`[PDF] DOWNLOAD COMPLETE: Retrieved ${(buffer.length / 1024 / 1024).toFixed(2)} MB in ${fetchDuration}ms`);
      source = "Supabase Storage";
    }

    console.log(`[PDF] Parsing PDF binary data to text (Max pages: 80) using pdf-parse...`);
    const parseStart = Date.now();
    const pdfParse = require("pdf-parse");
    const parsed = await pdfParse(buffer, {
      max: 80
    });
    const parseDuration = Date.now() - parseStart;
    console.log(`[PDF] PARSE COMPLETE: Finished parsing in ${parseDuration}ms. Total pages: ${parsed.numpages || 'unknown'}`);
    
    const text = parsed.text
      .replace(/\s+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const truncatedText = text.slice(0, maxChars);
    const totalTime = Date.now() - startTime;
    console.log(`[PDF] Processing Summary:`);
    console.log(`  - Source: ${source}`);
    console.log(`  - Original Raw Text Length: ${text.length} characters`);
    console.log(`  - Truncated Text Length: ${truncatedText.length} characters (maxChars: ${maxChars})`);
    console.log(`  - Total Elapsed Time: ${totalTime}ms`);
    console.log(`--- [PDF PROCESS END] ---\n`);

    return truncatedText;
  } catch (err) {
    console.error(`[PDF] ERROR: Exception occurred during PDF processing for ${filename}:`, err);
    console.log(`--- [PDF PROCESS FAILED] ---\n`);
    return "";
  }
}

export async function readSubjectPdf(
  subject: SubjectName,
  maxChars: number = 20000
): Promise<string> {
  console.log(`[PDF] Requested subject: "${subject}"`);
  const filename = getFilenameForSubject(subject);
  return readPdfAsText(filename, maxChars);
}

export function listAvailablePdfs(): string[] {
  // In production, PDFs are fetched dynamically from the URL. We return all mapped PDFs
  // from SUBJECT_MAP so they display as indexed/available on the dashboard.
  return Object.values(SUBJECT_MAP).map(entry => entry.filename);
}

export function getPdfSizeKB(filename: string): number {
  const filePath = path.join(STUDY_MATERIAL_DIR, filename);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    return Math.round(stats.size / 1024);
  }
  // Fallback / Hardcoded sizes (in KB) for display in production
  const defaultSizes: Record<string, number> = {
    "company-law.pdf": 4212,
    "economic-laws.pdf": 26076,
    "tax-laws.pdf": 42619,
    "company-accounts.pdf": 7636,
    "capital-markets.pdf": 62662,
    "industrial-laws.pdf": 6804,
    "Ebooks  Jurisprudence  Interpretation and General Laws.pdf": 7374
  };
  return defaultSizes[filename] || 15000;
}

export function pdfExists(filename: string): boolean {
  // Assume true if it exists in our defined mapping
  return Object.values(SUBJECT_MAP).some(entry => entry.filename === filename);
}
