const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
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

const email = "test_eval_12356@example.com";
const password = "Password123!";

async function runTests() {
  console.log(`1. Logging in as ${email}...`);
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await userCredential.user.getIdToken();
  console.log("Logged in. Obtained Firebase ID Token.");

  console.log("\n2. Using 1x1 pixel mock image...");
  const base64Image = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

  console.log("\n3. Calling /api/extract with image...");
  const res = await fetch("http://localhost:3000/api/extract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`
    },
    body: JSON.stringify({
      images: [base64Image],
      mimeTypes: ["image/jpeg"]
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Extract API failed:", errText);
    process.exit(1);
  }

  const data = await res.json();
  console.log("\nExtract API Succeeded!");
  console.log("------------------------");
  console.log("Unclear Flag:", data.unclear);
  console.log("Extracted Text Preview (first 300 chars):");
  console.log(data.text.substring(0, 300));
  console.log("------------------------");

  // Validate that the output is NOT a JSON string
  try {
    JSON.parse(data.text);
    console.warn("WARNING: The extracted text itself is a valid JSON string. This might mean the JSON wasn't stripped!");
  } catch {
    console.log("SUCCESS: Extracted text is clean plain text (not raw JSON!).");
  }
}

runTests().catch(console.error);
