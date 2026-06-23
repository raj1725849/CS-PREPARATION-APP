import { NextRequest, NextResponse } from "next/server";
import { verifyUserAuth } from "@/lib/firebase-server";
import { parseQuestionPaper } from "@/lib/paper-parser";
import { saveParsedPaperToFirestore } from "@/lib/question-store";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let uid = "";
  let idToken = "";

  try {
    const authResult = await verifyUserAuth(req);
    uid = authResult.uid;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      idToken = authHeader.substring(7);
    }
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json(
      { error: err.message || "Unauthorized" },
      { status }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { paperText } = body;

  if (typeof paperText !== "string" || !paperText.trim()) {
    return NextResponse.json(
      { error: "paperText is required as a non-empty string" },
      { status: 400 }
    );
  }

  try {
    // Run Parser Engine
    const parsedPaper = await parseQuestionPaper(paperText);

    // Save structured paper to Firestore
    if (idToken && uid) {
      const saved = await saveParsedPaperToFirestore(idToken, uid, parsedPaper);
      if (!saved) {
        console.warn(`[PARSE_PAPER_ROUTE] Failed to save parsed paper ${parsedPaper.paperId} to Firestore.`);
      }
    }

    return NextResponse.json(parsedPaper, { status: 200 });

  } catch (err: any) {
    console.error("Question paper parsing route failed:", err);
    return NextResponse.json(
      { error: `Question paper parsing failed: ${err.message}` },
      { status: 502 }
    );
  }
}
