const { GoogleGenAI } = require("@google/genai");
const openRouter = require('./openrouter');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateContent(prompt) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate content from Gemini.");
  }
}

const MAX_RETRIES = 5;
const RETRY_DELAY = 1000; // 1 second

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateJSON(prompt) {
    let lastError = null;

    // Try Gemini with retries
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt + "\n\nReturn the result strictly as a JSON object.",
                config: { response_mime_type: 'application/json' }
            });
            
            let text = response.text;
            // Robust JSON extraction: find the first '{' and the last '}'
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                text = jsonMatch[0];
            }
            return JSON.parse(text);
        } catch (error) {
            console.error(`Gemini API JSON Error (Attempt ${attempt}/${MAX_RETRIES}):`, error.message);
            lastError = error;
            
            // If it's the last attempt, don't sleep, just fall through
            if (attempt < MAX_RETRIES) {
                await sleep(RETRY_DELAY * attempt); // Exponential-ish backoff
            }
        }
    }

    console.warn("Gemini failed after all retries. Switching to OpenRouter fallback...");

    // Fallback to OpenRouter
    try {
        return await openRouter.generateJSON(prompt);
    } catch (fallbackError) {
        console.error("OpenRouter Fallback Error:", fallbackError);
        throw new Error(`Failed to generate JSON from Gemini (after ${MAX_RETRIES} attempts) and OpenRouter fallback. Gemini Error: ${lastError?.message}. OpenRouter Error: ${fallbackError.message}`);
    }
}

module.exports = { generateContent, generateJSON };
