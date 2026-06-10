const { generateWithOpenRouter } = require('./lib/openrouter.ts');
require('dotenv').config();

async function test() {
  try {
    const res = await generateWithOpenRouter("Hello, say 'Test successful'");
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
test();
