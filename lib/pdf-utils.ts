import fs from "fs"
import path from "path"
import { SubjectName } from "./types"
import { getFilenameForSubject } from "./subject-map"

const STUDY_MATERIAL_DIR = path.join(
  process.cwd(), "public", "study-material"
)

export async function readPdfAsText(
  filename: string,
  maxChars: number = 20000
): Promise<string> {
  const filePath = path.join(STUDY_MATERIAL_DIR, filename)

  if (!fs.existsSync(filePath)) {
    console.warn(`PDF not found: ${filePath}`)
    return ""
  }

  try {
    const pdfParse = require("pdf-parse")
    const buffer = fs.readFileSync(filePath)
    const parsed = await pdfParse(buffer, {
      max: 80
    })
    const text = parsed.text
      .replace(/\s+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()

    return text.slice(0, maxChars)
  } catch (err) {
    console.error(`Failed to parse PDF ${filename}:`, err)
    return ""
  }
}

export async function readSubjectPdf(
  subject: SubjectName,
  maxChars: number = 20000
): Promise<string> {
  const filename = getFilenameForSubject(subject)
  return readPdfAsText(filename, maxChars)
}

export function listAvailablePdfs(): string[] {
  if (!fs.existsSync(STUDY_MATERIAL_DIR)) return []
  return fs
    .readdirSync(STUDY_MATERIAL_DIR)
    .filter(f => f.endsWith(".pdf"))
}

export function getPdfSizeKB(filename: string): number {
  const filePath = path.join(STUDY_MATERIAL_DIR, filename)
  if (!fs.existsSync(filePath)) return 0
  const stats = fs.statSync(filePath)
  return Math.round(stats.size / 1024)
}

export function pdfExists(filename: string): boolean {
  return fs.existsSync(path.join(STUDY_MATERIAL_DIR, filename))
}
