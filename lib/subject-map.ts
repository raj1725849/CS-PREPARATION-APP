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
  }
}

export const ALL_SUBJECTS = Object.keys(SUBJECT_MAP) as SubjectName[]

export function getFilenameForSubject(subject: SubjectName): string {
  return SUBJECT_MAP[subject].filename
}

export function getModuleForSubject(subject: SubjectName): ModuleNumber {
  return SUBJECT_MAP[subject].module
}
