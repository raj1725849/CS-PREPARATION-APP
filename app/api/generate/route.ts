import { NextRequest } from "next/server"
import { getFlashModel, getGeminiKeyCount } from "@/lib/gemini"
import { readSubjectPdf } from "@/lib/pdf-utils"
import { buildGeneratePrompt, buildChunkedGeneratePrompt } from "@/lib/prompts"
import { GenerateRequest, GenerateError } from "@/lib/types"
import { generateWithOpenRouter } from "@/lib/openrouter"
import { verifyUserAndEnforceLimit } from "@/lib/firebase-server"
import {
  generateQuestionId,
  computeTextHash,
  saveQuestionToFirestore,
  savePaperToFirestore,
} from "@/lib/question-store"
import { buildPaperBlueprint } from "@/lib/blueprint-engine"
import { parseAiResponse, AiParseError } from "@/lib/json-parser"

export const maxDuration = 120

async function saveQuestionsToFirebase(
  idToken: string,
  uid: string,
  questions: any[],
  subject: string,
  paperId: string
): Promise<void> {
  const savePromises = questions.map((q) =>
    saveQuestionToFirestore(idToken, uid, {
      questionId: q.questionId,
      userId: uid,
      subject,
      questionText: q.questionText,
      marks: q.marks,
      source: "generated",
      paperId,
      textHash: computeTextHash(q.questionText),
      createdAt: new Date().toISOString(),
    })
  );

  const results = await Promise.allSettled(savePromises);
  const saved = results.filter((r) => r.status === "fulfilled" && r.value).length;
  const failed = results.length - saved;
  console.log(`[GENERATE] Firestore save: ${saved} questions saved, ${failed} failed for paper ${paperId}`);
}

export async function POST(req: NextRequest) {
  let uid = "";
  let idToken = "";

  try {
    const authResult = await verifyUserAndEnforceLimit(req, "generate");
    uid = authResult.uid;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      idToken = authHeader.substring(7);
    }
  } catch (err: any) {
    const status = err.statusCode || 500;
    return new Response(JSON.stringify({ error: err.message || "Unauthorized", code: "INVALID_REQUEST" }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body: GenerateRequest
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body", code: "INVALID_REQUEST" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { subject, scope, topic, questionTypes, marks, difficulty } = body

  if (!subject || !scope || !questionTypes?.length || !marks || !difficulty) {
    return new Response(JSON.stringify({ error: "Missing required fields: subject, scope, questionTypes, marks, difficulty", code: "INVALID_REQUEST" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (scope === "topic" && !topic?.trim()) {
    return new Response(JSON.stringify({ error: "Topic is required when scope is 'topic'", code: "INVALID_REQUEST" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendStatus = (msg: string, extra: any = {}) => {
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'status', message: msg, ...extra }) + '\n'));
      };
      
      const sendError = (msg: string) => {
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', error: msg }) + '\n'));
        controller.close();
      };

      try {
        sendStatus('Generating paper blueprint...');
        let blueprint;
        try {
          blueprint = await buildPaperBlueprint({
            subject,
            scope,
            topic,
            questionTypes,
            marks,
            difficulty,
          });
          console.log(`[GENERATE] Blueprint generated successfully. slots count: ${blueprint.slots.length}, coverage: ${blueprint.coveragePercentage}%`);
        } catch (err) {
          console.error("[GENERATE] Failed to generate paper blueprint:", err);
          return sendError("Failed to generate paper blueprint");
        }

        sendStatus('Reading PDF context...');
        let pdfContext = ""
        try {
          pdfContext = await readSubjectPdf(subject, 20000)
        } catch (err) {
          console.warn("PDF read failed — generating without context:", err)
        }

        const paperId = `paper_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const CHUNK_SIZE = 5;
        const totalChunks = Math.ceil(blueprint.slots.length / CHUNK_SIZE);
        const CONCURRENCY_LIMIT = 3;

        const chunkResults: { paperText: string; questions: any[] }[] = new Array(totalChunks);
        
        sendStatus(`Starting AI generation (${totalChunks} total chunks)...`, { totalChunks });

        for (let batchStart = 0; batchStart < totalChunks; batchStart += CONCURRENCY_LIMIT) {
          const batchPromises = [];
          
          for (let j = 0; j < CONCURRENCY_LIMIT && batchStart + j < totalChunks; j++) {
            const chunkIndex = batchStart + j;
            const startIdx = chunkIndex * CHUNK_SIZE;
            const endIdx = startIdx + CHUNK_SIZE;
            const blueprintChunk = blueprint.slots.slice(startIdx, endIdx);

            const chunkPrompt = buildChunkedGeneratePrompt({
              subject, scope, topic, questionTypes, marks, difficulty, pdfContext, 
              blueprintChunk, chunkIndex, totalChunks
            });

            const chunkPromise = (async () => {
              try {
                let result;
                let lastGeminiErr;
                const maxRetries = getGeminiKeyCount();

                for (let i = 0; i < maxRetries; i++) {
                  try {
                    const model = getFlashModel()
                    result = await model.generateContent({
                      contents: [{ role: "user", parts: [{ text: chunkPrompt }] }],
                      generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.7,
                        maxOutputTokens: 8192
                      }
                    });
                    break;
                  } catch (err: any) {
                    lastGeminiErr = err;
                    console.warn(`Gemini chunk ${chunkIndex+1} attempt ${i + 1}/${maxRetries} failed:`, err.message);
                  }
                }

                if (!result) throw lastGeminiErr;

                const responseText = result.response.text();
                if (!responseText?.trim()) throw new Error("Gemini returned empty response");

                return { chunkIndex, parsedData: parseAiResponse(responseText) };
              } catch (geminiErr: unknown) {
                console.warn(`/api/generate Gemini chunk ${chunkIndex+1} failed, falling back to OpenRouter:`, geminiErr)
                try {
                  const fallbackResponse = await generateWithOpenRouter(
                    chunkPrompt + "\nIMPORTANT: You must return a valid JSON object matching the requested schema. Do not output anything other than JSON."
                  )
                  if (!fallbackResponse?.trim()) throw new Error("OpenRouter returned empty response")
                  
                  return { chunkIndex, parsedData: parseAiResponse(fallbackResponse) };
                } catch (fallbackErr: any) {
                  console.error(`/api/generate OpenRouter chunk ${chunkIndex+1} fallback error:`, fallbackErr)
                  if (fallbackErr instanceof AiParseError || geminiErr instanceof AiParseError) {
                    throw geminiErr instanceof AiParseError ? geminiErr : fallbackErr;
                  }
                  throw new Error(`Models failed on chunk ${chunkIndex+1}. Gemini Error: ${(geminiErr as Error).message}. OpenRouter Error: ${fallbackErr.message}`);
                }
              }
            })();
            batchPromises.push(chunkPromise);
          }
          
          try {
            const batchResults = await Promise.all(batchPromises);
            for (const res of batchResults) {
              const pText = res.parsedData.paperText || "";
              const qs = res.parsedData.questions || [];
              chunkResults[res.chunkIndex] = { paperText: pText, questions: qs };
              
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'chunk',
                chunkIndex: res.chunkIndex,
                paperText: pText,
                questions: qs
              }) + '\n'));
            }
          } catch (batchErr: any) {
            return sendError(batchErr.message || "Failed to generate AI chunk");
          }
        }

        let fullPaperText = "";
        let allRawQuestions: any[] = [];
        for (let i = 0; i < chunkResults.length; i++) {
          const res = chunkResults[i];
          if (res) {
            fullPaperText += (i > 0 ? "\n\n" : "") + res.paperText;
            allRawQuestions = allRawQuestions.concat(res.questions);
          }
        }

        const questions = allRawQuestions.map((q: any) => ({
          questionId: generateQuestionId(),
          questionNumber: q.questionNumber || "",
          questionText: q.questionText || "",
          marks: parseInt(q.marks) || 5,
          topic: q.topic || "General",
          subTopic: q.subTopic || "",
          sectionNumber: q.sectionNumber || "",
          isCaseStudy: !!q.isCaseStudy,
          isPractical: !!q.isPractical,
          idealAnswerCode: q.idealAnswerCode || "",
          evaluated: false
        }));

        let totalMarksSum = 0;
        for (const q of questions) {
          totalMarksSum += q.marks;
        }

        const paperDoc = {
          paperId,
          userId: uid,
          subject,
          createdAt: new Date().toISOString(),
          totalMarks: totalMarksSum || marks,
          coveragePercentage: blueprint.coveragePercentage,
          difficultyLevel: difficulty,
          topicCoverage: blueprint.topicCoverage,
          questions,
          status: "generated" as const,
          paperText: fullPaperText,
          blueprint
        };

        sendStatus('Saving paper securely...');

        if (idToken && uid) {
          await savePaperToFirestore(idToken, paperDoc);
          saveQuestionsToFirebase(idToken, uid, questions, subject, paperId).catch((err) => {
            console.error("[GENERATE] Background individual questions save failed:", err);
          });
        }

        controller.enqueue(encoder.encode(JSON.stringify({
          type: 'complete',
          paper: fullPaperText,
          paperId,
          subject,
          generatedAt: paperDoc.createdAt,
          questions
        }) + '\n'));

        controller.close();
      } catch (e: any) {
        console.error("Stream generation error:", e);
        sendError(e.message || "Internal server error during generation");
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache, no-transform'
    }
  });
}
