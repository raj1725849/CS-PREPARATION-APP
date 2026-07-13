## 2026-07-13 11:25:00 IST
- **Issue**: Vercel POST /api/generate 504 Function Invocation Timeout error.
- **Root Cause**: The generation process (PDF parsing + multiple Gemini API calls + Firestore writes) exceeded Vercel's strict 60-second limit for serverless functions, causing a hard termination even though chunks were being processed successfully.
- **Fix Applied (Option 1: Streaming)**:
  - Updated app/api/generate/route.ts to use a ReadableStream and return a chunked application/x-ndjson response.
  - Increased maxDuration from 60 to 120 in the route.
  - Updated app/(main)/generate/page.tsx to read the stream using the Web Streams API, parsing the NDJSON format incrementally to build the paper text dynamically on the UI.

