const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const pdfPath = path.join(
  "c:", "Users", "LENOVO", "CS PREP", "public", "previous year question paper", "jigl pyq june 26.pdf"
);

async function test() {
  try {
    const buffer = fs.readFileSync(pdfPath);
    const uint8Array = new Uint8Array(buffer);
    const parser = new PDFParse(uint8Array);
    const textData = await parser.getText();
    console.log("PDF parsed successfully.");
    console.log("Total pages in textData:", textData.total);
    console.log("Text content preview:\n", textData.text.slice(0, 1000));
  } catch (err) {
    console.error("Error parsing PDF using PDFParse class:", err);
  }
}

test();
