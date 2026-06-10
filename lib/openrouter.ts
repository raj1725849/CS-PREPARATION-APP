let lastOpenRouterUseTime = 0;
const OPENROUTER_COOLDOWN_MS = 30 * 1000; // 30 seconds

function checkOpenRouterCooldown() {
  const now = Date.now();
  if (now - lastOpenRouterUseTime < OPENROUTER_COOLDOWN_MS) {
    const remaining = Math.ceil((OPENROUTER_COOLDOWN_MS - (now - lastOpenRouterUseTime)) / 1000);
    throw new Error(`OpenRouter rate limit protection. Please wait ${remaining}s before fallback can be used again.`);
  }
  lastOpenRouterUseTime = now;
}

export async function generateWithOpenRouter(prompt: string, systemInstruction?: string) {
  checkOpenRouterCooldown();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("No OPENROUTER_API_KEY found");

  const messages: any[] = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: prompt });

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "moonshotai/kimi-k2.6:free",
      messages,
      temperature: 0.7
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter Error: ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

export async function evaluateWithOpenRouter(
  prompt: string, 
  imagesBase64: string[], 
  mimeTypes: string[], 
  systemInstruction: string
) {
  checkOpenRouterCooldown();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("No OPENROUTER_API_KEY found");

  const content: any[] = [{ type: "text", text: prompt }];

  imagesBase64.forEach((base64, i) => {
    const mime = mimeTypes[i] || "image/jpeg";
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${mime};base64,${base64}`
      }
    });
  });

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "moonshotai/kimi-k2.6:free",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content }
      ],
      temperature: 0.2
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter Error: ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}
