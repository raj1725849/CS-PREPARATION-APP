import { NextResponse } from "next/server"
import { listAvailablePdfs, getPdfSizeKB } from "@/lib/pdf-utils"
import { SUBJECT_MAP, ALL_SUBJECTS } from "@/lib/subject-map"
import { SubjectInfo } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const availableFiles = listAvailablePdfs()

    const subjects: SubjectInfo[] = ALL_SUBJECTS.map(subjectName => {
      const { filename, module } = SUBJECT_MAP[subjectName]
      const exists = availableFiles.includes(filename)
      return {
        name: subjectName,
        filename,
        module,
        sizeKB: exists ? getPdfSizeKB(filename) : 0,
        indexed: exists
      }
    })

    return NextResponse.json({ subjects }, { status: 200 })
  } catch (err) {
    console.error("/api/subjects error:", err)
    return NextResponse.json(
      { error: "Failed to list subjects", subjects: [] },
      { status: 500 }
    )
  }
}
