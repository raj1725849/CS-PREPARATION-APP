/**
 * scripts/test-blueprint.js
 * 
 * Test script to run and verify buildPaperBlueprint function.
 */

const { buildPaperBlueprint } = require("../lib/blueprint-engine");

async function run() {
  console.log("Testing buildPaperBlueprint...");
  
  try {
    const blueprint = await buildPaperBlueprint({
      subject: "Company Law",
      scope: "full",
      questionTypes: ["descriptive", "casestudy"],
      marks: 100,
      difficulty: "Standard (ICSI Level)"
    });
    
    console.log("\n==============================================");
    console.log(`Blueprint for Subject: ${blueprint.subject}`);
    console.log(`Total Marks: ${blueprint.totalMarks}`);
    console.log(`Coverage %: ${blueprint.coveragePercentage}%`);
    console.log(`Slots generated: ${blueprint.slots.length}`);
    console.log("==============================================\n");
    
    const slotsGrouped = {};
    for (const slot of blueprint.slots) {
      const qNumStr = slot.slotNumber <= 5 ? "Q1 (Sub-part)" : `Q${Math.floor((slot.slotNumber - 6) / 4) + 2}`;
      if (!slotsGrouped[qNumStr]) {
        slotsGrouped[qNumStr] = [];
      }
      slotsGrouped[qNumStr].push(slot);
    }
    
    for (const [qNum, slots] of Object.entries(slotsGrouped)) {
      console.log(`--- ${qNum} ---`);
      for (const slot of slots) {
        console.log(`Slot ${slot.slotNumber}: ${slot.topic} - ${slot.subTopic} (${slot.marks} Marks) [Type: ${slot.questionType}]`);
        if (slot.samplePYQText) {
          console.log(`   Sample PYQ: "${slot.samplePYQText.slice(0, 100)}..."`);
        }
      }
      console.log("");
    }
    
    console.log("Topic marks distribution:");
    console.log(JSON.stringify(blueprint.topicCoverage, null, 2));
    
  } catch (err) {
    console.error("Blueprint generation failed:", err);
  }
}

run();
