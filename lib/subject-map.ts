import { SubjectName, ModuleNumber } from "./types"

export interface SubjectMapEntry {
  filename: string
  module: ModuleNumber
  shortName: string               // for display in small spaces
}

export const SUBJECT_MAP: Record<SubjectName, SubjectMapEntry> = {
  "Company Law": {
    filename: "company-law.pdf",
    module: "Module 1",
    shortName: "Company Law"
  },
  "Economic, Business & Commercial Laws": {
    filename: "economic-laws.pdf",
    module: "Module 1",
    shortName: "Economic Laws"
  },
  "Tax Laws": {
    filename: "tax-laws.pdf",
    module: "Module 1",
    shortName: "Tax Laws"
  },
  "Company Accounts & Auditing Practices": {
    filename: "company-accounts.pdf",
    module: "Module 2",
    shortName: "Company Accounts"
  },
  "Capital Markets & Securities Laws": {
    filename: "capital-markets.pdf",
    module: "Module 2",
    shortName: "Capital Markets"
  },
  "Industrial, Labour & General Laws": {
    filename: "industrial-laws.pdf",
    module: "Module 2",
    shortName: "Industrial Laws"
  },
  "Jurisprudence, Interpretation & General Laws": {
    filename: "Ebooks  Jurisprudence  Interpretation and General Laws.pdf",
    module: "Module 1",
    shortName: "JIGL"
  }
}

export const ALL_SUBJECTS = Object.keys(SUBJECT_MAP) as SubjectName[]

export function resolveSubjectName(name: string): SubjectName {
  const normalized = name.toLowerCase().trim();
  
  // Try exact match or match on shortName
  const found = Object.keys(SUBJECT_MAP).find(
    (key) =>
      key.toLowerCase() === normalized ||
      SUBJECT_MAP[key as SubjectName].shortName.toLowerCase() === normalized
  );

  if (found) return found as SubjectName;

  // Manual fallback checks
  if (normalized.includes("company law")) return "Company Law";
  if (normalized.includes("economic")) return "Economic, Business & Commercial Laws";
  if (normalized.includes("tax")) return "Tax Laws";
  if (normalized.includes("account")) return "Company Accounts & Auditing Practices";
  if (normalized.includes("capital") || normalized.includes("security")) return "Capital Markets & Securities Laws";
  if (normalized.includes("industrial") || normalized.includes("labour")) return "Industrial, Labour & General Laws";
  if (normalized.includes("jurisprudence") || normalized.includes("jigl") || normalized.includes("general law")) return "Jurisprudence, Interpretation & General Laws";

  return "Company Law";
}

export function getFilenameForSubject(subject: SubjectName): string {
  return SUBJECT_MAP[subject].filename
}

export function getModuleForSubject(subject: SubjectName): ModuleNumber {
  return SUBJECT_MAP[subject].module
}

