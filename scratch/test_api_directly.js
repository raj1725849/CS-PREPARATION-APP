const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const { getFirestore, doc, setDoc } = require("firebase/firestore");
const fs = require("fs");

const firebaseConfig = {
  apiKey: "AIzaSyDM8_Crsi0BneFuMNmbD4WorwDEL7djvv4",
  authDomain: "cs-prep-dashboard-v1.firebaseapp.com",
  projectId: "cs-prep-dashboard-v1",
  storageBucket: "cs-prep-dashboard-v1.firebasestorage.app",
  messagingSenderId: "204081024292",
  appId: "1:204081024292:web:475f8aa886874784acf7b1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const email = "test_eval_12356@example.com";
const password = "Password123!";

async function runTests() {
  console.log(`1. Logging in as ${email}...`);
  let userCredential;
  try {
    userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Logged in successfully. UID:", userCredential.user.uid);
    
    // Upgrade plan to monthly to bypass Free Tier limits
    console.log("Upgrading test user to Monthly plan to bypass limits...");
    const docRef = doc(db, "users", userCredential.user.uid);
    await setDoc(docRef, { plan: "monthly", updatedAt: new Date().toISOString() }, { merge: true });
    console.log("Upgraded successfully.");
  } catch (err) {
    console.error("Login failed. Check credentials or user registration:", err.message);
    process.exit(1);
  }

  const idToken = await userCredential.user.getIdToken();
  console.log("Obtained Firebase ID Token.");

  // Test 1: Evaluate API
  console.log("\n2. Calling /api/evaluate...");
  const question = "What are the rules regarding the appointment of a first director in a public company under the Companies Act 2013?";
  const studentAnswer = "According to Section 152 of the Companies Act 2013, the first directors of a public company are usually appointed by the subscribers of the memorandum of association. If they are not named in the articles, the subscribers themselves shall be deemed to be the first directors until directors are duly appointed. In case of a public company, the appointment is usually made at the first general meeting. There must be at least 3 directors.";
  
  const evalRes = await fetch("http://localhost:3000/api/evaluate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`
    },
    body: JSON.stringify({
      subject: "Company Law",
      question: question,
      marks: 5,
      studentAnswer: studentAnswer
    })
  });

  if (!evalRes.ok) {
    const errText = await evalRes.text();
    console.error("Evaluation API failed:", errText);
    process.exit(1);
  }

  const evalData = await evalRes.json();
  console.log("Evaluation API Succeeded!");
  console.log("Marks Awarded:", evalData.marks_awarded, "/", evalData.total_marks);
  console.log("Verdict:", evalData.verdict);
  console.log("Chapter:", evalData.chapter);
  console.log("Improvement Suggestion:", evalData.improvement_suggestion);
  console.log("QuestionId:", evalData.questionId);
  console.log("Strengths:", evalData.strengths);
  console.log("Missing Points:", evalData.missing_points);
  console.log("Keywords Missed:", evalData.keywords_missing);
  
  // Save QuestionId for subsequent test
  const questionId = evalData.questionId;

  // Test 2: Fetch Ideal Answer (First time - Cache Miss, Gemini generates/formats)
  console.log("\n3. Fetching Ideal Answer (First time - Cache Miss)...");
  const t0 = Date.now();
  const idealRes1 = await fetch("http://localhost:3000/api/evaluate/ideal-answer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`
    },
    body: JSON.stringify({
      subject: "Company Law",
      question: question,
      questionId: questionId,
      marks: 5
    })
  });

  if (!idealRes1.ok) {
    const errText = await idealRes1.text();
    console.error("Fetch Ideal Answer failed:", errText);
    process.exit(1);
  }

  const idealData1 = await idealRes1.json();
  const t1 = Date.now();
  console.log("Fetch Ideal Answer 1 Succeeded!");
  console.log(`Time taken (Cache Miss): ${t1 - t0}ms`);
  console.log("Model Answer preview (first 150 chars):", idealData1.model_answer.substring(0, 150) + "...");

  // Test 3: Fetch Ideal Answer again (Second time - Cache Hit, loads from Firestore)
  console.log("\n4. Fetching Ideal Answer again (Second time - Cache Hit)...");
  const t2 = Date.now();
  const idealRes2 = await fetch("http://localhost:3000/api/evaluate/ideal-answer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`
    },
    body: JSON.stringify({
      subject: "Company Law",
      question: question,
      questionId: questionId,
      marks: 5
    })
  });

  if (!idealRes2.ok) {
    const errText = await idealRes2.text();
    console.error("Fetch Ideal Answer 2 failed:", errText);
    process.exit(1);
  }

  const idealData2 = await idealRes2.json();
  const t3 = Date.now();
  console.log("Fetch Ideal Answer 2 Succeeded!");
  console.log(`Time taken (Cache Hit): ${t3 - t2}ms`);
  
  if (idealData1.model_answer === idealData2.model_answer) {
    console.log("\nSUCCESS: Both responses returned the identical model answer.");
  } else {
    console.warn("\nWARNING: Model answers differ between the two fetches.");
  }

  if ((t3 - t2) < (t1 - t0) / 2) {
    console.log(`SUCCESS: Caching works! Cache hit took ${t3 - t2}ms which is significantly faster than cache miss (${t1 - t0}ms).`);
  } else {
    console.warn(`WARNING: Cache hit took ${t3 - t2}ms, which was not significantly faster than cache miss (${t1 - t0}ms).`);
  }
}

runTests().catch(console.error);
