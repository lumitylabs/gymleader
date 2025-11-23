const { GoogleGenAI } = require("@google/genai");

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

async function generateJSON(prompt) {
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
      console.error("Gemini API JSON Error:", error);
      throw new Error("Failed to generate JSON from Gemini.");
    }
  }

module.exports = { generateContent, generateJSON };
