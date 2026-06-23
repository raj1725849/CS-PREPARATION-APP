export function extractMarksFromText(text: string): number | null {
  if (!text) return null;
  const clean = text.trim();

  // Pattern 1: [5 Marks] or (5 marks) or [5m] or (5m) - anywhere in the text
  const bracketMatch = clean.match(/(?:\[|\()\s*(\d+)\s*(?:marks?|m)\s*(?:\]|\))/i);
  if (bracketMatch) {
    const val = parseInt(bracketMatch[1], 10);
    if (!isNaN(val) && val > 0 && val <= 100) return val;
  }

  // Pattern 2: "marks: 5" or "marks - 5" or "marks = 5" or "M = 10"
  const labelMatch = clean.match(/\b(?:marks?|m)\s*[:\-=\s]\s*(\d+)\b/i);
  if (labelMatch) {
    const val = parseInt(labelMatch[1], 10);
    if (!isNaN(val) && val > 0 && val <= 100) return val;
  }

  // Pattern 3: "5 marks" or "5m" at the end (allowing optional spaces, punctuation, or question marks)
  const endMatch = clean.match(/(\d+)\s*(?:marks?|m)\b[.?\s]*$/i);
  if (endMatch) {
    const val = parseInt(endMatch[1], 10);
    if (!isNaN(val) && val > 0 && val <= 100) return val;
  }

  // Pattern 4: Generic "5 marks" anywhere
  const genericMatch = clean.match(/\b(\d+)\s*(?:marks?|m)\b/i);
  if (genericMatch) {
    const val = parseInt(genericMatch[1], 10);
    if (!isNaN(val) && val > 0 && val <= 100) return val;
  }

  return null;
}
