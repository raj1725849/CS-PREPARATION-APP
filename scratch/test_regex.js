function matchQuestionPrefix(line) {
  const trimmed = line.trim();
  
  const qPrefixRegex = /^[\s\-\*•]*\(?Q(?:uestion)?\.?\s*(\d+(?:\([a-z0-9]\))?|[a-z](?:\([a-z0-9]\))?|[ivxIVX]+)\)?[\.\):\-]?(?:\s+|$)/i;
  let match = trimmed.match(qPrefixRegex);
  if (match) return match[1];

  const subpartParenRegex = /^[\s\-\*•]*\(?(\d+\([a-z0-9]\)|[a-z]\([a-z0-9]\))[\.\):\-]?(?:\s+|$)/i;
  match = trimmed.match(subpartParenRegex);
  if (match) return match[1];
  
  const punctRegex = /^[\s\-\*•]*\(?(\d+|[a-z]|[ivxIVX]+)\)[\.\):\-]?(?:\s+|$)/i;
  match = trimmed.match(punctRegex);
  if (match) return match[1];
  
  const dotRegex = /^[\s\-\*•]*\(?(\d+|[a-z]|[ivxIVX]+)\.[\.\):\-]?(?:\s+|$)/i;
  match = trimmed.match(dotRegex);
  if (match) return match[1];

  const colonDashRegex = /^[\s\-\*•]*\(?(\d+|[a-z]|[ivxIVX]+)[:\-](?:\s+|$)/i;
  match = trimmed.match(colonDashRegex);
  if (match) return match[1];

  return null;
}

const tests = [
  "Q1. Describe the principles of interpretation of statutes. (5 Marks)",
  "Q1(a). What is literal construction? (3 Marks)",
  "1. Describe the principles.",
  "1) Describe the principles.",
  "(1) Describe the principles.",
  "1(a) What is literal construction?",
  "a. Describe golden rule.",
  "(a) Describe golden rule.",
  "i. Describe golden rule.",
  "- 1. Describe golden rule.",
  "* Q1. Describe golden rule.",
  "Q1 Describe golden rule.",
  "A company is a legal person.", // should NOT match
  "I am going to the market.", // should NOT match
  "A. Company is a legal person.", // should match
  "Q1", // should match (standalone on line)
  "(a)", // should match (standalone on line)
  "i", // should NOT match (normal word "i", e.g. "i am going") -> Wait, matches dotRegex/punctRegex? No, it has no trailing punctuation! So it should NOT match. Let's verify!
];

tests.forEach((t) => {
  const val = matchQuestionPrefix(t);
  if (val) {
    console.log(`✓ MATCHED: "${t}" -> "${val}"`);
  } else {
    console.log(`✗ FAILED:  "${t}"`);
  }
});
